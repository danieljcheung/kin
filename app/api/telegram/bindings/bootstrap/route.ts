import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const TELEGRAM_BOT_USERNAME = process.env.KIN_TELEGRAM_BOT_USERNAME ?? null;

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

function buildTelegramDeepLink(onboardingToken: string) {
  if (!TELEGRAM_BOT_USERNAME) {
    return null;
  }

  return `https://t.me/${TELEGRAM_BOT_USERNAME}?start=${encodeURIComponent(onboardingToken)}`;
}

function mapOnboardingStatus(bindingStatus: string) {
  if (bindingStatus === "ACTIVE") {
    return "COMPLETE";
  }

  if (bindingStatus === "BOT_ADDED") {
    return "TELEGRAM_GROUP_BINDING_IN_PROGRESS";
  }

  return "TELEGRAM_GROUP_BINDING_PENDING";
}

export async function POST(req: NextRequest) {
  let body: unknown;

  try {
    body = await req.json();
  } catch {
    return jsonError(400, "INVALID_JSON", "Request body must be valid JSON.");
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return jsonError(400, "VALIDATION_ERROR", "Request body must be a JSON object.");
  }

  const { bindingId, onboardingToken, inviteToken } = body as Record<
    string,
    unknown
  >;
  const normalizedBindingId =
    typeof bindingId === "string" ? bindingId.trim() : "";
  const normalizedOnboardingToken =
    typeof onboardingToken === "string"
      ? onboardingToken.trim()
      : typeof inviteToken === "string"
        ? inviteToken.trim()
        : "";

  const details: Record<string, string> = {};

  if (!normalizedBindingId) {
    details.bindingId = "Binding ID is required.";
  }

  if (!normalizedOnboardingToken) {
    details.onboardingToken = "Onboarding token is required.";
  }

  if (Object.keys(details).length > 0) {
    return jsonError(
      400,
      "VALIDATION_ERROR",
      "Telegram binding bootstrap validation failed.",
      details,
    );
  }

  try {
    const binding = await prisma.groupBinding.findFirst({
      where: {
        id: normalizedBindingId,
        onboardingToken: normalizedOnboardingToken,
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
        "Telegram group binding bootstrap record was not found.",
      );
    }

    return NextResponse.json({
      data: {
        family: binding.family,
        onboarding: {
          step: "TELEGRAM_GROUP_BINDING",
          status: mapOnboardingStatus(binding.status),
        },
        telegram: {
          botUsername: binding.botUsername,
          deepLink: buildTelegramDeepLink(binding.onboardingToken),
          binding: {
            id: binding.id,
            platform: binding.platform,
            status: binding.status,
            groupName: binding.groupName,
            externalGroupId: binding.externalGroupId,
            onboardingToken: binding.onboardingToken,
            verifiedAt: binding.verifiedAt,
          },
        },
      },
    });
  } catch (error) {
    console.error("Telegram binding bootstrap error", error);
    return jsonError(
      500,
      "INTERNAL_SERVER_ERROR",
      "Unable to load Telegram binding bootstrap details right now.",
    );
  }
}
