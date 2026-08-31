import { z } from "zod";

export const identityEvents = {
  pinged: "identity.pinged",
} as const;

export const identityPingedPayload = z.object({
  userId: z.string(),
  at: z.string(),
});

export type IdentityPingedPayload = z.infer<typeof identityPingedPayload>;
