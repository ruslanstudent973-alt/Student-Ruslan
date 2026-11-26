import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "../index.css";
import { ServiceWorkerRegistrar } from "@/components/ServiceWorkerRegistrar";

export const metadata: Metadata = {
  title: "YUYU Shop — Xitoydan Tovar Keltirish",
  description:
    "YUYU Shop — 1688, Taobao va Pinduoduo platformalaridan tovar keltirish bo'yicha zamonaviy onlayn do'kon.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "YuYu Shop",
  },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  openGraph: {
    title: "YUYU Shop — Xitoydan Tovar Keltirish",
    description:
      "1688, Taobao va Pinduoduo platformalaridan saralangan mahsulotlar va ishonchli logistika.",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#2563EB",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="uz" suppressHydrationWarning>
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400..700;1,9..40,400..700&family=JetBrains+Mono:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        suppressHydrationWarning
        className="bg-[#F8FAFC] text-slate-900 dark:bg-[#0B1120] dark:text-slate-100 antialiased selection:bg-[#0F294A] selection:text-white"
      >
        <ServiceWorkerRegistrar />
        {children}
      </body>
    </html>
  );
}
