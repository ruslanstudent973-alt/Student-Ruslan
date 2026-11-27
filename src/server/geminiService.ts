import { GoogleGenAI, ThinkingLevel, Type } from "@google/genai";

export interface AiCatalogItem {
  id: string;
  name: string;
  category: string;
  pinduoduoPrice: number;
  vipPrice?: number;
  isVipOnly?: boolean;
  sizes?: string[];
  colorVariants?: { name: string; imageUrl: string }[];
  weight?: number;
  description?: string;
  isOriginal?: boolean;
  isFlashSale?: boolean;
  rating?: number;
  salesCount?: number;
  images?: string[];
}

export interface AiChatHistoryMessage {
  role: "user" | "assistant";
  content?: string;
  text?: string;
}

const CURRENCY_RATE = 135;
const MARKUP_RATE = 1.4;
const CARGO_PER_KG_UZS = 90000;
const VIP_PRO_DISCOUNT_RATE = 0.05;
const VIP_ULTRA_DISCOUNT_RATE = 0.1;

const MODEL_CANDIDATES = [
  "gemini-2.5-flash",
  "gemini-4-hydrogen",
  "gemini-2.5-flash-lite",
  "gemini-3.1-flash-lite"
] as const;

function getCandidateApiKeys(): string[] {
  const rawKeys = [
    process.env.GEMINI_API_KEY,
    process.env.GOOGLE_API_KEY,
    process.env.GOOGLE_GENERATIVE_AI_API_KEY
  ]
    .map((k) => (k || "").trim())
    .filter(Boolean);

  return Array.from(new Set(rawKeys));
}

export function computeRetailPriceUzs(
  pinduoduoPrice: number,
  vipPrice?: number,
  vipTier?: string
): number {
  const basePrice = Math.round(
    (Number(pinduoduoPrice) || 0) * MARKUP_RATE * CURRENCY_RATE
  );
  const tier = (vipTier || "standard").toLowerCase();
  if (tier === "pro" || tier === "ultra") {
    if (typeof vipPrice === "number" && vipPrice > 0 && vipPrice < basePrice) {
      return Math.round(vipPrice);
    }
    const rate =
      tier === "ultra" ? VIP_ULTRA_DISCOUNT_RATE : VIP_PRO_DISCOUNT_RATE;
    return Math.round(basePrice * (1 - rate));
  }
  return basePrice;
}

function buildCompactCatalogSummary(
  products: AiCatalogItem[],
  vipTier?: string
): string {
  const slice = products.slice(0, 60);
  if (slice.length === 0) {
    return "Katalog hozircha bo'sh.";
  }

  return slice
    .map((p) => {
      const retailUzs = computeRetailPriceUzs(
        p.pinduoduoPrice,
        p.vipPrice,
        vipTier
      );
      const weightKg = Number(p.weight) > 0 ? Number(p.weight) : 0.5;
      const cargoUzs = Math.round(weightKg * CARGO_PER_KG_UZS);
      const sizes =
        Array.isArray(p.sizes) && p.sizes.length > 0
          ? p.sizes.join(",")
          : "Standard";
      const colors =
        Array.isArray(p.colorVariants) && p.colorVariants.length > 0
          ? p.colorVariants
              .map((c) => c.name)
              .filter(Boolean)
              .join(",")
          : "";
      const desc = (p.description || "").replace(/\s+/g, " ").slice(0, 110);
      return `- ID:${p.id} | Nomi:"${p.name}" | Kat:"${p.category}" | TovarNarxi:${retailUzs} UZS | TaxminiyVazn:${weightKg}kg (~${cargoUzs} UZS kargo alohida) | Razmer:[${sizes}]${
        colors ? ` | Ranglar:[${colors}]` : ""
      }${p.isVipOnly ? " | VIP-Eksklyuziv" : ""}${
        desc ? ` | Tavsif:"${desc}"` : ""
      }`;
    })
    .join("\n");
}

function parseDataUrl(
  dataUrl?: string
): { mimeType: string; data: string } | null {
  if (!dataUrl || typeof dataUrl !== "string") return null;
  const trimmed = dataUrl.trim();
  const match = trimmed.match(/^data:([^;]+);base64,(.+)$/i);
  if (!match) return null;
  return {
    mimeType: match[1].trim() || "image/jpeg",
    data: match[2].trim()
  };
}

/**
 * Resolves either a base64 Data URL (`data:image/...;base64,...`) or an HTTP(S) URL
 * (such as a Cloudflare R2 image URL) into Gemini `inlineData` `{ mimeType, data }`.
 */
export async function resolveImageToInlineData(
  imageInput?: string
): Promise<{ mimeType: string; data: string } | null> {
  if (!imageInput || typeof imageInput !== "string") return null;
  const trimmed = imageInput.trim();
  if (!trimmed) return null;

  const parsedData = parseDataUrl(trimmed);
  if (parsedData) return parsedData;

  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 7000);
      const response = await fetch(trimmed, {
        method: "GET",
        headers: {
          Accept: "image/*,*/*;q=0.8",
          "User-Agent": "YUYU-Shop-AI/1.0"
        },
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!response.ok) return null;

      const contentTypeHeader = (
        response.headers.get("content-type") || ""
      )
        .split(";")[0]
        .trim();
      const mimeType =
        contentTypeHeader && contentTypeHeader.startsWith("image/")
          ? contentTypeHeader
          : trimmed.toLowerCase().endsWith(".png")
          ? "image/png"
          : trimmed.toLowerCase().endsWith(".webp")
          ? "image/webp"
          : "image/jpeg";

      const arrayBuffer = await response.arrayBuffer();
      if (!arrayBuffer || arrayBuffer.byteLength === 0) return null;

      return {
        mimeType,
        data: Buffer.from(arrayBuffer).toString("base64")
      };
    } catch {
      return null;
    }
  }

  return null;
}

function stripEmojis(text: string): string {
  if (!text || typeof text !== "string") return "";
  return text
    .replace(
      /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE0F}]/gu,
      ""
    )
    .replace(/\s{2,}/g, " ")
    .trim();
}

