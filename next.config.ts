import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  serverExternalPackages: ["better-sqlite3", "postgres", "mysql2", "redis"],
};

export default nextConfig;
