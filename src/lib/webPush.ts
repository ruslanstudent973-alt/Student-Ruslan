import webpush from "web-push";
import mongoose from "mongoose";
import connectToDatabase, { isMongoConfigured } from "@/lib/mongodb";
import PushSubscriptionModel, { type IPushSubscriptionDocument } from "@/models/PushSubscription";

export interface PushMessagePayload {
  title: string;
  body: string;
  url?: string;
  icon?: string;
  badge?: string;
  tag?: string;
}

export interface PushSendSummary {
  configured: boolean;
  attempted: number;
  sent: number;
  failed: number;
  pruned: number;
  reason?: string;
}

let vapidConfiguredKey = "";

export function getPublicVapidKey(): string {
  return (
    process.env.VAPID_PUBLIC_KEY ||
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
    ""
  ).trim();
}

export function getPrivateVapidKey(): string {
  return (process.env.VAPID_PRIVATE_KEY || "").trim();
}

export function getVapidSubject(): string {
  const raw = (process.env.VAPID_SUBJECT || "mailto:support@yuyu.uz").trim();
  if (raw.startsWith("mailto:") || raw.startsWith("https://")) {
    return raw;
  }
  return "mailto:support@yuyu.uz";
}

export function isWebPushConfigured(): boolean {
  return Boolean(getPublicVapidKey() && getPrivateVapidKey());
}

function ensureVapidReady(): boolean {
  const publicKey = getPublicVapidKey();
  const privateKey = getPrivateVapidKey();
  if (!publicKey || !privateKey) return false;

  const subject = getVapidSubject();
  const fingerprint = `${subject}|${publicKey}|${privateKey.length}`;
  if (vapidConfiguredKey !== fingerprint) {
    webpush.setVapidDetails(subject, publicKey, privateKey);
    vapidConfiguredKey = fingerprint;
  }
  return true;
}

function isPrivateOrLoopbackHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  if (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "::1" ||
    host === "[::1]" ||
    host === "0.0.0.0" ||
    host.endsWith(".local") ||
    host.endsWith(".internal")
  ) {
    return true;
  }
  if (
    /^10\./.test(host) ||
    /^127\./.test(host) ||
    /^169\.254\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host)
  ) {
    return true;
  }
  return false;
}

export function isSafePushEndpoint(rawEndpoint: unknown): rawEndpoint is string {
  if (typeof rawEndpoint !== "string") return false;
  const trimmed = rawEndpoint.trim();
  if (!trimmed || trimmed.length > 2048) return false;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "https:") return false;
    if (!parsed.hostname || isPrivateOrLoopbackHost(parsed.hostname)) return false;
    return true;
  } catch {
    return false;
  }
}

export function sanitizeInternalUrl(rawUrl: unknown): string {
  if (typeof rawUrl !== "string") return "/";
  const trimmed = rawUrl.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return "/";
  return trimmed.slice(0, 300);
}

async function expandUserIdAliases(userIds: string[]): Promise<string[]> {
  const unique = Array.from(
    new Set(userIds.map((id) => String(id || "").trim()).filter(Boolean))
  );
  if (unique.length === 0) return [];

  const expanded = new Set<string>(unique);
  try {
    if (mongoose.connection.db) {
      const users = await mongoose.connection.db
        .collection("users")
        .find(
          {
            $or: [
              { telegramId: { $in: unique } },
              { phoneNumber: { $in: unique } },
            ],
          },
          { projection: { telegramId: 1, phoneNumber: 1 } }
        )
        .toArray();
      for (const u of users) {
        if (typeof u?.telegramId === "string" && u.telegramId.trim()) {
          expanded.add(u.telegramId.trim());
        }
        if (typeof u?.phoneNumber === "string" && u.phoneNumber.trim()) {
          expanded.add(u.phoneNumber.trim());
        }
      }
    }
  } catch {
    // Continue with provided IDs
  }
  return Array.from(expanded);
}

