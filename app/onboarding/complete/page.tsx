"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

function BindingIdValue() {
  const searchParams = useSearchParams();
  const bindingId = searchParams.get("bindingId");

  return (
    <p className="mt-2 break-all text-sm leading-6 text-stone-700">
      {bindingId ?? "Unavailable"}
    </p>
  );
}

export default function TelegramCompletePage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(255,246,196,0.9),_rgba(255,251,240,1)_45%,_rgba(255,248,235,1)_100%)] px-6 py-12 text-stone-900">
      <div className="mx-auto max-w-2xl">
        <div className="rounded-[2rem] border border-white/80 bg-white/80 p-8 shadow-[0_24px_90px_rgba(103,76,18,0.08)] backdrop-blur-sm">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.22em] text-stone-500">
              Setup complete
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-stone-950">
              Kin is connected to Telegram
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-stone-600">
              Your Telegram account and family group are linked. Head into the dashboard to confirm Kin is healthy and start with your first reminder.
            </p>
          </div>

          <div className="mt-8 rounded-3xl border border-stone-200 bg-stone-50 p-6">
            <p className="text-sm leading-6 text-stone-600">
              Your setup is complete. If you need to reference this connection later, the binding id is shown below.
            </p>

            <div className="mt-5 rounded-2xl border border-stone-200 bg-white px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500">
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

            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center rounded-full bg-stone-900 px-6 py-3.5 text-sm font-medium text-white transition hover:bg-stone-800"
              >
                Open dashboard
              </Link>
              <Link
                href="/settings"
                className="inline-flex items-center justify-center rounded-full border border-stone-300 px-6 py-3.5 text-sm font-medium text-stone-700 transition hover:border-stone-500 hover:text-stone-900"
              >
                View settings
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
