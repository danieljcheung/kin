import { NextRequest, NextResponse } from "next/server";

import { processDueReminders } from "@/lib/tasks/process-due-reminders";

export const runtime = "nodejs";

function parseLimit(value: string | null): number | undefined {
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
  try {
    const url = new URL(req.url);
    const limit = parseLimit(url.searchParams.get("limit"));
    const result = await processDueReminders({ limit });

    return NextResponse.json({ ok: true, result });
  } catch (error) {
    console.error("Manual due-reminder processing failed", { error });

    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "failed_to_process_due_reminders",
      },
      { status: 500 },
    );
  }
}
