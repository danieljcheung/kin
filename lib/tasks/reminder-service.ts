import { Prisma } from "@prisma/client";

import { createReminderSchedule } from "@/lib/aws/reminder-scheduler";
import { prisma } from "@/lib/prisma";
import {
  type ExplicitReminderIntent,
  parseExplicitReminderIntent,
} from "@/lib/tasks/reminder-intent";

interface SourceKinEventTaskContext {
  id: string;
  familyId: string | null;
  groupBindingId: string | null;
  chatId: string | null;
  text: string | null;
  createdAt: Date;
}

interface ReminderContinuationCandidate {
  id: string;
  text: string | null;
  createdAt: Date;
}

export type TelegramReminderFastPathResult =
  | { kind: "not_applicable" }
  | { kind: "clarify"; text: string }
  | { kind: "reply"; text: string }
  | { kind: "fallback"; reason: string };

const REMINDER_SCHEDULED_BY = "eventbridge_scheduler_sqs";

function resolveReminderTimeZone(): string {
  const configured = process.env.KIN_REMINDER_TIMEZONE?.trim();
  if (!configured) {
    return "UTC";
  }

  try {
    return new Intl.DateTimeFormat("en-US", { timeZone: configured }).resolvedOptions().timeZone;
  } catch {
    return "UTC";
  }
}

function buildReminderConfirmation(intent: ExplicitReminderIntent): string {
  return `Got it — I’ll remind everyone ${intent.scheduledForLabel}.`;
}

async function loadSourceKinEventTaskContext(
  sourceKinEventId: string,
): Promise<SourceKinEventTaskContext | null> {
  const rows = await prisma.$queryRaw<SourceKinEventTaskContext[]>(Prisma.sql`
    SELECT
      "id",
      "familyId",
      "groupBindingId",
      "chatId",
      "text",
      "createdAt"
    FROM "KinEvent"
    WHERE "id" = ${sourceKinEventId}
    LIMIT 1
  `);

  return rows[0] ?? null;
}

async function resolveGroupBindingId(
  context: SourceKinEventTaskContext,
): Promise<string | null> {
  if (context.groupBindingId) {
    return context.groupBindingId;
  }

  if (!context.familyId || !context.chatId) {
    return null;
  }

  const rows = await prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
    SELECT "id"
    FROM "GroupBinding"
    WHERE "familyId" = ${context.familyId}
      AND "platform" = 'TELEGRAM'::"MessagingPlatform"
      AND (
        "externalGroupId" = ${context.chatId}
        OR "telegramDmChatId" = ${context.chatId}
      )
    ORDER BY "updatedAt" DESC
    LIMIT 1
  `);

  return rows[0]?.id ?? null;
}

async function loadReminderContinuationCandidate(
  context: SourceKinEventTaskContext,
): Promise<ReminderContinuationCandidate | null> {
  if (!context.familyId) {
    return null;
  }

  const rows = await prisma.$queryRaw<ReminderContinuationCandidate[]>(Prisma.sql`
    SELECT "id", "text", "createdAt"
    FROM "KinEvent"
    WHERE "familyId" = ${context.familyId}
      AND "id" <> ${context.id}
      AND "text" IS NOT NULL
      AND "createdAt" >= ${new Date(context.createdAt.getTime() - 30 * 60 * 1_000)}
      ${context.groupBindingId ? Prisma.sql`AND "groupBindingId" = ${context.groupBindingId}` : Prisma.empty}
      ${!context.groupBindingId && context.chatId ? Prisma.sql`AND "chatId" = ${context.chatId}` : Prisma.empty}
    ORDER BY "createdAt" DESC
    LIMIT 6
  `);

  for (const row of rows) {
    const previousParse = parseExplicitReminderIntent(row.text, row.createdAt);

    if (previousParse.kind === "clarify") {
      return row;
    }

    if (previousParse.kind === "intent") {
      return null;
    }
  }

  return null;
}

async function resolveReminderIntent(context: SourceKinEventTaskContext) {
  const timeZone = resolveReminderTimeZone();
  const directParse = parseExplicitReminderIntent(context.text, context.createdAt, { timeZone });

  if (directParse.kind !== "none") {
    return directParse;
  }

  const continuationCandidate = await loadReminderContinuationCandidate(context);

  if (!continuationCandidate?.text || !context.text) {
    return directParse;
  }

  const combinedParse = parseExplicitReminderIntent(
    `${continuationCandidate.text} ${context.text}`,
    context.createdAt,
    { timeZone },
  );

  return combinedParse.kind === "intent" ? combinedParse : directParse;
}

export async function handleTelegramReminderFastPath(params: {
  sourceKinEventId: string;
}): Promise<TelegramReminderFastPathResult> {
  const context = await loadSourceKinEventTaskContext(params.sourceKinEventId);

  if (!context || !context.text) {
    return { kind: "not_applicable" };
  }

  const parseResult = await resolveReminderIntent(context);

  if (parseResult.kind === "none") {
    return { kind: "not_applicable" };
  }

  if (parseResult.kind === "clarify") {
    return { kind: "clarify", text: parseResult.text };
  }

  if (!context.familyId) {
    return {
      kind: "fallback",
      reason: "missing_family_context",
    };
  }

  const familyId = context.familyId;
  let createdReminderId: string | null = null;

  try {
    const groupBindingId = await resolveGroupBindingId(context);

    await prisma.$transaction(async (tx) => {
      const task = await tx.task.create({
        data: {
          kind: "REMINDER",
          status: "OPEN",
          text: parseResult.intent.taskText,
          familyId,
          groupBindingId,
          sourceKinEventId: context.id,
        },
        select: { id: true },
      });

      const reminder = await tx.reminder.create({
        data: {
          taskId: task.id,
          status: "SCHEDULED",
          scheduledFor: parseResult.intent.scheduledFor,
          familyId,
          groupBindingId,
          sourceKinEventId: context.id,
        },
        select: { id: true },
      });

      createdReminderId = reminder.id;
    });

  } catch (error) {
    console.error("Failed to create reminder from Telegram fast-path", {
      sourceKinEventId: context.id,
      familyId: context.familyId,
      groupBindingId: context.groupBindingId,
      error,
    });

    return {
      kind: "fallback",
      reason: "reminder_write_failed",
    };
  }

  if (createdReminderId) {
    try {
      const scheduleResult = await createReminderSchedule({
        reminderId: createdReminderId,
        scheduledFor: parseResult.intent.scheduledFor,
      });

      if (scheduleResult.kind === "created" || scheduleResult.kind === "already_exists") {
        await prisma.$executeRaw(Prisma.sql`
          UPDATE "Reminder"
          SET
            "scheduleName" = ${scheduleResult.scheduleName},
            "scheduledBy" = ${REMINDER_SCHEDULED_BY},
            "canceledAt" = NULL
          WHERE "id" = ${createdReminderId}
        `);
      }
    } catch (error) {
      console.error("Failed to create EventBridge reminder schedule", {
        reminderId: createdReminderId,
        sourceKinEventId: context.id,
        error,
      });
    }
  }

  return {
    kind: "reply",
    text: buildReminderConfirmation(parseResult.intent),
  };
}
