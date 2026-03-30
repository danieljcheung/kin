"use client";

import Link from "next/link";
import { Suspense, startTransition, useEffect, useEffectEvent, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type BindingStatusResponse = {
  data: {
    family: {
      id: string;
      name: string;
    };
    onboarding: {
      status: string;
      currentStep: string;
      updatedAt: string | null;
    };
    telegram: {
      binding: {
        id: string;
        onboardingToken: string;
        status: string;
        groupName: string | null;
        telegramDmUsername: string | null;
        telegramDmFirstName: string | null;
      };
    };
    frontend: {
      state: string;
      isComplete: boolean;
    };
  };
  error?: {
    code?: string;
    message?: string;
  };
};

type LoadState = "loading" | "pending" | "invalid" | "error";

type WaitingState = {
  loadState: LoadState;
  errorMessage: string;
  familyName: string | null;
  bindingStatus: string | null;
  groupName: string | null;
};

const POLL_INTERVAL_MS = 3000;

const INITIAL_WAITING_STATE: WaitingState = {
  loadState: "loading",
  errorMessage: "",
  familyName: null,
  bindingStatus: null,
  groupName: null,
};

function TelegramWaitingPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectedRef = useRef(false);
  const pollGenerationRef = useRef(0);

  const bindingId = searchParams.get("bindingId")?.trim() ?? "";
  const onboardingToken = searchParams.get("onboardingToken")?.trim() ?? "";
  const isMissingIdentifiers = !bindingId && !onboardingToken;

  const [{ loadState, errorMessage, familyName, bindingStatus, groupName }, setWaitingState] =
    useState<WaitingState>(INITIAL_WAITING_STATE);

  const pollStatus = useEffectEvent(async (generation: number) => {
    const params = new URLSearchParams();

    if (bindingId) params.set("bindingId", bindingId);
    if (onboardingToken) params.set("onboardingToken", onboardingToken);

    try {
      const response = await fetch(
        `/api/telegram/bindings/status?${params.toString()}`,
        {
          cache: "no-store",
        },
      );

      const result = (await response.json()) as BindingStatusResponse;

      if (pollGenerationRef.current !== generation) {
        return;
      }

      if (!response.ok) {
        setWaitingState({
          ...INITIAL_WAITING_STATE,
          loadState: response.status === 404 ? "invalid" : "error",
          errorMessage:
            response.status === 404
              ? (result.error?.message ??
                "That Telegram onboarding link is no longer valid.")
              : (result.error?.message ??
                "Unable to check Telegram onboarding status."),
        });
        return;
      }

      const nextState: WaitingState = {
        loadState: "pending",
        errorMessage: "",
        familyName: result.data.family.name,
        bindingStatus: result.data.telegram.binding.status,
        groupName: result.data.telegram.binding.groupName,
      };

      setWaitingState(nextState);

      if (result.data.frontend.isComplete && !redirectedRef.current) {
        redirectedRef.current = true;

        const nextUrl = new URL("/onboarding/complete", window.location.origin);
        nextUrl.searchParams.set("bindingId", result.data.telegram.binding.id);
        nextUrl.searchParams.set(
          "onboardingToken",
          result.data.telegram.binding.onboardingToken,
        );

        startTransition(() => {
          router.replace(nextUrl.pathname + nextUrl.search);
        });
      }
    } catch {
      if (pollGenerationRef.current !== generation) {
        return;
      }

      setWaitingState({
        ...INITIAL_WAITING_STATE,
        loadState: "error",
        errorMessage: "Unable to check Telegram onboarding status.",
      });
    }
  });

  useEffect(() => {
    if (isMissingIdentifiers) {
      pollGenerationRef.current = 0;
      return;
    }

    pollGenerationRef.current += 1;
    const generation = pollGenerationRef.current;
    redirectedRef.current = false;
    void pollStatus(generation);

    const intervalId = window.setInterval(() => {
      void pollStatus(generation);
    }, POLL_INTERVAL_MS);

    return () => {
      if (pollGenerationRef.current === generation) {
        pollGenerationRef.current = 0;
      }
      window.clearInterval(intervalId);
    };
  }, [bindingId, isMissingIdentifiers, onboardingToken]);

  const showStatusLine =
    loadState === "pending" && (bindingStatus || familyName || groupName);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(255,246,196,0.9),_rgba(255,251,240,1)_45%,_rgba(255,248,235,1)_100%)] px-6 py-12 text-stone-900">
      <div className="mx-auto max-w-2xl">
        <div className="rounded-[2rem] border border-white/80 bg-white/80 p-8 shadow-[0_24px_90px_rgba(103,76,18,0.08)] backdrop-blur-sm">
          <div className="mb-8">
            <p className="text-sm font-medium uppercase tracking-[0.22em] text-stone-500">
              Step 4
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-stone-950">
              Waiting for Telegram to finish setup
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-stone-600">
              Keep this page open after you message Kin and add the bot to your family
              Telegram group. We&apos;ll move you forward as soon as the connection is
              verified.
            </p>
          </div>

          {!isMissingIdentifiers &&
          (loadState === "loading" || loadState === "pending") ? (
            <div className="rounded-3xl border border-stone-200 bg-stone-50 p-6">
              <div className="flex items-center gap-4">
                <div className="h-3 w-3 animate-pulse rounded-full bg-amber-500" />
                <p className="text-sm font-medium text-stone-800">
                  {bindingStatus === "BOT_ADDED"
                    ? "Kin is in your Telegram group. Finalizing setup now."
                    : "Checking Telegram connection status..."}
                </p>
              </div>

              <div className="mt-5 space-y-3 text-sm leading-6 text-stone-600">
                <p>1. Send the `/start` link to Kin in a direct message.</p>
                <p>2. Add Kin to your family Telegram group.</p>
                <p>3. Return here while we confirm the binding.</p>
              </div>

              {showStatusLine ? (
                <div className="mt-5 rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-600">
                  <p>
                    Household:{" "}
                    <span className="font-medium text-stone-800">
                      {familyName ?? "Unknown"}
                    </span>
                  </p>
                  <p className="mt-2">
                    Telegram status:{" "}
                    <span className="font-medium text-stone-800">
                      {bindingStatus === "BOT_ADDED"
                        ? "Bot added, awaiting confirmation"
                        : bindingStatus === "DM_STARTED"
                          ? "Waiting for Telegram connection"
                          : bindingStatus ?? "Pending"}
                    </span>
                  </p>
                  {groupName ? (
                    <p className="mt-2">
                      Group:{" "}
                      <span className="font-medium text-stone-800">{groupName}</span>
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}

          {isMissingIdentifiers || loadState === "invalid" || loadState === "error" ? (
            <div className="rounded-3xl border border-stone-200 bg-stone-50 p-6">
              <h2 className="text-base font-semibold text-stone-900">
                {isMissingIdentifiers
                  ? "Missing setup details"
                  : loadState === "invalid"
                    ? "Setup link not found"
                    : "Couldn't check Telegram yet"}
              </h2>
              <p className="mt-3 text-sm leading-6 text-stone-600">
                {isMissingIdentifiers
                  ? "Open this page from the Telegram setup step so Kin can identify the correct onboarding session."
                  : errorMessage}
              </p>

              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/onboarding/connect-telegram"
                  className="inline-flex items-center justify-center rounded-full bg-stone-900 px-6 py-3.5 text-sm font-medium text-white transition hover:bg-stone-800"
                >
                  Back to Telegram setup
                </Link>
                <Link
                  href="/onboarding/household"
                  className="inline-flex items-center justify-center rounded-full border border-stone-300 px-6 py-3.5 text-sm font-medium text-stone-700 transition hover:border-stone-500 hover:text-stone-900"
                >
                  Restart onboarding
                </Link>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </main>
  );
}

export default function TelegramWaitingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(255,246,196,0.9),_rgba(255,251,240,1)_45%,_rgba(255,248,235,1)_100%)] px-6 py-12 text-stone-900" />}>
      <TelegramWaitingPageContent />
    </Suspense>
  );
}
