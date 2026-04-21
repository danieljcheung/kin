ALTER TABLE "Reminder"
  ADD COLUMN IF NOT EXISTS "scheduleName" TEXT,
  ADD COLUMN IF NOT EXISTS "scheduledBy" TEXT,
  ADD COLUMN IF NOT EXISTS "canceledAt" TIMESTAMP(3);

CREATE UNIQUE INDEX IF NOT EXISTS "Reminder_scheduleName_key" ON "Reminder"("scheduleName");
