import { NextRequest, NextResponse } from "next/server";
import connectToDatabase, { isMongoConfigured } from "@/lib/mongodb";
import { verifyNextAdminDevice } from "@/lib/adminAuth";
import { enforceApiSecurity } from "@/lib/securityEngine";
import ProductModel, { type IProductDocument } from "@/models/Product";
import mongoose from "mongoose";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isSafeMediaUrl(raw: unknown): raw is string {
  if (typeof raw !== "string") return false;
  const val = raw.trim();
  if (!val || val.length > 15_000_000) return false;
  if (
    val.startsWith("https://") ||
    val.startsWith("http://") ||
    val.startsWith("/api/") ||
    val.startsWith("/images/") ||
    val.startsWith("data:image/") ||
    val.startsWith("data:video/")
  ) {
    return true;
  }
  return false;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function serializeProduct(doc: any) {
  if (!doc) return null;
  const { _id, __v, ...rest } = doc;
  const numericPrice =
    typeof rest.pinduoduoPrice === "number"
      ? rest.pinduoduoPrice
      : typeof rest.price === "number"
      ? rest.price
      : 0;
  const videosArr = Array.isArray(rest.videos)
    ? rest.videos.filter((v: unknown) => typeof v === "string" && v.trim())
    : rest.video
    ? [String(rest.video)]
    : [];
  return {
    ...rest,
    id: rest.id || (_id ? String(_id) : ""),
    price: numericPrice,
    pinduoduoPrice: numericPrice,
    images: Array.isArray(rest.images) ? rest.images : [],
    video: typeof rest.video === "string" && rest.video.trim() ? rest.video : videosArr[0] || "",
    videos: videosArr,
  };
}

export async function GET(request: NextRequest) {
  const blocked = await enforceApiSecurity(request);
  if (blocked) return blocked;
  try {
    if (!isMongoConfigured()) {
      return NextResponse.json(
        { error: "MONGODB_URI muhit o'zgaruvchisi sozlanmagan", products: [] },
        { status: 503 }
      );
    }

    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const category = (searchParams.get("category") || "").trim().slice(0, 100);
    const search = (searchParams.get("search") || "").trim().slice(0, 100);

    const filter: Record<string, unknown> = {};
    if (category && category !== "Barchasi") {
      filter.category = category;
    }
    if (search) {
      const safePattern = escapeRegex(search);
      filter.$or = [
        { name: { $regex: safePattern, $options: "i" } },
        { description: { $regex: safePattern, $options: "i" } },
        { category: { $regex: safePattern, $options: "i" } },
      ];
    }

    const docs = await ProductModel.aggregate([
      ...(Object.keys(filter).length > 0 ? [{ $match: filter }] : []),
      {
        $addFields: {
          images: {
            $cond: [
              { $isArray: "$images" },
              {
                $map: {
                  input: { $range: [0, { $size: "$images" }] },
                  as: "idx",
                  in: {
                    $let: {
                      vars: { img: { $arrayElemAt: ["$images", "$$idx"] } },
                      in: {
                        $cond: [
                          {
                            $and: [
                              { $eq: [{ $type: "$$img" }, "string"] },
                              { $eq: [{ $substrBytes: ["$$img", 0, 5] }, "data:"] },
                              { $gt: [{ $strLenBytes: "$$img" }, 2048] },
                            ],
                          },
                          {
                            $concat: [
                              "/api/media/product/",
                              { $toString: { $ifNull: ["$id", "$_id"] } },
                              "/",
                              { $toString: "$$idx" },
                            ],
                          },
                          "$$img",
                        ],
                      },
                    },
                  },
                },
              },
              [],
            ],
          },
          videos: {
            $cond: [
              { $isArray: "$videos" },
              {
                $map: {
                  input: { $range: [0, { $size: "$videos" }] },
                  as: "idx",
                  in: {
                    $let: {
                      vars: { vid: { $arrayElemAt: ["$videos", "$$idx"] } },
                      in: {
                        $cond: [
                          {
                            $and: [
                              { $eq: [{ $type: "$$vid" }, "string"] },
                              { $eq: [{ $substrBytes: ["$$vid", 0, 5] }, "data:"] },
                              { $gt: [{ $strLenBytes: "$$vid" }, 2048] },
                            ],
                          },
                          {
                            $concat: [
                              "/api/media/product-video/",
                              { $toString: { $ifNull: ["$id", "$_id"] } },
                              "/",
                              { $toString: "$$idx" },
                            ],
                          },
                          "$$vid",
                        ],
                      },
                    },
                  },
                },
              },
              [],
            ],
          },
          video: {
            $cond: [
              {
                $and: [
                  { $eq: [{ $type: "$video" }, "string"] },
                  { $eq: [{ $substrBytes: ["$video", 0, 5] }, "data:"] },
                  { $gt: [{ $strLenBytes: "$video" }, 2048] },
                ],
              },
              {
                $concat: [
                  "/api/media/product-video/",
                  { $toString: { $ifNull: ["$id", "$_id"] } },
                  "/0",
                ],
              },
              "$video",
            ],
          },
        },
      },
      { $sort: { createdAt: -1, _id: -1 } },
    ]).allowDiskUse(true);

    const products = docs.map(serializeProduct).filter(Boolean);

    return NextResponse.json({
      success: true,
      count: products.length,
      products,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Mahsulotlarni olishda xatolik yuz berdi" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const blocked = await enforceApiSecurity(request);
  if (blocked) return blocked;
  try {
    const adminDevice = await verifyNextAdminDevice(request);
    if (!adminDevice) {
      return NextResponse.json(
        { error: "Mahsulot qo'shish yoki tahrirlash uchun admin ruxsati talab qilinadi" },
        { status: 403 }
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

    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (name.length < 2 || name.length > 220) {
      return NextResponse.json(
        { error: "Mahsulot nomi 2 dan 220 tagacha belgidan iborat bo'lishi kerak" },
        { status: 400 }
      );
    }

    const rawPrice =
      body.pinduoduoPrice !== undefined ? body.pinduoduoPrice : body.price;
    const price = Number(rawPrice);
    if (!Number.isFinite(price) || price < 0) {
      return NextResponse.json(
        { error: "Mahsulot narxi to'g'ri musbat son bo'lishi kerak" },
        { status: 400 }
      );
    }

    const rawImages = Array.isArray(body.images) ? body.images : [];
    const images = rawImages
      .filter(isSafeMediaUrl)
      .map((u: string) => u.trim())
      .slice(0, 20);

    if (images.length === 0) {
      return NextResponse.json(
        { error: "Kamida bitta to'g'ri rasm URL manzili talab qilinadi" },
        { status: 400 }
      );
    }

    const rawVideos: string[] = [];
    if (Array.isArray(body.videos)) {
      for (const v of body.videos) {
        if (isSafeMediaUrl(v)) rawVideos.push(v.trim());
      }
    }
    if (isSafeMediaUrl(body.video) && !rawVideos.includes(body.video.trim())) {
      rawVideos.unshift(body.video.trim());
    }
    const videos = rawVideos.slice(0, 6);
    const primaryVideo = videos[0] || "";

    const rawId =
      typeof body.id === "string" && /^[a-zA-Z0-9_-]{1,80}$/.test(body.id.trim())
        ? body.id.trim()
        : Date.now().toString();

    const description =
      typeof body.description === "string" && body.description.trim()
        ? body.description.trim().slice(0, 4000)
        : `${name} — YUYU Shop sifatli mahsuloti.`;

    const category =
      typeof body.category === "string" && body.category.trim()
        ? body.category.trim().slice(0, 100)
        : "Boshqa";

    const sizes = Array.isArray(body.sizes)
      ? body.sizes
          .filter((s: unknown): s is string => typeof s === "string" && s.trim().length > 0)
          .map((s: string) => s.trim().slice(0, 40))
          .slice(0, 30)
      : ["Standard"];

    const oldPrice =
      body.oldPrice !== undefined && body.oldPrice !== null && body.oldPrice !== ""
        ? Number(body.oldPrice)
        : undefined;
    const vipPrice =
      body.vipPrice !== undefined && body.vipPrice !== null && body.vipPrice !== ""
        ? Math.round(Number(body.vipPrice))
        : undefined;
    const weight =
      body.weight !== undefined && Number.isFinite(Number(body.weight))
        ? Math.max(0, Number(body.weight))
        : 0.5;
    const flashSaleEnd =
      body.isFlashSale && Number.isFinite(Number(body.flashSaleEnd))
        ? Number(body.flashSaleEnd)
        : undefined;

    await connectToDatabase();

    // Preserve legacy /api/media/product/... references when editing existing records
    const existing = await ProductModel.findOne({ id: rawId }).lean();
    const resolvedImages = existing
      ? images.map((img) => {
          if (img.startsWith("/api/media/product/")) {
            const idx = Number(img.split("/").pop());
            if (!Number.isNaN(idx) && Array.isArray(existing.images) && existing.images[idx]) {
              return existing.images[idx];
            }
          }
          return img;
        })
      : images;

    const resolvedVideos = existing
      ? videos.map((vid) => {
          if (vid.startsWith("/api/media/product-video/")) {
            const idx = Number(vid.split("/").pop());
            if (!Number.isNaN(idx) && Array.isArray(existing.videos) && existing.videos[idx]) {
              return existing.videos[idx];
            }
          }
          return vid;
        })
      : videos;

    const sellerInput =
      body.seller && typeof body.seller === "object" && !Array.isArray(body.seller)
        ? body.seller
        : existing?.seller;

    const productPayload: Partial<IProductDocument> = {
      id: rawId,
      name,
      price,
      pinduoduoPrice: price,
      description,
      category,
      images: resolvedImages,
      video: resolvedVideos[0] || primaryVideo,
      videos: resolvedVideos,
      sizes: sizes.length > 0 ? sizes : ["Standard"],
      rating:
        Number.isFinite(Number(body.rating)) && Number(body.rating) >= 0 && Number(body.rating) <= 5
          ? Number(body.rating)
          : existing?.rating ?? 5,
      salesCount:
        Number.isFinite(Number(body.salesCount)) && Number(body.salesCount) >= 0
          ? Number(body.salesCount)
          : existing?.salesCount ?? 0,
      seller: {
        name:
          typeof sellerInput?.name === "string" && sellerInput.name.trim()
            ? sellerInput.name.trim().slice(0, 100)
            : "YUYU Shop",
        avatar:
          isSafeMediaUrl(sellerInput?.avatar) ? sellerInput.avatar : "",
        rating: Number.isFinite(Number(sellerInput?.rating)) ? Number(sellerInput.rating) : 5,
        description:
          typeof sellerInput?.description === "string" && sellerInput.description.trim()
            ? sellerInput.description.trim().slice(0, 200)
            : "Rasmiy do'kon",
      },
      isOriginal: Boolean(body.isOriginal),
      isCheapPrice: Boolean(body.isCheapPrice),
      isVipOnly: Boolean(body.isVipOnly),
      isFlashSale: Boolean(body.isFlashSale),
      weight,
      ...(oldPrice !== undefined && Number.isFinite(oldPrice) && oldPrice >= 0 ? { oldPrice } : {}),
      ...(vipPrice !== undefined && Number.isFinite(vipPrice) && vipPrice >= 0 ? { vipPrice } : {}),
      ...(flashSaleEnd !== undefined ? { flashSaleEnd } : {}),
    };

    const saved = await ProductModel.findOneAndUpdate(
      { id: rawId },
      { $set: productPayload },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).lean();

    // Keep Video Reels (`productVideos` collection) in sync when product has videos
    if (resolvedVideos.length > 0 && mongoose.connection.db) {
      const vidCol = mongoose.connection.db.collection("productVideos");
      for (const vidUrl of resolvedVideos) {
        if (!vidUrl) continue;
        const already = await vidCol.findOne({ productId: rawId, videoUrl: vidUrl });
        if (!already) {
          await vidCol.insertOne({
            id: `vid-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            productId: rawId,
            caption: `${name} — rasmiy video sharh`,
            videoUrl: vidUrl,
            posterImage: resolvedImages[0] || "",
            uploaderId: "8215056224",
            uploaderName: "YUYU Admin",
            uploaderRole: "admin",
            likes: [],
            comments: [],
            sharesCount: 0,
            createdAt: Date.now(),
          });
        }
      }
    }

    return NextResponse.json(
      {
        success: true,
        product: serializeProduct(saved),
      },
      { status: existing ? 200 : 201 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Mahsulotni saqlashda xatolik yuz berdi" },
      { status: 500 }
    );
  }
}
