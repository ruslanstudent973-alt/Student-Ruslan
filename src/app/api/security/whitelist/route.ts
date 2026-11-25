import { NextRequest, NextResponse } from "next/server";
import { verifyNextAdminDevice } from "@/lib/adminAuth";
import {
  extractClientContext,
  getSecuritySettings,
  isValidIpInput,
  normalizeIp,
  unblockIpAddress,
  updateSecuritySettings,
} from "@/lib/securityEngine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const adminDevice = await verifyNextAdminDevice(request);
    if (!adminDevice) {
      return NextResponse.json(
        { error: "Oq ro'yxatni o'zgartirish uchun admin ruxsati talab qilinadi" },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => null);
    const action = body?.action === "remove" ? "remove" : "add";
    const ctx = extractClientContext(request);
    const rawIp = body?.useCurrentIp ? ctx.ip : String(body?.ip || "").trim();

    if (!isValidIpInput(rawIp)) {
      return NextResponse.json(
        { error: "To'g'ri IP manzilini kiriting" },
        { status: 400 }
      );
    }

    const targetIp = normalizeIp(rawIp);
    const current = await getSecuritySettings(true);
    let nextWhitelist = [...current.whitelistIps];

    if (action === "add") {
      if (!nextWhitelist.includes(targetIp)) {
        nextWhitelist.push(targetIp);
      }
      // Ensure whitelisted IP is never left in the blocked list
      await unblockIpAddress(targetIp);
    } else {
      nextWhitelist = nextWhitelist.filter((item) => item !== targetIp);
    }

    const updated = await updateSecuritySettings({ whitelistIps: nextWhitelist });

    return NextResponse.json({
      success: true,
      ip: targetIp,
      settings: updated,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Oq ro'yxatni yangilashda xatolik" },
      { status: 500 }
    );
  }
}
