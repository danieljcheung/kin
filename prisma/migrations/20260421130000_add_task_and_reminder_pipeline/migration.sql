DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TaskKind') THEN
    CREATE TYPE "TaskKind" AS ENUM ('REMINDER', 'GROCERY_ITEM', 'LIST_ITEM', 'FOLLOW_UP');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TaskStatus') THEN
    CREATE TYPE "TaskStatus" AS ENUM ('OPEN', 'DONE', 'CANCELED');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ReminderStatus') THEN
    CREATE TYPE "ReminderStatus" AS ENUM ('SCHEDULED', 'FIRED', 'CANCELED', 'FAILED');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ReminderClaimStatus') THEN
    CREATE TYPE "ReminderClaimStatus" AS ENUM ('CLAIMED');
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS "Task" (
  "id" TEXT NOT NULL,
  "kind" "TaskKind" NOT NULL,
  "status" "TaskStatus" NOT NULL DEFAULT 'OPEN',
  "text" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "familyId" TEXT NOT NULL,
  "groupBindingId" TEXT,
  "sourceKinEventId" TEXT,

  CONSTRAINT "Task_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Task_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Task_groupBindingId_fkey" FOREIGN KEY ("groupBindingId") REFERENCES "GroupBinding"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "Task_sourceKinEventId_fkey" FOREIGN KEY ("sourceKinEventId") REFERENCES "KinEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "Reminder" (
  "id" TEXT NOT NULL,
  "status" "ReminderStatus" NOT NULL DEFAULT 'SCHEDULED',
  "scheduledFor" TIMESTAMP(3) NOT NULL,
  "claimStatus" "ReminderClaimStatus",
  "claimedAt" TIMESTAMP(3),
  "firedAt" TIMESTAMP(3),
  "failedAt" TIMESTAMP(3),
  "lastError" TEXT,
  "deliveryAttempts" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "taskId" TEXT NOT NULL,
  "familyId" TEXT NOT NULL,
  "groupBindingId" TEXT,
  "sourceKinEventId" TEXT,

  CONSTRAINT "Reminder_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Reminder_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Reminder_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Reminder_groupBindingId_fkey" FOREIGN KEY ("groupBindingId") REFERENCES "GroupBinding"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "Reminder_sourceKinEventId_fkey" FOREIGN KEY ("sourceKinEventId") REFERENCES "KinEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "Task_familyId_status_createdAt_idx" ON "Task"("familyId", "status", "createdAt");
CREATE INDEX IF NOT EXISTS "Task_familyId_kind_createdAt_idx" ON "Task"("familyId", "kind", "createdAt");
CREATE INDEX IF NOT EXISTS "Task_groupBindingId_createdAt_idx" ON "Task"("groupBindingId", "createdAt");
CREATE INDEX IF NOT EXISTS "Task_sourceKinEventId_idx" ON "Task"("sourceKinEventId");

CREATE INDEX IF NOT EXISTS "Reminder_taskId_idx" ON "Reminder"("taskId");
CREATE INDEX IF NOT EXISTS "Reminder_familyId_status_scheduledFor_idx" ON "Reminder"("familyId", "status", "scheduledFor");
CREATE INDEX IF NOT EXISTS "Reminder_groupBindingId_scheduledFor_idx" ON "Reminder"("groupBindingId", "scheduledFor");
CREATE INDEX IF NOT EXISTS "Reminder_sourceKinEventId_idx" ON "Reminder"("sourceKinEventId");
