"use client";

import { DashboardShell } from "@/app/components/dashboard-shell";
import { DashboardState } from "@/app/components/dashboard-state";

export default function SettingsPage() {
  return (
    <DashboardShell
      title="Settings"
      subtitle="Simple household details and Telegram connection information for the owner account."
    >
      <DashboardState>
        {(state) => {
          const binding = state.telegram.binding;

          return (
            <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
              <section className="rounded-[1.75rem] border border-stone-200 bg-white p-6 shadow-[0_18px_60px_rgba(104,91,42,0.07)]">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">
                  Telegram connection
                </p>
                <h3 className="mt-3 text-2xl font-semibold tracking-tight text-stone-950">
                  Messaging setup
                </h3>
                <dl className="mt-6 space-y-4 text-sm leading-7 text-stone-700">
                  <div className="rounded-[1.5rem] border border-stone-200 bg-[#faf8f2] p-4">
                    <dt className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">Status</dt>
                    <dd className="mt-2 text-base font-semibold text-stone-900">{state.connection.badge}</dd>
                    <p className="mt-1 text-sm text-stone-600">{state.connection.description}</p>
                  </div>
                  <div className="rounded-[1.5rem] border border-stone-200 bg-[#faf8f2] p-4">
                    <dt className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">Telegram group</dt>
                    <dd className="mt-2 text-base font-semibold text-stone-900">{binding?.groupName ?? "Not connected yet"}</dd>
                    <p className="mt-1 text-sm text-stone-600">{binding?.status ?? "Pending"}</p>
                  </div>
                  <div className="rounded-[1.5rem] border border-stone-200 bg-[#faf8f2] p-4">
                    <dt className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">Bot link</dt>
                    <dd className="mt-2 break-all text-sm text-stone-700">{state.telegram.deepLink ?? "Not available yet"}</dd>
                  </div>
                </dl>

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
                      className="inline-flex items-center justify-center rounded-full border border-stone-300 px-5 py-3 text-sm font-medium text-stone-700 transition hover:border-stone-500 hover:text-stone-900"
                    >
                      Open Telegram
                    </a>
                  ) : null}
                </div>
              </section>

              <section className="rounded-[1.75rem] border border-stone-200 bg-white p-6 shadow-[0_18px_60px_rgba(104,91,42,0.07)]">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">
                  Household details
                </p>
                <h3 className="mt-3 text-2xl font-semibold tracking-tight text-stone-950">
                  Owner and household
                </h3>
                <dl className="mt-6 space-y-4 text-sm leading-7 text-stone-700">
                  <div className="rounded-[1.5rem] border border-stone-200 bg-[#faf8f2] p-4">
                    <dt className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">Household</dt>
                    <dd className="mt-2 text-base font-semibold text-stone-900">{state.household.name}</dd>
                  </div>
                  <div className="rounded-[1.5rem] border border-stone-200 bg-[#faf8f2] p-4">
                    <dt className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">Owner</dt>
                    <dd className="mt-2 text-base font-semibold text-stone-900">{state.owner.name || "Owner account"}</dd>
                    <p className="mt-1 text-sm text-stone-600">{state.owner.email}</p>
                  </div>
                  <div className="rounded-[1.5rem] border border-stone-200 bg-[#faf8f2] p-4">
                    <dt className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">Role</dt>
                    <dd className="mt-2 text-base font-semibold text-stone-900">{state.owner.role}</dd>
                  </div>
                  <div className="rounded-[1.5rem] border border-stone-200 bg-[#faf8f2] p-4">
                    <dt className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">Assistant</dt>
                    <dd className="mt-2 text-base font-semibold text-stone-900">{state.assistant?.name ?? "Kin"}</dd>
                    <p className="mt-1 text-sm text-stone-600">{state.assistant?.status ?? "Unavailable"}</p>
                  </div>
                </dl>
              </section>
            </div>
          );
        }}
      </DashboardState>
    </DashboardShell>
  );
}
