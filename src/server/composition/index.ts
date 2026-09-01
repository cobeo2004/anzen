import "server-only";
import { getAuth } from "@/server/infra/auth/auth";
import { getCache } from "@/server/infra/cache/cache.factory";
import { getDatabase } from "@/server/infra/database/database.factory";
import { getObjectStorage } from "@/server/infra/object-storage/object-storage.factory";
import { appRouter } from "./app.router";
import { getAppEventBus } from "./app-event-bus";

export function getApp() {
  return {
    database: getDatabase(),
    auth: getAuth(),
    eventBus: getAppEventBus(),
    cache: getCache(),
    storage: getObjectStorage(),
    appRouter,
  };
}

export { appRouter };
export type { AppRouter } from "./app.router";
export { getAppEventBus } from "./app-event-bus";
export type { AppEvents } from "./events";
