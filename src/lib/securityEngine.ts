import crypto from "node:crypto";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getDb, isMongoConfigured } from "./mongodb";
import { verifyNextAdminDevice } from "./adminAuth";
import {
  normalizeIp,
  isValidIpInput,
  isLoopbackIp,
  parseDeviceSummary,
  extractClientContextFromHeaders,
  extractClientContext,
  isPublicGoogleSafePath,
  detectThreatFromRequest,
  type SecuritySeverity,
  type ClientRequestContext,
  type ThreatDetectionResult,
} from "./securityRules";

export {
  normalizeIp,
  isValidIpInput,
  isLoopbackIp,
  parseDeviceSummary,
  extractClientContextFromHeaders,
  extractClientContext,
  isPublicGoogleSafePath,
  detectThreatFromRequest,
  type SecuritySeverity,
  type ClientRequestContext,
  type ThreatDetectionResult,
};

export type SecurityEventKind =
  | "attack"
  | "blocked_hit"
  | "admin_login"
  | "user_login"
  | "auth_failed"
  | "visit";

export interface SecurityEventDoc {
  id: string;
  kind: SecurityEventKind;
  attackType?: string;
  severity: SecuritySeverity;
  ip: string;
  country: string;
  city: string;
  userAgent: string;
  deviceSummary: string;
  method: string;
  path: string;
  username?: string;
  phoneNumber?: string;
  detail: string;
  payloadSnippet?: string;
  blocked: boolean;
  createdAt: string;
  timestamp: number;
}

export interface BlockedIpDoc {
  ip: string;
  reason: string;
  attackType: string;
  source: "auto" | "admin";
  country: string;
  city: string;
  userAgent: string;
  lastPath: string;
  hits: number;
  blockedAt: string;
  lastSeenAt: string;
  permanent: true;
}

export interface SecuritySettingsDoc {
  id: "main";
  autoBlockEnabled: boolean;
  strictScannerBlock: boolean;
  telegramAlertsEnabled: boolean;
  whitelistIps: string[];
  updatedAt: string;
}

const DEFAULT_SETTINGS: SecuritySettingsDoc = {
  id: "main",
  autoBlockEnabled: true,
  strictScannerBlock: true,
  telegramAlertsEnabled: true,
  whitelistIps: [],
  updatedAt: new Date(0).toISOString(),
};

// In-memory fast caches (safe across Vercel warm lambdas)
interface SecurityMemoryCache {
  blockedIps: Set<string>;
  blockedLoadedAt: number;
  settings: SecuritySettingsDoc;
  settingsLoadedAt: number;
  rateWindows: Map<string, { count: number; resetAt: number }>;
  authFailWindows: Map<string, { count: number; resetAt: number }>;
  telegramCooldowns: Map<string, number>;
  visitDedup: Map<string, number>;
}

declare global {
  // eslint-disable-next-line no-var
  var __yuyuSecurityCache: SecurityMemoryCache | undefined;
}

const memCache: SecurityMemoryCache =
  globalThis.__yuyuSecurityCache ??
  (globalThis.__yuyuSecurityCache = {
    blockedIps: new Set<string>(),
    blockedLoadedAt: 0,
    settings: { ...DEFAULT_SETTINGS },
    settingsLoadedAt: 0,
    rateWindows: new Map(),
    authFailWindows: new Map(),
    telegramCooldowns: new Map(),
    visitDedup: new Map(),
  });

const CACHE_TTL_MS = 15_000;

