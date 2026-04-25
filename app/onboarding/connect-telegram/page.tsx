"use client";

import { Suspense, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { OnboardingShell } from "@/app/components/onboarding-shell";

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
    size: "320x320",
    data: value,
    margin: "0",
  });

  return `https://api.qrserver.com/v1/create-qr-code/?${params.toString()}`;
}

function ConnectTelegramPageContent() {
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
    <OnboardingShell
      currentStep="telegram"
      title="Connect Telegram"
      description="Kin works in your family Telegram group. Open Telegram to continue setup, then add Kin to the conversation."
      showBack
      backHref="/onboarding/household"
    >
      <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-center lg:gap-10">
        <section className="order-2 space-y-8 lg:order-1">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#685b2a]">
              Step 3 of 4
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-stone-950">
              Continue in Telegram
            </h2>
            <p className="mt-3 text-sm leading-7 text-stone-600 md:text-base">
              Open Kin in Telegram to continue setup, then add it to your family group so we can finish automatically.
            </p>
          </div>

          <div className="space-y-4 sm:space-y-5">
            {[
              {
                number: "1",
                title: "Open Kin in Telegram",
                body: "Start the setup in Telegram on your phone or desktop.",
                tone: "bg-[#feeaac] text-[#5c4f20]",
              },
              {
                number: "2",
                title: "Continue with your setup link",
                body: "Telegram will open Kin with the connection already prepared.",
                tone: "bg-[#e5e2da] text-stone-700",
              },
              {
                number: "3",
                title: "Add Kin to your family group",
                body: "Once Kin is in the group, setup can finish automatically.",
                tone: "bg-[#e5e2da] text-stone-700",
              },
            ].map((item) => (
              <div key={item.number} className="flex items-start gap-3 rounded-[1.5rem] border border-stone-200 bg-white p-4 shadow-[0_16px_40px_rgba(104,91,42,0.05)] sm:gap-4 sm:p-5">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${item.tone}`}>
                  {item.number}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-stone-900">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-stone-600">{item.body}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-[1.5rem] border border-stone-200 bg-[#faf8f2] p-4 sm:p-5">
            <h3 className="text-base font-semibold text-stone-900">Need the link on another device?</h3>
            <p className="mt-2 text-sm leading-6 text-stone-600">
              Use the button if you’re already on your phone, or copy the link and send it to yourself.
            </p>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <button
                type="button"
                onClick={handleCopyLink}
                disabled={!deepLink}
                className="inline-flex min-h-11 w-full items-center justify-center rounded-full border border-stone-300 bg-white px-5 py-3 text-sm font-medium text-stone-700 transition hover:border-stone-500 hover:text-stone-900 disabled:cursor-not-allowed disabled:border-stone-200 disabled:text-stone-400 sm:w-auto"
              >
                {copyState === "copied"
                  ? "Link copied"
                  : copyState === "error"
                    ? "Copy unavailable"
                    : "Copy link"}
              </button>
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
          </div>
        </section>

        <section className="order-1 flex flex-col items-center lg:order-2">
          <div className="relative w-full max-w-md rounded-[1.75rem] border border-white/70 bg-white/70 p-4 shadow-[0_24px_90px_rgba(103,76,18,0.08)] backdrop-blur-sm sm:rounded-[2rem] sm:p-6">
            <div className="absolute inset-0 rounded-[2rem] bg-[radial-gradient(circle_at_center,rgba(242,254,222,0.8),rgba(247,246,242,0)_72%)] opacity-80" />
            <div className="relative z-10 rounded-[1.75rem] border border-stone-200 bg-white p-6 shadow-inner">
              <div className="flex items-center justify-between border-b border-stone-200 pb-4">
                <div>
                  <p className="text-sm font-semibold text-stone-900">Continue on your device</p>
                  <p className="text-xs text-stone-500">Use mobile or desktop Telegram</p>
                </div>
                <div className="rounded-full bg-[#f4f0e4] px-3 py-1 text-xs text-stone-600">
                  Ready to open
                </div>
              </div>

              <div className="mt-5 flex flex-col items-center">
                {qrCodeUrl ? (
                  <div className="overflow-hidden rounded-[1.5rem] border border-stone-200 bg-[#f9f6ef] p-3 shadow-[0_18px_60px_rgba(103,76,18,0.08)] sm:p-4">
                    <Image
                      src={qrCodeUrl}
                      alt="QR code for the Telegram deep link"
                      width={320}
                      height={320}
                      sizes="320px"
                      unoptimized
                      className="h-auto w-full rounded-2xl"
                    />
                  </div>
                ) : (
                  <div className="flex min-h-[320px] w-full items-center justify-center rounded-[1.5rem] border border-dashed border-stone-300 bg-[#faf8f2] p-6 text-center">
                    <p className="max-w-xs text-sm leading-6 text-stone-600">
                      We’ll show a QR code here once the Telegram deep link is ready.
                    </p>
                  </div>
                )}

                <div className="mt-6 flex w-full flex-col items-center gap-4">
                  <a
                    href={deepLink ?? "#"}
                    target="_blank"
                    rel="noreferrer"
                    className={`inline-flex w-full items-center justify-center rounded-full px-6 py-4 text-base font-medium transition ${
                      deepLink
                        ? "bg-stone-900 text-white shadow-[0_14px_30px_rgba(41,37,36,0.18)] hover:bg-stone-800"
                        : "cursor-not-allowed bg-stone-300 text-white"
                    }`}
                  >
                    Open Telegram
                  </a>
                  <div className="rounded-full bg-[#f4f0e4] px-5 py-3 text-sm text-stone-600">
                    Use the button on mobile, or scan from desktop.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </OnboardingShell>
  );
}

export default function ConnectTelegramPage() {
  return (
    <Suspense fallback={<div className="min-h-[100svh] bg-[radial-gradient(circle_at_top,_rgba(255,246,196,0.9),_rgba(255,251,240,1)_45%,_rgba(255,248,235,1)_100%)] px-4 py-6 text-stone-900 sm:px-6 sm:py-12" />}>
      <ConnectTelegramPageContent />
    </Suspense>
  );
}
