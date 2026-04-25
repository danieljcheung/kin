"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode } from "react";

const navItems = [
  { href: "/dashboard", label: "Home" },
  { href: "/settings", label: "Settings" },
];

function navClasses(active: boolean) {
  return active
    ? "rounded-full bg-[#feeaac] px-4 py-2.5 text-sm font-semibold text-[#685b2a] shadow-sm"
    : "rounded-full px-4 py-2.5 text-sm font-medium text-stone-600 transition hover:bg-white/70 hover:text-stone-900";
}

export function DashboardShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <main className="min-h-[100svh] bg-[radial-gradient(circle_at_top,_rgba(254,234,172,0.55),_rgba(247,246,242,1)_38%,_rgba(255,251,244,1)_100%)] text-stone-900">
      <div className="mx-auto flex min-h-[100svh] w-full max-w-7xl flex-col px-4 py-4 sm:px-5 sm:py-6 md:px-8 lg:flex-row lg:gap-8 lg:px-10 lg:py-8">
        <aside className="mb-5 rounded-[1.75rem] border border-white/70 bg-white/75 p-4 shadow-[0_24px_80px_rgba(104,91,42,0.08)] backdrop-blur sm:mb-6 sm:rounded-[2rem] lg:sticky lg:top-8 lg:mb-0 lg:flex lg:min-h-[calc(100svh-4rem)] lg:w-72 lg:flex-col lg:p-6">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-stone-500">
              Kin
            </p>
            <h1 className="mt-3 font-serif text-2xl font-semibold tracking-tight text-stone-950 sm:text-3xl">
              A private assistant for family life
            </h1>
          </div>

          <nav className="mt-6 grid grid-cols-2 gap-2 sm:mt-8 lg:flex lg:flex-1 lg:grid-cols-1 lg:flex-col">
            {navItems.map((item) => {
              const active = pathname === item.href;
              return (
                <Link key={item.href} href={item.href} className={navClasses(active)}>
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-6 rounded-[1.5rem] bg-[#f4f0e4] p-4 text-sm text-stone-700 sm:mt-8 sm:rounded-[1.75rem] lg:mt-auto">
            <p className="font-semibold text-stone-900">Owner view</p>
            <p className="mt-2 leading-6 text-stone-600">
              This dashboard is just for the household owner right now. Kin itself still lives in Telegram.
            </p>
            <button
              type="button"
              onClick={() => router.push("/onboarding/connect-telegram")}
              className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-full bg-stone-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-stone-800 sm:w-auto"
            >
              Open Telegram setup
            </button>
          </div>
        </aside>

        <section className="min-w-0 flex-1">
          <div className="rounded-[1.75rem] border border-white/70 bg-white/72 p-5 shadow-[0_24px_80px_rgba(104,91,42,0.08)] backdrop-blur sm:rounded-[2rem] sm:p-6 md:p-8">
            <header className="mb-6 border-b border-stone-200/80 pb-5 sm:mb-8 sm:pb-6">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-500">
                Kin dashboard
              </p>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight text-stone-950 sm:text-3xl md:text-4xl">
                {title}
              </h2>
              {subtitle ? (
                <p className="mt-3 max-w-3xl text-sm leading-6 text-stone-600 md:text-base">
                  {subtitle}
                </p>
              ) : null}
            </header>

            {children}
          </div>
        </section>
      </div>
    </main>
  );
}
