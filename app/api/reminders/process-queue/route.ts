import { NextRequest, NextResponse } from "next/server";

import { consumeReminderQueue } from "@/lib/aws/reminder-queue";
import {
  getReminderAdminSecret,
  isAuthorizedReminderAdminRequest,
} from "@/lib/tasks/reminder-admin-auth";

export const runtime = "nodejs";

function parsePositiveInt(value: string | null): number | undefined {
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return undefined;
  }

  return Math.floor(parsed);
}

export async function POST(req: NextRequest) {
  const configuredSecret = getReminderAdminSecret();

  if (!configuredSecret) {
    return NextResponse.json(
      { ok: false, error: "reminder_fire_secret_not_configured" },
      { status: 503 },
    );
  }

  if (!isAuthorizedReminderAdminRequest(req)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  try {
    const url = new URL(req.url);
    const rawMaxMessages = parsePositiveInt(url.searchParams.get("maxMessages"));
    const rawWaitSeconds = parsePositiveInt(url.searchParams.get("waitSeconds"));
    const maxMessages = rawMaxMessages ? Math.min(10, rawMaxMessages) : undefined;
    const waitSeconds = rawWaitSeconds ? Math.min(20, rawWaitSeconds) : undefined;
    const result = await consumeReminderQueue({
      maxMessages,
      waitSeconds,
    });

    if ("kind" in result && result.kind === "disabled") {
      return NextResponse.json({ ok: false, error: "reminder_queue_not_configured" }, { status: 503 });
    }

    return NextResponse.json({ ok: true, result });
  } catch (error) {
    console.error("Reminder queue processing failed", { error });

    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "failed_to_process_reminder_queue",
      },
      { status: 500 },
    );
  }
}
