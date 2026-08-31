"use client";

import { useQuery } from "@tanstack/react-query";
import { useSubscription } from "@trpc/tanstack-react-query";
import { useState } from "react";
import { useTRPC } from "@/lib/trpc";

type ActivityEvent = {
  id: string;
  type: string;
  payload: unknown;
  occurredAt: string;
};

export function ActivityFeed() {
  const trpc = useTRPC();
  const recent = useQuery(trpc.activity.recent.queryOptions());
  const [live, setLive] = useState<ActivityEvent[]>([]);

  useSubscription(
    trpc.activity.onRecorded.subscriptionOptions(undefined, {
      onData(value) {
        const event =
          value && typeof value === "object" && "data" in value
            ? (value.data as ActivityEvent)
            : (value as ActivityEvent);
        setLive((current) => [event, ...current].slice(0, 20));
      },
    }),
  );

  const rows =
    live.length > 0
      ? live.map((event) => ({
          id: event.id,
          label: `${event.type} · via activity module · ${event.occurredAt}`,
        }))
      : (recent.data ?? []).map((record) => ({
          id: record.id,
          label: `${record.type} · via activity module · ${record.at}`,
        }));

  return (
    <section>
      <h2 className="mb-2 text-sm font-medium uppercase tracking-wide text-zinc-500">
        Activity module (EventBus)
      </h2>
      <p className="mb-2 text-sm text-zinc-600 dark:text-zinc-400">
        Identity publishes <code className="font-mono">identity.pinged</code>.
        This feed is written by the activity module after it consumes that event
        — not by identity calling activity directly.
      </p>
      {recent.isPending && live.length === 0 ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Click Ping — activity records the event over the EventBus.
        </p>
      ) : (
        <ul className="flex flex-col gap-2 font-mono text-sm">
          {rows.map((row) => (
            <li
              className="rounded-md border border-zinc-200 px-3 py-2 dark:border-zinc-800"
              key={row.id}
            >
              {row.label}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
