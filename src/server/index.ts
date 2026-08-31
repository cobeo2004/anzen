import "server-only";
import { appRouter } from "@/server/app.router";
import { getAuth } from "@/server/infra/auth/auth";
import { getCache } from "@/server/infra/cache/cache.factory";
import { getDatabase } from "@/server/infra/database/database.factory";
import { getEventBus } from "@/server/infra/event-bus/event-bus.factory";
import { getObjectStorage } from "@/server/infra/object-storage/object-storage.factory";

export function getApp() {
  return {
    database: getDatabase(),
    auth: getAuth(),
    eventBus: getEventBus(),
    cache: getCache(),
    storage: getObjectStorage(),
    appRouter,
  };
}

export { appRouter };
export type { AppRouter } from "@/server/app.router";
