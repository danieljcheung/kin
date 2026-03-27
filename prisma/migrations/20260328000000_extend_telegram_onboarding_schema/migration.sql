ALTER TYPE "GroupBindingStatus" RENAME TO "GroupBindingStatus_old";

CREATE TYPE "GroupBindingStatus" AS ENUM ('DM_STARTED', 'BOT_ADDED', 'ACTIVE', 'FAILED');

ALTER TABLE "GroupBinding"
ADD COLUMN "status_new" "GroupBindingStatus" NOT NULL DEFAULT 'DM_STARTED';

UPDATE "GroupBinding"
SET "status_new" = CASE
  WHEN "status"::text = 'INVITE_PENDING' THEN 'DM_STARTED'::"GroupBindingStatus"
  WHEN "status"::text = 'BOT_ADDED' THEN 'BOT_ADDED'::"GroupBindingStatus"
  WHEN "status"::text = 'ACTIVE' THEN 'ACTIVE'::"GroupBindingStatus"
  ELSE 'FAILED'::"GroupBindingStatus"
END;

ALTER TABLE "GroupBinding" DROP COLUMN "status";
ALTER TABLE "GroupBinding" RENAME COLUMN "status_new" TO "status";

DROP TYPE "GroupBindingStatus_old";

ALTER TABLE "GroupBinding" RENAME COLUMN "inviteToken" TO "onboardingToken";
ALTER INDEX "GroupBinding_inviteToken_key" RENAME TO "GroupBinding_onboardingToken_key";
