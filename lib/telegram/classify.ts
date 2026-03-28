import {
  DEFAULT_TELEGRAM_ASSISTANT_NAMES,
  TELEGRAM_ACTIVE_BOT_STATUSES,
  TELEGRAM_ASSISTANT_INTENT_PATTERNS,
  TELEGRAM_PURE_CHATTER_PATTERNS,
  TELEGRAM_RELEVANT_CONTEXT_KEYWORDS,
} from "@/lib/telegram/constants";
import type {
  NormalizedTelegramEvent,
  TelegramClassification,
  TelegramClassifierOptions,
} from "@/lib/telegram/types";

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeLookupValue(value: string): string {
  return value.trim().replace(/^@/, "").toLowerCase();
}

function hasExplicitMention(text: string, botUsername?: string | null): boolean {
  const normalizedUsername = botUsername ? normalizeLookupValue(botUsername) : null;

  if (!normalizedUsername) {
    return false;
  }

  return new RegExp(`(^|\\s)@${escapeRegex(normalizedUsername)}\\b`, "i").test(text);
}

function usesAssistantName(text: string, assistantNames: string[]): boolean {
  return assistantNames.some((name) => {
    const normalizedName = normalizeLookupValue(name);

    if (!normalizedName) {
      return false;
    }

    return new RegExp(`(^|\\s)${escapeRegex(normalizedName)}([,.!?]|\\s|$)`, "i").test(text);
  });
}

function hasAssistantIntent(text: string): boolean {
  return TELEGRAM_ASSISTANT_INTENT_PATTERNS.some((pattern) => pattern.test(text));
}

function looksLikePureChatter(text: string): boolean {
  return TELEGRAM_PURE_CHATTER_PATTERNS.some((pattern) => pattern.test(text.trim()));
}

function looksRelevantButNotActionable(text: string): boolean {
  const lowered = text.toLowerCase();

  return (
    TELEGRAM_RELEVANT_CONTEXT_KEYWORDS.some((keyword) => lowered.includes(keyword)) &&
    !hasAssistantIntent(text)
  );
}

export function classifyTelegramEvent(
  event: NormalizedTelegramEvent,
  options: TelegramClassifierOptions = {},
): TelegramClassification {
  const assistantNames = options.assistantNames?.length
    ? options.assistantNames
    : DEFAULT_TELEGRAM_ASSISTANT_NAMES;

  if (event.kind === "unsupported") {
    return {
      decision: "ignore",
      reason: "unsupported_update",
      signals: {
        hasText: false,
        isPrivateChat: false,
        isGroupChat: false,
        isStartCommand: false,
        isExplicitMention: false,
        usesAssistantName: false,
        hasAssistantIntent: false,
        looksLikePureChatter: false,
        looksRelevantButNotActionable: false,
        isOnboardingMembershipEvent: false,
      },
    };
  }

  if (event.kind === "my_chat_member") {
    const isOnboardingMembershipEvent =
      event.scope === "group" &&
      !!event.newStatus &&
      TELEGRAM_ACTIVE_BOT_STATUSES.has(event.newStatus);

    return {
      decision: isOnboardingMembershipEvent ? "onboarding_event" : "ignore",
      reason: isOnboardingMembershipEvent
        ? "group_membership_activation"
        : "default_ignore",
      signals: {
        hasText: false,
        isPrivateChat: event.scope === "private",
        isGroupChat: event.scope === "group",
        isStartCommand: false,
        isExplicitMention: false,
        usesAssistantName: false,
        hasAssistantIntent: false,
        looksLikePureChatter: false,
        looksRelevantButNotActionable: false,
        isOnboardingMembershipEvent,
      },
    };
  }

  const text = event.text?.trim() ?? "";
  const isStartCommand = event.command === "start";
  const isExplicitMention = text.length > 0 && hasExplicitMention(text, options.botUsername);
  const hasNameReference = text.length > 0 && usesAssistantName(text, assistantNames);
  const hasIntent = text.length > 0 && hasAssistantIntent(text);
  const isPureChatter = text.length > 0 && looksLikePureChatter(text);
  const isRelevantContext = text.length > 0 && looksRelevantButNotActionable(text);

  const signals = {
    hasText: text.length > 0,
    isPrivateChat: event.scope === "private",
    isGroupChat: event.scope === "group",
    isStartCommand,
    isExplicitMention,
    usesAssistantName: hasNameReference,
    hasAssistantIntent: hasIntent,
    looksLikePureChatter: isPureChatter,
    looksRelevantButNotActionable: isRelevantContext,
    isOnboardingMembershipEvent: false,
  };

  if (!signals.hasText) {
    return {
      decision: "ignore",
      reason: "empty_message",
      signals,
    };
  }

  if (isStartCommand) {
    return {
      decision: "onboarding_event",
      reason: signals.isPrivateChat ? "private_start_command" : "group_start_command",
      signals,
    };
  }

  if (signals.isPrivateChat) {
    if (isPureChatter && !hasIntent && !isRelevantContext) {
      return {
        decision: "ignore",
        reason: "pure_chatter",
        signals,
      };
    }

    if (isRelevantContext && !hasIntent) {
      return {
        decision: "ingest_only",
        reason: "relevant_context",
        signals,
      };
    }

    return {
      decision: "handoff_fast",
      reason: "private_message_intent",
      signals,
    };
  }

  if (isPureChatter && !hasIntent && !isRelevantContext) {
    return {
      decision: "ignore",
      reason: "pure_chatter",
      signals,
    };
  }

  if (isExplicitMention) {
    return {
      decision: "handoff_fast",
      reason: hasIntent ? "explicit_mention_intent" : "explicit_mention_context",
      signals,
    };
  }

  if (hasNameReference) {
    return {
      decision: "handoff_fast",
      reason: hasIntent ? "assistant_name_intent" : "assistant_name_context",
      signals,
    };
  }

  if (hasIntent) {
    return {
      decision: "handoff_fast",
      reason: "assistant_intent_without_mention",
      signals,
    };
  }

  if (isRelevantContext) {
    return {
      decision: "ingest_only",
      reason: "relevant_context",
      signals,
    };
  }

  if (isPureChatter) {
    return {
      decision: "ignore",
      reason: "pure_chatter",
      signals,
    };
  }

  return {
    decision: "ignore",
    reason: "default_ignore",
    signals,
  };
}
