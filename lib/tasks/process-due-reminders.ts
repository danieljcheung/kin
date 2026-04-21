import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { deliverReminderById } from "@/lib/tasks/reminder-delivery";

export interface ProcessDueRemindersResult {
  now: string;
  claimedCount: number;
  firedCount: number;
  failedCount: number;
  skippedCount: number;
  processedReminderIds: string[];
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

export async function processDueReminders(params?: {
  now?: Date;
  limit?: number;
}): Promise<ProcessDueRemindersResult> {
  const now = params?.now ?? new Date();
  const limit = params?.limit ?? 25;

  const claimedReminderIds = await claimDueReminders(now, limit);
  let firedCount = 0;
  let failedCount = 0;
  let skippedCount = 0;
  const processedReminderIds: string[] = [];

  for (const reminderId of claimedReminderIds) {
    const result = await deliverReminderById({
      reminderId,
      requireClaimed: true,
      missingDestination: "release",
    });

    if (result.kind === "fired") {
      firedCount += 1;
      processedReminderIds.push(reminderId);
      continue;
    }

    if (result.kind === "failed") {
      failedCount += 1;
      processedReminderIds.push(reminderId);
      continue;
    }

    skippedCount += 1;
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
