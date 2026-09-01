# Modules

A module is a vertical slice: domain events, application use cases, a tRPC router, a public `index.ts`, and UI under `src/components/<name>/`.

Existing modules: **identity** (auth, ping, uploads), **activity** (consumes pings), **notifications** (second consumer of pings).

New to the tree? Walk it in [How to read the code](./reading.md) first.

## Public API

`src/server/modules/<name>/index.ts` is the only import surface for other modules.

Export:

- `createXModule()` returning `{ router, start? }`
- Event **names**, **Zod payloads**, and the catalog (`identityEvents`, `identityPingedPayload`, `identityEventCatalog`)
- `XEvents` and payload types that are part of the contract

Do **not** export use-case functions, routers, or cache-key helpers unless they are the contract.

Other modules import:

```ts
import { identityEvents, type IdentityEvents } from "@/modules/identity";
```

Add a tsconfig path when you add a module:

```json
"@/modules/<name>": ["./src/server/modules/<name>/index.ts"]
```

Composition (`src/server/composition/app.router.ts`) may import `createXModule` from `@/server/modules/<name>` — that is the app assembling modules, not module-to-module coupling.

Composition merges catalogs from **`contract.ts`**, not `index.ts`. `index.ts` imports the router, which imports `composition/trpc.ts`, which needs `AppEvents`. Importing `index.ts` from `composition/events.ts` would cycle.

## Folder layout

```
src/server/modules/<name>/
  index.ts                 createXModule + re-exported contract
  contract.ts              re-export of domain/events only (composition imports this)
  domain/
    events.ts              event names + Zod payloads + catalog + XEvents
  application/
    <use-case>.ts          functions taking ports (cache, eventBus, storage)
  interfaces/
    <name>.router.ts       createTRPCRouter — procedures only, thin
  infra/                   optional, private to this module
```

UI:

```
src/components/<name>/
  *.tsx                    "use client" where needed
```

Pages in `src/app` import components, not module internals.

## Talking to another module

**Never** call the other module’s functions. Publish or subscribe on `EventBus`.

1. Producer defines events in `domain/events.ts` (name + Zod payload + catalog) and re-exports them from `contract.ts` and `index.ts`.
2. Producer `publish`es `createDomainEvent({ type, payload, channels })`. Include the event type string as a channel so `subscribeTo(type)` works. Include `user:${userId}` when the browser should SSE.
3. Consumer `start({ eventBus, cache })` calls `eventBus.subscribeTo("identity.pinged", (event) => …)`. `event.payload` is already the producer’s payload type. Do not `safeParse` again in the use case — the typed wrapper in composition does that.
4. Constrain the bus as `EventBus<TEvents extends IdentityEvents & ThisModuleEvents>`. Do **not** import `AppEvents` from the module.
5. Guard `start()` with `globalThis` so HMR does not double-subscribe.

Identity ping today publishes to `user:${id}` and `identity.pinged`. Activity and notifications both `subscribeTo(identityEvents.pinged)` — fan-out, no identity imports.

SSE: routers use `subscribeAsync(eventBus, [channel], signal)` and `tracked(event.id, event)` from `@trpc/server`. Filter by `event.type` because `user:${id}` carries several event types. After `if (event.type !== identityEvents.pinged) continue`, the payload narrows.

## Adding a module (checklist)

1. Create the folders above. Copy the shape of `activity` or `notifications` if it is a subscriber; copy `identity` if it owns user-facing commands.
2. Application functions take **ports** (`EventBus`, `Cache`, `ObjectStorage`) as arguments. Do not call `getEventBus()` or `getAppEventBus()` from inside a use case — context / `start()` injects them.
3. Router: `protectedProcedure` for anything session-scoped. Map domain failures to `TRPCError`. Import procedures from `@/server/composition/trpc`.
4. `createXModule()` in `index.ts`. If it listens on the bus, implement `start()` with a `globalThis` unsubscribe guard and `subscribeTo`.
5. Path alias in `tsconfig.json`.
6. Register in `src/server/composition/app.router.ts`:

   ```ts
   const foo = createFooModule();
   foo.start?.({ eventBus: getAppEventBus(), cache: getCache() });

   export const appRouter = createTRPCRouter({
     // ...
     foo: foo.router,
   });
   ```

   Spreading the new catalog in `composition/events.ts` is enough for `AppEvents` if `contract.ts` exports `fooEventCatalog`.

7. Client UI in `src/components/<name>/`. Use `useTRPC()` from `@/lib/trpc`, then `trpc.foo.bar.queryOptions()` / `mutationOptions()` / `subscriptionOptions()`. Invalidate with `queryClient.invalidateQueries(trpc.foo.bar.queryFilter())`.
8. Mount the UI from the relevant page (today: `DashboardPanel`).
9. `bun run lint`. Fix Biome import restrictions and depcruise before considering the module done.

## tRPC conventions (this repo)

- Server: `initTRPC` in `src/server/composition/trpc.ts` — SSE ping enabled. Context `eventBus` is `EventBus<AppEvents>`.
- Client: `@trpc/tanstack-react-query` `createTRPCContext`. **Not** `@trpc/react-query`.
- Links: `splitLink` — subscriptions → `httpSubscriptionLink`, everything else → `httpBatchLink` with `credentials: "include"`.
- Load TanStack intent skills (`server-setup`, `subscriptions`, `react-query-setup`, …) before inventing new tRPC patterns.

## What not to do

- Do not put UI under `src/server/modules/<name>/ui`.
- Do not import `@/server/modules/identity/application/ping` from activity or notifications.
- Do not import `AppEvents` into a feature module. Constrain `TEvents extends …` so composition can pass the app bus.
- Do not subscribe to another module’s **internal** cache keys. Subscribe to events; keep your own cache namespace (`activity:user:`, `notifications:user:`).
- Do not add Kafka/RabbitMQ/outbox unless asked. Redis EventBus already `XADD`s for a future worker.
- Do not create a new npm workspace for one module. This is a modular monolith, not a polyrepo.
