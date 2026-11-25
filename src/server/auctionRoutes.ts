import express, { Request } from "express";
import crypto from "crypto";
import { Db } from "mongodb";

export type AuctionStatus =
  | "PENDING_APPROVAL"
  | "UPCOMING"
  | "LIVE"
  | "ENDED"
  | "CANCELLED"
  | "REJECTED";

export type SellerPayoutStatus =
  | "YELLOW_PENDING"
  | "BLUE_AVAILABLE"
  | "WITHDRAW_REQUESTED"
  | "PAID";

export type VipTier = "NONE" | "SILVER" | "GOLD" | "DIAMOND";

export interface AuctionDoc {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  startPrice: number;
  currentPrice: number;
  minStep: number;
  startsAt: string;
  endsAt: string;
  durationHours?: number;
  status: AuctionStatus;
  highestBidderId: string | null;
  highestBidderName: string | null;
  highestBidderPhone?: string | null;
  bidsCount: number;
  claimedOrderId?: string | null;
  isUserSubmitted?: boolean;
  sellerId?: string | null;
  sellerName?: string | null;
  sellerPhone?: string | null;
  sellerVipTier?: VipTier;
  sellerCardNumber?: string | null;
  sellerCardHolder?: string | null;
  rejectReason?: string | null;
  payoutId?: string | null;
  payoutStatus?: SellerPayoutStatus | null;
  buyerConfirmedReceipt?: boolean;
  buyerConfirmedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BidDoc {
  id: string;
  auctionId: string;
  userId: string;
  userName: string;
  userPhone: string;
  amount: number;
  createdAt: string;
}

export interface SellerPayoutDoc {
  id: string;
  auctionId: string;
  auctionTitle: string;
  auctionImage: string;
  sellerId: string;
  sellerName: string;
  sellerPhone: string;
  sellerCardNumber: string;
  sellerCardHolder: string;
  buyerId: string;
  buyerName: string;
  buyerPhone: string;
  orderId: string | null;
  amount: number;
  status: SellerPayoutStatus;
  buyerConfirmedReceipt: boolean;
  buyerConfirmedAt: string | null;
  unlockedAt: string | null;
  withdrawRequestedAt: string | null;
  paidAt: string | null;
  adminNote: string | null;
  createdAt: string;
  updatedAt: string;
}

const ANTI_SNIPE_WINDOW_MS = 30 * 1000;
const ANTI_SNIPE_EXTENSION_MS = 30 * 1000;
const WEEKLY_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;
const DEFAULT_START_PRICE = 10000;
const DEFAULT_MIN_STEP = 5000;
const DEFAULT_DURATION_HOURS = 24;

const DEFAULT_AUCTION_IMAGE =
  "/images/auction_headphones_pearl_1795274187706.jpg";

let auctionSeeded = false;

function stripId<T extends Record<string, any>>(doc: T): Omit<T, "_id"> {
  if (!doc || typeof doc !== "object") return doc;
  const { _id, ...rest } = doc;
  return rest;
}

function isSafeImageUrl(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith("/")) return true;
  if (/^data:image\/(png|jpeg|jpg|webp|gif);base64,/i.test(trimmed)) return true;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

function normalizeCardDigits(raw: string): string {
  return String(raw || "").replace(/\D/g, "");
}

function formatCardNumber(digits: string): string {
  const clean = normalizeCardDigits(digits);
  if (clean.length !== 16) return clean;
  return `${clean.slice(0, 4)} ${clean.slice(4, 8)} ${clean.slice(8, 12)} ${clean.slice(12, 16)}`;
}

function maskCardNumber(digits?: string | null): string {
  const clean = normalizeCardDigits(digits || "");
  if (clean.length !== 16) return "";
  return `${clean.slice(0, 4)} **** **** ${clean.slice(12, 16)}`;
}

function formatUzsServer(amount: number): string {
  return `${Math.round(Number(amount) || 0).toLocaleString("en-US").replace(/,/g, " ")} so'm`;
}

function computeServerVipInfo(userDoc: any): { isVip: boolean; vipTier: VipTier } {
  if (!userDoc || typeof userDoc !== "object") {
    return { isVip: false, vipTier: "NONE" };
  }
  const tierOrder: VipTier[] = ["NONE", "SILVER", "GOLD", "DIAMOND"];
  const stored: VipTier = tierOrder.includes(userDoc.vipTier) ? userDoc.vipTier : "NONE";
  const totalSpent = Math.max(0, Number(userDoc.totalSpent) || 0);

  let activeSub = false;
  if (userDoc.isSubscribedVip) {
    if (!userDoc.vipExpiresAt) {
      activeSub = true;
    } else {
      const expMs = new Date(userDoc.vipExpiresAt).getTime();
      activeSub = !Number.isNaN(expMs) && expMs > Date.now();
    }
  }

  let tier: VipTier = stored;
  if (activeSub && tierOrder.indexOf("GOLD") > tierOrder.indexOf(tier)) {
    tier = "GOLD";
  }

  let spentTier: VipTier = "NONE";
  if (totalSpent >= 5000000) spentTier = "DIAMOND";
  else if (totalSpent >= 2000000) spentTier = "GOLD";
  else if (totalSpent >= 500000) spentTier = "SILVER";

  if (stored === "NONE" && spentTier !== "NONE") {
    if (tierOrder.indexOf(spentTier) > tierOrder.indexOf(tier)) {
      tier = spentTier;
    }
  }

  return {
    isVip: tier !== "NONE",
    vipTier: tier
  };
}

export function maskBidderName(name?: string | null): string {
  const clean = String(name || "").trim();
  if (!clean) return "Ishtirokchi";
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return parts[0].length > 14 ? `${parts[0].slice(0, 12)}…` : parts[0];
  }
  return `${parts[0]} ${parts[1][0].toUpperCase()}.`;
}

function toPublicAuction(doc: AuctionDoc, latestBids?: BidDoc[]) {
  const cleaned = stripId(doc);
  return {
    id: cleaned.id,
    title: cleaned.title,
    description: cleaned.description,
    imageUrl: cleaned.imageUrl,
    startPrice: cleaned.startPrice,
    currentPrice: cleaned.currentPrice,
    minStep: cleaned.minStep,
    startsAt: cleaned.startsAt,
    endsAt: cleaned.endsAt,
    durationHours: cleaned.durationHours || DEFAULT_DURATION_HOURS,
    status: cleaned.status,
    highestBidderId: cleaned.highestBidderId,
    highestBidderName: cleaned.highestBidderName
      ? maskBidderName(cleaned.highestBidderName)
      : null,
    bidsCount: cleaned.bidsCount || 0,
    claimedOrderId: cleaned.claimedOrderId || null,
    isUserSubmitted: Boolean(cleaned.isUserSubmitted),
    sellerId: cleaned.sellerId || null,
    sellerName: cleaned.sellerName ? maskBidderName(cleaned.sellerName) : null,
    sellerVipTier: cleaned.sellerVipTier || "NONE",
    payoutId: cleaned.payoutId || null,
    payoutStatus: cleaned.payoutStatus || null,
    buyerConfirmedReceipt: Boolean(cleaned.buyerConfirmedReceipt),
    buyerConfirmedAt: cleaned.buyerConfirmedAt || null,
    createdAt: cleaned.createdAt,
    ...(latestBids
      ? {
          latestBids: latestBids.map((b) => ({
            id: b.id,
            auctionId: b.auctionId,
            userId: b.userId,
            userName: maskBidderName(b.userName),
            amount: b.amount,
            createdAt: b.createdAt
          }))
        }
      : {})
  };
}

function toOwnerAuction(doc: AuctionDoc) {
  const pub = toPublicAuction(doc);
  return {
    ...pub,
    sellerCardNumber: doc.sellerCardNumber ? maskCardNumber(doc.sellerCardNumber) : null,
    sellerCardHolder: doc.sellerCardHolder || null,
    rejectReason: doc.rejectReason || null
  };
}

