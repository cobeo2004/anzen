# How to develop

Day-to-day loop for humans and coding agents. Architecture and module rules are in the sibling docs; this page is commands, env, and local pitfalls.

## Prerequisites

- **Bun `1.3.13`** (`packageManager` in `package.json`). Use this version, not npm/yarn/pnpm.
- Docker only if you need Postgres, MySQL, Redis, or the production-shaped compose files.

## First run

```bash
cp .env.example .env.local
# set BETTER_AUTH_SECRET to ≥ 16 random characters

bun install
bun run db:migrate
bun dev
```

App: http://localhost:3000. Sign up, open **Dashboard**, **Ping**, optionally upload a file.

`.env.local` is gitignored. Next loads it automatically. `drizzle.config.ts` also loads Next env via `loadEnvConfig`.

Default local stack: SQLite at `.data/anzen.sqlite`, in-memory EventBus, in-memory cache, disk storage under `.data/storage`.

## Daily commands

| Command | What it does |
| --- | --- |
| `bun dev` | Next 16 dev server (Turbopack), http://localhost:3000 |
| `bun run lint` | Biome + `bun run arch` (dependency-cruiser). Run after server or import-graph edits |
| `bun run format` | Biome format write |
| `bun run arch` | Import-boundary check only |
| `bunx tsc --noEmit` | Types. Not wired into `lint`; run when touching tRPC context or public APIs |
| `bun run build` | Production build (needed before `bun start` or Docker image) |
| `bun run db:generate` | Drizzle SQL from `src/server/infra/database/schema/<provider>.ts` |
| `bun run db:migrate` | Apply `drizzle/<provider>/` |

There is no `db:studio` script. Inspect SQLite with any SQLite client on `.data/anzen.sqlite`.

## Where local state lives

| Path | Contents |
| --- | --- |
| `.env.local` | Secrets and provider switches |
| `.data/anzen.sqlite` | Default DB |
| `.data/storage/` | Disk object storage |
| `.next/` | Dev/build cache |

All of `.data/` is gitignored. Deleting `.data` resets the local database and uploads.

## Env switches (keep `bun dev`)

Edit `.env.local`, restart `bun dev` after provider changes (factories read env at process start).

### Database

| Provider | `.env.local` | Infra |
| --- | --- | --- |
| SQLite (default) | `DATABASE_PROVIDER=sqlite` `DATABASE_URL=file:./.data/anzen.sqlite` | none |
| PostgreSQL | `DATABASE_PROVIDER=postgresql` `DATABASE_URL=postgres://anzen:anzen@localhost:5432/anzen` | `docker compose --profile postgres up -d` |
| MySQL | `DATABASE_PROVIDER=mysql` `DATABASE_URL=mysql://anzen:anzen@localhost:3306/anzen` | `docker compose --profile mysql up -d` |

Then `bun run db:migrate` for **that** dialect (`drizzle.config.ts` writes to `drizzle/<provider>/`). Schema files are per dialect — change all three when auth/tables change.

### Event bus

```
EVENT_BUS_PROVIDER=memory          # default; one Node process
EVENT_BUS_PROVIDER=redis
EVENT_BUS_URL=redis://127.0.0.1:6379
```

Redis locally: `docker compose --profile redis up -d`, then set provider to `redis` and restart `bun dev`.

`CACHE_PROVIDER=redis` and `STORAGE_PROVIDER=s3` are reserved and **throw** in the factories. Leave them `memory` / `disk`.

### Auth / OAuth

`BETTER_AUTH_URL` must match the origin you open in the browser (`http://localhost:3000`). OAuth is off until both id and secret are set. Callbacks:

- `{BETTER_AUTH_URL}/api/auth/callback/google`
- `{BETTER_AUTH_URL}/api/auth/callback/github`

## Verify a change

1. `bun run lint` (and `bunx tsc --noEmit` if types moved).
2. Exercise the path in the browser (or curl). UI/SSE/auth is not proven by lint.
3. **Ping** on `/dashboard`: identity live events, activity feed, and notifications feed should all update. That is the EventBus smoke test.
4. Upload still goes through `/api/files/...` while signed in (401 without a session).

If you changed EventBus behavior, test **both** `memory` (default `bun dev`) and `redis` (compose profile + env) when the change is bus-related.

## Docker (not the inner loop)

Stop `bun dev` first — both bind port **3000**.

| Command | Shape |
| --- | --- |
| `bun run docker:memory` | One container, SQLite, in-memory bus |
| `bun run docker:distributed` | Nginx → `app-1` + `app-2`, Postgres, Redis bus, shared disk volume |

Distributed: live SSE crosses replicas via Redis. Activity/notifications **lists** stay in per-process memory cache.

`docker-compose.yml` is **infra only** for `bun dev` (profiles `postgres`, `mysql`, `redis`). Do not use it to run the Next app.

## Schema / migration workflow

1. Edit `src/server/infra/database/schema/{sqlite,postgresql,mysql}.ts` together.
2. Point `.env.local` at the dialect you are generating for.
3. `bun run db:generate` then `bun run db:migrate`.
4. Repeat generate/migrate for other dialects before considering the change done.

Better Auth 1.7 requires `account.issuer` and unique `(issuer, accountId)`. Do not drop those.

## Agent / HMR pitfalls

- Factories and `module.start()` use `globalThis` so Turbopack HMR does not open a second Redis subscriber or a second SQLite handle. If a subscriber “never fires” after a hot reload, restart `bun dev`.
- `BETTER_AUTH_SECRET` missing or shorter than 16 characters crashes `getAppEnv()` on first server import — looks like a random 500 on `/api/auth` or `/api/trpc`.
- Next 16 request interception is `src/proxy.ts`, not `middleware.ts`. Read `node_modules/next/dist/docs/` before adding Next APIs.
- Do not commit `.env.local`, `.data/`, or `.next/`.

## Suggested inner loop

```bash
bun dev                  # leave running
# edit src/server or src/components
bun run lint             # another terminal
# browser: dashboard Ping / upload
```

Load TanStack intent skills before writing tRPC. Add modules and adapters as described in [modules.md](./modules.md) and [shared-ports.md](./shared-ports.md).
