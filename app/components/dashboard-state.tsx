"use client";

import { getCurrentUser } from "aws-amplify/auth";
import { ReactNode, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { configureAmplify } from "@/lib/amplify";
import { buildSigninHref } from "@/lib/auth-flow";

configureAmplify();

export type DashboardApiResponse = {
  data: {
    owner: {
      id: string;
      cognitoSub: string | null;
      email: string;
      name: string | null;
      role: string;
    };
    household: {
      id: string;
      name: string;
      createdAt: string;
    };
    assistant: {
      id: string;
      name: string;
      status: string;
      runtimeType: string;
    } | null;
    onboarding: {
      status: string;
      currentStep: string;
      updatedAt: string | null;
    } | null;
    telegram: {
      channel: string;
      deepLink: string | null;
      reconnectUrl: string;
      binding: {
        id: string;
        platform: string;
        status: string;
        groupName: string | null;
        externalGroupId: string | null;
        onboardingToken: string;
        botUsername: string | null;
        telegramDmUsername: string | null;
        telegramDmFirstName: string | null;
        createdAt: string;
        updatedAt: string;
        verifiedAt: string | null;
      } | null;
    };
    connection: {
      state: "CONNECTED" | "WAITING_FOR_CONNECTION" | "NEEDS_RECONNECTION";
      isHealthy: boolean;
      badge: string;
      title: string;
      description: string;
      tone: "connected" | "waiting" | "reconnect";
    };
  };
  error?: {
    code?: string;
    message?: string;
  };
};

type DashboardStateProps = {
  children: (state: DashboardApiResponse["data"]) => ReactNode;
};

function getAuthErrorMessage(err: unknown) {
  if (!(err instanceof Error)) {
    return "Unable to load your account session.";
  }

  if (err.message.includes("authenticated") || err.message.includes("No current user")) {
    return "Sign in to continue.";
  }

  return err.message;
}

export function DashboardState({ children }: DashboardStateProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [state, setState] = useState<DashboardApiResponse["data"] | null>(null);
  const signinHref = useMemo(() => buildSigninHref({ next: "/dashboard" }), []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const currentUser = await getCurrentUser();
        const response = await fetch(
          `/api/dashboard?cognitoSub=${encodeURIComponent(currentUser.userId)}`,
          { cache: "no-store" },
        );
        const result = (await response.json()) as DashboardApiResponse;

        if (!response.ok) {
          throw new Error(result.error?.message ?? "Unable to load dashboard state.");
        }

        if (!cancelled) {
          setState(result.data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(getAuthErrorMessage(err));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="rounded-[1.75rem] border border-stone-200 bg-[#faf8f2] p-6 text-sm text-stone-600">
        Loading your household dashboard...
      </div>
    );
  }

  if (!state) {
    return (
      <div className="rounded-[1.75rem] border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        <p className="font-semibold text-red-900">Couldn&apos;t load Kin right now.</p>
        <p className="mt-2 leading-6">{error || "Please try again."}</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-full bg-stone-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-stone-800"
          >
            Try again
          </button>
          <button
            type="button"
            onClick={() => router.push(signinHref)}
            className="rounded-full border border-stone-300 px-4 py-2.5 text-sm font-medium text-stone-700 transition hover:border-stone-500 hover:text-stone-900"
          >
            Sign in
          </button>
        </div>
      </div>
    );
  }

  return <>{children(state)}</>;
}
