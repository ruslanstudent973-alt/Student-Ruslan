import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectToDatabase, { isMongoConfigured } from "@/lib/mongodb";
import { verifyNextAdminDevice } from "@/lib/adminAuth";
import { enforceApiSecurity } from "@/lib/securityEngine";
import OrderModel from "@/models/Order";
import {
  type CargoStage,
  getCargoStageMeta,
  normalizeCargoStage,
  toIsoStringOrNull,
} from "@/lib/cargoStages";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ORDER_ID_PATTERN = /^[a-zA-Z0-9_-]{1,80}$/;
const TRACKING_CODE_PATTERN = /^[a-zA-Z0-9._\-\s/#]{0,80}$/;
const TELEGRAM_CHAT_ID_PATTERN = /^-?\d{5,20}$/;

function isValidOrderId(raw: string): boolean {
  return ORDER_ID_PATTERN.test(raw);
}

function buildOrderLookupQuery(orderId: string): Record<string, unknown> {
  if (mongoose.Types.ObjectId.isValid(orderId) && /^[a-fA-F0-9]{24}$/.test(orderId)) {
    return {
      $or: [{ id: orderId }, { _id: new mongoose.Types.ObjectId(orderId) }],
    };
  }
  return { id: orderId };
}

function serializeOrderWithCargo(doc: any) {
  if (!doc) return null;
  const { _id, __v, ...rest } = doc;
  const cargoStatus = normalizeCargoStage(rest.cargoStatus, rest.status);
  const trackingCode =
    typeof rest.trackingCode === "string" && rest.trackingCode.trim()
      ? rest.trackingCode.trim()
      : typeof rest.trackNumber === "string"
      ? rest.trackNumber.trim()
      : "";

  const rawTs =
    rest.statusTimestamps && typeof rest.statusTimestamps === "object"
      ? rest.statusTimestamps
      : {};

  const fallbackStep1 =
    toIsoStringOrNull(rawTs.step1) ||
    toIsoStringOrNull(rest.createdAt) ||
    toIsoStringOrNull(rest.timestamp);

  const statusTimestamps = {
    step1: fallbackStep1 || undefined,
    step2: toIsoStringOrNull(rawTs.step2) || undefined,
    step3: toIsoStringOrNull(rawTs.step3) || undefined,
    step4: toIsoStringOrNull(rawTs.step4) || undefined,
  };

  const safeReceipt =
    typeof rest.receiptImage === "string" &&
    rest.receiptImage.startsWith("data:") &&
    rest.receiptImage.length > 2048
      ? `/api/media/order/${encodeURIComponent(rest.id || String(_id))}/receipt`
      : rest.receiptImage;

  return {
    ...rest,
    id: rest.id || (_id ? String(_id) : ""),
    cargoStatus,
    trackingCode,
    trackNumber: trackingCode || rest.trackNumber || "",
    statusTimestamps,
    receiptImage: safeReceipt,
  };
}

async function resolveCustomerTelegramId(order: any): Promise<string | null> {
  const candidates: string[] = [];
  if (typeof order?.telegramId === "string" && order.telegramId.trim()) {
    candidates.push(order.telegramId.trim());
  }
  if (typeof order?.userId === "string" && order.userId.trim()) {
    candidates.push(order.userId.trim());
  }

  for (const candidate of candidates) {
    if (TELEGRAM_CHAT_ID_PATTERN.test(candidate)) {
      return candidate;
    }
  }

  if (order?.userId && mongoose.connection.db) {
    const userDoc = await mongoose.connection.db.collection("users").findOne(
      {
        $or: [{ telegramId: String(order.userId) }, { phoneNumber: String(order.userId) }],
      },
      { projection: { telegramId: 1 } }
    );
    const dbTgId = typeof userDoc?.telegramId === "string" ? userDoc.telegramId.trim() : "";
    if (TELEGRAM_CHAT_ID_PATTERN.test(dbTgId)) {
      return dbTgId;
    }
  }

  return null;
}

async function sendTelegramCargoAlert(params: {
  chatId: string;
  orderId: string;
  productName: string;
  stageLabel: string;
  trackingCode?: string;
}): Promise<{ sent: boolean; reason?: string }> {
  const botToken = (
    process.env.TELEGRAM_BOT_TOKEN ||
    process.env.TELEGRAM_TOKEN ||
    ""
  ).trim();

  if (!botToken) {
    return { sent: false, reason: "TELEGRAM_BOT_TOKEN sozlanmagan" };
  }

  if (!TELEGRAM_CHAT_ID_PATTERN.test(params.chatId)) {
    return { sent: false, reason: "Mijozning Telegram ID raqami mavjud emas" };
  }

  const lines = [
    `🚚 Buyurtmangiz (#${params.orderId}) yangi bosqichga o'tdi: ${params.stageLabel}.`,
  ];
  if (params.productName) {
    lines.push(`📦 Mahsulot: ${params.productName}`);
  }
  if (params.trackingCode) {
    lines.push(`🔎 Trek-kod: ${params.trackingCode}`);
  }
  lines.push("Jonli kuzatish: https://yuyu.uz");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${encodeURIComponent(botToken)}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: params.chatId,
          text: lines.join("\n"),
          disable_web_page_preview: false,
        }),
        signal: controller.signal,
      }
    );

    if (!response.ok) {
      return { sent: false, reason: `Telegram API javobi: ${response.status}` };
    }

    return { sent: true };
  } catch {
    return { sent: false, reason: "Telegram serveriga ulanishda vaqt tugadi" };
  } finally {
    clearTimeout(timeout);
  }
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const blocked = await enforceApiSecurity(request);
  if (blocked) return blocked;

  try {
    const { id: rawId } = await context.params;
    const orderId = (rawId || "").trim();
    if (!isValidOrderId(orderId)) {
      return NextResponse.json(
        { error: "Noto'g'ri buyurtma identifikatori" },
        { status: 400 }
      );
    }

    if (!isMongoConfigured()) {
      return NextResponse.json(
        { error: "MONGODB_URI muhit o'zgaruvchisi sozlanmagan" },
        { status: 503 }
      );
    }

    await connectToDatabase();
    const order = await OrderModel.findOne(buildOrderLookupQuery(orderId)).lean();
    if (!order) {
      return NextResponse.json({ error: "Buyurtma topilmadi" }, { status: 404 });
    }

    const serialized = serializeOrderWithCargo(order);
    return NextResponse.json({
      success: true,
      tracking: {
        id: serialized.id,
        status: serialized.status,
        cargoStatus: serialized.cargoStatus,
        trackingCode: serialized.trackingCode,
        statusTimestamps: serialized.statusTimestamps,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Kargo holatini olishda xatolik yuz berdi" },
      { status: 500 }
    );
  }
}

async function handleStatusUpdate(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const blocked = await enforceApiSecurity(request);
  if (blocked) return blocked;

  try {
    const adminDevice = await verifyNextAdminDevice(request);
    if (!adminDevice) {
      return NextResponse.json(
        { error: "Faqat ruxsat berilgan admin qurilmasi kargo holatini o'zgartira oladi" },
        { status: 403 }
      );
    }

    const { id: rawId } = await context.params;
    const orderId = (rawId || "").trim();
    if (!isValidOrderId(orderId)) {
      return NextResponse.json(
        { error: "Noto'g'ri buyurtma identifikatori" },
        { status: 400 }
      );
    }

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

    const hasCargoStatusInput =
      body.cargoStatus !== undefined && body.cargoStatus !== null && body.cargoStatus !== "";
    const parsedStage = hasCargoStatusInput ? Number(body.cargoStatus) : undefined;

    if (
      hasCargoStatusInput &&
      (!Number.isInteger(parsedStage) ||
        (parsedStage !== 1 && parsedStage !== 2 && parsedStage !== 3 && parsedStage !== 4))
    ) {
      return NextResponse.json(
        { error: "cargoStatus 1, 2, 3 yoki 4 bo'lishi kerak" },
        { status: 400 }
      );
    }

    const hasTrackingInput =
      body.trackingCode !== undefined || body.trackNumber !== undefined;
    const rawTracking =
      body.trackingCode !== undefined ? body.trackingCode : body.trackNumber;
    let sanitizedTracking: string | undefined;

    if (hasTrackingInput) {
      if (typeof rawTracking !== "string") {
        return NextResponse.json(
          { error: "Trek-kod matn ko'rinishida bo'lishi kerak" },
          { status: 400 }
        );
      }
      const trimmed = rawTracking.trim();
      if (!TRACKING_CODE_PATTERN.test(trimmed)) {
        return NextResponse.json(
          { error: "Trek-kodda ruxsat etilmagan belgilar mavjud" },
          { status: 400 }
        );
      }
      sanitizedTracking = trimmed;
    }

    if (!hasCargoStatusInput && !hasTrackingInput) {
      return NextResponse.json(
        { error: "Yangilash uchun cargoStatus yoki trackingCode yuboring" },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const lookupQuery = buildOrderLookupQuery(orderId);
    const existing = await OrderModel.findOne(lookupQuery).lean();
    if (!existing) {
      return NextResponse.json({ error: "Buyurtma topilmadi" }, { status: 404 });
    }

    const prevStage = normalizeCargoStage(existing.cargoStatus, existing.status);
    const nextStage: CargoStage = (parsedStage as CargoStage | undefined) ?? prevStage;
    const stageChanged = hasCargoStatusInput && nextStage !== prevStage;
    const now = new Date();

    const existingTs: Record<string, Date | undefined> = {
      step1: existing.statusTimestamps?.step1
        ? new Date(existing.statusTimestamps.step1)
        : existing.timestamp
        ? new Date(existing.timestamp)
        : now,
      step2: existing.statusTimestamps?.step2
        ? new Date(existing.statusTimestamps.step2)
        : undefined,
      step3: existing.statusTimestamps?.step3
        ? new Date(existing.statusTimestamps.step3)
        : undefined,
      step4: existing.statusTimestamps?.step4
        ? new Date(existing.statusTimestamps.step4)
        : undefined,
    };

    // Record exact timestamp for the newly selected cargo stage
    if (hasCargoStatusInput) {
      const targetKey = `step${nextStage}` as keyof typeof existingTs;
      if (stageChanged || !existingTs[targetKey]) {
        existingTs[targetKey] = now;
      }
      // Ensure earlier checkpoints have a valid timestamp so timeline stays cohesive
      for (let s = 1; s < nextStage; s += 1) {
        const key = `step${s}` as keyof typeof existingTs;
        if (!existingTs[key]) {
          existingTs[key] = now;
        }
      }
    }

    const updateSet: Record<string, unknown> = {
      cargoStatus: nextStage,
      statusTimestamps: {
        ...(existingTs.step1 ? { step1: existingTs.step1 } : {}),
        ...(existingTs.step2 ? { step2: existingTs.step2 } : {}),
        ...(existingTs.step3 ? { step3: existingTs.step3 } : {}),
        ...(existingTs.step4 ? { step4: existingTs.step4 } : {}),
      },
    };

    if (sanitizedTracking !== undefined) {
      updateSet.trackingCode = sanitizedTracking;
      updateSet.trackNumber = sanitizedTracking;
    }

    // Keep legacy order.status aligned cleanly without breaking cancelled orders
    if (hasCargoStatusInput && existing.status !== "cancelled") {
      if (nextStage === 4) {
        updateSet.status = "delivered";
      } else if (nextStage === 2 || nextStage === 3) {
        updateSet.status = "shipped";
      } else if (
        nextStage === 1 &&
        (existing.status === "pending" || existing.status === "verifying")
      ) {
        updateSet.status = "paid";
      }
    }

    const updatedDoc = await OrderModel.findOneAndUpdate(
      lookupQuery,
      { $set: updateSet },
      { new: true }
    ).lean();

    const serialized = serializeOrderWithCargo(updatedDoc);

    // Notify customer via Telegram Bot API when cargo stage is updated
    let telegramNotified = false;
    let telegramReason: string | undefined;

    if (hasCargoStatusInput) {
      const stageMeta = getCargoStageMeta(nextStage);
      const customerTelegramId = await resolveCustomerTelegramId(updatedDoc);
      if (customerTelegramId) {
        const tgResult = await sendTelegramCargoAlert({
          chatId: customerTelegramId,
          orderId: serialized.id,
          productName: String(serialized.productName || ""),
          stageLabel: stageMeta.label,
          trackingCode: serialized.trackingCode || undefined,
        });
        telegramNotified = tgResult.sent;
        telegramReason = tgResult.reason;
      } else {
        telegramReason = "Mijozning Telegram ID raqami bog'lanmagan";
      }
    }

    return NextResponse.json({
      success: true,
      order: serialized,
      telegramNotified,
      ...(telegramReason ? { telegramReason } : {}),
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Kargo holatini yangilashda xatolik yuz berdi" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return handleStatusUpdate(request, context);
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return handleStatusUpdate(request, context);
}