export async function getSecuritySettings(forceRefresh = false): Promise<SecuritySettingsDoc> {
  const now = Date.now();
  if (!forceRefresh && now - memCache.settingsLoadedAt < CACHE_TTL_MS) {
    return memCache.settings;
  }
  if (!isMongoConfigured()) {
    return memCache.settings;
  }
  try {
    const db = await getDb();
    const doc = await db
      .collection("securitySettings")
      .findOne({ id: "main" }, { projection: { _id: 0 } });
    if (doc) {
      memCache.settings = {
        id: "main",
        autoBlockEnabled: doc.autoBlockEnabled !== false,
        strictScannerBlock: doc.strictScannerBlock !== false,
        telegramAlertsEnabled: doc.telegramAlertsEnabled !== false,
        whitelistIps: Array.isArray(doc.whitelistIps)
          ? doc.whitelistIps.map((x: unknown) => normalizeIp(String(x))).filter(Boolean)
          : [],
        updatedAt: String(doc.updatedAt || new Date().toISOString()),
      };
    } else {
      memCache.settings = { ...DEFAULT_SETTINGS, updatedAt: new Date().toISOString() };
    }
    memCache.settingsLoadedAt = now;
  } catch {
    // Keep cached settings on transient DB failure
  }
  return memCache.settings;
}

export async function updateSecuritySettings(
  patch: Partial<Pick<SecuritySettingsDoc, "autoBlockEnabled" | "strictScannerBlock" | "telegramAlertsEnabled" | "whitelistIps">>
): Promise<SecuritySettingsDoc> {
  const current = await getSecuritySettings(true);
  const next: SecuritySettingsDoc = {
    ...current,
    ...patch,
    id: "main",
    whitelistIps: Array.isArray(patch.whitelistIps)
      ? Array.from(new Set(patch.whitelistIps.map((ip) => normalizeIp(ip)).filter(isValidIpInput)))
      : current.whitelistIps,
    updatedAt: new Date().toISOString(),
  };

  if (isMongoConfigured()) {
    const db = await getDb();
    await db
      .collection("securitySettings")
      .updateOne({ id: "main" }, { $set: next }, { upsert: true });
  }

  memCache.settings = next;
  memCache.settingsLoadedAt = Date.now();
  return next;
}

async function refreshBlockedIpsCache(force = false): Promise<Set<string>> {
  const now = Date.now();
  if (!force && now - memCache.blockedLoadedAt < CACHE_TTL_MS) {
    return memCache.blockedIps;
  }
  if (!isMongoConfigured()) {
    return memCache.blockedIps;
  }
  try {
    const db = await getDb();
    const docs = await db
      .collection("blockedIps")
      .find({}, { projection: { ip: 1, _id: 0 } })
      .limit(2000)
      .toArray();
    memCache.blockedIps = new Set(docs.map((d: any) => normalizeIp(d.ip)).filter(Boolean));
    memCache.blockedLoadedAt = now;
  } catch {
    // Preserve in-memory set on transient error
  }
  return memCache.blockedIps;
}

export async function isIpWhitelisted(ip: string): Promise<boolean> {
  const clean = normalizeIp(ip);
  if (isLoopbackIp(clean)) return true;
  const settings = await getSecuritySettings();
  return settings.whitelistIps.includes(clean);
}

export async function isIpPermanentlyBlocked(ip: string): Promise<boolean> {
  const clean = normalizeIp(ip);
  if (isLoopbackIp(clean)) return false;
  if (await isIpWhitelisted(clean)) return false;
  const set = await refreshBlockedIpsCache();
  return set.has(clean);
}

export async function sendSecurityTelegramAlert(
  message: string,
  cooldownKey?: string,
  force = false
): Promise<{ sent: boolean; reason?: string }> {
  const settings = await getSecuritySettings();
  if (!force && !settings.telegramAlertsEnabled) {
    return { sent: false, reason: "Telegram ogohlantirishlari o'chirilgan" };
  }

  const token = (process.env.TELEGRAM_TOKEN || "").trim();
  const chatId = (process.env.ADMIN_CHAT_ID || "").trim();
  if (!token || !chatId) {
    return {
      sent: false,
      reason: "TELEGRAM_TOKEN yoki ADMIN_CHAT_ID muhit o'zgaruvchilari sozlanmagan",
    };
  }

  if (!force && cooldownKey) {
    const now = Date.now();
    const lastSent = memCache.telegramCooldowns.get(cooldownKey) || 0;
    if (now - lastSent < 60_000) {
      return { sent: false, reason: "Cooldown" };
    }
    memCache.telegramCooldowns.set(cooldownKey, now);
    if (memCache.telegramCooldowns.size > 500) {
      memCache.telegramCooldowns.clear();
    }
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: message.slice(0, 3800),
      }),
    });
    if (!res.ok) {
      return { sent: false, reason: `Telegram API xatolik (${res.status})` };
    }
    return { sent: true };
  } catch (err: any) {
    return { sent: false, reason: err?.message || "Telegram ulanish xatoligi" };
  }
}

