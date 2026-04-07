ALTER TABLE "GroupBinding"
ADD COLUMN IF NOT EXISTS "telegramDmUserId" TEXT,
ADD COLUMN IF NOT EXISTS "telegramDmChatId" TEXT,
ADD COLUMN IF NOT EXISTS "telegramDmUsername" TEXT,
ADD COLUMN IF NOT EXISTS "telegramDmFirstName" TEXT;

CREATE INDEX IF NOT EXISTS "GroupBinding_telegramDmUserId_status_idx"
ON "GroupBinding"("telegramDmUserId", "status");
