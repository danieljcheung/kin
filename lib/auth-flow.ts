const DEFAULT_AUTH_NEXT_PATH = "/onboarding/household";

export function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export function normalizeNextPath(value?: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return DEFAULT_AUTH_NEXT_PATH;
  }

  return value;
}

export function buildSigninHref({
  email,
  next,
  reason,
}: {
  email?: string | null;
  next?: string | null;
  reason?: "verified" | null;
}) {
  const searchParams = new URLSearchParams();

  if (email) {
    searchParams.set("email", normalizeEmail(email));
  }

  searchParams.set("next", normalizeNextPath(next));

  if (reason) {
    searchParams.set("reason", reason);
  }

  return `/signin?${searchParams.toString()}`;
}

export { DEFAULT_AUTH_NEXT_PATH };
