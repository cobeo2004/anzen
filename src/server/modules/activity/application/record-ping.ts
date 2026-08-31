import { identityEvents, identityPingedPayload } from "@/modules/identity";
import type { Cache } from "@/server/core/cache";
import {
  createDomainEvent,
  type DomainEvent,
} from "@/server/core/domain-event";
import type { EventBus } from "@/server/core/event-bus";
import { activityEvents } from "./events";

const MAX_RECENT = 20;

export function activityRecentCacheKey(userId: string) {
  return `activity:user:${userId}`;
}

export type ActivityRecord = {
  id: string;
  type: string;
  at: string;
  source: "activity";
};

export async function recordIdentityPinged(input: {
  event: DomainEvent;
  cache: Cache;
  eventBus: EventBus;
}) {
  if (input.event.type !== identityEvents.pinged) {
    return;
  }

  const parsed = identityPingedPayload.safeParse(input.event.payload);
  if (!parsed.success) {
    return;
  }

  const { userId, at } = parsed.data;
  const key = activityRecentCacheKey(userId);
  const current = (await input.cache.get<ActivityRecord[]>(key)) ?? [];
  const record: ActivityRecord = {
    id: input.event.id,
    type: identityEvents.pinged,
    at,
    source: "activity",
  };
  await input.cache.set(
    key,
    [record, ...current].slice(0, MAX_RECENT),
    60 * 60 * 1000,
  );

  await input.eventBus.publish(
    createDomainEvent({
      type: activityEvents.recorded,
      payload: {
        userId,
        at,
        source: "activity" as const,
      },
      channels: [`user:${userId}`],
    }),
  );
}
