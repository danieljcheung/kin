import type {
  NormalizedTelegramEvent,
  TelegramClassification,
  TelegramIngestionCategory,
} from "@/lib/telegram/types";

const QUESTION_PATTERNS = [
  /\?\s*$/,
  /^(who|what|when|where|why|how|can|could|would|should|do|does|did|is|are|am)\b/i,
];

const DECISION_PATTERNS = [
  /\b(decided?|decision|settled on|go with|going with|let'?s do|we should|approved|ship it)\b/i,
];

const PREFERENCE_PATTERNS = [
  /\b(prefer|favorite|favourite|rather|instead|like better|don'?t like|do not like)\b/i,
];

const TASK_PATTERNS = [
  /\b(todo|to do|task|remind me|please|can you|could you|need to|needs to|must|should)\b/i,
];

const PLAN_PATTERNS = [
  /\b(plan|schedule|scheduled|tomorrow|tonight|later|next week|next month|this weekend|at \d{1,2}(?::\d{2})?\b)\b/i,
];

const EVENT_PATTERNS = [
  /\b(meeting|appointment|practice|pickup|dropoff|birthday|party|trip|vacation|doctor|dentist|game|recital|dinner|lunch)\b/i,
];

function matchesAny(text: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(text));
}

export function categorizeTelegramEvent(
  event: NormalizedTelegramEvent,
  classification: TelegramClassification,
): TelegramIngestionCategory {
  if (classification.decision === "onboarding_event") {
    return "ONBOARDING";
  }

  if (event.kind !== "message") {
    return "UNKNOWN";
  }

  const text = event.text?.trim();

  if (!text) {
    return "UNKNOWN";
  }

  if (matchesAny(text, DECISION_PATTERNS)) {
    return "DECISION";
  }

  if (matchesAny(text, PREFERENCE_PATTERNS)) {
    return "PREFERENCE";
  }

  if (matchesAny(text, TASK_PATTERNS)) {
    return "TASK";
  }

  if (matchesAny(text, PLAN_PATTERNS)) {
    return "PLAN";
  }

  if (matchesAny(text, EVENT_PATTERNS)) {
    return "EVENT";
  }

  if (matchesAny(text, QUESTION_PATTERNS)) {
    return "QUESTION";
  }

  return "UNKNOWN";
}
