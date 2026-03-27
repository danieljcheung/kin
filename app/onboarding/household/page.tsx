"use client";

import { FormEvent, useEffect, useState } from "react";
import { fetchUserAttributes, getCurrentUser } from "aws-amplify/auth";
import { useRouter } from "next/navigation";
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

    loadIdentity();
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
        throw new Error(
          result?.error?.message ?? "Unable to create household.",
        );
      }

      setSuccess("Household created successfully.");

      const deepLink = result?.data?.telegram?.deepLink;
      const inviteToken = result?.data?.telegram?.binding?.inviteToken;
      const bindingId = result?.data?.telegram?.binding?.id;

      const nextUrl = new URL(
        "/onboarding/connect-telegram",
        window.location.origin,
      );

      if (bindingId) nextUrl.searchParams.set("bindingId", bindingId);
      if (inviteToken) nextUrl.searchParams.set("inviteToken", inviteToken);
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
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(255,246,196,0.9),_rgba(255,251,240,1)_45%,_rgba(255,248,235,1)_100%)] px-6 py-12 text-stone-900">
      <div className="mx-auto max-w-md">
        <div className="rounded-[2rem] border border-white/80 bg-white/80 p-8 shadow-[0_24px_90px_rgba(103,76,18,0.08)] backdrop-blur-sm">
          <div className="mb-8">
            <p className="text-sm font-medium uppercase tracking-[0.22em] text-stone-500">
              Step 3
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-stone-950">
              Create your household
            </h1>
            <p className="mt-3 text-sm leading-6 text-stone-600">
              Give your Kin home a name. Next, we’ll connect it to Telegram.
            </p>
          </div>

          {loadingIdentity ? (
            <div className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-600">
              Loading your account...
            </div>
          ) : null}

          {!loadingIdentity && identity ? (
            <div className="mb-5 rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-600">
              Signed in as{" "}
              <span className="font-medium text-stone-800">{identity.email}</span>
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
                className="w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-stone-500"
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
              className="inline-flex w-full items-center justify-center rounded-full bg-stone-900 px-6 py-3.5 text-sm font-medium text-white transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Creating household..." : "Create household"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
