"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { OnboardingShell } from "@/app/components/onboarding-shell";

function BindingIdValue() {
  const searchParams = useSearchParams();
  const bindingId = searchParams.get("bindingId");

  return (
    <p className="mt-2 break-all text-sm leading-6 text-stone-700">
      {bindingId ?? "Unavailable"}
    </p>
  );
}

function TelegramCompletePageContent() {
  return (
    <OnboardingShell
      currentStep="complete"
      title="Kin is ready in your family Telegram"
      description="Kin is connected to your household setup. You can now use it in your family chat and manage your connection from the dashboard."
    >
      <div className="grid gap-12 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
        <section className="order-2 flex justify-center lg:order-1 lg:justify-end">
          <div className="relative w-full max-w-md">
            <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-[#feeaac]/40 blur-3xl" />
            <div className="absolute -bottom-10 -left-10 h-56 w-56 rounded-full bg-[#f2fede]/50 blur-3xl" />
            <div className="relative rounded-[2rem] border border-stone-200 bg-white p-6 shadow-[0_24px_80px_rgba(104,91,42,0.10)]">
              <div className="flex items-center gap-3 border-b border-stone-200 pb-5">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#e5e2da] text-stone-700">
                  ✦
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-stone-900">Family Telegram</h3>
                  <p className="text-xs text-stone-500">Kin is connected and ready</p>
                </div>
              </div>

              <div className="mt-6 space-y-4">
                <div className="ml-auto max-w-[80%] rounded-3xl rounded-br-md bg-[#efe6d4] px-4 py-3 text-sm leading-6 text-stone-700">
                  Kin, remind us to bring dessert for Sunday dinner.
                </div>
                <div className="max-w-[88%] rounded-3xl rounded-bl-md bg-[#feeaac] px-4 py-3 text-sm leading-6 text-[#5c4f20] shadow-sm">
                  Absolutely — I’ll remind the group before you leave and again on Sunday afternoon.
                </div>
                <div className="ml-auto max-w-[78%] rounded-3xl rounded-br-md bg-[#efe6d4] px-4 py-3 text-sm leading-6 text-stone-700">
                  Also what do we still need from the store?
                </div>
                <div className="max-w-[88%] rounded-3xl rounded-bl-md bg-[#faf8f2] px-4 py-3 text-sm leading-6 text-stone-800 shadow-sm">
                  So far: tomatoes, basil, pasta, and dessert. Still missing: garlic bread and sparkling water.
                </div>
              </div>

              <div className="mt-6 rounded-[1.5rem] border border-stone-200 bg-[#faf8f2] px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                  Binding ID
                </p>
                <Suspense
                  fallback={
                    <p className="mt-2 break-all text-sm leading-6 text-stone-700">
                      Unavailable
                    </p>
                  }
                >
                  <BindingIdValue />
                </Suspense>
              </div>
            </div>
          </div>
        </section>

        <section className="order-1 lg:order-2">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#feeaac] px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-[#5c4f20]">
            <span>✓</span>
            <span>Setup complete</span>
          </div>
          <h2 className="mt-6 text-4xl font-semibold tracking-tight text-stone-950 md:text-5xl">
            Kin is ready in your family Telegram
          </h2>
          <p className="mt-5 max-w-xl text-base leading-8 text-stone-600">
            Your household is connected. You can now use Kin in your family Telegram chat and manage your setup from the dashboard.
          </p>

          <div className="mt-8 flex flex-col gap-4 sm:flex-row">
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center rounded-full bg-stone-900 px-7 py-4 text-base font-medium text-white shadow-[0_14px_30px_rgba(41,37,36,0.18)] transition hover:bg-stone-800"
            >
              Go to Dashboard
            </Link>
            <Link
              href="/settings"
              className="inline-flex items-center justify-center rounded-full border border-stone-300 bg-white px-7 py-4 text-base font-medium text-stone-700 transition hover:border-stone-500 hover:text-stone-900"
            >
              Open Telegram settings
            </Link>
          </div>
        </section>
      </div>
    </OnboardingShell>
  );
}

export default function TelegramCompletePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(255,246,196,0.9),_rgba(255,251,240,1)_45%,_rgba(255,248,235,1)_100%)] px-6 py-12 text-stone-900" />}>
      <TelegramCompletePageContent />
    </Suspense>
  );
}
