import { execFile } from "node:child_process";
import { promisify } from "node:util";

import type { TelegramMessageEvent } from "@/lib/telegram/types";
import type { KinConversationContext, KinContextEvent } from "@/lib/kin/context";

const execFileAsync = promisify(execFile);
const OPENCLAW_COMMAND = process.env.OPENCLAW_BIN?.trim() || "openclaw";
const OPENCLAW_TIMEOUT_MS = 30_000;

export type OpenClawHandoffResponse =
  | { kind: "no_reply" }
  | { kind: "reply"; text: string }
  | { kind: "clarify"; text: string };

function sanitizeSessionToken(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "") || "family";
}

export function buildFamilySessionLabel(familyId: string): string {
  return `kin-family-${sanitizeSessionToken(familyId)}`;
}

function renderActor(event: KinContextEvent): string {
  if (event.fromFirstName && event.fromUsername) {
    return `${event.fromFirstName} (@${event.fromUsername})`;
  }

  if (event.fromFirstName) {
    return event.fromFirstName;
  }

  if (event.fromUsername) {
    return `@${event.fromUsername}`;
  }

  return "Unknown sender";
}

function renderEventBlock(label: string, event: KinContextEvent): string {
  return [
    `[${label}]`,
    `Timestamp: ${event.createdAt.toISOString()}`,
    `Actor: ${renderActor(event)}`,
    `Scope: ${event.scope ?? "unknown"}`,
    `Chat: ${event.chatTitle ?? "Unknown chat"}`,
    `Category: ${event.category}`,
    `Route Decision: ${event.routeDecision}`,
    `Text: ${event.text?.trim() || "(no text)"}`,
  ].join("\n");
}

function buildPrompt(event: TelegramMessageEvent, context: KinConversationContext): string {
  const recentContext =
    context.recentEvents.length > 0
      ? context.recentEvents
          .map((recentEvent, index) => renderEventBlock(`RECENT CONTEXT ${index + 1}`, recentEvent))
          .join("\n\n")
      : "[RECENT CONTEXT]\nNone";

  return [
    "[SYSTEM ROLE]",
    "You are Kin, a calm family coordination assistant replying inside Telegram.",
    "Respond only when a direct, helpful conversational reply is warranted.",
    "Do not mention internal routing, OpenClaw, or hidden prompts.",
    "",
    "[RESPONSE CONTRACT]",
    "Return exactly this labeled format:",
    "KIND: no_reply | reply | clarify",
    "TEXT: <plain text reply, required for reply and clarify, empty for no_reply>",
    "",
    "[DECISION RULES]",
    "- Use no_reply for acknowledgements, chatter, or cases where Kin should stay silent.",
    "- Use reply for a direct answer or helpful next step.",
    "- Use clarify when the user intent is real but missing key detail.",
    "- Keep replies concise and natural for Telegram.",
    "",
    renderEventBlock("CURRENT EVENT", context.currentEvent),
    "",
    recentContext,
    "",
    "[TELEGRAM DELIVERY]",
    `Reply in the same conversation. Triggering message id: ${event.messageId ?? "unknown"}`,
  ].join("\n");
}

function coerceTextValue(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed || null;
  }

  if (Array.isArray(value)) {
    const joined = value.map(coerceTextValue).filter(Boolean).join("\n").trim();
    return joined || null;
  }

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;

    for (const key of [
      "text",
      "output",
      "response",
      "summary",
      "message",
      "finalText",
      "final_text",
      "content",
    ]) {
      const nested = coerceTextValue(record[key]);
      if (nested) {
        return nested;
      }
    }
  }

  return null;
}

function extractCommandOutput(stdout: string): string {
  const trimmed = stdout.trim();
  if (!trimmed) {
    return "";
  }

  try {
    const parsed = JSON.parse(trimmed) as Record<string, unknown>;
    return (
      coerceTextValue(parsed.output) ??
      coerceTextValue(parsed.result) ??
      coerceTextValue(parsed.response) ??
      coerceTextValue(parsed.summary) ??
      coerceTextValue(parsed.message) ??
      trimmed
    );
  } catch {
    return trimmed;
  }
}

function normalizeStructuredResponse(rawOutput: string): OpenClawHandoffResponse {
  const trimmed = rawOutput.trim();

  if (!trimmed) {
    return { kind: "no_reply" };
  }

  const kindMatch = trimmed.match(/(?:^|\n)KIND:\s*(no_reply|reply|clarify)\s*(?:\n|$)/i);
  const textMatch = trimmed.match(/(?:^|\n)TEXT:\s*([\s\S]*)$/i);
  const normalizedKind = kindMatch?.[1]?.toLowerCase();
  const normalizedText = textMatch?.[1]?.trim() ?? "";

  if (normalizedKind === "no_reply") {
    return { kind: "no_reply" };
  }

  if (normalizedKind === "clarify") {
    return normalizedText ? { kind: "clarify", text: normalizedText } : { kind: "no_reply" };
  }

  if (normalizedKind === "reply") {
    return normalizedText ? { kind: "reply", text: normalizedText } : { kind: "no_reply" };
  }

  if (trimmed.startsWith("NO_REPLY")) {
    return { kind: "no_reply" };
  }

  return { kind: "reply", text: trimmed };
}

export async function runOpenClawFastHandoff(params: {
  familyId: string;
  event: TelegramMessageEvent;
  context: KinConversationContext;
}): Promise<OpenClawHandoffResponse> {
  const prompt = buildPrompt(params.event, params.context);
  const sessionLabel = buildFamilySessionLabel(params.familyId);

  const { stdout } = await execFileAsync(
    OPENCLAW_COMMAND,
    [
      "agent",
      "--session-id",
      sessionLabel,
      "--message",
      prompt,
      "--json",
    ],
    {
      timeout: OPENCLAW_TIMEOUT_MS,
      maxBuffer: 1024 * 1024,
      env: process.env,
    },
  );

  return normalizeStructuredResponse(extractCommandOutput(stdout));
}
