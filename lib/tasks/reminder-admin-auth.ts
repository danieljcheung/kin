import { NextRequest } from "next/server";

export function getReminderAdminSecret(): string | null {
  const secret =
    process.env.KIN_REMINDER_FIRE_SECRET?.trim() || process.env.KIN_TELEGRAM_WEBHOOK_SECRET?.trim();

  return secret && secret.length > 0 ? secret : null;
}

export function isAuthorizedReminderAdminRequest(req: NextRequest): boolean {
  const configuredSecret = getReminderAdminSecret();

  if (!configuredSecret) {
    return false;
  }

  const providedSecret =
    req.headers.get("x-kin-reminder-fire-secret")?.trim() ||
    req.headers.get("x-kin-reminder-queue-secret")?.trim();

  return providedSecret === configuredSecret;
}
