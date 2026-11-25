import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "**.run.app",
    "*.run.app",
    "*.asia-east1.run.app",
    "localhost",
    "127.0.0.1",
  ],
  images: {
    unoptimized: true,
  },
  serverExternalPackages: [
    "mongodb",
    "mongoose",
    "@aws-sdk/client-s3",
    "@aws-sdk/s3-request-presigner",
    "express",
  ],
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-DNS-Prefetch-Control", value: "on" },
          { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
  async rewrites() {
    return [
      // Backwards compatibility for legacy Vite asset paths stored in MongoDB
      {
        source: "/src/assets/images/:path*",
        destination: "/images/:path*",
      },
    ];
  },
};

export default nextConfig;
