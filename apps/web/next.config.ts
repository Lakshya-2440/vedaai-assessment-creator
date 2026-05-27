import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const appDir = path.dirname(fileURLToPath(import.meta.url));
const backendBaseUrl = (process.env.API_BASE_URL ?? "https://vedaai-api-kztt.onrender.com").replace(/\/+$/, "");

const nextConfig: NextConfig = {
  turbopack: {
    root: appDir,
  },
  async rewrites() {
    return [
      {
        source: "/api/proxy/:path*",
        destination: `${backendBaseUrl}/:path*`,
      },
    ];
  },
};

export default nextConfig;
