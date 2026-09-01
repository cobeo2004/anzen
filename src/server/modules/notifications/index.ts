import { type IdentityEvents, identityEvents } from "@/modules/identity";
import type { Cache } from "@/server/core/cache";
import type { EventBus } from "@/server/core/event-bus";
import { recordIdentityPinged } from "./application/record-ping";
import type { NotificationEvents } from "./domain/events";
import { notificationsRouter } from "./interfaces/notifications.router";

export {
  type NotificationCreatedPayload,
  type NotificationEvents,
  notificationCreatedPayload,
  notificationEventCatalog,
  notificationEvents,
} from "./contract";

const globalForNotifications = globalThis as unknown as {
  notificationsUnsubscribe?: () => void;
};

export function createNotificationsModule() {
  return {
    router: notificationsRouter,
    start<TEvents extends IdentityEvents & NotificationEvents>(ports: {
      eventBus: EventBus<TEvents>;
      cache: Cache;
    }) {
      if (globalForNotifications.notificationsUnsubscribe) {
        return;
      }

      globalForNotifications.notificationsUnsubscribe =
        ports.eventBus.subscribeTo(identityEvents.pinged, (event) =>
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
