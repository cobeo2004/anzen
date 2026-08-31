import type { Cache } from "@/server/core/cache";
import {
  type NotificationRecord,
  notificationInboxCacheKey,
} from "./record-ping";

export async function listInbox(input: {
  userId: string;
  cache: Cache;
}): Promise<NotificationRecord[]> {
  return (
    (await input.cache.get<NotificationRecord[]>(
      notificationInboxCacheKey(input.userId),
    )) ?? []
  );
}
