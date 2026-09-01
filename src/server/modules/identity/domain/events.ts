import { z } from "zod";

export const identityEvents = {
  pinged: "identity.pinged",
} as const;

export const identityPingedPayload = z.object({
  userId: z.string(),
  at: z.string(),
});

export type IdentityPingedPayload = z.infer<typeof identityPingedPayload>;

export const identityEventCatalog = {
  [identityEvents.pinged]: identityPingedPayload,
} as const;

export type IdentityEvents = {
  [K in keyof typeof identityEventCatalog]: z.infer<
    (typeof identityEventCatalog)[K]
  >;
};
