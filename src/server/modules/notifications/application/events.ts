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
