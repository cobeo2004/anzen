import { identityRouter } from "./interfaces/identity.router";

export { identityEvents, identityPingedPayload } from "./application/events";

export function createIdentityModule() {
  return {
    router: identityRouter,
  };
}

export type IdentityPublicApi = ReturnType<typeof createIdentityModule>;