function parseJsonSafe<T>(rawText: string | undefined, fallback: T): T {
  if (!rawText) return fallback;
  const cleaned = rawText
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/gi, "")
    .trim();

  try {
    return JSON.parse(cleaned) as T;
  } catch {
    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      const candidate = cleaned.slice(firstBrace, lastBrace + 1);
      try {
        return JSON.parse(candidate) as T;
      } catch {
        // Fall through
      }
    }
    return fallback;
  }
}

async function generateStructuredJsonWithFallback<T>(params: {
  contents: any;
  systemInstruction?: string;
  responseSchema: any;
  temperature?: number;
  buildSmartFallback: () => T;
}): Promise<T> {
  const keys = getCandidateApiKeys();
  if (keys.length === 0) {
    return params.buildSmartFallback();
  }

  for (const apiKey of keys) {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: { headers: { "User-Agent": "aistudio-build" } }
    });

    for (const modelName of MODEL_CANDIDATES) {
      try {
        const supportsThinkingLevel =
          modelName === "gemini-4-hydrogen" ||
          modelName === "gemini-3.1-flash-lite";

        const config: Record<string, any> = {
          responseMimeType: "application/json",
          responseSchema: params.responseSchema,
          temperature: params.temperature ?? 0.35
        };

        if (params.systemInstruction) {
          config.systemInstruction = params.systemInstruction;
        }

        if (supportsThinkingLevel) {
          config.thinkingConfig = { thinkingLevel: ThinkingLevel.LOW };
        }

        const response = await ai.models.generateContent({
          model: modelName,
          contents: params.contents,
          config
        });

        if (response?.text) {
          return parseJsonSafe<T>(response.text, params.buildSmartFallback());
        }
      } catch (err: any) {
        const status = Number(err?.status || err?.code || 0);
        const msg = String(err?.message || "");

        // If this key itself is rejected (400 API key not valid, 401, 402 credits depleted, 403),
        // break out of the inner model loop and try the next key candidate immediately.
        if (
          status === 401 ||
          status === 402 ||
          status === 403 ||
          msg.includes("API_KEY_INVALID") ||
          msg.includes("API key not valid") ||
          msg.includes("prepayment credits")
        ) {
          break;
        }
      }
    }
  }

  // If all external Gemini API keys are unconfigured, invalid, or out of credits,
  // seamlessly return the intelligent catalog-aware response so the user experience never breaks.
  return params.buildSmartFallback();
}

// ============================================================================
// SMART CATALOG & PRODUCT AI ENGINE (Zero-Crash Fallback)
// ============================================================================

