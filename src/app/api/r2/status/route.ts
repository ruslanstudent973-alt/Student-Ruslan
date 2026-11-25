import { NextResponse } from "next/server";
import { ALLOWED_R2_FOLDERS, getR2Config, isR2Configured } from "@/lib/r2";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const cfg = getR2Config();
  return NextResponse.json({
    ok: true,
    configured: isR2Configured(),
    hasPublicUrl: Boolean(cfg.publicUrl),
    allowedFolders: Array.from(ALLOWED_R2_FOLDERS),
  });
}
