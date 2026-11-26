import { NextRequest, NextResponse } from "next/server";
import connectToDatabase, { isMongoConfigured } from "@/lib/mongodb";
import { enforceApiSecurity } from "@/lib/securityEngine";
import PushSubscriptionModel, { type PushDeviceType } from "@/models/PushSubscription";
import {
  getPublicVapidKey,
  isSafePushEndpoint,
  isWebPushConfigured,
} from "@/lib/webPush";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BASE64_URL_PATTERN = /^[a-zA-Z0-9+/_=-]{16,512}$/;
const ALLOWED_DEVICES: ReadonlySet<PushDeviceType> = new Set([
  "android",
  "ios",
  "desktop",
  "unknown",
]);

export async function GET(request: NextRequest) {
  const blocked = await enforceApiSecurity(request);
  if (blocked) return blocked;

  return NextResponse.json({
    success: true,
    configured: isWebPushConfigured(),
    publicKey: getPublicVapidKey(),
  });
}

export async function POST(request: NextRequest) {
  const blocked = await enforceApiSecurity(request);
  if (blocked) return blocked;

  try {
    if (!isMongoConfigured()) {
      return NextResponse.json(
        { error: "MONGODB_URI muhit o'zgaruvchisi sozlanmagan" },
        { status: 503 }
      );
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json(
        { error: "Noto'g'ri JSON so'rov tanasi" },
        { status: 400 }
      );
    }

    const userId = typeof body.userId === "string" ? body.userId.trim() : "";
    if (!userId || userId.length > 80) {
      return NextResponse.json(
        { error: "Foydalanuvchi identifikatori (userId) talab qilinadi" },
        { status: 400 }
      );
    }

    const subscription =
      body.subscription && typeof body.subscription === "object"
        ? body.subscription
        : body;

    const endpoint = subscription?.endpoint;
    if (!isSafePushEndpoint(endpoint)) {
      return NextResponse.json(
        { error: "Noto'g'ri Web Push endpoint manzili" },
        { status: 400 }
      );
    }

    const p256dh =
      typeof subscription?.keys?.p256dh === "string"
        ? subscription.keys.p256dh.trim()
        : "";
    const auth =
      typeof subscription?.keys?.auth === "string"
        ? subscription.keys.auth.trim()
        : "";

    if (!BASE64_URL_PATTERN.test(p256dh) || !BASE64_URL_PATTERN.test(auth)) {
      return NextResponse.json(
        { error: "Noto'g'ri Push shifrlash kalitlari (p256dh / auth)" },
        { status: 400 }
      );
    }

    const rawDevice =
      typeof body.deviceType === "string" ? body.deviceType.trim().toLowerCase() : "unknown";
    const deviceType: PushDeviceType = ALLOWED_DEVICES.has(rawDevice as PushDeviceType)
      ? (rawDevice as PushDeviceType)
      : "unknown";

    const userAgent =
      typeof body.userAgent === "string"
        ? body.userAgent.trim().slice(0, 300)
        : (request.headers.get("user-agent") || "").slice(0, 300);

    const isStandalone = Boolean(body.isStandalone);

    await connectToDatabase();

    await PushSubscriptionModel.findOneAndUpdate(
      { endpoint: endpoint.trim() },
      {
        $set: {
          userId,
          endpoint: endpoint.trim(),
          keys: { p256dh, auth },
          deviceType,
          userAgent,
          isStandalone,
          lastActiveAt: new Date(),
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    const deviceCount = await PushSubscriptionModel.countDocuments({ userId });

    return NextResponse.json({
      success: true,
      deviceCount,
      configured: isWebPushConfigured(),
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Push obunasini saqlashda xatolik yuz berdi" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const blocked = await enforceApiSecurity(request);
  if (blocked) return blocked;

  try {
    if (!isMongoConfigured()) {
      return NextResponse.json(
        { error: "MONGODB_URI muhit o'zgaruvchisi sozlanmagan" },
        { status: 503 }
      );
    }

    const body = await request.json().catch(() => null);
    const endpoint = typeof body?.endpoint === "string" ? body.endpoint.trim() : "";
    if (!isSafePushEndpoint(endpoint)) {
      return NextResponse.json(
        { error: "Noto'g'ri endpoint manzili" },
        { status: 400 }
      );
    }

    await connectToDatabase();
    await PushSubscriptionModel.deleteOne({ endpoint });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Push obunasini o'chirishda xatolik" },
      { status: 500 }
    );
  }
}
