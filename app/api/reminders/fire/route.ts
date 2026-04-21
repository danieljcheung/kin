import { NextRequest, NextResponse } from "next/server";

import { deliverReminderById } from "@/lib/tasks/reminder-delivery";
import {
  getReminderAdminSecret,
  isAuthorizedReminderAdminRequest,
} from "@/lib/tasks/reminder-admin-auth";

export const runtime = "nodejs";

function parseReminderId(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const reminderId = value.trim();
  return reminderId.length > 0 ? reminderId : null;
}

export async function POST(req: NextRequest) {
  const configuredSecret = getReminderAdminSecret();

  if (!configuredSecret) {
    return NextResponse.json(
      {
        ok: false,
        error: "reminder_fire_secret_not_configured",
        note: "legacy_fallback_endpoint",
      },
      { status: 503 },
    );
  }

  if (!isAuthorizedReminderAdminRequest(req)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  let body: unknown;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const reminderId = parseReminderId(
    typeof body === "object" && body !== null ? (body as { reminderId?: unknown }).reminderId : null,
  );

  if (!reminderId) {
    return NextResponse.json({ ok: false, error: "missing_reminder_id" }, { status: 400 });
  }

  const result = await deliverReminderById({
    reminderId,
    requireClaimed: false,
    missingDestination: "fail",
  });

  if (result.kind === "not_found") {
    return NextResponse.json(
      { ok: false, error: "reminder_not_found", note: "legacy_fallback_endpoint" },
      { status: 404 },
    );
  }

  if (result.kind === "failed") {
    return NextResponse.json({
      ok: true,
      reminderId,
      status: "FAILED",
      error: result.error,
      note: "legacy_fallback_endpoint",
    });
  }

  if (result.kind === "fired") {
    return NextResponse.json({
      ok: true,
      reminderId,
      status: "FIRED",
      note: "legacy_fallback_endpoint",
    });
  }

  if (result.kind === "already_terminal") {
    return NextResponse.json({ ok: true, reminderId, status: result.status, idempotent: true });
  }

  if (result.kind === "skipped_claimed_elsewhere") {
    return NextResponse.json(
      { ok: true, reminderId, status: "IN_PROGRESS", idempotent: true },
      { status: 202 },
    );
  }

  return NextResponse.json({ ok: true, reminderId, status: "SCHEDULED", idempotent: true });
}
