import { getCache } from "@/server/infra/cache/cache.factory";
import { getEventBus } from "@/server/infra/event-bus/event-bus.factory";
import { createActivityModule } from "@/server/modules/activity";
import { createIdentityModule } from "@/server/modules/identity";
import { createNotificationsModule } from "@/server/modules/notifications";
import { createTRPCRouter } from "@/server/trpc";

const identity = createIdentityModule();
const activity = createActivityModule();
const notifications = createNotificationsModule();

const busPorts = {
  eventBus: getEventBus(),
  cache: getCache(),
};
activity.start(busPorts);
notifications.start(busPorts);

export const appRouter = createTRPCRouter({
  identity: identity.router,
  activity: activity.router,
  notifications: notifications.router,
});

export type AppRouter = typeof appRouter;
