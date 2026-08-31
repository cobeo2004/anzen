import type { Cache } from "@/server/core/cache";
import { lastPingCacheKey } from "./ping";

export async function getMe(input: {
  user: { id: string; name: string; email: string; image?: string | null };
  cache: Cache;
}) {
  const lastPing = await input.cache.get<{ at: string }>(
    lastPingCacheKey(input.user.id),
  );
  return {
    user: {
      id: input.user.id,
      name: input.user.name,
      email: input.user.email,
      image: input.user.image ?? null,
    },
    lastPing: lastPing ?? null,
  };
}
