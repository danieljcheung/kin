"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { fetchAuthSession, signIn } from "aws-amplify/auth";
import { useRouter, useSearchParams } from "next/navigation";
import { configureAmplify } from "@/lib/amplify";
import {
  DEFAULT_AUTH_NEXT_PATH,
  normalizeEmail,
  normalizeNextPath,
} from "@/lib/auth-flow";
import {
  clearPendingSignupState,
  loadPendingSignupState,
} from "@/lib/pending-signup";

configureAmplify();

function getSigninErrorMessage(err: unknown) {
  if (!(err instanceof Error)) {
    return "Unable to sign you in.";
  }

  return err.message;
}

export default function SigninPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [storedEmail, setStoredEmail] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [error, setError] = useState("");

  const nextPath = useMemo(
    () => normalizeNextPath(searchParams.get("next")),
    [searchParams],
  );
  const normalizedQueryEmail = useMemo(() => {
    const queryEmail = searchParams.get("email");
    return queryEmail ? normalizeEmail(queryEmail) : "";
  }, [searchParams]);
  const reason = searchParams.get("reason");

  useEffect(() => {
    const pendingSignup = loadPendingSignupState();
    if (pendingSignup?.email) {
      setStoredEmail(pendingSignup.email);
    }
  }, []);

  useEffect(() => {
    const nextEmail = normalizedQueryEmail || storedEmail;
    if (!nextEmail) {
      return;
    }

    setEmail((currentEmail) => currentEmail || nextEmail);
  }, [normalizedQueryEmail, storedEmail]);

  useEffect(() => {
    let cancelled = false;

    async function redirectIfAuthenticated() {
      try {
        const session = await fetchAuthSession();

        if (!cancelled && session.tokens?.accessToken) {
          clearPendingSignupState();
          router.replace(nextPath);
          return;
        }
      } catch {
        // Continue to the sign-in form if there is no current session.
      } finally {
        if (!cancelled) {
          setCheckingSession(false);
        }
      }
    }

    redirectIfAuthenticated();

    return () => {
      cancelled = true;
    };
  }, [nextPath, router]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setError("");

    if (!email.trim()) {
      setError("Please enter your email.");
      return;
    }

    if (!password) {
      setError("Please enter your password.");
      return;
    }

    const normalized = normalizeEmail(email);

    setLoading(true);

    try {
      await signIn({
        username: normalized,
        password,
        options: {
          authFlowType: "USER_AUTH",
        },
      });

      const session = await fetchAuthSession();

      if (!session.tokens?.accessToken) {
        throw new Error("We could not finish signing you in. Please try again.");
      }

      clearPendingSignupState();
      router.replace(nextPath || DEFAULT_AUTH_NEXT_PATH);
    } catch (err) {
      setError(getSigninErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(255,246,196,0.9),_rgba(255,251,240,1)_45%,_rgba(255,248,235,1)_100%)] px-6 py-12 text-stone-900">
      <div className="mx-auto max-w-md">
        <div className="rounded-[2rem] border border-white/80 bg-white/80 p-8 shadow-[0_24px_90px_rgba(103,76,18,0.08)] backdrop-blur-sm">
          <div className="mb-8">
            <p className="text-sm font-medium uppercase tracking-[0.22em] text-stone-500">
              Sign in
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-stone-950">
              Continue your setup
            </h1>
            <p className="mt-3 text-sm leading-6 text-stone-600">
              Sign in to continue to your household onboarding.
            </p>
          </div>

          {reason === "verified" ? (
            <div className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              Your email is verified. Sign in to continue setup.
            </div>
          ) : null}

          {checkingSession ? (
            <div className="mb-5 rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-600">
              Checking your session...
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-medium text-stone-700">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-stone-500"
                placeholder="you@example.com"
                autoComplete="email"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-stone-700">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-stone-500"
                placeholder="Enter your password"
                autoComplete="current-password"
              />
            </div>

            {error ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={loading || checkingSession}
              className="inline-flex w-full items-center justify-center rounded-full bg-stone-900 px-6 py-3.5 text-sm font-medium text-white transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
