import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { sendTelegramMessage } from "@/lib/telegram/send";

interface ReminderDeliveryRow {
  reminderId: string;
  reminderStatus: "SCHEDULED" | "FIRED" | "CANCELED" | "FAILED";
  claimStatus: "CLAIMED" | null;
  taskId: string;
  taskText: string;
  familyId: string;
  groupBindingId: string | null;
  externalGroupId: string | null;
  telegramDmChatId: string | null;
}

export interface DeliverReminderByIdResult {
  kind:
    | "fired"
    | "failed"
    | "released"
    | "already_terminal"
    | "skipped_unclaimed"
    | "skipped_claimed_elsewhere"
    | "not_found";
  reminderId: string;
  status?: "FIRED" | "FAILED" | "CANCELED";
  error?: string;
}

function buildReminderMessage(taskText: string): string {
  return `Reminder: ${taskText}`;
}

async function loadReminderDeliveryRow(reminderId: string): Promise<ReminderDeliveryRow | null> {
  const rows = await prisma.$queryRaw<ReminderDeliveryRow[]>(Prisma.sql`
    SELECT
      r."id" AS "reminderId",
      r."status" AS "reminderStatus",
      r."claimStatus" AS "claimStatus",
      t."id" AS "taskId",
      t."text" AS "taskText",
      r."familyId" AS "familyId",
      r."groupBindingId" AS "groupBindingId",
      gb."externalGroupId" AS "externalGroupId",
      gb."telegramDmChatId" AS "telegramDmChatId"
    FROM "Reminder" r
    INNER JOIN "Task" t ON t."id" = r."taskId"
    LEFT JOIN "GroupBinding" gb ON gb."id" = r."groupBindingId"
    WHERE r."id" = ${reminderId}
    LIMIT 1
  `);

  return rows[0] ?? null;
}

async function claimReminderForDelivery(reminderId: string, claimedAt: Date): Promise<boolean> {
  const rows = await prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
    UPDATE "Reminder"
    SET
      "claimStatus" = 'CLAIMED'::"ReminderClaimStatus",
      "claimedAt" = ${claimedAt},
      "deliveryAttempts" = "deliveryAttempts" + 1,
      "updatedAt" = ${claimedAt}
    WHERE "id" = ${reminderId}
      AND "status" = 'SCHEDULED'::"ReminderStatus"
      AND "claimStatus" IS NULL
    RETURNING "id"
  `);

  return rows.length > 0;
}

async function markReminderFired(reminderId: string, firedAt: Date): Promise<boolean> {
  const rows = await prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
    UPDATE "Reminder"
    SET
      "status" = 'FIRED'::"ReminderStatus",
      "claimStatus" = NULL,
      "firedAt" = ${firedAt},
      "failedAt" = NULL,
      "lastError" = NULL,
      "updatedAt" = ${firedAt}
    WHERE "id" = ${reminderId}
      AND "status" = 'SCHEDULED'::"ReminderStatus"
      AND "claimStatus" = 'CLAIMED'::"ReminderClaimStatus"
    RETURNING "id"
  `);

  return rows.length > 0;
}

async function markReminderFailed(
  reminderId: string,
  failedAt: Date,
  errorMessage: string,
): Promise<boolean> {
  const rows = await prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
    UPDATE "Reminder"
    SET
      "status" = 'FAILED'::"ReminderStatus",
      "claimStatus" = NULL,
      "failedAt" = ${failedAt},
      "lastError" = ${errorMessage.slice(0, 1000)},
      "updatedAt" = ${failedAt}
    WHERE "id" = ${reminderId}
      AND "status" = 'SCHEDULED'::"ReminderStatus"
      AND "claimStatus" = 'CLAIMED'::"ReminderClaimStatus"
    RETURNING "id"
  `);

  return rows.length > 0;
}

async function releaseReminderClaim(reminderId: string, releasedAt: Date, errorMessage: string) {
  await prisma.$executeRaw(Prisma.sql`
    UPDATE "Reminder"
    SET
      "claimStatus" = NULL,
      "lastError" = ${errorMessage.slice(0, 1000)},
      "updatedAt" = ${releasedAt}
    WHERE "id" = ${reminderId}
      AND "status" = 'SCHEDULED'::"ReminderStatus"
      AND "claimStatus" = 'CLAIMED'::"ReminderClaimStatus"
  `);
}

export async function deliverReminderById(params: {
  reminderId: string;
  requireClaimed: boolean;
  missingDestination: "release" | "fail";
}): Promise<DeliverReminderByIdResult> {
  const now = new Date();

  if (!params.requireClaimed) {
    const claimed = await claimReminderForDelivery(params.reminderId, now);

    if (!claimed) {
      const current = await loadReminderDeliveryRow(params.reminderId);

      if (!current) {
        return {
          kind: "not_found",
          reminderId: params.reminderId,
        };
      }

      if (current.reminderStatus !== "SCHEDULED") {
        return {
          kind: "already_terminal",
          reminderId: params.reminderId,
          status: current.reminderStatus,
        };
      }

      if (current.claimStatus === "CLAIMED") {
        return {
          kind: "skipped_claimed_elsewhere",
          reminderId: params.reminderId,
        };
      }

      return {
        kind: "skipped_unclaimed",
        reminderId: params.reminderId,
      };
    }
  }

  const row = await loadReminderDeliveryRow(params.reminderId);

  if (!row) {
    return {
      kind: "not_found",
      reminderId: params.reminderId,
    };
  }

  if (row.reminderStatus !== "SCHEDULED") {
    return {
      kind: "already_terminal",
      reminderId: row.reminderId,
      status: row.reminderStatus,
    };
  }

  if (params.requireClaimed && row.claimStatus !== "CLAIMED") {
    return {
      kind: "skipped_unclaimed",
      reminderId: row.reminderId,
    };
  }

  const destinationChatId = row.externalGroupId ?? row.telegramDmChatId;

  if (!destinationChatId) {
    if (params.missingDestination === "release") {
      await releaseReminderClaim(row.reminderId, new Date(), "missing_telegram_destination");

      return {
        kind: "released",
        reminderId: row.reminderId,
      };
    }

    await markReminderFailed(row.reminderId, new Date(), "missing_telegram_destination");

    return {
      kind: "failed",
      reminderId: row.reminderId,
      status: "FAILED",
      error: "missing_telegram_destination",
    };
  }

  try {
    await sendTelegramMessage(destinationChatId, buildReminderMessage(row.taskText));

    const updated = await markReminderFired(row.reminderId, new Date());

    if (!updated) {
      const latest = await loadReminderDeliveryRow(row.reminderId);

      if (latest && latest.reminderStatus !== "SCHEDULED") {
        return {
          kind: "already_terminal",
          reminderId: row.reminderId,
          status: latest.reminderStatus,
        };
      }
    }

    return {
      kind: "fired",
      reminderId: row.reminderId,
      status: "FIRED",
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "unknown_send_error";

    console.error("Failed to deliver reminder", {
      reminderId: row.reminderId,
      taskId: row.taskId,
      familyId: row.familyId,
      groupBindingId: row.groupBindingId,
      error,
    });

    await markReminderFailed(row.reminderId, new Date(), errorMessage);

    return {
      kind: "failed",
      reminderId: row.reminderId,
      status: "FAILED",
      error: errorMessage,
    };
  }
}
