import { tracked } from "@trpc/server";
import {
  createTRPCRouter,
  protectedProcedure,
} from "@/server/composition/trpc";
import { subscribeAsync } from "@/server/core/subscribe-async";
import { listInbox } from "../application/list-inbox";
import { notificationEvents } from "../domain/events";

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
