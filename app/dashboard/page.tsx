"use client";

import { useState } from "react";
import { DashboardShell } from "@/app/components/dashboard-shell";
import { DashboardState } from "@/app/components/dashboard-state";

const SUGGESTED_MESSAGE = "Kin, remind us to take out the garbage Thursday at 8 PM.";

function getGreeting() {
  const hour = new Date().getHours();

  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function statusStyles(tone: "connected" | "waiting" | "reconnect") {
  switch (tone) {
    case "connected":
      return {
        badge: "bg-emerald-100 text-emerald-800",
        card: "border-emerald-200 bg-[linear-gradient(180deg,rgba(237,250,241,0.95),rgba(255,255,255,0.98))]",
      };
    case "reconnect":
      return {
        badge: "bg-amber-100 text-amber-800",
        card: "border-amber-200 bg-[linear-gradient(180deg,rgba(255,247,237,0.96),rgba(255,255,255,0.98))]",
      };
    default:
      return {
        badge: "bg-stone-200 text-stone-700",
        card: "border-stone-200 bg-[linear-gradient(180deg,rgba(248,246,241,0.98),rgba(255,255,255,0.98))]",
      };
  }
}

async function copyText(value: string) {
  await navigator.clipboard.writeText(value);
}

export default function DashboardPage() {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");

  return (
    <DashboardShell
      title="Home"
      subtitle="A calm place to check whether Kin is connected, understand what it can help with, and get your household started in Telegram."
    >
      <DashboardState>
        {(state) => {
          const greeting = getGreeting();
          const statusUi = statusStyles(state.connection.tone);
          const binding = state.telegram.binding;
          const connectionHealthy = state.connection.isHealthy;

          return (
            <div className="space-y-8">
              <section className="overflow-hidden rounded-[2rem] border border-[#f2e7c5] bg-[linear-gradient(135deg,rgba(255,251,239,0.95),rgba(254,234,172,0.62))] px-6 py-7 shadow-[0_22px_70px_rgba(104,91,42,0.08)] md:px-8 md:py-9">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-500">
                  {greeting}
                </p>
                <h3 className="mt-3 max-w-3xl text-3xl font-semibold tracking-tight text-stone-950 md:text-5xl">
                  {greeting}, <span className="text-[#685b2a]">{state.household.name}</span>.
                </h3>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-stone-700 md:text-base">
                  {connectionHealthy
                    ? "Kin is connected and ready in your family Telegram group."
                    : "Kin is set up for your household, but Telegram still needs attention before the happy path is complete."}
                </p>
              </section>

              <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
                <section className={`rounded-[1.75rem] border p-6 shadow-[0_18px_60px_rgba(104,91,42,0.07)] ${statusUi.card}`}>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusUi.badge}`}>
                      {state.connection.badge}
                    </span>
                    <span className="rounded-full bg-white/80 px-3 py-1 text-xs font-medium text-stone-600">
                      {state.telegram.channel}
                    </span>
                  </div>
                  <h4 className="mt-4 text-2xl font-semibold tracking-tight text-stone-950">
                    {state.connection.title}
                  </h4>
                  <p className="mt-3 max-w-2xl text-sm leading-7 text-stone-600">
                    {state.connection.description}
                  </p>

                  <dl className="mt-6 grid gap-4 sm:grid-cols-2">
                    <div className="rounded-[1.5rem] border border-white/80 bg-white/80 p-4">
                      <dt className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">
                        Telegram group
                      </dt>
                      <dd className="mt-2 text-base font-semibold text-stone-900">
                        {binding?.groupName ?? "Not connected yet"}
                      </dd>
                    </div>
                    <div className="rounded-[1.5rem] border border-white/80 bg-white/80 p-4">
                      <dt className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">
                        Binding status
                      </dt>
                      <dd className="mt-2 text-base font-semibold text-stone-900">
                        {binding?.status ?? "Pending"}
                      </dd>
                    </div>
                  </dl>

                  {!connectionHealthy ? (
                    <div className="mt-6 flex flex-wrap gap-3">
                      <a
                        href={state.telegram.reconnectUrl}
                        className="inline-flex items-center justify-center rounded-full bg-stone-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-stone-800"
                      >
                        Reconnect Telegram
                      </a>
                      {state.telegram.deepLink ? (
                        <a
                          href={state.telegram.deepLink}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center justify-center rounded-full border border-stone-300 bg-white/70 px-5 py-3 text-sm font-medium text-stone-700 transition hover:border-stone-500 hover:text-stone-900"
                        >
                          Open Telegram
                        </a>
                      ) : null}
                    </div>
                  ) : null}
                </section>

                <section className={`rounded-[1.75rem] border border-stone-200 bg-white p-6 shadow-[0_18px_60px_rgba(104,91,42,0.07)] ${!connectionHealthy ? "opacity-75" : ""}`}>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">
                    First reminder
                  </p>
                  <h4 className="mt-3 text-2xl font-semibold tracking-tight text-stone-950">
                    Create your first reminder in Telegram
                  </h4>
                  <p className="mt-3 text-sm leading-7 text-stone-600">
                    Kin handles reminders in your family Telegram chat. Send this message to try the first real household loop.
                  </p>

                  <div className="mt-5 rounded-[1.5rem] border border-stone-200 bg-[#faf7ef] p-4 text-sm leading-7 text-stone-800">
                    {SUGGESTED_MESSAGE}
                  </div>

                  <div className="mt-5 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await copyText(SUGGESTED_MESSAGE);
                          setCopyState("copied");
                        } catch {
                          setCopyState("error");
                        }
                      }}
                      className="inline-flex items-center justify-center rounded-full border border-stone-300 px-5 py-3 text-sm font-medium text-stone-700 transition hover:border-stone-500 hover:text-stone-900"
                    >
                      {copyState === "copied"
                        ? "Message copied"
                        : copyState === "error"
                          ? "Copy unavailable"
                          : "Copy message"}
                    </button>
                    {state.telegram.deepLink ? (
                      <a
                        href={state.telegram.deepLink}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center justify-center rounded-full bg-stone-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-stone-800"
                      >
                        Open Telegram
                      </a>
                    ) : (
                      <a
                        href={state.telegram.reconnectUrl}
                        className="inline-flex items-center justify-center rounded-full bg-stone-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-stone-800"
                      >
                        Reconnect Telegram
                      </a>
                    )}
                  </div>
                </section>
              </div>

              <div className="grid gap-6 xl:grid-cols-[1fr_0.95fr]">
                <section className="rounded-[1.75rem] border border-stone-200 bg-white p-6 shadow-[0_18px_60px_rgba(104,91,42,0.07)]">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">
                    What Kin can do
                  </p>
                  <h4 className="mt-3 text-2xl font-semibold tracking-tight text-stone-950">
                    Everyday help for household coordination
                  </h4>
                  <div className="mt-6 grid gap-4 md:grid-cols-2">
                    {[
                      "Remind us to take out the garbage Thursday night",
                      "What do we need from Costco this week?",
                      "Summarize the plan for Saturday",
                      "Keep track of groceries we mention here",
                    ].map((example) => (
                      <div
                        key={example}
                        className="rounded-[1.5rem] border border-stone-200 bg-[#faf8f2] p-4 text-sm leading-7 text-stone-700"
                      >
                        {example}
                      </div>
                    ))}
                  </div>
                </section>

                <section className="rounded-[1.75rem] border border-stone-200 bg-white p-6 shadow-[0_18px_60px_rgba(104,91,42,0.07)]">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">
                    Connection details
                  </p>
                  <h4 className="mt-3 text-2xl font-semibold tracking-tight text-stone-950">
                    Household overview
                  </h4>
                  <dl className="mt-6 space-y-4 text-sm leading-7 text-stone-700">
                    <div className="rounded-[1.5rem] border border-stone-200 bg-[#faf8f2] p-4">
                      <dt className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">Household</dt>
                      <dd className="mt-2 text-base font-semibold text-stone-900">{state.household.name}</dd>
                    </div>
                    <div className="rounded-[1.5rem] border border-stone-200 bg-[#faf8f2] p-4">
                      <dt className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">Owner</dt>
                      <dd className="mt-2 text-base font-semibold text-stone-900">{state.owner.name || state.owner.email}</dd>
                      <p className="mt-1 text-sm text-stone-600">{state.owner.email}</p>
                    </div>
                    <div className="rounded-[1.5rem] border border-stone-200 bg-[#faf8f2] p-4">
                      <dt className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">Assistant</dt>
                      <dd className="mt-2 text-base font-semibold text-stone-900">{state.assistant?.name ?? "Kin"}</dd>
                      <p className="mt-1 text-sm text-stone-600">{state.assistant?.status ?? "Unavailable"}</p>
                    </div>
                    <div className="rounded-[1.5rem] border border-stone-200 bg-[#faf8f2] p-4">
                      <dt className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">Telegram group</dt>
                      <dd className="mt-2 text-base font-semibold text-stone-900">{binding?.groupName ?? "Not connected yet"}</dd>
                      <p className="mt-1 text-sm text-stone-600">{binding?.status ?? "Pending"}</p>
                    </div>
                  </dl>
                </section>
              </div>
            </div>
          );
        }}
      </DashboardState>
    </DashboardShell>
  );
}
