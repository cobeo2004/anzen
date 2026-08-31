"use client";

import { useQuery } from "@tanstack/react-query";
import { useSubscription } from "@trpc/tanstack-react-query";
import { useState } from "react";
import { useTRPC } from "@/lib/trpc";

type NotificationEvent = {
  id: string;
  type: string;
  payload: unknown;
  occurredAt: string;
};

export function NotificationInbox() {
  const trpc = useTRPC();
  const inbox = useQuery(trpc.notifications.inbox.queryOptions());
  const [live, setLive] = useState<NotificationEvent[]>([]);

  useSubscription(
    trpc.notifications.onCreated.subscriptionOptions(undefined, {
      onData(value) {
        const event =
          value && typeof value === "object" && "data" in value
            ? (value.data as NotificationEvent)
            : (value as NotificationEvent);
        setLive((current) => [event, ...current].slice(0, 20));
      },
    }),
  );

  const rows =
    live.length > 0
      ? live.map((event) => ({
          id: event.id,
          label: `${event.type} · via notifications module · ${event.occurredAt}`,
        }))
      : (inbox.data ?? []).map((record) => ({
          id: record.id,
          label: `${record.message} · ${record.at}`,
        }));

  return (
    <section>
      <h2 className="mb-2 text-sm font-medium uppercase tracking-wide text-zinc-500">
        Notifications module (EventBus)
      </h2>
      <p className="mb-2 text-sm text-zinc-600 dark:text-zinc-400">
        A second consumer of <code className="font-mono">identity.pinged</code>.
        Identity never imports this module — both activity and notifications
        subscribe on the same EventBus (in-memory or Redis).
      </p>
      {inbox.isPending && live.length === 0 ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Click Ping — notifications records the event over the EventBus.
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
