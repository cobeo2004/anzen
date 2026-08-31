import { identityEvents, identityPingedPayload } from "@/modules/identity";
import type { Cache } from "@/server/core/cache";
import {
  createDomainEvent,
  type DomainEvent,
} from "@/server/core/domain-event";
import type { EventBus } from "@/server/core/event-bus";
import { notificationEvents } from "./events";

const MAX_RECENT = 20;

export function notificationInboxCacheKey(userId: string) {
  return `notifications:user:${userId}`;
}

export type NotificationRecord = {
  id: string;
  type: string;
  message: string;
  at: string;
  source: "notifications";
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
  const key = notificationInboxCacheKey(userId);
  const current = (await input.cache.get<NotificationRecord[]>(key)) ?? [];
  const record: NotificationRecord = {
    id: input.event.id,
    type: identityEvents.pinged,
    message: "Ping received from identity",
    at,
    source: "notifications",
  };
  await input.cache.set(
    key,
    [record, ...current].slice(0, MAX_RECENT),
    60 * 60 * 1000,
  );

  await input.eventBus.publish(
    createDomainEvent({
      type: notificationEvents.created,
      payload: {
        userId,
        at,
        source: "notifications" as const,
      },
      channels: [`user:${userId}`],
    }),
  );
}
