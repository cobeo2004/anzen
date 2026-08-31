# Anzen — agent knowledge

Read this folder before changing architecture, modules, ports, or composition. Day-to-day commands and local env are in [How to develop](./develop.md). Next.js 16 API details live in `node_modules/next/dist/docs/`.

| Doc | When to read |
| --- | --- |
| [How to develop](./develop.md) | Setup, `bun dev`, env, migrations, Docker, how to verify |
| [Architecture](./architecture.md) | New feature, refactor, “where does this belong?”, diagrams of the monolith |
| [Modules](./modules.md) | Add / change a feature module, EventBus between modules, public API, UI |
| [Shared ports](./shared-ports.md) | New EventBus / Cache / Storage / DB adapter, env, factories |

## What this repo is

A **Next.js 16 modular monolith** on Bun. One deployable app. Feature code is split into modules that talk through **ports** (`src/server/core`) and a shared **EventBus**, not through each other’s internals.

Canonical server code is **`src/server`**. Do not create a parallel `src/core` or `src/infra` at the `src/` root.

## Do this every session

1. Run `bunx @tanstack/intent@latest list` before substantial edits. Load a matching skill before writing tRPC code.
2. Local workflow: [How to develop](./develop.md) (`bun dev`, lint, migrate, verify Ping).
3. After server or import-graph changes: `bun run lint` (Biome + `bun run arch`).
4. Import other modules only via `@/modules/<name>` (or `@/server/modules/<name>`). Never `@/server/modules/<name>/{application,domain,infra,interfaces}/…`.
5. UI lives in `src/components/<module>/`, not inside `src/server/modules`.
6. `src/app` is HTTP only. Domain logic stays in `src/server`.
7. This is Next.js **16.3.3** — read `node_modules/next/dist/docs/` before using Next APIs. Request interception is `src/proxy.ts`, not `middleware.ts`.

## Stack (do not substitute)

| Piece | Use |
| --- | --- |
| Runtime / package manager | Bun `1.3.13` |
| App | Next.js `16.3.3`, React 19, App Router, `runtime = "nodejs"` for API routes |
| API | tRPC **11.18** with `@trpc/tanstack-react-query` (not `@trpc/react-query`) |
| Auth | Better Auth + `@better-auth/drizzle-adapter` |
| Data | Drizzle; SQLite default (`better-sqlite3`), PostgreSQL, MySQL |
| Lint | Biome `2.4.2` + dependency-cruiser (`.dependency-cruiser.cjs`) |
| Style | Tailwind 4 |

## Composition root

Wire new modules and `start()` subscribers in `src/server/app.router.ts`. Factories (`getEventBus`, `getCache`, `getDatabase`, `getObjectStorage`, `getAuth`) live under `src/server/infra`. tRPC context is built in `src/server/trpc.ts`.
