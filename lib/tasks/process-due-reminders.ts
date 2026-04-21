import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { sendTelegramMessage } from "@/lib/telegram/send";

interface DueReminderRow {
  reminderId: string;
  taskId: string;
  taskText: string;
  scheduledFor: Date;
  familyId: string;
  groupBindingId: string | null;
  externalGroupId: string | null;
  telegramDmChatId: string | null;
}

export interface ProcessDueRemindersResult {
  now: string;
  claimedCount: number;
  firedCount: number;
  failedCount: number;
  skippedCount: number;
  processedReminderIds: string[];
}

function buildReminderMessage(taskText: string): string {
  return `Reminder: ${taskText}`;
}

async function claimDueReminders(now: Date, limit: number): Promise<string[]> {
  const rows = await prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
    WITH due AS (
      SELECT "id"
      FROM "Reminder"
      WHERE "status" = 'SCHEDULED'::"ReminderStatus"
        AND "claimStatus" IS NULL
        AND "scheduledFor" <= ${now}
      ORDER BY "scheduledFor" ASC
      LIMIT ${limit}
      FOR UPDATE SKIP LOCKED
    )
    UPDATE "Reminder" AS r
    SET
      "claimStatus" = 'CLAIMED'::"ReminderClaimStatus",
      "claimedAt" = ${now},
      "deliveryAttempts" = r."deliveryAttempts" + 1,
      "updatedAt" = ${now}
    FROM due
    WHERE r."id" = due."id"
    RETURNING r."id"
  `);

  return rows.map((row) => row.id);
}

async function loadClaimedReminderRows(reminderIds: string[]): Promise<DueReminderRow[]> {
  if (reminderIds.length === 0) {
    return [];
  }

  const ids = Prisma.join(reminderIds.map((id) => Prisma.sql`${id}`));

  return prisma.$queryRaw<DueReminderRow[]>(Prisma.sql`
    SELECT
      r."id" AS "reminderId",
      t."id" AS "taskId",
      t."text" AS "taskText",
      r."scheduledFor" AS "scheduledFor",
      r."familyId" AS "familyId",
      r."groupBindingId" AS "groupBindingId",
      gb."externalGroupId" AS "externalGroupId",
      gb."telegramDmChatId" AS "telegramDmChatId"
    FROM "Reminder" r
    INNER JOIN "Task" t ON t."id" = r."taskId"
    LEFT JOIN "GroupBinding" gb ON gb."id" = r."groupBindingId"
    WHERE r."id" IN (${ids})
    ORDER BY r."scheduledFor" ASC
  `);
}

async function markReminderFired(reminderId: string, firedAt: Date) {
  await prisma.$executeRaw(Prisma.sql`
    UPDATE "Reminder"
    SET
      "status" = 'FIRED'::"ReminderStatus",
      "claimStatus" = NULL,
      "firedAt" = ${firedAt},
      "failedAt" = NULL,
      "lastError" = NULL,
      "updatedAt" = ${firedAt}
    WHERE "id" = ${reminderId}
  `);
}

async function markReminderFailed(reminderId: string, failedAt: Date, errorMessage: string) {
  await prisma.$executeRaw(Prisma.sql`
    UPDATE "Reminder"
    SET
      "status" = 'FAILED'::"ReminderStatus",
      "claimStatus" = NULL,
      "failedAt" = ${failedAt},
      "lastError" = ${errorMessage.slice(0, 1000)},
      "updatedAt" = ${failedAt}
    WHERE "id" = ${reminderId}
  `);
}

async function releaseReminderClaim(reminderId: string, releasedAt: Date, errorMessage: string) {
  await prisma.$executeRaw(Prisma.sql`
    UPDATE "Reminder"
    SET
      "claimStatus" = NULL,
      "lastError" = ${errorMessage.slice(0, 1000)},
      "updatedAt" = ${releasedAt}
    WHERE "id" = ${reminderId}
  `);
}

export async function processDueReminders(params?: {
  now?: Date;
  limit?: number;
}): Promise<ProcessDueRemindersResult> {
  const now = params?.now ?? new Date();
  const limit = params?.limit ?? 25;

  const claimedReminderIds = await claimDueReminders(now, limit);
  const claimedRows = await loadClaimedReminderRows(claimedReminderIds);

  let firedCount = 0;
  let failedCount = 0;
  let skippedCount = 0;
  const processedReminderIds: string[] = [];

  for (const row of claimedRows) {
    const destinationChatId = row.externalGroupId ?? row.telegramDmChatId;

    if (!destinationChatId) {
      skippedCount += 1;
      await releaseReminderClaim(row.reminderId, new Date(), "missing_telegram_destination");
      continue;
    }

    try {
      await sendTelegramMessage(destinationChatId, buildReminderMessage(row.taskText));
      await markReminderFired(row.reminderId, new Date());
      firedCount += 1;
      processedReminderIds.push(row.reminderId);
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
      failedCount += 1;
      processedReminderIds.push(row.reminderId);
    }
  }

  return {
    now: now.toISOString(),
    claimedCount: claimedReminderIds.length,
    firedCount,
    failedCount,
    skippedCount,
    processedReminderIds,
  };
}
