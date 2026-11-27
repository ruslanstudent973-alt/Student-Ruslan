import { NextRequest, NextResponse } from "next/server";
import connectToDatabase, { isMongoConfigured } from "@/lib/mongodb";
import { verifyNextAdminDevice } from "@/lib/adminAuth";
import ProductModel from "@/models/Product";
import {
  type AiCatalogItem,
  runAiAdminCopy,
  runAiProductHelp,
  runAiShoppingChat,
  runAiVisualSearch
} from "@/server/geminiService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function loadAiCatalogFromMongo(fallbackCatalog?: AiCatalogItem[]): Promise<AiCatalogItem[]> {
  if (!isMongoConfigured()) {
    return Array.isArray(fallbackCatalog) ? fallbackCatalog : [];
  }
  try {
    await connectToDatabase();
    const docs = await ProductModel.find(
      {},
      {
        _id: 0,
        id: 1,
        name: 1,
        category: 1,
        description: 1,
        pinduoduoPrice: 1,
        price: 1,
        oldPrice: 1,
        vipPrice: 1,
        isVipOnly: 1,
        sizes: 1,
        colorVariants: 1,
        weight: 1,
        rating: 1,
        salesCount: 1,
        isOriginal: 1,
        isCheapPrice: 1
      }
    )
      .lean()
      .exec();

    if (Array.isArray(docs) && docs.length > 0) {
      return docs.map((d: any) => ({
        ...d,
        pinduoduoPrice:
          typeof d.pinduoduoPrice === "number"
            ? d.pinduoduoPrice
            : typeof d.price === "number"
            ? d.price
            : 0
      })) as unknown as AiCatalogItem[];
    }
  } catch (err: any) {
    console.warn("[API /api/ai] MongoDB catalog fetch warning:", err?.message || err);
  }
  return Array.isArray(fallbackCatalog) ? fallbackCatalog : [];
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ action: string }> }
) {
  const resolvedParams = await context.params;
  const action = (resolvedParams?.action || "").toLowerCase();

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "So'rov formati noto'g'ri (JSON kutilgan)" },
      { status: 400 }
    );
  }

  try {
    if (action === "chat") {
      const { messages, userName, vipTier, imageDataUrl, imageUrl, catalog: clientCatalog } =
        body || {};
      if (!Array.isArray(messages) || messages.length === 0) {
        return NextResponse.json(
          { error: "Suhbat xabari bo'sh bo'lmasligi kerak" },
          { status: 400 }
        );
      }

      const catalog = await loadAiCatalogFromMongo(clientCatalog);
      const result = await runAiShoppingChat({
        messages,
        catalog,
        userName: typeof userName === "string" ? userName : undefined,
        vipTier: typeof vipTier === "string" ? vipTier : undefined,
        imageDataUrl: typeof imageDataUrl === "string" ? imageDataUrl : undefined,
        imageUrl: typeof imageUrl === "string" ? imageUrl : undefined
      });
      return NextResponse.json({ success: true, ...result });
    }

    if (action === "visual-search") {
      const { imageDataUrl, imageUrl, hintText, catalog: clientCatalog } = body || {};
      if (
        (!imageDataUrl || typeof imageDataUrl !== "string") &&
        (!imageUrl || typeof imageUrl !== "string")
      ) {
        return NextResponse.json(
          { error: "Iltimos, avval rasm yuklang" },
          { status: 400 }
        );
      }

      const catalog = await loadAiCatalogFromMongo(clientCatalog);
      const result = await runAiVisualSearch({
        imageDataUrl: typeof imageDataUrl === "string" ? imageDataUrl : undefined,
        imageUrl: typeof imageUrl === "string" ? imageUrl : undefined,
        hintText: typeof hintText === "string" ? hintText : undefined,
        catalog
      });
      return NextResponse.json({ success: true, ...result });
    }

    if (action === "product-help") {
      const {
        productId,
        product,
        question,
        measurements,
        vipTier,
        imageDataUrl,
        imageUrl
      } = body || {};

      if (!question || typeof question !== "string" || !question.trim()) {
        return NextResponse.json(
          { error: "Iltimos, savolingizni yozing" },
          { status: 400 }
        );
      }

      let targetProduct: AiCatalogItem | null = null;
      if (productId && typeof productId === "string" && isMongoConfigured()) {
        try {
          await connectToDatabase();
          const found = await ProductModel.findOne(
            { id: productId },
            { _id: 0, videos: 0 }
          )
            .lean()
            .exec();
          if (found) {
            targetProduct = found as unknown as AiCatalogItem;
          }
        } catch (dbErr: any) {
          console.warn("[API /api/ai/product-help] DB lookup warning:", dbErr?.message);
        }
      }

      if (!targetProduct && product && typeof product === "object") {
        targetProduct = product as AiCatalogItem;
      }

      if (!targetProduct) {
        return NextResponse.json(
          { error: "Mahsulot topilmadi" },
          { status: 404 }
        );
      }

      const result = await runAiProductHelp({
        product: targetProduct,
        question: question.trim(),
        measurements: typeof measurements === "string" ? measurements : undefined,
        vipTier: typeof vipTier === "string" ? vipTier : undefined,
        imageDataUrl: typeof imageDataUrl === "string" ? imageDataUrl : undefined,
        imageUrl: typeof imageUrl === "string" ? imageUrl : undefined
      });
      return NextResponse.json({ success: true, ...result });
    }

    if (action === "admin-copy") {
      if (isMongoConfigured()) {
        await connectToDatabase();
        const device = await verifyNextAdminDevice(req);
        if (!device) {
          return NextResponse.json(
            { error: "Admin ruxsati tasdiqlanmagan qurilma" },
            { status: 403 }
          );
        }
      }

      const { name, category, sizes, priceYuan, imageDataUrl, imageUrl } = body || {};
      if (
        !String(name || "").trim() &&
        !String(imageDataUrl || "").trim() &&
        !String(imageUrl || "").trim()
      ) {
        return NextResponse.json(
          { error: "Kamida mahsulot nomi yoki rasm kiriting" },
          { status: 400 }
        );
      }

      const result = await runAiAdminCopy({
        name: typeof name === "string" ? name : undefined,
        category: typeof category === "string" ? category : undefined,
        sizes: typeof sizes === "string" ? sizes : undefined,
        priceYuan: typeof priceYuan === "string" ? priceYuan : undefined,
        imageDataUrl: typeof imageDataUrl === "string" ? imageDataUrl : undefined,
        imageUrl: typeof imageUrl === "string" ? imageUrl : undefined
      });
      return NextResponse.json({ success: true, ...result });
    }

    return NextResponse.json(
      { error: `Noma'lum AI amali: ${action}` },
      { status: 404 }
    );
  } catch (e: any) {
    console.warn(`[API /api/ai/${action}] Handled error:`, e?.message || e);
    const status =
      Number(e?.status) >= 400 && Number(e?.status) < 600
        ? Number(e.status)
        : 500;
    return NextResponse.json(
      {
        error:
          e?.message ||
          "AI xizmati bilan bog'lanishda xatolik yuz berdi. Iltimos, qayta urinib ko'ring."
      },
      { status }
    );
  }
}
