"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSubscription } from "@trpc/tanstack-react-query";
import { useState } from "react";
import { ActivityFeed } from "@/components/activity/activity-feed";
import { NotificationInbox } from "@/components/notifications/notification-inbox";
import { useTRPC } from "@/lib/trpc";
import { authClient } from "./auth-client";

type PingEvent = {
  id: string;
  type: string;
  payload: unknown;
  occurredAt: string;
};

type UploadedFile = {
  key: string;
  filename: string;
  contentType: string;
  url: string;
};

function isImage(file: UploadedFile) {
  return (
    file.contentType.startsWith("image/") ||
    /\.(png|jpe?g|gif|webp|svg)$/i.test(file.filename)
  );
}

function isPdf(file: UploadedFile) {
  return (
    file.contentType === "application/pdf" || /\.pdf$/i.test(file.filename)
  );
}

function FilePreview({ file }: { file: UploadedFile }) {
  return (
    <li className="flex flex-col gap-3 rounded-md border border-zinc-200 p-3 dark:border-zinc-800">
      <div className="flex items-center justify-between gap-3">
        <p className="truncate text-sm font-medium">{file.filename}</p>
        <a
          className="shrink-0 text-sm underline"
          href={file.url}
          rel="noreferrer"
          target="_blank"
        >
          Open
        </a>
      </div>
      {isImage(file) ? (
        // biome-ignore lint/performance/noImgElement: preview of user-uploaded files, not a static asset
        <img
          alt={file.filename}
          className="max-h-80 w-full rounded-sm object-contain bg-zinc-50 dark:bg-zinc-900"
          src={file.url}
        />
      ) : isPdf(file) ? (
        <iframe
          className="h-112 w-full rounded-sm bg-zinc-50 dark:bg-zinc-900"
          src={file.url}
          title={file.filename}
        />
      ) : (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Preview is not available for this file type.
        </p>
      )}
    </li>
  );
}

export function DashboardPanel() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const me = useQuery(trpc.identity.me.queryOptions());
  const files = useQuery(trpc.identity.files.queryOptions());
  const ping = useMutation(
    trpc.identity.ping.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries(trpc.identity.me.queryFilter());
        void queryClient.invalidateQueries(trpc.activity.recent.queryFilter());
        void queryClient.invalidateQueries(
          trpc.notifications.inbox.queryFilter(),
        );
      },
    }),
  );
  const upload = useMutation(
    trpc.identity.uploadDemo.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries(trpc.identity.files.queryFilter());
      },
    }),
  );
  const [events, setEvents] = useState<PingEvent[]>([]);

  useSubscription(
    trpc.identity.onPinged.subscriptionOptions(undefined, {
      onData(value) {
        const event =
          value && typeof value === "object" && "data" in value
            ? (value.data as PingEvent)
            : (value as PingEvent);
        setEvents((current) => [event, ...current].slice(0, 20));
      },
    }),
  );

  async function onUpload(fileList: FileList | null) {
    const file = fileList?.[0];
    if (!file) {
      return;
    }
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (const byte of bytes) {
      binary += String.fromCharCode(byte);
    }
    const dataBase64 = btoa(binary);
    await upload.mutateAsync({
      filename: file.name,
      contentType: file.type || "application/octet-stream",
      dataBase64,
    });
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {me.data
              ? `Signed in as ${me.data.user.email}`
              : me.isPending
                ? "Loading…"
                : "Could not load session"}
          </p>
          {me.data?.lastPing ? (
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Last ping (cache): {me.data.lastPing.at}
            </p>
          ) : null}
        </div>
        <button
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700"
          type="button"
          onClick={() =>
            authClient.signOut({
              fetchOptions: { onSuccess: () => location.assign("/") },
            })
          }
        >
          Sign out
        </button>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          className="rounded-md bg-zinc-900 px-3 py-2 text-sm text-white disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
          disabled={ping.isPending}
          type="button"
          onClick={() => ping.mutate()}
        >
          {ping.isPending ? "Pinging…" : "Ping"}
        </button>
        <label className="rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700">
          Upload demo file
          <input
            className="hidden"
            type="file"
            onChange={(event) => {
              void onUpload(event.target.files);
              event.target.value = "";
            }}
          />
        </label>
      </div>

      {upload.error ? (
        <p className="text-sm text-red-600">{upload.error.message}</p>
      ) : null}

      <section>
        <h2 className="mb-2 text-sm font-medium uppercase tracking-wide text-zinc-500">
          Uploaded files
        </h2>
        {files.isPending ? (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">Loading…</p>
        ) : files.data && files.data.length > 0 ? (
          <ul className="flex flex-col gap-3">
            {files.data.map((file) => (
              <FilePreview file={file} key={file.key} />
            ))}
          </ul>
        ) : (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Upload a file to preview it here.
          </p>
        )}
      </section>

      <ActivityFeed />

      <NotificationInbox />

      <section>
        <h2 className="mb-2 text-sm font-medium uppercase tracking-wide text-zinc-500">
          Live ping events
        </h2>
        {events.length === 0 ? (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Click Ping — events arrive over tRPC SSE.
          </p>
        ) : (
          <ul className="flex flex-col gap-2 font-mono text-sm">
            {events.map((event) => (
              <li
                className="rounded-md border border-zinc-200 px-3 py-2 dark:border-zinc-800"
                key={event.id}
              >
                {event.type} · {event.occurredAt}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