export async function recordSecurityEvent(
  event: Omit<SecurityEventDoc, "id" | "createdAt" | "timestamp">
): Promise<SecurityEventDoc | null> {
  const now = Date.now();
  const doc: SecurityEventDoc = {
    ...event,
    id: `sec-${now}-${crypto.randomBytes(4).toString("hex")}`,
    ip: normalizeIp(event.ip),
    path: String(event.path || "/").slice(0, 300),
    detail: String(event.detail || "").slice(0, 400),
    payloadSnippet: event.payloadSnippet ? String(event.payloadSnippet).slice(0, 260) : undefined,
    createdAt: new Date(now).toISOString(),
    timestamp: now,
  };

  if (!isMongoConfigured()) return doc;

  try {
    const db = await getDb();
    const col = db.collection("securityEvents");
    await col.insertOne({ ...doc });

    // Opportunistic cap so free-tier MongoDB stays lean (keep latest 1500 events)
    if (Math.random() < 0.04) {
      const oldDocs = await col
        .find({}, { projection: { _id: 1 } })
        .sort({ timestamp: -1 })
        .skip(1500)
        .limit(500)
        .toArray();
      if (oldDocs.length > 0) {
        await col.deleteMany({ _id: { $in: oldDocs.map((d) => d._id) } });
      }
    }
  } catch {
    // Non-blocking audit persistence
  }
  return doc;
}

export async function permanentlyBanIp(params: {
  ip: string;
  reason: string;
  attackType: string;
  path: string;
  method?: string;
  userAgent?: string;
  country?: string;
  city?: string;
  payloadSnippet?: string;
  source?: "auto" | "admin";
  severity?: SecuritySeverity;
}): Promise<{ banned: boolean; alreadyWhitelisted?: boolean }> {
  const ip = normalizeIp(params.ip);
  const source = params.source || "auto";

  // Never auto-ban loopback or explicitly whitelisted owner IPs
  if (source === "auto" && (isLoopbackIp(ip) || (await isIpWhitelisted(ip)))) {
    await recordSecurityEvent({
      kind: "attack",
      attackType: params.attackType,
      severity: params.severity || "high",
      ip,
      country: params.country || "Noma'lum",
      city: params.city || "",
      userAgent: params.userAgent || "",
      deviceSummary: parseDeviceSummary(params.userAgent || ""),
      method: params.method || "GET",
      path: params.path,
      detail: `${params.reason} (Oq ro'yxat sabab bloklanmadi)`,
      payloadSnippet: params.payloadSnippet,
      blocked: false,
    });
    return { banned: false, alreadyWhitelisted: true };
  }

  const nowIso = new Date().toISOString();
  const isNewBan = !memCache.blockedIps.has(ip);
  memCache.blockedIps.add(ip);

  if (isMongoConfigured()) {
    try {
      const db = await getDb();
      await db.collection("blockedIps").updateOne(
        { ip },
        {
          $set: {
            ip,
            reason: params.reason.slice(0, 300),
            attackType: params.attackType.slice(0, 100),
            source,
            country: params.country || "Noma'lum",
            city: params.city || "",
            userAgent: (params.userAgent || "").slice(0, 260),
            lastPath: params.path.slice(0, 260),
            lastSeenAt: nowIso,
            permanent: true,
          },
          $setOnInsert: {
            blockedAt: nowIso,
          },
          $inc: { hits: 1 },
        },
        { upsert: true }
      );
    } catch {
      // Keep in-memory block active
    }
  }

  await recordSecurityEvent({
    kind: "attack",
    attackType: params.attackType,
    severity: params.severity || "critical",
    ip,
    country: params.country || "Noma'lum",
    city: params.city || "",
    userAgent: params.userAgent || "",
    deviceSummary: parseDeviceSummary(params.userAgent || ""),
    method: params.method || "GET",
    path: params.path,
    detail: params.reason,
    payloadSnippet: params.payloadSnippet,
    blocked: true,
  });

  if (isNewBan || source === "admin") {
    const geo = [params.country, params.city].filter(Boolean).join(", ") || "Noma'lum";
    const alertText = [
      `YUYU ANTI-HACK OGOHLANTIRISH`,
      `Chora: IP DOIMIY BLOKLANDI (${source === "admin" ? "Admin tomonidan" : "Avtomatik"})`,
      `Hujum turi: ${params.attackType}`,
      `IP manzil: ${ip}`,
      `Joylashuv: ${geo}`,
      `Manzil: ${params.method || "GET"} ${params.path.slice(0, 120)}`,
      `Sabab: ${params.reason.slice(0, 180)}`,
      `Vaqt: ${new Date().toLocaleString("uz-UZ", { timeZone: "Asia/Tashkent" })}`,
    ].join("\n");

    void sendSecurityTelegramAlert(alertText, `ban:${ip}`);
  }

  return { banned: true };
}

