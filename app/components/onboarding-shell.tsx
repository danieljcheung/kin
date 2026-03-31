"use client";

import Link from "next/link";
import { ReactNode } from "react";

export type OnboardingStepKey = "account" | "household" | "telegram" | "complete";

type StepDefinition = {
  key: OnboardingStepKey;
  number: string;
  label: string;
};

const STEPS: StepDefinition[] = [
  { key: "account", number: "1", label: "Account" },
  { key: "household", number: "2", label: "Household" },
  { key: "telegram", number: "3", label: "Connect Telegram" },
  { key: "complete", number: "4", label: "Complete setup" },
];

const STEP_ORDER: Record<OnboardingStepKey, number> = {
  account: 0,
  household: 1,
  telegram: 2,
  complete: 3,
};

function getStepState(currentStep: OnboardingStepKey, stepKey: OnboardingStepKey) {
  const currentIndex = STEP_ORDER[currentStep];
  const stepIndex = STEP_ORDER[stepKey];

  if (stepIndex < currentIndex) return "complete";
  if (stepIndex === currentIndex) return "current";
  return "upcoming";
}

function stepClasses(state: "complete" | "current" | "upcoming") {
  switch (state) {
    case "complete":
      return {
        bubble: "border-[#d9c980] bg-[#feeaac] text-[#5c4f20]",
        text: "text-stone-900",
        line: "bg-[#d9c980]",
      };
    case "current":
      return {
        bubble: "border-[#685b2a] bg-[#685b2a] text-[#fff2d0] shadow-[0_10px_30px_rgba(104,91,42,0.18)]",
        text: "text-stone-950",
        line: "bg-stone-200",
      };
    default:
      return {
        bubble: "border-stone-300 bg-white/70 text-stone-500",
        text: "text-stone-500",
        line: "bg-stone-200",
      };
  }
}

export function OnboardingShell({
  currentStep,
  title,
  description,
  children,
  showBack = false,
  backHref,
}: {
  currentStep: OnboardingStepKey;
  title: string;
  description?: string;
  children: ReactNode;
  showBack?: boolean;
  backHref?: string;
}) {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(254,234,172,0.5),_rgba(247,246,242,1)_36%,_rgba(255,251,244,1)_100%)] text-stone-900">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-5 py-6 md:px-8 md:py-8">
        <header className="mb-8 rounded-[2rem] border border-white/70 bg-white/75 px-5 py-5 shadow-[0_16px_50px_rgba(104,91,42,0.06)] backdrop-blur md:px-7 md:py-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              {showBack && backHref ? (
                <Link
                  href={backHref}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-stone-200 bg-white/80 text-lg text-[#685b2a] transition hover:border-stone-300 hover:bg-white"
                  aria-label="Go back"
                >
                  ←
                </Link>
              ) : null}
              <div>
                <p className="text-sm font-semibold tracking-tight text-stone-950">Kin</p>
                <p className="text-xs text-stone-500">A private assistant for family life</p>
              </div>
            </div>
          </div>

          <div className="mt-6 overflow-x-auto pb-1">
            <div className="flex min-w-max items-center gap-2 md:gap-3">
              {STEPS.map((step, index) => {
                const state = getStepState(currentStep, step.key);
                const styles = stepClasses(state);

                return (
                  <div key={step.key} className="flex items-center gap-2 md:gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-full border text-sm font-semibold transition ${styles.bubble}`}
                      >
                        {step.number}
                      </div>
                      <div className="pr-1">
                        <p className={`text-sm font-medium ${styles.text}`}>{step.label}</p>
                      </div>
                    </div>
                    {index < STEPS.length - 1 ? (
                      <div className={`h-[2px] w-10 rounded-full md:w-16 ${styles.line}`} />
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        </header>

        <section className="flex flex-1 items-center justify-center py-4 md:py-8">
          <div className="w-full rounded-[2.25rem] border border-white/70 bg-white/72 p-6 shadow-[0_24px_80px_rgba(104,91,42,0.08)] backdrop-blur md:p-8 lg:p-10">
            <div className="mb-8 max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#685b2a]">
                Onboarding
              </p>
              <h1 className="mt-3 font-serif text-3xl font-semibold tracking-tight text-stone-950 md:text-5xl">
                {title}
              </h1>
              {description ? (
                <p className="mt-4 max-w-2xl text-sm leading-7 text-stone-600 md:text-base">
                  {description}
                </p>
              ) : null}
            </div>

            {children}
          </div>
        </section>
      </div>
    </main>
  );
}
