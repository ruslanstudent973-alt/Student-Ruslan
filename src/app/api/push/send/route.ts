import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { verifyNextAdminDevice } from "@/lib/adminAuth";
import { enforceApiSecurity } from "@/lib/securityEngine";
import {
  sanitizeInternalUrl,
  sendWebPushBroadcast,
  sendWebPushToUsers,
} from "@/lib/webPush";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAuthorizedCronRequest(request: NextRequest): boolean {
  const expected = (process.env.CRON_SECRET || "").trim();
  if (!expected) return false;
  const auth = (request.headers.get("authorization") || "").trim();
  if (!auth.startsWith("Bearer ")) return false;
  const token = auth.slice(7).trim();
  if (token.length !== expected.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expected));
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  const blocked = await enforceApiSecurity(request);
  if (blocked) return blocked;

  try {
    const isCron = isAuthorizedCronRequest(request);
    const adminDevice = isCron ? { id: "cron" } : await verifyNextAdminDevice(request);
    if (!adminDevice) {
      return NextResponse.json(
        { error: "Push bildirishnoma yuborish uchun admin ruxsati talab qilinadi" },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json(
        { error: "Noto'g'ri JSON so'rov tanasi" },
        { status: 400 }
      );
    }

    const title = typeof body.title === "string" ? body.title.trim() : "";
    const messageBody = typeof body.body === "string" ? body.body.trim() : "";
    if (!title || title.length > 120 || !messageBody || messageBody.length > 320) {
      return NextResponse.json(
        { error: "Bildirishnoma sarlavhasi (title) va matni (body) talab qilinadi" },
        { status: 400 }
      );
    }

    const payload = {
      title,
      body: messageBody,
      url: sanitizeInternalUrl(body.url),
      icon:
        typeof body.icon === "string" && body.icon.startsWith("/")
          ? body.icon.slice(0, 200)
          : "/icons/icon-192x192.png",
      tag:
        typeof body.tag === "string" && body.tag.trim()
          ? body.tag.trim().slice(0, 64)
          : "yuyu-push",
    };

    const targetUserIds: string[] = [];
    if (typeof body.userId === "string" && body.userId.trim()) {
      targetUserIds.push(body.userId.trim());
    }
    if (Array.isArray(body.userIds)) {
      for (const uid of body.userIds) {
        if (typeof uid === "string" && uid.trim()) {
          targetUserIds.push(uid.trim());
        }
      }
    }

    let summary;
    if (targetUserIds.length > 0) {
      summary = await sendWebPushToUsers(targetUserIds, payload);
    } else if (body.broadcast === true) {
      summary = await sendWebPushBroadcast(payload);
    } else {
      return NextResponse.json(
        { error: "userId, userIds yoki broadcast: true ko'rsatilishi shart" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      ...summary,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Push bildirishnoma yuborishda xatolik" },
      { status: 500 }
    );
  }
}
