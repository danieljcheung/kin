import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type CompleteBindingPayload = {
onboardingToken: string;
telegramGroupId: string;
telegramGroupTitle?: string;
botUsername?: string;
eventType: "bot_added" | "binding_confirmed";
};

function jsonError(
status: number,
code: string,
message: string,
details?: Record<string, string>,
) {
return NextResponse.json(
{
error: {
code,
message,
...(details ? { details } : {}),
},
},
{ status },
);
}

function normalizeString(value: unknown) {
return typeof value === "string" ? value.trim() : "";
}

function validatePayload(body: unknown):
| { success: true; data: CompleteBindingPayload }
| { success: false; errors: Record<string, string> } {
if (!body || typeof body !== "object" || Array.isArray(body)) {
return {
success: false,
errors: {
body: "Request body must be a JSON object.",
},
};
}

const raw = body as Record<string, unknown>;
const rawEventType = normalizeString(raw.eventType);

const errors: Record<string, string> = {};

if (!normalizeString(raw.onboardingToken) && !normalizeString(raw.inviteToken)) {
errors.onboardingToken = "Onboarding token is required.";
}

if (!normalizeString(raw.telegramGroupId)) {
errors.telegramGroupId = "Telegram group ID is required.";
}

if (!rawEventType) {
errors.eventType = "Event type is required.";
} else if (
rawEventType !== "bot_added" &&
rawEventType !== "binding_confirmed"
) {
errors.eventType =
"Event type must be one of: bot_added, binding_confirmed.";
}

if (Object.keys(errors).length > 0) {
return { success: false, errors };
}

return {
success: true,
data: {
onboardingToken:
normalizeString(raw.onboardingToken) || normalizeString(raw.inviteToken),
telegramGroupId: normalizeString(raw.telegramGroupId),
telegramGroupTitle: normalizeString(raw.telegramGroupTitle) || undefined,
botUsername: normalizeString(raw.botUsername) || undefined,
eventType:
rawEventType === "binding_confirmed"
? "binding_confirmed"
: "bot_added",
},
};
}

export async function POST(req: NextRequest) {
try {
const configuredSecret = process.env.KIN_TELEGRAM_WEBHOOK_SECRET;

if (!configuredSecret) {
return jsonError(
500,
"CONFIG_ERROR",
"KIN_TELEGRAM_WEBHOOK_SECRET is not configured.",
);
}

const providedSecret = req.headers.get("x-kin-telegram-secret");

if (providedSecret !== configuredSecret) {
return jsonError(
401,
"UNAUTHORIZED",
"Invalid Telegram webhook secret.",
);
}

let body: unknown;

try {
body = await req.json();
} catch {
return jsonError(400, "INVALID_JSON", "Request body must be valid JSON.");
}

const validation = validatePayload(body);

if (!validation.success) {
return jsonError(
400,
"VALIDATION_ERROR",
"Telegram binding completion validation failed.",
validation.errors,
);
}

const { onboardingToken, telegramGroupId, telegramGroupTitle, botUsername, eventType } =
validation.data;

const binding = await prisma.groupBinding.findFirst({
where: {
onboardingToken,
platform: "TELEGRAM",
},
include: {
family: {
select: {
id: true,
name: true,
},
},
},
});

if (!binding) {
return jsonError(
404,
"BINDING_NOT_FOUND",
"No Telegram binding matches that onboarding token.",
);
}

const existingBindingForGroup = await prisma.groupBinding.findFirst({
where: {
platform: "TELEGRAM",
externalGroupId: telegramGroupId,
NOT: {
id: binding.id,
},
},
select: {
id: true,
familyId: true,
},
});

if (existingBindingForGroup) {
return jsonError(
409,
"GROUP_ALREADY_BOUND",
"That Telegram group is already bound to another family.",
);
}

if (
binding.status === "ACTIVE" &&
binding.externalGroupId === telegramGroupId
) {
return NextResponse.json({
data: {
family: binding.family,
binding: {
id: binding.id,
platform: binding.platform,
status: binding.status,
groupName: binding.groupName,
externalGroupId: binding.externalGroupId,
verifiedAt: binding.verifiedAt,
},
onboarding: {
status: "COMPLETE",
currentStep: "COMPLETE",
},
eventType,
idempotent: true,
},
});
}

const nextBindingStatus =
eventType === "binding_confirmed" ? "ACTIVE" : "BOT_ADDED";

const nextOnboardingStatus =
eventType === "binding_confirmed"
? "COMPLETE"
: "TELEGRAM_GROUP_BINDING_IN_PROGRESS";

const nextOnboardingStep =
eventType === "binding_confirmed"
? "COMPLETE"
: "TELEGRAM_GROUP_BINDING";

const result = await prisma.$transaction(async (tx) => {
const updatedBinding = await tx.groupBinding.update({
where: {
id: binding.id,
},
data: {
status: nextBindingStatus,
externalGroupId: telegramGroupId,
groupName: telegramGroupTitle ?? binding.groupName,
botUsername: botUsername ?? binding.botUsername,
verifiedAt:
eventType === "binding_confirmed" ? new Date() : binding.verifiedAt,
},
});

const updatedOnboarding = await tx.onboardingState.update({
where: {
familyId: binding.familyId,
},
data: {
status: nextOnboardingStatus,
currentStep: nextOnboardingStep,
},
});

return {
updatedBinding,
updatedOnboarding,
};
});

return NextResponse.json({
data: {
family: binding.family,
binding: {
id: result.updatedBinding.id,
platform: result.updatedBinding.platform,
status: result.updatedBinding.status,
groupName: result.updatedBinding.groupName,
externalGroupId: result.updatedBinding.externalGroupId,
botUsername: result.updatedBinding.botUsername,
verifiedAt: result.updatedBinding.verifiedAt,
},
onboarding: {
status: result.updatedOnboarding.status,
currentStep: result.updatedOnboarding.currentStep,
},
eventType,
idempotent: false,
},
});
} catch (error) {
console.error("Telegram binding completion error", error);

return jsonError(
500,
"INTERNAL_SERVER_ERROR",
"Unable to complete Telegram binding right now.",
);
}
}