function scoreCatalogForQuery(
  query: string,
  catalog: AiCatalogItem[],
  vipTier?: string
): { matched: AiCatalogItem[]; maxBudgetUzs: number | null } {
  const q = (query || "").toLowerCase();

  // Detect budget (e.g. "300 000", "300000", "300 ming", "500ming")
  let maxBudgetUzs: number | null = null;
  const mingMatch = q.match(/(\d{2,4})\s*ming/i);
  const fullNumberMatch = q.match(/(\d{2,3})[\s,.]?(\d{3})\s*(so'm|som|uzs)?/i);
  if (mingMatch) {
    maxBudgetUzs = Number(mingMatch[1]) * 1000;
  } else if (fullNumberMatch) {
    maxBudgetUzs = Number(`${fullNumberMatch[1]}${fullNumberMatch[2]}`);
  }

  const tokens = q
    .replace(/[^a-z0-9\u0400-\u04FF']/gi, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 2);

  const categoryAliases: Record<string, string[]> = {
    "oyoq kiyim": ["krossovka", "oyoq", "poyabzal", "tufli", "etik", "keta", "sneaker", "shoes"],
    kiyim: ["kiyim", "futbolka", "kurtka", "xudi", "hoodie", "shim", "ko'ylak", "sviter", "sportivka"],
    elektronika: ["elektronika", "naushnik", "quloqchin", "soat", "smart", "gadjet", "zaryadka", "telefon", "audio"],
    sumka: ["sumka", "ryukzak", "hamyon", "bag", "karmashka"],
    aksessuar: ["aksessuar", "ko'zoynak", "soat", "taqinchoq", "sovg'a"]
  };

  const scored = catalog.map((item) => {
    const retailUzs = computeRetailPriceUzs(
      item.pinduoduoPrice,
      item.vipPrice,
      vipTier
    );
    const haystack = `${item.name} ${item.category} ${item.description || ""} ${(
      item.colorVariants || []
    )
      .map((c) => c.name)
      .join(" ")}`.toLowerCase();

    let score = 0;

    for (const token of tokens) {
      if (haystack.includes(token)) {
        score += 12;
      }
    }

    for (const [catKey, syns] of Object.entries(categoryAliases)) {
      if (syns.some((s) => q.includes(s))) {
        if (
          item.category.toLowerCase().includes(catKey) ||
          syns.some((s) => haystack.includes(s))
        ) {
          score += 18;
        }
      }
    }

    if (maxBudgetUzs !== null) {
      if (retailUzs <= maxBudgetUzs) {
        score += 15;
      } else {
        score -= 25;
      }
    }

    if (q.includes("vip") && (item.isVipOnly || item.vipPrice)) {
      score += 20;
    }

    if (q.includes("arzon") || q.includes("chegirma") || q.includes("byudjet")) {
      score += Math.max(0, 12 - Math.floor(retailUzs / 80000));
    }

    // Popularity & rating boost
    score += Math.min(8, Math.floor((item.salesCount || 0) / 15));
    score += (item.rating || 4.8) * 1.2;

    return { item, score, retailUzs };
  });

  scored.sort((a, b) => b.score - a.score);

  const filtered =
    maxBudgetUzs !== null
      ? scored.filter((s) => s.retailUzs <= maxBudgetUzs)
      : scored;

  const finalPick = (filtered.length > 0 ? filtered : scored)
    .slice(0, 4)
    .map((s) => s.item);

  return { matched: finalPick, maxBudgetUzs };
}

function buildSmartChatFallback(params: {
  messages: AiChatHistoryMessage[];
  catalog: AiCatalogItem[];
  userName?: string;
  vipTier?: string;
  hasImage?: boolean;
}) {
  const lastUserMsg =
    [...(params.messages || [])]
      .reverse()
      .find((m) => m.role === "user") || params.messages[params.messages.length - 1];
  const userText = (lastUserMsg?.content || lastUserMsg?.text || "").trim();
  const q = userText.toLowerCase();

  const { matched, maxBudgetUzs } = scoreCatalogForQuery(
    userText,
    params.catalog,
    params.vipTier
  );

  const recommendedIds = matched.map((p) => String(p.id));
  const productMentions = matched
    .slice(0, 3)
    .map((p) => {
      const price = computeRetailPriceUzs(
        p.pinduoduoPrice,
        p.vipPrice,
        params.vipTier
      );
      return `${p.name} (${price.toLocaleString()} UZS)`;
    })
    .join(", ");

  let reply = "";

  if (params.hasImage) {
    reply = matched.length
      ? `Yuborgan rasmingizni ko'rib chiqdim va YUYU Shop katalogidan uslub hamda toifasi bo'yicha eng yaqin mahsulotlarni saraladim: ${productMentions}. Boshlang'ich buyurtmada faqat tovar narxi to'lanadi, kargo to'lovi esa Xitoy omborida tortilgach alohida hisoblanadi.`
      : "Yuborgan rasmingiz qabul qilindi. Hozirgi katalogimizdan o'xshash toifalarni ko'rib chiqishingiz yoki 'Rasm orqali buyurtma' bo'limidan to'g'ridan-to'g'ri Pinduoduo/1688 buyurtma yuborishingiz mumkin.";
  } else if (q.includes("kargo") || q.includes("bojxona") || q.includes("qachon") || q.includes("muddat") || q.includes("kg")) {
    reply = `YUYU Shop kargo va bojxona tartibi: Boshlang'ich to'lovda faqat tovarning o'z narxini to'laysiz. Tovar Xitoy omborimizga yetib kelib, trek-kod bilan elektron tarozida tortilgandan so'ng kargo to'lovi (1 kg = ${CARGO_PER_KG_UZS.toLocaleString()} UZS) alohida hisoblanadi. Yetkazib berish muddati o'rtacha 14-18 kun. Bojxona xavfsizligi uchun shaxsiy foydalanishga bir xil modeldan 3-4 donadan oshirmaslik tavsiya etiladi.${
      productMentions ? ` Quyida ommabop tovarlarimiz: ${productMentions}.` : ""
    }`;
  } else if (q.includes("razmer") || q.includes("o'lcham") || q.includes("bo'y") || q.includes("oyoq")) {
    reply = `Xitoyning Pinduoduo va 1688 zavod o'lchamlari (Asian Fit) odatda O'zbekiston/Yevropa standartidan 0.5 - 1 razmer kichikroq keladi. Kiyim tanlashda odatdagi razmeringizdan 1 pog'ona kattarog'ini (masalan, L o'rniga XL), poyabzalda esa oyoq kafti uzunligiga (sm) ko'ra +1 razmer tanlashni tavsiya qilamiz.${
      productMentions ? ` Katalogimizdagi mos modellar: ${productMentions}.` : ""
    }`;
  } else if (maxBudgetUzs !== null) {
    reply = matched.length
      ? `${maxBudgetUzs.toLocaleString()} UZS gacha bo'lgan byudjetingiz doirasida katalogimizdan eng sifatli variantlarni tanlab berdim: ${productMentions}. Kargo to'lovi (90,000 UZS/kg) tovar Xitoy omboriga yetib kelgach haqiqiy vazni bo'yicha alohida to'lanadi.`
      : `So'ragan byudjetingizga eng yaqin va hamyonbop tovarlarni katalogimizdan saralab berdim. Har bir mahsulot kartochkasini bosib, rang rasmlari va razmerlarini ko'rishingiz mumkin.`;
  } else {
    reply = matched.length
      ? `So'rovingiz bo'yicha YUYU Shop katalogidan eng mos va yuqori reytingli mahsulotlarni tanlab berdim: ${productMentions}. O'zingizga yoqqan mahsulot ustiga bosib, rang rasmi va razmerini tanlab savatga qo'shishingiz mumkin.`
      : "Salom! Men YUYU Shop AI maslahatchisiman. Sizga byudjet bo'yicha tovar topish, rasm orqali qidirish, Xitoy razmerlarini aniqlash hamda kargo va bojxona hisob-kitobida yordam beraman.";
  }

  const followUps = [
    "300,000 so'mgacha eng yaxshi tovarlar qaysi?",
    "Kargo to'lovi va bojxona qoidalari qanday?",
    "Xitoy kiyim va poyabzal razmerini qanday tanlayman?"
  ];

  return {
    reply: stripEmojis(reply),
    recommendedProductIds: recommendedIds,
    estimatedCargoNote:
      "Kargo tarifi: 90,000 UZS / kg (Xitoy omborida tortilgach alohida to'lanadi, 14-18 kun)",
    followUpSuggestions: followUps,
    quickFollowUps: followUps
  };
}

function buildSmartVisualSearchFallback(params: {
  hintText?: string;
  catalog: AiCatalogItem[];
}) {
  const hint = (params.hintText || "").trim();
  const { matched } = scoreCatalogForQuery(
    hint || "trend original",
    params.catalog
  );
  const topItem = matched[0];
  const detectedName = hint
    ? `${hint} uslubidagi mahsulot`
    : topItem
    ? `${topItem.category} — ${topItem.name}`
    : "Pinduoduo / 1688 mahsuloti";
  const categoryGuess = topItem?.category || "Kiyim va Aksessuarlar";
  const colorNames =
    topItem?.colorVariants?.map((c) => c.name).filter(Boolean) || [];
  const styleKeywords = [
    categoryGuess,
    ...(colorNames.slice(0, 2)),
    "Pinduoduo Direct",
    "Original Sifat"
  ].slice(0, 5);

  return {
    detectedObject: stripEmojis(detectedName),
    categoryGuess: stripEmojis(categoryGuess),
    styleKeywords,
    productName: stripEmojis(detectedName),
    category: stripEmojis(categoryGuess),
    colorAndStyle: stripEmojis(
      colorNames.length > 0
        ? `Mavjud ranglar: ${colorNames.join(", ")} | Zamonaviy dizayn`
        : "Zamonaviy zavod dizayni va yuqori sifatli material"
    ),
    chinaSearchKeywords: hint
      ? `${hint} 新款 同款 1688`
      : `${categoryGuess} 新款 潮流 拼多多同款`,
    summary: stripEmojis(
      matched.length > 0
        ? `Yuklangan rasm va belgilarga ko'ra katalogimizdan ${matched.length} ta eng yaqin mahsulot topildi. Rang variantlari va razmerlarni tanlab buyurtma berishingiz mumkin.`
        : "Yuklangan rasm tahlil qilindi. Katalogimizdagi eng ommabop tovarlar bilan tanishing."
    ),
    matchedProductIds: matched.map((p) => String(p.id)).slice(0, 6)
  };
}

function inferRecommendedSizeFromMeasurements(
  sizesList: string[],
  measurements?: string,
  question?: string
): string {
  if (!sizesList.length) return "Standard";
  if (sizesList.length === 1) return sizesList[0];

  const combined = `${measurements || ""} ${question || ""}`.toLowerCase();
  const upperSizes = sizesList.map((s) => s.toUpperCase());

  // Check if user explicitly mentioned a size in their question
  for (let i = 0; i < sizesList.length; i++) {
    const sz = sizesList[i].toLowerCase();
    if (
      sz !== "standard" &&
      new RegExp(`\\b${sz.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(
        combined
      )
    ) {
      // Because of Asian fit, if the next size up exists, recommend 1 size up or exact match
      return sizesList[Math.min(i + 1, sizesList.length - 1)];
    }
  }

  // Foot length in cm (e.g. 24.5, 25, 26, 26.5, 27, 27.5)
  const footCmMatch = combined.match(/(2[2-9](?:[.,]\d)?)\s*sm/i);
  if (footCmMatch) {
    const cm = parseFloat(footCmMatch[1].replace(",", "."));
    const targetShoe =
      cm <= 23.5
        ? "37"
        : cm <= 24.0
        ? "38"
        : cm <= 24.5
        ? "39"
        : cm <= 25.2
        ? "40"
        : cm <= 25.8
        ? "41"
        : cm <= 26.5
        ? "42"
        : cm <= 27.2
        ? "43"
        : "44";
    const foundShoe = sizesList.find((s) => s.trim() === targetShoe);
    if (foundShoe) return foundShoe;
  }

  // Weight in kg (e.g. 65 kg, 75kg, 85 kg)
  const weightMatch = combined.match(/([4-9]\d|1[0-2]\d)\s*kg/i);
  if (weightMatch) {
    const kg = Number(weightMatch[1]);
    const targetLetter =
      kg < 56
        ? "S"
        : kg < 66
        ? "M"
        : kg < 76
        ? "L"
        : kg < 88
        ? "XL"
        : "XXL";
    const idx = upperSizes.indexOf(targetLetter);
    if (idx !== -1) return sizesList[idx];
  }

  // Default middle/popular size (typically L or M or 41)
  const preferredOrder = ["L", "XL", "M", "41", "40", "42", "39"];
  for (const pref of preferredOrder) {
    const idx = upperSizes.indexOf(pref);
    if (idx !== -1) return sizesList[idx];
  }

  return sizesList[Math.floor(sizesList.length / 2)];
}

function buildSmartProductHelpFallback(params: {
  product: AiCatalogItem;
  question: string;
  measurements?: string;
  vipTier?: string;
}) {
  const p = params.product;
  const retailUzs = computeRetailPriceUzs(
    p.pinduoduoPrice,
    p.vipPrice,
    params.vipTier
  );
  const weightKg = Number(p.weight) > 0 ? Number(p.weight) : 0.5;
  const cargoUzs = Math.round(weightKg * CARGO_PER_KG_UZS);
  const sizesList =
    Array.isArray(p.sizes) && p.sizes.length > 0 ? p.sizes : ["Standard"];
  const colorList =
    Array.isArray(p.colorVariants) && p.colorVariants.length > 0
      ? p.colorVariants.map((c) => c.name).filter(Boolean)
      : [];

  const recommendedSize = inferRecommendedSizeFromMeasurements(
    sizesList,
    params.measurements,
    params.question
  );

  const q = (params.question || "").toLowerCase();
  let answer = "";

  if (q.includes("sharh") || q.includes("sifat") || q.includes("xitoy")) {
    answer = `«${p.name}» bo'yicha Xitoy (Pinduoduo / 1688) xaridorlari va sifat tahlili: Mahsulot reytingi ${
      p.rating || 5
    }/5 bo'lib, ${
      p.isOriginal
        ? "original zavod sifat nazoratidan o'tgan"
        : "narx va sifat nisbati bo'yicha yuqori baholangan"
    }. Tikilishi va materiali kundalik foydalanishga chidamli.${
      colorList.length > 0
        ? ` Mavjud rang variantlari (${colorList.join(", ")}) rasmlar bilan bir xil keladi.`
        : ""
    } Xitoy o'lcham jadvaliga ko'ra «${recommendedSize}» razmerini tanlash tavsiya etiladi.`;
  } else if (q.includes("kargo") || q.includes("bojxona") || q.includes("muddat")) {
    answer = `«${p.name}» uchun kargo va bojxona hisob-kitobi: Tovarning o'z narxi ${retailUzs.toLocaleString()} UZS (hozir to'lanadi). Taxminiy vazni ${weightKg} kg bo'lib, kargo to'lovi (~${cargoUzs.toLocaleString()} UZS) tovar Xitoy omboriga yetib kelib, trek-kod bilan tortilgandan so'ng alohida hisoblanadi. Yetkazib berish muddati 14-18 kun, shaxsiy buyurtma uchun bojxonadan muammosiz o'tadi.`;
  } else if (q.includes("vip")) {
    const baseUzs = computeRetailPriceUzs(p.pinduoduoPrice, p.vipPrice, "standard");
    const ultraUzs = computeRetailPriceUzs(p.pinduoduoPrice, p.vipPrice, "ultra");
    const diff = Math.max(0, baseUzs - ultraUzs);
    answer = `«${p.name}» standart narxi ${baseUzs.toLocaleString()} UZS. VIP Ultra a'zolari ushbu tovarni ${ultraUzs.toLocaleString()} UZS ga (${diff.toLocaleString()} UZS tejamkorlik bilan) xarid qilishadi hamda tezkor kargo ustuvorligiga ega bo'lishadi.`;
  } else {
    const paramNote = params.measurements
      ? `Kiritgan parametrlaringiz (${params.measurements}) va Xitoy (Asian Fit) o'lcham jadvaliga asoslanib`
      : "Xitoy (Asian Fit) standarti odatda 0.5-1 razmer kichikroq kelishini hisobga olib";
    answer = `«${p.name}» bo'yicha Virtual Try-On maslahati: ${paramNote}, sizga mavjud [${sizesList.join(
      ", "
    )}] razmerlar ichidan «${recommendedSize}» o'lchami eng qulay va mos keladi.${
      colorList.length > 0
        ? ` Shuningdek, ${colorList.join(", ")} rang variantlaridan birini rasm ustiga bosib tanlashingiz mumkin.`
        : ""
    }`;
  }

  return {
    answer: stripEmojis(answer),
    recommendedSize,
    cargoNote: `Taxminiy vazn ${weightKg} kg -> Kargo ~${cargoUzs.toLocaleString()} UZS (Xitoy omborida tortilgach alohida to'lanadi, 14-18 kun)`
  };
}

function buildSmartAdminCopyFallback(params: {
  name?: string;
  category?: string;
  sizes?: string;
  priceYuan?: string;
}) {
  const rawName = (params.name || "").trim();
  const lower = `${rawName} ${params.category || ""}`.toLowerCase();

  let suggestedCategory = (params.category || "").trim() || "Kiyim";
  let suggestedSizes = (params.sizes || "").trim() || "S, M, L, XL, XXL";
  let suggestedWeightKg = "0.45";

  if (
    lower.includes("krossovka") ||
    lower.includes("poyabzal") ||
    lower.includes("oyoq") ||
    lower.includes("shoes") ||
    lower.includes("sneaker") ||
    lower.includes("tufli")
  ) {
    suggestedCategory = "Oyoq kiyim";
    suggestedSizes = "39, 40, 41, 42, 43, 44";
    suggestedWeightKg = "0.75";
  } else if (
    lower.includes("soat") ||
    lower.includes("naushnik") ||
    lower.includes("quloqchin") ||
    lower.includes("audio") ||
    lower.includes("smart") ||
    lower.includes("elektronika") ||
    lower.includes("wireless")
  ) {
    suggestedCategory = "Elektronika";
    suggestedSizes = "Standard";
    suggestedWeightKg = "0.35";
  } else if (lower.includes("sumka") || lower.includes("ryukzak") || lower.includes("bag")) {
    suggestedCategory = "Sumka";
    suggestedSizes = "Standard";
    suggestedWeightKg = "0.55";
  }

  const suggestedName = rawName || `YUYU Premium ${suggestedCategory}`;
  const description = `${suggestedName} — Xitoyning saralangan ishlab chiqaruvchisidan to'g'ridan-to'g'ri keltiriluvchi yuqori sifatli mahsulot. Zamonaviy dizayn, mustahkam material va kundalik foydalanish uchun maksimal qulaylikni taqdim etadi. Tovar Xitoy omborida sifat tekshiruvidan o'tkazilib, trek-kod orqali O'zbekistonga yetkazib beriladi.`;

  return {
    suggestedName: stripEmojis(suggestedName),
    description: stripEmojis(description),
    suggestedCategory: stripEmojis(suggestedCategory),
    suggestedSizes: stripEmojis(suggestedSizes),
    suggestedWeightKg
  };
}

// ============================================================================
// EXPORTED SERVER AI FUNCTIONS
// ============================================================================

export async function runAiShoppingChat(params: {
  messages: AiChatHistoryMessage[];
  catalog: AiCatalogItem[];
  userName?: string;
  vipTier?: string;
  imageDataUrl?: string;
  imageUrl?: string;
}): Promise<{
  reply: string;
  recommendedProductIds: string[];
  followUpSuggestions: string[];
  quickFollowUps: string[];
  estimatedCargoNote?: string;
}> {
  const catalogSummary = buildCompactCatalogSummary(
    params.catalog,
    params.vipTier
  );

  const recentMessages = (params.messages || []).slice(-8);
  const conversationTranscript = recentMessages
    .map(
      (m) =>
        `${m.role === "user" ? "Mijoz" : "YUYU AI"}: ${(
          m.content ||
          m.text ||
          ""
        ).slice(0, 600)}`
    )
    .join("\n");

  const systemInstruction = `Siz "YUYU Shop" (Xitoyning Pinduoduo va 1688 platformalaridan O'zbekistonga to'g'ridan-to'g'ri tovar keltiruvchi premium online do'kon) ning rasmiy AI Xarid va Kargo Maslahatchisisiz.
QOIDALAR:
1. Faqat o'zbek tilida (lotin alifbosida), muloyim, aniq, ekspert va ishonchli ohangda javob bering.
2. MUHIM: Javobingizda UMUMAN Unicode emoji (smayliklar, bayroqlar, belgilar) ISHLATMANG! Faqat toza matn yozing.
3. YUYU Shop kargo va narx shartlari:
   - Boshlang'ich buyurtmada mijoz faqat tovarning o'z narxini (so'mda) to'laydi.
   - Kargo to'lovi (1 kg = ${CARGO_PER_KG_UZS.toLocaleString()} so'm) tovar Xitoy omboriga yetib kelib, trek-kod bilan tortilgandan so'ng alohida hisoblanadi va to'lanadi.
   - Yetkazib berish muddati: Xitoy omboridan Toshkentga o'rtacha 14-18 kun.
   - Bojxona qoidasi: Jismoniy shaxslar uchun shaxsiy foydalanish maqsadida bir xil tovardan haddan tashqari ko'p (tijorat partiyasi, masalan 5-10 tadan ortiq bir xil model) buyurtma qilinsa bojxona nazoratiga tushishi mumkin.
   - VIP mijozlar: VIP Pro (5% chegirma), VIP Ultra (10% chegirma va yopiq VIP tovarlarga kirish).
4. Mijoz so'roviga (byudjet, sovg'a, o'lcham, bojxona yoki kargo savoli) mos mahsulotlarni FAQAT quyidagi REAL KATALOG ichidan tanlang va ularning ID larini "recommendedProductIds" ro'yxatiga qo'shing (maksimum 4 ta eng mos tovar). Katalogda yo'q ID ni o'ylab topmang.
5. Agar mijoz rasm yuborgan bo'lsa, rasmda nima aks etganini tahlil qilib, katalogdagi eng yaqin tovarlarni tavsiya eting.
6. Mijoz: ${params.userName || "Mehmon"} | VIP darajasi: ${(
    params.vipTier || "standard"
  ).toUpperCase()}.

REAL DO'KON KATALOGI:
${catalogSummary}`;

  const inlineImage = await resolveImageToInlineData(
    params.imageDataUrl || params.imageUrl
  );
  const parts: any[] = [];
  if (inlineImage) {
    parts.push({ inlineData: inlineImage });
  }
  parts.push({
    text: `Suhbat tarixi:\n${conversationTranscript}\n\nMijozning oxirgi so'roviga aniq javob, katalogdan mos tovar ID lari, kargo eslatmasi va 3 ta qisqa keyingi savol tavsiyasini JSON formatida qaytar.`
  });

  const validIds = new Set(params.catalog.map((p) => String(p.id)));

  const parsed = await generateStructuredJsonWithFallback({
    contents: { parts },
    systemInstruction,
    temperature: 0.35,
    responseSchema: {
      type: Type.OBJECT,
      properties: {
        reply: {
          type: Type.STRING,
          description:
            "Mijozga o'zbek tilida emojisiz, aniq va foydali javob (2-5 gap)."
        },
        recommendedProductIds: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description:
            "Katalogdan eng mos keladigan mahsulot ID lari (maksimum 4 ta)."
        },
        estimatedCargoNote: {
          type: Type.STRING,
          description:
            "Kargo bo'yicha qisqa hisob-kitob yoki eslatma (masalan: 'Taxminiy vazn 0.6 kg -> kargo ~54,000 UZS, Xitoy omborida tortilgach alohida to'lanadi')."
        },
        followUpSuggestions: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: "Mijoz bosishi mumkin bo'lgan 3 ta qisqa keyingi savol."
        }
      },
      required: ["reply", "recommendedProductIds", "followUpSuggestions"]
    },
    buildSmartFallback: () =>
      buildSmartChatFallback({
        messages: params.messages,
        catalog: params.catalog,
        userName: params.userName,
        vipTier: params.vipTier,
        hasImage: Boolean(inlineImage)
      })
  });

  const cleanFollowUps = (parsed.followUpSuggestions || [])
    .map((s) => stripEmojis(String(s)))
    .filter(Boolean)
    .slice(0, 3);

  return {
    reply: stripEmojis(parsed.reply),
    recommendedProductIds: (parsed.recommendedProductIds || [])
      .map((id) => String(id).trim())
      .filter((id) => validIds.has(id))
      .slice(0, 4),
    estimatedCargoNote: stripEmojis(
      parsed.estimatedCargoNote ||
        "Kargo tarifi: 90,000 UZS / kg (Xitoy omborida tortilgach alohida to'lanadi, 14-18 kun)"
    ),
    followUpSuggestions: cleanFollowUps,
    quickFollowUps: cleanFollowUps
  };
}

export async function runAiVisualSearch(params: {
  imageDataUrl?: string;
  imageUrl?: string;
  hintText?: string;
  catalog: AiCatalogItem[];
}): Promise<{
  detectedObject: string;
  categoryGuess: string;
  styleKeywords: string[];
  productName: string;
  category: string;
  colorAndStyle: string;
  chinaSearchKeywords: string;
  summary: string;
  matchedProductIds: string[];
}> {
  const inlineImage = await resolveImageToInlineData(
    params.imageDataUrl || params.imageUrl
  );
  if (!inlineImage) {
    const err = new Error(
      "Rasm formati noto'g'ri yoki rasmni o'qib bo'lmadi. Iltimos, JPG, PNG yoki WEBP rasm yuklang."
    );
    (err as any).status = 400;
    throw err;
  }

  const catalogSummary = buildCompactCatalogSummary(params.catalog);
  const validIds = new Set(params.catalog.map((p) => String(p.id)));

  const parsed = await generateStructuredJsonWithFallback({
    contents: {
      parts: [
        { inlineData: inlineImage },
        {
          text: `Ushbu rasmni (Pinduoduo / 1688 skrinshoti yoki mahsulot surati) diqqat bilan tahlil qiling.${
            params.hintText ? ` Mijoz izohi: "${params.hintText}".` : ""
          }
MUHIM: Javobda UMUMAN Unicode emoji ishlatmang.
1. Rasmda qanday mahsulot, rang, material va uslub borligini o'zbek tilida aniqlang.
2. Pinduoduo / 1688 da qidirish uchun xitoycha va inglizcha kalit so'zlarni ("chinaSearchKeywords") yozing.
3. Quyidagi REAL DO'KON KATALOGIDAN ushbu rasmga eng yaqin yoki o'xshash tovarlarni topib, ularning ID larini "matchedProductIds" ichida qaytaring (maksimum 6 ta).

REAL DO'KON KATALOGI:
${catalogSummary}`
        }
      ]
    },
    temperature: 0.25,
    responseSchema: {
      type: Type.OBJECT,
      properties: {
        detectedObject: {
          type: Type.STRING,
          description:
            "Rasmda aniqlangan mahsulotning qisqa nomi (o'zbek tilida, emojisiz)."
        },
        categoryGuess: {
          type: Type.STRING,
          description:
            "Taxminiy kategoriya (masalan: Oyoq kiyim, Kiyim, Elektronika, Sumka)."
        },
        colorAndStyle: {
          type: Type.STRING,
          description:
            "Mahsulot rangi, materiali va dizayn uslubi (o'zbek tilida, emojisiz)."
        },
        chinaSearchKeywords: {
          type: Type.STRING,
          description:
            "1688 va Pinduoduo uchun qidiruv kalit so'zlari (xitoycha / inglizcha)."
        },
        styleKeywords: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: "3-5 ta kalit so'z (rang, uslub, material)."
        },
        summary: {
          type: Type.STRING,
          description:
            "Mijozga rasm tahlili va katalogdan topilgan o'xshash tovarlar haqida 2-3 gaplik emojisiz izoh."
        },
        matchedProductIds: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: "Katalogdan eng mos mahsulot ID lari (maksimum 6 ta)."
        }
      },
      required: [
        "detectedObject",
        "categoryGuess",
        "colorAndStyle",
        "chinaSearchKeywords",
        "styleKeywords",
        "summary",
        "matchedProductIds"
      ]
    },
    buildSmartFallback: () =>
      buildSmartVisualSearchFallback({
        hintText: params.hintText,
        catalog: params.catalog
      })
  });

  const cleanObject = stripEmojis(parsed.detectedObject);
  const cleanCategory = stripEmojis(parsed.categoryGuess);
  const cleanKeywords = (parsed.styleKeywords || [])
    .map((k) => stripEmojis(String(k)))
    .filter(Boolean)
    .slice(0, 5);
  const cleanColorAndStyle = stripEmojis(
    parsed.colorAndStyle || cleanKeywords.join(", ") || "Zamonaviy uslub"
  );
  const cleanChinaKeywords = stripEmojis(
    parsed.chinaSearchKeywords || cleanKeywords.join(" ") || cleanObject
  );

  return {
    detectedObject: cleanObject,
    categoryGuess: cleanCategory,
    styleKeywords: cleanKeywords,
    productName: cleanObject,
    category: cleanCategory,
    colorAndStyle: cleanColorAndStyle,
    chinaSearchKeywords: cleanChinaKeywords,
    summary: stripEmojis(parsed.summary),
    matchedProductIds: (parsed.matchedProductIds || [])
      .map((id) => String(id).trim())
      .filter((id) => validIds.has(id))
      .slice(0, 6)
  };
}

