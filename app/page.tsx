import { ShaderRipple } from "./components/shader-ripple";

const valueProps = [
  {
    title: "Knows the family context",
    description:
      "Kin helps with the everyday coordination families already do in chat, from remembering details to turning loose plans into clear next steps.",
  },
  {
    title: "Works where everyone already is",
    description:
      "No new app to convince people to download. Kin joins the family WhatsApp thread and becomes useful right away.",
  },
  {
    title: "Built for real households",
    description:
      "Helpful for rides, groceries, check-ins, schedules, and quick answers without sounding like work software.",
  },
];

const steps = [
  {
    number: "01",
    title: "Scan a QR code",
    description:
      "Start setup in a minute. Connect Kin to your family WhatsApp with a simple QR-based flow.",
  },
  {
    number: "02",
    title: "Invite Kin into the group",
    description:
      "Add Kin to the thread where plans, reminders, and questions already happen.",
  },
  {
    number: "03",
    title: "Ask naturally",
    description:
      "Use everyday language like \"remind us about Grandma's flight\" or \"what do we need for Saturday dinner?\"",
  },
];

const privacyPoints = [
  "Private by design for family conversations",
  "No public feeds, profiles, or social mechanics",
  "One shared assistant for the people you trust most",
];

export default function Page() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(255,246,196,0.9),_rgba(255,251,240,1)_45%,_rgba(255,248,235,1)_100%)] text-stone-900">
      <div className="mx-auto max-w-7xl px-6 pb-16 pt-6 sm:px-8 lg:px-10">
        <nav className="sticky top-0 z-20 mb-12 rounded-full border border-white/70 bg-white/70 px-4 py-3 shadow-[0_10px_40px_rgba(120,92,24,0.08)] backdrop-blur md:px-6">
          <div className="flex items-center justify-between gap-4">
            <a href="#top" className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[linear-gradient(135deg,#fff3b0,#f7d774)] text-sm font-semibold tracking-[0.2em] text-stone-900 shadow-sm">
                K
              </div>
              <div>
                <p className="text-base font-semibold tracking-tight">Kin</p>
                <p className="text-xs text-stone-500">Private AI for families</p>
              </div>
            </a>

            <div className="hidden items-center gap-8 text-sm text-stone-600 md:flex">
              <a href="#value" className="transition hover:text-stone-900">
                Why Kin
              </a>
              <a href="#how" className="transition hover:text-stone-900">
                How it works
              </a>
              <a href="#privacy" className="transition hover:text-stone-900">
                Privacy
              </a>
            </div>

            <a
              href="#setup"
              className="inline-flex items-center justify-center rounded-full bg-stone-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-stone-800"
            >
              Set up Kin
            </a>
          </div>
        </nav>

        <section
          id="top"
          className="relative isolate overflow-hidden rounded-[2.5rem] border border-white/65 bg-white/50 px-6 py-8 shadow-[0_24px_90px_rgba(103,76,18,0.08)] backdrop-blur-sm sm:px-8 lg:grid lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-14 lg:px-10 lg:py-10 lg:pb-14"
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 overflow-hidden rounded-[2.5rem]"
          >
            <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,249,242,0.92),rgba(244,241,255,0.84))]" />
            <ShaderRipple
              className="absolute inset-0"
              color1="#5f6fb3"
              color2="#7f8fe0"
              color3="#c7d2ff"
              lineWidth={0.0032}
              rippleCount={10}
              rotation={124}
              timeScale={0.9}
              opacity={0.9}
              waveIntensity={0.12}
              loopDuration={0.95}
              scale={1.08}
              mod={0.24}
            />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_22%,rgba(127,143,224,0.22),transparent_24%),radial-gradient(circle_at_82%_18%,rgba(199,210,255,0.34),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.10),rgba(247,246,255,0.24))]" />
          </div>

          <div className="relative z-10 max-w-2xl">
            <span className="inline-flex items-center rounded-full border border-yellow-200 bg-white/80 px-4 py-2 text-xs font-medium uppercase tracking-[0.24em] text-stone-600 shadow-sm">
              Lives in WhatsApp
            </span>
            <h1 className="mt-8 max-w-xl text-5xl font-semibold tracking-tight text-stone-950 sm:text-6xl">
              Your family&apos;s assistant, right in the group chat.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-stone-600 sm:text-xl">
              Kin is a private AI family assistant that helps your household stay
              on top of plans, reminders, and little details without adding
              another app to manage.
            </p>

            <div className="mt-10 flex flex-col gap-4 sm:flex-row">
              <a
                id="setup"
                href="#final-cta"
                className="inline-flex items-center justify-center rounded-full bg-stone-900 px-6 py-3.5 text-base font-medium text-white shadow-[0_14px_30px_rgba(41,37,36,0.18)] transition hover:-translate-y-0.5 hover:bg-stone-800"
              >
                Install Kin via WhatsApp
              </a>
              <a
                href="#how"
                className="inline-flex items-center justify-center rounded-full border border-stone-300 bg-white/80 px-6 py-3.5 text-base font-medium text-stone-800 transition hover:border-stone-400 hover:bg-white"
              >
                See how setup works
              </a>
            </div>

            <div className="mt-10 flex flex-wrap items-center gap-3 text-sm text-stone-600">
              <span className="rounded-full bg-white/75 px-4 py-2 shadow-sm">
                Private family context
              </span>
              <span className="rounded-full bg-white/75 px-4 py-2 shadow-sm">
                QR-based onboarding
              </span>
              <span className="rounded-full bg-white/75 px-4 py-2 shadow-sm">
                Natural chat replies
              </span>
            </div>
          </div>

          <div className="relative z-10 mt-12 lg:mt-0">
            <div className="absolute inset-x-10 top-4 h-48 rounded-full bg-yellow-200/35 blur-3xl" />
            <div className="relative overflow-hidden rounded-[2rem] border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.9),rgba(255,248,225,0.92))] p-4 shadow-[0_24px_80px_rgba(103,76,18,0.14)] sm:p-6">
              <div className="rounded-[1.6rem] border border-stone-200/80 bg-[#f9f6ef] p-4 shadow-inner">
                <div className="flex items-center justify-between border-b border-stone-200 pb-4">
                  <div>
                    <p className="text-sm font-semibold text-stone-900">Family chat</p>
                    <p className="text-xs text-stone-500">Kin joined via WhatsApp</p>
                  </div>
                  <div className="rounded-full bg-white px-3 py-1 text-xs text-stone-500 shadow-sm">
                    Secure setup
                  </div>
                </div>

                <div className="space-y-3 py-5">
                  <div className="ml-auto max-w-[82%] rounded-3xl rounded-br-md bg-[#efe6d4] px-4 py-3 text-sm leading-6 text-stone-700">
                    Can you remind everyone about Ella&apos;s dentist appointment
                    next Thursday at 3?
                  </div>
                  <div className="max-w-[86%] rounded-3xl rounded-bl-md bg-white px-4 py-3 text-sm leading-6 text-stone-800 shadow-sm">
                    Absolutely. I&apos;ll remind the group the night before and
                    again two hours before. I can also add
                    {" "}
                    &quot;leave school early&quot; to the plan if you want.
                  </div>
                  <div className="ml-auto max-w-[75%] rounded-3xl rounded-br-md bg-[#efe6d4] px-4 py-3 text-sm leading-6 text-stone-700">
                    Yes, and what do we still need for Saturday dinner?
                  </div>
                  <div className="max-w-[86%] rounded-3xl rounded-bl-md bg-white px-4 py-3 text-sm leading-6 text-stone-800 shadow-sm">
                    You already mentioned pasta, tomatoes, basil, and dessert.
                    Missing: garlic bread and sparkling water.
                  </div>
                </div>

                <div className="grid gap-3 border-t border-stone-200 pt-4 sm:grid-cols-2">
                  <div className="rounded-2xl bg-white p-4 shadow-sm">
                    <p className="text-xs uppercase tracking-[0.2em] text-stone-400">
                      Setup
                    </p>
                    <p className="mt-2 text-sm font-medium text-stone-800">
                      Connect with one QR scan
                    </p>
                  </div>
                  <div className="rounded-2xl bg-[#fff2bf] p-4 shadow-sm">
                    <p className="text-xs uppercase tracking-[0.2em] text-stone-500">
                      Built for
                    </p>
                    <p className="mt-2 text-sm font-medium text-stone-800">
                      Shared plans, reminders, and family memory
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="value" className="py-24">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-medium uppercase tracking-[0.25em] text-stone-500">
              Why families use Kin
            </p>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-stone-950 sm:text-4xl">
              Calm, capable help for the conversations that already run your home.
            </h2>
          </div>

          <div className="mt-14 grid gap-6 lg:grid-cols-3">
            {valueProps.map((item) => (
              <div
                key={item.title}
                className="rounded-[1.75rem] border border-white/80 bg-white/75 p-8 shadow-[0_16px_40px_rgba(107,79,22,0.08)] backdrop-blur"
              >
                <div className="mb-6 h-12 w-12 rounded-2xl bg-[linear-gradient(135deg,#fff7d1,#f2d670)]" />
                <h3 className="text-xl font-semibold tracking-tight text-stone-900">
                  {item.title}
                </h3>
                <p className="mt-4 text-base leading-7 text-stone-600">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section id="how" className="py-24">
          <div className="grid gap-10 rounded-[2rem] border border-yellow-100 bg-[linear-gradient(180deg,rgba(255,251,235,0.88),rgba(255,255,255,0.7))] p-8 shadow-[0_18px_60px_rgba(123,94,26,0.08)] lg:grid-cols-[0.9fr_1.1fr] lg:p-12">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.24em] text-stone-500">
                How it works
              </p>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight text-stone-950 sm:text-4xl">
                Setup is quick, and the experience feels familiar from day one.
              </h2>
              <p className="mt-5 max-w-lg text-base leading-7 text-stone-600">
                Kin is designed to disappear into the family workflow you already
                have. Connect it, add it to the thread, and start asking for help
                the same way you already message each other.
              </p>
            </div>

            <div className="space-y-4">
              {steps.map((step) => (
                <div
                  key={step.number}
                  className="flex gap-5 rounded-[1.5rem] border border-white/80 bg-white/80 p-5 shadow-sm"
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#fff1ab] text-sm font-semibold text-stone-800">
                    {step.number}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-stone-900">
                      {step.title}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-stone-600">
                      {step.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="privacy" className="py-24">
          <div className="grid gap-8 lg:grid-cols-[1fr_0.9fr]">
            <div className="rounded-[2rem] border border-white/80 bg-white/75 p-8 shadow-[0_18px_50px_rgba(120,90,21,0.08)] lg:p-10">
              <p className="text-sm font-medium uppercase tracking-[0.24em] text-stone-500">
                Privacy
              </p>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight text-stone-950">
                A family assistant should feel private, not performative.
              </h2>
              <p className="mt-5 max-w-xl text-base leading-7 text-stone-600">
                Kin is built for close, trusted groups. The goal is simple:
                useful help inside your family chat, with a setup flow that feels
                straightforward and respectful of the personal nature of the
                conversation.
              </p>
            </div>

            <div className="rounded-[2rem] border border-yellow-100 bg-[#fff8dd] p-8 shadow-[0_18px_50px_rgba(120,90,21,0.08)] lg:p-10">
              <ul className="space-y-4">
                {privacyPoints.map((point) => (
                  <li
                    key={point}
                    className="flex items-start gap-3 text-base leading-7 text-stone-700"
                  >
                    <span className="mt-1 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-sm text-stone-900 shadow-sm">
                      ✓
                    </span>
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section id="final-cta" className="py-24">
          <div className="overflow-hidden rounded-[2.25rem] border border-stone-900/5 bg-stone-900 px-8 py-12 text-white shadow-[0_24px_80px_rgba(41,37,36,0.18)] sm:px-12">
            <div className="relative">
              <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-yellow-200/20 blur-3xl" />
              <div className="relative flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
                <div className="max-w-2xl">
                  <p className="text-sm font-medium uppercase tracking-[0.24em] text-yellow-100/80">
                    Ready to set up
                  </p>
                  <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
                    Bring Kin into the family chat in a few minutes.
                  </h2>
                  <p className="mt-5 text-base leading-7 text-stone-300">
                    Start with a QR-based WhatsApp setup, add Kin to your group,
                    and let the household ask for help naturally.
                  </p>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <a
                    href="#"
                    className="inline-flex items-center justify-center rounded-full bg-[#ffe58f] px-6 py-3.5 text-base font-medium text-stone-900 transition hover:bg-[#ffdf74]"
                  >
                    Start WhatsApp setup
                  </a>
                  <a
                    href="#privacy"
                    className="inline-flex items-center justify-center rounded-full border border-white/20 px-6 py-3.5 text-base font-medium text-white transition hover:bg-white/10"
                  >
                    Read about privacy
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

        <footer className="flex flex-col gap-4 border-t border-stone-200/80 py-8 text-sm text-stone-500 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[linear-gradient(135deg,#fff3b0,#f7d774)] text-xs font-semibold tracking-[0.2em] text-stone-900">
              K
            </div>
            <span>Kin</span>
          </div>
          <div className="flex flex-wrap items-center gap-5">
            <a href="#value" className="transition hover:text-stone-700">
              Product
            </a>
            <a href="#privacy" className="transition hover:text-stone-700">
              Privacy
            </a>
            <a href="#final-cta" className="transition hover:text-stone-700">
              Setup
            </a>
          </div>
        </footer>
      </div>
    </main>
  );
}
