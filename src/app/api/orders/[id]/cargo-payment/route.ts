import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectToDatabase, { isMongoConfigured } from "@/lib/mongodb";
import { verifyNextAdminDevice } from "@/lib/adminAuth";
import { enforceApiSecurity } from "@/lib/securityEngine";
import OrderModel from "@/models/Order";
import { sendWebPushToUsers } from "@/lib/webPush";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ORDER_ID_PATTERN = /^[a-zA-Z0-9_-]{1,80}$/;
const TRACKING_CODE_PATTERN = /^[a-zA-Z0-9._\-\s/#]{0,80}$/;
const TELEGRAM_CHAT_ID_PATTERN = /^-?\d{5,20}$/;
const SAFE_URL_PATTERN = /^(https:\/\/|\/api\/|data:image\/)/i;

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

async function sendTelegramMessageSafe(chatId: string, text: string): Promise<boolean> {
  const botToken = (
    process.env.TELEGRAM_BOT_TOKEN ||
    process.env.TELEGRAM_TOKEN ||
    ""
  ).trim();
  if (!botToken || !TELEGRAM_CHAT_ID_PATTERN.test(chatId)) return false;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);
  try {
    const res = await fetch(
      `https://api.telegram.org/bot${encodeURIComponent(botToken)}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          disable_web_page_preview: false,
        }),
        signal: controller.signal,
      }
    );
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

async function handleCargoPaymentAction(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const blocked = await enforceApiSecurity(request);
  if (blocked) return blocked;

  try {
    const { id: rawId } = await context.params;
    const orderId = (rawId || "").trim();
    if (!isValidOrderId(orderId)) {
      return NextResponse.json({ error: "Noto'g'ri buyurtma identifikatori" }, { status: 400 });
    }

    if (!isMongoConfigured()) {
      return NextResponse.json({ error: "MONGODB_URI sozlanmagan" }, { status: 503 });
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "Noto'g'ri so'rov formati" }, { status: 400 });
    }

    await connectToDatabase();
    const order = await OrderModel.findOne(buildOrderLookupQuery(orderId));
    if (!order) {
      return NextResponse.json({ error: "Buyurtma topilmadi" }, { status: 404 });
    }

    const action = String(body.action || "").trim();

    if (action === "weigh") {
      const adminDevice = await verifyNextAdminDevice(request);
      if (!adminDevice) {
        return NextResponse.json(
          { error: "Faqat ruxsat etilgan admin kargo o'lchovini kirita oladi" },
          { status: 403 }
        );
      }

      const trackingCode = String(body.trackingCode || order.trackingCode || "").trim();
      if (!TRACKING_CODE_PATTERN.test(trackingCode)) {
        return NextResponse.json({ error: "Trek-kod noto'g'ri formatda" }, { status: 400 });
      }

      const cargoWeightKg = Math.max(0, Number(body.cargoWeightKg) || 0);
      const cargoRatePerKg = Math.max(0, Number(body.cargoRatePerKg) || 76800);
      const cargoMethod = body.cargoMethod === "avia" ? "avia" : "avto";
      const cargoFeeUzs = Math.round(cargoWeightKg * cargoRatePerKg);

      order.trackingCode = trackingCode;
      order.trackNumber = trackingCode;
      order.cargoWeightKg = cargoWeightKg;
      order.cargoRatePerKg = cargoRatePerKg;
      order.cargoMethod = cargoMethod;
      order.cargoFeeUzs = cargoFeeUzs;
      order.cargoPaymentStatus = "unpaid";
      await order.save();

      const customerTgId = await resolveCustomerTelegramId(order);
      const customerUserId = String(order.userId || "").trim();
      const pushTargets = Array.from(new Set([customerUserId, customerTgId || ""].filter(Boolean)));

      const msgText = `Buyurtmangiz (#${order.id}) Xitoy omborida tortildi. Trek: ${trackingCode}. Vazni: ${cargoWeightKg} kg. Kargo to'lovi: ${cargoFeeUzs.toLocaleString()} so'm. Saytga kirib kargo to'lovini amalga oshiring.`;

      if (customerTgId) {
        await sendTelegramMessageSafe(customerTgId, msgText);
      }
      await sendWebPushToUsers(pushTargets, {
        title: "Kargo to'lovi kutilmoqda",
        body: msgText,
        url: "/?view=orders",
        tag: `yuyu-cargo-unpaid-${order.id}`,
      });

      return NextResponse.json({ success: true, order: order.toObject() });
    }

    if (action === "submit_receipt") {
      const receiptUrl = String(body.cargoReceiptUrl || "").trim();
      if (!SAFE_URL_PATTERN.test(receiptUrl)) {
        return NextResponse.json({ error: "Chek rasmi manzili yaroqsiz" }, { status: 400 });
      }

      const clientUserId = String(body.userId || "").trim();
      const orderUserId = String(order.userId || "").trim();
      const orderTgId = String(order.telegramId || "").trim();
      if (clientUserId && orderUserId && clientUserId !== orderUserId && clientUserId !== orderTgId) {
        return NextResponse.json({ error: "Bu buyurtma sizga tegishli emas" }, { status: 403 });
      }

      order.cargoReceiptUrl = receiptUrl;
      order.cargoPaymentStatus = "verifying";
      await order.save();

      const adminChatId = (process.env.TELEGRAM_ADMIN_CHAT_ID || process.env.TELEGRAM_CHAT_ID || "").trim();
      if (adminChatId) {
        await sendTelegramMessageSafe(
          adminChatId,
          `Mijoz ${order.username || "Mijoz"} buyurtma (#${order.id}) uchun kargo to'lov chekini yukladi. Kargo summasi: ${(order.cargoFeeUzs || 0).toLocaleString()} so'm.`
        );
      }

      return NextResponse.json({ success: true, order: order.toObject() });
    }

    if (action === "approve") {
      const adminDevice = await verifyNextAdminDevice(request);
      if (!adminDevice) {
        return NextResponse.json(
          { error: "Faqat ruxsat etilgan admin kargo to'lovini tasdiqlashi mumkin" },
          { status: 403 }
        );
      }

      order.cargoPaymentStatus = "paid";
      await order.save();

      const customerTgId = await resolveCustomerTelegramId(order);
      const customerUserId = String(order.userId || "").trim();
      const pushTargets = Array.from(new Set([customerUserId, customerTgId || ""].filter(Boolean)));

      const successMsg = `Buyurtmangiz (#${order.id}) uchun kargo to'lovi tasdiqlandi. Rahmat!`;
      if (customerTgId) {
        await sendTelegramMessageSafe(customerTgId, successMsg);
      }
      await sendWebPushToUsers(pushTargets, {
        title: "Kargo to'lovi tasdiqlandi",
        body: successMsg,
        url: "/?view=orders",
        tag: `yuyu-cargo-paid-${order.id}`,
      });

      return NextResponse.json({ success: true, order: order.toObject() });
    }

    return NextResponse.json({ error: "Noto'g'ri amal (action)" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Kargo to'lovi amalda xatolik yuz berdi" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return handleCargoPaymentAction(request, context);
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return handleCargoPaymentAction(request, context);
}
