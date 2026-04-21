export interface ExplicitReminderIntent {
  taskText: string;
  scheduledFor: Date;
  scheduledForLabel: string;
}

export type ExplicitReminderIntentParseResult =
  | { kind: "none" }
  | { kind: "clarify"; text: string }
  | { kind: "intent"; intent: ExplicitReminderIntent };

const REMINDER_ASK_PATTERN = /\b(remind(?:er)?|set\s+(?:a\s+)?reminder)\b/i;
const AMBIGUOUS_TIME_PATTERN = /\b(later|soon|sometime|whenever|tonight|morning|afternoon|evening)\b/i;

function parseDateToken(text: string, now: Date): { date: Date; label: string } | null {
  const lowered = text.toLowerCase();

  if (lowered.includes("tomorrow")) {
    const date = new Date(now);
    date.setDate(date.getDate() + 1);
    return { date, label: "tomorrow" };
  }

  if (lowered.includes("today")) {
    return { date: new Date(now), label: "today" };
  }

  const isoMatch = text.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  if (isoMatch) {
    const year = Number(isoMatch[1]);
    const month = Number(isoMatch[2]) - 1;
    const day = Number(isoMatch[3]);
    return {
      date: new Date(year, month, day),
      label: `on ${isoMatch[0]}`,
    };
  }

  const slashMatch = text.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/);
  if (slashMatch) {
    const month = Number(slashMatch[1]) - 1;
    const day = Number(slashMatch[2]);
    const currentYear = now.getFullYear();
    const parsedYear = slashMatch[3] ? Number(slashMatch[3]) : currentYear;
    const year = parsedYear < 100 ? 2000 + parsedYear : parsedYear;

    return {
      date: new Date(year, month, day),
      label: `on ${slashMatch[0]}`,
    };
  }

  return null;
}

function parseTimeToken(text: string): { hour: number; minute: number } | null {
  const time12Pattern = /\b(?:at\s+)?(1[0-2]|0?[1-9])(?::([0-5]\d))?\s*(a\.?m\.?|p\.?m\.?)\b/gi;
  const time24Pattern = /\b(?:at\s+)?([01]?\d|2[0-3]):([0-5]\d)\b/g;

  const twelveHourMatches = [...text.matchAll(time12Pattern)];
  const twentyFourHourMatches = [...text.matchAll(time24Pattern)];
  const totalMatches = twelveHourMatches.length + twentyFourHourMatches.length;

  if (totalMatches !== 1) {
    return null;
  }

  if (twelveHourMatches.length === 1) {
    const match = twelveHourMatches[0];
    const hour12 = Number(match[1]);
    const minute = Number(match[2] ?? "0");
    const meridiem = (match[3] ?? "").toLowerCase();
    const isPm = meridiem.startsWith("p");
    const hour = hour12 % 12 + (isPm ? 12 : 0);

    return { hour, minute };
  }

  const match = twentyFourHourMatches[0];
  return {
    hour: Number(match[1]),
    minute: Number(match[2]),
  };
}

function sanitizeTaskText(rawText: string): string {
  return rawText
    .replace(/^\s*(?:hey\s+\w+,?\s*)?/i, "")
    .replace(/^\s*(?:can you|could you|please)\s+/i, "")
    .replace(/\bremind\s+(?:me|us|everyone)\s+to\s+/i, "")
    .replace(/\bremind\s+(?:me|us|everyone)\b/i, "")
    .replace(/\bset\s+(?:a\s+)?reminder\s+(?:to\s+)?/i, "")
    .replace(/\b(?:today|tomorrow|on\s+\d{4}-\d{2}-\d{2}|on\s+\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)\b/gi, "")
    .replace(/\bat\s+(?:1[0-2]|0?[1-9])(?::[0-5]\d)?\s*(?:a\.?m\.?|p\.?m\.?)\b/gi, "")
    .replace(/\bat\s+(?:[01]?\d|2[0-3]):[0-5]\d\b/gi, "")
    .replace(/\s+/g, " ")
    .replace(/^\s*(?:to\s+)?/i, "")
    .replace(/\s*[,.!?]+\s*$/, "")
    .trim();
}

function formatTimeLabel(date: Date): string {
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function parseExplicitReminderIntent(
  text: string | null | undefined,
  now: Date,
): ExplicitReminderIntentParseResult {
  const trimmed = text?.trim();

  if (!trimmed || !REMINDER_ASK_PATTERN.test(trimmed)) {
    return { kind: "none" };
  }

  if (AMBIGUOUS_TIME_PATTERN.test(trimmed) && !/\d/.test(trimmed)) {
    return {
      kind: "clarify",
      text: "Sure — what exact date and time should I set the reminder for?",
    };
  }

  const dateToken = parseDateToken(trimmed, now);
  const timeToken = parseTimeToken(trimmed);

  if (!dateToken || !timeToken) {
    return {
      kind: "clarify",
      text: "Sure — what exact date and time should I set the reminder for?",
    };
  }

  const taskText = sanitizeTaskText(trimmed);

  if (!taskText) {
    return {
      kind: "clarify",
      text: "Got it — what should I remind everyone about, and exactly when?",
    };
  }

  const scheduledFor = new Date(dateToken.date);
  scheduledFor.setHours(timeToken.hour, timeToken.minute, 0, 0);

  if (Number.isNaN(scheduledFor.getTime())) {
    return {
      kind: "clarify",
      text: "Sure — what exact date and time should I set the reminder for?",
    };
  }

  return {
    kind: "intent",
    intent: {
      taskText,
      scheduledFor,
      scheduledForLabel: `${dateToken.label} at ${formatTimeLabel(scheduledFor)}`,
    },
  };
}
