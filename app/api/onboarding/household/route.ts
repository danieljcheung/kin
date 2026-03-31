import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type CreateHouseholdBody = {
  cognitoSub: string;
  email: string;
  name?: string;
  familyName: string;
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

function validateBody(body: unknown):
  | { success: true; data: CreateHouseholdBody }
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

  const data: CreateHouseholdBody = {
    cognitoSub: normalizeString(raw.cognitoSub),
    email: normalizeString(raw.email).toLowerCase(),
    name: normalizeString(raw.name) || undefined,
    familyName: normalizeString(raw.familyName),
  };

  const errors: Record<string, string> = {};

  if (!data.cognitoSub) {
    errors.cognitoSub = "Cognito user id is required.";
  }

  if (!data.email) {
    errors.email = "Email is required.";
  }

  if (!data.familyName) {
    errors.familyName = "Household name is required.";
  }

  if (Object.keys(errors).length > 0) {
    return { success: false, errors };
  }

  return { success: true, data };
}

function slugifyFamilyName(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

function buildOnboardingToken(familyName: string) {
  const base = slugifyFamilyName(familyName) || "kin";
  const suffix = Math.random().toString(36).slice(2, 10);
  return `${base}-${suffix}`;
}

export async function POST(req: NextRequest) {
  try {
    let body: unknown;

    try {
      body = await req.json();
    } catch {
      return jsonError(400, "INVALID_JSON", "Request body must be valid JSON.");
    }

    const validation = validateBody(body);

    if (!validation.success) {
      return jsonError(
        400,
        "VALIDATION_ERROR",
        "Household onboarding validation failed.",
        validation.errors,
      );
    }

    const { cognitoSub, email, name, familyName } = validation.data;

    const existingUserByCognito = await prisma.user.findUnique({
      where: {
        cognitoSub,
      },
      include: {
        ownedFamilies: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (existingUserByCognito && existingUserByCognito.ownedFamilies.length > 0) {
      return jsonError(
        409,
        "HOUSEHOLD_ALREADY_EXISTS",
        "This account already owns a household.",
      );
    }

    const existingUserByEmail = await prisma.user.findUnique({
      where: {
        email,
      },
      select: {
        id: true,
        cognitoSub: true,
      },
    });

    if (
      existingUserByEmail &&
      existingUserByEmail.cognitoSub &&
      existingUserByEmail.cognitoSub !== cognitoSub
    ) {
      return jsonError(
        409,
        "EMAIL_ALREADY_LINKED",
        "This email is already linked to an existing Kin household.",
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const user = existingUserByCognito
        ? await tx.user.update({
            where: {
              id: existingUserByCognito.id,
            },
            data: {
              email,
              name,
            },
          })
        : await tx.user.create({
            data: {
              cognitoSub,
              email,
              name,
              role: "OWNER",
            },
          });

      const family = await tx.family.create({
        data: {
          name: familyName,
          ownerId: user.id,
        },
      });

      const assistant = await tx.assistant.create({
        data: {
          familyId: family.id,
          name: "Kin",
          status: "ACTIVE",
        },
      });

      const onboardingState = await tx.onboardingState.create({
        data: {
          familyId: family.id,
          status: "TELEGRAM_GROUP_BINDING_PENDING",
          currentStep: "TELEGRAM_GROUP_BINDING",
        },
      });

      const onboardingToken = buildOnboardingToken(familyName);

      const groupBinding = await tx.groupBinding.create({
        data: {
          familyId: family.id,
          platform: "TELEGRAM",
          status: "DM_STARTED",
          onboardingToken,
          botUsername: process.env.KIN_TELEGRAM_BOT_USERNAME || null,
        },
      });

      return {
        user,
        family,
        assistant,
        onboardingState,
        groupBinding,
      };
    });

    const telegramBotUsername = process.env.KIN_TELEGRAM_BOT_USERNAME;
    const telegramDeepLink =
      telegramBotUsername && result.groupBinding.onboardingToken
        ? `https://t.me/${telegramBotUsername}?start=${encodeURIComponent(result.groupBinding.onboardingToken)}`
        : null;

    return NextResponse.json({
      data: {
        user: {
          id: result.user.id,
          email: result.user.email,
          name: result.user.name,
          cognitoSub: result.user.cognitoSub,
        },
        family: {
          id: result.family.id,
          name: result.family.name,
          ownerId: result.family.ownerId,
        },
        assistant: {
          id: result.assistant.id,
          name: result.assistant.name,
          status: result.assistant.status,
        },
        onboarding: {
          id: result.onboardingState.id,
          status: result.onboardingState.status,
          currentStep: result.onboardingState.currentStep,
        },
        telegram: {
          binding: {
            id: result.groupBinding.id,
            status: result.groupBinding.status,
            platform: result.groupBinding.platform,
            onboardingToken: result.groupBinding.onboardingToken,
            botUsername: result.groupBinding.botUsername,
          },
          deepLink: telegramDeepLink,
        },
      },
    });
  } catch (error) {
    console.error("Household onboarding error", error);

    return jsonError(
      500,
      "INTERNAL_SERVER_ERROR",
      "Unable to create household right now.",
    );
  }
}