async function deliverToSubscriptions(
  subscriptions: IPushSubscriptionDocument[],
  payload: PushMessagePayload
): Promise<PushSendSummary> {
  if (!ensureVapidReady()) {
    return {
      configured: false,
      attempted: 0,
      sent: 0,
      failed: 0,
      pruned: 0,
      reason: "VAPID kalitlari sozlanmagan",
    };
  }

  if (subscriptions.length === 0) {
    return {
      configured: true,
      attempted: 0,
      sent: 0,
      failed: 0,
      pruned: 0,
      reason: "Foydalanuvchida faol Web Push obunasi topilmadi",
    };
  }

  const notificationJson = JSON.stringify({
    title: payload.title.slice(0, 120),
    body: payload.body.slice(0, 320),
    icon: payload.icon || "/icons/icon-192x192.png",
    badge: payload.badge || "/icons/icon-192x192.png",
    url: sanitizeInternalUrl(payload.url),
    tag: payload.tag || "yuyu-push",
  });

  const expiredEndpoints: string[] = [];
  let sent = 0;
  let failed = 0;

  await Promise.allSettled(
    subscriptions.map(async (sub) => {
      if (!isSafePushEndpoint(sub.endpoint)) {
        expiredEndpoints.push(sub.endpoint);
        failed += 1;
        return;
      }
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.keys.p256dh,
              auth: sub.keys.auth,
            },
          },
          notificationJson,
          { TTL: 60 * 60 }
        );
        sent += 1;
      } catch (err: any) {
        failed += 1;
        const statusCode = Number(err?.statusCode);
        if (statusCode === 404 || statusCode === 410) {
          expiredEndpoints.push(sub.endpoint);
        }
      }
    })
  );

  if (expiredEndpoints.length > 0) {
    await PushSubscriptionModel.deleteMany({
      endpoint: { $in: expiredEndpoints },
    }).catch(() => {});
  }

  return {
    configured: true,
    attempted: subscriptions.length,
    sent,
    failed,
    pruned: expiredEndpoints.length,
  };
}

export async function sendWebPushToUsers(
  userIds: string[],
  payload: PushMessagePayload
): Promise<PushSendSummary> {
  if (!isMongoConfigured()) {
    return {
      configured: isWebPushConfigured(),
      attempted: 0,
      sent: 0,
      failed: 0,
      pruned: 0,
      reason: "MONGODB_URI sozlanmagan",
    };
  }

  if (!isWebPushConfigured()) {
    return {
      configured: false,
      attempted: 0,
      sent: 0,
      failed: 0,
      pruned: 0,
      reason: "VAPID kalitlari sozlanmagan",
    };
  }

  try {
    await connectToDatabase();
    const resolvedIds = await expandUserIdAliases(userIds);
    if (resolvedIds.length === 0) {
      return {
        configured: true,
        attempted: 0,
        sent: 0,
        failed: 0,
        pruned: 0,
        reason: "Foydalanuvchi identifikatori topilmadi",
      };
    }

    const subs = await PushSubscriptionModel.find({
      userId: { $in: resolvedIds },
    }).lean();

    return deliverToSubscriptions(subs, payload);
  } catch (err: any) {
    return {
      configured: isWebPushConfigured(),
      attempted: 0,
      sent: 0,
      failed: 0,
      pruned: 0,
      reason: err?.message || "Web Push yuborishda xatolik",
    };
  }
}

export async function sendWebPushBroadcast(
  payload: PushMessagePayload
): Promise<PushSendSummary> {
  if (!isMongoConfigured() || !isWebPushConfigured()) {
    return {
      configured: isWebPushConfigured(),
      attempted: 0,
      sent: 0,
      failed: 0,
      pruned: 0,
      reason: "MongoDB yoki VAPID kalitlari sozlanmagan",
    };
  }

  await connectToDatabase();
  const subs = await PushSubscriptionModel.find({}).limit(2000).lean();
  return deliverToSubscriptions(subs, payload);
}
