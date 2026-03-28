export type TelegramChatType = "private" | "group" | "supergroup" | "channel" | string;

export type TelegramEventScope = "private" | "group" | "other";

export interface TelegramUserRef {
  id: string;
  username: string | null;
  firstName: string | null;
  isBot: boolean | null;
}

export interface TelegramChatRef {
  id: string;
  type: TelegramChatType;
  title: string | null;
}

export interface TelegramMessageEntityRef {
  type: string;
  offset: number;
  length: number;
  value: string | null;
}

export interface TelegramMessageEvent {
  kind: "message";
  updateId: string | null;
  scope: TelegramEventScope;
  chat: TelegramChatRef;
  from: TelegramUserRef | null;
  text: string | null;
  messageId: string | null;
  command: string | null;
  entities: TelegramMessageEntityRef[];
  raw: unknown;
}

export interface TelegramMyChatMemberEvent {
  kind: "my_chat_member";
  updateId: string | null;
  scope: TelegramEventScope;
  chat: TelegramChatRef;
  from: TelegramUserRef | null;
  oldStatus: string | null;
  newStatus: string | null;
  raw: unknown;
}

export interface TelegramUnsupportedEvent {
  kind: "unsupported";
  updateId: string | null;
  raw: unknown;
}

export type NormalizedTelegramEvent =
  | TelegramMessageEvent
  | TelegramMyChatMemberEvent
  | TelegramUnsupportedEvent;

export type TelegramRouteDecision =
  | "ignore"
  | "ingest_only"
  | "handoff_fast"
  | "handoff_background"
  | "onboarding_event";

export type TelegramClassifierReason =
  | "unsupported_update"
  | "empty_message"
  | "private_start_command"
  | "group_start_command"
  | "group_membership_activation"
  | "private_message_intent"
  | "explicit_mention_intent"
  | "explicit_mention_context"
  | "assistant_name_intent"
  | "assistant_name_context"
  | "assistant_intent_without_mention"
  | "relevant_context"
  | "pure_chatter"
  | "default_ignore";

export interface TelegramClassifierSignals {
  hasText: boolean;
  isPrivateChat: boolean;
  isGroupChat: boolean;
  isStartCommand: boolean;
  isExplicitMention: boolean;
  usesAssistantName: boolean;
  hasAssistantIntent: boolean;
  looksLikePureChatter: boolean;
  looksRelevantButNotActionable: boolean;
  isOnboardingMembershipEvent: boolean;
}

export interface TelegramClassification {
  decision: TelegramRouteDecision;
  reason: TelegramClassifierReason;
  signals: TelegramClassifierSignals;
}

export interface TelegramClassifierOptions {
  botUsername?: string | null;
  assistantNames?: string[];
}
