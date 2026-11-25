import type { MetadataRoute } from "next";
import { getDb, isMongoConfigured } from "@/lib/mongodb";

export const dynamic = "force-dynamic";

function getSiteBaseUrl(): string {
  const explicit = (process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "").trim();
  if (explicit) return explicit.replace(/\/+$/, "");
  const vercelUrl = (process.env.VERCEL_URL || "").trim();
  if (vercelUrl) return `https://${vercelUrl.replace(/^https?:\/\//, "").replace(/\/+$/, "")}`;
  return "https://yuyushop.uz";
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getSiteBaseUrl();
  const now = new Date();

  const entries: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}/`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1,
    },
  ];

  if (isMongoConfigured()) {
    try {
      const db = await getDb();
      const products = await db
        .collection("products")
        .find({}, { projection: { id: 1, updatedAt: 1, _id: 0 } })
        .limit(500)
        .toArray();

      for (const prod of products) {
        if (!prod?.id) continue;
        entries.push({
          url: `${baseUrl}/product/${encodeURIComponent(String(prod.id))}`,
          lastModified: prod.updatedAt ? new Date(prod.updatedAt) : now,
          changeFrequency: "weekly",
          priority: 0.8,
        });
      }
    } catch {
      // Return base entries cleanly if DB is temporarily unavailable
    }
  }

  return entries;
}
