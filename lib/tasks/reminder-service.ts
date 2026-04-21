import { Prisma } from "@prisma/client";

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

export type TelegramReminderFastPathResult =
  | { kind: "not_applicable" }
  | { kind: "clarify"; text: string }
  | { kind: "reply"; text: string }
  | { kind: "fallback"; reason: string };

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

export async function handleTelegramReminderFastPath(params: {
  sourceKinEventId: string;
}): Promise<TelegramReminderFastPathResult> {
  const context = await loadSourceKinEventTaskContext(params.sourceKinEventId);

  if (!context || !context.text) {
    return { kind: "not_applicable" };
  }

  const parseResult = parseExplicitReminderIntent(context.text, context.createdAt);

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

  try {
    const groupBindingId = await resolveGroupBindingId(context);

    await prisma.$transaction(async (tx) => {
      const taskRows = await tx.$queryRaw<{ id: string }[]>(Prisma.sql`
        INSERT INTO "Task" (
          "kind",
          "status",
          "text",
          "familyId",
          "groupBindingId",
          "sourceKinEventId"
        )
        VALUES (
          'REMINDER'::"TaskKind",
          'OPEN'::"TaskStatus",
          ${parseResult.intent.taskText},
          ${familyId},
          ${groupBindingId},
          ${context.id}
        )
        RETURNING "id"
      `);

      const taskId = taskRows[0]?.id;

      if (!taskId) {
        throw new Error("Task insert returned no id");
      }

      await tx.$queryRaw(Prisma.sql`
        INSERT INTO "Reminder" (
          "taskId",
          "status",
          "scheduledFor",
          "familyId",
          "groupBindingId",
          "sourceKinEventId"
        )
        VALUES (
          ${taskId},
          'SCHEDULED'::"ReminderStatus",
          ${parseResult.intent.scheduledFor},
          ${familyId},
          ${groupBindingId},
          ${context.id}
        )
      `);
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

  return {
    kind: "reply",
    text: buildReminderConfirmation(parseResult.intent),
  };
}
