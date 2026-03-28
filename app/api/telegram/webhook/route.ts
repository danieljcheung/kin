import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { classifyTelegramEvent } from "@/lib/telegram/classify";
import { ingestTelegramEvent } from "@/lib/telegram/ingest";
import { normalizeTelegramUpdate } from "@/lib/telegram/normalize";

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const KIN_TELEGRAM_BOT_USERNAME = process.env.KIN_TELEGRAM_BOT_USERNAME;
const PENDING_BINDING_STATUSES = ["DM_STARTED", "BOT_ADDED"] as const;

export const runtime = "nodejs";

async function sendTelegramMessage(chatId: number | string, text: string) {
  if (!TELEGRAM_BOT_TOKEN) {
    throw new Error("Missing TELEGRAM_BOT_TOKEN");
  }

  const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      chat_id: chatId,
      text,
    }),
  });

  const data = await res.json();

  if (!res.ok || !data.ok) {
    throw new Error(`Telegram sendMessage failed: ${JSON.stringify(data)}`);
  }

  return data;
}

function extractStartToken(text: string): string | null {
  const trimmed = text.trim();

  if (!trimmed.startsWith("/start")) {
    return null;
  }

  const parts = trimmed.split(/\s+/);

  if (parts.length < 2) {
    return null;
  }

  return parts.slice(1).join(" ");
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const event = normalizeTelegramUpdate(body);
    const classification = classifyTelegramEvent(event, {
      botUsername: KIN_TELEGRAM_BOT_USERNAME,
    });

    console.log("Telegram webhook update:", JSON.stringify(body, null, 2));
    console.log("telegram normalized event", {
      updateId: event.updateId,
      kind: event.kind,
      scope: event.kind === "unsupported" ? null : event.scope,
      decision: classification.decision,
      reason: classification.reason,
      signals: classification.signals,
    });

    const ingestionResult = await ingestTelegramEvent(event, classification);

    if (ingestionResult.status === "duplicate") {
      console.log("Ignoring duplicate telegram event", {
        updateId: event.updateId,
        dedupeKey: ingestionResult.dedupeKey,
        eventId: ingestionResult.eventId,
      });
    }

    if (ingestionResult.status === "ingested") {
      console.log("Persisted telegram event", {
        updateId: event.updateId,
        dedupeKey: ingestionResult.dedupeKey,
        eventId: ingestionResult.eventId,
        category: ingestionResult.category,
      });
    }

    if (
      event.kind === "message" &&
      classification.decision === "onboarding_event" &&
      event.text?.startsWith("/start")
    ) {
      if (event.scope !== "private") {
        await sendTelegramMessage(
          event.chat.id,
          "Open a direct message with this bot and send the setup link there.",
        );
        return NextResponse.json({ ok: true });
      }

      const token = extractStartToken(event.text);

      if (!token) {
        await sendTelegramMessage(
          event.chat.id,
          "Kin is connected. Use the setup link from Kin to continue.",
        );
        return NextResponse.json({ ok: true });
      }

      if (!event.from?.id) {
        await sendTelegramMessage(
          event.chat.id,
          "Could not identify your Telegram account. Try again from your own Telegram user.",
        );
        return NextResponse.json({ ok: true });
      }

      const telegramDmUserId = event.from.id;
      const telegramDmChatId = event.chat.id;

      const bindingResult = await prisma.$transaction(async (tx) => {
        const binding = await tx.groupBinding.findFirst({
          where: {
            onboardingToken: token,
            platform: "TELEGRAM",
          },
          include: {
            family: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        });

        if (!binding) {
          return { kind: "binding_not_found" as const };
        }

        if (binding.status === "ACTIVE") {
          return { kind: "already_active" as const, familyName: binding.family.name };
        }

        const conflictingBinding = await tx.groupBinding.findFirst({
          where: {
            platform: "TELEGRAM",
            telegramDmUserId,
            status: {
              in: [...PENDING_BINDING_STATUSES],
            },
            NOT: {
              id: binding.id,
            },
          },
          select: {
            id: true,
            family: {
              select: {
                name: true,
              },
            },
          },
        });

        if (conflictingBinding) {
          return {
            kind: "user_conflict" as const,
            familyName: conflictingBinding.family.name,
          };
        }

        const updatedBinding = await tx.groupBinding.update({
          where: {
            id: binding.id,
          },
          data: {
            status: "DM_STARTED",
            telegramDmUserId,
            telegramDmChatId,
            telegramDmUsername: event.from?.username ?? null,
            telegramDmFirstName: event.from?.firstName ?? null,
          },
        });

        return {
          kind: "linked" as const,
          bindingId: updatedBinding.id,
          familyName: binding.family.name,
        };
      });

      if (bindingResult.kind === "binding_not_found") {
        await sendTelegramMessage(
          event.chat.id,
          "That setup link is invalid or expired. Go back to Kin and generate a new one.",
        );
        return NextResponse.json({ ok: true });
      }

      if (bindingResult.kind === "already_active") {
        await sendTelegramMessage(
          event.chat.id,
          `Telegram is already connected for ${bindingResult.familyName}.`,
        );
        return NextResponse.json({ ok: true });
      }

      if (bindingResult.kind === "user_conflict") {
        await sendTelegramMessage(
          event.chat.id,
          `This Telegram account is already in the middle of setup for ${bindingResult.familyName}. Finish that setup first or restart from Kin.`,
        );
        return NextResponse.json({ ok: true });
      }

      await sendTelegramMessage(
        event.chat.id,
        `Got it. This setup link is for ${bindingResult.familyName}. Next, add this bot to your family Telegram group. I will finish setup when your Telegram account adds or approves the bot there.`,
      );

      return NextResponse.json({ ok: true });
    }

    if (
      event.kind === "my_chat_member" &&
      classification.decision === "onboarding_event"
    ) {
      const memberChatId = event.chat.id;
      const memberChatTitle = event.chat.title;
      const activatingTelegramUserId = event.from?.id ?? null;

      if (!activatingTelegramUserId) {
        console.log("Ignoring group activation event without actor user id", {
          memberChatId,
          memberChatTitle,
        });
        return NextResponse.json({ ok: true });
      }

      const activationResult = await prisma.$transaction(async (tx) => {
        const binding = await tx.groupBinding.findFirst({
          where: {
            platform: "TELEGRAM",
            telegramDmUserId: activatingTelegramUserId,
            status: {
              in: [...PENDING_BINDING_STATUSES],
            },
          },
          orderBy: {
            updatedAt: "desc",
          },
          include: {
            family: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        });

        if (!binding) {
          return { kind: "binding_not_found" as const };
        }

        const existingBindingForGroup = await tx.groupBinding.findFirst({
          where: {
            platform: "TELEGRAM",
            externalGroupId: String(memberChatId),
            NOT: {
              id: binding.id,
            },
          },
          select: {
            id: true,
            familyId: true,
          },
        });

        if (existingBindingForGroup) {
          return { kind: "group_already_bound" as const, bindingId: existingBindingForGroup.id };
        }

        const verifiedAt = new Date();

        const updatedBinding = await tx.groupBinding.update({
          where: {
            id: binding.id,
          },
          data: {
            status: "ACTIVE",
            externalGroupId: String(memberChatId),
            groupName: memberChatTitle ?? null,
            verifiedAt,
          },
        });

        await tx.onboardingState.update({
          where: {
            familyId: binding.familyId,
          },
          data: {
            status: "COMPLETE",
            currentStep: "COMPLETE",
          },
        });

        return {
          kind: "activated" as const,
          bindingId: updatedBinding.id,
          familyId: binding.familyId,
          familyName: binding.family.name,
        };
      });

      if (activationResult.kind === "binding_not_found") {
        console.log("No DM-linked pending binding found for group activation", {
          memberChatId,
          memberChatTitle,
          activatingTelegramUserId,
        });
        return NextResponse.json({ ok: true });
      }

      if (activationResult.kind === "group_already_bound") {
        console.warn("Telegram group already bound to another family", {
          memberChatId,
          existingBindingId: activationResult.bindingId,
        });
        return NextResponse.json({ ok: true });
      }

      console.log("Activated Telegram group binding", {
        bindingId: activationResult.bindingId,
        familyId: activationResult.familyId,
        familyName: activationResult.familyName,
        memberChatId,
        memberChatTitle,
        activatingTelegramUserId,
      });

      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Telegram webhook error:", error);
    return NextResponse.json({ ok: false, error: "invalid request" }, { status: 400 });
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    message: "Telegram webhook endpoint is up. Use POST.",
  });
}
