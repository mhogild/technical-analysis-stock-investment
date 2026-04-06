import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    const backendUrl = process.env.BACKEND_URL;
    if (!backendUrl) return [];
    return [
      {
        source: "/api/saxo/:path*",
        destination: `${backendUrl}/api/saxo/:path*`,
      },
    ];
  },
};

export default nextConfig;
