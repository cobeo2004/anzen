import { toNextJsHandler } from "better-auth/next-js";
import { getAuth } from "@/server/infra/auth/auth";

export const GET = (request: Request) =>
  toNextJsHandler(getAuth()).GET(request);
export const POST = (request: Request) =>
  toNextJsHandler(getAuth()).POST(request);