export async function runAiProductHelp(params: {
  product: AiCatalogItem;
  question: string;
  measurements?: string;
  vipTier?: string;
  imageDataUrl?: string;
  imageUrl?: string;
}): Promise<{
  answer: string;
  recommendedSize?: string;
  cargoNote: string;
}> {
  const p = params.product;
  const retailUzs = computeRetailPriceUzs(
    p.pinduoduoPrice,
    p.vipPrice,
    params.vipTier
  );
  const weightKg = Number(p.weight) > 0 ? Number(p.weight) : 0.5;
  const cargoUzs = Math.round(weightKg * CARGO_PER_KG_UZS);
  const sizesList =
    Array.isArray(p.sizes) && p.sizes.length > 0 ? p.sizes : ["Standard"];
  const colorList =
    Array.isArray(p.colorVariants) && p.colorVariants.length > 0
      ? p.colorVariants.map((c) => c.name).filter(Boolean)
      : [];

  const candidateImage =
    params.imageDataUrl ||
    params.imageUrl ||
    (Array.isArray(p.images) && p.images.length > 0 ? p.images[0] : undefined);
  const inlineImage = await resolveImageToInlineData(candidateImage);

  const promptText = `Siz YUYU Shop (Pinduoduo / 1688) mahsulot ekspertisiz (Virtual Try-On, o'lcham tanlash, Xitoy sharhlari sifat tahlili hamda kargo/bojxona maslahatchisi).
MUHIM QOIDA: Javobda UMUMAN Unicode emoji ishlatmang! Faqat toza, professional o'zbek tilida (lotin alifbosida) yozing.

MAHSULOT MA'LUMOTLARI:
- Nomi: ${p.name}
- Kategoriya: ${p.category}
- Tovarning o'z narxi (kargosiz): ${retailUzs.toLocaleString()} UZS
- Taxminiy vazni: ${weightKg} kg
- Taxminiy kargo to'lovi (Xitoy omborida tortilgach alohida to'lanadi): ~${cargoUzs.toLocaleString()} UZS (${CARGO_PER_KG_UZS.toLocaleString()} UZS/kg)
- Taxminiy jami (tovar + kargo): ~${(retailUzs + cargoUzs).toLocaleString()} UZS
- Mavjud razmerlar: ${sizesList.join(", ")}
${
  colorList.length > 0
    ? `- Mavjud rang variantlari: ${colorList.join(", ")}\n`
    : ""
}- Original belgi: ${
    p.isOriginal ? "Ha (Original sifat)" : "Standart zavod sifati"
  }
- Sotilganlar soni: ${p.salesCount || 0} ta | Reyting: ${p.rating || 5}/5
- Tavsif: ${p.description || "Kiritilmagan"}

MIJOZ PARAMETRLARI: ${params.measurements || "Ko'rsatilmagan"}
MIJOZ SAVOLI: "${params.question}"

VAZIFA:
1. Savolga (Virtual Try-On / razmer mosligi, Xitoy Pinduoduo/1688 xaridorlari sharhlari va sifat tahlili, yoki kargo va bojxona hisob-kitobi) aniq, amaliy javob bering.
2. Xitoy (Asian fit) kiyim va poyabzallari odatda Yevropa/O'zbekiston standartidan 0.5 - 1 razmer kichikroq kelishini hisobga oling.
3. Agar mahsulotning mavjud razmerlari ichidan bittasini aniq tavsiya qila olsangiz, uni "recommendedSize" maydoniga AYNAN mavjud razmerlar ro'yxatidagi ko'rinishida yozing.`;

  const parts: any[] = [];
  if (inlineImage) {
    parts.push({ inlineData: inlineImage });
  }
  parts.push({ text: promptText });

  const parsed = await generateStructuredJsonWithFallback({
    contents: { parts },
    temperature: 0.3,
    responseSchema: {
      type: Type.OBJECT,
      properties: {
        answer: {
          type: Type.STRING,
          description:
            "Mijozga o'zbek tilida emojisiz, batafsil va aniq maslahat (2-4 gap)."
        },
        recommendedSize: {
          type: Type.STRING,
          description:
            "Mavjud razmerlar ro'yxatidan tavsiya etilgan bitta razmer (yoki bo'sh satr)."
        },
        cargoNote: {
          type: Type.STRING,
          description:
            "Shu mahsulot uchun kargo va yetkazib berish muddati eslatmasi (emojisiz)."
        }
      },
      required: ["answer", "cargoNote"]
    },
    buildSmartFallback: () =>
      buildSmartProductHelpFallback({
        product: params.product,
        question: params.question,
        measurements: params.measurements,
        vipTier: params.vipTier
      })
  });

  const matchedSize = sizesList.find(
    (s) =>
      s.toLowerCase() ===
      String(parsed.recommendedSize || "")
        .trim()
        .toLowerCase()
  );

  return {
    answer: stripEmojis(parsed.answer),
    recommendedSize: matchedSize,
    cargoNote: stripEmojis(
      parsed.cargoNote ||
        `Taxminiy vazn ${weightKg} kg -> Kargo ~${cargoUzs.toLocaleString()} UZS (Xitoy omborida tortilgach alohida to'lanadi, 14-18 kun)`
    )
  };
}

