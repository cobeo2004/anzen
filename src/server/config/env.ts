import { z } from "zod";

export const databaseProviderSchema = z.enum(["sqlite", "postgresql", "mysql"]);
export type DatabaseProvider = z.infer<typeof databaseProviderSchema>;

export const eventBusProviderSchema = z.enum(["memory", "redis"]);
export type EventBusProvider = z.infer<typeof eventBusProviderSchema>;

export const cacheProviderSchema = z.enum(["memory", "redis"]);
export type CacheProvider = z.infer<typeof cacheProviderSchema>;

export const storageProviderSchema = z.enum(["disk", "s3"]);
export type StorageProvider = z.infer<typeof storageProviderSchema>;

function detectDatabaseProvider(url: string): DatabaseProvider {
  if (url.startsWith("postgres://") || url.startsWith("postgresql://")) {
    return "postgresql";
  }
  if (url.startsWith("mysql://") || url.startsWith("mysql2://")) {
    return "mysql";
  }
  return "sqlite";
}

function sqlitePathFromUrl(url: string): string {
  if (url.startsWith("file:")) {
    return url.slice("file:".length);
  }
  return url;
}

export function getDatabaseEnv() {
  const url = process.env.DATABASE_URL ?? "file:./.data/anzen.sqlite";
  const explicit = process.env.DATABASE_PROVIDER;
  const provider = explicit
    ? databaseProviderSchema.parse(explicit)
    : detectDatabaseProvider(url);

  return {
    provider,
    url,
    sqlitePath: sqlitePathFromUrl(url),
  };
}

export function getAppEnv() {
  const database = getDatabaseEnv();
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error(
      "BETTER_AUTH_SECRET must be set to a random string of at least 16 characters",
    );
  }

  return {
    database,
    betterAuthSecret: secret,
    betterAuthUrl: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
    googleClientId: process.env.GOOGLE_CLIENT_ID || undefined,
    googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || undefined,
    githubClientId: process.env.GITHUB_CLIENT_ID || undefined,
    githubClientSecret: process.env.GITHUB_CLIENT_SECRET || undefined,
    eventBusProvider: eventBusProviderSchema.parse(
      process.env.EVENT_BUS_PROVIDER ?? "memory",
    ),
    eventBusUrl: process.env.EVENT_BUS_URL ?? "redis://127.0.0.1:6379",
    cacheProvider: cacheProviderSchema.parse(
      process.env.CACHE_PROVIDER ?? "memory",
    ),
    storageProvider: storageProviderSchema.parse(
      process.env.STORAGE_PROVIDER ?? "disk",
    ),
    storageLocalDir: process.env.STORAGE_LOCAL_DIR ?? ".data/storage",
    s3: readS3Env(),
  };
}

function readS3Env() {
  const endpoint = process.env.S3_ENDPOINT || undefined;
  return {
    endpoint,
    region: process.env.S3_REGION ?? "us-east-1",
    accessKey: process.env.S3_ACCESS_KEY ?? "",
    secretKey: process.env.S3_SECRET_KEY ?? "",
    bucket: process.env.S3_BUCKET ?? "anzen",
    forcePathStyle:
      process.env.S3_FORCE_PATH_STYLE === "false"
        ? false
        : Boolean(endpoint) || process.env.S3_FORCE_PATH_STYLE === "true",
  };
}

export function oauthProvidersEnabled() {
  const env = getAppEnv();
  return {
    google: Boolean(env.googleClientId && env.googleClientSecret),
    github: Boolean(env.githubClientId && env.githubClientSecret),
  };
}
