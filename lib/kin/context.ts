import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export interface KinContextEvent {
  id: string;
  createdAt: Date;
  category: string;
  routeDecision: string;
  scope: string | null;
  chatTitle: string | null;
  fromFirstName: string | null;
  fromUsername: string | null;
  text: string | null;
}

export interface KinConversationContext {
  currentEvent: KinContextEvent;
  recentEvents: KinContextEvent[];
}

interface KinContextRow extends KinContextEvent {
  familyId: string | null;
  groupBindingId: string | null;
}

function trimText(value: string | null): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function isRelevantContextEvent(event: { text: string | null; category: string }): boolean {
  return Boolean(trimText(event.text)) && event.category !== "ONBOARDING";
}

export async function loadKinConversationContext(
  eventId: string,
): Promise<KinConversationContext | null> {
  const currentRows = await prisma.$queryRaw<KinContextRow[]>(Prisma.sql`
    SELECT
      "id",
      "createdAt",
      "category"::text AS "category",
      "routeDecision",
      "scope",
      "chatTitle",
      "fromFirstName",
      "fromUsername",
      "text",
      "familyId",
      "groupBindingId"
    FROM "KinEvent"
    WHERE "id" = ${eventId}
    LIMIT 1
  `);
  const currentEvent = currentRows[0] ?? null;

  if (!currentEvent) {
    return null;
  }

  const recentCandidates =
    currentEvent.familyId
      ? await prisma.$queryRaw<KinContextEvent[]>(
          Prisma.sql`
            SELECT
              "id",
              "createdAt",
              "category"::text AS "category",
              "routeDecision",
              "scope",
              "chatTitle",
              "fromFirstName",
              "fromUsername",
              "text"
            FROM "KinEvent"
            WHERE "familyId" = ${currentEvent.familyId}
              AND "id" <> ${currentEvent.id}
              ${
                currentEvent.groupBindingId
                  ? Prisma.sql`AND "groupBindingId" = ${currentEvent.groupBindingId}`
                  : Prisma.empty
              }
            ORDER BY "createdAt" DESC
            LIMIT 12
          `,
        )
      : [];

  return {
    currentEvent: {
      id: currentEvent.id,
      createdAt: currentEvent.createdAt,
      category: currentEvent.category,
      routeDecision: currentEvent.routeDecision,
      scope: currentEvent.scope,
      chatTitle: currentEvent.chatTitle,
      fromFirstName: currentEvent.fromFirstName,
      fromUsername: currentEvent.fromUsername,
      text: currentEvent.text,
    },
    recentEvents: recentCandidates.filter(isRelevantContextEvent).slice(0, 3).reverse(),
  };
}
