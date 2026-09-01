import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  serverExternalPackages: [
    "better-sqlite3",
    "postgres",
    "mysql2",
    "redis",
    "@aws-sdk/client-s3",
  ],
};

export default nextConfig;
