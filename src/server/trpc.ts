import "server-only";
import { initTRPC, TRPCError } from "@trpc/server";
import type { Cache } from "@/server/core/cache";
import type { EventBus } from "@/server/core/event-bus";
import type { ObjectStorage } from "@/server/core/object-storage";
import { getAuth, type Session } from "@/server/infra/auth/auth";
import { getCache } from "@/server/infra/cache/cache.factory";
import { getDatabase } from "@/server/infra/database/database.factory";
import { getEventBus } from "@/server/infra/event-bus/event-bus.factory";
import { getObjectStorage } from "@/server/infra/object-storage/object-storage.factory";

export type TRPCContext = {
  db: unknown;
  session: Session | null;
  eventBus: EventBus;
  cache: Cache;
  storage: ObjectStorage;
};

export async function createTRPCContext(opts: {
  headers: Headers;
}): Promise<TRPCContext> {
  const session = await getAuth().api.getSession({ headers: opts.headers });
  return {
    db: getDatabase().db,
    session,
    eventBus: getEventBus(),
    cache: getCache(),
    storage: getObjectStorage(),
  };
}

const t = initTRPC.context<TRPCContext>().create({
  sse: {
    ping: {
      enabled: true,
      intervalMs: 15_000,
    },
    client: {
      reconnectAfterInactivityMs: 20_000,
    },
  },
});

export const createTRPCRouter = t.router;
export const createCallerFactory = t.createCallerFactory;
export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({
    ctx: {
      ...ctx,
      session: ctx.session,
    },
  });
});
