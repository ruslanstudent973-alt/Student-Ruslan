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
    "web-push",
  ],
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
      {
        source: "/manifest.json",
        headers: [
          { key: "Content-Type", value: "application/manifest+json; charset=utf-8" },
          { key: "Cache-Control", value: "public, max-age=3600" },
        ],
      },
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
