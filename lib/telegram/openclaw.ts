import { execFile } from "node:child_process";
import { promisify } from "node:util";

import type { TelegramMessageEvent } from "@/lib/telegram/types";
import type { KinConversationContext, KinContextEvent } from "@/lib/kin/context";

const execFileAsync = promisify(execFile);
const OPENCLAW_TIMEOUT_MS = 30_000;

export type OpenClawTransportMode = "local-cli" | "disabled" | "remote-gateway";

export type OpenClawHandoffResponse =
  | { kind: "no_reply" }
  | { kind: "reply"; text: string }
  | { kind: "clarify"; text: string };

interface OpenClawTransportRequest {
  sessionLabel: string;
  prompt: string;
}

type OpenClawTransportResult =
  | { status: "ok"; output: string }
  | { status: "unavailable"; reason: string };

interface OpenClawTransport {
  mode: OpenClawTransportMode;
  invoke(request: OpenClawTransportRequest): Promise<OpenClawTransportResult>;
}

interface GatewayCliEnvelope {
  ok?: boolean;
  payload?: Record<string, unknown>;
  error?: unknown;
}

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

    if (record.type === "text") {
      const textContent = coerceTextValue(record.text);
      if (textContent) {
        return textContent;
      }
    }

    for (const key of [
      "payload",
      "data",
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

function parseGatewayEnvelope(stdout: string): GatewayCliEnvelope {
  const trimmed = stdout.trim();
  if (!trimmed) {
    return {};
  }

  try {
    return JSON.parse(trimmed) as GatewayCliEnvelope;
  } catch {
    return {};
  }
}

function extractGatewayError(stdout: string): string | null {
  const envelope = parseGatewayEnvelope(stdout);

  if (envelope.ok === false) {
    return (
      coerceTextValue(envelope.error) ??
      coerceTextValue(envelope.payload) ??
      "Gateway call reported an error."
    );
  }

  return null;
}

function extractGatewaySessionKey(stdout: string): string | null {
  const envelope = parseGatewayEnvelope(stdout);
  const payload = envelope.payload;

  if (!payload || typeof payload !== "object") {
    return null;
  }

  const key = payload.key;
  return typeof key === "string" && key.trim() ? key.trim() : null;
}

function isMissingSessionLookupError(message: string | null): boolean {
  if (!message) {
    return false;
  }

  const normalized = message.toLowerCase();
  return normalized.includes("no session found with label");
}

async function executeOpenClawCommand(args: string[]): Promise<string> {
  const command = process.env.OPENCLAW_BIN?.trim() || "openclaw";
  const { stdout } = await execFileAsync(command, args, {
    timeout: OPENCLAW_TIMEOUT_MS,
    maxBuffer: 1024 * 1024,
    env: process.env,
  });

  return stdout;
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

function resolveOpenClawTransportMode(): OpenClawTransportMode {
  const rawMode = process.env.OPENCLAW_TRANSPORT_MODE?.trim().toLowerCase();

  if (!rawMode || rawMode === "local-cli") {
    return "local-cli";
  }

  if (rawMode === "disabled") {
    return "disabled";
  }

  if (rawMode === "remote-gateway" || rawMode === "remote-http") {
    return "remote-gateway";
  }

  console.warn("Unknown OpenClaw transport mode; treating transport as disabled", {
    configuredMode: rawMode,
  });
  return "disabled";
}

function buildOpenClawTransport(): OpenClawTransport {
  const mode = resolveOpenClawTransportMode();

  if (mode === "disabled") {
    return {
      mode,
      async invoke() {
        return {
          status: "unavailable",
          reason: "OpenClaw transport is disabled by configuration.",
        };
      },
    };
  }

  if (mode === "remote-gateway") {
    return {
      mode,
      async invoke(request) {
        const gatewayUrl = process.env.OPENCLAW_GATEWAY_URL?.trim();
        const gatewayToken = process.env.OPENCLAW_GATEWAY_TOKEN?.trim();

        if (!gatewayUrl) {
          return {
            status: "unavailable",
            reason: "OpenClaw remote gateway transport requires OPENCLAW_GATEWAY_URL.",
          };
        }

        if (!gatewayToken) {
          return {
            status: "unavailable",
            reason: "OpenClaw remote gateway transport requires OPENCLAW_GATEWAY_TOKEN.",
          };
        }

        const baseArgs = [
          "gateway",
          "call",
          "--url",
          gatewayUrl,
          "--token",
          gatewayToken,
          "--timeout",
          String(OPENCLAW_TIMEOUT_MS),
          "--json",
        ];

        try {
          const resolveStdout = await executeOpenClawCommand([
            ...baseArgs,
            "sessions.resolve",
            "--params",
            JSON.stringify({
              label: request.sessionLabel,
              includeUnknown: true,
            }),
          ]);
          const resolveError = extractGatewayError(resolveStdout);
          const isMissingSession = isMissingSessionLookupError(resolveError);

          if (resolveError && !isMissingSession) {
            return {
              status: "unavailable",
              reason: `OpenClaw remote gateway session lookup failed: ${resolveError}`,
            };
          }

          let sessionKey = isMissingSession ? null : extractGatewaySessionKey(resolveStdout);

          if (!sessionKey) {
            const createStdout = await executeOpenClawCommand([
              ...baseArgs,
              "sessions.create",
              "--params",
              JSON.stringify({
                label: request.sessionLabel,
              }),
            ]);
            const createError = extractGatewayError(createStdout);

            if (createError) {
              return {
                status: "unavailable",
                reason: `OpenClaw remote gateway session creation failed: ${createError}`,
              };
            }

            sessionKey = extractGatewaySessionKey(createStdout);
          }

          if (!sessionKey) {
            return {
              status: "unavailable",
              reason: "OpenClaw remote gateway did not return a session key.",
            };
          }

          const sendStdout = await executeOpenClawCommand([
            ...baseArgs,
            "--expect-final",
            "sessions.send",
            "--params",
            JSON.stringify({
              key: sessionKey,
              message: request.prompt,
            }),
          ]);
          const sendError = extractGatewayError(sendStdout);

          if (sendError) {
            return {
              status: "unavailable",
              reason: `OpenClaw remote gateway send failed: ${sendError}`,
            };
          }

          return {
            status: "ok",
            output: extractCommandOutput(sendStdout),
          };
        } catch (error) {
          const details =
            error instanceof Error
              ? error.message
              : typeof error === "string"
                ? error
                : "Unknown remote gateway transport error";

          return {
            status: "unavailable",
            reason: `OpenClaw remote gateway transport failed: ${details}`,
          };
        }
      },
    };
  }

  return {
    mode,
    async invoke(request) {
      try {
        const stdout = await executeOpenClawCommand([
          "agent",
          "--session-id",
          request.sessionLabel,
          "--message",
          request.prompt,
          "--json",
        ]);

        return {
          status: "ok",
          output: extractCommandOutput(stdout),
        };
      } catch (error) {
        const details =
          error instanceof Error
            ? error.message
            : typeof error === "string"
              ? error
              : "Unknown local CLI transport error";

        return {
          status: "unavailable",
          reason: `OpenClaw local CLI transport failed: ${details}`,
        };
      }
    },
  };
}

export async function runOpenClawFastHandoff(params: {
  familyId: string;
  event: TelegramMessageEvent;
  context: KinConversationContext;
}): Promise<OpenClawHandoffResponse> {
  const prompt = buildPrompt(params.event, params.context);
  const sessionLabel = buildFamilySessionLabel(params.familyId);
  const transport = buildOpenClawTransport();
  const result = await transport.invoke({
    sessionLabel,
    prompt,
  });

  if (result.status === "unavailable") {
    console.warn("OpenClaw fast handoff transport unavailable", {
      familyId: params.familyId,
      transportMode: transport.mode,
      reason: result.reason,
    });
    return { kind: "no_reply" };
  }

  return normalizeStructuredResponse(result.output);
}
