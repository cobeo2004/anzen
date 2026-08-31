import { z } from "zod";

export const activityEvents = {
  recorded: "activity.recorded",
} as const;

export const activityRecordedPayload = z.object({
  userId: z.string(),
  at: z.string(),
  source: z.literal("activity"),
});

export type ActivityRecordedPayload = z.infer<typeof activityRecordedPayload>;