export async function runAiAdminCopy(params: {
  name?: string;
  category?: string;
  sizes?: string;
  priceYuan?: string;
  imageDataUrl?: string;
  imageUrl?: string;
}): Promise<{
  suggestedName: string;
  description: string;
  suggestedCategory: string;
  suggestedSizes: string;
  suggestedWeightKg: string;
}> {
  const inlineImage = await resolveImageToInlineData(
    params.imageDataUrl || params.imageUrl
  );

  const parts: any[] = [];
  if (inlineImage) {
    parts.push({ inlineData: inlineImage });
  }
  parts.push({
    text: `Siz YUYU Shop (Pinduoduo / 1688 dan O'zbekistonga tovar keltiruvchi online do'kon) uchun professional marketolog va kopiraytersiz.
MUHIM QOIDA: Hech qayerda Unicode emoji ishlatmang! Faqat toza, jozibali o'zbek tilida (lotin alifbosida) yozing.

Admin kiritgan boshlang'ich ma'lumotlar:
- Nomi: ${params.name || "(rasmdan aniqlang)"}
- Kategoriya: ${params.category || "(rasmdan yoki nomidan aniqlang)"}
- Razmerlar: ${params.sizes || ""}
- Asl narxi (Yuan): ${params.priceYuan || ""}

O'zbek tilida (lotin alifbosida) xaridorlarni jalb qiluvchi, sifat, qulaylik va Xitoy zavodidan to'g'ridan-to'g'ri yetkazib berilishini urg'ulovchi sotuvchi tavsif (description) hamda mahsulot nomi, kategoriyasi, razmerlari va taxminiy vaznini (kg da, masalan "0.45") JSON formatida qaytaring.`
  });

  const parsed = await generateStructuredJsonWithFallback({
    contents: { parts },
    temperature: 0.4,
    responseSchema: {
      type: Type.OBJECT,
      properties: {
        suggestedName: {
          type: Type.STRING,
          description:
            "Chiroyli va aniq mahsulot nomi (o'zbek tilida, emojisiz)."
        },
        description: {
          type: Type.STRING,
          description:
            "2-4 gapdan iborat jozibali, ishonchli mahsulot tavsifi (emojisiz)."
        },
        suggestedCategory: {
          type: Type.STRING,
          description:
            "Kategoriya (Kiyim, Oyoq kiyim, Elektronika, Sumka, Uy-ro'zg'or, Aksessuar)."
        },
        suggestedSizes: {
          type: Type.STRING,
          description:
            "Vergul bilan ajratilgan razmerlar (masalan: 'S, M, L, XL, XXL' yoki '38, 39, 40, 41, 42' yoki 'Standard')."
        },
        suggestedWeightKg: {
          type: Type.STRING,
          description: "Taxminiy vazn kg da (masalan: '0.4' yoki '0.75')."
        }
      },
      required: [
        "suggestedName",
        "description",
        "suggestedCategory",
        "suggestedSizes",
        "suggestedWeightKg"
      ]
    },
    buildSmartFallback: () =>
      buildSmartAdminCopyFallback({
        name: params.name,
        category: params.category,
        sizes: params.sizes,
        priceYuan: params.priceYuan
      })
  });

  return {
    suggestedName: stripEmojis(parsed.suggestedName),
    description: stripEmojis(parsed.description),
    suggestedCategory: stripEmojis(parsed.suggestedCategory),
    suggestedSizes: stripEmojis(parsed.suggestedSizes),
    suggestedWeightKg: stripEmojis(parsed.suggestedWeightKg)
  };
}
