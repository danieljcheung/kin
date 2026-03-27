"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

function buildTelegramHref(deepLink: string | null, inviteToken: string | null) {
  if (deepLink) return deepLink;

  if (inviteToken) {
    return `https://t.me/share/url?url=${encodeURIComponent(inviteToken)}`;
  }

  return null;
}

export default function ConnectTelegramPage() {
  const searchParams = useSearchParams();

  const bindingId = searchParams.get("bindingId");
  const inviteToken = searchParams.get("inviteToken");
  const deepLink = searchParams.get("deepLink");

  const telegramHref = buildTelegramHref(deepLink, inviteToken);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(255,246,196,0.9),_rgba(255,251,240,1)_45%,_rgba(255,248,235,1)_100%)] px-6 py-12 text-stone-900">
      <div className="mx-auto max-w-2xl">
        <div className="rounded-[2rem] border border-white/80 bg-white/80 p-8 shadow-[0_24px_90px_rgba(103,76,18,0.08)] backdrop-blur-sm">
          <div className="mb-8">
            <p className="text-sm font-medium uppercase tracking-[0.22em] text-stone-500">
              Step 4
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-stone-950">
              Connect Kin to Telegram
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-stone-600">
              Open Kin in Telegram, then add it to your family group. Once that’s done,
              we’ll finish setup automatically.
            </p>
          </div>

          <div className="grid gap-8 lg:grid-cols-[1fr_280px]">
            <div className="space-y-5">
              <div className="rounded-3xl border border-stone-200 bg-stone-50 p-5">
                <h2 className="text-base font-semibold text-stone-900">
                  What happens next
                </h2>
                <ol className="mt-4 space-y-3 text-sm leading-6 text-stone-600">
                  <li>
                    <span className="font-medium text-stone-800">1.</span> Open Kin in Telegram.
                  </li>
                  <li>
                    <span className="font-medium text-stone-800">2.</span> Follow the prompt in the bot chat.
                  </li>
                  <li>
                    <span className="font-medium text-stone-800">3.</span> Add Kin to your family Telegram group.
                  </li>
                  <li>
                    <span className="font-medium text-stone-800">4.</span> Return here while we verify the connection.
                  </li>
                </ol>
              </div>

              <div className="rounded-3xl border border-stone-200 bg-stone-50 p-5">
                <h2 className="text-base font-semibold text-stone-900">
                  Connection details
                </h2>

                <dl className="mt-4 space-y-3 text-sm text-stone-600">
                  <div>
                    <dt className="font-medium text-stone-800">Binding ID</dt>
                    <dd className="mt-1 break-all">{bindingId ?? "Not available yet"}</dd>
                  </div>

                  <div>
                    <dt className="font-medium text-stone-800">Invite token</dt>
                    <dd className="mt-1 break-all">{inviteToken ?? "Not available yet"}</dd>
                  </div>

                  <div>
                    <dt className="font-medium text-stone-800">Telegram deep link</dt>
                    <dd className="mt-1 break-all">{deepLink ?? "Bot username/deep link not configured yet"}</dd>
                  </div>
                </dl>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                {telegramHref ? (
                  <a
                    href={telegramHref}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center rounded-full bg-stone-900 px-6 py-3.5 text-sm font-medium text-white transition hover:bg-stone-800"
                  >
                    Open in Telegram
                  </a>
                ) : (
                  <button
                    type="button"
                    disabled
                    className="inline-flex items-center justify-center rounded-full bg-stone-300 px-6 py-3.5 text-sm font-medium text-white"
                  >
                    Telegram link unavailable
                  </button>
                )}

                <Link
                  href="/onboarding/waiting"
                  className="inline-flex items-center justify-center rounded-full border border-stone-300 px-6 py-3.5 text-sm font-medium text-stone-700 transition hover:border-stone-500 hover:text-stone-900"
                >
                  I added Kin already
                </Link>
              </div>
            </div>

            <div className="rounded-3xl border border-stone-200 bg-stone-50 p-5">
              <h2 className="text-base font-semibold text-stone-900">QR code</h2>
              <p className="mt-2 text-sm leading-6 text-stone-600">
                Scan this on your phone to continue setup in Telegram.
              </p>

              <div className="mt-5 flex aspect-square items-center justify-center rounded-3xl border border-dashed border-stone-300 bg-white text-center text-sm text-stone-400">
                QR placeholder
              </div>

              <p className="mt-4 text-xs leading-5 text-stone-500">
                For now this can stay as a placeholder until we wire in actual QR generation from the Telegram deep link.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}