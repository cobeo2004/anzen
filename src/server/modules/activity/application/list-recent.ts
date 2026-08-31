import type { Cache } from "@/server/core/cache";
import { type ActivityRecord, activityRecentCacheKey } from "./record-ping";

export async function listRecent(input: {
  userId: string;
  cache: Cache;
}): Promise<ActivityRecord[]> {
  return (
    (await input.cache.get<ActivityRecord[]>(
      activityRecentCacheKey(input.userId),
    )) ?? []
  );
}
