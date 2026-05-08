import type { NextConfig } from "next";

const backend = process.env.NEXT_BACKEND_ORIGIN?.trim()?.replace(/\/$/, "");

const nextConfig: NextConfig = {
  reactCompiler: true,
  env: {
    NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
  },
  async rewrites() {
    if (!backend) {
      return [];
    }
    return [
      {
        source: "/api/:path*",
        destination: `${backend}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
