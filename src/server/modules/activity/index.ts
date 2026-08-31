import { identityEvents } from "@/modules/identity";
import type { Cache } from "@/server/core/cache";
import type { EventBus } from "@/server/core/event-bus";
import { recordIdentityPinged } from "./application/record-ping";
import { activityRouter } from "./interfaces/activity.router";

export { activityEvents, activityRecordedPayload } from "./application/events";

const globalForActivity = globalThis as unknown as {
  activityUnsubscribe?: () => void;
};

export function createActivityModule() {
  return {
    router: activityRouter,
    start(ports: { eventBus: EventBus; cache: Cache }) {
      if (globalForActivity.activityUnsubscribe) {
        return;
      }

      globalForActivity.activityUnsubscribe = ports.eventBus.subscribe(
        [identityEvents.pinged],
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
