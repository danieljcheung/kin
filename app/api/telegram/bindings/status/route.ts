import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

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

function normalizeQueryValue(value: string | null) {
  return value?.trim() ?? "";
}

function deriveFrontendState(bindingStatus: string, onboardingStatus: string) {
  if (bindingStatus === "ACTIVE" || onboardingStatus === "COMPLETE") {
    return "COMPLETE";
  }

  if (bindingStatus === "BOT_ADDED") {
    return "TELEGRAM_GROUP_BINDING_IN_PROGRESS";
  }

  return "TELEGRAM_GROUP_BINDING_PENDING";
}

export async function GET(req: NextRequest) {
  const bindingId = normalizeQueryValue(req.nextUrl.searchParams.get("bindingId"));
  const onboardingToken = normalizeQueryValue(
    req.nextUrl.searchParams.get("onboardingToken"),
  );

  if (!bindingId && !onboardingToken) {
    return jsonError(
      400,
      "VALIDATION_ERROR",
      "A bindingId or onboardingToken is required.",
      {
        bindingId: "Provide bindingId or onboardingToken.",
      },
    );
  }

  try {
    const binding = await prisma.groupBinding.findFirst({
      where: {
        platform: "TELEGRAM",
        ...(bindingId ? { id: bindingId } : {}),
        ...(onboardingToken ? { onboardingToken } : {}),
      },
      include: {
        family: {
          select: {
            id: true,
            name: true,
            onboardingState: {
              select: {
                status: true,
                currentStep: true,
                updatedAt: true,
              },
            },
          },
        },
      },
    });

    if (!binding) {
      return jsonError(
        404,
        "BINDING_NOT_FOUND",
        "Telegram onboarding status was not found.",
      );
    }

    const onboardingStatus =
      binding.family.onboardingState?.status ?? "TELEGRAM_GROUP_BINDING_PENDING";
    const currentStep =
      binding.family.onboardingState?.currentStep ?? "TELEGRAM_GROUP_BINDING";

    return NextResponse.json({
      data: {
        family: {
          id: binding.family.id,
          name: binding.family.name,
        },
        onboarding: {
          status: onboardingStatus,
          currentStep,
          updatedAt: binding.family.onboardingState?.updatedAt ?? null,
        },
        telegram: {
          binding: {
            id: binding.id,
            onboardingToken: binding.onboardingToken,
            platform: binding.platform,
            status: binding.status,
            groupName: binding.groupName,
            externalGroupId: binding.externalGroupId,
            verifiedAt: binding.verifiedAt,
            telegramDmUsername: binding.telegramDmUsername,
            telegramDmFirstName: binding.telegramDmFirstName,
          },
        },
        frontend: {
          state: deriveFrontendState(binding.status, onboardingStatus),
          isComplete:
            binding.status === "ACTIVE" || onboardingStatus === "COMPLETE",
        },
      },
    });
  } catch (error) {
    console.error("Telegram binding status error", error);
    return jsonError(
      500,
      "INTERNAL_SERVER_ERROR",
      "Unable to load Telegram onboarding status right now.",
    );
  }
}
