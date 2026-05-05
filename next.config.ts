import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        // When you call /api/proxy/attendance/login...
        source: "/api/proxy/:path*",
        // ...it actually fetches from the real backend
        destination: "https://api.buannelstudio.in/api/:path*",
      },
    ];
  },
};

export default nextConfig;
