"use client";

const PENDING_SIGNUP_STORAGE_KEY = "kin.pending-signup";
const PENDING_SIGNUP_MAX_AGE_MS = 15 * 60 * 1000;

export type PendingSignupState = {
  email: string;
  password: string;
  name: string;
  createdAt: number;
};

function canUseSessionStorage() {
  return typeof window !== "undefined" && typeof window.sessionStorage !== "undefined";
}

export function savePendingSignupState(state: Omit<PendingSignupState, "createdAt">) {
  if (!canUseSessionStorage()) return;

  window.sessionStorage.setItem(
    PENDING_SIGNUP_STORAGE_KEY,
    JSON.stringify({
      ...state,
      createdAt: Date.now(),
    } satisfies PendingSignupState),
  );
}

export function loadPendingSignupState(): PendingSignupState | null {
  if (!canUseSessionStorage()) return null;

  const raw = window.sessionStorage.getItem(PENDING_SIGNUP_STORAGE_KEY);

  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<PendingSignupState>;

    if (
      typeof parsed.email !== "string" ||
      typeof parsed.password !== "string" ||
      typeof parsed.name !== "string" ||
      typeof parsed.createdAt !== "number"
    ) {
      clearPendingSignupState();
      return null;
    }

    if (Date.now() - parsed.createdAt > PENDING_SIGNUP_MAX_AGE_MS) {
      clearPendingSignupState();
      return null;
    }

    return parsed as PendingSignupState;
  } catch {
    clearPendingSignupState();
    return null;
  }
}

export function clearPendingSignupState() {
  if (!canUseSessionStorage()) return;

  window.sessionStorage.removeItem(PENDING_SIGNUP_STORAGE_KEY);
}
