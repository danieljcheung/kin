export const TELEGRAM_PRIVATE_CHAT_TYPES = new Set(["private"]);

export const TELEGRAM_GROUP_CHAT_TYPES = new Set(["group", "supergroup"]);

export const TELEGRAM_ACTIVE_BOT_STATUSES = new Set(["member", "administrator"]);

export const DEFAULT_TELEGRAM_ASSISTANT_NAMES = ["kin"];

export const TELEGRAM_PURE_CHATTER_PATTERNS = [
  /^(?:ok|okay|kk|k|yes|yep|yeah|no|nope|sure|cool|nice|great|done|thx|thanks|thank you)[!.?]*$/i,
  /^(?:lol|lmao|haha|hah|omg|wow|yikes|oops)[!.?]*$/i,
  /^(?:gm|gn|morning|night|good morning|good night)[!.?]*$/i,
];

export const TELEGRAM_ASSISTANT_INTENT_PATTERNS = [
  /\?$/,
  /^(?:help|summarize|recap|remind|remember|track|plan|find|tell|draft|write|make|create|organize)\b/i,
  /^(?:can|could|would|will|should)\s+you\b/i,
  /^(?:what|when|where|which|who|why|how)\b/i,
  /\b(?:please|need|want)\b/i,
];

export const TELEGRAM_RELEVANT_CONTEXT_KEYWORDS = [
  "dinner",
  "lunch",
  "breakfast",
  "pickup",
  "dropoff",
  "school",
  "practice",
  "soccer",
  "doctor",
  "appointment",
  "calendar",
  "schedule",
  "groceries",
  "grocery",
  "shopping",
  "errand",
  "chores",
  "trip",
  "vacation",
  "weekend",
  "tonight",
  "tomorrow",
  "budget",
  "bill",
  "rent",
];
