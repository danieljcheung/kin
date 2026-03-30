import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  buildTelegramDeepLink,
  deriveDashboardConnectionState,
  getDashboardStatusCopy,
} from "@/lib/dashboard";

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

export async function GET(req: NextRequest) {
  const cognitoSub = normalizeQueryValue(req.nextUrl.searchParams.get("cognitoSub"));

  if (!cognitoSub) {
    return jsonError(
      400,
      "VALIDATION_ERROR",
      "A Cognito user id is required.",
      { cognitoSub: "Provide cognitoSub." },
    );
  }

  try {
    const user = await prisma.user.findUnique({
      where: {
        cognitoSub,
      },
      select: {
        id: true,
        cognitoSub: true,
        email: true,
        name: true,
        role: true,
        ownedFamilies: {
          orderBy: {
            createdAt: "asc",
          },
          take: 1,
          select: {
            id: true,
            name: true,
            createdAt: true,
            ownerId: true,
            assistant: {
              select: {
                id: true,
                name: true,
                status: true,
                runtimeType: true,
              },
            },
            onboardingState: {
              select: {
                status: true,
                currentStep: true,
                updatedAt: true,
              },
            },
            groupBindings: {
              orderBy: {
                updatedAt: "desc",
              },
              take: 1,
              select: {
                id: true,
                platform: true,
                status: true,
                groupName: true,
                externalGroupId: true,
                onboardingToken: true,
                botUsername: true,
                telegramDmUsername: true,
                telegramDmFirstName: true,
                createdAt: true,
                updatedAt: true,
                verifiedAt: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      return jsonError(404, "USER_NOT_FOUND", "Owner account was not found.");
    }

    const family = user.ownedFamilies[0] ?? null;

    if (!family) {
      return jsonError(404, "HOUSEHOLD_NOT_FOUND", "No household exists for this owner.");
    }

    const binding = family.groupBindings[0] ?? null;
    const onboarding = family.onboardingState;
    const assistant = family.assistant;
    const connectionState = deriveDashboardConnectionState({
      bindingStatus: binding?.status,
      onboardingStatus: onboarding?.status,
      assistantStatus: assistant?.status,
      externalGroupId: binding?.externalGroupId,
      verifiedAt: binding?.verifiedAt,
    });
    const statusCopy = getDashboardStatusCopy(connectionState);
    const telegramDeepLink = buildTelegramDeepLink(
      binding?.botUsername ?? process.env.KIN_TELEGRAM_BOT_USERNAME ?? null,
      binding?.onboardingToken,
    );

    return NextResponse.json({
      data: {
        owner: {
          id: user.id,
          cognitoSub: user.cognitoSub,
          email: user.email,
          name: user.name,
          role: user.role,
        },
        household: {
          id: family.id,
          name: family.name,
          createdAt: family.createdAt,
        },
        assistant: assistant
          ? {
              id: assistant.id,
              name: assistant.name,
              status: assistant.status,
              runtimeType: assistant.runtimeType,
            }
          : null,
        onboarding: onboarding
          ? {
              status: onboarding.status,
              currentStep: onboarding.currentStep,
              updatedAt: onboarding.updatedAt,
            }
          : null,
        telegram: {
          channel: "Telegram",
          deepLink: telegramDeepLink,
          reconnectUrl: binding
            ? `/onboarding/connect-telegram?bindingId=${encodeURIComponent(binding.id)}&onboardingToken=${encodeURIComponent(binding.onboardingToken)}${telegramDeepLink ? `&deepLink=${encodeURIComponent(telegramDeepLink)}` : ""}`
            : "/onboarding/connect-telegram",
          binding: binding
            ? {
                id: binding.id,
                platform: binding.platform,
                status: binding.status,
                groupName: binding.groupName,
                externalGroupId: binding.externalGroupId,
                onboardingToken: binding.onboardingToken,
                botUsername: binding.botUsername,
                telegramDmUsername: binding.telegramDmUsername,
                telegramDmFirstName: binding.telegramDmFirstName,
                createdAt: binding.createdAt,
                updatedAt: binding.updatedAt,
                verifiedAt: binding.verifiedAt,
              }
            : null,
        },
        connection: {
          state: connectionState,
          isHealthy: connectionState === "CONNECTED",
          badge: statusCopy.badge,
          title: statusCopy.title,
          description: statusCopy.description,
          tone: statusCopy.tone,
        },
      },
    });
  } catch (error) {
    console.error("Dashboard state error", error);
    return jsonError(
      500,
      "INTERNAL_SERVER_ERROR",
      "Unable to load dashboard state right now.",
    );
  }
}