export async function unblockIpAddress(ip: string): Promise<boolean> {
  const clean = normalizeIp(ip);
  memCache.blockedIps.delete(clean);
  if (!isMongoConfigured()) return true;
  const db = await getDb();
  const res = await db.collection("blockedIps").deleteOne({ ip: clean });
  return res.deletedCount > 0;
}

/**
 * Tracks failed auth/admin login attempts per IP and auto-permanently bans brute-forcers.
 */
export async function recordFailedAuthAttempt(params: {
  ctx: ClientRequestContext;
  path: string;
  username?: string;
  phoneNumber?: string;
  reason: string;
  isAdminRoute: boolean;
}): Promise<{ bannedNow: boolean; attempts: number }> {
  const now = Date.now();
  const key = `${params.isAdminRoute ? "admin" : "auth"}:${params.ctx.ip}`;
  const threshold = params.isAdminRoute ? 3 : 6;
  const windowMs = 15 * 60 * 1000;

  let entry = memCache.authFailWindows.get(key);
  if (!entry || now > entry.resetAt) {
    entry = { count: 0, resetAt: now + windowMs };
  }
  entry.count += 1;
  memCache.authFailWindows.set(key, entry);

  const settings = await getSecuritySettings();
  const shouldBan = settings.autoBlockEnabled && entry.count >= threshold;

  if (shouldBan) {
    await permanentlyBanIp({
      ip: params.ctx.ip,
      reason: `${params.isAdminRoute ? "Admin" : "Hisob"} parol tanlash (Brute-Force): ${entry.count} ta muvaffaqiyatsiz urinish`,
      attackType: params.isAdminRoute ? "Admin Brute-Force Hujumi" : "Login Brute-Force",
      path: params.path,
      method: "POST",
      userAgent: params.ctx.userAgent,
      country: params.ctx.country,
      city: params.ctx.city,
      payloadSnippet: params.phoneNumber || params.username || undefined,
      severity: "critical",
    });
    return { bannedNow: true, attempts: entry.count };
  }

  await recordSecurityEvent({
    kind: "auth_failed",
    attackType: params.isAdminRoute ? "Noto'g'ri Admin Kirishi" : "Noto'g'ri Kirish",
    severity: params.isAdminRoute ? "high" : "medium",
    ip: params.ctx.ip,
    country: params.ctx.country,
    city: params.ctx.city,
    userAgent: params.ctx.userAgent,
    deviceSummary: params.ctx.deviceSummary,
    method: "POST",
    path: params.path,
    username: params.username,
    phoneNumber: params.phoneNumber,
    detail: `${params.reason} (${entry.count}/${threshold} urinish)`,
    blocked: false,
  });

  if (params.isAdminRoute) {
    const geo = [params.ctx.country, params.ctx.city].filter(Boolean).join(", ");
    void sendSecurityTelegramAlert(
      [
        `YUYU XAVFSIZLIK: Admin panelga muvaffaqiyatsiz urinish`,
        `IP: ${params.ctx.ip} (${geo})`,
        `Qurilma: ${params.ctx.deviceSummary}`,
        `Urinish: ${entry.count}/${threshold}`,
        `Sabab: ${params.reason}`,
      ].join("\n"),
      `adminfail:${params.ctx.ip}`
    );
  }

  return { bannedNow: false, attempts: entry.count };
}

