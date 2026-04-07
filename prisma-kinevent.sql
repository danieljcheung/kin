CREATE TYPE "KinEventCategory" AS ENUM (
'PLAN',
'EVENT',
'TASK',
'PREFERENCE',
'DECISION',
'QUESTION',
'ONBOARDING',
'UNKNOWN'
);

CREATE TABLE "KinEvent" (
"id" TEXT NOT NULL,
"platform" "MessagingPlatform" NOT NULL,
"category" "KinEventCategory" NOT NULL,
"dedupeKey" TEXT NOT NULL,
"updateId" TEXT,
"kind" TEXT NOT NULL,
"scope" TEXT,
"routeDecision" TEXT NOT NULL,
"routeReason" TEXT NOT NULL,
"chatId" TEXT,
"chatType" TEXT,
"chatTitle" TEXT,
"fromUserId" TEXT,
"fromUsername" TEXT,
"fromFirstName" TEXT,
"messageId" TEXT,
"text" TEXT,
"command" TEXT,
"oldStatus" TEXT,
"newStatus" TEXT,
"familyId" TEXT,
"groupBindingId" TEXT,
"raw" JSONB NOT NULL,
"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

CONSTRAINT "KinEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "KinEvent_dedupeKey_key" ON "KinEvent"("dedupeKey");
CREATE INDEX "KinEvent_familyId_createdAt_idx" ON "KinEvent"("familyId", "createdAt");
CREATE INDEX "KinEvent_familyId_category_createdAt_idx" ON "KinEvent"("familyId", "category", "createdAt");
CREATE INDEX "KinEvent_groupBindingId_createdAt_idx" ON "KinEvent"("groupBindingId", "createdAt");
CREATE INDEX "KinEvent_platform_createdAt_idx" ON "KinEvent"("platform", "createdAt");
CREATE INDEX "KinEvent_platform_category_createdAt_idx" ON "KinEvent"("platform", "category", "createdAt");
CREATE INDEX "KinEvent_platform_chatId_createdAt_idx" ON "KinEvent"("platform", "chatId", "createdAt");
CREATE INDEX "KinEvent_updateId_idx" ON "KinEvent"("updateId");
