"use client";

import { signOut } from "aws-amplify/auth";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { DashboardShell } from "@/app/components/dashboard-shell";
import {
  DashboardApiResponse,
  DashboardState,
} from "@/app/components/dashboard-state";

function SettingsContent({ state }: { state: DashboardApiResponse["data"] }) {
  const binding = state.telegram.binding;
  const router = useRouter();
  const [confirmValue, setConfirmValue] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  async function handleDeleteHousehold() {
    setDeleteError("");

    if (confirmValue.trim() !== state.household.name) {
      setDeleteError("Household name confirmation did not match.");
      return;
    }

    setDeleteLoading(true);

    try {
      const response = await fetch("/api/household", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          cognitoSub: state.owner.cognitoSub,
          householdName: state.household.name,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.error?.message ?? "Unable to delete household.");
      }

      await signOut({ global: true }).catch(() => undefined);
      router.replace("/");
      router.refresh();
    } catch (err) {
      setDeleteError(
        err instanceof Error ? err.message : "Unable to delete household.",
      );
    } finally {
      setDeleteLoading(false);
    }
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr] xl:gap-6">
        <section className="rounded-[1.75rem] border border-stone-200 bg-white p-5 shadow-[0_18px_60px_rgba(104,91,42,0.07)] sm:p-6">
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

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <a
              href={state.telegram.reconnectUrl}
              className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-stone-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-stone-800 sm:w-auto"
            >
              Reconnect Telegram
            </a>
            {state.telegram.deepLink ? (
              <a
                href={state.telegram.deepLink}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-11 w-full items-center justify-center rounded-full border border-stone-300 px-5 py-3 text-sm font-medium text-stone-700 transition hover:border-stone-500 hover:text-stone-900 sm:w-auto"
              >
                Open Telegram
              </a>
            ) : null}
          </div>
        </section>

        <section className="rounded-[1.75rem] border border-stone-200 bg-white p-5 shadow-[0_18px_60px_rgba(104,91,42,0.07)] sm:p-6">
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

      <section className="rounded-[1.75rem] border border-red-200 bg-[linear-gradient(180deg,rgba(255,247,247,0.98),rgba(255,255,255,1))] p-5 shadow-[0_18px_60px_rgba(185,41,2,0.06)] sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-red-600">
          Danger zone
        </p>
        <h3 className="mt-3 text-2xl font-semibold tracking-tight text-stone-950">
          Delete household
        </h3>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-stone-600">
          Permanently remove your household, Kin assistant setup, Telegram connection, dashboard data, and account access.
        </p>

        {!showConfirm ? (
          <div className="mt-6">
            <button
              type="button"
              onClick={() => setShowConfirm(true)}
              className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-red-600 px-5 py-3 text-sm font-medium text-white transition hover:bg-red-700 sm:w-auto"
            >
              Delete household
            </button>
          </div>
        ) : (
          <div className="mt-6 rounded-[1.5rem] border border-red-200 bg-white p-4 sm:p-5">
            <h4 className="text-lg font-semibold text-stone-950">Delete household?</h4>
            <p className="mt-3 text-sm leading-7 text-stone-600">
              This action cannot be undone. Type <span className="font-semibold text-stone-900">{state.household.name}</span> to confirm.
            </p>

            <div className="mt-5">
              <label className="mb-2 block text-sm font-medium text-stone-700">
                Household name
              </label>
              <input
                type="text"
                value={confirmValue}
                onChange={(e) => setConfirmValue(e.target.value)}
                className="w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 text-base outline-none transition focus:border-red-400 sm:text-sm"
                placeholder={state.household.name}
              />
            </div>

            {deleteError ? (
              <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {deleteError}
              </div>
            ) : null}

            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <button
                type="button"
                onClick={() => {
                  setShowConfirm(false);
                  setConfirmValue("");
                  setDeleteError("");
                }}
                className="inline-flex min-h-11 w-full items-center justify-center rounded-full border border-stone-300 bg-white px-5 py-3 text-sm font-medium text-stone-700 transition hover:border-stone-500 hover:text-stone-900 sm:w-auto"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteHousehold}
                disabled={deleteLoading}
                className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-red-600 px-5 py-3 text-sm font-medium text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
              >
                {deleteLoading ? "Deleting household..." : "Delete household"}
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <DashboardShell
      title="Settings"
      subtitle="Simple household details, Telegram connection information, and household controls for the owner account."
    >
      <DashboardState>{(state) => <SettingsContent state={state} />}</DashboardState>
    </DashboardShell>
  );
}