export async function recordAuthorizedLogin(params: {
  ctx: ClientRequestContext;
  path: string;
  username: string;
  phoneNumber?: string;
  isAdmin: boolean;
  deviceLabel?: string;
}): Promise<void> {
  await recordSecurityEvent({
    kind: params.isAdmin ? "admin_login" : "user_login",
    severity: "info",
    ip: params.ctx.ip,
    country: params.ctx.country,
    city: params.ctx.city,
    userAgent: params.ctx.userAgent,
    deviceSummary: params.deviceLabel
      ? `${params.deviceLabel} (${params.ctx.deviceSummary})`
      : params.ctx.deviceSummary,
    method: "POST",
    path: params.path,
    username: params.username,
    phoneNumber: params.phoneNumber,
    detail: params.isAdmin
      ? "Admin paneliga tasdiqlangan kirish"
      : "Mijoz shaxsiy hisobiga kirdi",
    blocked: false,
  });

  if (params.isAdmin) {
    const geo = [params.ctx.country, params.ctx.city].filter(Boolean).join(", ");
    void sendSecurityTelegramAlert(
      [
        `YUYU ADMIN KIRISHI`,
        `Admin: ${params.username}`,
        `IP: ${params.ctx.ip} (${geo})`,
        `Qurilma: ${params.deviceLabel || params.ctx.deviceSummary}`,
        `Vaqt: ${new Date().toLocaleString("uz-UZ", { timeZone: "Asia/Tashkent" })}`,
      ].join("\n"),
      `adminlogin:${params.ctx.ip}`
    );
  }
}

export async function recordSiteVisit(params: {
  ctx: ClientRequestContext;
  path: string;
  username?: string;
  phoneNumber?: string;
  referrer?: string;
}): Promise<{ recorded: boolean }> {
  const now = Date.now();
  const dedupKey = `${params.ctx.ip}:${params.username || "guest"}:${params.path.slice(0, 60)}`;
  const prev = memCache.visitDedup.get(dedupKey) || 0;
  // Deduplicate identical visitor+path entries within 5 minutes so normal browsing stays clean
  if (now - prev < 5 * 60 * 1000) {
    return { recorded: false };
  }
  memCache.visitDedup.set(dedupKey, now);
  if (memCache.visitDedup.size > 1500) {
    memCache.visitDedup.clear();
  }

  const refInfo = params.referrer ? ` · Manba: ${params.referrer.slice(0, 80)}` : "";
  await recordSecurityEvent({
    kind: "visit",
    severity: "info",
    ip: params.ctx.ip,
    country: params.ctx.country,
    city: params.ctx.city,
    userAgent: params.ctx.userAgent,
    deviceSummary: params.ctx.deviceSummary,
    method: "GET",
    path: params.path || "/",
    username: params.username || undefined,
    phoneNumber: params.phoneNumber || undefined,
    detail: `${params.username ? "Ro'yxatdan o'tgan foydalanuvchi" : "Yangi tashrif buyuruvchi"} saytga kirdi${refInfo}`,
    blocked: false,
  });
  return { recorded: true };
}

