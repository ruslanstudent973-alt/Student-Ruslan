import { NextRequest, NextResponse } from "next/server";
import { verifyNextAdminDevice } from "@/lib/adminAuth";
import { getDb, isMongoConfigured } from "@/lib/mongodb";
import {
  extractClientContext,
  sendSecurityTelegramAlert,
  updateSecuritySettings,
} from "@/lib/securityEngine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const adminDevice = await verifyNextAdminDevice(request);
    if (!adminDevice) {
      return NextResponse.json(
        { error: "Xavfsizlik sozlamalarini o'zgartirish uchun admin ruxsati talab qilinadi" },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Noto'g'ri so'rov" }, { status: 400 });
    }

    if (body.action === "test_telegram") {
      const ctx = extractClientContext(request);
      const result = await sendSecurityTelegramAlert(
        [
          `YUYU ANTI-HACK — TEST XABARI`,
          `Holat: Himoya tizimi faol va Telegram aloqasi ishlayapti.`,
          `Admin IP: ${ctx.ip}`,
          `Vaqt: ${new Date().toLocaleString("uz-UZ", { timeZone: "Asia/Tashkent" })}`,
        ].join("\n"),
        undefined,
        true
      );
      if (!result.sent) {
        return NextResponse.json(
          { error: result.reason || "Telegram xabarini yuborib bo'lmadi" },
          { status: 400 }
        );
      }
      return NextResponse.json({
        success: true,
        message: "Test ogohlantirishi Telegram botingizga yuborildi",
      });
    }

    if (body.action === "clear_logs") {
      const target = body.target === "visits" ? "visits" : body.target === "attacks" ? "attacks" : "all";
      if (isMongoConfigured()) {
        const db = await getDb();
        const col = db.collection("securityEvents");
        if (target === "visits") {
          await col.deleteMany({ kind: { $in: ["visit", "user_login", "admin_login"] } });
        } else if (target === "attacks") {
          await col.deleteMany({ kind: { $in: ["attack", "auth_failed", "blocked_hit"] } });
        } else {
          await col.deleteMany({});
        }
      }
      return NextResponse.json({
        success: true,
        message: "Tanlangan xavfsizlik jurnallari tozalandi",
      });
    }

    const patch: Record<string, boolean> = {};
    if (typeof body.autoBlockEnabled === "boolean") {
      patch.autoBlockEnabled = body.autoBlockEnabled;
    }
    if (typeof body.strictScannerBlock === "boolean") {
      patch.strictScannerBlock = body.strictScannerBlock;
    }
    if (typeof body.telegramAlertsEnabled === "boolean") {
      patch.telegramAlertsEnabled = body.telegramAlertsEnabled;
    }

    const updated = await updateSecuritySettings(patch);
    return NextResponse.json({
      success: true,
      settings: updated,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Sozlamalarni saqlashda xatolik" },
      { status: 500 }
    );
  }
}