async function ensureAuctionsInitialized(db: Db): Promise<void> {
  if (auctionSeeded) return;
  const metaCol = db.collection("meta");
  const flag = await metaCol.findOne({ key: "auctions_seed_v1" });

  try {
    await Promise.all([
      db.collection("auctions").createIndex({ id: 1 }, { unique: true }),
      db.collection("auctions").createIndex({ status: 1, endsAt: 1 }),
      db.collection("auctions").createIndex({ sellerId: 1, createdAt: -1 }),
      db.collection("bids").createIndex({ auctionId: 1, createdAt: -1 }),
      db.collection("bids").createIndex({ userId: 1, createdAt: -1 }),
      db.collection("seller_payouts").createIndex({ id: 1 }, { unique: true }),
      db.collection("seller_payouts").createIndex({ auctionId: 1 }, { unique: true }),
      db.collection("seller_payouts").createIndex({ sellerId: 1, createdAt: -1 }),
      db.collection("seller_payouts").createIndex({ status: 1, updatedAt: -1 })
    ]);
  } catch (err) {
    console.warn("Auction index creation warning:", err);
  }

  if (!flag) {
    const existingCount = await db.collection("auctions").countDocuments();
    if (existingCount === 0) {
      const now = Date.now();
      const startsAt = new Date(now).toISOString();
      const endsAt = new Date(now + DEFAULT_DURATION_HOURS * 3600 * 1000).toISOString();
      const seedAuction: AuctionDoc = {
        id: "auc-weekly-1",
        title: "Aether Studio Pro ANC — Pearl Edition",
        description:
          "Haftalik YUYU Shop Kim oshdi savdosi! Faol shovqin kamaytirish (ANC), 40 soatlik batareya quvvati va yumshoq xotira yostiqchali premium simsiz quloqchin. Boshlang'ich narx atigi 10 000 so'm — eng yuqori stavka qo'ygan ishtirokchi g'olib bo'ladi!",
        imageUrl: DEFAULT_AUCTION_IMAGE,
        startPrice: DEFAULT_START_PRICE,
        currentPrice: DEFAULT_START_PRICE,
        minStep: DEFAULT_MIN_STEP,
        startsAt,
        endsAt,
        durationHours: DEFAULT_DURATION_HOURS,
        status: "LIVE",
        highestBidderId: null,
        highestBidderName: null,
        highestBidderPhone: null,
        bidsCount: 0,
        claimedOrderId: null,
        isUserSubmitted: false,
        createdAt: startsAt,
        updatedAt: startsAt
      };
      await db.collection("auctions").insertOne(seedAuction);
    }

    await metaCol.updateOne(
      { key: "auctions_seed_v1" },
      { $set: { key: "auctions_seed_v1", seededAt: new Date().toISOString() } },
      { upsert: true }
    );
  }

  auctionSeeded = true;
}

async function syncExpiredAuctions(db: Db): Promise<void> {
  const nowIso = new Date().toISOString();
  await db.collection("auctions").updateMany(
    {
      status: "LIVE",
      endsAt: { $lte: nowIso }
    },
    {
      $set: {
        status: "ENDED",
        updatedAt: nowIso
      }
    }
  );
}

async function fetchLatestBidsForAuction(
  db: Db,
  auctionId: string,
  limit = 10
): Promise<BidDoc[]> {
  const docs = await db
    .collection("bids")
    .find({ auctionId })
    .sort({ createdAt: -1, amount: -1 })
    .limit(limit)
    .toArray();
  return docs.map((d) => stripId(d) as BidDoc);
}

async function getUserCandidateIds(db: Db, rawUserId: string) {
  const userDoc = await db.collection("users").findOne({
    $or: [{ telegramId: rawUserId }, { phoneNumber: rawUserId }]
  });
  const candidateIds = Array.from(
    new Set(
      [
        rawUserId,
        userDoc?.telegramId ? String(userDoc.telegramId) : "",
        userDoc?.phoneNumber ? String(userDoc.phoneNumber) : ""
      ].filter(Boolean)
    )
  );
  return { userDoc, candidateIds };
}

async function getSellerWeeklyQuota(db: Db, userDoc: any, candidateIds: string[]) {
  const { isVip, vipTier } = computeServerVipInfo(userDoc);
  const cutoffIso = new Date(Date.now() - WEEKLY_COOLDOWN_MS).toISOString();

  const recentListing = (await db
    .collection("auctions")
    .find({
      isUserSubmitted: true,
      sellerId: { $in: candidateIds },
      status: { $ne: "REJECTED" },
      createdAt: { $gte: cutoffIso }
    })
    .sort({ createdAt: -1 })
    .limit(1)
    .next()) as unknown as AuctionDoc | null;

  if (!recentListing) {
    return {
      isVip,
      vipTier,
      canSubmitNow: isVip,
      lastSubmittedAt: null,
      nextAllowedAt: null,
      daysRemaining: 0
    };
  }

  const lastMs = new Date(recentListing.createdAt).getTime();
  const nextMs = lastMs + WEEKLY_COOLDOWN_MS;
  const remainingMs = Math.max(0, nextMs - Date.now());
  const daysRemaining = Math.ceil(remainingMs / (24 * 60 * 60 * 1000));

  return {
    isVip,
    vipTier,
    canSubmitNow: isVip && remainingMs === 0,
    lastSubmittedAt: recentListing.createdAt,
    nextAllowedAt: new Date(nextMs).toISOString(),
    daysRemaining
  };
}

async function ensureSellerPayoutForAuction(
  db: Db,
  auction: AuctionDoc,
  orderId: string | null,
  notifyAdmin?: (msg: string) => Promise<void>
): Promise<SellerPayoutDoc | null> {
  if (!auction.isUserSubmitted || !auction.sellerId || !auction.highestBidderId) {
    return null;
  }

  const existingPayout = (await db
    .collection("seller_payouts")
    .findOne({ auctionId: auction.id })) as unknown as SellerPayoutDoc | null;

  if (existingPayout) {
    return stripId(existingPayout);
  }

  const nowIso = new Date().toISOString();
  const payout: SellerPayoutDoc = {
    id: `pay-${Date.now()}-${crypto.randomBytes(2).toString("hex")}`,
    auctionId: auction.id,
    auctionTitle: auction.title,
    auctionImage: auction.imageUrl,
    sellerId: auction.sellerId,
    sellerName: auction.sellerName || "VIP Sotuvchi",
    sellerPhone: auction.sellerPhone || auction.sellerId,
    sellerCardNumber: auction.sellerCardNumber || "",
    sellerCardHolder: auction.sellerCardHolder || auction.sellerName || "Karta egasi",
    buyerId: auction.highestBidderId,
    buyerName: auction.highestBidderName || "Xaridor",
    buyerPhone: auction.highestBidderPhone || auction.highestBidderId,
    orderId: orderId || auction.claimedOrderId || null,
    amount: Math.max(0, Math.round(Number(auction.currentPrice) || 0)),
    status: "YELLOW_PENDING",
    buyerConfirmedReceipt: Boolean(auction.buyerConfirmedReceipt),
    buyerConfirmedAt: auction.buyerConfirmedAt || null,
    unlockedAt: null,
    withdrawRequestedAt: null,
    paidAt: null,
    adminNote: null,
    createdAt: nowIso,
    updatedAt: nowIso
  };

  await db.collection("seller_payouts").insertOne(payout);
  await db.collection("auctions").updateOne(
    { id: auction.id },
    {
      $set: {
        payoutId: payout.id,
        payoutStatus: "YELLOW_PENDING",
        updatedAt: nowIso
      }
    }
  );

  if (notifyAdmin) {
    await notifyAdmin(
      `🟡 *YUYU Auksion — Sotuvchi hisobiga SARIQ pul tushdi*\n` +
        `📦 Tovar: ${payout.auctionTitle}\n` +
        `💰 Summa: ${formatUzsServer(payout.amount)}\n` +
        `🏷 Sotuvchi: ${payout.sellerName} (${payout.sellerPhone})\n` +
        `💳 Karta: ${formatCardNumber(payout.sellerCardNumber)}\n` +
        `👤 Xaridor: ${payout.buyerName} (${payout.buyerPhone})\n` +
        `⏳ Xaridor "Oldim" deb yozgach, Admin paneldagi "Sotuvchi to'lovlari" bo'limidan KO'K qiling.`
    );
  }

  return payout;
}