function checkRateLimitBurst(ip: string, isAuthRoute: boolean): { exceeded: boolean; count: number } {
  if (isLoopbackIp(ip)) return { exceeded: false, count: 0 };
  const now = Date.now();
  const key = `${isAuthRoute ? "rl_auth" : "rl_api"}:${ip}`;
  const limit = isAuthRoute ? 20 : 160;
  const windowMs = 60_000;

  let entry = memCache.rateWindows.get(key);
  if (!entry || now > entry.resetAt) {
    entry = { count: 0, resetAt: now + windowMs };
  }
  entry.count += 1;
  memCache.rateWindows.set(key, entry);

  if (memCache.rateWindows.size > 2000) {
    memCache.rateWindows.clear();
  }

  return { exceeded: entry.count > limit, count: entry.count };
}

/**
 * Primary server-side Anti-Hack gate for Next.js App Router API routes.
 * Returns a 403 NextResponse if blocked, or null to allow the request to proceed.
 */
export async function enforceApiSecurity(
  request: NextRequest
): Promise<NextResponse | null> {
  const ctx = extractClientContext(request);
  const url = new URL(request.url);
  const pathname = url.pathname;
  const search = url.search || "";

  // Safety valve: never accidentally block a verified active admin device
  const hasAdminHeader = Boolean((request.headers.get("x-admin-device-token") || "").trim());
  if (hasAdminHeader) {
    const validAdmin = await verifyNextAdminDevice(request).catch(() => null);
    if (validAdmin) {
      return null;
    }
  }

  // 1. Check permanent IP ban list
  if (await isIpPermanentlyBlocked(ctx.ip)) {
    if (isMongoConfigured()) {
      void getDb()
        .then((db) =>
          db.collection("blockedIps").updateOne(
            { ip: ctx.ip },
            {
              $inc: { hits: 1 },
              $set: { lastSeenAt: new Date().toISOString(), lastPath: pathname.slice(0, 260) },
            }
          )
        )
        .catch(() => {});
    }
    return NextResponse.json(
      {
        error: "Kirish taqiqlangan: sizning IP manzilingiz xavfsizlik tizimi tomonidan bloklangan.",
        code: "IP_BLOCKED",
      },
      { status: 403 }
    );
  }

  // 2. Inspect URL, query, and User-Agent against scanner / injection / honeypot rules
  const settings = await getSecuritySettings();
  const threat = detectThreatFromRequest({
    pathname,
    search,
    userAgent: ctx.userAgent,
    strictScannerBlock: settings.strictScannerBlock,
    isLoopback: isLoopbackIp(ctx.ip),
  });

  if (threat.detected) {
    if (settings.autoBlockEnabled) {
      await permanentlyBanIp({
        ip: ctx.ip,
        reason: threat.reason,
        attackType: threat.attackType,
        path: `${pathname}${search}`.slice(0, 260),
        method: request.method,
        userAgent: ctx.userAgent,
        country: ctx.country,
        city: ctx.city,
        payloadSnippet: threat.payloadSnippet,
        severity: threat.severity,
      });
    } else {
      await recordSecurityEvent({
        kind: "attack",
        attackType: threat.attackType,
        severity: threat.severity,
        ip: ctx.ip,
        country: ctx.country,
        city: ctx.city,
        userAgent: ctx.userAgent,
        deviceSummary: ctx.deviceSummary,
        method: request.method,
        path: `${pathname}${search}`.slice(0, 260),
        detail: threat.reason,
        payloadSnippet: threat.payloadSnippet,
        blocked: true,
      });
    }

    return NextResponse.json(
      {
        error: "Shubhali so'rov aniqlandi va xavfsizlik tizimi tomonidan to'xtatildi.",
        code: "SECURITY_BLOCKED",
      },
      { status: 403 }
    );
  }

  // 3. Burst rate limit protection (DDoS / scraping flood)
  const isAuthRoute =
    pathname.startsWith("/api/auth/") || pathname.startsWith("/api/admin-access/");
  const rate = checkRateLimitBurst(ctx.ip, isAuthRoute);
  if (rate.exceeded && !(await isIpWhitelisted(ctx.ip))) {
    if (settings.autoBlockEnabled) {
      await permanentlyBanIp({
        ip: ctx.ip,
        reason: `Haddan tashqari tez so'rovlar (${rate.count} ta/daqiqa) — DDoS/Flood himoyasi`,
        attackType: "Tezlik Cheklovi / DDoS",
        path: pathname,
        method: request.method,
        userAgent: ctx.userAgent,
        country: ctx.country,
        city: ctx.city,
        severity: "critical",
      });
    }
    return NextResponse.json(
      {
        error: "Juda ko'p so'rov yuborildi. Xavfsizlik himoyasi faollashtirildi.",
        code: "RATE_LIMIT_BLOCKED",
      },
      { status: 429 }
    );
  }

  return null;
}

