import { type IdentityEvents, identityEvents } from "@/modules/identity";
import type { Cache } from "@/server/core/cache";
import type { EventBus } from "@/server/core/event-bus";
import { recordIdentityPinged } from "./application/record-ping";
import type { ActivityEvents } from "./domain/events";
import { activityRouter } from "./interfaces/activity.router";

export {
  type ActivityEvents,
  type ActivityRecordedPayload,
  activityEventCatalog,
  activityEvents,
  activityRecordedPayload,
} from "./contract";

const globalForActivity = globalThis as unknown as {
  activityUnsubscribe?: () => void;
};

export function createActivityModule() {
  return {
    router: activityRouter,
    start<TEvents extends IdentityEvents & ActivityEvents>(ports: {
      eventBus: EventBus<TEvents>;
      cache: Cache;
    }) {
      if (globalForActivity.activityUnsubscribe) {
        return;
      }

      globalForActivity.activityUnsubscribe = ports.eventBus.subscribeTo(
        identityEvents.pinged,
        (event) =>
          recordIdentityPinged({
            event,
            cache: ports.cache,
            eventBus: ports.eventBus,
          }).catch((error) => {
            console.error("Activity subscriber failed", error);
          }),
      );
    },
  };
}

export type ActivityPublicApi = ReturnType<typeof createActivityModule>;
