"use client";

import {
  AnimatePresence,
  motion,
  type Variants,
} from "framer-motion";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Link from "next/link";
import {
  useCallback,
  type CSSProperties,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

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

const introBubbleMotion: Variants = {
  hidden: { opacity: 0, y: 18, scale: 0.985, filter: "blur(2px)" },
  shown: {
    opacity: 1,
    y: 0,
    scale: 1,
    filter: "blur(0px)",
    transition: { duration: 0.52, ease: [0.22, 1, 0.36, 1] as const },
  },
};

const deckCardShellClassName =
  "flex w-full flex-col rounded-[2.2rem] border border-white/80 bg-[rgba(255,255,255,var(--deck-shell-alpha,0.86))] p-6 [backdrop-filter:blur(var(--deck-shell-blur,24px))] [backface-visibility:hidden] [transform:translateZ(0)] sm:p-8 lg:p-12";

const deckCardShellInitialStyle = {
  "--deck-shell-alpha": 0.86,
  "--deck-shell-blur": "24px",
} as CSSProperties;

const stackStepMin = 288;
const stackStepMax = 608;
const stackStepCss = "clamp(18rem, 68vh, 38rem)";
const stackStartOffset = 44;
const stackSegmentDuration = 1;
const firstStackSegmentDuration = 0.82;
const stackCleanupDelayRatio = 0.45;
const stackCleanupDuration = 0.55;

type DeckItem = {
  id: string;
  content: ReactNode;
};

function LandingCard({
  children,
  forceSolid = false,
}: {
  children: ReactNode;
  forceSolid?: boolean;
}) {
  return (
    <div
      data-deck-shell
      style={{
        ...deckCardShellInitialStyle,
        ...(forceSolid
          ? {
              "--deck-shell-alpha": 1,
              "--deck-shell-blur": "0px",
              backgroundColor: "#ffffff",
            }
          : null),
      }}
      className={deckCardShellClassName}
    >
      {children}
    </div>
  );
}

function StackedDeck({ items }: { items: DeckItem[] }) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const cardRefs = useRef<Array<HTMLDivElement | null>>([]);

  useLayoutEffect(() => {
    const root = rootRef.current;
    const stage = stageRef.current;
    const cards = cardRefs.current.filter(
      (card): card is HTMLDivElement => card !== null,
    );
    const cardShells = cards
      .map((card) => card.querySelector<HTMLElement>("[data-deck-shell]"))
      .filter((shell): shell is HTMLElement => shell !== null);

    if (!root || !stage || cards.length === 0 || cardShells.length !== cards.length) {
      return;
    }

    gsap.registerPlugin(ScrollTrigger);

    const ctx = gsap.context(() => {
      cards.forEach((card, index) => {
        gsap.set(card, {
          yPercent: index === 0 ? 0 : 120,
          autoAlpha: index === 0 ? 1 : 0,
          filter: "blur(0px)",
          force3D: true,
        });

        gsap.set(cardShells[index], {
          "--deck-shell-alpha": index === 0 ? 1 : 0.86,
          "--deck-shell-blur": index === 0 ? "0px" : "24px",
        });
      });

      const timeline = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: root,
          start: `top top+=${stackStartOffset}`,
          end: () =>
            `+=${
              gsap.utils.clamp(stackStepMin, window.innerHeight * 0.68, stackStepMax) *
              Math.max(cards.length - 1, 0)
            }`,
          scrub: 0.3,
          pin: stage,
          pinSpacing: false,
          anticipatePin: 1,
          invalidateOnRefresh: true,
        },
      });

      let segmentStart = 0;

      cards.slice(1).forEach((card, index) => {
        const previousCard = cards[index];
        const previousShell = cardShells[index];
        const currentShell = cardShells[index + 1];
        const segmentDuration =
          index === 0 ? firstStackSegmentDuration : stackSegmentDuration;
        const cleanupStart = segmentStart + segmentDuration * stackCleanupDelayRatio;

        if (index === 0) {
          timeline.to(
            previousCard,
            {
              y: 0,
              yPercent: 0,
              duration: segmentDuration,
              immediateRender: false,
              force3D: true,
            },
            segmentStart,
          );
        }

        timeline.fromTo(
          card,
          { yPercent: 120, autoAlpha: 0 },
          {
            yPercent: 0,
            autoAlpha: 1,
            duration: segmentDuration,
            immediateRender: false,
            force3D: true,
          },
          segmentStart,
        );

        timeline.fromTo(
          currentShell,
          {
            "--deck-shell-alpha": 0.86,
            "--deck-shell-blur": "24px",
          },
          {
            "--deck-shell-alpha": 1,
            "--deck-shell-blur": "0px",
            duration: segmentDuration,
            immediateRender: false,
          },
          segmentStart,
        );

        timeline.to(
          previousCard,
          {
            filter: "blur(1.5px)",
            duration: stackCleanupDuration,
            immediateRender: false,
          },
          cleanupStart,
        );

        timeline.to(
          previousShell,
          {
            "--deck-shell-alpha": 0.86,
            "--deck-shell-blur": "24px",
            duration: stackCleanupDuration,
            immediateRender: false,
          },
          cleanupStart,
        );

        segmentStart += segmentDuration;
      });
    }, root);

    ScrollTrigger.refresh();

    return () => ctx.revert();
  }, [items.length]);

  return (
    <>
      <div className="space-y-4 md:hidden">
        {items.map((item) => (
          <section key={item.id} id={item.id}>
            {item.content}
          </section>
        ))}
      </div>

      <div
        ref={rootRef}
        className="relative hidden md:block"
        style={{
          height: `calc((100svh - 7rem) + ${Math.max(
            items.length - 1,
            0,
          )} * ${stackStepCss})`,
        }}
      >
        <div
          ref={stageRef}
          className="relative z-10 h-[calc(100svh-7rem)] min-h-[38rem] overflow-hidden"
        >
          <div className="relative h-full w-full px-3 py-8 sm:px-5 sm:py-10 lg:px-7 lg:py-12">
            {items.map((item, index) => (
              <section
                key={item.id}
                className="pointer-events-none absolute inset-0"
                style={{ zIndex: index + 1 }}
              >
                <div
                  ref={(node) => {
                    cardRefs.current[index] = node;
                  }}
                  className="flex h-full w-full items-center justify-center will-change-transform [backface-visibility:hidden]"
                >
                  <div className="pointer-events-auto w-full">{item.content}</div>
                </div>
              </section>
            ))}
          </div>
        </div>

        {items.map((item, index) => (
          <div
            key={`${item.id}-anchor`}
            id={item.id}
            aria-hidden="true"
            className="pointer-events-none absolute left-0 right-0 h-px"
            style={{
              scrollMarginTop: `${stackStartOffset}px`,
              top: index === 0 ? "0px" : `calc(${index} * ${stackStepCss})`,
            }}
          />
        ))}
      </div>
    </>
  );
}

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
  const stackItems: DeckItem[] = [
    {
      id: "top",
      content: (
        <LandingCard forceSolid>
          <div className="grid flex-1 gap-8 lg:grid-cols-[1.04fr_0.96fr] lg:items-center">
            <div className="flex flex-col justify-center">
              <span className="inline-flex w-fit rounded-full border border-yellow-200 bg-white px-3 py-2 text-[11px] font-medium uppercase tracking-[0.24em] text-stone-600 sm:px-4 sm:text-xs">
                Family assistant in chat
              </span>
              <h1 className="mt-5 max-w-xl text-3xl font-semibold tracking-tight text-stone-950 sm:mt-6 sm:text-5xl lg:text-6xl">
                Your family assistant, right in the chat.
              </h1>
              <p className="mt-5 max-w-xl text-base leading-7 text-stone-600 sm:mt-6 sm:text-lg sm:leading-8">
                Kin helps your household stay organized inside the conversation you already use. No complicated system, just clear help.
              </p>

              <div className="mt-7 flex flex-col gap-3 sm:mt-8 sm:flex-row">
                <Link
                  href="/signup"
                  className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-stone-900 px-6 py-3.5 text-base font-medium text-white shadow-[0_14px_30px_rgba(41,37,36,0.18)] transition hover:-translate-y-0.5 hover:bg-stone-800 sm:w-auto"
                >
                  Set up Kin
                </Link>
                <a
                  href="#setup"
                  className="inline-flex min-h-12 w-full items-center justify-center rounded-full border border-stone-300 bg-white px-6 py-3.5 text-base font-medium text-stone-800 transition hover:border-stone-400 sm:w-auto"
                >
                  See setup
                </a>
              </div>
            </div>

            <div className="flex items-center">
              <div className="w-full rounded-[1.65rem] border border-stone-200 bg-white p-3 shadow-[0_18px_50px_rgba(41,37,36,0.08)] sm:rounded-[1.85rem] sm:p-5">
                <div className="rounded-[1.2rem] border border-stone-200 bg-white p-3 shadow-inner sm:rounded-[1.4rem] sm:p-4">
                  <div className="mb-4 flex items-center justify-between border-b border-stone-200 pb-3">
                    <p className="text-sm font-semibold text-stone-900">Family chat</p>
                    <p className="text-xs text-stone-500">Kin active</p>
                  </div>

                  <div className="space-y-3">
                    <div className="rounded-3xl rounded-bl-md bg-white px-4 py-3 text-sm leading-6 text-stone-700 shadow-sm">
                      Can you remind us about Grandma&apos;s birthday dinner this Saturday?
                    </div>
                    <div className="ml-auto rounded-3xl rounded-br-md bg-[#f9df8b] px-4 py-3 text-sm leading-6 text-stone-800 shadow-[0_10px_24px_rgba(164,124,31,0.25)]">
                      Done. I&apos;ll remind everyone Friday evening and Saturday at noon.
                    </div>
                    <div className="rounded-3xl rounded-bl-md bg-white px-4 py-3 text-sm leading-6 text-stone-700 shadow-sm">
                      Perfect. Also add sparkling water to groceries.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </LandingCard>
      ),
    },
    {
      id: "what",
      content: (
        <LandingCard>
          <div className="flex flex-1 flex-col justify-center">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-sm font-medium uppercase tracking-[0.24em] text-stone-500">
                What Kin can do
              </p>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight text-stone-950 sm:text-4xl">
                Practical help for real household conversations.
              </h2>
            </div>

            <div className="mt-8 grid gap-4 sm:mt-10 sm:gap-5 lg:grid-cols-3">
              {valueProps.map((item) => (
                <article
                  key={item.title}
                  className="rounded-[1.5rem] border border-[#ede3cf] bg-white p-6 shadow-[0_14px_40px_rgba(107,79,22,0.08)]"
                >
                  <div className="mb-5 h-10 w-10 rounded-2xl bg-[linear-gradient(135deg,#fff6c6,#f3cf72)]" />
                  <h3 className="text-xl font-semibold tracking-tight text-stone-900">
                    {item.title}
                  </h3>
                  <p className="mt-3 text-base leading-7 text-stone-600">{item.description}</p>
                </article>
              ))}
            </div>
          </div>
        </LandingCard>
      ),
    },
    {
      id: "setup",
      content: (
        <LandingCard>
          <div className="grid flex-1 gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.24em] text-stone-500">
                Setup flow
              </p>
              <h2 className="mt-4 text-2xl font-semibold tracking-tight text-stone-950 sm:text-4xl">
                Fast setup, familiar daily use.
              </h2>
              <p className="mt-5 max-w-xl text-base leading-7 text-stone-600">
                You can get started quickly and keep using your existing family chat habits.
              </p>
            </div>

            <div className="space-y-4">
              {setupSteps.map((step) => (
                <div
                  key={step.number}
                  className="flex gap-3 rounded-[1.4rem] border border-[#ede3cf] bg-white p-4 shadow-sm sm:gap-4 sm:p-5"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#ffe793] text-sm font-semibold text-stone-800 sm:h-11 sm:w-11">
                    {step.number}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-stone-900">{step.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-stone-600">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </LandingCard>
      ),
    },
    {
      id: "families",
      content: (
        <LandingCard>
          <div className="grid flex-1 gap-8 lg:grid-cols-[1fr_0.95fr] lg:items-center">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.24em] text-stone-500">
                Built for families
              </p>
              <h2 className="mt-4 text-2xl font-semibold tracking-tight text-stone-950 sm:text-4xl">
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

            <div className="rounded-[1.75rem] border border-[#ead9ab] bg-[linear-gradient(180deg,rgba(255,246,204,0.82),rgba(255,252,240,0.94))] p-5 shadow-[0_16px_44px_rgba(117,87,24,0.12)] sm:p-6">
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
        </LandingCard>
      ),
    },
    {
      id: "start",
      content: (
        <LandingCard>
          <div className="flex flex-1 items-center">
            <div className="w-full rounded-[1.9rem] border border-stone-900/10 bg-stone-900 px-5 py-8 text-white shadow-[0_24px_90px_rgba(41,37,36,0.24)] sm:px-8 sm:py-12 lg:px-12">
              <div className="flex h-full flex-col gap-10">
                <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
                  <div className="max-w-2xl">
                    <p className="text-sm font-medium uppercase tracking-[0.24em] text-yellow-100/85">
                      Ready when you are
                    </p>
                    <h2 className="mt-4 text-2xl font-semibold tracking-tight sm:text-4xl">
                      Bring Kin into your family chat.
                    </h2>
                    <p className="mt-5 text-base leading-7 text-stone-300">
                      Set up your household, connect Kin, and start with your next real plan.
                    </p>
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row">
                    <Link
                      href="/signup"
                      className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-[#ffe58f] px-6 py-3.5 text-base font-medium text-stone-900 transition hover:bg-[#ffde73] sm:w-auto"
                    >
                      Start setup
                    </Link>
                    <Link
                      href="/signin?next=/dashboard"
                      className="inline-flex min-h-12 w-full items-center justify-center rounded-full border border-white/25 px-6 py-3.5 text-base font-medium text-white transition hover:bg-white/10 sm:w-auto"
                    >
                      Open dashboard
                    </Link>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </LandingCard>
      ),
    },
  ];

  return (
    <main className="relative min-h-[100svh] overflow-x-hidden bg-[radial-gradient(circle_at_top,_rgba(255,244,193,0.9),_rgba(255,251,241,0.96)_40%,_rgba(255,247,231,1)_100%)] text-stone-900">

      <nav
        className={`fixed left-1/2 top-3 z-40 w-[calc(100%-1rem)] max-w-5xl -translate-x-1/2 rounded-full border border-white/70 bg-white/72 px-2.5 py-2 shadow-[0_18px_60px_rgba(118,84,20,0.14)] backdrop-blur-xl transition-all duration-700 sm:top-4 sm:w-[calc(100%-1.5rem)] sm:px-4 ${
          navVisible
            ? "translate-y-0 opacity-100"
            : "pointer-events-none -translate-y-5 opacity-0"
        }`}
      >
        <div className="flex items-center justify-between gap-2 sm:gap-4">
          <a href="#top" className="flex shrink-0 items-center gap-2 rounded-full px-2 py-1 sm:gap-3">
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

          <div className="flex items-center gap-1.5 sm:gap-3">
            <Link
              href="/signin?next=/dashboard"
              className="inline-flex min-h-10 items-center justify-center rounded-full border border-stone-300 bg-white/88 px-3 py-2 text-sm font-medium text-stone-800 transition hover:border-stone-400 hover:bg-white sm:px-4"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="inline-flex min-h-10 items-center justify-center rounded-full bg-stone-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-stone-800 sm:px-4"
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
            className="fixed inset-0 z-50 flex items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(255,241,182,0.86),_rgba(255,248,230,0.95)_48%,_rgba(255,246,224,0.98)_100%)] px-4 py-6"
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
                className="rounded-[1.75rem] border border-white/70 bg-white/58 p-3 shadow-[0_22px_80px_rgba(109,81,17,0.18)] backdrop-blur-xl will-change-transform sm:rounded-[2rem] sm:p-6"
              >
                <div className="rounded-[1.4rem] border border-white/70 bg-[#fcf7ea]/95 p-3 shadow-inner sm:rounded-[1.5rem] sm:p-5">
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

      <div
        className="relative z-10 mx-auto max-w-6xl px-3 pb-6 sm:px-8 sm:pb-8"
        style={{ paddingTop: `${stackStartOffset}px` }}
      >
        <div className="relative">
          <StackedDeck items={stackItems} />
        </div>
      </div>
    </main>
  );
}
