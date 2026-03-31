import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { deleteCognitoUser, isCognitoAdminDeletionConfigured } from "@/lib/cognito-admin";

export const runtime = "nodejs";

type DeleteHouseholdBody = {
  cognitoSub: string;
  householdName: string;
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
  | { success: true; data: DeleteHouseholdBody }
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

  const data: DeleteHouseholdBody = {
    cognitoSub: normalizeString(raw.cognitoSub),
    householdName: normalizeString(raw.householdName),
  };

  const errors: Record<string, string> = {};

  if (!data.cognitoSub) {
    errors.cognitoSub = "Cognito user id is required.";
  }

  if (!data.householdName) {
    errors.householdName = "Household name is required.";
  }

  if (Object.keys(errors).length > 0) {
    return { success: false, errors };
  }

  return { success: true, data };
}

export async function DELETE(req: NextRequest) {
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
        "Delete household validation failed.",
        validation.errors,
      );
    }

    const { cognitoSub, householdName } = validation.data;

    const user = await prisma.user.findUnique({
      where: { cognitoSub },
      include: {
        ownedFamilies: {
          orderBy: { createdAt: "asc" },
          take: 1,
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!user) {
      return jsonError(404, "USER_NOT_FOUND", "Owner account was not found.");
    }

    const household = user.ownedFamilies[0] ?? null;

    if (!household) {
      return jsonError(404, "HOUSEHOLD_NOT_FOUND", "No household exists for this owner.");
    }

    if (household.name !== householdName) {
      return jsonError(400, "HOUSEHOLD_NAME_MISMATCH", "Household name confirmation did not match.");
    }

    if (!isCognitoAdminDeletionConfigured()) {
      return jsonError(
        500,
        "COGNITO_DELETION_NOT_CONFIGURED",
        "Cognito admin deletion is not configured on the server.",
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.family.delete({
        where: { id: household.id },
      });

      await tx.user.delete({
        where: { id: user.id },
      });
    });

    await deleteCognitoUser(cognitoSub);

    return NextResponse.json({
      data: {
        deleted: true,
      },
    });
  } catch (error) {
    console.error("Delete household error", error);
    return jsonError(
      500,
      "INTERNAL_SERVER_ERROR",
      "Unable to delete household right now.",
    );
  }
}
