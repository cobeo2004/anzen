# How to read the code

Start here if you are new to the tree. This is a walking order, not an encyclopedia. After this page: [architecture](./architecture.md) for diagrams, [modules](./modules.md) to add a feature, [shared ports](./shared-ports.md) to add an adapter, [develop](./develop.md) to run it.

Canonical server code is **`src/server`**. There is no `src/core` or `src/infra` at the `src/` root.

## Ten minutes

Read these files in order. Do not skip around on the first pass.

| # | File | Why |
| --- | --- | --- |
| 1 | `src/server/composition/app.router.ts` | Mounts modules and calls `start()`. This is the composition root. |
| 2 | `src/server/composition/events.ts` | Merges each module’s Zod catalog into `AppEvents`. |
| 3 | `src/server/modules/identity/domain/events.ts` | A producer’s contract: event name + payload schema. |
| 4 | `src/server/modules/identity/application/ping.ts` | Publishes `identity.pinged` onto the typed bus. |
| 5 | `src/server/modules/activity/index.ts` | A consumer: `subscribeTo("identity.pinged", …)` in `start()`. |
| 6 | `src/server/core/event-bus.ts` | The port: `publish`, `subscribe`, `subscribeTo`. |
| 7 | `src/app/dashboard/page.tsx` then `src/components/identity/dashboard-panel.tsx` | HTTP page → client UI that calls tRPC. |

After that, you have seen a command, an event, a subscriber, and the UI. Everything else is the same pattern repeated.

## Map

```
src/
  app/                 Next.js pages + Route Handlers. No domain logic.
  components/<module>/ Client UI for that module.
  lib/trpc/            Browser tRPC + React Query.
  proxy.ts             Cookie redirects (Next 16 — not middleware.ts).
  server/
    index.ts           Re-exports composition (`getApp`, `AppRouter`, `getAppEventBus`).
    composition/       The only place that knows every module.
    config/            Zod env.
    common/            Tiny shared errors.
    core/              Ports. No adapters, no modules, no composition.
    infra/             Adapters + factories. No modules, no composition.
    modules/<name>/    One feature. Talks to other features only via EventBus.
```

Aliases:

- `@/*` → `src/*`
- `@/modules/identity` → `src/server/modules/identity/index.ts` (same for activity, notifications)

## Composition vs a module

**Composition** (`src/server/composition/`) is the app assembling parts:

- `app.router.ts` — `createXModule()`, `start()`, `createTRPCRouter({ identity, activity, notifications })`
- `trpc.ts` — context `{ db, session, eventBus, cache, storage }`; `eventBus` is `EventBus<AppEvents>`
- `events.ts` — spread of catalogs → `AppEvents`
- `typed-event-bus.ts` — Zod `parse` on publish, `safeParse` on subscribe
- `app-event-bus.ts` — `getAppEventBus()` wraps the infra bus once on `globalThis`

**A module** does not import `AppEvents`. Producers/consumers take `EventBus<TEvents extends ThisModuleEvents & OtherModuleEvents>`. Composition passes `getAppEventBus()`; TypeScript infers `TEvents` as `AppEvents`.

Composition imports event catalogs from **`contract.ts`**, not from `index.ts`. `index.ts` pulls the tRPC router, which pulls `composition/trpc.ts`, which needs `AppEvents`. Importing `index.ts` from `events.ts` would cycle.

## One ping, end to end

```
UI (dashboard Ping)
  → identity.ping mutation
      → ping() publishes identity.pinged
         channels: ["user:<id>", "identity.pinged"]
  → activity.start() subscribeTo("identity.pinged")
      → writes activity cache, publishes activity.recorded on user:<id>
  → notifications.start() subscribeTo("identity.pinged")
      → writes notifications cache, publishes notifications.created on user:<id>
  → identity.onPinged / activity.onRecorded / notifications.onCreated
      SSE subscribeAsync on user:<id>, filter by event.type
```

Identity never imports activity or notifications. Consumers import **`@/modules/identity`** for `identityEvents` and payload types only.

`subscribeTo(type, handler)` is what module `start()` uses. SSE uses `subscribe(channels)` via `subscribeAsync` because the browser listens on `user:<id>`, which carries several event types.

## Two buses (do not mix them up)

| Function | Where | Typed? |
| --- | --- | --- |
| `getEventBus()` | `src/server/infra/event-bus/event-bus.factory.ts` | No — adapter (`memory` / `redis`) |
| `getAppEventBus()` | `src/server/composition/app-event-bus.ts` | Yes — Zod catalog, `EventBus<AppEvents>` |

Use cases and `start()` receive the bus as an argument. They must not call either factory. Context and `app.router.ts` inject `getAppEventBus()`.

## Inside a module

```
src/server/modules/<name>/
  index.ts           createXModule + re-export contract (other modules import this)
  contract.ts        Re-export of domain/events only (composition imports this)
  domain/events.ts   Names, Zod payloads, catalog, `XEvents` type
  application/       Use cases. Take ports as arguments.
  interfaces/        tRPC router. Thin. Imports `@/server/composition/trpc`.
  infra/             Optional, private to this module
```

UI for the same feature is **`src/components/<name>/`**, not under `src/server/modules`.

## Where to look next

| You want to… | Open |
| --- | --- |
| Add a procedure | `modules/<name>/interfaces/<name>.router.ts`, then the use case in `application/` |
| Add an event | `modules/<name>/domain/events.ts`, re-export via `contract.ts` / `index.ts`. Composition picks it up via the catalog spread. |
| Subscribe to another module | Other module’s `index.ts` for names/types. `subscribeTo` in your `start()`. Never import their `application/`. |
| Swap Redis / S3 / Postgres | `src/server/infra/<area>/*.factory.ts` and `src/server/config/env.ts` |
| Change tRPC context | `src/server/composition/trpc.ts` |
| Change auth / proxy | `src/server/infra/auth/auth.ts`, `src/proxy.ts` |
| HTTP only | `src/app/**` |

## Import rules (one table)

| From | May import | Must not import |
| --- | --- | --- |
| Module A | `@/modules/B` (public API), `core`, `config`, `composition/trpc` | B’s `application` / `domain` / `infra` / `interfaces` |
| Composition | `@/server/modules/<name>` (createXModule), `<name>/contract.ts` | Module `application` / `interfaces` |
| Infra | `core`, `config` | Modules, composition |
| Core | nothing in server except itself | Infra, modules, config, composition |
| `src/app`, `src/components` | `@/lib/trpc`, `@/components/*`, composition types (`AppRouter`) | Module internals, `core` ports from the browser |

`bun run lint` = Biome `noRestrictedImports` + `bun run arch` (dependency-cruiser). A red arch run is a broken PR.

## Do not

- Create `src/core` or `src/infra` beside `src/app`.
- Import `AppEvents` from a feature module so it can “see all events”. Constrain `TEvents extends …` instead.
- Call `getEventBus()` from a use case or `start()`.
- Point `url()` at a raw S3 URL. It stays `/api/files/...`.
- Add Kafka, RabbitMQ, or an outbox unless the product asks. Redis already `XADD`s.
