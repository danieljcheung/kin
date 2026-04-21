ALTER TABLE "Reminder"
  ADD COLUMN "scheduleName" TEXT,
  ADD COLUMN "scheduledBy" TEXT,
  ADD COLUMN "canceledAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "Reminder_scheduleName_key" ON "Reminder"("scheduleName");
