# Anzen

Next.js 16 modular monolith. Domain and infrastructure live under `src/server` (`composition`, `common`, `config`, `core`, `infra`, `modules`). `src/app` is the HTTP adapter. UI lives in `src/components`.

## How to read the code

Walk the tree in this order (full guide: [`.docs/reading.md`](./.docs/reading.md)):

1. `src/server/composition/app.router.ts` — mounts modules, calls `start()`
2. `src/server/composition/events.ts` — merged Zod catalogs → `AppEvents`
3. `src/server/modules/identity/domain/events.ts` then `application/ping.ts` — producer
4. `src/server/modules/activity/index.ts` — consumer (`subscribeTo`)
5. `src/server/core/event-bus.ts` — the port
6. `src/app/dashboard/page.tsx` and `src/components/identity/dashboard-panel.tsx` — HTTP → UI

Agent notes for architecture, modules, ports, and local workflow live in [`.docs/`](./.docs/index.md).

## Stack

- **tRPC** queries, mutations, and SSE subscriptions on `/api/trpc`
- **Better Auth** (email/password, optional Google/GitHub)
- **Drizzle** with a dialect factory: SQLite (default), PostgreSQL, MySQL
- **Typed EventBus**, **Cache**, **ObjectStorage** ports — in-memory / disk by default; Redis event bus and S3-compatible storage (RustFS) for distributed Docker

## Setup

```bash
cp .env.example .env.local
# set BETTER_AUTH_SECRET to a long random string

bun install
bun run db:migrate
bun dev
```

Open http://localhost:3000 — sign up, then use **Ping** (identity SSE; activity and notifications consume the same EventBus event) and **Upload demo file** (disk locally; RustFS in distributed Docker).

### Switch database

| Provider | Env | Extra |
| --- | --- | --- |
| SQLite (default) | `DATABASE_PROVIDER=sqlite` `DATABASE_URL=file:./.data/anzen.sqlite` | none |
| PostgreSQL | `DATABASE_PROVIDER=postgresql` `DATABASE_URL=postgres://anzen:anzen@localhost:5432/anzen` | `docker compose --profile postgres up -d` |
| MySQL | `DATABASE_PROVIDER=mysql` `DATABASE_URL=mysql://anzen:anzen@localhost:3306/anzen` | `docker compose --profile mysql up -d` |

Then `bun run db:migrate`.

### Docker

Two production-shaped deployments share the same `Dockerfile`. Stop local `bun dev` first (both bind port 3000).

| Deployment | Command | What runs |
| --- | --- | --- |
| In-memory | `bun run docker:memory` | One Next.js process, SQLite, in-process EventBus, disk storage |
| Distributed | `bun run docker:distributed` | Nginx → two Next.js replicas, PostgreSQL, Redis EventBus, RustFS (S3) |

Open http://localhost:3000. Distributed ping/SSE goes through Redis so a request that hits replica A still notifies a dashboard connected to replica B. Uploads go to RustFS so both replicas share objects; the app still serves them at `/api/files/...` (session required). Activity/notifications cache stays per replica (in-memory); the live SSE feeds are the cross-replica demo.

RustFS console: http://localhost:9001 (`rustfsadmin` / `rustfsadmin`).

Local `bun dev` infra: `docker compose --profile postgres|mysql|redis|rustfs up -d`.

OAuth: set `GOOGLE_*` / `GITHUB_*`. Callback URLs are `{BETTER_AUTH_URL}/api/auth/callback/google` and `.../github`.

## Providers (swap later)

```
EVENT_BUS_PROVIDER=memory   # redis: docker compose --profile redis up -d, then EVENT_BUS_PROVIDER=redis
EVENT_BUS_URL=redis://127.0.0.1:6379
CACHE_PROVIDER=memory       # redis not implemented
STORAGE_PROVIDER=disk       # s3: docker compose --profile rustfs up -d, then STORAGE_PROVIDER=s3
S3_ENDPOINT=http://127.0.0.1:9000
S3_ACCESS_KEY=rustfsadmin
S3_SECRET_KEY=rustfsadmin
S3_BUCKET=anzen
```

`EVENT_BUS_PROVIDER=memory` fans out inside one Node process. `redis` uses Pub/Sub for live handlers (SSE + module subscribers) and also `XADD`s to streams for a future worker. Identity never calls activity or notifications; both `subscribeTo("identity.pinged")` on the typed bus.

`STORAGE_PROVIDER=s3` talks to any S3-compatible API (RustFS, MinIO, AWS). `url()` stays `/api/files/...` so downloads still require a session.

## Scripts

- `bun run db:generate` / `db:migrate`
- `bun run lint` — Biome + dependency-cruiser (`bun run arch`)
- `bunx tsc --noEmit` — types (not part of `lint`)
