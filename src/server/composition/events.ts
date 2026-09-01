import { activityEventCatalog } from "@/server/modules/activity/contract";
import { identityEventCatalog } from "@/server/modules/identity/contract";
import { notificationEventCatalog } from "@/server/modules/notifications/contract";
import type { InferEventCatalog } from "./typed-event-bus";

export const appEventCatalog = {
  ...identityEventCatalog,
  ...activityEventCatalog,
  ...notificationEventCatalog,
};

export type AppEvents = InferEventCatalog<typeof appEventCatalog>;
