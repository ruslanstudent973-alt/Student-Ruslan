import { NextResponse } from "next/server";
import { checkMongoHealth } from "@/lib/mongodb";
import { isR2Configured } from "@/lib/r2";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const mongo = await checkMongoHealth();
  const r2Configured = isR2Configured();

  return NextResponse.json({
    ok: true,
    framework: "nextjs-app-router",
    timestamp: new Date().toISOString(),
    mongodb: {
      connected: mongo.connected,
      configured: mongo.configured,
      latencyMs: mongo.latencyMs,
    },
    r2: {
      configured: r2Configured,
    },
  });
}
