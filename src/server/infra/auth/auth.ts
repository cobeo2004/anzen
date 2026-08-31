import "server-only";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { getAppEnv } from "@/server/config/env";
import { getDatabase } from "@/server/infra/database/database.factory";

function createAuth() {
  const env = getAppEnv();
  const { db, betterAuthProvider, schema } = getDatabase();

  return betterAuth({
    secret: env.betterAuthSecret,
    baseURL: env.betterAuthUrl,
    database: drizzleAdapter(db as never, {
      provider: betterAuthProvider,
      schema,
    }),
    emailAndPassword: {
      enabled: true,
    },
    socialProviders: {
      ...(env.googleClientId && env.googleClientSecret
        ? {
            google: {
              clientId: env.googleClientId,
              clientSecret: env.googleClientSecret,
            },
          }
        : {}),
      ...(env.githubClientId && env.githubClientSecret
        ? {
            github: {
              clientId: env.githubClientId,
              clientSecret: env.githubClientSecret,
            },
          }
        : {}),
    },
    plugins: [nextCookies()],
  });
}

const globalForAuth = globalThis as unknown as {
  auth?: ReturnType<typeof createAuth>;
  schema?: Record<string, unknown>;
};

export function getAuth() {
  const { schema } = getDatabase();
  if (globalForAuth.auth && globalForAuth.schema === schema) {
    return globalForAuth.auth;
  }
  const created = createAuth();
  globalForAuth.auth = created;
  globalForAuth.schema = schema;
  return created;
}

export type Session = ReturnType<typeof createAuth>["$Infer"]["Session"];
