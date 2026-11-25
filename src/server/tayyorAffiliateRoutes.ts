import type express from "express";
import type { Db } from "mongodb";

const VALID_RESALE_CONDITIONS = new Set([
  "Yangi, birkasi bilan",
  "Faqat o‘lchab ko‘rilgan",
  "Faqat o'lchab ko'rilgan",
  "Faqat kiyib ko‘rilgan",
  "Faqat kiyib ko'rilgan"
]);

const VALID_RESALE_STATUSES = new Set([
  "pending_moderation",
  "active",
  "reserved",
  "sold",
  "rejected"
]);

const MIN_AFFILIATE_PAYOUT_UZS = 50000;

export function computeAutoAffiliateRate(totalOrders: number): number {
  const count = Math.max(0, Number(totalOrders) || 0);
  if (count >= 30) return 10;
  if (count >= 10) return 7;
  return 5;
}

function normalizeCondition(raw: unknown): "Yangi, birkasi bilan" | "Faqat o‘lchab ko‘rilgan" {
  const str = String(raw || "").trim();
  if (/kiyib|o['‘]lchab/i.test(str)) {
    return "Faqat o‘lchab ko‘rilgan";
  }
  return "Yangi, birkasi bilan";
}

function isLargeDataUri(value: unknown): value is string {
  return typeof value === "string" && value.startsWith("data:") && value.length > 2048;
}

function isSafeImageSrc(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const v = value.trim();
  if (!v || v.length > 6_000_000) return false;
  if (
    v.startsWith("/api/media/") ||
    v.startsWith("/api/r2/media/") ||
    v.startsWith("/images/") ||
    v.startsWith("/src/assets/")
  )
    return true;
  if (/^https?:\/\//i.test(v)) return true;
  if (/^data:image\/(jpeg|jpg|png|webp|gif);base64,[A-Za-z0-9+/=]+$/i.test(v)) return true;
  return false;
}

function sanitizeCardDigits(raw: unknown): string {
  return String(raw || "").replace(/\D/g, "").slice(0, 16);
}

function formatCardMaskedOrGrouped(digits: string): string {
  return digits.replace(/(\d{4})(?=\d)/g, "$1 ").trim();
}

function normalizeRefCode(raw: unknown): string {
  return String(raw || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, "")
    .slice(0, 20);
}

function buildUserIdVariants(id: unknown): string[] {
  const clean = String(id || "").trim();
  if (!clean) return [];
  const variants = new Set<string>([clean]);
  const digits = clean.replace(/\D/g, "");
  if (digits.length === 9) {
    variants.add(digits);
    variants.add(`998${digits}`);
    variants.add(`+998${digits}`);
  } else if (digits.length === 12 && digits.startsWith("998")) {
    variants.add(digits);
    variants.add(`+${digits}`);
    variants.add(digits.slice(3));
  }
  return Array.from(variants);
}

function sanitizeResaleListingForClient(doc: any) {
  if (!doc) return doc;
  const { _id, ...rest } = doc;
  const images = Array.isArray(rest.images)
    ? rest.images.map((img: any, idx: number) =>
        isLargeDataUri(img) ? `/api/media/resale/${encodeURIComponent(rest.id)}/${idx}` : img
      )
    : [];
  return {
    ...rest,
    images
  };
}

/**
 * Affiliate Hook #1: Called inside POST /api/orders.
 * Performs strict server-side self-referral check, creates a pending commission,
 * and increments the affiliate's pendingBalance.
 */
export async function applyAffiliateOnOrderCreate(
  db: Db,
  params: {
    orderId: string;
    buyerUserId: string;
    buyerName: string;
    productName: string;
    orderAmount: number;
    referredByCode?: string;
  }
): Promise<{
  referredBy: string | null;
  referredAffiliateId: string | null;
  affiliateCommissionAmount: number;
}> {
  const cleanCode = normalizeRefCode(params.referredByCode);
  const orderAmount = Math.max(0, Math.round(Number(params.orderAmount) || 0));
  if (!cleanCode || orderAmount <= 0 || !params.orderId) {
    return { referredBy: null, referredAffiliateId: null, affiliateCommissionAmount: 0 };
  }

  const profilesCol = db.collection("affiliateProfiles");
  const profile = await profilesCol.findOne({ refCode: cleanCode });
  if (!profile || !profile.userId) {
    return { referredBy: null, referredAffiliateId: null, affiliateCommissionAmount: 0 };
  }

  // Anti-fraud: block self-referral across telegramId and phoneNumber variants
  const buyerVariants = new Set(buildUserIdVariants(params.buyerUserId));
  const affiliateVariants = buildUserIdVariants(profile.userId);
  if (affiliateVariants.some((v) => buyerVariants.has(v))) {
    return { referredBy: null, referredAffiliateId: null, affiliateCommissionAmount: 0 };
  }

  // Also cross-check user records in MongoDB in case buyer logged in with phone vs telegramId
  if (buyerVariants.size > 0) {
    const buyerDoc = await db.collection("users").findOne(
      {
        $or: [
          { telegramId: { $in: Array.from(buyerVariants) } },
          { phoneNumber: { $in: Array.from(buyerVariants) } }
        ]
      },
      { projection: { telegramId: 1, phoneNumber: 1 } }
    );
    if (buyerDoc) {
      const resolvedBuyerSet = new Set([
        ...buildUserIdVariants(buyerDoc.telegramId),
        ...buildUserIdVariants(buyerDoc.phoneNumber)
      ]);
      const affUserDoc = await db.collection("users").findOne(
        {
          $or: [
            { telegramId: { $in: affiliateVariants } },
            { phoneNumber: { $in: affiliateVariants } }
          ]
        },
        { projection: { telegramId: 1, phoneNumber: 1 } }
      );
      const resolvedAffVariants = [
        ...affiliateVariants,
        ...buildUserIdVariants(affUserDoc?.telegramId),
        ...buildUserIdVariants(affUserDoc?.phoneNumber)
      ];
      if (resolvedAffVariants.some((v) => resolvedBuyerSet.has(v))) {
        return { referredBy: null, referredAffiliateId: null, affiliateCommissionAmount: 0 };
      }
    }
  }

  // Prevent duplicate commission for the same orderId
  const commissionsCol = db.collection("affiliateCommissions");
  const alreadyExists = await commissionsCol.findOne({ orderId: params.orderId });
  if (alreadyExists) {
    return {
      referredBy: profile.refCode,
      referredAffiliateId: profile.userId,
      affiliateCommissionAmount: Number(alreadyExists.commissionAmount) || 0
    };
  }

  const effectiveRate =
    typeof profile.manualRateOverride === "number" && profile.manualRateOverride > 0
      ? profile.manualRateOverride
      : Math.max(Number(profile.commissionRate) || 5, computeAutoAffiliateRate(Number(profile.totalOrders) || 0));

  const commissionAmount = Math.round((orderAmount * effectiveRate) / 100);
  if (commissionAmount <= 0) {
    return { referredBy: profile.refCode, referredAffiliateId: profile.userId, affiliateCommissionAmount: 0 };
  }

  const commissionDoc = {
    id: `AFFCOM-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    affiliateId: profile.userId,
    refCode: profile.refCode,
    orderId: params.orderId,
    productName: String(params.productName || "Mahsulot").slice(0, 140),
    buyerName: String(params.buyerName || "Mijoz").slice(0, 80),
    orderAmount,
    ratePercent: effectiveRate,
    commissionAmount,
    status: "pending",
    createdAt: Date.now(),
    approvedAt: null
  };

  await commissionsCol.insertOne(commissionDoc);
  await profilesCol.updateOne(
    { userId: profile.userId },
    { $inc: { pendingBalance: commissionAmount } }
  );

  return {
    referredBy: profile.refCode,
    referredAffiliateId: profile.userId,
    affiliateCommissionAmount: commissionAmount
  };
}

/**
 * Affiliate Hook #2: Called inside POST /api/orders/update when status becomes 'delivered'.
 * Atomically approves pending commission, moves pendingBalance -> availableBalance,
 * increments totalOrders & totalEarned, and recalculates tier rate (5% -> 7% -> 10%).
 */
export async function applyAffiliateOnOrderDelivered(db: Db, orderId: string): Promise<void> {
  if (!orderId) return;
  const commissionsCol = db.collection("affiliateCommissions");
  const commission = await commissionsCol.findOneAndUpdate(
    { orderId: String(orderId), status: "pending" },
    { $set: { status: "approved", approvedAt: Date.now() } },
    { returnDocument: "after" }
  );
  if (!commission) return;

  const profilesCol = db.collection("affiliateProfiles");
  const profile = await profilesCol.findOne({ userId: commission.affiliateId });
  if (!profile) return;

  const amount = Math.max(0, Number(commission.commissionAmount) || 0);
  const nextPending = Math.max(0, (Number(profile.pendingBalance) || 0) - amount);
  const nextAvailable = Math.max(0, (Number(profile.availableBalance) || 0) + amount);
  const nextEarned = Math.max(0, (Number(profile.totalEarned) || 0) + amount);
  const nextOrders = Math.max(0, (Number(profile.totalOrders) || 0) + 1);

  const autoRate = computeAutoAffiliateRate(nextOrders);
  const nextRate =
    typeof profile.manualRateOverride === "number" && profile.manualRateOverride > 0
      ? profile.manualRateOverride
      : Math.max(autoRate, Number(profile.commissionRate) || 5);

  await profilesCol.updateOne(
    { userId: profile.userId },
    {
      $set: {
        pendingBalance: nextPending,
        availableBalance: nextAvailable,
        totalEarned: nextEarned,
        totalOrders: nextOrders,
        commissionRate: nextRate
      }
    }
  );
}

/**
 * Affiliate Hook #3: Called inside POST /api/orders/update (when status === 'cancelled')
 * and DELETE /api/orders/:id. Atomically cancels pending commission and deducts pendingBalance.
 */
export async function applyAffiliateOnOrderCancelled(db: Db, orderId: string): Promise<void> {
  if (!orderId) return;
  const commissionsCol = db.collection("affiliateCommissions");
  const commission = await commissionsCol.findOneAndUpdate(
    { orderId: String(orderId), status: "pending" },
    { $set: { status: "cancelled" } },
    { returnDocument: "after" }
  );
  if (!commission) return;

  const profilesCol = db.collection("affiliateProfiles");
  const profile = await profilesCol.findOne({ userId: commission.affiliateId });
  if (!profile) return;

  const amount = Math.max(0, Number(commission.commissionAmount) || 0);
  const nextPending = Math.max(0, (Number(profile.pendingBalance) || 0) - amount);

  await profilesCol.updateOne(
    { userId: profile.userId },
    { $set: { pendingBalance: nextPending } }
  );
}

export function registerTayyorAffiliateRoutes(
  router: express.Router,
  deps: {
    requireDb: () => Promise<Db>;
    verifyRequestAdminDevice: (req: express.Request, db: Db) => Promise<any>;
    sendAdminTelegramAlert: (msg: string) => Promise<void>;
    sendMediaValue: (res: express.Response, value: unknown) => any;
  }
) {
  const { requireDb, verifyRequestAdminDevice, sendAdminTelegramAlert, sendMediaValue } = deps;

  // Binary media streaming route for resale live photos
  router.get("/media/resale/:listingId/:index", async (req, res) => {
    try {
      const db = await requireDb();
      const listingId = String(req.params.listingId || "").trim();
      const idx = Math.max(0, Math.min(10, Number(req.params.index) || 0));
      const doc = await db.collection("resaleListings").findOne(
        { id: listingId },
        { projection: { images: 1 } }
      );
      return sendMediaValue(res, Array.isArray(doc?.images) ? doc.images[idx] : null);
    } catch {
      return res.status(500).end();
    }
  });

  // =========================================================================
  // MODULE 1: YUYU TAYYOR BOZOR (1-CLICK RESALE MARKETPLACE)
  // =========================================================================

  // Public storefront: active + reserved listings (never exposes sellerCard or sellerPhone publicly)
  router.get("/resale/active", async (req, res) => {
    try {
      const db = await requireDb();
      const docs = await db
        .collection("resaleListings")
        .find({ status: { $in: ["active", "reserved"] } }, { projection: { _id: 0 } })
        .sort({ createdAt: -1 })
        .toArray();

      const listings = docs.map((d) => {
        const clean = sanitizeResaleListingForClient(d);
        return {
          ...clean,
          sellerCard: "",
          sellerPhone: ""
        };
      });
      res.json({ success: true, listings });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Seller's own resale listings (for OrdersView badges & seller tracking)
  router.get("/resale/user/:userId", async (req, res) => {
    try {
      const userId = String(req.params.userId || "").trim();
      if (!userId) return res.status(400).json({ error: "userId talab qilinadi" });

      const variants = buildUserIdVariants(userId);
      const db = await requireDb();
      const docs = await db
        .collection("resaleListings")
        .find({ sellerUserId: { $in: variants } }, { projection: { _id: 0 } })
        .sort({ createdAt: -1 })
        .toArray();

      res.json({ success: true, listings: docs.map(sanitizeResaleListingForClient) });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // 1-click create resale listing from a delivered order (strict ownership + duplicate check)
  router.post("/resale/listings", async (req, res) => {
    try {
      const body = req.body || {};
      const originalOrderId = String(body.originalOrderId || "").trim();
      const sellerUserId = String(body.sellerUserId || "").trim();
      const resalePrice = Math.round(Number(body.resalePrice) || 0);
      const city = String(body.city || "").trim().slice(0, 80);
      const sellerPhone = String(body.sellerPhone || "").trim().slice(0, 32);
      const sellerCardDigits = sanitizeCardDigits(body.sellerCard);
      const rawCondition = String(body.condition || "Yangi, birkasi bilan").trim();

      if (!originalOrderId || !sellerUserId) {
        return res.status(400).json({ error: "Buyurtma va foydalanuvchi ma'lumotlari to'liq emas" });
      }
      if (!city) {
        return res.status(400).json({ error: "Iltimos, shahar yoki viloyatingizni kiriting" });
      }
      if (!sellerPhone || sellerPhone.replace(/\D/g, "").length < 9) {
        return res.status(400).json({ error: "Iltimos, bog'lanish uchun to'g'ri telefon raqamingizni kiriting" });
      }
      if (sellerCardDigits.length !== 16) {
        return res.status(400).json({ error: "Pul qaytariladigan Uzcard/Humo karta raqami 16 xonali bo'lishi kerak" });
      }
      if (!VALID_RESALE_CONDITIONS.has(rawCondition)) {
        return res.status(400).json({ error: "Tovar holati noto'g'ri tanlangan" });
      }

      const db = await requireDb();
      const ordersCol = db.collection("orders");
      const order = await ordersCol.findOne({ id: originalOrderId });
      if (!order) {
        return res.status(404).json({ error: "Asl buyurtma topilmadi" });
      }

      const sellerVariants = new Set(buildUserIdVariants(sellerUserId));
      const orderUserVariants = buildUserIdVariants(order.userId);
      if (!orderUserVariants.some((v) => sellerVariants.has(v))) {
        return res.status(403).json({ error: "Faqat o'zingizga tegishli buyurtmani sotuvga qo'ya olasiz" });
      }
      if (order.status !== "delivered") {
        return res.status(400).json({ error: "Faqat 'Yetib keldi' (Topshirildi) holatidagi buyurtmalarni sotuvga chiqarish mumkin" });
      }

      const originalPrice = Math.max(1000, Math.round(Number(order.price) || 0));
      if (resalePrice < 5000) {
        return res.status(400).json({ error: "Sotuv narxi kamida 5 000 so'm bo'lishi kerak" });
      }
      if (resalePrice > originalPrice) {
        return res.status(400).json({
          error: `Sotuv narxi asl narxidan (${originalPrice.toLocaleString()} so'm) oshmasligi kerak`
        });
      }

      // Duplicate protection: block re-listing if already pending, active, reserved, or sold
      const resaleCol = db.collection("resaleListings");
      const duplicate = await resaleCol.findOne({
        originalOrderId,
        status: { $in: ["pending_moderation", "active", "reserved", "sold"] }
      });
      if (duplicate) {
        return res.status(409).json({
          error: "Bu buyurtma allaqachon Tayyor Bozorga joylangan."
        });
      }

      // Resolve product info (category + original images) from products collection
      const productDoc = order.productId
        ? await db.collection("products").findOne({ id: String(order.productId) }, { projection: { _id: 0 } })
        : null;

      const baseImages: string[] = [];
      if (Array.isArray(productDoc?.images) && productDoc.images.length > 0) {
        baseImages.push(
          isLargeDataUri(productDoc.images[0])
            ? `/api/media/product/${encodeURIComponent(productDoc.id)}/0`
            : String(productDoc.images[0])
        );
      }

      const uploadedImages: string[] = Array.isArray(body.images)
        ? body.images.filter(isSafeImageSrc).slice(0, 3)
        : [];

      const mergedImages = Array.from(new Set([...uploadedImages, ...baseImages])).slice(0, 4);

      const newListing = {
        id: `RESALE-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
        originalOrderId,
        productId: String(order.productId || ""),
        sellerUserId,
        sellerName: String(body.sellerName || order.username || "Mijoz").trim().slice(0, 80),
        title: String(body.title || order.productName || "YUYU Tovar").trim().slice(0, 140),
        category: String(body.category || productDoc?.category || "Kiyim").trim().slice(0, 60),
        size: String(body.size || order.size || "Standart").trim().slice(0, 40),
        originalPrice,
        resalePrice,
        condition: normalizeCondition(rawCondition),
        city,
        sellerPhone,
        sellerCard: formatCardMaskedOrGrouped(sellerCardDigits),
        images: mergedImages,
        status: "pending_moderation",
        buyerOrderId: null,
        buyerUserId: null,
        buyerName: null,
        buyerPhone: null,
        buyerAddress: null,
        adminNote: "",
        createdAt: Date.now(),
        reservedAt: null,
        soldAt: null
      };

      await resaleCol.insertOne({ ...newListing });
      await sendAdminTelegramAlert(
        `⚡ *YUYU Tayyor Bozor — Yangi moderatsiya so'rovi*\n📦 Tovar: ${newListing.title} (${newListing.size})\n💰 Narx: ${newListing.resalePrice.toLocaleString()} so'm (Asl: ${newListing.originalPrice.toLocaleString()} so'm)\n📍 Shahar: ${newListing.city}\n👤 Sotuvchi: ${newListing.sellerName} (${newListing.sellerPhone})`
      );

      res.json({ success: true, listing: sanitizeResaleListingForClient(newListing) });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Buy / atomically reserve a Tayyor Bozor listing (prevents double-purchase race conditions)
  router.post("/resale/:id/buy", async (req, res) => {
    try {
      const id = String(req.params.id || "").trim();
      const buyerUserId = String(req.body?.buyerUserId || "").trim();
      const buyerName = String(req.body?.buyerName || "").trim().slice(0, 80);
      const buyerPhone = String(req.body?.buyerPhone || "").trim().slice(0, 32);
      const buyerAddress = String(req.body?.buyerAddress || "").trim().slice(0, 180);

      if (!id || !buyerUserId || !buyerPhone || !buyerAddress) {
        return res.status(400).json({ error: "Telefon raqami va yetkazib berish manzilini to'liq kiriting" });
      }

      const db = await requireDb();
      const resaleCol = db.collection("resaleListings");

      const current = await resaleCol.findOne({ id });
      if (!current) {
        return res.status(404).json({ error: "E'lon topilmadi" });
      }

      const buyerVariants = new Set(buildUserIdVariants(buyerUserId));
      const sellerVariants = buildUserIdVariants(current.sellerUserId);
      if (sellerVariants.some((v) => buyerVariants.has(v))) {
        return res.status(400).json({ error: "O'zingiz joylagan tovarni sotib ololmaysiz" });
      }

      const buyerOrderId = `TB-${Date.now().toString().slice(-6)}`;
      const reservedListing = await resaleCol.findOneAndUpdate(
        { id, status: "active" },
        {
          $set: {
            status: "reserved",
            buyerOrderId,
            buyerUserId,
            buyerName: buyerName || "Tayyor Bozor Xaridori",
            buyerPhone,
            buyerAddress,
            reservedAt: Date.now()
          }
        },
        { returnDocument: "after", projection: { _id: 0 } }
      );

      if (!reservedListing) {
        return res.status(409).json({
          error: "Afsuski, bu tovar hozirgina boshqa xaridor tomonidan band qilindi."
        });
      }

      // Create corresponding order in orders collection (also honors affiliate attribution if present)
      const orderRecord: Record<string, any> = {
        id: buyerOrderId,
        userId: buyerUserId,
        username: buyerName || "Tayyor Bozor Xaridori",
        productId: reservedListing.productId || id,
        productName: `⚡ [Tayyor Bozor] ${reservedListing.title}`,
        size: reservedListing.size || "Standart",
        price: reservedListing.resalePrice,
        status: "verifying",
        date: new Date().toLocaleDateString(),
        timestamp: Date.now(),
        address: `${buyerAddress} (${buyerPhone})`,
        receiptImage: "",
        cashbackUsed: 0,
        cashbackEarned: 0,
        vipRewardApplied: false,
        resaleListingId: id
      };

      const affRes = await applyAffiliateOnOrderCreate(db, {
        orderId: buyerOrderId,
        buyerUserId,
        buyerName: orderRecord.username,
        productName: orderRecord.productName,
        orderAmount: reservedListing.resalePrice,
        referredByCode: req.body?.referredBy
      });
      if (affRes.referredBy) {
        orderRecord.referredBy = affRes.referredBy;
        orderRecord.referredAffiliateId = affRes.referredAffiliateId;
        orderRecord.affiliateCommissionAmount = affRes.affiliateCommissionAmount;
      }

      await db.collection("orders").insertOne(orderRecord);

      await sendAdminTelegramAlert(
        `⚡ *Tayyor Bozor — Tovar Band Qilindi!*\n🆔 Buyurtma: ${buyerOrderId}\n📦 Tovar: ${reservedListing.title} (${reservedListing.size})\n💰 Narx: ${reservedListing.resalePrice.toLocaleString()} so'm\n👤 Xaridor: ${buyerName} (${buyerPhone})\n📍 Manzil: ${buyerAddress}\n💳 Sotuvchi karta: ${reservedListing.sellerCard} (${reservedListing.sellerName})`
      );

      res.json({
        success: true,
        buyerOrderId,
        listing: sanitizeResaleListingForClient({ ...reservedListing, sellerCard: "", sellerPhone: "" })
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Admin: list all resale listings
  router.get("/admin/resale", async (req, res) => {
    try {
      const db = await requireDb();
      const adminDevice = await verifyRequestAdminDevice(req, db);
      if (!adminDevice) {
        return res.status(403).json({ error: "Faqat ruxsat berilgan admin qurilmasi ushbu bo'limga kira oladi" });
      }
      const docs = await db
        .collection("resaleListings")
        .find({}, { projection: { _id: 0 } })
        .sort({ createdAt: -1 })
        .toArray();

      res.json({ success: true, listings: docs.map(sanitizeResaleListingForClient) });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Admin: moderate (active / rejected) or complete sale (sold) or release reservation (active)
  router.patch("/admin/resale/:id", async (req, res) => {
    try {
      const id = String(req.params.id || "").trim();
      const status = String(req.body?.status || "").trim();
      const adminNote = req.body?.adminNote !== undefined ? String(req.body.adminNote).trim().slice(0, 300) : undefined;

      if (!id || !VALID_RESALE_STATUSES.has(status)) {
        return res.status(400).json({ error: "Noto'g'ri status ko'rsatildi" });
      }

      const db = await requireDb();
      const adminDevice = await verifyRequestAdminDevice(req, db);
      if (!adminDevice) {
        return res.status(403).json({ error: "Faqat ruxsat berilgan admin qurilmasi moderatsiya qila oladi" });
      }

      const col = db.collection("resaleListings");
      const existing = await col.findOne({ id });
      if (!existing) {
        return res.status(404).json({ error: "E'lon topilmadi" });
      }

      const updateSet: Record<string, any> = { status };
      if (adminNote !== undefined) updateSet.adminNote = adminNote;
      if (status === "sold") updateSet.soldAt = Date.now();
      if (status === "active" && existing.status === "reserved") {
        updateSet.buyerOrderId = null;
        updateSet.buyerUserId = null;
        updateSet.buyerName = null;
        updateSet.buyerPhone = null;
        updateSet.buyerAddress = null;
        updateSet.reservedAt = null;
      }

      const updated = await col.findOneAndUpdate(
        { id },
        { $set: updateSet },
        { returnDocument: "after", projection: { _id: 0 } }
      );

      if (status === "sold") {
        // Also mark linked buyer order as delivered if present & trigger affiliate approval
        if (existing.buyerOrderId) {
          await db.collection("orders").updateOne(
            { id: existing.buyerOrderId },
            { $set: { status: "delivered" } }
          );
          await applyAffiliateOnOrderDelivered(db, existing.buyerOrderId);
        }
        await sendAdminTelegramAlert(
          `✅ *Tayyor Bozor — Sotuv Yakunlandi!*\n📦 Tovar: ${existing.title}\n💰 Sotuvchiga qaytarildi: ${Number(existing.resalePrice || 0).toLocaleString()} so'm\n💳 Karta: ${existing.sellerCard}`
        );
      }

      res.json({ success: true, listing: sanitizeResaleListingForClient(updated) });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // =========================================================================
  // MODULE 2: YUYU HAMKOR (AFFILIATE / BLOGGER CABINET)
  // =========================================================================

  // Get affiliate dashboard data for a user (does NOT auto-activate, so onboarding button works)
  router.get("/affiliate/profile/:userId", async (req, res) => {
    try {
      const userId = String(req.params.userId || "").trim();
      if (!userId) return res.status(400).json({ error: "userId talab qilinadi" });

      const db = await requireDb();
      const variants = buildUserIdVariants(userId);
      const profile = await db.collection("affiliateProfiles").findOne(
        { userId: { $in: variants } },
        { projection: { _id: 0 } }
      );

      if (!profile) {
        return res.json({
          success: true,
          activated: false,
          profile: null,
          commissions: [],
          payouts: []
        });
      }

      const [commissions, payouts] = await Promise.all([
        db
          .collection("affiliateCommissions")
          .find({ affiliateId: profile.userId }, { projection: { _id: 0 } })
          .sort({ createdAt: -1 })
          .limit(50)
          .toArray(),
        db
          .collection("affiliatePayouts")
          .find({ affiliateId: profile.userId }, { projection: { _id: 0 } })
          .sort({ createdAt: -1 })
          .limit(50)
          .toArray()
      ]);

      res.json({
        success: true,
        activated: true,
        profile,
        commissions,
        payouts
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // 1-click activate affiliate account OR update custom refCode
  router.post("/affiliate/activate", async (req, res) => {
    try {
      const userId = String(req.body?.userId || "").trim();
      const rawCustomCode = normalizeRefCode(req.body?.customCode);
      if (!userId) return res.status(400).json({ error: "userId talab qilinadi" });

      const db = await requireDb();
      const profilesCol = db.collection("affiliateProfiles");
      const variants = buildUserIdVariants(userId);
      const existing = await profilesCol.findOne({ userId: { $in: variants } });

      let chosenCode = rawCustomCode;
      if (chosenCode && chosenCode.length < 3) {
        return res.status(400).json({ error: "Referral kod kamida 3 ta harf yoki raqamdan iborat bo'lishi kerak" });
      }

      if (chosenCode) {
        const conflict = await profilesCol.findOne({
          refCode: chosenCode,
          userId: { $nin: existing ? [existing.userId] : variants }
        });
        if (conflict) {
          return res.status(409).json({ error: "Bu referral kod band qilingan. Iltimos, boshqa nom tanlang." });
        }
      } else if (!existing) {
        // Generate unique code like YUYU7421
        for (let i = 0; i < 10; i++) {
          const candidate = `YUYU${Math.floor(1000 + Math.random() * 9000)}`;
          const exists = await profilesCol.findOne({ refCode: candidate });
          if (!exists) {
            chosenCode = candidate;
            break;
          }
        }
        if (!chosenCode) chosenCode = `YUYU${Date.now().toString().slice(-5)}`;
      }

      if (existing) {
        const nextCode = chosenCode || existing.refCode;
        const updated = await profilesCol.findOneAndUpdate(
          { userId: existing.userId },
          { $set: { refCode: nextCode } },
          { returnDocument: "after", projection: { _id: 0 } }
        );
        return res.json({ success: true, activated: true, profile: updated });
      }

      const newProfile = {
        userId,
        refCode: chosenCode,
        commissionRate: 5,
        manualRateOverride: null,
        availableBalance: 0,
        pendingBalance: 0,
        totalEarned: 0,
        totalClicks: 0,
        totalOrders: 0,
        createdAt: Date.now()
      };
      await profilesCol.insertOne({ ...newProfile });
      res.json({ success: true, activated: true, profile: newProfile });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Track unique session click for ?ref=CODE
  router.post("/affiliate/click", async (req, res) => {
    try {
      const refCode = normalizeRefCode(req.body?.refCode);
      if (!refCode) return res.json({ success: false });

      const db = await requireDb();
      const result = await db.collection("affiliateProfiles").updateOne(
        { refCode },
        { $inc: { totalClicks: 1 } }
      );
      res.json({ success: result.matchedCount > 0 });
    } catch {
      res.json({ success: false });
    }
  });

  // Request payout (min 50,000 UZS, atomic balance deduction)
  router.post("/affiliate/payout", async (req, res) => {
    try {
      const userId = String(req.body?.userId || "").trim();
      const amount = Math.round(Number(req.body?.amount) || 0);
      const cardDigits = sanitizeCardDigits(req.body?.cardNumber);
      const cardHolderName = String(req.body?.cardHolderName || "").trim().slice(0, 80);

      if (!userId) return res.status(400).json({ error: "Foydalanuvchi aniqlanmadi" });
      if (amount < MIN_AFFILIATE_PAYOUT_UZS) {
        return res.status(400).json({
          error: `Minimal pul yechish summasi ${MIN_AFFILIATE_PAYOUT_UZS.toLocaleString()} so'm`
        });
      }
      if (cardDigits.length !== 16) {
        return res.status(400).json({ error: "Uzcard yoki Humo karta raqami 16 xonali bo'lishi kerak" });
      }
      if (cardHolderName.length < 3) {
        return res.status(400).json({ error: "Karta egasining ism-familiyasini kiriting" });
      }

      const db = await requireDb();
      const profilesCol = db.collection("affiliateProfiles");
      const variants = buildUserIdVariants(userId);

      // Atomic conditional balance deduction prevents overdraft / double-submit
      const updatedProfile = await profilesCol.findOneAndUpdate(
        { userId: { $in: variants }, availableBalance: { $gte: amount } },
        { $inc: { availableBalance: -amount } },
        { returnDocument: "after", projection: { _id: 0 } }
      );

      if (!updatedProfile) {
        return res.status(400).json({
          error: "Yechib olishga tayyor balansingizda yetarli mablag' mavjud emas"
        });
      }

      const payoutDoc = {
        id: `AFFPAY-${Date.now()}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`,
        affiliateId: updatedProfile.userId,
        affiliateRefCode: updatedProfile.refCode,
        amount,
        cardNumber: formatCardMaskedOrGrouped(cardDigits),
        cardHolderName,
        status: "pending",
        adminNote: "",
        createdAt: Date.now(),
        paidAt: null
      };

      await db.collection("affiliatePayouts").insertOne({ ...payoutDoc });
      await sendAdminTelegramAlert(
        `💸 *YUYU Hamkor — Pul yechish so'rovi*\n🏷 Kod: ${updatedProfile.refCode}\n💰 Summa: ${amount.toLocaleString()} so'm\n💳 Karta: ${payoutDoc.cardNumber}\n👤 Karta egasi: ${cardHolderName}`
      );

      res.json({ success: true, payout: payoutDoc, profile: updatedProfile });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Admin: view all affiliates leaderboard + payout requests + summary metrics
  router.get("/admin/affiliates", async (req, res) => {
    try {
      const db = await requireDb();
      const adminDevice = await verifyRequestAdminDevice(req, db);
      if (!adminDevice) {
        return res.status(403).json({ error: "Faqat ruxsat berilgan admin qurilmasi ushbu bo'limga kira oladi" });
      }

      const [profiles, payouts, users] = await Promise.all([
        db.collection("affiliateProfiles").find({}, { projection: { _id: 0 } }).sort({ totalEarned: -1, totalOrders: -1 }).toArray(),
        db.collection("affiliatePayouts").find({}, { projection: { _id: 0 } }).sort({ createdAt: -1 }).limit(100).toArray(),
        db.collection("users").find({}, { projection: { _id: 0, telegramId: 1, phoneNumber: 1, username: 1 } }).toArray()
      ]);

      const userByKey = new Map<string, { username: string; phoneNumber: string }>();
      for (const u of users) {
        const info = { username: u.username || "Hamkor", phoneNumber: u.phoneNumber || u.telegramId || "" };
        if (u.telegramId) userByKey.set(String(u.telegramId), info);
        if (u.phoneNumber) userByKey.set(String(u.phoneNumber), info);
      }

      const enrichedProfiles = profiles.map((p: any) => {
        const info = userByKey.get(String(p.userId));
        return {
          ...p,
          username: info?.username || p.refCode,
          phoneNumber: info?.phoneNumber || p.userId
        };
      });

      const enrichedPayouts = payouts.map((po: any) => {
        const info = userByKey.get(String(po.affiliateId));
        return {
          ...po,
          affiliateName: info?.username || po.cardHolderName || po.affiliateId
        };
      });

      res.json({
        success: true,
        profiles: enrichedProfiles,
        payouts: enrichedPayouts
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Admin: manually set affiliate commission rate (e.g. 10% for VIP bloggers) or reset to auto tier
  router.patch("/admin/affiliates/rate/:userId", async (req, res) => {
    try {
      const userId = String(req.params.userId || "").trim();
      const resetToAuto = Boolean(req.body?.resetToAuto);
      const rawRate = Number(req.body?.commissionRate);

      const db = await requireDb();
      const adminDevice = await verifyRequestAdminDevice(req, db);
      if (!adminDevice) {
        return res.status(403).json({ error: "Admin ruxsati talab qilinadi" });
      }

      const profilesCol = db.collection("affiliateProfiles");
      const profile = await profilesCol.findOne({ userId });
      if (!profile) return res.status(404).json({ error: "Hamkor profili topilmadi" });

      if (resetToAuto) {
        const autoRate = computeAutoAffiliateRate(Number(profile.totalOrders) || 0);
        const updated = await profilesCol.findOneAndUpdate(
          { userId },
          { $set: { commissionRate: autoRate, manualRateOverride: null } },
          { returnDocument: "after", projection: { _id: 0 } }
        );
        return res.json({ success: true, profile: updated });
      }

      if (!Number.isFinite(rawRate) || rawRate < 1 || rawRate > 30) {
        return res.status(400).json({ error: "Foiz darajasi 1% dan 30% gacha bo'lishi kerak" });
      }

      const cleanRate = Math.round(rawRate * 10) / 10;
      const updated = await profilesCol.findOneAndUpdate(
        { userId },
        { $set: { commissionRate: cleanRate, manualRateOverride: cleanRate } },
        { returnDocument: "after", projection: { _id: 0 } }
      );
      res.json({ success: true, profile: updated });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Admin: approve (paid) or reject affiliate payout (atomic refund on reject)
  router.patch("/admin/affiliates/payouts/:id", async (req, res) => {
    try {
      const id = String(req.params.id || "").trim();
      const status = String(req.body?.status || "").trim();
      const adminNote = String(req.body?.adminNote || "").trim().slice(0, 240);

      if (!id || (status !== "paid" && status !== "rejected")) {
        return res.status(400).json({ error: "Status faqat 'paid' yoki 'rejected' bo'lishi mumkin" });
      }

      const db = await requireDb();
      const adminDevice = await verifyRequestAdminDevice(req, db);
      if (!adminDevice) {
        return res.status(403).json({ error: "Admin ruxsati talab qilinadi" });
      }

      const payoutsCol = db.collection("affiliatePayouts");
      const updated = await payoutsCol.findOneAndUpdate(
        { id, status: "pending" },
        {
          $set: {
            status,
            adminNote,
            paidAt: status === "paid" ? Date.now() : null
          }
        },
        { returnDocument: "after", projection: { _id: 0 } }
      );

      if (!updated) {
        return res.status(409).json({ error: "Ushbu to'lov so'rovi allaqachon ko'rib chiqilgan yoki topilmadi" });
      }

      if (status === "rejected") {
        await db.collection("affiliateProfiles").updateOne(
          { userId: updated.affiliateId },
          { $inc: { availableBalance: Math.max(0, Number(updated.amount) || 0) } }
        );
      }

      res.json({ success: true, payout: updated });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });
}
