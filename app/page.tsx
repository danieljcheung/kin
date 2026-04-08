"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { BackgroundPaths } from "./components/background-paths";

const introStorageKey = "kin-landing-intro-v1-seen";

const valueProps = [
  {
    title: "Keep everyone aligned",
    description:
      "Kin turns chat messages into clear reminders so plans do not get lost.",
  },
  {
    title: "Handle daily logistics",
    description:
      "From grocery follow-ups to pickup timing, Kin helps with the practical stuff families juggle.",
  },
  {
    title: "Reply with context",
    description:
      "Kin gives grounded answers based on what your household has already discussed.",
  },
];

const setupSteps = [
  {
    number: "01",
    title: "Create your household",
    description: "Set up your account and household in a couple of minutes.",
  },
  {
    number: "02",
    title: "Connect in Telegram",
    description:
      "Open Kin from onboarding and connect it to your family conversation.",
  },
  {
    number: "03",
    title: "Start asking normally",
    description:
      "Use the same chat style you already use for plans, errands, and reminders.",
  },
];

const familyUseCases = [
  "Weekly groceries and restock reminders",
  "School pickups, rides, and appointment timing",
  "Shared to-dos for everyone at home",
  "Quick answers when someone asks, ‘what’s the plan?’",
];

const introBubbleMotion = {
  hidden: { opacity: 0, y: 18, scale: 0.985, filter: "blur(2px)" },
  shown: {
    opacity: 1,
    y: 0,
    scale: 1,
    filter: "blur(0px)",
    transition: { duration: 0.52, ease: [0.22, 1, 0.36, 1] },
  },
};

