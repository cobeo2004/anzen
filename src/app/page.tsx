import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-16">
      <main className="flex w-full max-w-lg flex-col gap-6">
        <p className="text-sm uppercase tracking-wide text-zinc-500">Anzen</p>
        <h1 className="text-3xl font-semibold tracking-tight">
          Modular monolith
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          Postgres, MySQL, or SQLite via a database factory. In-memory event bus
          and cache, disk object storage, Better Auth, and tRPC SSE — all under{" "}
          <code className="rounded bg-zinc-100 px-1 py-0.5 font-mono text-sm dark:bg-zinc-900">
            src/server
          </code>
          .
        </p>
        <div className="flex gap-3">
          <Link
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm text-white dark:bg-zinc-100 dark:text-zinc-900"
            href="/sign-in"
          >
            Sign in
          </Link>
          <Link
            className="rounded-md border border-zinc-300 px-4 py-2 text-sm dark:border-zinc-700"
            href="/sign-up"
          >
            Sign up
          </Link>
          <Link
            className="rounded-md border border-zinc-300 px-4 py-2 text-sm dark:border-zinc-700"
            href="/dashboard"
          >
            Dashboard
          </Link>
        </div>
      </main>
    </div>
  );
}
