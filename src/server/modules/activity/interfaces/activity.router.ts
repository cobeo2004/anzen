import { tracked } from "@trpc/server";
import { subscribeAsync } from "@/server/core/subscribe-async";
import { createTRPCRouter, protectedProcedure } from "@/server/trpc";
import { activityEvents } from "../application/events";
import { listRecent } from "../application/list-recent";

export const activityRouter = createTRPCRouter({
  recent: protectedProcedure.query(({ ctx }) =>
    listRecent({
      userId: ctx.session.user.id,
      cache: ctx.cache,
    }),
  ),

  onRecorded: protectedProcedure.subscription(async function* (opts) {
    const channel = `user:${opts.ctx.session.user.id}`;
    for await (const event of subscribeAsync(
      opts.ctx.eventBus,
      [channel],
      opts.signal,
    )) {
      if (event.type !== activityEvents.recorded) {
        continue;
      }
      yield tracked(event.id, event);
    }
  }),
});