export default function Page() {
  const [introStatus, setIntroStatus] = useState<"loading" | "playing" | "done">(
    "loading",
  );
  const [introStep, setIntroStep] = useState(0);

  const finishIntro = useCallback(() => {
    setIntroStep(5);
    setIntroStatus("done");

    if (typeof window !== "undefined") {
      window.localStorage.setItem(introStorageKey, "1");
    }
  }, []);

  useEffect(() => {
    const timers: number[] = [];

    timers.push(
      window.setTimeout(() => {
        const hasSeenIntro = window.localStorage.getItem(introStorageKey) === "1";

        if (hasSeenIntro) {
          setIntroStep(5);
          setIntroStatus("done");
          return;
        }

        setIntroStatus("playing");

        timers.push(
          window.setTimeout(() => setIntroStep(1), 900),
          window.setTimeout(() => setIntroStep(2), 2100),
          window.setTimeout(() => setIntroStep(3), 3600),
          window.setTimeout(() => setIntroStep(4), 5100),
          window.setTimeout(() => setIntroStep(5), 6900),
          window.setTimeout(() => finishIntro(), 7900),
        );
      }, 0),
    );

    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [finishIntro]);

  useEffect(() => {
    if (introStatus === "playing") {
      document.body.style.overflow = "hidden";
      return;
    }

    document.body.style.overflow = "";
  }, [introStatus]);

  const navVisible = introStatus === "done" || introStep >= 5;

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_top,_rgba(255,244,193,0.9),_rgba(255,251,241,0.96)_40%,_rgba(255,247,231,1)_100%)] text-stone-900">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
      >
        <BackgroundPaths className="text-[#bf9b47]/15 [mask-image:radial-gradient(circle_at_top,black_62%,transparent_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_18%,rgba(255,227,146,0.2),transparent_25%),radial-gradient(circle_at_83%_15%,rgba(255,247,216,0.28),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.2),rgba(255,250,240,0.64))]" />
      </div>

      <nav
        className={`fixed left-1/2 top-4 z-40 w-[calc(100%-1.5rem)] max-w-5xl -translate-x-1/2 rounded-full border border-white/70 bg-white/72 px-3 py-2 shadow-[0_18px_60px_rgba(118,84,20,0.14)] backdrop-blur-xl transition-all duration-700 sm:px-4 ${
          navVisible
            ? "translate-y-0 opacity-100"
            : "pointer-events-none -translate-y-5 opacity-0"
        }`}
      >
        <div className="flex items-center justify-between gap-2 sm:gap-4">
          <a href="#top" className="flex items-center gap-3 rounded-full px-2 py-1">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[linear-gradient(135deg,#fff6c9,#f4cf67)] text-xs font-semibold tracking-[0.2em] text-stone-900">
              K
            </div>
            <span className="hidden text-sm font-semibold tracking-tight text-stone-900 sm:inline">
              Kin
            </span>
          </a>

          <div className="hidden items-center gap-6 text-sm text-stone-600 md:flex">
            <a href="#what" className="transition hover:text-stone-900">
              What Kin does
            </a>
            <a href="#setup" className="transition hover:text-stone-900">
              Setup
            </a>
            <a href="#families" className="transition hover:text-stone-900">
              Families
            </a>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/signin?next=/dashboard"
              className="inline-flex items-center justify-center rounded-full border border-stone-300 bg-white/88 px-4 py-2 text-sm font-medium text-stone-800 transition hover:border-stone-400 hover:bg-white"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="inline-flex items-center justify-center rounded-full bg-stone-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-stone-800"
            >
              Start
            </Link>
          </div>
        </div>
      </nav>

      <AnimatePresence>
        {introStatus === "playing" ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.28 } }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(255,241,182,0.86),_rgba(255,248,230,0.95)_48%,_rgba(255,246,224,0.98)_100%)] px-4"
          >
            <button
              type="button"
              onClick={finishIntro}
              className="absolute right-4 top-4 rounded-full border border-white/70 bg-white/75 px-4 py-2 text-sm font-medium text-stone-700 backdrop-blur-lg transition hover:bg-white sm:right-6 sm:top-6"
            >
              Skip intro
            </button>

            <div className="w-full max-w-xl">
              <p className="mb-4 text-center text-xs font-medium uppercase tracking-[0.28em] text-stone-500">
                Kin
              </p>

              <motion.div
                animate={
                  introStep >= 5
                    ? { y: "-28vh", scale: 0.9 }
                    : { y: "0vh", scale: 1 }
                }
                transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
                className="rounded-[2rem] border border-white/70 bg-white/58 p-4 shadow-[0_22px_80px_rgba(109,81,17,0.18)] backdrop-blur-xl will-change-transform sm:p-6"
              >
                <div className="rounded-[1.5rem] border border-white/70 bg-[#fcf7ea]/95 p-4 shadow-inner sm:p-5">
                  <div className="mb-4 flex items-center justify-between border-b border-stone-200/80 pb-3">
                    <p className="text-sm font-semibold text-stone-800">Family chat</p>
                    <p className="text-xs text-stone-500">Now</p>
                  </div>

                  <div className="space-y-3">
                    <AnimatePresence initial={false}>
                      {introStep >= 1 ? (
                        <motion.div
                          key="intro-mom"
                          variants={introBubbleMotion}
                          initial="hidden"
                          animate="shown"
                          exit="hidden"
                        >
                          <p className="mb-1 text-xs font-medium text-stone-500">Mom</p>
                          <div className="max-w-[88%] rounded-3xl rounded-bl-md bg-white px-4 py-3 text-sm leading-6 text-stone-700 shadow-sm">
                            We’re out of eggs and milk. Can someone grab them today?
                          </div>
                        </motion.div>
                      ) : null}

                      {introStep >= 2 ? (
                        <motion.div
                          key="intro-dad"
                          variants={introBubbleMotion}
                          initial="hidden"
                          animate="shown"
                          exit="hidden"
                        >
                          <p className="mb-1 text-xs font-medium text-stone-500">Dad</p>
                          <div className="max-w-[90%] rounded-3xl rounded-bl-md bg-white px-4 py-3 text-sm leading-6 text-stone-700 shadow-sm">
                            Also, Ava has a dentist appointment Thursday at 3:00.
                          </div>
                        </motion.div>
                      ) : null}

                      {introStep >= 3 ? (
                        <motion.div
                          key="intro-kin-reminder"
                          variants={introBubbleMotion}
                          initial="hidden"
                          animate="shown"
                          exit="hidden"
                        >
                          <p className="mb-1 text-xs font-medium text-stone-500">Kin</p>
                          <div className="ml-auto max-w-[92%] rounded-3xl rounded-br-md bg-[#f9df8b] px-4 py-3 text-sm leading-6 text-stone-800 shadow-[0_8px_28px_rgba(164,124,31,0.25)]">
                            Got it. I added a grocery reminder for this afternoon and I’ll remind everyone Wednesday night and Thursday at 1:00 for Ava’s appointment.
                          </div>
                        </motion.div>
                      ) : null}

                      {introStep >= 4 ? (
                        <motion.div
                          key="intro-kin-context"
                          variants={introBubbleMotion}
                          initial="hidden"
                          animate="shown"
                          exit="hidden"
                        >
                          <p className="mb-1 text-xs font-medium text-stone-500">Kin</p>
                          <div className="ml-auto max-w-[90%] rounded-3xl rounded-br-md bg-[#f8e4a4] px-4 py-3 text-sm leading-6 text-stone-800 shadow-[0_8px_28px_rgba(164,124,31,0.2)]">
                            I also checked your shared list: cereal is already covered, so today’s grocery ping stays focused on eggs and milk.
                          </div>
                        </motion.div>
                      ) : null}
                    </AnimatePresence>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div className="relative z-10 mx-auto max-w-6xl px-4 pb-24 pt-24 sm:px-8">
        <section id="top" className="relative min-h-screen py-5">
          <div className="sticky top-[5.5rem] flex min-h-[calc(100vh-7rem)] items-center">
            <div className="w-full rounded-[2.2rem] border border-white/75 bg-white/60 p-6 shadow-[0_24px_90px_rgba(103,76,18,0.12)] backdrop-blur-2xl sm:p-8 lg:p-12">
              <div className="grid gap-10 lg:grid-cols-[1.04fr_0.96fr] lg:items-center">
                <div>
                  <span className="inline-flex rounded-full border border-yellow-200/80 bg-white/80 px-4 py-2 text-xs font-medium uppercase tracking-[0.24em] text-stone-600 shadow-sm">
                    Family assistant in chat
                  </span>
                  <h1 className="mt-6 max-w-xl text-4xl font-semibold tracking-tight text-stone-950 sm:text-5xl lg:text-6xl">
                    Family plans, reminders, and follow-through in one place.
                  </h1>
                  <p className="mt-6 max-w-xl text-lg leading-8 text-stone-600">
                    Kin helps your household stay organized inside the conversation you already use. No complicated system, just clear help.
                  </p>

                  <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                    <Link
                      href="/signup"
                      className="inline-flex items-center justify-center rounded-full bg-stone-900 px-6 py-3.5 text-base font-medium text-white shadow-[0_14px_30px_rgba(41,37,36,0.18)] transition hover:-translate-y-0.5 hover:bg-stone-800"
                    >
                      Set up Kin
                    </Link>
                    <a
                      href="#setup"
                      className="inline-flex items-center justify-center rounded-full border border-stone-300 bg-white/85 px-6 py-3.5 text-base font-medium text-stone-800 transition hover:border-stone-400 hover:bg-white"
                    >
                      See setup
                    </a>
                  </div>
                </div>

                <div className="relative">
                  <div className="absolute inset-x-16 top-2 h-48 rounded-full bg-yellow-200/35 blur-3xl" />
                  <div className="relative rounded-[1.85rem] border border-white/75 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(255,249,230,0.9))] p-4 shadow-[0_22px_70px_rgba(117,87,24,0.18)] sm:p-5">
                    <div className="rounded-[1.4rem] border border-stone-200/80 bg-[#f9f4e7] p-4 shadow-inner">
                      <div className="mb-4 flex items-center justify-between border-b border-stone-200 pb-3">
                        <p className="text-sm font-semibold text-stone-900">Family chat</p>
                        <p className="text-xs text-stone-500">Kin active</p>
                      </div>

                      <div className="space-y-3">
                        <div className="rounded-3xl rounded-bl-md bg-white px-4 py-3 text-sm leading-6 text-stone-700 shadow-sm">
                          Can you remind us about Grandma’s birthday dinner this Saturday?
                        </div>
                        <div className="ml-auto rounded-3xl rounded-br-md bg-[#f9df8b] px-4 py-3 text-sm leading-6 text-stone-800 shadow-[0_10px_24px_rgba(164,124,31,0.25)]">
                          Done. I’ll remind everyone Friday evening and Saturday at noon.
                        </div>
                        <div className="rounded-3xl rounded-bl-md bg-white px-4 py-3 text-sm leading-6 text-stone-700 shadow-sm">
                          Perfect. Also add sparkling water to groceries.
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="what" className="relative min-h-screen py-5">
          <div className="sticky top-[5.5rem] flex min-h-[calc(100vh-7rem)] items-center">
            <div className="w-full rounded-[2.2rem] border border-white/75 bg-white/60 p-6 shadow-[0_24px_90px_rgba(103,76,18,0.12)] backdrop-blur-2xl sm:p-8 lg:p-12">
              <div className="mx-auto max-w-2xl text-center">
                <p className="text-sm font-medium uppercase tracking-[0.24em] text-stone-500">
                  What Kin can do
                </p>
                <h2 className="mt-4 text-3xl font-semibold tracking-tight text-stone-950 sm:text-4xl">
                  Practical help for real household conversations.
                </h2>
              </div>

              <div className="mt-10 grid gap-5 lg:grid-cols-3">
                {valueProps.map((item) => (
                  <article
                    key={item.title}
                    className="rounded-[1.5rem] border border-white/85 bg-white/78 p-6 shadow-[0_14px_40px_rgba(107,79,22,0.08)]"
                  >
                    <div className="mb-5 h-10 w-10 rounded-2xl bg-[linear-gradient(135deg,#fff6c6,#f3cf72)]" />
                    <h3 className="text-xl font-semibold tracking-tight text-stone-900">
                      {item.title}
                    </h3>
                    <p className="mt-3 text-base leading-7 text-stone-600">
                      {item.description}
                    </p>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="setup" className="relative min-h-screen py-5">
          <div className="sticky top-[5.5rem] flex min-h-[calc(100vh-7rem)] items-center">
            <div className="w-full rounded-[2.2rem] border border-white/75 bg-white/60 p-6 shadow-[0_24px_90px_rgba(103,76,18,0.12)] backdrop-blur-2xl sm:p-8 lg:p-12">
              <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr]">
                <div>
                  <p className="text-sm font-medium uppercase tracking-[0.24em] text-stone-500">
                    Setup flow
                  </p>
                  <h2 className="mt-4 text-3xl font-semibold tracking-tight text-stone-950 sm:text-4xl">
                    Fast setup, familiar daily use.
                  </h2>
                  <p className="mt-5 text-base leading-7 text-stone-600">
                    You can get started quickly and keep using your existing family chat habits.
                  </p>
                </div>

                <div className="space-y-4">
                  {setupSteps.map((step) => (
                    <div
                      key={step.number}
                      className="flex gap-4 rounded-[1.4rem] border border-white/85 bg-white/82 p-5 shadow-sm"
                    >
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#ffe793] text-sm font-semibold text-stone-800">
                        {step.number}
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-stone-900">{step.title}</h3>
                        <p className="mt-2 text-sm leading-6 text-stone-600">
                          {step.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="families" className="relative min-h-screen py-5">
          <div className="sticky top-[5.5rem] flex min-h-[calc(100vh-7rem)] items-center">
            <div className="w-full rounded-[2.2rem] border border-white/75 bg-white/60 p-6 shadow-[0_24px_90px_rgba(103,76,18,0.12)] backdrop-blur-2xl sm:p-8 lg:p-12">
              <div className="grid gap-8 lg:grid-cols-[1fr_0.95fr]">
                <div>
                  <p className="text-sm font-medium uppercase tracking-[0.24em] text-stone-500">
                    Built for families
                  </p>
                  <h2 className="mt-4 text-3xl font-semibold tracking-tight text-stone-950 sm:text-4xl">
                    Useful every week, not just once.
                  </h2>
                  <p className="mt-5 text-base leading-7 text-stone-600">
                    Kin is most helpful when family logistics are moving fast and nobody wants to repeat the same details.
                  </p>

                  <ul className="mt-7 space-y-3">
                    {familyUseCases.map((item) => (
                      <li key={item} className="flex items-start gap-3 text-stone-700">
                        <span className="mt-1 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#ffe793] text-sm font-semibold text-stone-800">
                          ✓
                        </span>
                        <span className="text-base leading-7">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-[1.75rem] border border-yellow-100 bg-[linear-gradient(180deg,rgba(255,246,204,0.8),rgba(255,252,240,0.86))] p-6 shadow-[0_16px_44px_rgba(117,87,24,0.12)]">
                  <p className="text-sm font-medium uppercase tracking-[0.24em] text-stone-500">
                    Grounded approach
                  </p>
                  <p className="mt-4 text-base leading-7 text-stone-700">
                    Kin is focused on helping your household coordinate better. It is not a social feed, and it is not trying to replace your family conversation style.
                  </p>
                  <p className="mt-4 text-base leading-7 text-stone-700">
                    The goal is simple: make everyday planning easier, with clear reminders and helpful follow-through.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="start" className="relative min-h-screen py-5">
          <div className="sticky top-[5.5rem] flex min-h-[calc(100vh-7rem)] items-center">
            <div className="w-full overflow-hidden rounded-[2.2rem] border border-stone-900/10 bg-stone-900 px-8 py-12 text-white shadow-[0_24px_90px_rgba(41,37,36,0.24)] sm:px-12">
              <div className="relative">
                <div className="absolute right-0 top-0 h-44 w-44 rounded-full bg-yellow-200/25 blur-3xl" />
                <div className="relative flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
                  <div className="max-w-2xl">
                    <p className="text-sm font-medium uppercase tracking-[0.24em] text-yellow-100/85">
                      Ready when you are
                    </p>
                    <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
                      Bring Kin into your family chat.
                    </h2>
                    <p className="mt-5 text-base leading-7 text-stone-300">
                      Set up your household, connect Kin, and start with your next real plan.
                    </p>
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row">
                    <Link
                      href="/signup"
                      className="inline-flex items-center justify-center rounded-full bg-[#ffe58f] px-6 py-3.5 text-base font-medium text-stone-900 transition hover:bg-[#ffde73]"
                    >
                      Start setup
                    </Link>
                    <Link
                      href="/signin?next=/dashboard"
                      className="inline-flex items-center justify-center rounded-full border border-white/25 px-6 py-3.5 text-base font-medium text-white transition hover:bg-white/10"
                    >
                      Open dashboard
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <footer className="mt-4 flex flex-col gap-4 border-t border-stone-200/80 py-8 text-sm text-stone-500 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[linear-gradient(135deg,#fff6c6,#f3cf72)] text-xs font-semibold tracking-[0.2em] text-stone-900">
              K
            </div>
            <span>Kin</span>
          </div>
          <div className="flex flex-wrap items-center gap-5">
            <a href="#what" className="transition hover:text-stone-700">
              Product
            </a>
            <a href="#setup" className="transition hover:text-stone-700">
              Setup
            </a>
            <Link href="/signin?next=/dashboard" className="transition hover:text-stone-700">
              Log in
            </Link>
          </div>
        </footer>
      </div>
    </main>
  );
}
