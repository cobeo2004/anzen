import { identityRouter } from "./interfaces/identity.router";

export {
  type IdentityEvents,
  type IdentityPingedPayload,
  identityEventCatalog,
  identityEvents,
  identityPingedPayload,
} from "./contract";

export function createIdentityModule() {
  return {
    router: identityRouter,
  };
}

export type IdentityPublicApi = ReturnType<typeof createIdentityModule>;