export async function getSecurityOverview(currentIp: string) {
  const settings = await getSecuritySettings(true);
  const telegramConfigured = Boolean(
    (process.env.TELEGRAM_TOKEN || "").trim() && (process.env.ADMIN_CHAT_ID || "").trim()
  );

  if (!isMongoConfigured()) {
    return {
      summary: {
        blockedIpsCount: memCache.blockedIps.size,
        attacks24h: 0,
        visitsToday: 0,
        totalAttacks: 0,
        adminLogins24h: 0,
      },
      attacks: [] as SecurityEventDoc[],
      visits: [] as SecurityEventDoc[],
      blockedIps: [] as BlockedIpDoc[],
      settings,
      currentIp: normalizeIp(currentIp),
      telegramConfigured,
    };
  }

  const db = await getDb();
  const eventsCol = db.collection("securityEvents");
  const blockedCol = db.collection("blockedIps");

  const now = Date.now();
  const last24h = now - 24 * 60 * 60 * 1000;
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const todayTs = startOfToday.getTime();

  const [
    blockedIpsCount,
    attacks24h,
    totalAttacks,
    visitsToday,
    adminLogins24h,
    attacks,
    visits,
    blockedIps,
  ] = await Promise.all([
    blockedCol.countDocuments({}),
    eventsCol.countDocuments({
      kind: { $in: ["attack", "auth_failed", "blocked_hit"] },
      timestamp: { $gte: last24h },
    }),
    eventsCol.countDocuments({
      kind: { $in: ["attack", "auth_failed", "blocked_hit"] },
    }),
    eventsCol.countDocuments({
      kind: { $in: ["visit", "user_login", "admin_login"] },
      timestamp: { $gte: todayTs },
    }),
    eventsCol.countDocuments({
      kind: "admin_login",
      timestamp: { $gte: last24h },
    }),
    eventsCol
      .find(
        { kind: { $in: ["attack", "auth_failed", "blocked_hit"] } },
        { projection: { _id: 0 } }
      )
      .sort({ timestamp: -1 })
      .limit(120)
      .toArray(),
    eventsCol
      .find(
        { kind: { $in: ["visit", "user_login", "admin_login"] } },
        { projection: { _id: 0 } }
      )
      .sort({ timestamp: -1 })
      .limit(150)
      .toArray(),
    blockedCol
      .find({}, { projection: { _id: 0 } })
      .sort({ lastSeenAt: -1 })
      .limit(200)
      .toArray(),
  ]);

  // Keep in-memory block set warm & synchronized
  memCache.blockedIps = new Set(blockedIps.map((b: any) => normalizeIp(b.ip)).filter(Boolean));
  memCache.blockedLoadedAt = now;

  return {
    summary: {
      blockedIpsCount,
      attacks24h,
      visitsToday,
      totalAttacks,
      adminLogins24h,
    },
    attacks,
    visits,
    blockedIps,
    settings,
    currentIp: normalizeIp(currentIp),
    telegramConfigured,
  };
}
