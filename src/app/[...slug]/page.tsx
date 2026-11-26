import { notFound } from "next/navigation";
import App from "../../App";

export const dynamic = "force-dynamic";

const STATIC_ASSET_EXT_PATTERN =
  /\.(?:js|mjs|cjs|css|map|json|webmanifest|png|jpe?g|gif|svg|webp|avif|ico|woff2?|ttf|otf|eot|txt|xml|pdf|mp4|webm)$/i;

export default async function CatchAllPage({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}) {
  const resolved = await params;
  const segments = Array.isArray(resolved?.slug) ? resolved.slug : [];
  const firstSegment = (segments[0] || "").toLowerCase();
  const lastSegment = segments[segments.length - 1] || "";

  // Never serve SPA HTML with HTTP 200 for missing Next.js chunks, API paths, or static files
  if (
    firstSegment === "_next" ||
    firstSegment === "api" ||
    firstSegment === "icons" ||
    firstSegment === "images" ||
    STATIC_ASSET_EXT_PATTERN.test(lastSegment)
  ) {
    notFound();
  }

  return <App />;
}
