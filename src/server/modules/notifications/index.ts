import { identityEvents } from "@/modules/identity";
import type { Cache } from "@/server/core/cache";
import type { EventBus } from "@/server/core/event-bus";
import { recordIdentityPinged } from "./application/record-ping";
import { notificationsRouter } from "./interfaces/notifications.router";

export {
  notificationCreatedPayload,
  notificationEvents,
} from "./application/events";

const globalForNotifications = globalThis as unknown as {
  notificationsUnsubscribe?: () => void;
};

export function createNotificationsModule() {
  return {
    router: notificationsRouter,
    start(ports: { eventBus: EventBus; cache: Cache }) {
      if (globalForNotifications.notificationsUnsubscribe) {
        return;
      }

      globalForNotifications.notificationsUnsubscribe =
        ports.eventBus.subscribe([identityEvents.pinged], (event) =>
          recordIdentityPinged({
            event,
            cache: ports.cache,
            eventBus: ports.eventBus,
          }).catch((error) => {
            console.error("Notifications subscriber failed", error);
          }),
        );
    },
  };
}

export type NotificationsPublicApi = ReturnType<
  typeof createNotificationsModule
>;
