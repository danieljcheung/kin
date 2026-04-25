"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  autoSignIn,
  confirmSignUp,
  fetchAuthSession,
  resendSignUpCode,
  signIn,
} from "aws-amplify/auth";
import { configureAmplify } from "@/lib/amplify";
import { buildSigninHref, normalizeEmail } from "@/lib/auth-flow";
import {
  clearPendingSignupState,
  loadPendingSignupState,
} from "@/lib/pending-signup";

configureAmplify();

const CODE_LENGTH = 6;
const SESSION_RECOVERY_REDIRECT = "SIGNIN_REQUIRED";

function ConfirmSignupPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [storedEmail, setStoredEmail] = useState("");
  const email = useMemo(() => {
    const searchEmail = searchParams.get("email");
    const normalizedSearchEmail = searchEmail ? normalizeEmail(searchEmail) : "";
    return normalizedSearchEmail || storedEmail;
  }, [searchParams, storedEmail]);

  const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(""));
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  useEffect(() => {
    const pendingSignup = loadPendingSignupState();
    if (pendingSignup?.email) {
      setStoredEmail(pendingSignup.email);
    }
  }, []);

  const code = digits.join("");

  async function ensureAuthenticated(username: string) {
    const confirmedSignIn = async () => {
      const session = await fetchAuthSession();
      return Boolean(session.tokens?.accessToken);
    };

    if (await confirmedSignIn()) {
      return;
    }

    try {
      await autoSignIn();

      if (await confirmedSignIn()) {
        return;
      }
    } catch {
      // autoSignIn only works when Cognito still has the sign-up state in this browser.
    }

    const pendingSignup = loadPendingSignupState();

    if (!pendingSignup || pendingSignup.email !== username) {
      throw new Error(SESSION_RECOVERY_REDIRECT);
    }

    await signIn({
      username,
      password: pendingSignup.password,
    });

    if (!(await confirmedSignIn())) {
      throw new Error(SESSION_RECOVERY_REDIRECT);
    }
  }

  function updateDigit(index: number, value: string) {
    const clean = value.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[index] = clean;
    setDigits(next);

    if (clean && index < CODE_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handleKeyDown(
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>,
  ) {
    if (e.key === "Backspace") {
      if (digits[index]) {
        const next = [...digits];
        next[index] = "";
        setDigits(next);
        return;
      }

      if (index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    }

    if (e.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }

    if (e.key === "ArrowRight" && index < CODE_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const pasted = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, CODE_LENGTH);

    if (!pasted) return;

    const next = Array(CODE_LENGTH).fill("");
    pasted.split("").forEach((char, i) => {
      next[i] = char;
    });

    setDigits(next);

    const focusIndex = Math.min(pasted.length, CODE_LENGTH - 1);
    inputRefs.current[focusIndex]?.focus();
  }

  async function handleVerify() {
    setError("");
    setSuccess("");

    if (!email) {
      setError("Missing email context. Please go back and sign up again.");
      return;
    }

    if (code.length !== CODE_LENGTH) {
      setError("Enter the full 6-digit verification code.");
      return;
    }

    setLoading(true);

    try {
      const result = await confirmSignUp({
        username: email,
        confirmationCode: code,
      });

      if (result.nextStep?.signUpStep === "COMPLETE_AUTO_SIGN_IN") {
        await ensureAuthenticated(email);
      } else {
        await ensureAuthenticated(email);
      }

      clearPendingSignupState();
      setSuccess("Email verified. Redirecting to household setup...");

      setTimeout(() => {
        router.replace("/onboarding/household");
      }, 800);
    } catch (err) {
      if (
        err instanceof Error &&
        err.message === SESSION_RECOVERY_REDIRECT
      ) {
        router.replace(
          buildSigninHref({
            email,
            next: "/onboarding/household",
            reason: "verified",
          }),
        );
        return;
      }

      const message =
        err instanceof Error ? err.message : "Unable to verify code.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    setError("");
    setSuccess("");

    if (!email) {
      setError("Missing email context. Please go back and sign up again.");
      return;
    }

    setResending(true);

    try {
      await resendSignUpCode({
        username: email,
      });

      setSuccess("A new verification code was sent.");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unable to resend code.";
      setError(message);
    } finally {
      setResending(false);
    }
  }

  return (
    <main className="min-h-[100svh] bg-[radial-gradient(circle_at_top,_rgba(255,246,196,0.9),_rgba(255,251,240,1)_45%,_rgba(255,248,235,1)_100%)] px-4 py-6 text-stone-900 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-md">
        <div className="rounded-[1.75rem] border border-white/80 bg-white/80 p-5 shadow-[0_24px_90px_rgba(103,76,18,0.08)] backdrop-blur-sm sm:rounded-[2rem] sm:p-8">
          <div className="mb-8">
            <p className="text-sm font-medium uppercase tracking-[0.22em] text-stone-500">
              Step 2
            </p>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight text-stone-950 sm:text-3xl">
              Verify your email
            </h1>
            <p className="mt-3 text-sm leading-6 text-stone-600">
              Enter the 6-digit code we sent to{" "}
              <span className="font-medium text-stone-800">
                {email ? normalizeEmail(email) : "your email"}
              </span>
              .
            </p>
          </div>

          <div className="grid grid-cols-6 gap-2 sm:flex sm:justify-between">
            {digits.map((digit, index) => (
              <input
                key={index}
                ref={(el) => {
                  inputRefs.current[index] = el;
                }}
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={1}
                value={digit}
                onChange={(e) => updateDigit(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                onPaste={handlePaste}
                className="h-12 w-full rounded-2xl border border-stone-300 bg-white text-center text-lg font-semibold text-stone-900 outline-none transition focus:border-stone-500 sm:h-14 sm:w-12 sm:text-xl"
              />
            ))}
          </div>

          {error ? (
            <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          {success ? (
            <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {success}
            </div>
          ) : null}

          <button
            type="button"
            onClick={handleVerify}
            disabled={loading}
            className="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-full bg-stone-900 px-6 py-3.5 text-sm font-medium text-white transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Verifying..." : "Verify email"}
          </button>

          <button
            type="button"
            onClick={handleResend}
            disabled={resending}
            className="mt-4 w-full text-sm font-medium text-stone-600 transition hover:text-stone-900 disabled:opacity-60"
          >
            {resending ? "Resending..." : "Resend code"}
          </button>

          <button
            type="button"
            onClick={() => router.push("/signup")}
            className="mt-3 w-full text-sm font-medium text-stone-500 transition hover:text-stone-900"
          >
            Start over
          </button>
        </div>
      </div>
    </main>
  );
}

export default function ConfirmSignupPage() {
  return (
    <Suspense fallback={<div className="min-h-[100svh] bg-[radial-gradient(circle_at_top,_rgba(255,246,196,0.9),_rgba(255,251,240,1)_45%,_rgba(255,248,235,1)_100%)] px-4 py-6 text-stone-900 sm:px-6 sm:py-12" />}>
      <ConfirmSignupPageContent />
    </Suspense>
  );
}
