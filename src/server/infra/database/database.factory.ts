import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import Database from "better-sqlite3";
import { drizzle as drizzleSqlite } from "drizzle-orm/better-sqlite3";
import { drizzle as drizzleMysql } from "drizzle-orm/mysql2";
import { drizzle as drizzlePostgres } from "drizzle-orm/postgres-js";
import mysql from "mysql2/promise";
import postgres from "postgres";
import type { DatabaseProvider } from "@/server/config/env";
import { getDatabaseEnv } from "@/server/config/env";
import * as mysqlSchema from "./schema/mysql";
import * as postgresqlSchema from "./schema/postgresql";
import * as sqliteSchema from "./schema/sqlite";

export type BetterAuthDrizzleProvider = "sqlite" | "pg" | "mysql";

export type DatabaseHandle = {
  provider: DatabaseProvider;
  betterAuthProvider: BetterAuthDrizzleProvider;
  db: unknown;
  schema: Record<string, unknown>;
};

const globalForDatabase = globalThis as unknown as {
  sqlite?: InstanceType<typeof Database>;
  postgres?: ReturnType<typeof postgres>;
  mysql?: ReturnType<typeof mysql.createPool>;
};

export function getDatabase(): DatabaseHandle {
  const { provider, url, sqlitePath } = getDatabaseEnv();

  if (provider === "sqlite") {
    mkdirSync(dirname(sqlitePath), { recursive: true });
    globalForDatabase.sqlite ??= new Database(sqlitePath);
    return {
      provider: "sqlite",
      betterAuthProvider: "sqlite",
      db: drizzleSqlite(globalForDatabase.sqlite, { schema: sqliteSchema }),
      schema: sqliteSchema,
    };
  }

  if (provider === "postgresql") {
    globalForDatabase.postgres ??= postgres(url, { max: 10 });
    return {
      provider: "postgresql",
      betterAuthProvider: "pg",
      db: drizzlePostgres(globalForDatabase.postgres, {
        schema: postgresqlSchema,
      }),
      schema: postgresqlSchema,
    };
  }

  globalForDatabase.mysql ??= mysql.createPool(url);
  return {
    provider: "mysql",
    betterAuthProvider: "mysql",
    db: drizzleMysql(globalForDatabase.mysql, {
      schema: mysqlSchema,
      mode: "default",
    }),
    schema: mysqlSchema,
  };
}
