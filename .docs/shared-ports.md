# Shared ports and adapters

“Shared packages” in this repo are **in-tree layers**, not published npm packages:

| Layer | Path | Role |
| --- | --- | --- |
| Config | `src/server/config` | Env parsing (`getAppEnv`, `getDatabaseEnv`) |
| Common | `src/server/common` | Tiny shared types (`AppError`) |
| Core | `src/server/core` | Ports: interfaces + `createDomainEvent` / `createId` / `subscribeAsync` |
| Infra | `src/server/infra` | Adapters + factories + Better Auth |

Modules depend on **core types** and receive **adapter instances** via tRPC context or `start()`. Infra must not import modules. Core must not import infra, modules, or config.

When a port eventually moves to a real package, keep this split: package exports the interface; this app’s `infra` implements it.

## Ports today

| Port | File | Methods | Default adapter | Other |
| --- | --- | --- | --- | --- |
| `EventBus` | `core/event-bus.ts` | `publish`, `subscribe` | `InMemoryEventBus` | `RedisEventBus` |
| `Cache` | `core/cache.ts` | `get`, `set`, `del` | `InMemoryCache` | `redis` env exists, factory throws |
| `ObjectStorage` | `core/object-storage.ts` | `put`, `get`, `list`, `delete`, `url` | `DiskObjectStorage` | `S3ObjectStorage` (RustFS, MinIO, AWS) |
| Database | not a port type | `getDatabase()` | SQLite | PostgreSQL, MySQL via Drizzle |

Handlers on `EventBus` may return `void` or `Promise<void>`. In-memory bus **awaits** them. Redis bus fires-and-forgets promise rejections to `console.error`.

`url(key)` for storage must stay an app-relative `/api/files/...` path so `src/app/api/files/[...key]/route.ts` can enforce session. Do not switch the demo UI to raw S3 URLs without an auth story.

## Adding or extending an adapter

Work **down** from the port. Do not grow the port for one backend.

1. Implement the existing interface in `src/server/infra/<area>/`.
2. Switch in the factory (`*.factory.ts`). Cache the instance on `globalThis` (required for Next HMR and for multi-replica Redis).
3. Extend the Zod enum in `src/server/config/env.ts` only if you introduce a **new provider name**. Prefer reusing `s3` / `redis` with extra env (`S3_ENDPOINT`, `EVENT_BUS_URL`) over `STORAGE_PROVIDER=rustfs`.
4. Document env in `.env.example` and `README.md`.
5. If the client is native or must stay external to the bundler, add it to `serverExternalPackages` in `next.config.ts`.
6. Optional: Docker Compose profile in `docker-compose.yml` for local `bun dev`, or a service in `compose.distributed.yml` for shared infrastructure.
7. `bun run lint`.

### EventBus

- Memory: `infra/event-bus/in-memory.bus.ts`
- Redis: `infra/event-bus/redis.bus.ts` — `PUBLISH anzen:{channel}` + `XADD anzen:stream:{channel}` (`MAXLEN ~1000`)
- Local Redis: `docker compose --profile redis up -d`, then `EVENT_BUS_PROVIDER=redis`

### Cache

Redis provider is reserved in env. Implement `infra/cache/redis.cache.ts` against the `Cache` interface when needed. Do not make modules talk to Redis directly.

### ObjectStorage

Disk writes under `STORAGE_LOCAL_DIR` (default `.data/storage`) plus sidecar `.meta.json` for content type. `STORAGE_PROVIDER=s3` uses `@aws-sdk/client-s3` against any S3-compatible endpoint (RustFS in distributed Docker, MinIO, or AWS). The factory creates the bucket if missing, uses path-style URLs when `S3_ENDPOINT` is set, and keeps `url()` on `/api/files`.

### Database

`getDatabase()` returns `{ provider, betterAuthProvider, db, schema }`. Schemas are duplicated per dialect so Drizzle types stay honest. Auth tables must stay in sync across `sqlite` / `postgresql` / `mysql` (including `account.issuer` and `account_issuer_accountId_uidx`).

After schema edits:

```bash
bun run db:generate
bun run db:migrate
```

`drizzle.config.ts` uses `DATABASE_PROVIDER` / `DATABASE_URL`. SQLite URLs look like `file:./.data/anzen.sqlite`.

## Env map

| Variable | Role |
| --- | --- |
| `DATABASE_PROVIDER` | `sqlite` \| `postgresql` \| `mysql` (else inferred from URL) |
| `DATABASE_URL` | Connection string or `file:…` |
| `BETTER_AUTH_SECRET` | Required, ≥ 16 chars |
| `BETTER_AUTH_URL` | Auth base URL |
| `GOOGLE_*` / `GITHUB_*` | Optional OAuth; both id and secret required to enable |
| `EVENT_BUS_PROVIDER` | `memory` \| `redis` |
| `EVENT_BUS_URL` | Redis URL |
| `CACHE_PROVIDER` | `memory` \| `redis` (redis not implemented) |
| `STORAGE_PROVIDER` | `disk` \| `s3` |
| `STORAGE_LOCAL_DIR` | Disk root |
| `S3_ENDPOINT` | S3-compatible API (RustFS `http://127.0.0.1:9000` / `http://rustfs:9000`) |
| `S3_ACCESS_KEY` / `S3_SECRET_KEY` | Required when `STORAGE_PROVIDER=s3` |
| `S3_BUCKET` | Default `anzen` |
| `S3_REGION` | Default `us-east-1` |
| `S3_FORCE_PATH_STYLE` | Default true when `S3_ENDPOINT` is set |

## Docker

| File | Use |
| --- | --- |
| `docker-compose.yml` | Local infra profiles: `postgres`, `mysql`, `redis`, `rustfs` |
| `compose.memory.yml` | One app, SQLite, in-memory bus, disk storage — `bun run docker:memory` |
| `compose.distributed.yml` | Postgres + Redis + RustFS + two app replicas + nginx — `bun run docker:distributed` |

Do not add new brokers (Kafka, RabbitMQ) or an outbox in those compose files unless the product asks for them.

## Checklist for a new shared capability

- [ ] Port in `core` is still the contract (new method only if **every** adapter needs it)
- [ ] One adapter file, one factory branch, env documented
- [ ] Modules still depend on the port type, not the class
- [ ] `serverExternalPackages` updated if required
- [ ] Replicas: if the adapter is in-memory, document that it will not sync across `app-1` / `app-2`
