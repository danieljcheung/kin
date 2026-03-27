"use client";

import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";

async function copyText(value: string) {
  if (
    typeof navigator !== "undefined" &&
    navigator.clipboard &&
    typeof navigator.clipboard.writeText === "function"
  ) {
    await navigator.clipboard.writeText(value);
    return;
  }

  throw new Error("Clipboard unavailable");
}

function getQrCodeUrl(value: string) {
  const params = new URLSearchParams({
    size: "280x280",
    data: value,
    margin: "0",
  });

  return `https://api.qrserver.com/v1/create-qr-code/?${params.toString()}`;
}

export default function ConnectTelegramPage() {
  const searchParams = useSearchParams();
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");

  const bindingId = searchParams.get("bindingId");
  const onboardingToken = searchParams.get("onboardingToken");
  const deepLink = searchParams.get("deepLink");
  const qrCodeUrl = deepLink ? getQrCodeUrl(deepLink) : null;

  async function handleCopyLink() {
    if (!deepLink) return;

    try {
      await copyText(deepLink);
      setCopyState("copied");
    } catch {
      setCopyState("error");
    }
  }

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
              Open Kin in Telegram, follow the bot prompts, and add Kin to your family
              group. Once that&apos;s done, we&apos;ll finish setup automatically.
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
                  Telegram link
                </h2>
                <p className="mt-2 text-sm leading-6 text-stone-600">
                  Open this link on your phone to jump straight into Telegram. If
                  you&apos;re on desktop, copy the link and send it to your mobile device.
                </p>

                <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                  {deepLink ? (
                    <a
                      href={deepLink}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center rounded-full bg-stone-900 px-6 py-3.5 text-sm font-medium text-white transition hover:bg-stone-800"
                    >
                      Open Telegram link
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

                  <button
                    type="button"
                    onClick={handleCopyLink}
                    disabled={!deepLink}
                    className="inline-flex items-center justify-center rounded-full border border-stone-300 px-6 py-3.5 text-sm font-medium text-stone-700 transition hover:border-stone-500 hover:text-stone-900 disabled:cursor-not-allowed disabled:border-stone-200 disabled:text-stone-400"
                  >
                    {copyState === "copied"
                      ? "Link copied"
                      : copyState === "error"
                        ? "Copy unavailable"
                        : "Copy link"}
                  </button>
                </div>

                <div className="mt-4 rounded-2xl border border-stone-200 bg-white px-4 py-3">
                  <p className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500">
                    Telegram deep link
                  </p>
                  <p className="mt-2 break-all text-sm leading-6 text-stone-700">
                    {deepLink ?? "Bot username/deep link not configured yet"}
                  </p>
                </div>
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
                    <dt className="font-medium text-stone-800">Onboarding token</dt>
                    <dd className="mt-1 break-all">
                      {onboardingToken ?? "Not available yet"}
                    </dd>
                  </div>
                </dl>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Link
                  href={{
                    pathname: "/onboarding/waiting",
                    query: {
                      ...(bindingId ? { bindingId } : {}),
                      ...(onboardingToken ? { onboardingToken } : {}),
                    },
                  }}
                  className="inline-flex items-center justify-center rounded-full border border-stone-300 px-6 py-3.5 text-sm font-medium text-stone-700 transition hover:border-stone-500 hover:text-stone-900"
                >
                  I added Kin already
                </Link>
              </div>
            </div>

            <div className="rounded-3xl border border-stone-200 bg-stone-50 p-5">
              <h2 className="text-base font-semibold text-stone-900">
                Open on your phone
              </h2>
              <p className="mt-2 text-sm leading-6 text-stone-600">
                Telegram setup works best on mobile. Use the button above if
                you&apos;re already on your phone, or scan the QR code to open the
                same Telegram deep link on your device.
              </p>

              <div className="mt-5 rounded-3xl border border-stone-200 bg-white p-5 shadow-[0_16px_40px_rgba(103,76,18,0.06)]">
                <div className="rounded-[1.75rem] border border-stone-200 bg-[linear-gradient(180deg,rgba(255,248,235,0.9),rgba(255,255,255,1))] p-5">
                  {qrCodeUrl ? (
                    <>
                      <p className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500">
                        Scan to open Telegram
                      </p>
                      <div className="mt-4 overflow-hidden rounded-[1.5rem] border border-stone-200 bg-white p-4">
                        <Image
                          src={qrCodeUrl}
                          alt="QR code for the Telegram deep link"
                          width={280}
                          height={280}
                          sizes="280px"
                          unoptimized
                          className="h-auto w-full rounded-2xl"
                        />
                      </div>
                      <p className="mt-4 text-sm leading-6 text-stone-600">
                        Scan this code with your phone camera to open the same Telegram
                        deep link as the button above.
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500">
                        QR code unavailable
                      </p>
                      <div className="mt-4 rounded-[1.5rem] border border-dashed border-stone-300 bg-white/80 px-4 py-8 text-center">
                        <p className="text-sm font-medium text-stone-700">
                          We&apos;ll show a QR code here once the Telegram deep link is ready.
                        </p>
                        <p className="mt-2 text-sm leading-6 text-stone-600">
                          Use the direct link button when it becomes available, or come
                          back after restarting this step.
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
