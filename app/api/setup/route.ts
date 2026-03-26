import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type SetupPayload = {
  email: string;
  password: string;
  familyName: string;
  assistantName: string;
};

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

function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function validateSetupPayload(body: unknown):
  | { success: true; data: SetupPayload }
  | { success: false; errors: Record<string, string> } {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return {
      success: false,
      errors: { body: "Request body must be a JSON object." },
    };
  }

  const raw = body as Record<string, unknown>;
  const data: SetupPayload = {
    email: normalizeString(raw.email).toLowerCase(),
    password: typeof raw.password === "string" ? raw.password : "",
    familyName: normalizeString(raw.familyName),
    assistantName: normalizeString(raw.assistantName),
  };

  const errors: Record<string, string> = {};

  if (!data.email) {
    errors.email = "Email is required.";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.email = "Email must be valid.";
  }

  if (!data.password) {
    errors.password = "Password is required.";
  } else if (data.password.length < 8) {
    errors.password = "Password must be at least 8 characters.";
  } else if (data.password.length > 128) {
    errors.password = "Password must be 128 characters or fewer.";
  }

  if (!data.familyName) {
    errors.familyName = "Family name is required.";
  } else if (data.familyName.length > 80) {
    errors.familyName = "Family name must be 80 characters or fewer.";
  }

  if (!data.assistantName) {
    errors.assistantName = "Assistant name is required.";
  } else if (data.assistantName.length > 80) {
    errors.assistantName = "Assistant name must be 80 characters or fewer.";
  }

  if (Object.keys(errors).length > 0) {
    return { success: false, errors };
  }

  return { success: true, data };
}

function buildTelegramDeepLink(inviteToken: string) {
  if (!TELEGRAM_BOT_USERNAME) {
    return null;
  }

  const startGroupParam = encodeURIComponent(`kin-${inviteToken}`);
  return `https://t.me/${TELEGRAM_BOT_USERNAME}?startgroup=${startGroupParam}`;
}

export async function POST(req: NextRequest) {
  let body: unknown;

  try {
    body = await req.json();
  } catch {
    return jsonError(400, "INVALID_JSON", "Request body must be valid JSON.");
  }

  const validation = validateSetupPayload(body);

  if (!validation.success) {
    return jsonError(
      400,
      "VALIDATION_ERROR",
      "Setup request validation failed.",
      validation.errors,
    );
  }

  const { email, password, familyName, assistantName } = validation.data;

  try {
    const hashedPassword = await bcrypt.hash(password, 12);
    const inviteToken = randomBytes(18).toString("base64url");

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          password: hashedPassword,
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
          name: assistantName,
          status: "ACTIVE",
          runtimeType: "openclaw",
          familyId: family.id,
        },
      });

      const onboarding = await tx.onboardingState.create({
        data: {
          familyId: family.id,
          status: "TELEGRAM_GROUP_BINDING_PENDING",
          currentStep: "TELEGRAM_GROUP_BINDING",
        },
      });

      const binding = await tx.groupBinding.create({
        data: {
          familyId: family.id,
          inviteToken,
          botUsername: TELEGRAM_BOT_USERNAME,
        },
      });

      return {
        user,
        family,
        assistant,
        onboarding,
        binding,
      };
    });

    return NextResponse.json(
      {
        data: {
          owner: {
            id: result.user.id,
            email: result.user.email,
            role: result.user.role,
          },
          family: {
            id: result.family.id,
            name: result.family.name,
          },
          assistant: {
            id: result.assistant.id,
            name: result.assistant.name,
            status: result.assistant.status,
            runtimeType: result.assistant.runtimeType,
          },
          onboarding: {
            id: result.onboarding.id,
            status: result.onboarding.status,
            currentStep: result.onboarding.currentStep,
          },
          telegram: {
            botUsername: result.binding.botUsername,
            deepLink: buildTelegramDeepLink(result.binding.inviteToken),
            binding: {
              id: result.binding.id,
              platform: result.binding.platform,
              status: result.binding.status,
              inviteToken: result.binding.inviteToken,
            },
          },
        },
      },
      { status: 201 },
    );
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const target = Array.isArray(error.meta?.target)
        ? error.meta.target.join(",")
        : String(error.meta?.target ?? "");

      if (target.includes("email")) {
        return jsonError(
          409,
          "EMAIL_ALREADY_EXISTS",
          "An owner account already exists for that email.",
        );
      }

      return jsonError(
        409,
        "RESOURCE_CONFLICT",
        "A setup resource already exists with conflicting unique data.",
      );
    }

    console.error("Setup error", error);
    return jsonError(
      500,
      "INTERNAL_SERVER_ERROR",
      "Unable to complete setup right now.",
    );
  }
}
