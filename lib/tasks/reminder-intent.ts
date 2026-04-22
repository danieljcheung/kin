export interface ExplicitReminderIntent {
  taskText: string;
  scheduledFor: Date;
  scheduledForLabel: string;
}

export type ExplicitReminderIntentParseResult =
  | { kind: "none" }
  | { kind: "clarify"; text: string }
  | { kind: "intent"; intent: ExplicitReminderIntent };

interface ParseReminderIntentOptions {
  timeZone?: string;
}

const REMINDER_ASK_PATTERN = /\b(remind(?:er)?|set\s+(?:a\s+)?reminder)\b/i;
const AMBIGUOUS_TIME_PATTERN = /\b(later|soon|sometime|whenever|tonight|morning|afternoon|evening)\b/i;

function getDatePartsInTimeZone(date: Date, timeZone: string): { year: number; month: number; day: number } {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const parts = formatter.formatToParts(date);
  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const day = Number(parts.find((part) => part.type === "day")?.value);

  return { year, month, day };
}

function addDaysToDateParts(
  dateParts: { year: number; month: number; day: number },
  daysToAdd: number,
): { year: number; month: number; day: number } {
  const date = new Date(Date.UTC(dateParts.year, dateParts.month - 1, dateParts.day + daysToAdd));

  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  };
}

function getTimeZoneOffsetMs(date: Date, timeZone: string): number {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const day = Number(parts.find((part) => part.type === "day")?.value);
  const hour = Number(parts.find((part) => part.type === "hour")?.value);
  const minute = Number(parts.find((part) => part.type === "minute")?.value);
  const second = Number(parts.find((part) => part.type === "second")?.value);

  const asIfUtc = Date.UTC(year, month - 1, day, hour, minute, second);
  return asIfUtc - date.getTime();
}

function dateFromTimeZoneComponents(params: {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  timeZone: string;
}): Date {
  const { year, month, day, hour, minute, timeZone } = params;
  const localAsIfUtc = Date.UTC(year, month - 1, day, hour, minute, 0, 0);
  const firstGuess = new Date(localAsIfUtc - getTimeZoneOffsetMs(new Date(localAsIfUtc), timeZone));
  const refinedTime = localAsIfUtc - getTimeZoneOffsetMs(firstGuess, timeZone);
  return new Date(refinedTime);
}

function parseDateToken(
  text: string,
  now: Date,
  timeZone: string,
): { year: number; month: number; day: number; label: string } | null {
  const lowered = text.toLowerCase();
  const nowParts = getDatePartsInTimeZone(now, timeZone);

  if (lowered.includes("tomorrow")) {
    return {
      ...addDaysToDateParts(nowParts, 1),
      label: "tomorrow",
    };
  }

  if (lowered.includes("today")) {
    return {
      ...nowParts,
      label: "today",
    };
  }

  const isoMatch = text.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  if (isoMatch) {
    const year = Number(isoMatch[1]);
    const month = Number(isoMatch[2]);
    const day = Number(isoMatch[3]);
    return {
      year,
      month,
      day,
      label: `on ${isoMatch[0]}`,
    };
  }

  const slashMatch = text.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/);
  if (slashMatch) {
    const month = Number(slashMatch[1]);
    const day = Number(slashMatch[2]);
    const currentYear = nowParts.year;
    const parsedYear = slashMatch[3] ? Number(slashMatch[3]) : currentYear;
    const year = parsedYear < 100 ? 2000 + parsedYear : parsedYear;

    return {
      year,
      month,
      day,
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

function formatTimeLabel(date: Date, timeZone: string): string {
  return date.toLocaleTimeString("en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
  });
}

function normalizeTimeZone(rawTimeZone: string | undefined): string {
  if (!rawTimeZone) {
    return "UTC";
  }

  try {
    const resolved = new Intl.DateTimeFormat("en-US", { timeZone: rawTimeZone }).resolvedOptions().timeZone;
    return resolved;
  } catch {
    return "UTC";
  }
}

export function parseExplicitReminderIntent(
  text: string | null | undefined,
  now: Date,
  options?: ParseReminderIntentOptions,
): ExplicitReminderIntentParseResult {
  const timeZone = normalizeTimeZone(options?.timeZone);
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

  const dateToken = parseDateToken(trimmed, now, timeZone);
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

  const scheduledFor = dateFromTimeZoneComponents({
    year: dateToken.year,
    month: dateToken.month,
    day: dateToken.day,
    hour: timeToken.hour,
    minute: timeToken.minute,
    timeZone,
  });

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
      scheduledForLabel: `${dateToken.label} at ${formatTimeLabel(scheduledFor, timeZone)}`,
    },
  };
}
