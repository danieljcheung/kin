import { Prisma } from "@prisma/client";
import { randomUUID } from "node:crypto";

import { prisma } from "@/lib/prisma";
import { categorizeTelegramEvent } from "@/lib/telegram/categorize";
import type {
  NormalizedTelegramEvent,
  TelegramClassification,
  TelegramIngestionCategory,
} from "@/lib/telegram/types";

const ACTIVE_OR_PENDING_GROUP_BINDING_STATUSES = ["DM_STARTED", "BOT_ADDED", "ACTIVE"] as const;
const PENDING_GROUP_BINDING_STATUSES = ["DM_STARTED", "BOT_ADDED"] as const;

export interface TelegramIngestionResult {
  status: "ignored" | "duplicate" | "ingested";
  category: TelegramIngestionCategory | null;
  dedupeKey: string | null;
  eventId: string | null;
}

interface PersistedKinEventRow {
  id: string;
  category: TelegramIngestionCategory;
}

interface KinEventContext {
  familyId: string | null;
  groupBindingId: string | null;
}

function normalizeDedupeText(text: string | null | undefined): string {
  return (text ?? "").trim().toLowerCase().replace(/\s+/g, " ").slice(0, 120);
}

function emptyKinEventContext(): KinEventContext {
  return {
    familyId: null,
    groupBindingId: null,
  };
}

function extractStartToken(text: string | null | undefined): string | null {
  const trimmed = text?.trim();

  if (!trimmed?.startsWith("/start")) {
    return null;
  }

  const parts = trimmed.split(/\s+/);

  if (parts.length < 2) {
    return null;
  }

  return parts.slice(1).join(" ");
}

async function findGroupBindingContextByGroupChatId(chatId: string): Promise<KinEventContext> {
  const binding = await prisma.groupBinding.findFirst({
    where: {
      platform: "TELEGRAM",
      externalGroupId: chatId,
    },
    select: {
      id: true,
      familyId: true,
    },
  });

  return binding
    ? {
        familyId: binding.familyId,
        groupBindingId: binding.id,
      }
    : emptyKinEventContext();
}

async function findGroupBindingContextByOnboardingToken(
  onboardingToken: string,
): Promise<KinEventContext> {
  const binding = await prisma.groupBinding.findFirst({
    where: {
      platform: "TELEGRAM",
      onboardingToken,
    },
    select: {
      id: true,
      familyId: true,
    },
  });

  return binding
    ? {
        familyId: binding.familyId,
        groupBindingId: binding.id,
      }
    : emptyKinEventContext();
}

async function findGroupBindingContextByTelegramDmUserId(
  telegramDmUserId: string,
  statuses: readonly ("DM_STARTED" | "BOT_ADDED" | "ACTIVE")[],
  telegramDmChatId?: string | null,
): Promise<KinEventContext> {
  const baseWhere = {
    platform: "TELEGRAM" as const,
    telegramDmUserId,
    status: {
      in: [...statuses],
    },
  };

  const binding =
    telegramDmChatId
      ? await prisma.groupBinding.findFirst({
          where: {
            ...baseWhere,
            telegramDmChatId,
          },
          orderBy: {
            updatedAt: "desc",
          },
          select: {
            id: true,
            familyId: true,
          },
        })
      : null;

  if (binding) {
    return {
      familyId: binding.familyId,
      groupBindingId: binding.id,
    };
  }

  const fallbackBinding = await prisma.groupBinding.findFirst({
    where: baseWhere,
    orderBy: {
      updatedAt: "desc",
    },
    select: {
      id: true,
      familyId: true,
    },
  });

  return fallbackBinding
    ? {
        familyId: fallbackBinding.familyId,
        groupBindingId: fallbackBinding.id,
      }
    : emptyKinEventContext();
}

async function resolveKinEventContext(
  event: Exclude<NormalizedTelegramEvent, { kind: "unsupported" }>,
  classification: TelegramClassification,
): Promise<KinEventContext> {
  if (event.scope === "group") {
    const groupContext = await findGroupBindingContextByGroupChatId(event.chat.id);

    if (groupContext.groupBindingId) {
      return groupContext;
    }
  }

  if (
    event.kind === "message" &&
    classification.decision === "onboarding_event" &&
    event.scope === "private" &&
    event.command === "start"
  ) {
    const onboardingToken = extractStartToken(event.text);

    if (onboardingToken) {
      const tokenContext = await findGroupBindingContextByOnboardingToken(onboardingToken);

      if (tokenContext.groupBindingId) {
        return tokenContext;
      }
    }
  }

  if (
    event.kind === "my_chat_member" &&
    classification.decision === "onboarding_event" &&
    event.scope === "group" &&
    event.from?.id
  ) {
    const pendingContext = await findGroupBindingContextByTelegramDmUserId(
      event.from.id,
      PENDING_GROUP_BINDING_STATUSES,
    );

    if (pendingContext.groupBindingId) {
      return pendingContext;
    }
  }

  if (event.scope === "private" && event.from?.id) {
    return findGroupBindingContextByTelegramDmUserId(
      event.from.id,
      ACTIVE_OR_PENDING_GROUP_BINDING_STATUSES,
      event.chat.id,
    );
  }

  return emptyKinEventContext();
}

