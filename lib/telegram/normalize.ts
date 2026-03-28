import {
  TELEGRAM_GROUP_CHAT_TYPES,
  TELEGRAM_PRIVATE_CHAT_TYPES,
} from "@/lib/telegram/constants";
import type {
  NormalizedTelegramEvent,
  TelegramChatRef,
  TelegramEventScope,
  TelegramMessageEntityRef,
  TelegramUserRef,
} from "@/lib/telegram/types";

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function asString(value: unknown): string | null {
  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  return null;
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function normalizeScope(chatType: string | null): TelegramEventScope {
  if (chatType && TELEGRAM_PRIVATE_CHAT_TYPES.has(chatType)) {
    return "private";
  }

  if (chatType && TELEGRAM_GROUP_CHAT_TYPES.has(chatType)) {
    return "group";
  }

  return "other";
}

function normalizeUser(value: unknown): TelegramUserRef | null {
  const user = asRecord(value);

  if (!user) {
    return null;
  }

  const id = asString(user.id);

  if (!id) {
    return null;
  }

  return {
    id,
    username: asString(user.username),
    firstName: asString(user.first_name),
    isBot: typeof user.is_bot === "boolean" ? user.is_bot : null,
  };
}

function normalizeChat(value: unknown): TelegramChatRef | null {
  const chat = asRecord(value);

  if (!chat) {
    return null;
  }

  const id = asString(chat.id);
  const type = asString(chat.type);

  if (!id || !type) {
    return null;
  }

  return {
    id,
    type,
    title: asString(chat.title),
  };
}

function normalizeEntities(value: unknown, text: string | null): TelegramMessageEntityRef[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((entry) => {
    const entity = asRecord(entry);

    if (!entity) {
      return [];
    }

    const type = asString(entity.type);
    const offset = asNumber(entity.offset);
    const length = asNumber(entity.length);

    if (!type || offset === null || length === null) {
      return [];
    }

    return [
      {
        type,
        offset,
        length,
        value:
          text && offset >= 0 && length >= 0 && offset + length <= text.length
            ? text.slice(offset, offset + length)
            : null,
      },
    ];
  });
}

function extractCommand(text: string | null): string | null {
  if (!text) {
    return null;
  }

  const match = text.trim().match(/^\/([a-z0-9_]+)(?:@[a-z0-9_]+)?\b/i);
  return match ? match[1].toLowerCase() : null;
}

export function normalizeTelegramUpdate(raw: unknown): NormalizedTelegramEvent {
  const update = asRecord(raw);
  const updateId = update ? asString(update.update_id) : null;

  if (!update) {
    return {
      kind: "unsupported",
      updateId,
      raw,
    };
  }

  const message = asRecord(update.message);

  if (message) {
    const chat = normalizeChat(message.chat);

    if (!chat) {
      return {
        kind: "unsupported",
        updateId,
        raw,
      };
    }

    const text = asString(message.text);

    return {
      kind: "message",
      updateId,
      scope: normalizeScope(chat.type),
      chat,
      from: normalizeUser(message.from),
      text,
      messageId: asString(message.message_id),
      command: extractCommand(text),
      entities: normalizeEntities(message.entities, text),
      raw,
    };
  }

  const myChatMember = asRecord(update.my_chat_member);

  if (myChatMember) {
    const chat = normalizeChat(myChatMember.chat);

    if (!chat) {
      return {
        kind: "unsupported",
        updateId,
        raw,
      };
    }

    const oldChatMember = asRecord(myChatMember.old_chat_member);
    const newChatMember = asRecord(myChatMember.new_chat_member);

    return {
      kind: "my_chat_member",
      updateId,
      scope: normalizeScope(chat.type),
      chat,
      from: normalizeUser(myChatMember.from),
      oldStatus: asString(oldChatMember?.status),
      newStatus: asString(newChatMember?.status),
      raw,
    };
  }

  return {
    kind: "unsupported",
    updateId,
    raw,
  };
}
