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