export function buildTelegramDedupeKey(event: NormalizedTelegramEvent): string | null {
  if (event.updateId) {
    return `telegram:update:${event.updateId}`;
  }

  if (event.kind === "message") {
    return [
      "telegram",
      "message",
      event.chat.id,
      event.messageId ?? "no-message-id",
      event.from?.id ?? "no-user-id",
      normalizeDedupeText(event.text),
    ].join(":");
  }

  if (event.kind === "my_chat_member") {
    return [
      "telegram",
      "my-chat-member",
      event.chat.id,
      event.from?.id ?? "no-user-id",
      event.oldStatus ?? "no-old-status",
      event.newStatus ?? "no-new-status",
    ].join(":");
  }

  return null;
}

function buildInsertQuery(
  event: Exclude<NormalizedTelegramEvent, { kind: "unsupported" }>,
  classification: TelegramClassification,
  category: TelegramIngestionCategory,
  dedupeKey: string,
  context: KinEventContext,
): Prisma.Sql {
  return Prisma.sql`
    INSERT INTO "KinEvent" (
      "id",
      "platform",
      "category",
      "dedupeKey",
      "updateId",
      "kind",
      "scope",
      "routeDecision",
      "routeReason",
      "chatId",
      "chatType",
      "chatTitle",
      "fromUserId",
      "fromUsername",
      "fromFirstName",
      "messageId",
      "text",
      "command",
      "oldStatus",
      "newStatus",
      "familyId",
      "groupBindingId",
      "raw"
    )
    VALUES (
      ${randomUUID()},
      'TELEGRAM'::"MessagingPlatform",
      ${category}::"KinEventCategory",
      ${dedupeKey},
      ${event.updateId},
      ${event.kind},
      ${event.scope},
      ${classification.decision},
      ${classification.reason},
      ${event.chat.id},
      ${event.chat.type},
      ${event.chat.title},
      ${event.from?.id ?? null},
      ${event.from?.username ?? null},
      ${event.from?.firstName ?? null},
      ${event.kind === "message" ? event.messageId : null},
      ${event.kind === "message" ? event.text : null},
      ${event.kind === "message" ? event.command : null},
      ${event.kind === "my_chat_member" ? event.oldStatus : null},
      ${event.kind === "my_chat_member" ? event.newStatus : null},
      ${context.familyId},
      ${context.groupBindingId},
      ${JSON.stringify(event.raw)}::jsonb
    )
    ON CONFLICT ("dedupeKey") DO NOTHING
    RETURNING "id", "category"
  `;
}

async function findKinEventByDedupeKey(
  dedupeKey: string,
): Promise<PersistedKinEventRow | null> {
  const rows = await prisma.$queryRaw<PersistedKinEventRow[]>(Prisma.sql`
    SELECT "id", "category"
    FROM "KinEvent"
    WHERE "dedupeKey" = ${dedupeKey}
    LIMIT 1
  `);

  return rows[0] ?? null;
}

export async function ingestTelegramEvent(
  event: NormalizedTelegramEvent,
  classification: TelegramClassification,
): Promise<TelegramIngestionResult> {
  if (classification.decision === "ignore" || event.kind === "unsupported") {
    return {
      status: "ignored",
      category: null,
      dedupeKey: null,
      eventId: null,
    };
  }

  const dedupeKey = buildTelegramDedupeKey(event);

  if (!dedupeKey) {
    return {
      status: "ignored",
      category: null,
      dedupeKey: null,
      eventId: null,
    };
  }

  const existingEvent = await findKinEventByDedupeKey(dedupeKey);

  if (existingEvent) {
    return {
      status: "duplicate",
      category: existingEvent.category,
      dedupeKey,
      eventId: existingEvent.id,
    };
  }

  const category = categorizeTelegramEvent(event, classification);
  const context = await resolveKinEventContext(event, classification);

  const insertedRows = await prisma.$queryRaw<PersistedKinEventRow[]>(
    buildInsertQuery(event, classification, category, dedupeKey, context),
  );

  if (insertedRows[0]) {
    return {
      status: "ingested",
      category,
      dedupeKey,
      eventId: insertedRows[0].id,
    };
  }

  const duplicateEvent = await findKinEventByDedupeKey(dedupeKey);

  return {
    status: "duplicate",
    category: duplicateEvent?.category ?? category,
    dedupeKey,
    eventId: duplicateEvent?.id ?? null,
  };
}
