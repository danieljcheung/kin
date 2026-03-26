CREATE TYPE "UserRole" AS ENUM ('OWNER');
CREATE TYPE "AssistantStatus" AS ENUM ('PROVISIONING', 'ACTIVE', 'DISABLED');
CREATE TYPE "OnboardingStatus" AS ENUM ('ACCOUNT_CREATED', 'TELEGRAM_GROUP_BINDING_PENDING', 'TELEGRAM_GROUP_BINDING_IN_PROGRESS', 'COMPLETE');
CREATE TYPE "OnboardingStep" AS ENUM ('ACCOUNT_SETUP', 'TELEGRAM_GROUP_BINDING', 'COMPLETE');
CREATE TYPE "MessagingPlatform" AS ENUM ('TELEGRAM');
CREATE TYPE "GroupBindingStatus" AS ENUM ('INVITE_PENDING', 'BOT_ADDED', 'ACTIVE', 'FAILED');

ALTER TABLE "User"
ADD COLUMN "role" "UserRole" NOT NULL DEFAULT 'OWNER';

ALTER TABLE "Family"
RENAME COLUMN "userId" TO "ownerId";

ALTER TABLE "Assistant"
ADD COLUMN "status_new" "AssistantStatus" NOT NULL DEFAULT 'PROVISIONING';

UPDATE "Assistant"
SET "status_new" = CASE
  WHEN UPPER("status") = 'ACTIVE' THEN 'ACTIVE'::"AssistantStatus"
  ELSE 'PROVISIONING'::"AssistantStatus"
END;

ALTER TABLE "Assistant" DROP COLUMN "status";
ALTER TABLE "Assistant" RENAME COLUMN "status_new" TO "status";
ALTER TABLE "Assistant" ADD CONSTRAINT "Assistant_familyId_key" UNIQUE ("familyId");

CREATE TABLE "OnboardingState" (
    "id" TEXT NOT NULL,
    "status" "OnboardingStatus" NOT NULL DEFAULT 'ACCOUNT_CREATED',
    "currentStep" "OnboardingStep" NOT NULL DEFAULT 'ACCOUNT_SETUP',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "familyId" TEXT NOT NULL,

    CONSTRAINT "OnboardingState_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "GroupBinding"
ADD COLUMN "platform" "MessagingPlatform" NOT NULL DEFAULT 'TELEGRAM',
ADD COLUMN "status" "GroupBindingStatus" NOT NULL DEFAULT 'INVITE_PENDING',
ADD COLUMN "externalGroupId" TEXT,
ADD COLUMN "inviteToken" TEXT,
ADD COLUMN "botUsername" TEXT,
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN "verifiedAt" TIMESTAMP(3),
ALTER COLUMN "groupName" DROP NOT NULL;

UPDATE "GroupBinding"
SET
  "externalGroupId" = "groupExternalId",
  "inviteToken" = md5(random()::text || clock_timestamp()::text || "id"),
  "status" = 'ACTIVE'::"GroupBindingStatus",
  "updatedAt" = CURRENT_TIMESTAMP,
  "verifiedAt" = CURRENT_TIMESTAMP;

ALTER TABLE "GroupBinding" DROP CONSTRAINT "GroupBinding_messagingConnectionId_fkey";
ALTER TABLE "GroupBinding" DROP COLUMN "groupExternalId";
ALTER TABLE "GroupBinding" DROP COLUMN "messagingConnectionId";

DROP TABLE "MessagingConnection";

ALTER TABLE "GroupBinding"
ALTER COLUMN "inviteToken" SET NOT NULL;

INSERT INTO "OnboardingState" (
  "id",
  "status",
  "currentStep",
  "createdAt",
  "updatedAt",
  "familyId"
)
SELECT
  md5("Family"."id" || clock_timestamp()::text || random()::text),
  CASE
    WHEN EXISTS (
      SELECT 1
      FROM "GroupBinding"
      WHERE "GroupBinding"."familyId" = "Family"."id"
    ) THEN 'COMPLETE'::"OnboardingStatus"
    ELSE 'TELEGRAM_GROUP_BINDING_PENDING'::"OnboardingStatus"
  END,
  CASE
    WHEN EXISTS (
      SELECT 1
      FROM "GroupBinding"
      WHERE "GroupBinding"."familyId" = "Family"."id"
    ) THEN 'COMPLETE'::"OnboardingStep"
    ELSE 'TELEGRAM_GROUP_BINDING'::"OnboardingStep"
  END,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP,
  "Family"."id"
FROM "Family";

CREATE UNIQUE INDEX "OnboardingState_familyId_key" ON "OnboardingState"("familyId");
CREATE UNIQUE INDEX "GroupBinding_externalGroupId_key" ON "GroupBinding"("externalGroupId");
CREATE UNIQUE INDEX "GroupBinding_inviteToken_key" ON "GroupBinding"("inviteToken");
CREATE INDEX "Family_ownerId_idx" ON "Family"("ownerId");
CREATE INDEX "GroupBinding_familyId_status_idx" ON "GroupBinding"("familyId", "status");

ALTER TABLE "Family" DROP CONSTRAINT "Family_userId_fkey";
ALTER TABLE "Family" ADD CONSTRAINT "Family_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OnboardingState" ADD CONSTRAINT "OnboardingState_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;
