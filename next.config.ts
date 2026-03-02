import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["better-sqlite3"],
  transpilePackages: ["@servicebot/core", "@servicebot/service", "@servicebot/subsidiaries"],
};

export default nextConfig;
