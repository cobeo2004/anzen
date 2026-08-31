# Anzen

Next.js 16 modular monolith. Domain and infrastructure live under `src/server` (`common`, `config`, `core`, `infra`, `modules`). `src/app` is the HTTP adapter. UI lives in `src/components`.

## Stack

- **tRPC** queries, mutations, and SSE subscriptions on `/api/trpc`
- **Better Auth** (email/password, optional Google/GitHub)
- **Drizzle** with a dialect factory: SQLite (default), PostgreSQL, MySQL
- **EventBus**, **Cache**, **ObjectStorage** ports — in-memory / disk now; Redis event bus optional; S3 later

## Setup

```bash
cp .env.example .env.local
# set BETTER_AUTH_SECRET to a long random string

bun install
bun run db:migrate
bun dev
```

Open http://localhost:3000 — sign up, then use **Ping** (identity SSE; activity and notifications consume the same EventBus event) and **Upload demo file** (disk storage).

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
| In-memory | `bun run docker:memory` | One Next.js process, SQLite, in-process EventBus |
| Distributed | `bun run docker:distributed` | Nginx → two Next.js replicas, PostgreSQL, Redis EventBus |

Open http://localhost:3000. Distributed ping/SSE goes through Redis so a request that hits replica A still notifies a dashboard connected to replica B. Activity/notifications cache stays per replica (in-memory); the live SSE feeds are the cross-replica demo.

Local `bun dev` infra is unchanged: `docker compose --profile postgres|mysql|redis up -d`.

OAuth: set `GOOGLE_*` / `GITHUB_*`. Callback URLs are `{BETTER_AUTH_URL}/api/auth/callback/google` and `.../github`.

## Providers (swap later)

```
EVENT_BUS_PROVIDER=memory   # redis: docker compose --profile redis up -d, then EVENT_BUS_PROVIDER=redis
EVENT_BUS_URL=redis://127.0.0.1:6379
CACHE_PROVIDER=memory       # redis not implemented
STORAGE_PROVIDER=disk       # s3 not implemented
```

`EVENT_BUS_PROVIDER=memory` fans out inside one Node process. `redis` uses Pub/Sub for live handlers (SSE + module subscribers) and also `XADD`s to streams for a future worker. Identity never calls activity or notifications; both subscribe to `identity.pinged` on the bus.

## Scripts

- `bun run db:generate` / `db:migrate` / `db:studio`
- `bun run lint` — Biome + dependency-cruiser (`bun run arch`)
