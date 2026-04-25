"use client";

import Link from "next/link";
import { Suspense, startTransition, useEffect, useEffectEvent, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { OnboardingShell } from "@/app/components/onboarding-shell";

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
      const response = await fetch(`/api/telegram/bindings/status?${params.toString()}`, {
        cache: "no-store",
      });

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
              ? (result.error?.message ?? "That Telegram onboarding link is no longer valid.")
              : (result.error?.message ?? "Unable to check Telegram onboarding status."),
        });
        return;
      }

      setWaitingState({
        loadState: "pending",
        errorMessage: "",
        familyName: result.data.family.name,
        bindingStatus: result.data.telegram.binding.status,
        groupName: result.data.telegram.binding.groupName,
      });

      if (result.data.frontend.isComplete && !redirectedRef.current) {
        redirectedRef.current = true;

        const nextUrl = new URL("/onboarding/complete", window.location.origin);
        nextUrl.searchParams.set("bindingId", result.data.telegram.binding.id);
        nextUrl.searchParams.set("onboardingToken", result.data.telegram.binding.onboardingToken);

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

  const checklistItems = [
    { label: "Account created", state: "complete" },
    { label: "Household created", state: "complete" },
    {
      label: "Telegram opened",
      state: loadState === "loading" ? "current" : "complete",
    },
    {
      label: "Waiting for Kin to be added to your family Telegram group",
      state: bindingStatus === "BOT_ADDED" ? "complete" : "current",
    },
    {
      label: "Completing setup",
      state: bindingStatus === "BOT_ADDED" ? "current" : "upcoming",
    },
  ] as const;

  return (
    <OnboardingShell
      currentStep="telegram"
      title="Almost there — we’re connecting Kin now"
      description="As soon as Kin is added to your family Telegram group, setup will finish automatically."
      showBack
      backHref="/onboarding/connect-telegram"
    >
      <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:gap-10">
        <section className="space-y-6">
          <div className="rounded-[1.75rem] border border-stone-200 bg-white p-5 shadow-[0_18px_60px_rgba(104,91,42,0.06)] sm:p-6">
            <div className="flex items-center gap-3">
              <div className="h-3 w-3 rounded-full bg-[#685b2a] animate-pulse" />
              <p className="text-sm font-medium text-stone-800">
                {bindingStatus === "BOT_ADDED"
                  ? "Kin is in your Telegram group. Finalizing setup now."
                  : "Waiting for Kin to be added to your family Telegram group."}
              </p>
            </div>
            <p className="mt-4 text-sm leading-7 text-stone-600">
              Keep Telegram open while you finish the add-to-group step. We’ll automatically move you forward as soon as the connection is verified.
            </p>

            {(familyName || bindingStatus || groupName) && loadState === "pending" ? (
              <div className="mt-5 rounded-[1.5rem] border border-stone-200 bg-[#faf8f2] p-4 text-sm leading-7 text-stone-600">
                {familyName ? (
                  <p>
                    Household: <span className="font-medium text-stone-900">{familyName}</span>
                  </p>
                ) : null}
                {bindingStatus ? (
                  <p className="mt-2">
                    Telegram status: <span className="font-medium text-stone-900">{bindingStatus === "BOT_ADDED" ? "Bot added, awaiting final confirmation" : bindingStatus === "DM_STARTED" ? "Waiting for Telegram connection" : bindingStatus}</span>
                  </p>
                ) : null}
                {groupName ? (
                  <p className="mt-2">
                    Group: <span className="font-medium text-stone-900">{groupName}</span>
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Link
              href="/onboarding/connect-telegram"
              className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-stone-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-stone-800 sm:w-auto"
            >
              Open Telegram
            </Link>
            <Link
              href={{
                pathname: "/onboarding/waiting",
                query: {
                  ...(bindingId ? { bindingId } : {}),
                  ...(onboardingToken ? { onboardingToken } : {}),
                },
              }}
              className="inline-flex min-h-11 w-full items-center justify-center rounded-full border border-stone-300 bg-white px-5 py-3 text-sm font-medium text-stone-700 transition hover:border-stone-500 hover:text-stone-900 sm:w-auto"
            >
              I already added Kin
            </Link>
          </div>
        </section>

        <section>
          {(loadState === "loading" || loadState === "pending") && !isMissingIdentifiers ? (
            <div className="rounded-[2rem] border border-white/70 bg-white/75 p-5 shadow-[0_24px_80px_rgba(104,91,42,0.08)] backdrop-blur-sm sm:p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">Setup progress</p>
              <div className="mt-6 space-y-4">
                {checklistItems.map((item) => (
                  <div key={item.label} className="flex items-start gap-4 rounded-[1.5rem] border border-stone-200 bg-[#faf8f2] px-4 py-4">
                    <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${item.state === "complete" ? "bg-[#feeaac] text-[#5c4f20]" : item.state === "current" ? "bg-[#685b2a] text-[#fff2d0]" : "bg-stone-200 text-stone-500"}`}>
                      {item.state === "complete" ? "✓" : item.state === "current" ? "•" : ""}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-stone-900">{item.label}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {(isMissingIdentifiers || loadState === "invalid" || loadState === "error") ? (
            <div className="rounded-[2rem] border border-stone-200 bg-white p-5 shadow-[0_18px_60px_rgba(104,91,42,0.06)] sm:p-6">
              <h2 className="text-xl font-semibold tracking-tight text-stone-950">
                {isMissingIdentifiers
                  ? "Missing setup details"
                  : loadState === "invalid"
                    ? "Setup link not found"
                    : "Couldn't check Telegram yet"}
              </h2>
              <p className="mt-3 text-sm leading-7 text-stone-600">
                {isMissingIdentifiers
                  ? "Open this page from the Telegram setup step so Kin can identify the correct onboarding session."
                  : errorMessage}
              </p>
              <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <Link
                  href="/onboarding/connect-telegram"
                  className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-stone-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-stone-800 sm:w-auto"
                >
                  Back to Telegram setup
                </Link>
                <Link
                  href="/onboarding/household"
                  className="inline-flex min-h-11 w-full items-center justify-center rounded-full border border-stone-300 bg-white px-5 py-3 text-sm font-medium text-stone-700 transition hover:border-stone-500 hover:text-stone-900 sm:w-auto"
                >
                  Restart onboarding
                </Link>
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </OnboardingShell>
  );
}

export default function TelegramWaitingPage() {
  return (
    <Suspense fallback={<div className="min-h-[100svh] bg-[radial-gradient(circle_at_top,_rgba(255,246,196,0.9),_rgba(255,251,240,1)_45%,_rgba(255,248,235,1)_100%)] px-4 py-6 text-stone-900 sm:px-6 sm:py-12" />}>
      <TelegramWaitingPageContent />
    </Suspense>
  );
}
