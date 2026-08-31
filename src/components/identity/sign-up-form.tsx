"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTRPC } from "@/lib/trpc";
import { authClient } from "./auth-client";

export function SignUpForm() {
  const router = useRouter();
  const trpc = useTRPC();
  const providers = useQuery(trpc.identity.providers.queryOptions());
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const result = await authClient.signUp.email({ name, email, password });
    setPending(false);
    if (result.error) {
      setError(result.error.message ?? "Could not sign up");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="mx-auto flex w-full max-w-sm flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">Create account</h1>
      <form className="flex flex-col gap-3" onSubmit={onSubmit}>
        <label className="flex flex-col gap-1 text-sm">
          Name
          <input
            className="rounded-md border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700"
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Email
          <input
            className="rounded-md border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700"
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Password
          <input
            className="rounded-md border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700"
            type="password"
            minLength={8}
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <button
          className="rounded-md bg-zinc-900 px-3 py-2 text-sm text-white disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
          disabled={pending}
          type="submit"
        >
          {pending ? "Creating…" : "Sign up"}
        </button>
      </form>
      {providers.data?.google || providers.data?.github ? (
        <div className="flex flex-col gap-2">
          {providers.data.google ? (
            <button
              className="rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700"
              type="button"
              onClick={() => authClient.signIn.social({ provider: "google" })}
            >
              Continue with Google
            </button>
          ) : null}
          {providers.data.github ? (
            <button
              className="rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700"
              type="button"
              onClick={() => authClient.signIn.social({ provider: "github" })}
            >
              Continue with GitHub
            </button>
          ) : null}
        </div>
      ) : null}
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Already have an account?{" "}
        <Link className="underline" href="/sign-in">
          Sign in
        </Link>
      </p>
    </div>
  );
}
