import { NextRequest, NextResponse } from "next/server";
import { checkMongoHealth, getDb } from "@/lib/mongodb";
import { verifyNextAdminDevice } from "@/lib/adminAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const health = await checkMongoHealth();

  if (!health.connected) {
    return NextResponse.json(
      {
        ok: false,
        connected: false,
        configured: health.configured,
        error: health.error || "MongoDB ulanishi amalga oshmadi",
      },
      { status: health.configured ? 503 : 200 }
    );
  }

  const adminDevice = await verifyNextAdminDevice(request);
  if (!adminDevice) {
    return NextResponse.json({
      ok: true,
      connected: true,
      latencyMs: health.latencyMs,
    });
  }

  try {
    const db = await getDb();
    const collections = [
      "products",
      "users",
      "orders",
      "banners",
      "auctions",
      "resaleListings",
      "affiliateProfiles",
    ];
    const countsEntries = await Promise.all(
      collections.map(async (name) => [
        name,
        await db.collection(name).estimatedDocumentCount(),
      ])
    );

    return NextResponse.json({
      ok: true,
      connected: true,
      database: health.database,
      latencyMs: health.latencyMs,
      collections: Object.fromEntries(countsEntries),
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || "MongoDB holatini tekshirishda xatolik" },
      { status: 500 }
    );
  }
}
