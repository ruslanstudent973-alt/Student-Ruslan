import { NextRequest, NextResponse } from "next/server";
import { verifyNextAdminDevice } from "@/lib/adminAuth";
import {
  extractClientContext,
  isLoopbackIp,
  isValidIpInput,
  normalizeIp,
  permanentlyBanIp,
  unblockIpAddress,
} from "@/lib/securityEngine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const adminDevice = await verifyNextAdminDevice(request);
    if (!adminDevice) {
      return NextResponse.json(
        { error: "IP bloklash uchun admin ruxsati talab qilinadi" },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => null);
    const rawIp = typeof body?.ip === "string" ? body.ip.trim() : "";
    const reason =
      typeof body?.reason === "string" && body.reason.trim()
        ? body.reason.trim().slice(0, 240)
        : "Admin tomonidan qo'lda doimiy bloklandi";

    if (!isValidIpInput(rawIp)) {
      return NextResponse.json(
        { error: "To'g'ri IPv4 yoki IPv6 manzilini kiriting (masalan: 185.12.44.10)" },
        { status: 400 }
      );
    }

    const targetIp = normalizeIp(rawIp);
    const adminCtx = extractClientContext(request);
    if (isLoopbackIp(targetIp) || targetIp === adminCtx.ip) {
      return NextResponse.json(
        { error: "O'zingizning joriy IP manzilingiz yoki lokal serverni bloklab bo'lmaydi" },
        { status: 400 }
      );
    }

    await permanentlyBanIp({
      ip: targetIp,
      reason,
      attackType: "Admin Qo'lda Blokladi",
      path: "/admin/security",
      method: "POST",
      source: "admin",
      severity: "high",
    });

    return NextResponse.json({
      success: true,
      ip: targetIp,
      message: `${targetIp} doimiy bloklandi`,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "IP manzilni bloklashda xatolik yuz berdi" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const adminDevice = await verifyNextAdminDevice(request);
    if (!adminDevice) {
      return NextResponse.json(
        { error: "IP blokdan chiqarish uchun admin ruxsati talab qilinadi" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const rawIp = (searchParams.get("ip") || "").trim();
    if (!rawIp) {
      return NextResponse.json({ error: "IP manzil ko'rsatilmagan" }, { status: 400 });
    }

    const ip = normalizeIp(rawIp);
    await unblockIpAddress(ip);

    return NextResponse.json({
      success: true,
      ip,
      message: `${ip} blokdan chiqarildi`,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "IP manzilni blokdan ochishda xatolik" },
      { status: 500 }
    );
  }
}