export function registerAuctionRoutes(
  router: express.Router,
  deps: {
    requireDb: () => Promise<Db>;
    verifyRequestAdminDevice: (req: Request, db: Db) => Promise<any>;
    sendAdminTelegramAlert?: (message: string) => Promise<void>;
  }
) {
  const { requireDb, verifyRequestAdminDevice, sendAdminTelegramAlert } = deps;

  const fireAdminAlert = async (msg: string) => {
    if (!sendAdminTelegramAlert) return;
    try {
      await sendAdminTelegramAlert(msg);
    } catch (e) {
      console.warn("Admin alert failed:", e);
    }
  };

  // 1. GET /api/auctions/active — Live auctions + latest 10 bids each
  router.get("/auctions/active", async (_req, res) => {
    try {
      const db = await requireDb();
      await ensureAuctionsInitialized(db);
      await syncExpiredAuctions(db);

      const liveDocs = (await db
        .collection("auctions")
        .find({ status: "LIVE" })
        .sort({ endsAt: 1, createdAt: -1 })
        .toArray()) as unknown as AuctionDoc[];

      const recentEndedDocs = (await db
        .collection("auctions")
        .find({ status: "ENDED" })
        .sort({ endsAt: -1 })
        .limit(4)
        .toArray()) as unknown as AuctionDoc[];

      const liveAuctions = await Promise.all(
        liveDocs.map(async (doc) => {
          const latestBids = await fetchLatestBidsForAuction(db, doc.id, 10);
          return toPublicAuction(doc, latestBids);
        })
      );

      const recentEnded = recentEndedDocs.map((doc) => toPublicAuction(doc));

      res.json({
        success: true,
        serverTime: new Date().toISOString(),
        auctions: liveAuctions,
        recentEnded
      });
    } catch (e: any) {
      res.status(500).json({ error: e?.message || "Auksionlarni yuklashda xatolik" });
    }
  });

  // 1B. GET /api/auctions/leaderboard — Real people Top Sellers & Top Bidders from MongoDB
  router.get("/auctions/leaderboard", async (_req, res) => {
    try {
      const db = await requireDb();
      await ensureAuctionsInitialized(db);
      await syncExpiredAuctions(db);

      const [allAuctions, allBids, allPayouts, allUsers] = await Promise.all([
        db.collection("auctions").find({}).toArray() as unknown as Promise<AuctionDoc[]>,
        db.collection("bids").find({}).toArray() as unknown as Promise<BidDoc[]>,
        db.collection("seller_payouts").find({}).toArray() as unknown as Promise<SellerPayoutDoc[]>,
        db
          .collection("users")
          .find({}, { projection: { telegramId: 1, phoneNumber: 1, username: 1, vipTier: 1, isSubscribedVip: 1, vipExpiresAt: 1, totalSpent: 1 } })
          .toArray()
      ]);

      const userLookup = new Map<string, any>();
      for (const u of allUsers) {
        if (u.telegramId) userLookup.set(String(u.telegramId), u);
        if (u.phoneNumber) userLookup.set(String(u.phoneNumber), u);
      }

      // Build real seller leaderboard from real user-submitted ended auctions & payouts
      const sellerMap = new Map<
        string,
        {
          userId: string;
          name: string;
          vipTier: VipTier;
          soldCount: number;
          totalSalesUzs: number;
          paidCount: number;
          countedAuctionIds: Set<string>;
        }
      >();

      const getOrCreateSeller = (sellerId: string, fallbackName: string, fallbackTier?: VipTier) => {
        const u = userLookup.get(sellerId);
        const canonicalId = u?.telegramId ? String(u.telegramId) : sellerId;
        let entry = sellerMap.get(canonicalId);
        if (!entry) {
          const vip = u ? computeServerVipInfo(u) : { isVip: fallbackTier && fallbackTier !== "NONE", vipTier: fallbackTier || "NONE" };
          entry = {
            userId: canonicalId,
            name: String(u?.username || fallbackName || "VIP Sotuvchi").trim(),
            vipTier: vip.vipTier,
            soldCount: 0,
            totalSalesUzs: 0,
            paidCount: 0,
            countedAuctionIds: new Set<string>()
          };
          sellerMap.set(canonicalId, entry);
        }
        return entry;
      };

      for (const p of allPayouts) {
        if (!p.sellerId) continue;
        const entry = getOrCreateSeller(p.sellerId, p.sellerName);
        if (!entry.countedAuctionIds.has(p.auctionId)) {
          entry.countedAuctionIds.add(p.auctionId);
          entry.soldCount += 1;
          entry.totalSalesUzs += Math.max(0, Number(p.amount) || 0);
        }
        if (p.status === "PAID" || p.status === "BLUE_AVAILABLE") {
          entry.paidCount += 1;
        }
      }

      for (const auc of allAuctions) {
        if (auc.isUserSubmitted && auc.sellerId && auc.status === "ENDED" && auc.highestBidderId) {
          const entry = getOrCreateSeller(
            auc.sellerId,
            auc.sellerName || "VIP Sotuvchi",
            auc.sellerVipTier
          );
          if (!entry.countedAuctionIds.has(auc.id)) {
            entry.countedAuctionIds.add(auc.id);
            entry.soldCount += 1;
            entry.totalSalesUzs += Math.max(0, Number(auc.currentPrice) || 0);
          }
        }
      }

      const topSellers = Array.from(sellerMap.values())
        .sort((a, b) => b.totalSalesUzs - a.totalSalesUzs || b.soldCount - a.soldCount)
        .slice(0, 10)
        .map(({ countedAuctionIds: _ignored, ...rest }) => rest);

      // Build real bidder/winner leaderboard
      const bidderMap = new Map<
        string,
        {
          userId: string;
          name: string;
          vipTier: VipTier;
          winsCount: number;
          totalBids: number;
          totalSpentUzs: number;
        }
      >();

      const getOrCreateBidder = (bidderId: string, fallbackName: string) => {
        const u = userLookup.get(bidderId);
        const canonicalId = u?.telegramId ? String(u.telegramId) : bidderId;
        let entry = bidderMap.get(canonicalId);
        if (!entry) {
          const vip = u ? computeServerVipInfo(u) : { isVip: false, vipTier: "NONE" as VipTier };
          entry = {
            userId: canonicalId,
            name: String(u?.username || fallbackName || "Ishtirokchi").trim(),
            vipTier: vip.vipTier,
            winsCount: 0,
            totalBids: 0,
            totalSpentUzs: 0
          };
          bidderMap.set(canonicalId, entry);
        }
        return entry;
      };

      for (const bid of allBids) {
        if (!bid.userId) continue;
        const entry = getOrCreateBidder(bid.userId, bid.userName);
        entry.totalBids += 1;
      }

      let totalSoldAuctions = 0;
      let totalLive = 0;
      for (const auc of allAuctions) {
        if (auc.status === "LIVE") totalLive += 1;
        if (auc.status === "ENDED" && auc.highestBidderId) {
          totalSoldAuctions += 1;
          const entry = getOrCreateBidder(auc.highestBidderId, auc.highestBidderName || "G'olib");
          entry.winsCount += 1;
          entry.totalSpentUzs += Math.max(0, Number(auc.currentPrice) || 0);
        }
      }

      const topBidders = Array.from(bidderMap.values())
        .sort(
          (a, b) =>
            b.winsCount - a.winsCount ||
            b.totalSpentUzs - a.totalSpentUzs ||
            b.totalBids - a.totalBids
        )
        .slice(0, 10);

      res.json({
        success: true,
        topSellers,
        topBidders,
        stats: {
          totalLive,
          totalSoldAuctions,
          totalRealSellers: sellerMap.size,
          totalBids: allBids.length
        }
      });
    } catch (e: any) {
      res.status(500).json({ error: e?.message || "Top reytingni yuklashda xatolik" });
    }
  });

  // 1C. POST /api/auctions/seller-submit — VIP user submits own item once per week (needs Admin approval)
  router.post("/auctions/seller-submit", async (req, res) => {
    try {
      const rawUserId = String(req.headers["x-user-id"] || req.body?.userId || "").trim();
      if (!rawUserId) {
        return res.status(401).json({ error: "Mahsulot qo'shish uchun avval tizimga kiring" });
      }

      const db = await requireDb();
      await ensureAuctionsInitialized(db);

      const { userDoc, candidateIds } = await getUserCandidateIds(db, rawUserId);
      if (!userDoc) {
        return res.status(401).json({ error: "Foydalanuvchi topilmadi. Qaytadan tizimga kiring" });
      }

      const quota = await getSellerWeeklyQuota(db, userDoc, candidateIds);
      if (!quota.isVip) {
        return res.status(403).json({
          error: "Auksionga o'z mahsulotingizni joylash faqat VIP mijozlar uchun ochiq (eng arzon VIP ham kifoya).",
          requiresVip: true
        });
      }

      if (!quota.canSubmitNow) {
        return res.status(429).json({
          error: `Siz bu hafta auksionga mahsulot joylagansiz. Keyingi ruxsat ${quota.daysRemaining} kundan so'ng ochiladi.`,
          nextAllowedAt: quota.nextAllowedAt,
          daysRemaining: quota.daysRemaining
        });
      }

      const title = String(req.body?.title || "").trim();
      const description = String(req.body?.description || "").trim();
      const imageUrl = String(req.body?.imageUrl || "").trim();
      const startPrice = Math.round(Number(req.body?.startPrice) || DEFAULT_START_PRICE);
      const minStep = Math.round(Number(req.body?.minStep) || DEFAULT_MIN_STEP);
      const rawDuration = Number(req.body?.durationHours) || DEFAULT_DURATION_HOURS;
      const durationHours = [12, 24, 48].includes(rawDuration) ? rawDuration : 24;
      const cardDigits = normalizeCardDigits(String(req.body?.sellerCardNumber || ""));
      const sellerCardHolder = String(req.body?.sellerCardHolder || userDoc.username || "").trim();

      if (title.length < 3 || title.length > 140) {
        return res.status(400).json({
          error: "Mahsulot nomi 3 dan 140 tagacha belgidan iborat bo'lishi kerak"
        });
      }
      if (!imageUrl || !isSafeImageUrl(imageUrl)) {
        return res.status(400).json({
          error: "Iltimos, mahsulot rasmini yuklang yoki to'g'ri HTTPS havola kiriting"
        });
      }
      if (!Number.isFinite(startPrice) || startPrice < 10000) {
        return res.status(400).json({
          error: "Boshlang'ich narx kamida 10 000 so'm bo'lishi kerak"
        });
      }
      if (!Number.isFinite(minStep) || minStep < 5000) {
        return res.status(400).json({
          error: "Minimal qadam kamida 5 000 so'm bo'lishi kerak"
        });
      }
      if (cardDigits.length !== 16) {
        return res.status(400).json({
          error: "Sotuvdan tushadigan pul uchun 16 xonali UZCARD/HUMO karta raqamingizni to'g'ri kiriting"
        });
      }
      if (sellerCardHolder.length < 2 || sellerCardHolder.length > 80) {
        return res.status(400).json({
          error: "Karta egasining ism-familiyasini kiriting"
        });
      }

      const nowMs = Date.now();
      const nowIso = new Date(nowMs).toISOString();
      const canonicalUserId = String(userDoc.telegramId || rawUserId);
      const sellerName = String(userDoc.username || "VIP Sotuvchi").trim();
      const sellerPhone = String(userDoc.phoneNumber || userDoc.telegramId || "").trim();

      const newAuction: AuctionDoc = {
        id: `auc-vip-${nowMs}-${crypto.randomBytes(2).toString("hex")}`,
        title,
        description:
          description ||
          "VIP mijoz tomonidan haftalik Kim oshdi savdosiga joylangan mahsulot.",
        imageUrl,
        startPrice,
        currentPrice: startPrice,
        minStep,
        startsAt: nowIso,
        endsAt: new Date(nowMs + durationHours * 3600 * 1000).toISOString(),
        durationHours,
        status: "PENDING_APPROVAL",
        highestBidderId: null,
        highestBidderName: null,
        highestBidderPhone: null,
        bidsCount: 0,
        claimedOrderId: null,
        isUserSubmitted: true,
        sellerId: canonicalUserId,
        sellerName,
        sellerPhone,
        sellerVipTier: quota.vipTier,
        sellerCardNumber: cardDigits,
        sellerCardHolder,
        rejectReason: null,
        payoutId: null,
        payoutStatus: null,
        buyerConfirmedReceipt: false,
        buyerConfirmedAt: null,
        createdAt: nowIso,
        updatedAt: nowIso
      };

      await db.collection("auctions").insertOne(newAuction);

      await fireAdminAlert(
        `📝 *YUYU Auksion — Yangi VIP sotuvchi arizasi (Tasdiqlash kerak)*\n` +
          `📦 Mahsulot: ${title}\n` +
          `💰 Boshlang'ich narx: ${formatUzsServer(startPrice)} (+${formatUzsServer(minStep)})\n` +
          `⏱ Muddat: ${durationHours} soat\n` +
          `👑 Sotuvchi: ${sellerName} (${quota.vipTier} VIP)\n` +
          `📱 Tel: ${sellerPhone}\n` +
          `💳 Karta: ${formatCardNumber(cardDigits)} (${sellerCardHolder})\n` +
          `✅ Admin paneldagi "Auksion boshqaruvi" yoki "Sotuvchi to'lovlari" bo'limidan tasdiqlang.`
      );

      res.status(201).json({
        success: true,
        auction: toOwnerAuction(newAuction)
      });
    } catch (e: any) {
      res.status(500).json({ error: e?.message || "Auksion arizasini yuborishda xatolik" });
    }
  });

  // 2. POST /api/auctions/:id/bid — Atomic bid placement + Anti-Sniping (+30s)
  router.post("/auctions/:id/bid", async (req, res) => {
    try {
      const auctionId = String(req.params.id || "").trim();
      if (!auctionId) {
        return res.status(400).json({ error: "Auksion ID noto'g'ri" });
      }

      const rawUserId = String(
        req.headers["x-user-id"] || req.body?.userId || ""
      ).trim();
      const rawAmount = Number(req.body?.amount);

      if (!rawUserId) {
        return res.status(401).json({
          error: "Stavka qo'yish uchun avval tizimga kiring"
        });
      }

      if (!Number.isFinite(rawAmount) || !Number.isInteger(rawAmount) || rawAmount <= 0) {
        return res.status(400).json({
          error: "Stavka summasi butun musbat son bo'lishi kerak"
        });
      }

      const db = await requireDb();
      await ensureAuctionsInitialized(db);
      await syncExpiredAuctions(db);

      const { userDoc, candidateIds } = await getUserCandidateIds(db, rawUserId);
      if (!userDoc) {
        return res.status(401).json({
          error: "Foydalanuvchi topilmadi. Iltimos, qaytadan tizimga kiring"
        });
      }

      const canonicalUserId = String(userDoc.telegramId || rawUserId);
      const userName = String(userDoc.username || "Mijoz").trim();
      const userPhone = String(userDoc.phoneNumber || userDoc.telegramId || "").trim();

      const existing = (await db
        .collection("auctions")
        .findOne({ id: auctionId })) as unknown as AuctionDoc | null;

      if (!existing) {
        return res.status(404).json({ error: "Auksion topilmadi" });
      }

      // Prevent seller from bidding on their own listing
      if (existing.isUserSubmitted && existing.sellerId && candidateIds.includes(existing.sellerId)) {
        return res.status(400).json({
          error: "O'zingiz joylagan auksion mahsulotiga stavka qo'ya olmaysiz"
        });
      }

      const nowMs = Date.now();
      const nowIso = new Date(nowMs).toISOString();
      const endsAtMs = new Date(existing.endsAt).getTime();

      if (existing.status !== "LIVE" || !Number.isFinite(endsAtMs) || endsAtMs <= nowMs) {
        if (existing.status === "LIVE") {
          await db.collection("auctions").updateOne(
            { id: auctionId, status: "LIVE" },
            { $set: { status: "ENDED", updatedAt: nowIso } }
          );
        }
        return res.status(400).json({
          error: "Ushbu auksion yakunlangan yoki faol emas"
        });
      }

      const minStep = Math.max(1000, Number(existing.minStep) || DEFAULT_MIN_STEP);
      const currentPrice = Number(existing.currentPrice) || Number(existing.startPrice) || DEFAULT_START_PRICE;
      const minRequired = currentPrice + minStep;

      if (rawAmount < minRequired) {
        return res.status(400).json({
          error: `Minimal stavka ${minRequired.toLocaleString("en-US")} so'm bo'lishi kerak (+${minStep.toLocaleString("en-US")} so'm)`,
          minRequired
        });
      }

      const remainingMs = endsAtMs - nowMs;
      const shouldAntiSnipe = remainingMs <= ANTI_SNIPE_WINDOW_MS;
      const nextEndsAtIso = shouldAntiSnipe
        ? new Date(endsAtMs + ANTI_SNIPE_EXTENSION_MS).toISOString()
        : existing.endsAt;

      const updatedDoc = (await db.collection("auctions").findOneAndUpdate(
        {
          id: auctionId,
          status: "LIVE",
          currentPrice: existing.currentPrice,
          endsAt: { $gt: nowIso }
        },
        {
          $set: {
            currentPrice: rawAmount,
            highestBidderId: canonicalUserId,
            highestBidderName: userName,
            highestBidderPhone: userPhone,
            endsAt: nextEndsAtIso,
            updatedAt: nowIso
          },
          $inc: {
            bidsCount: 1
          }
        },
        { returnDocument: "after" }
      )) as unknown as AuctionDoc | null;

      if (!updatedDoc) {
        return res.status(409).json({
          error: "Narx hozirgina boshqa ishtirokchi tomonidan oshirildi. Iltimos, qayta urinib ko'ring!"
        });
      }

      const newBid: BidDoc = {
        id: `bid-${nowMs}-${crypto.randomBytes(3).toString("hex")}`,
        auctionId,
        userId: canonicalUserId,
        userName,
        userPhone,
        amount: rawAmount,
        createdAt: nowIso
      };

      await db.collection("bids").insertOne(newBid);
      const latestBids = await fetchLatestBidsForAuction(db, auctionId, 10);

      res.json({
        success: true,
        antiSniped: shouldAntiSnipe,
        serverTime: nowIso,
        auction: toPublicAuction(updatedDoc, latestBids)
      });
    } catch (e: any) {
      res.status(500).json({ error: e?.message || "Stavka qo'yishda xatolik yuz berdi" });
    }
  });

  // 3. GET /api/user/auctions — Active bids, Won auctions, My VIP Listings, Escrow Wallet & Quota
  router.get("/user/auctions", async (req, res) => {
    try {
      const userId = String(
        req.headers["x-user-id"] || req.query.userId || ""
      ).trim();

      if (!userId) {
        return res.status(401).json({ error: "Foydalanuvchi aniqlanmadi" });
      }

      const db = await requireDb();
      await ensureAuctionsInitialized(db);
      await syncExpiredAuctions(db);

      const { userDoc, candidateIds } = await getUserCandidateIds(db, userId);

      const [userBids, myListingDocs, sellerPayoutDocs, sellerQuota] = await Promise.all([
        db
          .collection("bids")
          .find({ userId: { $in: candidateIds } })
          .sort({ createdAt: -1, amount: -1 })
          .toArray() as unknown as Promise<BidDoc[]>,
        db
          .collection("auctions")
          .find({ isUserSubmitted: true, sellerId: { $in: candidateIds } })
          .sort({ createdAt: -1 })
          .toArray() as unknown as Promise<AuctionDoc[]>,
        db
          .collection("seller_payouts")
          .find({ sellerId: { $in: candidateIds } })
          .sort({ createdAt: -1 })
          .toArray() as unknown as Promise<SellerPayoutDoc[]>,
        getSellerWeeklyQuota(db, userDoc, candidateIds)
      ]);

      const bidSummaryByAuction = new Map<
        string,
        { myHighestBid: number; lastBidAt: string }
      >();

      for (const bid of userBids) {
        const prev = bidSummaryByAuction.get(bid.auctionId);
        if (!prev) {
          bidSummaryByAuction.set(bid.auctionId, {
            myHighestBid: bid.amount,
            lastBidAt: bid.createdAt
          });
        } else {
          if (bid.amount > prev.myHighestBid) prev.myHighestBid = bid.amount;
          if (bid.createdAt > prev.lastBidAt) prev.lastBidAt = bid.createdAt;
        }
      }

      const participatedIds = Array.from(bidSummaryByAuction.keys());

      const [liveParticipated, wonDocs] = await Promise.all([
        participatedIds.length > 0
          ? ((await db
              .collection("auctions")
              .find({ id: { $in: participatedIds }, status: "LIVE" })
              .sort({ endsAt: 1 })
              .toArray()) as unknown as AuctionDoc[])
          : Promise.resolve([] as AuctionDoc[]),
        (await db
          .collection("auctions")
          .find({
            status: "ENDED",
            highestBidderId: { $in: candidateIds }
          })
          .sort({ endsAt: -1 })
          .toArray()) as unknown as AuctionDoc[]
      ]);

      const activeBids = liveParticipated.map((doc) => {
        const summary = bidSummaryByAuction.get(doc.id) || {
          myHighestBid: 0,
          lastBidAt: doc.updatedAt
        };
        return {
          auction: toPublicAuction(doc),
          myHighestBid: summary.myHighestBid,
          isLeading: Boolean(
            doc.highestBidderId && candidateIds.includes(doc.highestBidderId)
          ),
          lastBidAt: summary.lastBidAt
        };
      });

      const wonAuctions = wonDocs.map((doc) => ({
        auction: toPublicAuction(doc),
        winningAmount: doc.currentPrice,
        claimedOrderId: doc.claimedOrderId || null,
        payoutStatus: doc.payoutStatus || null,
        buyerConfirmedReceipt: Boolean(doc.buyerConfirmedReceipt)
      }));

      const myListings = myListingDocs.map((doc) => toOwnerAuction(doc));

      const sellerPayouts = sellerPayoutDocs.map((p) => {
        const clean = stripId(p);
        return {
          ...clean,
          buyerName: maskBidderName(clean.buyerName),
          buyerPhone: undefined,
          sellerCardNumber: formatCardNumber(clean.sellerCardNumber)
        };
      });

      let yellowBalance = 0;
      let blueBalance = 0;
      let withdrawRequestedBalance = 0;
      let totalPaidOut = 0;

      for (const p of sellerPayoutDocs) {
        const amt = Math.max(0, Number(p.amount) || 0);
        if (p.status === "YELLOW_PENDING") yellowBalance += amt;
        else if (p.status === "BLUE_AVAILABLE") blueBalance += amt;
        else if (p.status === "WITHDRAW_REQUESTED") withdrawRequestedBalance += amt;
        else if (p.status === "PAID") totalPaidOut += amt;
      }

      res.json({
        success: true,
        serverTime: new Date().toISOString(),
        activeBids,
        wonAuctions,
        myListings,
        sellerPayouts,
        wallet: {
          yellowBalance,
          blueBalance,
          withdrawRequestedBalance,
          totalPaidOut,
          totalEarned: yellowBalance + blueBalance + withdrawRequestedBalance + totalPaidOut
        },
        sellerQuota
      });
    } catch (e: any) {
      res.status(500).json({ error: e?.message || "Mening auksionlarimni yuklashda xatolik" });
    }
  });

  // 4. POST /api/auctions/:id/claim — Winner marks auction as claimed/paid -> auto creates YELLOW escrow for VIP seller
  router.post("/auctions/:id/claim", async (req, res) => {
    try {
      const auctionId = String(req.params.id || "").trim();
      const userId = String(req.headers["x-user-id"] || req.body?.userId || "").trim();
      const orderId = String(req.body?.orderId || "").trim();

      if (!auctionId || !userId) {
        return res.status(400).json({ error: "Ma'lumotlar to'liq emas" });
      }

      const db = await requireDb();
      const { candidateIds } = await getUserCandidateIds(db, userId);
      const existing = (await db
        .collection("auctions")
        .findOne({ id: auctionId })) as unknown as AuctionDoc | null;

      if (!existing) {
        return res.status(404).json({ error: "Auksion topilmadi" });
      }
      if (existing.status !== "ENDED") {
        return res.status(400).json({ error: "Auksion hali yakunlanmagan" });
      }
      if (!existing.highestBidderId || !candidateIds.includes(existing.highestBidderId)) {
        return res.status(403).json({ error: "Faqat g'olib yutuqni rasmiylashtira oladi" });
      }

      const nowIso = new Date().toISOString();
      const nextOrderId = orderId || `AUC-${Date.now().toString().slice(-6)}`;
      await db.collection("auctions").updateOne(
        { id: auctionId },
        { $set: { claimedOrderId: nextOrderId, updatedAt: nowIso } }
      );

      // If this was a VIP seller's item, credit seller's YELLOW escrow balance
      let createdPayout: SellerPayoutDoc | null = null;
      if (existing.isUserSubmitted && existing.sellerId) {
        createdPayout = await ensureSellerPayoutForAuction(
          db,
          { ...existing, claimedOrderId: nextOrderId },
          nextOrderId,
          fireAdminAlert
        );
      }

      res.json({
        success: true,
        claimedOrderId: nextOrderId,
        payoutId: createdPayout?.id || existing.payoutId || null,
        payoutStatus: createdPayout?.status || existing.payoutStatus || null
      });
    } catch (e: any) {
      res.status(500).json({ error: e?.message || "Yutuqni rasmiylashtirishda xatolik" });
    }
  });

  // 4B. POST /api/auctions/:id/confirm-receipt — Winner tells Admin "Tovarni oldim!"
  router.post("/auctions/:id/confirm-receipt", async (req, res) => {
    try {
      const auctionId = String(req.params.id || "").trim();
      const userId = String(req.headers["x-user-id"] || req.body?.userId || "").trim();

      if (!auctionId || !userId) {
        return res.status(400).json({ error: "Ma'lumotlar to'liq emas" });
      }

      const db = await requireDb();
      const { candidateIds } = await getUserCandidateIds(db, userId);
      const existing = (await db
        .collection("auctions")
        .findOne({ id: auctionId })) as unknown as AuctionDoc | null;

      if (!existing) {
        return res.status(404).json({ error: "Auksion topilmadi" });
      }
      if (existing.status !== "ENDED") {
        return res.status(400).json({ error: "Auksion hali yakunlanmagan" });
      }
      if (!existing.highestBidderId || !candidateIds.includes(existing.highestBidderId)) {
        return res.status(403).json({ error: "Faqat g'olib xaridor tasdiqlay oladi" });
      }

      const nowIso = new Date().toISOString();
      await db.collection("auctions").updateOne(
        { id: auctionId },
        {
          $set: {
            buyerConfirmedReceipt: true,
            buyerConfirmedAt: nowIso,
            updatedAt: nowIso
          }
        }
      );

      // Ensure payout exists if user-submitted, then mark buyerConfirmedReceipt
      if (existing.isUserSubmitted && existing.sellerId) {
        await ensureSellerPayoutForAuction(db, existing, existing.claimedOrderId || null);
        await db.collection("seller_payouts").updateOne(
          { auctionId },
          {
            $set: {
              buyerConfirmedReceipt: true,
              buyerConfirmedAt: nowIso,
              updatedAt: nowIso
            }
          }
        );
      }

      await fireAdminAlert(
        `✅ *XARIDOR TOVARNI OLDI ("Oldim" xabari)*\n` +
          `📦 Auksion: ${existing.title}\n` +
          `💰 Summa: ${formatUzsServer(existing.currentPrice)}\n` +
          `👤 Xaridor: ${existing.highestBidderName || "Mijoz"} (${existing.highestBidderPhone || existing.highestBidderId})\n` +
          (existing.isUserSubmitted
            ? `🏷 Sotuvchi: ${existing.sellerName || "VIP Sotuvchi"} (${existing.sellerPhone || ""})\n🔵 Endi Admin panel → "Sotuvchi to'lovlari" bo'limida sotuvchi pulini SARIQ dan KO'K ga o'tkazishingiz mumkin!`
            : `🎉 Yetkazib berish muvaffaqiyatli yakunlandi.`)
      );

      res.json({ success: true, buyerConfirmedReceipt: true, buyerConfirmedAt: nowIso });
    } catch (e: any) {
      res.status(500).json({ error: e?.message || "Tasdiqlashda xatolik yuz berdi" });
    }
  });

  // 4C. POST /api/user/seller-payouts/:id/withdraw — Seller requests withdrawal on BLUE_AVAILABLE payout -> SMS/Telegram to Admin!
  router.post("/user/seller-payouts/:id/withdraw", async (req, res) => {
    try {
      const payoutId = String(req.params.id || "").trim();
      const userId = String(req.headers["x-user-id"] || req.body?.userId || "").trim();
      const overrideCardRaw = String(req.body?.cardNumber || "").trim();

      if (!payoutId || !userId) {
        return res.status(400).json({ error: "Ma'lumotlar to'liq emas" });
      }

      const db = await requireDb();
      const { candidateIds } = await getUserCandidateIds(db, userId);

      let validatedOverrideCard: string | null = null;
      if (overrideCardRaw) {
        const digits = normalizeCardDigits(overrideCardRaw);
        if (digits.length !== 16) {
          return res.status(400).json({ error: "Karta raqami 16 ta raqamdan iborat bo'lishi kerak" });
        }
        validatedOverrideCard = digits;
      }

      const nowIso = new Date().toISOString();
      const updateSet: Record<string, any> = {
        status: "WITHDRAW_REQUESTED",
        withdrawRequestedAt: nowIso,
        updatedAt: nowIso
      };
      if (validatedOverrideCard) {
        updateSet.sellerCardNumber = validatedOverrideCard;
      }

      // Atomic transition: ONLY owning seller & ONLY from BLUE_AVAILABLE
      const updated = (await db.collection("seller_payouts").findOneAndUpdate(
        {
          id: payoutId,
          sellerId: { $in: candidateIds },
          status: "BLUE_AVAILABLE"
        },
        { $set: updateSet },
        { returnDocument: "after" }
      )) as unknown as SellerPayoutDoc | null;

      if (!updated) {
        const existing = (await db
          .collection("seller_payouts")
          .findOne({ id: payoutId })) as unknown as SellerPayoutDoc | null;
        if (!existing || !candidateIds.includes(existing.sellerId)) {
          return res.status(404).json({ error: "To'lov yozuvi topilmadi" });
        }
        if (existing.status === "YELLOW_PENDING") {
          return res.status(400).json({
            error: "Bu pul hali SARIQ (kutilayotgan) holatda. Xaridor tovarni olganini adminga tasdiqlagach, pul KO'K bo'ladi."
          });
        }
        if (existing.status === "WITHDRAW_REQUESTED") {
          return res.status(409).json({
            error: "Chiqarib olish so'rovi allaqachon adminga yuborilgan"
          });
        }
        return res.status(400).json({ error: "Ushbu summa allaqachon to'lab berilgan" });
      }

      await db.collection("auctions").updateOne(
        { id: updated.auctionId },
        { $set: { payoutStatus: "WITHDRAW_REQUESTED", updatedAt: nowIso } }
      );

      // Immediate Telegram/SMS alert to Admin
      await fireAdminAlert(
        `🔔 *PUL CHIQARIB OLISH SO'ROVI (SOTUVCHI SMS)*\n` +
          `💰 Summa: *${formatUzsServer(updated.amount)}*\n` +
          `💳 Karta: \`${formatCardNumber(updated.sellerCardNumber)}\`\n` +
          `👤 Karta egasi: ${updated.sellerCardHolder}\n` +
          `🏷 Sotuvchi: ${updated.sellerName}\n` +
          `📱 Tel: ${updated.sellerPhone}\n` +
          `📦 Auksion: ${updated.auctionTitle}\n` +
          `🆔 So'rov ID: ${updated.id}\n` +
          `➡️ Admin panel → "Sotuvchi to'lovlari" bo'limidan o'tkazib tasdiqlang.`
      );

      res.json({
        success: true,
        payout: {
          ...stripId(updated),
          sellerCardNumber: formatCardNumber(updated.sellerCardNumber)
        }
      });
    } catch (e: any) {
      res.status(500).json({ error: e?.message || "Chiqarib olish so'rovini yuborishda xatolik" });
    }
  });

  // 5. GET /api/admin/auctions — Admin monitor list with full seller/winner contact info
  router.get("/admin/auctions", async (req, res) => {
    try {
      const db = await requireDb();
      const device = await verifyRequestAdminDevice(req, db);
      if (!device) {
        return res.status(403).json({ error: "Admin ruxsati tasdiqlanmagan qurilma" });
      }

      await ensureAuctionsInitialized(db);
      await syncExpiredAuctions(db);

      const docs = (await db
        .collection("auctions")
        .find({})
        .sort({ createdAt: -1 })
        .toArray()) as unknown as AuctionDoc[];

      res.json({
        success: true,
        serverTime: new Date().toISOString(),
        auctions: docs.map((d) => {
          const clean = stripId(d);
          return {
            ...clean,
            sellerCardNumber: clean.sellerCardNumber
              ? formatCardNumber(clean.sellerCardNumber)
              : null
          };
        })
      });
    } catch (e: any) {
      res.status(500).json({ error: e?.message || "Admin auksionlarini yuklashda xatolik" });
    }
  });

  // 6. POST /api/admin/auctions — Admin creates & launches a new LIVE auction
  router.post("/admin/auctions", async (req, res) => {
    try {
      const db = await requireDb();
      const device = await verifyRequestAdminDevice(req, db);
      if (!device) {
        return res.status(403).json({ error: "Admin ruxsati tasdiqlanmagan qurilma" });
      }

      await ensureAuctionsInitialized(db);

      const title = String(req.body?.title || "").trim();
      const description = String(req.body?.description || "").trim();
      const imageUrl = String(req.body?.imageUrl || "").trim();
      const startPrice = Math.round(Number(req.body?.startPrice) || DEFAULT_START_PRICE);
      const minStep = Math.round(Number(req.body?.minStep) || DEFAULT_MIN_STEP);
      const durationHours = Number(req.body?.durationHours) || DEFAULT_DURATION_HOURS;

      if (title.length < 3 || title.length > 140) {
        return res.status(400).json({
          error: "Mahsulot nomi 3 dan 140 tagacha belgidan iborat bo'lishi kerak"
        });
      }
      if (!imageUrl || !isSafeImageUrl(imageUrl)) {
        return res.status(400).json({
          error: "Iltimos, yaroqli rasm yuklang yoki to'g'ri HTTPS rasm manzilini kiriting"
        });
      }
      if (!Number.isFinite(startPrice) || startPrice < 1000) {
        return res.status(400).json({
          error: "Boshlang'ich narx kamida 1 000 so'm bo'lishi kerak"
        });
      }
      if (!Number.isFinite(minStep) || minStep < 1000) {
        return res.status(400).json({
          error: "Minimal qadam kamida 1 000 so'm bo'lishi kerak"
        });
      }
      if (!Number.isFinite(durationHours) || durationHours < 1 || durationHours > 168) {
        return res.status(400).json({
          error: "Davomiylik 1 soatdan 168 soatgacha bo'lishi kerak"
        });
      }

      const nowMs = Date.now();
      const startsAt = new Date(nowMs).toISOString();
      const endsAt = new Date(nowMs + durationHours * 3600 * 1000).toISOString();

      const newAuction: AuctionDoc = {
        id: `auc-${nowMs}-${crypto.randomBytes(2).toString("hex")}`,
        title,
        description:
          description ||
          "YUYU Shop haftalik Kim oshdi savdosi. Eng yuqori stavka qo'ygan ishtirokchi g'olib bo'ladi.",
        imageUrl,
        startPrice,
        currentPrice: startPrice,
        minStep,
        startsAt,
        endsAt,
        durationHours,
        status: "LIVE",
        highestBidderId: null,
        highestBidderName: null,
        highestBidderPhone: null,
        bidsCount: 0,
        claimedOrderId: null,
        isUserSubmitted: false,
        createdAt: startsAt,
        updatedAt: startsAt
      };

      await db.collection("auctions").insertOne(newAuction);

      res.status(201).json({
        success: true,
        auction: stripId(newAuction)
      });
    } catch (e: any) {
      res.status(500).json({ error: e?.message || "Auksion yaratishda xatolik" });
    }
  });

  // 7. PATCH /api/admin/auctions/:id — Admin approves VIP listing, ends, cancels, or rejects an auction
  router.patch("/admin/auctions/:id", async (req, res) => {
    try {
      const db = await requireDb();
      const device = await verifyRequestAdminDevice(req, db);
      if (!device) {
        return res.status(403).json({ error: "Admin ruxsati tasdiqlanmagan qurilma" });
      }

      const auctionId = String(req.params.id || "").trim();
      const nextStatus = String(req.body?.status || "").trim() as AuctionStatus;
      const rejectReason = String(req.body?.rejectReason || "").trim();
      const allowedStatuses: AuctionStatus[] = [
        "PENDING_APPROVAL",
        "UPCOMING",
        "LIVE",
        "ENDED",
        "CANCELLED",
        "REJECTED"
      ];

      if (!auctionId || !allowedStatuses.includes(nextStatus)) {
        return res.status(400).json({ error: "Noto'g'ri auksion holati" });
      }

      const existing = (await db
        .collection("auctions")
        .findOne({ id: auctionId })) as unknown as AuctionDoc | null;

      if (!existing) {
        return res.status(404).json({ error: "Auksion topilmadi" });
      }

      const nowMs = Date.now();
      const nowIso = new Date(nowMs).toISOString();
      const updateFields: Record<string, any> = {
        status: nextStatus,
        updatedAt: nowIso
      };

      // Approving a PENDING_APPROVAL listing -> launch LIVE with fresh countdown!
      if (existing.status === "PENDING_APPROVAL" && nextStatus === "LIVE") {
        const hrs = Number(existing.durationHours) || DEFAULT_DURATION_HOURS;
        updateFields.startsAt = nowIso;
        updateFields.endsAt = new Date(nowMs + hrs * 3600 * 1000).toISOString();
        updateFields.rejectReason = null;
      }

      if (nextStatus === "ENDED") {
        updateFields.endsAt = nowIso;
      }

      if (nextStatus === "REJECTED") {
        updateFields.rejectReason = rejectReason || "Admin tomonidan rad etildi";
      }

      const updated = (await db.collection("auctions").findOneAndUpdate(
        { id: auctionId },
        { $set: updateFields },
        { returnDocument: "after" }
      )) as unknown as AuctionDoc | null;

      if (!updated) {
        return res.status(404).json({ error: "Auksion topilmadi" });
      }

      res.json({
        success: true,
        auction: {
          ...stripId(updated),
          sellerCardNumber: updated.sellerCardNumber
            ? formatCardNumber(updated.sellerCardNumber)
            : null
        }
      });
    } catch (e: any) {
      res.status(500).json({ error: e?.message || "Auksion holatini yangilashda xatolik" });
    }
  });

  // 8. GET /api/admin/auctions/:id/bids — Admin views full bid history with phone numbers
  router.get("/admin/auctions/:id/bids", async (req, res) => {
    try {
      const db = await requireDb();
      const device = await verifyRequestAdminDevice(req, db);
      if (!device) {
        return res.status(403).json({ error: "Admin ruxsati tasdiqlanmagan qurilma" });
      }

      const auctionId = String(req.params.id || "").trim();
      const bids = await fetchLatestBidsForAuction(db, auctionId, 100);

      res.json({
        success: true,
        bids
      });
    } catch (e: any) {
      res.status(500).json({ error: e?.message || "Stavkalar tarixini yuklashda xatolik" });
    }
  });

  // 9. GET /api/admin/seller-payouts — Dedicated Admin Category ("Sotuvchi to'lovlari")
  router.get("/admin/seller-payouts", async (req, res) => {
    try {
      const db = await requireDb();
      const device = await verifyRequestAdminDevice(req, db);
      if (!device) {
        return res.status(403).json({ error: "Admin ruxsati tasdiqlanmagan qurilma" });
      }

      await ensureAuctionsInitialized(db);
      await syncExpiredAuctions(db);

      const [payoutDocs, pendingApprovalDocs, endedSellerAuctions] = await Promise.all([
        db
          .collection("seller_payouts")
          .find({})
          .sort({ updatedAt: -1, createdAt: -1 })
          .toArray() as unknown as Promise<SellerPayoutDoc[]>,
        db
          .collection("auctions")
          .find({ status: "PENDING_APPROVAL", isUserSubmitted: true })
          .sort({ createdAt: -1 })
          .toArray() as unknown as Promise<AuctionDoc[]>,
        db
          .collection("auctions")
          .find({
            status: "ENDED",
            isUserSubmitted: true,
            highestBidderId: { $ne: null },
            payoutId: null
          })
          .sort({ endsAt: -1 })
          .toArray() as unknown as Promise<AuctionDoc[]>
      ]);

      let yellowTotal = 0;
      let blueTotal = 0;
      let withdrawRequestedTotal = 0;
      let paidTotal = 0;
      let yellowCount = 0;
      let blueCount = 0;
      let withdrawRequestedCount = 0;
      let paidCount = 0;

      const payouts = payoutDocs.map((p) => {
        const clean = stripId(p);
        const amt = Math.max(0, Number(clean.amount) || 0);
        if (clean.status === "YELLOW_PENDING") {
          yellowTotal += amt;
          yellowCount += 1;
        } else if (clean.status === "BLUE_AVAILABLE") {
          blueTotal += amt;
          blueCount += 1;
        } else if (clean.status === "WITHDRAW_REQUESTED") {
          withdrawRequestedTotal += amt;
          withdrawRequestedCount += 1;
        } else if (clean.status === "PAID") {
          paidTotal += amt;
          paidCount += 1;
        }
        return {
          ...clean,
          sellerCardNumber: formatCardNumber(clean.sellerCardNumber)
        };
      });

      const formatAdminAuction = (a: AuctionDoc) => ({
        ...stripId(a),
        sellerCardNumber: a.sellerCardNumber ? formatCardNumber(a.sellerCardNumber) : null
      });

      res.json({
        success: true,
        payouts,
        pendingApprovalAuctions: pendingApprovalDocs.map(formatAdminAuction),
        endedUnpaidSellerAuctions: endedSellerAuctions.map(formatAdminAuction),
        summary: {
          yellowTotal,
          blueTotal,
          withdrawRequestedTotal,
          paidTotal,
          yellowCount,
          blueCount,
          withdrawRequestedCount,
          paidCount,
          pendingApprovalCount: pendingApprovalDocs.length,
          endedUnpaidCount: endedSellerAuctions.length,
          actionNeededCount: withdrawRequestedCount + yellowCount + pendingApprovalDocs.length
        }
      });
    } catch (e: any) {
      res.status(500).json({ error: e?.message || "Sotuvchi to'lovlarini yuklashda xatolik" });
    }
  });

  // 10. POST /api/admin/seller-payouts/credit — Admin manually records buyer payment into seller's YELLOW balance
  router.post("/admin/seller-payouts/credit", async (req, res) => {
    try {
      const db = await requireDb();
      const device = await verifyRequestAdminDevice(req, db);
      if (!device) {
        return res.status(403).json({ error: "Admin ruxsati tasdiqlanmagan qurilma" });
      }

      const auctionId = String(req.body?.auctionId || "").trim();
      if (!auctionId) {
        return res.status(400).json({ error: "Auksion ID kiritilmadi" });
      }

      const auction = (await db
        .collection("auctions")
        .findOne({ id: auctionId })) as unknown as AuctionDoc | null;

      if (!auction || !auction.isUserSubmitted || !auction.sellerId) {
        return res.status(404).json({ error: "VIP sotuvchi auksioni topilmadi" });
      }
      if (auction.status !== "ENDED" || !auction.highestBidderId) {
        return res.status(400).json({ error: "Ushbu auksionda hali g'olib aniqlanmagan" });
      }

      const payout = await ensureSellerPayoutForAuction(
        db,
        auction,
        auction.claimedOrderId || `ADM-${Date.now().toString().slice(-5)}`,
        fireAdminAlert
      );

      res.json({
        success: true,
        payout: payout
          ? {
              ...payout,
              sellerCardNumber: formatCardNumber(payout.sellerCardNumber)
            }
          : null
      });
    } catch (e: any) {
      res.status(500).json({ error: e?.message || "Sariq hisobga o'tkazishda xatolik" });
    }
  });

  // 11. PATCH /api/admin/seller-payouts/:id — Admin turns YELLOW -> BLUE ("Oldim") or marks WITHDRAW_REQUESTED -> PAID
  router.patch("/admin/seller-payouts/:id", async (req, res) => {
    try {
      const db = await requireDb();
      const device = await verifyRequestAdminDevice(req, db);
      if (!device) {
        return res.status(403).json({ error: "Admin ruxsati tasdiqlanmagan qurilma" });
      }

      const payoutId = String(req.params.id || "").trim();
      const action = String(req.body?.action || "").trim();
      const adminNote = String(req.body?.adminNote || "").trim();

      if (!payoutId || !["UNLOCK_BLUE", "MARK_PAID", "REVERT_YELLOW"].includes(action)) {
        return res.status(400).json({ error: "Noto'g'ri amal turi" });
      }

      const existing = (await db
        .collection("seller_payouts")
        .findOne({ id: payoutId })) as unknown as SellerPayoutDoc | null;

      if (!existing) {
        return res.status(404).json({ error: "To'lov yozuvi topilmadi" });
      }

      const nowIso = new Date().toISOString();
      let nextStatus: SellerPayoutStatus = existing.status;
      const updateSet: Record<string, any> = { updatedAt: nowIso };
      if (adminNote) updateSet.adminNote = adminNote;

      if (action === "UNLOCK_BLUE") {
        if (existing.status !== "YELLOW_PENDING") {
          return res.status(400).json({ error: "Faqat SARIQ hisobdagi pulni KO'K qilish mumkin" });
        }
        nextStatus = "BLUE_AVAILABLE";
        updateSet.status = nextStatus;
        updateSet.unlockedAt = nowIso;
        updateSet.buyerConfirmedReceipt = true;
        if (!existing.buyerConfirmedAt) updateSet.buyerConfirmedAt = nowIso;
      } else if (action === "MARK_PAID") {
        if (existing.status !== "WITHDRAW_REQUESTED" && existing.status !== "BLUE_AVAILABLE") {
          return res.status(400).json({
            error: "Faqat KO'K yoki chiqarib olish so'rovidagi summani to'langan deb belgilash mumkin"
          });
        }
        nextStatus = "PAID";
        updateSet.status = nextStatus;
        updateSet.paidAt = nowIso;
      } else if (action === "REVERT_YELLOW") {
        if (existing.status === "PAID") {
          return res.status(400).json({ error: "To'lab berilgan summani ortga qaytarib bo'lmaydi" });
        }
        nextStatus = "YELLOW_PENDING";
        updateSet.status = nextStatus;
        updateSet.unlockedAt = null;
        updateSet.withdrawRequestedAt = null;
      }

      const updated = (await db.collection("seller_payouts").findOneAndUpdate(
        { id: payoutId },
        { $set: updateSet },
        { returnDocument: "after" }
      )) as unknown as SellerPayoutDoc | null;

      if (updated) {
        await db.collection("auctions").updateOne(
          { id: updated.auctionId },
          {
            $set: {
              payoutStatus: nextStatus,
              ...(action === "UNLOCK_BLUE" ? { buyerConfirmedReceipt: true } : {}),
              updatedAt: nowIso
            }
          }
        );
      }

      res.json({
        success: true,
        payout: updated
          ? {
              ...stripId(updated),
              sellerCardNumber: formatCardNumber(updated.sellerCardNumber)
            }
          : null
      });
    } catch (e: any) {
      res.status(500).json({ error: e?.message || "To'lov holatini yangilashda xatolik" });
    }
  });
}
