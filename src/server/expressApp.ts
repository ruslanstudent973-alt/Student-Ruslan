import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import crypto from "crypto";
import { MongoClient, Db } from "mongodb";
import {
  runAiShoppingChat,
  runAiVisualSearch,
  runAiProductHelp,
  runAiAdminCopy,
  AiCatalogItem
} from "./geminiService";
import { registerAuctionRoutes } from "./auctionRoutes";
import {
  registerTayyorAffiliateRoutes,
  applyAffiliateOnOrderCreate,
  applyAffiliateOnOrderDelivered,
  applyAffiliateOnOrderCancelled
} from "./tayyorAffiliateRoutes";

const existingEnvUri = (process.env.MONGODB_URI || "").trim();
const existingGeminiKey = (process.env.GEMINI_API_KEY || "").trim();
dotenv.config({
  override: !existingEnvUri || !/^mongodb(\+srv)?:\/\//.test(existingEnvUri)
});
if (existingGeminiKey && !(process.env.GEMINI_API_KEY || "").trim()) {
  process.env.GEMINI_API_KEY = existingGeminiKey;
}

const app = express();

// Middleware (50mb limit to support base64 product images, banners, avatars & payment receipts)
app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Initial seed data (inserted into MongoDB 'saytim' once when collections are empty)
const initialSeedData = {
  products: [
    {
      id: "p1",
      name: "AirPods Pro Gen 2 (Premium)",
      pinduoduoPrice: 180,
      oldPrice: 450000,
      description: "Eng so'nggi rusumdagi AirPods Pro. Shovqinni kamaytirish (ANC) va yuqori sifatli ovoz. Xitoyning eng yaxshi fabrikasidan keltiriladi.",
      category: "Elektronika",
      images: [
        "https://images.unsplash.com/photo-1588423770186-80f3ef9adad0?q=80&w=1000&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1600294037681-c80b4cbfa11c?q=80&w=1000&auto=format&fit=crop"
      ],
      videos: [
        "https://assets.mixkit.co/videos/preview/mixkit-girl-putting-on-white-wireless-headphones-to-listen-to-music-34533-large.mp4"
      ],
      sizes: ["Oq", "Qora"],
      rating: 4.9,
      salesCount: 1240,
      seller: {
        name: "YUYU Electronics",
        avatar: "",
        rating: 5,
        description: "Ishonchli yetkazib beruvchi"
      },
      isOriginal: true,
      isCheapPrice: true,
      vipPrice: 365000,
      isVipOnly: false,
      weight: 0.2
    },
    {
      id: "p2",
      name: "Nike Air Jordan 1 Low",
      pinduoduoPrice: 250,
      oldPrice: 600000,
      vipPrice: 510000,
      isVipOnly: false,
      description: "Sifatli krossovkalar. Kundalik kiyish uchun juda qulay va zamonaviy dizayn. Ranglari tanlovda mavjud.",
      category: "Oyoq kiyim",
      images: [
        "https://images.unsplash.com/photo-1552346154-21d32810aba3?q=80&w=1000&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?q=80&w=1000&auto=format&fit=crop"
      ],
      videos: [
        "https://assets.mixkit.co/videos/preview/mixkit-close-up-of-shoes-walking-on-pavement-4361-large.mp4"
      ],
      sizes: ["39", "40", "41", "42", "43", "44"],
      rating: 4.8,
      salesCount: 850,
      seller: {
        name: "Sneaker Shop Uz",
        avatar: "",
        rating: 4.9,
        description: "Brend oyoq kiyimlar mutaxassisi"
      },
      isOriginal: true,
      weight: 1.2
    },
    {
      id: "p3",
      name: "Smart Watch Ultra 8",
      pinduoduoPrice: 140,
      oldPrice: 350000,
      description: "Eng yangi smart soat. Qo'ng'iroq qilish, xabarlarni o'qish va salomatlikni kuzatish funksivari mavjud. Ekran sifati juda yuqori.",
      category: "Gadjeytlar",
      images: [
        "https://images.unsplash.com/photo-1579586337278-3befd40fd17a?q=80&w=1000&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=1000&auto=format&fit=crop"
      ],
      videos: [
        "https://assets.mixkit.co/videos/preview/mixkit-young-man-setting-up-his-smart-watch-before-a-workout-34139-large.mp4"
      ],
      sizes: ["Orange", "Grey", "Black"],
      rating: 4.7,
      salesCount: 2100,
      seller: {
        name: "Gid Store",
        avatar: "",
        rating: 4.8,
        description: "Xitoydan to'g'ridan-to'g'ri yetkazish"
      },
      isCheapPrice: true,
      weight: 0.3
    }
  ],
  users: [
    {
      telegramId: "8215056224",
      phoneNumber: "8215056224",
      username: "YUYU Admin",
      avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=200&auto=format&fit=crop",
      referralBalance: 0,
      invitedCount: 0,
      bio: "YUYU Shop boshqaruvi",
      isAdmin: true,
      vipTier: "DIAMOND",
      totalSpent: 5500000,
      cashbackBalance: 250000,
      isSubscribedVip: true,
      vipExpiresAt: null
    }
  ],
  banners: [
    {
      id: "b1",
      title: "Yangi Mavsum To'plami",
      subtitle: "50% gacha chegirmalar",
      image: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?q=80&w=1000&auto=format&fit=crop",
      link: "catalog"
    }
  ],
  productVideos: [
    {
      id: "vid-1",
      productId: "p1",
      caption: "AirPods Pro Gen 2 jonli obzor — faol shovqin kamaytirish (ANC) va tiniq bass ovoz!",
      videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-girl-putting-on-white-wireless-headphones-to-listen-to-music-34533-large.mp4",
      posterImage: "https://images.unsplash.com/photo-1588423770186-80f3ef9adad0?q=80&w=1000&auto=format&fit=crop",
      uploaderId: "8215056224",
      uploaderName: "YUYU Admin",
      uploaderRole: "admin",
      likes: ["8215056224"],
      comments: [
        {
          id: "vc-1",
          userId: "8215056224",
          username: "YUYU Admin",
          text: "Original sifat va VIP mijozlar uchun maxsus chegirmali narxda mavjud!",
          createdAt: Date.now() - 3600 * 1000 * 5
        }
      ],
      sharesCount: 14,
      createdAt: Date.now() - 3600 * 1000 * 6
    },
    {
      id: "vid-2",
      productId: "p2",
      caption: "Nike Air Jordan 1 Low oyoqda qanday turishini ko'ring — barcha o'lchamlar (39–44) mavjud.",
      videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-close-up-of-shoes-walking-on-pavement-4361-large.mp4",
      posterImage: "https://images.unsplash.com/photo-1552346154-21d32810aba3?q=80&w=1000&auto=format&fit=crop",
      uploaderId: "8215056224",
      uploaderName: "YUYU Admin",
      uploaderRole: "admin",
      likes: ["8215056224"],
      comments: [
        {
          id: "vc-2",
          userId: "8215056224",
          username: "YUYU Admin",
          text: "Qulay taglik va kundalik kiyish uchun juda yengil krossovka.",
          createdAt: Date.now() - 3600 * 1000 * 3
        }
      ],
      sharesCount: 9,
      createdAt: Date.now() - 3600 * 1000 * 4
    },
    {
      id: "vid-3",
      productId: "p3",
      caption: "Smart Watch Ultra 8 — sport, qo'ng'iroqlar va yorqin AMOLED ekran bir soatda.",
      videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-young-man-setting-up-his-smart-watch-before-a-workout-34139-large.mp4",
      posterImage: "https://images.unsplash.com/photo-1579586337278-3befd40fd17a?q=80&w=1000&auto=format&fit=crop",
      uploaderId: "8215056224",
      uploaderName: "YUYU Admin",
      uploaderRole: "admin",
      likes: [],
      comments: [],
      sharesCount: 6,
      createdAt: Date.now() - 3600 * 1000 * 2
    }
  ]
};

// MongoDB Atlas connection (database: saytim)
const DB_NAME = process.env.MONGODB_DB || "saytim";

const globalForMongo = globalThis as typeof globalThis & {
  __mongoClientPromise?: Promise<MongoClient> | null;
  __mongoSeeded?: boolean;
};

function stripId<T extends Record<string, any>>(doc: T): Omit<T, "_id"> {
  if (!doc || typeof doc !== "object") return doc;
  const { _id, ...rest } = doc;
  return rest;
}

async function ensureSeeded(db: Db): Promise<void> {
  if (globalForMongo.__mongoSeeded) return;

  const metaCol = db.collection("meta");
  const seededFlag = await metaCol.findOne({ key: "initial_seed_v1" });

  if (!seededFlag) {
    const [prodCount, userCount, bannerCount] = await Promise.all([
      db.collection("products").countDocuments(),
      db.collection("users").countDocuments(),
      db.collection("banners").countDocuments()
    ]);

    if (prodCount === 0 && initialSeedData.products.length > 0) {
      await db.collection("products").insertMany(initialSeedData.products.map((p) => ({ ...p })));
    }
    if (userCount === 0 && initialSeedData.users.length > 0) {
      await db.collection("users").insertMany(initialSeedData.users.map((u) => ({ ...u })));
    }
    if (bannerCount === 0 && initialSeedData.banners.length > 0) {
      await db.collection("banners").insertMany(initialSeedData.banners.map((b) => ({ ...b })));
    }

    await metaCol.updateOne(
      { key: "initial_seed_v1" },
      { $set: { key: "initial_seed_v1", seededAt: new Date().toISOString() } },
      { upsert: true }
    );

    try {
      await Promise.all([
        db.collection("products").createIndex({ id: 1 }),
        db.collection("users").createIndex({ phoneNumber: 1 }),
        db.collection("users").createIndex({ telegramId: 1 }),
        db.collection("orders").createIndex({ id: 1 }),
        db.collection("orders").createIndex({ timestamp: -1 }),
        db.collection("promoCodes").createIndex({ code: 1 }),
        db.collection("partnerships").createIndex({ id: 1 }),
        db.collection("wishlists").createIndex({ userId: 1 }, { unique: true }),
        db.collection("carts").createIndex({ userId: 1 }, { unique: true })
      ]);
    } catch (idxErr) {
      console.warn("[MongoDB] Index creation note:", idxErr);
    }
  }

  // Ensure productVideos collection is seeded once for both new and existing databases
  const videosSeededFlag = await metaCol.findOne({ key: "videos_seed_v1" });
  if (!videosSeededFlag) {
    const vidCount = await db.collection("productVideos").countDocuments();
    if (vidCount === 0) {
      const existingProducts = await db
        .collection("products")
        .find({}, { projection: { _id: 0 } })
        .toArray();
      const existingIds = new Set(existingProducts.map((p: any) => p.id));

      const toInsert: any[] = [];
      for (const seedVid of initialSeedData.productVideos) {
        if (existingIds.has(seedVid.productId)) {
          toInsert.push({ ...seedVid });
        }
      }

      // If database has custom products instead of p1..p3, seed starter reels for up to 3 existing products
      if (toInsert.length === 0 && existingProducts.length > 0) {
        existingProducts.slice(0, 3).forEach((p: any, idx: number) => {
          toInsert.push({
            id: `vid-seed-${p.id}-${idx + 1}`,
            productId: p.id,
            caption: `${p.name} — YUYU Shop jonli video vitrinasi!`,
            videoUrl: Array.isArray(p.videos) && p.videos[0] ? p.videos[0] : "",
            posterImage: Array.isArray(p.images) && p.images[0] ? p.images[0] : "",
            uploaderId: "8215056224",
            uploaderName: "YUYU Admin",
            uploaderRole: "admin",
            likes: [],
            comments: [],
            sharesCount: 0,
            createdAt: Date.now() - (idx + 1) * 60000
          });
        });
      }

      if (toInsert.length > 0) {
        await db.collection("productVideos").insertMany(toInsert);
      }
    }

    await metaCol.updateOne(
      { key: "videos_seed_v1" },
      { $set: { key: "videos_seed_v1", seededAt: new Date().toISOString() } },
      { upsert: true }
    );

    try {
      await Promise.all([
        db.collection("productVideos").createIndex({ id: 1 }),
        db.collection("productVideos").createIndex({ createdAt: -1 })
      ]);
    } catch {}
  }

  globalForMongo.__mongoSeeded = true;
}

