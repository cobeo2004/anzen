import type { EventBus } from "@/server/core/event-bus";
import { getEventBus } from "@/server/infra/event-bus/event-bus.factory";
import { type AppEvents, appEventCatalog } from "./events";
import { createTypedEventBus } from "./typed-event-bus";

const globalForAppEventBus = globalThis as unknown as {
  appEventBus?: EventBus<AppEvents>;
};

export function getAppEventBus(): EventBus<AppEvents> {
  globalForAppEventBus.appEventBus ??= createTypedEventBus(
    getEventBus(),
    appEventCatalog,
  );
  return globalForAppEventBus.appEventBus;
}
