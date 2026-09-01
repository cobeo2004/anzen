import type { Cache } from "@/server/core/cache";
import { createDomainEvent } from "@/server/core/domain-event";
import type { EventBus } from "@/server/core/event-bus";
import { type IdentityEvents, identityEvents } from "../domain/events";

export function lastPingCacheKey(userId: string) {
  return `identity:last-ping:${userId}`;
}

export async function ping<TEvents extends IdentityEvents>(input: {
  userId: string;
  eventBus: EventBus<TEvents>;
  cache: Cache;
}) {
  const at = new Date().toISOString();
  await input.cache.set(lastPingCacheKey(input.userId), { at }, 60 * 60 * 1000);
  await input.eventBus.publish(
    createDomainEvent({
      type: identityEvents.pinged,
      payload: { userId: input.userId, at },
      channels: [`user:${input.userId}`, identityEvents.pinged],
    }),
  );
  return { at };
}