async function requireDb(): Promise<Db> {
  const rawUri = process.env.MONGODB_URI;
  const uri = rawUri ? rawUri.trim().replace(/^\[|\]$/g, "").replace(/^["']|["']$/g, "") : "";
  if (!uri) {
    throw new Error("MONGODB_URI muhit o'zgaruvchisi topilmadi");
  }

  try {
    if (!globalForMongo.__mongoClientPromise) {
      const client = new MongoClient(uri, {
        serverSelectionTimeoutMS: 8000,
        connectTimeoutMS: 8000,
        maxPoolSize: 10
      });
      globalForMongo.__mongoClientPromise = client.connect();
    }

    const client = await globalForMongo.__mongoClientPromise;
    const db = client.db(DB_NAME);
    await ensureSeeded(db);
    return db;
  } catch (err: any) {
    globalForMongo.__mongoClientPromise = null;
    globalForMongo.__mongoSeeded = false;
    throw new Error(`MongoDB ulanish xatosi: ${err?.message || err}`);
  }
}

type ServerVipTier = "NONE" | "SILVER" | "GOLD" | "DIAMOND";

const SERVER_VIP_ORDER: ServerVipTier[] = ["NONE", "SILVER", "GOLD", "DIAMOND"];
const SERVER_VIP_THRESHOLDS: Record<ServerVipTier, number> = {
  NONE: 0,
  SILVER: 500000,
  GOLD: 2000000,
  DIAMOND: 5000000
};
const SERVER_VIP_CASHBACK: Record<ServerVipTier, number> = {
  NONE: 0,
  SILVER: 0.03,
  GOLD: 0.05,
  DIAMOND: 0.1
};
const SERVER_VIP_DELIVERY_DISCOUNT: Record<ServerVipTier, number> = {
  NONE: 0,
  SILVER: 0,
  GOLD: 0.5,
  DIAMOND: 1.0
};

function isServerSubActive(user: any): boolean {
  if (!user?.isSubscribedVip) return false;
  if (!user.vipExpiresAt) return true;
  const exp = new Date(user.vipExpiresAt).getTime();
  return !Number.isNaN(exp) && exp > Date.now();
}

function getTierFromSpentServer(totalSpent: number): ServerVipTier {
  if (totalSpent >= SERVER_VIP_THRESHOLDS.DIAMOND) return "DIAMOND";
  if (totalSpent >= SERVER_VIP_THRESHOLDS.GOLD) return "GOLD";
  if (totalSpent >= SERVER_VIP_THRESHOLDS.SILVER) return "SILVER";
  return "NONE";
}

function maxServerTier(a: ServerVipTier, b: ServerVipTier): ServerVipTier {
  return SERVER_VIP_ORDER.indexOf(a) >= SERVER_VIP_ORDER.indexOf(b) ? a : b;
}

function computeServerVipPayload(user: any) {
  const totalSpent = Math.max(0, Number(user?.totalSpent) || 0);
  const cashbackBalance = Math.max(0, Number(user?.cashbackBalance) || 0);
  const activeSub = isServerSubActive(user);
  const storedTier: ServerVipTier = SERVER_VIP_ORDER.includes(user?.vipTier) ? user.vipTier : "NONE";

  let effectiveTier: ServerVipTier = storedTier;
  if (activeSub) {
    effectiveTier = maxServerTier(effectiveTier, "GOLD");
  }
  const spentTier = getTierFromSpentServer(totalSpent);
  if (storedTier === "NONE" && spentTier !== "NONE") {
    effectiveTier = maxServerTier(effectiveTier, spentTier);
  }

  let nextTier: ServerVipTier | null = null;
  let currentFloor = 0;
  let nextThreshold = 0;
  if (effectiveTier === "NONE") {
    nextTier = "SILVER";
    currentFloor = 0;
    nextThreshold = SERVER_VIP_THRESHOLDS.SILVER;
  } else if (effectiveTier === "SILVER") {
    nextTier = "GOLD";
    currentFloor = SERVER_VIP_THRESHOLDS.SILVER;
    nextThreshold = SERVER_VIP_THRESHOLDS.GOLD;
  } else if (effectiveTier === "GOLD") {
    nextTier = "DIAMOND";
    currentFloor = SERVER_VIP_THRESHOLDS.GOLD;
    nextThreshold = SERVER_VIP_THRESHOLDS.DIAMOND;
  }

  const remainingForNextTier = nextTier ? Math.max(0, nextThreshold - totalSpent) : 0;
  const progressPercent = nextTier
    ? Math.min(
        100,
        Math.max(
          0,
          Math.round(((Math.max(totalSpent, currentFloor) - currentFloor) / (nextThreshold - currentFloor)) * 100)
        )
      )
    : 100;

  return {
    vipTier: effectiveTier,
    isVip: effectiveTier !== "NONE",
    isSubscribedVip: activeSub,
    vipExpiresAt: user?.vipExpiresAt || null,
    totalSpent,
    cashbackBalance,
    cashbackRate: SERVER_VIP_CASHBACK[effectiveTier],
    deliveryDiscountRate: SERVER_VIP_DELIVERY_DISCOUNT[effectiveTier],
    hasVipPriceAccess: effectiveTier === "GOLD" || effectiveTier === "DIAMOND",
    hasVipOnlyAccess: effectiveTier !== "NONE",
    nextTier,
    nextTierThreshold: nextThreshold,
    remainingForNextTier,
    progressPercent
  };
}

const LARGE_DATA_URI_MARKER = "__LARGE_DATA_URI__";

function isLargeDataUri(value: unknown): value is string {
  return (
    value === LARGE_DATA_URI_MARKER ||
    (typeof value === "string" && value.startsWith("data:") && value.length > 2048)
  );
}

function mongoStripLargeDataUriExpr(fieldPath: string) {
  return {
    $cond: {
      if: { $eq: [{ $type: fieldPath }, "string"] },
      then: {
        $cond: {
          if: {
            $and: [
              { $gt: [{ $strLenBytes: fieldPath }, 2048] },
              { $eq: [{ $substrBytes: [fieldPath, 0, 5] }, "data:"] }
            ]
          },
          then: LARGE_DATA_URI_MARKER,
          else: fieldPath
        }
      },
      else: fieldPath
    }
  };
}

function mongoStripLargeDataUriArrayExpr(fieldPath: string) {
  return {
    $cond: {
      if: { $isArray: fieldPath },
      then: {
        $map: {
          input: fieldPath,
          as: "item",
          in: {
            $cond: {
              if: { $eq: [{ $type: "$$item" }, "string"] },
              then: {
                $cond: {
                  if: {
                    $and: [
                      { $gt: [{ $strLenBytes: "$$item" }, 2048] },
                      { $eq: [{ $substrBytes: ["$$item", 0, 5] }, "data:"] }
                    ]
                  },
                  then: LARGE_DATA_URI_MARKER,
                  else: "$$item"
                }
              },
              else: "$$item"
            }
          }
        }
      },
      else: fieldPath
    }
  };
}

function sendMediaValue(res: any, value: unknown) {
  if (!value || typeof value !== "string") {
    return res.status(404).end();
  }
  if (/^https?:\/\//i.test(value)) {
    return res.redirect(302, value);
  }
  const match = value.match(/^data:([^;,]+);base64,(.+)$/s);
  if (!match) {
    return res.status(404).end();
  }
  const mime = match[1] || "application/octet-stream";
  const buf = Buffer.from(match[2], "base64");
  res.setHeader("Content-Type", mime);
  res.setHeader("Content-Length", String(buf.length));
  res.setHeader("Cache-Control", "public, max-age=86400");
  return res.status(200).send(buf);
}

async function loadAllDataFromDb(db: Db) {
  const [
    rawProducts,
    rawUsers,
    rawOrders,
    rawBanners,
    supportMessages,
    promoCodes,
    rawPartnerships,
    wishlistDocs,
    cartDocs,
    vipSettings,
    rawVipRequests,
    rawProductVideos,
    rawCustomRequests
  ] = await Promise.all([
    db
      .collection("products")
      .aggregate([
        {
          $addFields: {
            images: mongoStripLargeDataUriArrayExpr("$images"),
            videos: mongoStripLargeDataUriArrayExpr("$videos")
          }
        },
        { $project: { _id: 0 } }
      ])
      .toArray(),
    db
      .collection("users")
      .aggregate([
        { $addFields: { avatar: mongoStripLargeDataUriExpr("$avatar") } },
        { $project: { _id: 0 } }
      ])
      .toArray(),
    db
      .collection("orders")
      .aggregate([
        { $sort: { timestamp: -1 } },
        { $addFields: { receiptImage: mongoStripLargeDataUriExpr("$receiptImage") } },
        { $project: { _id: 0 } }
      ])
      .toArray(),
    db
      .collection("banners")
      .aggregate([
        { $addFields: { image: mongoStripLargeDataUriExpr("$image") } },
        { $project: { _id: 0 } }
      ])
      .toArray(),
    db.collection("supportMessages").find({}, { projection: { _id: 0 } }).sort({ date: -1 }).toArray(),
    db.collection("promoCodes").find({}, { projection: { _id: 0 } }).toArray(),
    db
      .collection("partnerships")
      .aggregate([
        { $sort: { date: -1 } },
        { $addFields: { receiptImage: mongoStripLargeDataUriExpr("$receiptImage") } },
        { $project: { _id: 0 } }
      ])
      .toArray(),
    db.collection("wishlists").find({}, { projection: { _id: 0 } }).toArray(),
    db.collection("carts").find({}, { projection: { _id: 0 } }).toArray(),
    db.collection("vipSettings").findOne({ id: "default" }, { projection: { _id: 0 } }),
    db
      .collection("vipRequests")
      .aggregate([
        { $sort: { createdAt: -1 } },
        { $addFields: { receiptImage: mongoStripLargeDataUriExpr("$receiptImage") } },
        { $project: { _id: 0 } }
      ])
      .toArray(),
    db
      .collection("productVideos")
      .aggregate([
        { $sort: { createdAt: -1 } },
        {
          $addFields: {
            posterImage: mongoStripLargeDataUriExpr("$posterImage"),
            videoUrl: mongoStripLargeDataUriExpr("$videoUrl")
          }
        },
        { $project: { _id: 0 } }
      ])
      .toArray(),
    db
      .collection("customRequests")
      .aggregate([
        { $sort: { createdAt: -1 } },
        { $addFields: { imageUrl: mongoStripLargeDataUriExpr("$imageUrl") } },
        { $project: { _id: 0 } }
      ])
      .toArray()
  ]);

  const products = rawProducts.map((p: any) => ({
    ...p,
    images: Array.isArray(p.images)
      ? p.images.map((img: any, idx: number) =>
          isLargeDataUri(img) ? `/api/media/product/${encodeURIComponent(p.id)}/${idx}` : img
        )
      : [],
    videos: Array.isArray(p.videos)
      ? p.videos.map((vid: any, idx: number) =>
          isLargeDataUri(vid) ? `/api/media/product-video/${encodeURIComponent(p.id)}/${idx}` : vid
        )
      : p.videos
  }));

  const sanitizedProductById = new Map<string, any>();
  for (const p of products) {
    if (p?.id) sanitizedProductById.set(p.id, p);
  }

  const users = rawUsers.map((u: any) => {
    const uid = u.telegramId || u.phoneNumber || "";
    return {
      ...u,
      avatar: isLargeDataUri(u.avatar) && uid ? `/api/media/user/${encodeURIComponent(uid)}/avatar` : u.avatar,
      vipTier: SERVER_VIP_ORDER.includes(u.vipTier) ? u.vipTier : "NONE",
      totalSpent: Number(u.totalSpent) || 0,
      cashbackBalance: Number(u.cashbackBalance) || 0,
      isSubscribedVip: Boolean(u.isSubscribedVip),
      vipExpiresAt: u.vipExpiresAt || null
    };
  });

  const orders = rawOrders.map((o: any) => ({
    ...o,
    receiptImage: isLargeDataUri(o.receiptImage)
      ? `/api/media/order/${encodeURIComponent(o.id)}/receipt`
      : o.receiptImage
  }));

  const banners = rawBanners.map((b: any) => ({
    ...b,
    image: isLargeDataUri(b.image) ? `/api/media/banner/${encodeURIComponent(b.id)}` : b.image
  }));

  const partnerships = rawPartnerships.map((pt: any) => ({
    ...pt,
    receiptImage: isLargeDataUri(pt.receiptImage)
      ? `/api/media/partnership/${encodeURIComponent(pt.id)}/receipt`
      : pt.receiptImage
  }));

  const vipRequests = rawVipRequests.map((vr: any) => ({
    ...vr,
    receiptImage: isLargeDataUri(vr.receiptImage)
      ? `/api/media/vip-request/${encodeURIComponent(vr.id)}/receipt`
      : vr.receiptImage
  }));

  const productVideos = rawProductVideos.map((pv: any) => ({
    ...pv,
    posterImage: isLargeDataUri(pv.posterImage)
      ? `/api/media/video/${encodeURIComponent(pv.id)}/poster`
      : pv.posterImage,
    videoUrl: isLargeDataUri(pv.videoUrl)
      ? `/api/media/video/${encodeURIComponent(pv.id)}/stream`
      : pv.videoUrl
  }));

  const customRequests = rawCustomRequests.map((cr: any) => ({
    ...cr,
    imageUrl: isLargeDataUri(cr.imageUrl)
      ? `/api/media/custom-request/${encodeURIComponent(cr.id)}`
      : cr.imageUrl
  }));

  const wishlists: Record<string, string[]> = {};
  for (const doc of wishlistDocs) {
    if (doc.userId) {
      wishlists[doc.userId] = Array.isArray(doc.items) ? doc.items : [];
    }
  }

  const carts: Record<string, any[]> = {};
  for (const doc of cartDocs) {
    if (doc.userId) {
      const items = Array.isArray(doc.items) ? doc.items : [];
      carts[doc.userId] = items.map((item: any) => {
        if (!item?.product) return item;
        const freshProd = item.product.id ? sanitizedProductById.get(item.product.id) : null;
        if (freshProd) {
          return { ...item, product: freshProd };
        }
        const cleanedImages = Array.isArray(item.product.images)
          ? item.product.images.map((img: any, idx: number) =>
              isLargeDataUri(img) && item.product.id
                ? `/api/media/product/${encodeURIComponent(item.product.id)}/${idx}`
                : img
            )
          : [];
        return { ...item, product: { ...item.product, images: cleanedImages } };
      });
    }
  }

  return {
    products,
    users,
    orders,
    banners,
    supportMessages,
    promoCodes,
    partnerships,
    wishlists,
    carts,
    vipSettings: vipSettings || {
      id: "default",
      monthlyPrice: 39000,
      silverThreshold: 500000,
      goldThreshold: 2000000,
      diamondThreshold: 5000000,
      silverCashback: 0.03,
      goldCashback: 0.05,
      diamondCashback: 0.1,
      totalCashbackDistributed: 0
    },
    vipRequests,
    productVideos,
    customRequests
  };
}

const router = express.Router();

// Short-lived cache for /api/data, immediately invalidated on any mutating API call
let cachedDataPayload: { data: any; expiresAt: number } | null = null;
let inflightDataLoad: Promise<any> | null = null;

router.use((req, _res, next) => {
  if (req.method !== "GET" && req.method !== "HEAD" && req.method !== "OPTIONS") {
    cachedDataPayload = null;
  }
  next();
});

// Binary media streaming routes so /api/data stays tiny (< 50 KB) instead of 25+ MB
router.get("/media/product/:productId/:index", async (req, res) => {
  try {
    const db = await requireDb();
    const prod = await db.collection("products").findOne(
      { id: req.params.productId },
      { projection: { images: 1 } }
    );
    const idx = Number(req.params.index) || 0;
    return sendMediaValue(res, Array.isArray(prod?.images) ? prod.images[idx] : null);
  } catch {
    return res.status(500).end();
  }
});

router.get("/media/product-video/:productId/:index", async (req, res) => {
  try {
    const db = await requireDb();
    const prod = await db.collection("products").findOne(
      { id: req.params.productId },
      { projection: { videos: 1 } }
    );
    const idx = Number(req.params.index) || 0;
    return sendMediaValue(res, Array.isArray(prod?.videos) ? prod.videos[idx] : null);
  } catch {
    return res.status(500).end();
  }
});

router.get("/media/user/:userId/avatar", async (req, res) => {
  try {
    const db = await requireDb();
    const uid = req.params.userId;
    const user = await db.collection("users").findOne(
      { $or: [{ telegramId: uid }, { phoneNumber: uid }] },
      { projection: { avatar: 1 } }
    );
    return sendMediaValue(res, user?.avatar);
  } catch {
    return res.status(500).end();
  }
});

router.get("/media/order/:orderId/receipt", async (req, res) => {
  try {
    const db = await requireDb();
    const order = await db.collection("orders").findOne(
      { id: req.params.orderId },
      { projection: { receiptImage: 1 } }
    );
    return sendMediaValue(res, order?.receiptImage);
  } catch {
    return res.status(500).end();
  }
});

router.get("/media/banner/:bannerId", async (req, res) => {
  try {
    const db = await requireDb();
    const banner = await db.collection("banners").findOne(
      { id: req.params.bannerId },
      { projection: { image: 1 } }
    );
    return sendMediaValue(res, banner?.image);
  } catch {
    return res.status(500).end();
  }
});

router.get("/media/partnership/:id/receipt", async (req, res) => {
  try {
    const db = await requireDb();
    const pt = await db.collection("partnerships").findOne(
      { id: req.params.id },
      { projection: { receiptImage: 1 } }
    );
    return sendMediaValue(res, pt?.receiptImage);
  } catch {
    return res.status(500).end();
  }
});

router.get("/media/vip-request/:id/receipt", async (req, res) => {
  try {
    const db = await requireDb();
    const vr = await db.collection("vipRequests").findOne(
      { id: req.params.id },
      { projection: { receiptImage: 1 } }
    );
    return sendMediaValue(res, vr?.receiptImage);
  } catch {
    return res.status(500).end();
  }
});

router.get("/media/custom-request/:id", async (req, res) => {
  try {
    const db = await requireDb();
    const cr = await db.collection("customRequests").findOne(
      { id: req.params.id },
      { projection: { imageUrl: 1 } }
    );
    return sendMediaValue(res, cr?.imageUrl);
  } catch {
    return res.status(500).end();
  }
});

router.get("/media/video/:id/poster", async (req, res) => {
  try {
    const db = await requireDb();
    const pv = await db.collection("productVideos").findOne(
      { id: req.params.id },
      { projection: { posterImage: 1 } }
    );
    return sendMediaValue(res, pv?.posterImage);
  } catch {
    return res.status(500).end();
  }
});

router.get("/media/video/:id/stream", async (req, res) => {
  try {
    const db = await requireDb();
    const pv = await db.collection("productVideos").findOne(
      { id: req.params.id },
      { projection: { videoUrl: 1 } }
    );
    return sendMediaValue(res, pv?.videoUrl);
  } catch {
    return res.status(500).end();
  }
});

// Root & Health
router.get("/", (req, res) =>
  res.json({ status: "ok", message: "YUYU Shop API (MongoDB)", db: DB_NAME, version: "3.0.0" })
);

router.get("/health", async (req, res) => {
  try {
    const db = await requireDb();
    await db.command({ ping: 1 });
    res.json({ status: "ok", mongoConnected: true, dbName: DB_NAME, time: Date.now() });
  } catch (e: any) {
    res.status(503).json({ status: "error", mongoConnected: false, dbName: DB_NAME, error: e.message });
  }
});

// Get all site data strictly from MongoDB
router.get("/data", async (req, res) => {
  try {
    res.setHeader("Cache-Control", "no-store");
    const now = Date.now();
    if (cachedDataPayload && cachedDataPayload.expiresAt > now) {
      return res.json(cachedDataPayload.data);
    }
    const db = await requireDb();
    if (!inflightDataLoad) {
      inflightDataLoad = loadAllDataFromDb(db)
        .then((data) => {
          cachedDataPayload = { data, expiresAt: Date.now() + 60000 };
          return data;
        })
        .finally(() => {
          inflightDataLoad = null;
        });
    }
    const data = await inflightDataLoad;
    res.json(data);
  } catch (e: any) {
    console.error("GET /data MongoDB error:", e.message);
    res.status(503).json({ error: "MongoDB bilan ulanib bo'lmadi", message: e.message });
  }
});

// Register / Update User in MongoDB
router.post("/users", async (req, res) => {
  try {
    const rawBody = stripId(req.body || {});
    const { previousPhoneNumber, ...rawUser } = rawBody;
    const rawTelegramId = typeof rawUser.telegramId === "string" ? rawUser.telegramId.trim() : "";
    const rawPhoneInput = typeof rawUser.phoneNumber === "string" ? rawUser.phoneNumber.trim() : "";
    const prevPhoneInput = typeof previousPhoneNumber === "string" ? previousPhoneNumber.trim() : "";
    const userKey = rawTelegramId || prevPhoneInput || rawPhoneInput;
    if (!userKey) {
      return res.status(400).json({ error: "phoneNumber or telegramId required" });
    }

    const db = await requireDb();
    const usersCol = db.collection("users");

    // 1. Find existing user primarily by stable telegramId, then by previousPhoneNumber, then by phoneNumber
    let existingDoc: any = null;
    if (rawTelegramId) {
      existingDoc = await usersCol.findOne({ telegramId: rawTelegramId });
    }
    if (!existingDoc && prevPhoneInput) {
      const prevVariants = buildPhoneMatchVariants(prevPhoneInput);
      existingDoc = await usersCol.findOne({
        $or: [{ phoneNumber: { $in: prevVariants } }, { telegramId: { $in: prevVariants } }]
      });
    }
    if (!existingDoc && rawPhoneInput) {
      const variants = buildPhoneMatchVariants(rawPhoneInput);
      existingDoc = await usersCol.findOne({
        $or: [{ phoneNumber: { $in: variants } }, { telegramId: { $in: variants } }]
      });
    }

    const existing = existingDoc ? stripId(existingDoc) : null;
    const normalizedPhone = rawPhoneInput
      ? normalizePhoneForStorage(rawPhoneInput)
      : existing?.phoneNumber || userKey;

    // 2. If phoneNumber is changing, ensure no OTHER account already uses it
    if (rawPhoneInput && existingDoc) {
      const existingVariants = new Set(
        buildPhoneMatchVariants(existing?.phoneNumber || "")
      );
      const isChangingPhone = !existingVariants.has(normalizedPhone) && !existingVariants.has(rawPhoneInput);
      if (isChangingPhone) {
        const newVariants = buildPhoneMatchVariants(normalizedPhone);
        const conflict = await usersCol.findOne({
          _id: { $ne: existingDoc._id },
          $or: [{ phoneNumber: { $in: newVariants } }, { telegramId: { $in: newVariants } }]
        });
        if (conflict) {
          return res.status(409).json({
            error: "Bu telefon raqami boshqa hisobga biriktirilgan."
          });
        }
      }
    }

    const preservedAvatar =
      typeof rawUser.avatar === "string" && rawUser.avatar.startsWith("/api/media/user/") && existing?.avatar
        ? existing.avatar
        : rawUser.avatar;

    const mergedUser = existing
      ? {
          ...existing,
          ...rawUser,
          avatar: preservedAvatar !== undefined ? preservedAvatar : existing.avatar,
          telegramId: existing.telegramId || rawTelegramId || userKey,
          phoneNumber: normalizedPhone,
          isAdmin: Boolean(existing.isAdmin),
          referralBalance:
            typeof rawUser.referralBalance === "number" && rawUser.referralBalance > (existing.referralBalance || 0)
              ? rawUser.referralBalance
              : existing.referralBalance || 0,
          invitedCount:
            typeof rawUser.invitedCount === "number" && rawUser.invitedCount > (existing.invitedCount || 0)
              ? rawUser.invitedCount
              : existing.invitedCount || 0,
          vipTier: existing.vipTier || rawUser.vipTier || "NONE",
          totalSpent: typeof existing.totalSpent === "number" ? existing.totalSpent : Number(rawUser.totalSpent) || 0,
          cashbackBalance:
            typeof existing.cashbackBalance === "number"
              ? existing.cashbackBalance
              : Number(rawUser.cashbackBalance) || 0,
          isSubscribedVip: Boolean(existing.isSubscribedVip ?? rawUser.isSubscribedVip ?? false),
          vipExpiresAt: existing.vipExpiresAt ?? rawUser.vipExpiresAt ?? null,
          createdAt: existing.createdAt || rawUser.createdAt || Date.now()
        }
      : {
          ...rawUser,
          avatar: rawUser.avatar || "",
          telegramId: rawTelegramId || normalizedPhone || userKey,
          phoneNumber: normalizedPhone,
          isAdmin: false,
          vipTier: rawUser.vipTier || "NONE",
          totalSpent: Number(rawUser.totalSpent) || 0,
          cashbackBalance: Number(rawUser.cashbackBalance) || 0,
          isSubscribedVip: Boolean(rawUser.isSubscribedVip || false),
          vipExpiresAt: rawUser.vipExpiresAt || null,
          createdAt: rawUser.createdAt || Date.now()
        };

    if (existingDoc?._id) {
      await usersCol.updateOne(
        { _id: existingDoc._id },
        { $set: mergedUser }
      );
    } else {
      await usersCol.updateOne(
        { $or: [{ telegramId: mergedUser.telegramId }, { phoneNumber: mergedUser.phoneNumber }] },
        { $set: mergedUser },
        { upsert: true }
      );
    }

    const responseUser = {
      ...mergedUser,
      avatar: isLargeDataUri(mergedUser.avatar)
        ? `/api/media/user/${encodeURIComponent(mergedUser.telegramId)}/avatar`
        : mergedUser.avatar
    };

    res.json({ success: true, user: responseUser });
  } catch (e: any) {
    console.error("POST /users MongoDB error:", e.message);
    res.status(500).json({ error: "Server Error", message: e.message });
  }
});

// Cart persistence in MongoDB
router.post("/cart", async (req, res) => {
  try {
    const { userId, items } = req.body || {};
    if (!userId || !Array.isArray(items)) {
      return res.status(400).json({ error: "userId and items array required" });
    }

    const db = await requireDb();
    await db.collection("carts").updateOne(
      { userId },
      { $set: { userId, items, updatedAt: new Date().toISOString() } },
      { upsert: true }
    );
    res.json({ success: true, items });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Telegram notification proxy
router.post("/notify", async (req, res) => {
  const { message, chatId } = req.body;
  const token = process.env.TELEGRAM_TOKEN || "8543158894:AAHkaN83tLCgNrJ-Omutn744aTui784GScc";
  const targetChatId = chatId || "8215056224";
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: targetChatId, text: message, parse_mode: "Markdown" }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    const data = await response.json();
    res.json(data);
  } catch (e: any) {
    console.warn("Telegram notification skipped or failed:", e?.message);
    res.json({ success: false, skipped: true, error: e?.message });
  }
});

// Partnerships
router.post("/partnerships", async (req, res) => {
  try {
    const newRequest = {
      ...stripId(req.body || {}),
      id: `PART-${Date.now()}`,
      status: "pending",
      date: new Date().toISOString()
    };

    const db = await requireDb();
    await db.collection("partnerships").insertOne({ ...newRequest });
    res.json({ success: true, request: newRequest });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/partnerships/update", async (req, res) => {
  try {
    const db = await requireDb();
    const adminDevice = await verifyRequestAdminDevice(req, db);
    if (!adminDevice) {
      return res.status(403).json({ error: "Faqat ruxsat berilgan admin qurilmasi ushbu amalni bajara oladi" });
    }

    const { id, status } = req.body;
    const partCol = db.collection("partnerships");
    const existing = await partCol.findOne({ id });
    if (!existing) {
      return res.status(404).json({ error: "Request not found" });
    }

    await partCol.updateOne({ id }, { $set: { status } });

    if (status === "approved" && existing.status !== "approved") {
      const userId = existing.userId;
      const type = existing.type;
      const discount = type === "40" ? 0.4 : 0.55;
      const newPromos = [];
      for (let i = 0; i < 50; i++) {
        const code = Math.random().toString(36).substring(2, 8).toUpperCase();
        newPromos.push({
          id: `PROMO-${Date.now()}-${i}`,
          code,
          discount,
          ownerId: userId,
          isUsed: false,
          usedBy: null
        });
      }
      await db.collection("promoCodes").insertMany(newPromos);
    }

    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Wishlist toggle
router.post("/wishlist/toggle", async (req, res) => {
  try {
    const { userId, productId } = req.body;
    if (!userId || !productId) {
      return res.status(400).json({ error: "userId and productId required" });
    }

    const db = await requireDb();
    const wlCol = db.collection("wishlists");
    const doc = await wlCol.findOne({ userId });
    const items: string[] = Array.isArray(doc?.items) ? [...doc.items] : [];
    const index = items.indexOf(productId);
    if (index > -1) {
      items.splice(index, 1);
    } else {
      items.push(productId);
    }
    await wlCol.updateOne({ userId }, { $set: { userId, items } }, { upsert: true });
    res.json({ success: true, wishlist: items });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Support messages
router.post("/support", async (req, res) => {
  try {
    const newMessage = {
      ...stripId(req.body || {}),
      id: `MSG-${Date.now()}`,
      date: new Date().toISOString()
    };

    const db = await requireDb();
    await db.collection("supportMessages").insertOne({ ...newMessage });
    res.json({ success: true, message: newMessage });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Products CRUD
router.post("/products", async (req, res) => {
  try {
    const db = await requireDb();
    const adminDevice = await verifyRequestAdminDevice(req, db);
    if (!adminDevice) {
      return res.status(403).json({ error: "Faqat ruxsat berilgan admin qurilmasi mahsulot qo'shishi yoki tahrirlashi mumkin" });
    }

    const newProduct = stripId(req.body || {});
    if (!newProduct.id) {
      newProduct.id = `p-${Date.now()}`;
    }

    const existingProd = await db.collection("products").findOne({ id: newProduct.id });

    // Preserve existing MongoDB base64 images/videos if client sent back /api/media/... references
    if (existingProd && Array.isArray(newProduct.images)) {
      newProduct.images = newProduct.images.map((img: any) => {
        if (typeof img === "string" && img.startsWith("/api/media/product/")) {
          const idxStr = img.split("/").pop();
          const idx = Number(idxStr);
          if (!Number.isNaN(idx) && Array.isArray(existingProd.images) && existingProd.images[idx]) {
            return existingProd.images[idx];
          }
        }
        return img;
      });
    }
    if (existingProd && Array.isArray(newProduct.videos)) {
      newProduct.videos = newProduct.videos.map((vid: any) => {
        if (typeof vid === "string" && vid.startsWith("/api/media/product-video/")) {
          const idxStr = vid.split("/").pop();
          const idx = Number(idxStr);
          if (!Number.isNaN(idx) && Array.isArray(existingProd.videos) && existingProd.videos[idx]) {
            return existingProd.videos[idx];
          }
        }
        return vid;
      });
    }

    await db.collection("products").updateOne(
      { id: newProduct.id },
      { $set: newProduct },
      { upsert: true }
    );

    // Automatically sync attached product videos into productVideos collection
    if (Array.isArray(newProduct.videos) && newProduct.videos.length > 0) {
      const vidCol = db.collection("productVideos");
      for (const vidUrl of newProduct.videos) {
        if (typeof vidUrl === "string" && vidUrl.trim()) {
          const exists = await vidCol.findOne({ productId: newProduct.id, videoUrl: vidUrl });
          if (!exists) {
            await vidCol.insertOne({
              id: `vid-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              productId: newProduct.id,
              caption: `${newProduct.name} — rasmiy video sharh`,
              videoUrl: vidUrl,
              posterImage: Array.isArray(newProduct.images) ? newProduct.images[0] || "" : "",
              uploaderId: "8215056224",
              uploaderName: "YUYU Admin",
              uploaderRole: "admin",
              likes: [],
              comments: [],
              sharesCount: 0,
              createdAt: Date.now()
            });
          }
        }
      }
    }

    const responseProduct = {
      ...newProduct,
      images: Array.isArray(newProduct.images)
        ? newProduct.images.map((img: any, idx: number) =>
            isLargeDataUri(img) ? `/api/media/product/${encodeURIComponent(newProduct.id)}/${idx}` : img
          )
        : [],
      videos: Array.isArray(newProduct.videos)
        ? newProduct.videos.map((vid: any, idx: number) =>
            isLargeDataUri(vid) ? `/api/media/product-video/${encodeURIComponent(newProduct.id)}/${idx}` : vid
          )
        : newProduct.videos
    };

    res.json({ success: true, product: responseProduct });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.delete("/products/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const db = await requireDb();
    const adminDevice = await verifyRequestAdminDevice(req, db);
    if (!adminDevice) {
      return res.status(403).json({ error: "Faqat ruxsat berilgan admin qurilmasi mahsulotni o'chira oladi" });
    }
    await db.collection("products").deleteOne({ id });
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Banners (preserves existing base64 images when client sends /api/media/banner/:id URLs)
router.post("/banners", async (req, res) => {
  try {
    const db = await requireDb();
    const adminDevice = await verifyRequestAdminDevice(req, db);
    if (!adminDevice) {
      return res.status(403).json({ error: "Faqat ruxsat berilgan admin qurilmasi bannerlarni o'zgartira oladi" });
    }

    const rawBanners = Array.isArray(req.body) ? req.body.map((b: any) => stripId(b)) : [];
    const col = db.collection("banners");
    const existingBanners = await col.find({}, { projection: { _id: 0 } }).toArray();
    const existingById = new Map<string, any>();
    for (const b of existingBanners) {
      if (b?.id) existingById.set(String(b.id), b);
    }

    const bannersList = rawBanners.map((b: any) => {
      const id = String(b.id || `ban-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`);
      let image = b.image;
      if (typeof image === "string" && image.startsWith("/api/media/banner/")) {
        const refId = decodeURIComponent(image.slice("/api/media/banner/".length));
        const prev = existingById.get(refId) || existingById.get(id);
        if (prev?.image) {
          image = prev.image;
        }
      }
      return { ...b, id, image };
    });

    await col.deleteMany({});
    if (bannersList.length > 0) {
      await col.insertMany(bannersList);
    }

    const responseBanners = bannersList.map((b: any) => ({
      ...b,
      image: isLargeDataUri(b.image) ? `/api/media/banner/${encodeURIComponent(b.id)}` : b.image
    }));
    res.json({ success: true, banners: responseBanners });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Promo code usage (RegEx-safe + atomic single-use lock to prevent double-claim)
router.post("/promo/use", async (req, res) => {
  try {
    const rawCode = String(req.body?.code || "").trim();
    if (!rawCode) return res.status(400).json({ error: "Code required" });

    const escapedCode = rawCode.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const db = await requireDb();
    const promoCol = db.collection("promoCodes");
    const promo = await promoCol.findOneAndUpdate(
      { code: { $regex: `^${escapedCode}$`, $options: "i" }, isUsed: { $ne: true } },
      { $set: { isUsed: true, usedAt: new Date().toISOString() } },
      { returnDocument: "before" }
    );
    if (!promo) {
      return res.status(409).json({ error: "Promo-kod topilmadi yoki allaqachon ishlatilgan" });
    }
    if (promo.ownerId) {
      await db.collection("users").updateOne(
        { $or: [{ telegramId: promo.ownerId }, { phoneNumber: promo.ownerId }] },
        { $inc: { referralBalance: 20000 } }
      );
    }
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Orders CRUD (with idempotent checkout cashback deduction)
router.post("/orders", async (req, res) => {
  try {
    const rawOrder = stripId(req.body || {});
    const requestedCashback = Math.max(0, Math.round(Number(rawOrder.cashbackUsed) || 0));
    const db = await requireDb();
    const ordersCol = db.collection("orders");
    const orderId = rawOrder.id || `YUYU-${Date.now().toString().slice(-6)}`;

    // Prevent double cashback deduction if the same order ID is retried
    const existingOrder = await ordersCol.findOne({ id: orderId });
    if (existingOrder) {
      const safeExisting = stripId(existingOrder);
      return res.json({
        success: true,
        order: {
          ...safeExisting,
          receiptImage: isLargeDataUri(safeExisting.receiptImage)
            ? `/api/media/order/${encodeURIComponent(safeExisting.id)}/receipt`
            : safeExisting.receiptImage
        }
      });
    }

    let appliedCashback = 0;
    if (requestedCashback > 0 && rawOrder.userId) {
      const user = await db.collection("users").findOne({
        $or: [{ telegramId: rawOrder.userId }, { phoneNumber: rawOrder.userId }]
      });
      if (user) {
        const available = Math.max(0, Number(user.cashbackBalance) || 0);
        appliedCashback = Math.min(available, requestedCashback);
        if (appliedCashback > 0) {
          await db.collection("users").updateOne(
            { _id: user._id },
            { $set: { cashbackBalance: Math.max(0, available - appliedCashback) } }
          );
        }
      }
    }

    const newOrder: Record<string, any> = {
      ...rawOrder,
      id: orderId,
      timestamp: rawOrder.timestamp || Date.now(),
      cashbackUsed: appliedCashback,
      cashbackEarned: 0,
      vipRewardApplied: false
    };

    const affAttribution = await applyAffiliateOnOrderCreate(db, {
      orderId,
      buyerUserId: String(rawOrder.userId || ""),
      buyerName: String(rawOrder.username || "Mijoz"),
      productName: String(rawOrder.productName || "Mahsulot"),
      orderAmount: Number(rawOrder.price) || 0,
      referredByCode: rawOrder.referredBy
    });
    if (affAttribution.referredBy) {
      newOrder.referredBy = affAttribution.referredBy;
      newOrder.referredAffiliateId = affAttribution.referredAffiliateId;
      newOrder.affiliateCommissionAmount = affAttribution.affiliateCommissionAmount;
    }

    await ordersCol.insertOne({ ...newOrder });
    const responseOrder = {
      ...newOrder,
      receiptImage: isLargeDataUri(newOrder.receiptImage)
        ? `/api/media/order/${encodeURIComponent(newOrder.id)}/receipt`
        : newOrder.receiptImage
    };
    res.json({ success: true, order: responseOrder });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Order status update + Automatic VIP Tier Upgrade & Cashback Hook on 'delivered'
router.post("/orders/update", async (req, res) => {
  try {
    const db = await requireDb();
    const adminDevice = await verifyRequestAdminDevice(req, db);
    if (!adminDevice) {
      return res.status(403).json({ error: "Faqat ruxsat berilgan admin qurilmasi buyurtma holatini o'zgartira oladi" });
    }

    const { id, status, trackNumber } = req.body;
    const ordersCol = db.collection("orders");
    const existingOrder = await ordersCol.findOne({ id });
    if (!existingOrder) {
      return res.status(404).json({ error: "Order not found" });
    }

    const updateFields: Record<string, any> = { status };
    if (trackNumber !== undefined) {
      updateFields.trackNumber = trackNumber;
    }

    let updatedUser: any = null;

    // Order Completion Hook: credit totalSpent, calculate cashback, and auto-upgrade vipTier
    if (status === "delivered" && !existingOrder.vipRewardApplied && existingOrder.userId) {
      const usersCol = db.collection("users");
      const user = await usersCol.findOne({
        $or: [{ telegramId: existingOrder.userId }, { phoneNumber: existingOrder.userId }]
      });

      if (user) {
        const orderAmount = Math.max(0, Number(existingOrder.price) || 0);
        const newTotalSpent = (Number(user.totalSpent) || 0) + orderAmount;
        const currentTier: ServerVipTier = SERVER_VIP_ORDER.includes(user.vipTier) ? user.vipTier : "NONE";
        const spentTier = getTierFromSpentServer(newTotalSpent);
        const subTier: ServerVipTier = isServerSubActive(user) ? "GOLD" : "NONE";
        const upgradedTier = maxServerTier(maxServerTier(currentTier, spentTier), subTier);

        const cashbackRate = SERVER_VIP_CASHBACK[upgradedTier];
        const cashbackEarned = Math.round(orderAmount * cashbackRate);
        const newCashbackBalance = (Number(user.cashbackBalance) || 0) + cashbackEarned;

        updatedUser = await usersCol.findOneAndUpdate(
          { $or: [{ telegramId: existingOrder.userId }, { phoneNumber: existingOrder.userId }] },
          {
            $set: {
              totalSpent: newTotalSpent,
              vipTier: upgradedTier,
              cashbackBalance: newCashbackBalance
            }
          },
          { returnDocument: "after", projection: { _id: 0 } }
        );

        updateFields.vipRewardApplied = true;
        updateFields.cashbackEarned = cashbackEarned;

        if (cashbackEarned > 0) {
          await db.collection("vipSettings").updateOne(
            { id: "default" },
            {
              $inc: { totalCashbackDistributed: cashbackEarned },
              $setOnInsert: {
                id: "default",
                monthlyPrice: 39000,
                silverThreshold: 500000,
                goldThreshold: 2000000,
                diamondThreshold: 5000000,
                silverCashback: 0.03,
                goldCashback: 0.05,
                diamondCashback: 0.1
              }
            },
            { upsert: true }
          );
        }
      }
    }

    const result = await ordersCol.findOneAndUpdate(
      { id },
      { $set: updateFields },
      { returnDocument: "after", projection: { _id: 0 } }
    );

    if (status === "delivered") {
      await applyAffiliateOnOrderDelivered(db, id);
    } else if (status === "cancelled") {
      await applyAffiliateOnOrderCancelled(db, id);
    }

    res.json({ success: true, order: result, updatedUser });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// --- VIP & LOYALTY API ROUTES ---

// GET /api/vip/status — returns current user's tier, progress, cashback, and benefits
router.get("/vip/status", async (req, res) => {
  try {
    const userId = String(req.query.userId || "").trim();
    if (!userId) {
      return res.status(400).json({ error: "userId query parameter required" });
    }
    const db = await requireDb();
    const user = await db.collection("users").findOne(
      { $or: [{ telegramId: userId }, { phoneNumber: userId }] },
      { projection: { _id: 0 } }
    );
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json({ success: true, status: computeServerVipPayload(user), user });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/vip/subscribe — handles monthly VIP subscription payment/activation
router.post("/vip/subscribe", async (req, res) => {
  try {
    const { userId, username, receiptImage, months = 1 } = req.body || {};
    if (!userId) {
      return res.status(400).json({ error: "userId required" });
    }
    const db = await requireDb();
    const usersCol = db.collection("users");
    const user = await usersCol.findOne({
      $or: [{ telegramId: userId }, { phoneNumber: userId }]
    });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const numMonths = Math.max(1, Math.min(12, Number(months) || 1));
    const currentExpiry =
      user.vipExpiresAt && new Date(user.vipExpiresAt).getTime() > Date.now()
        ? new Date(user.vipExpiresAt).getTime()
        : Date.now();
    const newExpiryIso = new Date(currentExpiry + numMonths * 30 * 24 * 60 * 60 * 1000).toISOString();

    const currentTier: ServerVipTier = SERVER_VIP_ORDER.includes(user.vipTier) ? user.vipTier : "NONE";
    const newTier = maxServerTier(currentTier, "GOLD");

    const updatedUser = await usersCol.findOneAndUpdate(
      { $or: [{ telegramId: userId }, { phoneNumber: userId }] },
      {
        $set: {
          isSubscribedVip: true,
          vipExpiresAt: newExpiryIso,
          vipTier: newTier
        }
      },
      { returnDocument: "after", projection: { _id: 0 } }
    );

    const subRecord = {
      id: `VIP-${Date.now()}`,
      userId,
      username: username || user.username,
      phoneNumber: user.phoneNumber || userId,
      amount: 39000 * numMonths,
      months: numMonths,
      receiptImage: receiptImage || null,
      status: "active",
      expiresAt: newExpiryIso,
      createdAt: Date.now()
    };
    await db.collection("vipRequests").insertOne({ ...subRecord });

    res.json({
      success: true,
      user: updatedUser,
      subscription: subRecord,
      status: computeServerVipPayload(updatedUser)
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// PATCH /api/admin/vip/user — admin-only route to manually update a user's VIP tier, subscription, or cashback
router.patch("/admin/vip/user", async (req, res) => {
  try {
    const {
      adminId,
      targetUserId,
      vipTier,
      isSubscribedVip,
      vipExpiresAt,
      cashbackBalance,
      cashbackDelta,
      totalSpent
    } = req.body || {};

    if (!adminId || !targetUserId) {
      return res.status(400).json({ error: "adminId and targetUserId required" });
    }

    const db = await requireDb();
    const usersCol = db.collection("users");

    // Verify caller is an admin
    const adminUser = await usersCol.findOne({
      $or: [{ telegramId: adminId }, { phoneNumber: adminId }],
      isAdmin: true
    });
    if (!adminUser) {
      return res.status(403).json({ error: "Faqat administratorlar uchun ruxsat etilgan" });
    }

    const target = await usersCol.findOne({
      $or: [{ telegramId: targetUserId }, { phoneNumber: targetUserId }]
    });
    if (!target) {
      return res.status(404).json({ error: "Foydalanuvchi topilmadi" });
    }

    const updateSet: Record<string, any> = {};
    if (vipTier && SERVER_VIP_ORDER.includes(vipTier)) {
      updateSet.vipTier = vipTier;
    }
    if (typeof isSubscribedVip === "boolean") {
      updateSet.isSubscribedVip = isSubscribedVip;
      if (isSubscribedVip && !vipExpiresAt && !target.vipExpiresAt) {
        updateSet.vipExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      }
      if (!isSubscribedVip) {
        updateSet.vipExpiresAt = null;
      }
    }
    if (vipExpiresAt !== undefined) {
      updateSet.vipExpiresAt = vipExpiresAt || null;
    }
    if (typeof cashbackBalance === "number" && !Number.isNaN(cashbackBalance)) {
      updateSet.cashbackBalance = Math.max(0, Math.round(cashbackBalance));
    } else if (typeof cashbackDelta === "number" && !Number.isNaN(cashbackDelta) && cashbackDelta !== 0) {
      const nextBalance = Math.max(0, Math.round((Number(target.cashbackBalance) || 0) + cashbackDelta));
      updateSet.cashbackBalance = nextBalance;
      if (cashbackDelta > 0) {
        await db.collection("vipSettings").updateOne(
          { id: "default" },
          { $inc: { totalCashbackDistributed: Math.round(cashbackDelta) } },
          { upsert: true }
        );
      }
    }
    if (typeof totalSpent === "number" && !Number.isNaN(totalSpent)) {
      updateSet.totalSpent = Math.max(0, Math.round(totalSpent));
    }

    const updatedUser = await usersCol.findOneAndUpdate(
      { $or: [{ telegramId: targetUserId }, { phoneNumber: targetUserId }] },
      { $set: updateSet },
      { returnDocument: "after", projection: { _id: 0 } }
    );

    res.json({ success: true, user: updatedUser });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/admin/vip/overview — VIP analytics & subscription overview
router.get("/admin/vip/overview", async (req, res) => {
  try {
    const db = await requireDb();
    const [users, vipSettings, vipRequests, orders] = await Promise.all([
      db.collection("users").find({}, { projection: { _id: 0 } }).toArray(),
      db.collection("vipSettings").findOne({ id: "default" }, { projection: { _id: 0 } }),
      db.collection("vipRequests").find({}, { projection: { _id: 0 } }).sort({ createdAt: -1 }).toArray(),
      db.collection("orders").find({}, { projection: { _id: 0 } }).toArray()
    ]);

    const tierCounts = { NONE: 0, SILVER: 0, GOLD: 0, DIAMOND: 0 };
    let subscribedCount = 0;
    let currentCashbackPool = 0;

    for (const u of users) {
      const info = computeServerVipPayload(u);
      tierCounts[info.vipTier]++;
      if (info.isSubscribedVip) subscribedCount++;
      currentCashbackPool += info.cashbackBalance;
    }

    const orderCashbackSum = orders.reduce((acc: number, o: any) => acc + (Number(o.cashbackEarned) || 0), 0);
    const totalCashbackDistributed = Math.max(
      Number(vipSettings?.totalCashbackDistributed) || 0,
      orderCashbackSum,
      currentCashbackPool
    );

    res.json({
      success: true,
      stats: {
        totalVipUsers: tierCounts.SILVER + tierCounts.GOLD + tierCounts.DIAMOND,
        tierCounts,
        subscribedCount,
        totalCashbackDistributed,
        currentCashbackPool
      },
      vipRequests
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.delete("/orders/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const db = await requireDb();
    const adminDevice = await verifyRequestAdminDevice(req, db);
    if (!adminDevice) {
      return res.status(403).json({ error: "Faqat ruxsat berilgan admin qurilmasi buyurtmani o'chira oladi" });
    }
    await applyAffiliateOnOrderCancelled(db, id);
    await db.collection("orders").deleteOne({ id });
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Referral bonus
router.post("/referral/add", async (req, res) => {
  try {
    const { referrerId, amount } = req.body;
    const db = await requireDb();
    const result = await db.collection("users").findOneAndUpdate(
      { $or: [{ telegramId: referrerId }, { phoneNumber: referrerId }] },
      { $inc: { referralBalance: Number(amount) || 0, invitedCount: 1 } },
      { returnDocument: "after", projection: { _id: 0 } }
    );
    if (!result) {
      return res.status(404).json({ error: "Referrer not found" });
    }
    res.json({ success: true, user: result });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Product Reviews
router.post("/products/:id/reviews", async (req, res) => {
  try {
    const { id } = req.params;
    const review = {
      ...stripId(req.body || {}),
      id: `REV-${Date.now()}`,
      date: new Date().toISOString().split("T")[0]
    };

    const db = await requireDb();
    const prodCol = db.collection("products");
    const product = await prodCol.findOne({ id });
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }
    const reviews = [review, ...(Array.isArray(product.reviews) ? product.reviews : [])];
    const avgRating = reviews.reduce((acc: number, r: any) => acc + (Number(r.rating) || 5), 0) / reviews.length;
    const newRating = Number(avgRating.toFixed(1));

    await prodCol.updateOne({ id }, { $set: { reviews, rating: newRating } });
    res.json({ success: true, review });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// --- SHOPPABLE PRODUCT VIDEO REELS API ---

// GET /api/videos — list all product videos sorted newest first
router.get("/videos", async (req, res) => {
  try {
    const db = await requireDb();
    const videos = await db
      .collection("productVideos")
      .find({}, { projection: { _id: 0 } })
      .sort({ createdAt: -1 })
      .toArray();
    res.json({ success: true, videos });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/videos — create a new shoppable product video (admin only)
router.post("/videos", async (req, res) => {
  try {
    const {
      productId,
      caption,
      videoUrl,
      posterImage,
      uploaderId,
      uploaderName
    } = req.body || {};

    if (!productId || !uploaderId) {
      return res.status(400).json({ error: "Mahsulot va foydalanuvchi ma'lumotlari talab qilinadi" });
    }
    if (!videoUrl && !posterImage) {
      return res.status(400).json({ error: "Video fayl yoki video havolasini kiriting" });
    }

    const db = await requireDb();
    const userDoc = await db.collection("users").findOne(
      { $or: [{ telegramId: String(uploaderId) }, { phoneNumber: String(uploaderId) }] },
      { projection: { _id: 0 } }
    );
    if (!userDoc?.isAdmin) {
      return res.status(403).json({ error: "Faqat administrator yangi video yuklashi mumkin" });
    }

    const product = await db.collection("products").findOne({ id: productId }, { projection: { _id: 0 } });
    if (!product) {
      return res.status(404).json({ error: "Tanlangan mahsulot topilmadi" });
    }

    const newVideo = {
      id: `vid-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      productId,
      caption: String(caption || "").trim() || `${product.name} — video sharh`,
      videoUrl: String(videoUrl || "").trim(),
      posterImage: String(posterImage || "").trim() || (Array.isArray(product.images) ? product.images[0] || "" : ""),
      uploaderId: String(uploaderId),
      uploaderName: String(uploaderName || userDoc.username || "Admin").trim(),
      uploaderRole: "admin",
      likes: [] as string[],
      comments: [] as any[],
      sharesCount: 0,
      createdAt: Date.now()
    };

    await db.collection("productVideos").insertOne({ ...newVideo });
    const responseVideo = {
      ...newVideo,
      videoUrl: isLargeDataUri(newVideo.videoUrl)
        ? `/api/media/video/${encodeURIComponent(newVideo.id)}/stream`
        : newVideo.videoUrl,
      posterImage: isLargeDataUri(newVideo.posterImage)
        ? `/api/media/video/${encodeURIComponent(newVideo.id)}/poster`
        : newVideo.posterImage
    };
    res.json({ success: true, video: responseVideo });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/videos/:id/like — toggle like for a user
router.post("/videos/:id/like", async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body || {};
    if (!userId) {
      return res.status(400).json({ error: "userId talab qilinadi" });
    }

    const db = await requireDb();
    const col = db.collection("productVideos");
    const existing = await col.findOne({ id });
    if (!existing) {
      return res.status(404).json({ error: "Video topilmadi" });
    }

    const likes: string[] = Array.isArray(existing.likes) ? existing.likes : [];
    const alreadyLiked = likes.includes(userId);

    const updated = await col.findOneAndUpdate(
      { id },
      alreadyLiked ? { $pull: { likes: userId } as any } : { $addToSet: { likes: userId } },
      { returnDocument: "after", projection: { _id: 0 } }
    );

    res.json({ success: true, liked: !alreadyLiked, video: updated });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/videos/:id/comment — add a new comment
router.post("/videos/:id/comment", async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, username, userAvatar, text } = req.body || {};
    const cleanText = String(text || "").trim();
    if (!userId || !cleanText) {
      return res.status(400).json({ error: "Izoh matnini kiriting" });
    }

    const db = await requireDb();
    const col = db.collection("productVideos");
    const existing = await col.findOne({ id });
    if (!existing) {
      return res.status(404).json({ error: "Video topilmadi" });
    }

    const comment = {
      id: `vc-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      userId: String(userId),
      username: String(username || "Mijoz").trim(),
      userAvatar: userAvatar || "",
      text: cleanText.slice(0, 400),
      createdAt: Date.now()
    };

    const updated = await col.findOneAndUpdate(
      { id },
      { $push: { comments: comment } as any },
      { returnDocument: "after", projection: { _id: 0 } }
    );

    res.json({ success: true, comment, video: updated });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/videos/:id/share — increment share counter
router.post("/videos/:id/share", async (req, res) => {
  try {
    const { id } = req.params;
    const db = await requireDb();
    const updated = await db.collection("productVideos").findOneAndUpdate(
      { id },
      { $inc: { sharesCount: 1 } },
      { returnDocument: "after", projection: { _id: 0 } }
    );
    if (!updated) {
      return res.status(404).json({ error: "Video topilmadi" });
    }
    res.json({ success: true, video: updated });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /api/videos/:id — delete video (admin only)
router.delete("/videos/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const requesterId = String(req.query.userId || req.body?.userId || "").trim();
    if (!requesterId) {
      return res.status(403).json({ error: "Faqat administrator videoni o'chirishi mumkin" });
    }

    const db = await requireDb();
    const adminUser = await db.collection("users").findOne({
      $or: [{ telegramId: requesterId }, { phoneNumber: requesterId }],
      isAdmin: true
    });
    if (!adminUser) {
      return res.status(403).json({ error: "Faqat administrator videoni o'chirishi mumkin" });
    }

    const col = db.collection("productVideos");
    const existing = await col.findOne({ id });
    if (!existing) {
      return res.status(404).json({ error: "Video topilmadi" });
    }

    await col.deleteOne({ id });
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// --- CUSTOM PRODUCT REQUESTS ("Rasm tashla — topib beramiz") API ---

const ALLOWED_CUSTOM_STATUSES = ["PENDING", "PRICED", "ACCEPTED", "REJECTED", "COMPLETED"];

// POST /api/custom-requests — create a new photo sourcing request
router.post("/custom-requests", async (req, res) => {
  try {
    const {
      userId,
      username,
      phoneNumber,
      imageUrl,
      productLink,
      description
    } = req.body || {};

    if (!userId || !String(phoneNumber || "").trim()) {
      return res.status(400).json({ error: "Foydalanuvchi va telefon raqami talab qilinadi" });
    }
    if (!imageUrl || typeof imageUrl !== "string" || !imageUrl.trim()) {
      return res.status(400).json({ error: "Mahsulot rasmini yuklash majburiy" });
    }

    const db = await requireDb();
    const nowIso = new Date().toISOString();
    const newReq = {
      id: `REQ-${Date.now().toString().slice(-6)}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`,
      userId: String(userId).trim(),
      username: String(username || "Mijoz").trim(),
      phoneNumber: String(phoneNumber).trim(),
      imageUrl: imageUrl.trim(),
      productLink: String(productLink || "").trim(),
      description: String(description || "").trim().slice(0, 1000),
      status: "PENDING",
      adminQuote: null,
      createdAt: nowIso,
      updatedAt: nowIso
    };

    await db.collection("customRequests").insertOne({ ...newReq });
    res.json({ success: true, request: newReq });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/custom-requests/my — returns logged-in user's photo requests
router.get("/custom-requests/my", async (req, res) => {
  try {
    const userId = String(req.query.userId || "").trim();
    const phoneParam = String(req.query.phoneNumber || "").trim();
    if (!userId && !phoneParam) {
      return res.status(400).json({ error: "userId query parametri talab qilinadi" });
    }
    const db = await requireDb();
    const matchClauses: any[] = [];
    if (userId) {
      matchClauses.push({ userId }, { phoneNumber: userId });
    }
    if (phoneParam) {
      const variants = buildPhoneMatchVariants(phoneParam);
      matchClauses.push({ phoneNumber: { $in: variants } }, { userId: { $in: variants } });
    }
    const rawRequests = await db
      .collection("customRequests")
      .find(
        { $or: matchClauses },
        { projection: { _id: 0 } }
      )
      .sort({ createdAt: -1 })
      .toArray();
    const requests = rawRequests.map((r: any) => ({
      ...r,
      imageUrl: isLargeDataUri(r.imageUrl)
        ? `/api/media/custom-request/${encodeURIComponent(r.id)}`
        : r.imageUrl
    }));
    res.json({ success: true, requests });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// PATCH /api/custom-requests/:id/respond — allows user to ACCEPT or REJECT an admin quote
router.patch("/custom-requests/:id/respond", async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, action, orderId } = req.body || {};
    if (!userId || (action !== "ACCEPT" && action !== "REJECT")) {
      return res.status(400).json({ error: "userId va action (ACCEPT yoki REJECT) talab qilinadi" });
    }

    const db = await requireDb();
    const col = db.collection("customRequests");
    const existing = await col.findOne({ id });
    if (!existing) {
      return res.status(404).json({ error: "So'rov topilmadi" });
    }
    if (existing.userId !== userId && existing.phoneNumber !== userId) {
      return res.status(403).json({ error: "Bu so'rovni boshqarish huquqingiz yo'q" });
    }
    if (action === "ACCEPT" && existing.status !== "PRICED") {
      return res.status(400).json({ error: "Faqat narx belgilangan so'rovlarni qabul qilish mumkin" });
    }

    const nextStatus = action === "ACCEPT" ? "ACCEPTED" : "REJECTED";
    const updateFields: Record<string, any> = {
      status: nextStatus,
      updatedAt: new Date().toISOString()
    };
    if (orderId) {
      updateFields.orderId = String(orderId);
    }

    const updated = await col.findOneAndUpdate(
      { id },
      { $set: updateFields },
      { returnDocument: "after", projection: { _id: 0 } }
    );
    res.json({ success: true, request: updated });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/admin/custom-requests — admin-only route to list all requests with optional status filter
router.get("/admin/custom-requests", async (req, res) => {
  try {
    const adminId = String(req.query.adminId || "").trim();
    const statusFilter = String(req.query.status || "").trim().toUpperCase();
    if (!adminId) {
      return res.status(400).json({ error: "adminId talab qilinadi" });
    }

    const db = await requireDb();
    const adminUser = await db.collection("users").findOne({
      $or: [{ telegramId: adminId }, { phoneNumber: adminId }],
      isAdmin: true
    });
    if (!adminUser) {
      return res.status(403).json({ error: "Faqat administratorlar uchun ruxsat etilgan" });
    }

    const query: Record<string, any> = {};
    if (statusFilter && ALLOWED_CUSTOM_STATUSES.includes(statusFilter)) {
      query.status = statusFilter;
    }

    const [requests, pendingCount] = await Promise.all([
      db.collection("customRequests").find(query, { projection: { _id: 0 } }).sort({ createdAt: -1 }).toArray(),
      db.collection("customRequests").countDocuments({ status: "PENDING" })
    ]);

    res.json({ success: true, requests, pendingCount });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// PATCH /api/admin/custom-requests/:id — admin-only route to quote price or reject/complete request
router.patch("/admin/custom-requests/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { adminId, status, price, deliveryDays, adminNote } = req.body || {};

    if (!adminId) {
      return res.status(400).json({ error: "adminId talab qilinadi" });
    }

    const db = await requireDb();
    const adminUser = await db.collection("users").findOne({
      $or: [{ telegramId: adminId }, { phoneNumber: adminId }],
      isAdmin: true
    });
    if (!adminUser) {
      return res.status(403).json({ error: "Faqat administratorlar uchun ruxsat etilgan" });
    }

    const col = db.collection("customRequests");
    const existing = await col.findOne({ id });
    if (!existing) {
      return res.status(404).json({ error: "So'rov topilmadi" });
    }

    const resolvedStatus = String(status || "PRICED").toUpperCase();
    if (!ALLOWED_CUSTOM_STATUSES.includes(resolvedStatus)) {
      return res.status(400).json({ error: "Noto'g'ri holat (status)" });
    }

    const nowIso = new Date().toISOString();
    const updateSet: Record<string, any> = {
      status: resolvedStatus,
      updatedAt: nowIso
    };

    if (resolvedStatus === "PRICED") {
      const numericPrice = Math.round(Number(price) || 0);
      if (numericPrice <= 0) {
        return res.status(400).json({ error: "Iltimos, to'g'ri narx (so'mda) kiriting" });
      }
      updateSet.adminQuote = {
        price: numericPrice,
        deliveryDays: String(deliveryDays || "10-14 kun").trim(),
        adminNote: String(adminNote || "").trim().slice(0, 600),
        quotedAt: nowIso
      };
    } else if (resolvedStatus === "REJECTED" && adminNote) {
      updateSet.adminQuote = {
        price: existing.adminQuote?.price || 0,
        deliveryDays: existing.adminQuote?.deliveryDays || "",
        adminNote: String(adminNote).trim().slice(0, 600),
        quotedAt: nowIso
      };
    }

    const updated = await col.findOneAndUpdate(
      { id },
      { $set: updateSet },
      { returnDocument: "after", projection: { _id: 0 } }
    );

    res.json({ success: true, request: updated });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// --- AUTHENTICATION & DEVICE-AUTHORIZED ADMIN ACCESS API ---

function hashDeviceToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function summarizeUserAgent(uaRaw: string | undefined): string {
  const ua = String(uaRaw || "");
  let os = "Kompyuter";
  if (/Windows/i.test(ua)) os = "Windows";
  else if (/Macintosh|Mac OS/i.test(ua)) os = "macOS";
  else if (/iPhone/i.test(ua)) os = "iPhone";
  else if (/iPad/i.test(ua)) os = "iPad";
  else if (/Android/i.test(ua)) os = "Android";
  else if (/Linux/i.test(ua)) os = "Linux";

  let browser = "Brauzer";
  if (/Edg\//i.test(ua)) browser = "Edge";
  else if (/OPR\/|Opera/i.test(ua)) browser = "Opera";
  else if (/Chrome\//i.test(ua)) browser = "Chrome";
  else if (/Safari\//i.test(ua)) browser = "Safari";
  else if (/Firefox\//i.test(ua)) browser = "Firefox";

  return `${os} · ${browser}`;
}

function normalizePhoneForStorage(raw: string): string {
  const trimmed = String(raw || "").trim();
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length === 9) return `+998${digits}`;
  if (digits.length === 12 && digits.startsWith("998")) return `+${digits}`;
  return trimmed;
}

function buildPhoneMatchVariants(raw: string): string[] {
  const trimmed = String(raw || "").trim();
  const digits = trimmed.replace(/\D/g, "");
  const set = new Set<string>();
  if (trimmed) set.add(trimmed);
  if (digits) set.add(digits);
  if (digits.length === 9) {
    set.add(`+998${digits}`);
    set.add(`998${digits}`);
    set.add(`+998 ${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5, 7)} ${digits.slice(7, 9)}`);
  } else if (digits.length === 12 && digits.startsWith("998")) {
    const local = digits.slice(3);
    set.add(`+${digits}`);
    set.add(local);
    set.add(`+998 ${local.slice(0, 2)} ${local.slice(2, 5)} ${local.slice(5, 7)} ${local.slice(7, 9)}`);
  }
  return Array.from(set);
}

async function getAdminSecurityPassword(db: Db): Promise<string> {
  const cfg = await db.collection("adminSecurityConfig").findOne({ id: "default" });
  if (cfg?.adminPassword && typeof cfg.adminPassword === "string") {
    return cfg.adminPassword;
  }
  return (process.env.ADMIN_SECRET_CODE || "2011").trim();
}

async function findActiveAdminDevice(db: Db, deviceToken: string) {
  if (!deviceToken || typeof deviceToken !== "string") return null;
  const tokenHash = hashDeviceToken(deviceToken.trim());
  return db.collection("adminDevices").findOne({ tokenHash, revokedAt: null });
}

async function verifyRequestAdminDevice(req: express.Request, db: Db) {
  const headerToken = String(req.headers["x-admin-device-token"] || "").trim();
  if (!headerToken) return null;
  return findActiveAdminDevice(db, headerToken);
}

async function verifyAdminCaller(db: Db, adminId: string): Promise<boolean> {
  if (!adminId) return false;
  const variants = buildPhoneMatchVariants(adminId);
  const doc = await db.collection("users").findOne({
    $or: [{ telegramId: { $in: variants } }, { phoneNumber: { $in: variants } }],
    isAdmin: true
  });
  return Boolean(doc);
}

function sanitizeDeviceForClient(doc: any) {
  return {
    id: doc.id,
    label: doc.label,
    userAgentSummary: doc.userAgentSummary || "Brauzer",
    role: doc.role === "owner" ? "owner" : "invited",
    createdAt: doc.createdAt,
    lastUsedAt: doc.lastUsedAt,
    revokedAt: doc.revokedAt || null
  };
}

// POST /api/auth/login — returning client login by phone number
router.post("/auth/login", async (req, res) => {
  try {
    const { phoneNumber, deviceToken } = req.body || {};
    const variants = buildPhoneMatchVariants(phoneNumber);
    if (variants.length === 0) {
      return res.status(400).json({ error: "Telefon raqamingizni kiriting" });
    }

    const db = await requireDb();
    const existing = await db.collection("users").findOne(
      { $or: [{ phoneNumber: { $in: variants } }, { telegramId: { $in: variants } }] },
      { projection: { _id: 0 } }
    );

    if (!existing) {
      return res.status(404).json({
        error: "Bu telefon raqami hali ro'yxatdan o'tmagan",
        code: "USER_NOT_FOUND"
      });
    }

    if (existing.isAdmin) {
      const activeDev = await findActiveAdminDevice(db, String(deviceToken || ""));
      if (!activeDev) {
        return res.status(403).json({
          error: "Bu hisobga faqat ruxsat berilgan qurilmadan Admin Panel orqali kirish mumkin",
          code: "ADMIN_DEVICE_REQUIRED"
        });
      }
    }

    res.json({ success: true, user: existing });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/auth/register — new client registration (strictly non-admin)
router.post("/auth/register", async (req, res) => {
  try {
    const { username, phoneNumber, city } = req.body || {};
    const cleanName = String(username || "").trim();
    const normalizedPhone = normalizePhoneForStorage(phoneNumber);
    const digits = normalizedPhone.replace(/\D/g, "");

    if (cleanName.length < 2) {
      return res.status(400).json({ error: "Iltimos, ismingizni to'liq kiriting (kamida 2 ta harf)" });
    }
    if (digits.length < 9) {
      return res.status(400).json({ error: "Telefon raqamini to'liq kiriting" });
    }

    const db = await requireDb();
    const variants = buildPhoneMatchVariants(normalizedPhone);
    const existing = await db.collection("users").findOne(
      { $or: [{ phoneNumber: { $in: variants } }, { telegramId: { $in: variants } }] },
      { projection: { _id: 0 } }
    );

    if (existing) {
      return res.status(409).json({
        error: "Bu telefon raqami allaqachon ro'yxatdan o'tgan. Kirish bo'limidan foydalaning.",
        code: "USER_EXISTS",
        existingUsername: existing.username
      });
    }

    const cleanCity = String(city || "").trim();
    const newUser = {
      username: cleanName,
      telegramId: normalizedPhone,
      phoneNumber: normalizedPhone,
      city: cleanCity || undefined,
      isAdmin: false,
      avatar: "",
      bio: cleanCity ? `${cleanCity} · YUYU Shop xaridori` : "YUYU Shop xaridori",
      referralBalance: 0,
      invitedCount: 0,
      vipTier: "NONE",
      totalSpent: 0,
      cashbackBalance: 0,
      isSubscribedVip: false,
      vipExpiresAt: null,
      createdAt: Date.now()
    };

    await db.collection("users").insertOne({ ...newUser });
    res.json({ success: true, user: newUser });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/admin-access/verify-device — check if browser deviceToken is authorized in MongoDB
router.post("/admin-access/verify-device", async (req, res) => {
  try {
    const { deviceToken } = req.body || {};
    if (!deviceToken) {
      return res.json({ authorized: false });
    }
    const db = await requireDb();
    const device = await findActiveAdminDevice(db, String(deviceToken));
    if (!device) {
      return res.json({ authorized: false });
    }

    const now = new Date().toISOString();
    await db.collection("adminDevices").updateOne({ id: device.id }, { $set: { lastUsedAt: now } });

    res.json({
      authorized: true,
      device: sanitizeDeviceForClient({ ...device, lastUsedAt: now })
    });
  } catch (e: any) {
    res.status(500).json({ authorized: false, error: e.message });
  }
});

// POST /api/admin-access/authorize-device — secret owner device binding via master password
router.post("/admin-access/authorize-device", async (req, res) => {
  try {
    const { masterPassword, label } = req.body || {};
    const db = await requireDb();
    const validPassword = await getAdminSecurityPassword(db);

    if (String(masterPassword || "").trim() !== validPassword) {
      return res.status(403).json({ error: "Maxfiy parol noto'g'ri" });
    }

    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = hashDeviceToken(rawToken);
    const now = new Date().toISOString();
    const uaSummary = summarizeUserAgent(req.headers["user-agent"]);
    const deviceDoc = {
      id: `dev-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`,
      tokenHash,
      label: String(label || "").trim() || `Asosiy kompyuter (${uaSummary})`,
      userAgentSummary: uaSummary,
      role: "owner",
      createdAt: now,
      lastUsedAt: now,
      revokedAt: null
    };

    await db.collection("adminDevices").insertOne({ ...deviceDoc });
    res.json({
      success: true,
      deviceToken: rawToken,
      device: sanitizeDeviceForClient(deviceDoc)
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/admin-access/claim-invite — atomically consume a one-time invite link and bind this device
router.post("/admin-access/claim-invite", async (req, res) => {
  try {
    const { inviteCode, label } = req.body || {};
    const cleanCode = String(inviteCode || "").trim();
    if (!cleanCode) {
      return res.status(400).json({ error: "Taklif kodi ko'rsatilmagan" });
    }

    const db = await requireDb();
    const invitesCol = db.collection("adminInvites");
    const nowIso = new Date().toISOString();

    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = hashDeviceToken(rawToken);
    const newDeviceId = `dev-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`;

    const claimed = await invitesCol.findOneAndUpdate(
      {
        code: cleanCode,
        revoked: { $ne: true },
        usedAt: null,
        expiresAt: { $gt: nowIso }
      },
      {
        $set: {
          usedAt: nowIso,
          usedByDeviceId: newDeviceId
        }
      },
      { returnDocument: "after", projection: { _id: 0 } }
    );

    if (!claimed) {
      return res.status(404).json({
        error: "Taklif havolasi noto'g'ri, avval ishlatilgan yoki amal qilish muddati tugagan"
      });
    }

    const uaSummary = summarizeUserAgent(req.headers["user-agent"]);
    const deviceDoc = {
      id: newDeviceId,
      tokenHash,
      label: String(label || claimed.label || "Ruxsat berilgan qurilma").trim(),
      userAgentSummary: uaSummary,
      role: "invited",
      createdAt: nowIso,
      lastUsedAt: nowIso,
      revokedAt: null
    };

    await db.collection("adminDevices").insertOne({ ...deviceDoc });

    res.json({
      success: true,
      deviceToken: rawToken,
      device: sanitizeDeviceForClient(deviceDoc)
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/admin-access/login — verified admin sign-in (requires active authorized device + password)
router.post("/admin-access/login", async (req, res) => {
  try {
    const { deviceToken, username, phoneNumber, password } = req.body || {};
    const db = await requireDb();

    const activeDevice = await findActiveAdminDevice(db, String(deviceToken || ""));
    if (!activeDevice) {
      return res.status(403).json({
        error: "Ushbu qurilmada admin ruxsati yo'q yoki bekor qilingan",
        code: "DEVICE_UNAUTHORIZED"
      });
    }

    const validPassword = await getAdminSecurityPassword(db);
    if (String(password || "").trim() !== validPassword) {
      return res.status(403).json({ error: "Admin paroli noto'g'ri" });
    }

    const normalizedPhone = normalizePhoneForStorage(phoneNumber || "8215056224");
    const variants = buildPhoneMatchVariants(normalizedPhone);
    const usersCol = db.collection("users");
    const existing = await usersCol.findOne(
      { $or: [{ phoneNumber: { $in: variants } }, { telegramId: { $in: variants } }] },
      { projection: { _id: 0 } }
    );

    const adminUser = existing
      ? {
          ...existing,
          username: String(username || "").trim() || existing.username || "YUYU Admin",
          isAdmin: true
        }
      : {
          username: String(username || "").trim() || "YUYU Admin",
          telegramId: normalizedPhone,
          phoneNumber: normalizedPhone,
          isAdmin: true,
          avatar: "",
          bio: "YUYU Shop boshqaruvi",
          referralBalance: 0,
          invitedCount: 0,
          vipTier: "DIAMOND",
          totalSpent: 0,
          cashbackBalance: 0,
          isSubscribedVip: true,
          vipExpiresAt: null,
          createdAt: Date.now()
        };

    await usersCol.updateOne(
      { $or: [{ phoneNumber: adminUser.phoneNumber }, { telegramId: adminUser.telegramId }] },
      { $set: adminUser },
      { upsert: true }
    );

    await db.collection("adminDevices").updateOne(
      { id: activeDevice.id },
      { $set: { lastUsedAt: new Date().toISOString() } }
    );

    res.json({ success: true, user: adminUser });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/admin-access/overview — list authorized devices & invite links (admin only)
router.get("/admin-access/overview", async (req, res) => {
  try {
    const adminId = String(req.query.adminId || "").trim();
    const deviceToken = String(req.query.deviceToken || "").trim();
    const db = await requireDb();

    if (!(await verifyAdminCaller(db, adminId))) {
      return res.status(403).json({ error: "Faqat administrator ko'rishi mumkin" });
    }

    const [rawDevices, rawInvites, currentDev] = await Promise.all([
      db.collection("adminDevices").find({}, { projection: { _id: 0 } }).sort({ lastUsedAt: -1 }).toArray(),
      db.collection("adminInvites").find({}, { projection: { _id: 0 } }).sort({ createdAt: -1 }).limit(30).toArray(),
      deviceToken ? findActiveAdminDevice(db, deviceToken) : Promise.resolve(null)
    ]);

    res.json({
      success: true,
      devices: rawDevices.map(sanitizeDeviceForClient),
      invites: rawInvites,
      currentDeviceId: currentDev?.id || null
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/admin-access/bind-current — bind current computer directly from an active admin session
router.post("/admin-access/bind-current", async (req, res) => {
  try {
    const { adminId, label } = req.body || {};
    const db = await requireDb();

    if (!(await verifyAdminCaller(db, String(adminId || "")))) {
      return res.status(403).json({ error: "Faqat administrator qurilmani biriktira oladi" });
    }

    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = hashDeviceToken(rawToken);
    const now = new Date().toISOString();
    const uaSummary = summarizeUserAgent(req.headers["user-agent"]);
    const deviceDoc = {
      id: `dev-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`,
      tokenHash,
      label: String(label || "").trim() || `Asosiy kompyuter (${uaSummary})`,
      userAgentSummary: uaSummary,
      role: "owner",
      createdAt: now,
      lastUsedAt: now,
      revokedAt: null
    };

    await db.collection("adminDevices").insertOne({ ...deviceDoc });
    res.json({
      success: true,
      deviceToken: rawToken,
      device: sanitizeDeviceForClient(deviceDoc)
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/admin-access/invites — create a one-time invite link (admin only)
router.post("/admin-access/invites", async (req, res) => {
  try {
    const { adminId, label, expiresHours } = req.body || {};
    const db = await requireDb();

    if (!(await verifyAdminCaller(db, String(adminId || "")))) {
      return res.status(403).json({ error: "Faqat administrator taklif havolasi yarata oladi" });
    }

    const hours = Math.min(168, Math.max(1, Number(expiresHours) || 24));
    const now = Date.now();
    const invite = {
      id: `inv-${now}-${crypto.randomBytes(3).toString("hex")}`,
      code: crypto.randomBytes(18).toString("base64url"),
      label: String(label || "Ruxsat berilgan qurilma").trim().slice(0, 80),
      createdBy: String(adminId),
      createdAt: new Date(now).toISOString(),
      expiresAt: new Date(now + hours * 3600 * 1000).toISOString(),
      usedAt: null,
      usedByDeviceId: null,
      revoked: false
    };

    await db.collection("adminInvites").insertOne({ ...invite });
    res.json({ success: true, invite });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /api/admin-access/invites/:id — cancel an unused invite (admin only)
router.delete("/admin-access/invites/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = String(req.query.adminId || req.body?.adminId || "").trim();
    const db = await requireDb();

    if (!(await verifyAdminCaller(db, adminId))) {
      return res.status(403).json({ error: "Faqat administrator bekor qila oladi" });
    }

    await db.collection("adminInvites").updateOne({ id }, { $set: { revoked: true } });
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /api/admin-access/devices/:id — revoke an authorized device immediately (admin only)
router.delete("/admin-access/devices/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = String(req.query.adminId || req.body?.adminId || "").trim();
    const db = await requireDb();

    if (!(await verifyAdminCaller(db, adminId))) {
      return res.status(403).json({ error: "Faqat administrator qurilmani o'chira oladi" });
    }

    await db.collection("adminDevices").updateOne(
      { id },
      { $set: { revokedAt: new Date().toISOString() } }
    );
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/admin-access/password — update master admin password in MongoDB (admin only)
router.post("/admin-access/password", async (req, res) => {
  try {
    const { adminId, currentPassword, newPassword } = req.body || {};
    const db = await requireDb();

    if (!(await verifyAdminCaller(db, String(adminId || "")))) {
      return res.status(403).json({ error: "Faqat administrator parolni o'zgartira oladi" });
    }

    const validPassword = await getAdminSecurityPassword(db);
    if (String(currentPassword || "").trim() !== validPassword) {
      return res.status(403).json({ error: "Joriy parol noto'g'ri" });
    }

    const cleanNew = String(newPassword || "").trim();
    if (cleanNew.length < 4) {
      return res.status(400).json({ error: "Yangi parol kamida 4 ta belgidan iborat bo'lishi kerak" });
    }

    await db.collection("adminSecurityConfig").updateOne(
      { id: "default" },
      { $set: { id: "default", adminPassword: cleanNew, updatedAt: new Date().toISOString() } },
      { upsert: true }
    );
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ================= GEMINI AI SYSTEM ROUTES =================

async function loadAiCatalog(db: Db): Promise<AiCatalogItem[]> {
  const docs = await db
    .collection("products")
    .find(
      {},
      {
        projection: {
          _id: 0,
          id: 1,
          name: 1,
          category: 1,
          description: 1,
          pinduoduoPrice: 1,
          oldPrice: 1,
          vipPrice: 1,
          isVipOnly: 1,
          sizes: 1,
          weight: 1,
          rating: 1,
          salesCount: 1,
          isOriginal: 1,
          isCheapPrice: 1
        }
      }
    )
    .toArray();
  return docs as unknown as AiCatalogItem[];
}

router.post("/ai/chat", async (req, res) => {
  try {
    const { messages, userName, vipTier, imageDataUrl } = req.body || {};
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "Suhbat xabari bo'sh bo'lmasligi kerak" });
    }
    const db = await requireDb();
    const catalog = await loadAiCatalog(db);
    const result = await runAiShoppingChat({
      messages,
      catalog,
      userName: typeof userName === "string" ? userName : undefined,
      vipTier: typeof vipTier === "string" ? vipTier : undefined,
      imageDataUrl: typeof imageDataUrl === "string" ? imageDataUrl : undefined
    });
    res.json({ success: true, ...result });
  } catch (e: any) {
    const status = Number(e?.status) >= 400 && Number(e?.status) < 600 ? Number(e.status) : 500;
    res.status(status).json({ error: e?.message || "AI Maslahatchi xatosi" });
  }
});

router.post("/ai/visual-search", async (req, res) => {
  try {
    const { imageDataUrl, hintText } = req.body || {};
    if (!imageDataUrl || typeof imageDataUrl !== "string") {
      return res.status(400).json({ error: "Iltimos, avval rasm yuklang" });
    }
    const db = await requireDb();
    const catalog = await loadAiCatalog(db);
    const result = await runAiVisualSearch({
      imageDataUrl,
      hintText: typeof hintText === "string" ? hintText : undefined,
      catalog
    });
    res.json({ success: true, ...result });
  } catch (e: any) {
    const status = Number(e?.status) >= 400 && Number(e?.status) < 600 ? Number(e.status) : 500;
    res.status(status).json({ error: e?.message || "Rasmni tahlil qilishda xatolik" });
  }
});

router.post("/ai/product-help", async (req, res) => {
  try {
    const { productId, product, question, measurements, vipTier } = req.body || {};
    if (!question || typeof question !== "string" || !question.trim()) {
      return res.status(400).json({ error: "Iltimos, savolingizni yozing" });
    }
    const db = await requireDb();
    let targetProduct: AiCatalogItem | null = null;
    if (productId && typeof productId === "string") {
      const found = await db
        .collection("products")
        .findOne({ id: productId }, { projection: { _id: 0, images: 0, videos: 0 } });
      if (found) targetProduct = found as unknown as AiCatalogItem;
    }
    if (!targetProduct && product && typeof product === "object") {
      targetProduct = product as AiCatalogItem;
    }
    if (!targetProduct) {
      return res.status(404).json({ error: "Mahsulot topilmadi" });
    }

    const result = await runAiProductHelp({
      product: targetProduct,
      question: question.trim(),
      measurements: typeof measurements === "string" ? measurements : undefined,
      vipTier: typeof vipTier === "string" ? vipTier : undefined
    });
    res.json({ success: true, ...result });
  } catch (e: any) {
    const status = Number(e?.status) >= 400 && Number(e?.status) < 600 ? Number(e.status) : 500;
    res.status(status).json({ error: e?.message || "AI yordamchi javob bera olmadi" });
  }
});

router.post("/ai/admin-copy", async (req, res) => {
  try {
    const db = await requireDb();
    const device = await verifyRequestAdminDevice(req, db);
    if (!device) {
      return res.status(403).json({ error: "Admin ruxsati tasdiqlanmagan qurilma" });
    }
    const { name, category, sizes, priceYuan, imageDataUrl } = req.body || {};
    if (!String(name || "").trim() && !String(imageDataUrl || "").trim()) {
      return res.status(400).json({ error: "Kamida mahsulot nomi yoki rasm kiriting" });
    }
    const result = await runAiAdminCopy({
      name: typeof name === "string" ? name : undefined,
      category: typeof category === "string" ? category : undefined,
      sizes: typeof sizes === "string" ? sizes : undefined,
      priceYuan: typeof priceYuan === "string" ? priceYuan : undefined,
      imageDataUrl: typeof imageDataUrl === "string" ? imageDataUrl : undefined
    });
    res.json({ success: true, ...result });
  } catch (e: any) {
    const status = Number(e?.status) >= 400 && Number(e?.status) < 600 ? Number(e.status) : 500;
    res.status(status).json({ error: e?.message || "AI tavsif yaratishda xatolik" });
  }
});

// ================= WEEKLY LIVE AUCTION & SELLER ESCROW ROUTES =================
const sendAdminTelegramAlert = async (message: string) => {
  const token = (process.env.TELEGRAM_TOKEN || "").trim();
  const targetChatId = (process.env.ADMIN_CHAT_ID || "8215056224").trim();
  if (!token || !message) return;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: targetChatId,
        text: message,
        parse_mode: "Markdown"
      }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);
  } catch (err: any) {
    console.warn("Admin Telegram alert skipped:", err?.message);
  }
};

registerAuctionRoutes(router, {
  requireDb,
  verifyRequestAdminDevice,
  sendAdminTelegramAlert
});

registerTayyorAffiliateRoutes(router, {
  requireDb,
  verifyRequestAdminDevice,
  sendAdminTelegramAlert,
  sendMediaValue
});

// Route API requests under /api, /api/index.ts, or direct serverless execution
app.use((req, res, next) => {
  const isApiRequest = req.url.startsWith("/api") || req.originalUrl?.startsWith("/api") || Boolean(process.env.VERCEL);
  if (!isApiRequest) {
    return next();
  }

  let url = req.url;
  if (url.startsWith("/api/index.ts")) {
    url = url.replace("/api/index.ts", "") || "/";
  } else if (url.startsWith("/api")) {
    url = url.slice(4) || "/";
  }
  req.url = url;

  router(req, res, next);
});

// Catch-all 404 for unmatched API requests - Always returns clean JSON
app.use((req, res, next) => {
  const isApiRequest = req.url.startsWith("/api") || req.originalUrl?.startsWith("/api") || Boolean(process.env.VERCEL);
  if (!isApiRequest) {
    return next();
  }
  console.warn(`[API 404] Unmatched route: ${req.method} ${req.originalUrl || req.url}`);
  res.status(404).json({
    error: "API Route not found",
    method: req.method,
    path: req.originalUrl || req.url
  });
});

// Global error handler - Always returns clean JSON
app.use((err: any, req: any, res: any, next: any) => {
  console.error("Critical API Error:", err);
  if (!res.headersSent) {
    res.status(500).json({
      error: "Internal Server Error",
      message: err?.message || "Unknown error",
      path: req.originalUrl || req.url
    });
  }
});

export default app;
