ALTER TABLE "GroupBinding"
ADD COLUMN "telegramDmUserId" TEXT,
ADD COLUMN "telegramDmChatId" TEXT,
ADD COLUMN "telegramDmUsername" TEXT,
ADD COLUMN "telegramDmFirstName" TEXT;

CREATE INDEX "GroupBinding_telegramDmUserId_status_idx"
ON "GroupBinding"("telegramDmUserId", "status");
