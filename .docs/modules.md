# Modules

A module is a vertical slice: application code, a tRPC router, a public `index.ts`, and UI under `src/components/<name>/`.

Existing modules: **identity** (auth, ping, uploads), **activity** (consumes pings), **notifications** (second consumer of pings).

## Public API

`src/server/modules/<name>/index.ts` is the only import surface for other modules.

Export:

- `createXModule()` returning `{ router, start? }`
- Event **names** and **Zod payloads** other modules need (`identityEvents`, `identityPingedPayload`)
- Types that are part of the contract

Do **not** export use-case functions, routers, or cache-key helpers unless they are the contract.

Other modules import:

```ts
import { identityEvents, identityPingedPayload } from "@/modules/identity";
```

Add a tsconfig path when you add a module:

```json
"@/modules/<name>": ["./src/server/modules/<name>/index.ts"]
```

Composition (`app.router.ts`) may import `createXModule` from `@/server/modules/<name>` — that is the app assembling modules, not module-to-module coupling.

## Folder layout

```
src/server/modules/<name>/
  index.ts                 createXModule + re-exported events
  application/
    events.ts              event type strings + zod payloads
    <use-case>.ts          functions taking ports (cache, eventBus, storage)
  interfaces/
    <name>.router.ts       createTRPCRouter — procedures only, thin
  domain/                  optional
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

1. Producer defines events in `application/events.ts` and re-exports them from `index.ts`.
2. Producer `publish`es `createDomainEvent({ type, payload, channels })`. Include the event type string as a channel so `start()` subscribers can listen without knowing user ids. Include `user:${userId}` when the browser should SSE.
3. Consumer `start({ eventBus, cache })` subscribes to the **producer’s public event name**, parses payload with the producer’s Zod schema, then updates its own cache / publishes its own events.
4. Guard `start()` with `globalThis` so HMR does not double-subscribe.

Identity ping today publishes to `user:${id}` and `identity.pinged`. Activity and notifications both subscribe to `identity.pinged` — fan-out, no identity imports.

SSE: routers use `subscribeAsync(eventBus, [channel], signal)` and `tracked(event.id, event)` from `@trpc/server`. Filter by `event.type` because `user:${id}` carries several event types.

## Adding a module (checklist)

1. Create the folders above. Copy the shape of `activity` or `notifications` if it is a subscriber; copy `identity` if it owns user-facing commands.
2. Application functions take **ports** (`EventBus`, `Cache`, `ObjectStorage`) as arguments. Do not call `getEventBus()` from inside a use case — context / `start()` injects them.
3. Router: `protectedProcedure` for anything session-scoped. Map domain failures to `TRPCError`.
4. `createXModule()` in `index.ts`. If it listens on the bus, implement `start()` with a `globalThis` unsubscribe guard.
5. Path alias in `tsconfig.json`.
6. Register in `src/server/app.router.ts`:

   ```ts
   const foo = createFooModule();
   foo.start?.({ eventBus: getEventBus(), cache: getCache() });

   export const appRouter = createTRPCRouter({
     // ...
     foo: foo.router,
   });
   ```

7. Client UI in `src/components/<name>/`. Use `useTRPC()` from `@/lib/trpc`, then `trpc.foo.bar.queryOptions()` / `mutationOptions()` / `subscriptionOptions()`. Invalidate with `queryClient.invalidateQueries(trpc.foo.bar.queryFilter())`.
8. Mount the UI from the relevant page (today: `DashboardPanel`).
9. `bun run lint`. Fix Biome import restrictions and depcruise before considering the module done.

## tRPC conventions (this repo)

- Server: `initTRPC` in `src/server/trpc.ts` — SSE ping enabled.
- Client: `@trpc/tanstack-react-query` `createTRPCContext`. **Not** `@trpc/react-query`.
- Links: `splitLink` — subscriptions → `httpSubscriptionLink`, everything else → `httpBatchLink` with `credentials: "include"`.
- Load TanStack intent skills (`server-setup`, `subscriptions`, `react-query-setup`, …) before inventing new tRPC patterns.

## What not to do

- Do not put UI under `src/server/modules/<name>/ui`.
- Do not import `@/server/modules/identity/application/ping` from activity or notifications.
- Do not subscribe to another module’s **internal** cache keys. Subscribe to events; keep your own cache namespace (`activity:user:`, `notifications:user:`).
- Do not add Kafka/RabbitMQ/outbox unless asked. Redis EventBus already `XADD`s for a future worker.
- Do not create a new npm workspace for one module. This is a modular monolith, not a polyrepo.
