import { TRPCError, tracked } from "@trpc/server";
import { z } from "zod";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "@/server/composition/trpc";
import { oauthProvidersEnabled } from "@/server/config/env";
import { subscribeAsync } from "@/server/core/subscribe-async";
import { listUploads } from "../application/list-uploads";
import { getMe } from "../application/me";
import { ping } from "../application/ping";
import { uploadDemo } from "../application/upload-demo";
import { identityEvents } from "../domain/events";

export const identityRouter = createTRPCRouter({
  providers: publicProcedure.query(() => oauthProvidersEnabled()),

  me: protectedProcedure.query(({ ctx }) =>
    getMe({
      user: ctx.session.user,
      cache: ctx.cache,
    }),
  ),

  ping: protectedProcedure.mutation(({ ctx }) =>
    ping({
      userId: ctx.session.user.id,
      eventBus: ctx.eventBus,
      cache: ctx.cache,
    }),
  ),

  files: protectedProcedure.query(({ ctx }) =>
    listUploads({
      userId: ctx.session.user.id,
      storage: ctx.storage,
    }),
  ),

  uploadDemo: protectedProcedure
    .input(
      z.object({
        filename: z.string().min(1).max(200),
        contentType: z.string().max(120).default("application/octet-stream"),
        dataBase64: z.string().min(1).max(700_000),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await uploadDemo({
          userId: ctx.session.user.id,
          filename: input.filename,
          contentType: input.contentType,
          dataBase64: input.dataBase64,
          storage: ctx.storage,
        });
      } catch (error) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: error instanceof Error ? error.message : "Upload failed",
        });
      }
    }),

  onPinged: protectedProcedure.subscription(async function* (opts) {
    const channel = `user:${opts.ctx.session.user.id}`;
    for await (const event of subscribeAsync(
      opts.ctx.eventBus,
      [channel],
      opts.signal,
    )) {
      if (event.type !== identityEvents.pinged) {
        continue;
      }
      yield tracked(event.id, event);
    }
  }),
});
