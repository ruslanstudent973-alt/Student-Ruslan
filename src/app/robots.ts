import type { MetadataRoute } from "next";

function getSiteBaseUrl(): string {
  const explicit = (process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "").trim();
  if (explicit) return explicit.replace(/\/+$/, "");
  const vercelUrl = (process.env.VERCEL_URL || "").trim();
  if (vercelUrl) return `https://${vercelUrl.replace(/^https?:\/\//, "").replace(/\/+$/, "")}`;
  return "https://yuyushop.uz";
}

export default function robots(): MetadataRoute.Robots {
  const baseUrl = getSiteBaseUrl();
  return {
    rules: [
      {
        userAgent: "Googlebot",
        allow: ["/", "/product/", "/catalog"],
        disallow: ["/api/", "/admin", "/_next/"],
      },
      {
        userAgent: "*",
        allow: ["/", "/product/", "/catalog"],
        disallow: [
          "/api/",
          "/admin",
          "/_next/",
          "/wp-admin",
          "/wp-login.php",
          "/phpmyadmin",
          "/.env",
          "/.git",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
