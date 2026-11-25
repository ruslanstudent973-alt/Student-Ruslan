import { NextRequest, NextResponse } from "next/server";
import {
  enforceApiSecurity,
  extractClientContext,
  recordSiteVisit,
} from "@/lib/securityEngine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const blocked = await enforceApiSecurity(request);
  if (blocked) return blocked;

  try {
    const ctx = extractClientContext(request);
    const body = await request.json().catch(() => ({}));
    const rawPath = typeof body?.path === "string" ? body.path.trim() : "/";
    const path = rawPath.startsWith("/") ? rawPath.slice(0, 200) : "/";
    const username =
      typeof body?.username === "string" ? body.username.trim().slice(0, 80) : undefined;
    const phoneNumber =
      typeof body?.phoneNumber === "string" ? body.phoneNumber.trim().slice(0, 32) : undefined;
    const referrer =
      typeof body?.referrer === "string" ? body.referrer.trim().slice(0, 120) : undefined;

    await recordSiteVisit({
      ctx,
      path,
      username,
      phoneNumber,
      referrer,
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
