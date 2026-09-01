import { z } from "zod";

export const notificationEvents = {
  created: "notifications.created",
} as const;

export const notificationCreatedPayload = z.object({
  userId: z.string(),
  at: z.string(),
  source: z.literal("notifications"),
});

export type NotificationCreatedPayload = z.infer<
  typeof notificationCreatedPayload
>;

export const notificationEventCatalog = {
  [notificationEvents.created]: notificationCreatedPayload,
} as const;

export type NotificationEvents = {
  [K in keyof typeof notificationEventCatalog]: z.infer<
    (typeof notificationEventCatalog)[K]
  >;
};
