import { tracked } from "@trpc/server";
import { subscribeAsync } from "@/server/core/subscribe-async";
import { createTRPCRouter, protectedProcedure } from "@/server/trpc";
import { notificationEvents } from "../application/events";
import { listInbox } from "../application/list-inbox";

export const notificationsRouter = createTRPCRouter({
  inbox: protectedProcedure.query(({ ctx }) =>
    listInbox({
      userId: ctx.session.user.id,
      cache: ctx.cache,
    }),
  ),

  onCreated: protectedProcedure.subscription(async function* (opts) {
    const channel = `user:${opts.ctx.session.user.id}`;
    for await (const event of subscribeAsync(
      opts.ctx.eventBus,
      [channel],
      opts.signal,
    )) {
      if (event.type !== notificationEvents.created) {
        continue;
      }
      yield tracked(event.id, event);
    }
  }),
});
