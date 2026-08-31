import { getAppEnv } from "@/server/config/env";
import type { Cache } from "@/server/core/cache";
import { InMemoryCache } from "./in-memory.cache";

const globalForCache = globalThis as unknown as {
  cache?: Cache;
};

export function getCache(): Cache {
  if (globalForCache.cache) {
    return globalForCache.cache;
  }

  const { cacheProvider } = getAppEnv();
  if (cacheProvider === "redis") {
    throw new Error(
      "CACHE_PROVIDER=redis is not implemented yet. Use memory for now.",
    );
  }

  const cache = new InMemoryCache();
  globalForCache.cache = cache;
  return cache;
}
