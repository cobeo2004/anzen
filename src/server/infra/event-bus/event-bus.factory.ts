import { getAppEnv } from "@/server/config/env";
import type { EventBus } from "@/server/core/event-bus";
import { InMemoryEventBus } from "./in-memory.bus";
import { RedisEventBus } from "./redis.bus";

const globalForEventBus = globalThis as unknown as {
  eventBus?: EventBus;
};

export function getEventBus(): EventBus {
  if (globalForEventBus.eventBus) {
    return globalForEventBus.eventBus;
  }

  const { eventBusProvider, eventBusUrl } = getAppEnv();
  const bus =
    eventBusProvider === "redis"
      ? new RedisEventBus(eventBusUrl)
      : new InMemoryEventBus();

  globalForEventBus.eventBus = bus;
  return bus;
}
