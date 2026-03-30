export type DashboardConnectionState =
  | "CONNECTED"
  | "WAITING_FOR_CONNECTION"
  | "NEEDS_RECONNECTION";

export type DashboardStatusTone = "connected" | "waiting" | "reconnect";

export function buildTelegramDeepLink(
  botUsername: string | null | undefined,
  onboardingToken: string | null | undefined,
) {
  if (!botUsername || !onboardingToken) {
    return null;
  }

  return `https://t.me/${botUsername}?start=${encodeURIComponent(onboardingToken)}`;
}

export function deriveDashboardConnectionState(params: {
  bindingStatus: string | null | undefined;
  onboardingStatus: string | null | undefined;
  assistantStatus: string | null | undefined;
  externalGroupId: string | null | undefined;
  verifiedAt: Date | string | null | undefined;
}) {
  const bindingStatus = params.bindingStatus ?? null;
  const onboardingStatus = params.onboardingStatus ?? null;
  const assistantStatus = params.assistantStatus ?? null;
  const hadPreviousBinding = Boolean(params.externalGroupId || params.verifiedAt);

  if (
    bindingStatus === "ACTIVE" &&
    onboardingStatus === "COMPLETE" &&
    assistantStatus === "ACTIVE"
  ) {
    return "CONNECTED" satisfies DashboardConnectionState;
  }

  if (
    bindingStatus === "FAILED" ||
    onboardingStatus === "COMPLETE" ||
    hadPreviousBinding
  ) {
    return "NEEDS_RECONNECTION" satisfies DashboardConnectionState;
  }

  return "WAITING_FOR_CONNECTION" satisfies DashboardConnectionState;
}

export function getDashboardStatusCopy(state: DashboardConnectionState) {
  switch (state) {
    case "CONNECTED":
      return {
        badge: "Connected",
        title: "Kin is alive and connected",
        description: "Telegram is connected and Kin is ready in your household group.",
        tone: "connected" satisfies DashboardStatusTone,
      };
    case "NEEDS_RECONNECTION":
      return {
        badge: "Needs reconnection",
        title: "Kin needs to reconnect to Telegram",
        description:
          "Your household has a previous Telegram binding, but Kin is not currently healthy.",
        tone: "reconnect" satisfies DashboardStatusTone,
      };
    default:
      return {
        badge: "Waiting for connection",
        title: "Kin is waiting for Telegram",
        description:
          "Finish the Telegram binding flow to connect Kin to your household group.",
        tone: "waiting" satisfies DashboardStatusTone,
      };
  }
}
