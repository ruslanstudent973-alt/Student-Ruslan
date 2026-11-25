import { NextRequest, NextResponse } from "next/server";
import {
  extractClientContext,
  getSecuritySettings,
  isIpWhitelisted,
  permanentlyBanIp,
  recordSecurityEvent,
  type SecuritySeverity,
} from "@/lib/securityEngine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function safeDecode(val: string | null, fallback: string): string {
  if (!val) return fallback;
  try {
    return decodeURIComponent(val);
  } catch {
    return val;
  }
}

async function handleTrap(request: NextRequest) {
  const ctx = extractClientContext(request);
  const origPath = request.headers.get("x-yuyu-orig-path") || request.nextUrl.pathname;
  const origMethod = request.headers.get("x-yuyu-orig-method") || request.method;
  const attackType = safeDecode(
    request.headers.get("x-yuyu-threat-type"),
    "Tuzoq / Skaner Urinishi"
  );
  const reason = safeDecode(
    request.headers.get("x-yuyu-threat-reason"),
    `Taqiqlangan yo'lga murojaat: ${origPath}`
  );
  const rawSeverity = request.headers.get("x-yuyu-threat-severity") || "critical";
  const severity: SecuritySeverity =
    rawSeverity === "high" || rawSeverity === "medium" || rawSeverity === "info"
      ? rawSeverity
      : "critical";
  const payloadSnippet = safeDecode(request.headers.get("x-yuyu-threat-payload"), origPath);

  const settings = await getSecuritySettings();
  const whitelisted = await isIpWhitelisted(ctx.ip);

  if (settings.autoBlockEnabled && !whitelisted) {
    await permanentlyBanIp({
      ip: ctx.ip,
      reason,
      attackType,
      path: origPath,
      method: origMethod,
      userAgent: ctx.userAgent,
      country: ctx.country,
      city: ctx.city,
      payloadSnippet,
      severity,
      source: "auto",
    });
  } else {
    await recordSecurityEvent({
      kind: "attack",
      attackType,
      severity,
      ip: ctx.ip,
      country: ctx.country,
      city: ctx.city,
      userAgent: ctx.userAgent,
      deviceSummary: ctx.deviceSummary,
      method: origMethod,
      path: origPath,
      detail: whitelisted ? `${reason} (Oq ro'yxat / lokal)` : reason,
      payloadSnippet,
      blocked: true,
    });
  }

  return NextResponse.json(
    {
      error: "Kirish taqiqlangan. Shubhali faoliyat qayd etildi va bloklandi.",
      code: "ANTI_HACK_BLOCKED",
    },
    {
      status: 403,
      headers: {
        "X-Yuyu-Shield": "blocked",
        "Cache-Control": "no-store",
      },
    }
  );
}

export const GET = handleTrap;
export const POST = handleTrap;
export const PUT = handleTrap;
export const PATCH = handleTrap;
export const DELETE = handleTrap;
export const HEAD = handleTrap;
