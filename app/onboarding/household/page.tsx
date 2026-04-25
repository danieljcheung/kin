"use client";

import { FormEvent, useEffect, useState } from "react";
import { fetchUserAttributes, getCurrentUser } from "aws-amplify/auth";
import { useRouter } from "next/navigation";
import { OnboardingShell } from "@/app/components/onboarding-shell";
import { configureAmplify } from "@/lib/amplify";
import { buildSigninHref } from "@/lib/auth-flow";
import { loadPendingSignupState } from "@/lib/pending-signup";

configureAmplify();

type AuthIdentity = {
  cognitoSub: string;
  email: string;
  name?: string;
};

function getAuthErrorMessage(err: unknown) {
  if (!(err instanceof Error)) {
    return "Unable to load your account session.";
  }

  if (
    err.message.includes("authenticated") ||
    err.message.includes("No current user")
  ) {
    return "Sign in to continue your household setup.";
  }

  return err.message;
}

export default function HouseholdOnboardingPage() {
  const router = useRouter();

  const [familyName, setFamilyName] = useState("");
  const [identity, setIdentity] = useState<AuthIdentity | null>(null);

  const [loadingIdentity, setLoadingIdentity] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [signinHref, setSigninHref] = useState(
    buildSigninHref({ next: "/onboarding/household" }),
  );

  useEffect(() => {
    async function loadIdentity() {
      try {
        const currentUser = await getCurrentUser();
        const attributes = await fetchUserAttributes();

        setIdentity({
          cognitoSub: currentUser.userId,
          email: attributes.email ?? "",
          name: attributes.name,
        });
      } catch (err) {
        setError(getAuthErrorMessage(err));
      } finally {
        setLoadingIdentity(false);
      }
    }

    void loadIdentity();
  }, []);

  useEffect(() => {
    const pendingSignup = loadPendingSignupState();

    setSigninHref(
      buildSigninHref({
        email: pendingSignup?.email,
        next: "/onboarding/household",
      }),
    );
  }, []);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setError("");
    setSuccess("");

    if (!identity) {
      setError("Missing authenticated user session.");
      return;
    }

    const trimmedFamilyName = familyName.trim();

    if (!trimmedFamilyName) {
      setError("Please enter a household name.");
      return;
    }

    if (trimmedFamilyName.length < 2) {
      setError("Household name must be at least 2 characters.");
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch("/api/onboarding/household", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          cognitoSub: identity.cognitoSub,
          email: identity.email,
          name: identity.name,
          familyName: trimmedFamilyName,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.error?.message ?? "Unable to create household.");
      }

      setSuccess("Household created successfully.");

      const deepLink = result?.data?.telegram?.deepLink;
      const onboardingToken = result?.data?.telegram?.binding?.onboardingToken;
      const bindingId = result?.data?.telegram?.binding?.id;

      const nextUrl = new URL("/onboarding/connect-telegram", window.location.origin);

      if (bindingId) nextUrl.searchParams.set("bindingId", bindingId);
      if (onboardingToken) nextUrl.searchParams.set("onboardingToken", onboardingToken);
      if (deepLink) nextUrl.searchParams.set("deepLink", deepLink);

      router.push(nextUrl.pathname + nextUrl.search);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unable to create household.";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <OnboardingShell
      currentStep="household"
      title="Create your household"
      description="Give your family space a name. Next, you’ll connect Kin to Telegram."
      showBack
      backHref="/signup/confirm"
    >
      <div className="mx-auto max-w-3xl">
        <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr] lg:gap-8">
          <section className="rounded-[1.75rem] border border-stone-200 bg-[#faf8f2] p-5 sm:p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">
              Household step
            </p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-stone-950">
              Set up your family space
            </h2>
            <div className="mt-6 space-y-4 text-sm leading-7 text-stone-600">
              <p>
                Choose the name you want to see across setup and in the dashboard.
              </p>
              <div className="rounded-[1.5rem] border border-stone-200 bg-white px-4 py-4">
                <p className="font-medium text-stone-900">What happens next</p>
                <ul className="mt-3 space-y-3">
                  <li>1. Create your household</li>
                  <li>2. Open Kin in Telegram</li>
                  <li>3. Add Kin to your family group</li>
                </ul>
              </div>
            </div>
          </section>

          <section className="rounded-[1.75rem] border border-stone-200 bg-white p-5 shadow-[0_18px_60px_rgba(104,91,42,0.06)] sm:p-6">
            {loadingIdentity ? (
              <div className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-600">
                Loading your account...
              </div>
            ) : null}

            {!loadingIdentity && identity ? (
              <div className="mb-5 rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-600">
                Signed in as <span className="font-medium text-stone-800">{identity.email}</span>
              </div>
            ) : null}

            {!loadingIdentity && !identity ? (
              <button
                type="button"
                onClick={() => router.push(signinHref)}
                className="w-full rounded-full border border-stone-300 px-6 py-3 text-sm font-medium text-stone-700 transition hover:border-stone-500 hover:text-stone-900"
              >
                Sign in to continue
              </button>
            ) : null}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-medium text-stone-700">
                  Household name
                </label>
                <input
                  type="text"
                  value={familyName}
                  onChange={(e) => setFamilyName(e.target.value)}
                  className="w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 text-base outline-none transition focus:border-stone-500 sm:text-sm"
                  placeholder="Cheung Family"
                />
              </div>

              {error ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              ) : null}

              {success ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  {success}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={loadingIdentity || submitting || !identity}
                className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-stone-900 px-6 py-3.5 text-sm font-medium text-white transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? "Creating household..." : "Continue"}
              </button>
            </form>
          </section>
        </div>
      </div>
    </OnboardingShell>
  );
}
