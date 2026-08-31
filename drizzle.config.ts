import { loadEnvConfig } from "@next/env";
import { defineConfig } from "drizzle-kit";
import { getDatabaseEnv } from "./src/server/config/env";

loadEnvConfig(process.cwd());

const { provider, url, sqlitePath } = getDatabaseEnv();

const dialect =
  provider === "postgresql"
    ? "postgresql"
    : provider === "mysql"
      ? "mysql"
      : "sqlite";

export default defineConfig({
  dialect,
  schema: `./src/server/infra/database/schema/${provider}.ts`,
  out: `./drizzle/${provider}`,
  dbCredentials: provider === "sqlite" ? { url: sqlitePath } : { url },
});
