import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "@/server/app.router";
import { createTRPCContext } from "@/server/trpc";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: () => createTRPCContext({ headers: req.headers }),
  });

export { handler as GET, handler as POST };
