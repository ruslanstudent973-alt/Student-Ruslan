import { GoogleGenAI, ThinkingLevel, Type } from "@google/genai";

const MODEL_NAME = "gemini-4-hydrogen";
const VERTEX_FALLBACK_MODEL = "gemini-3.1-flash-lite";
const MARKUP_RATE = 1.65;
const CURRENCY_RATE = 1850;
const USD_RATE = 12800;
const CARGO_RATE_USD = 6.5;

export interface AiCatalogItem {
  id: string;
  name: string;
  category: string;
  description: string;
  pinduoduoPrice: number;
  oldPrice?: number;
  vipPrice?: number;
  isVipOnly?: boolean;
  sizes?: string[];
  weight?: number;
  rating?: number;
  salesCount?: number;
  isOriginal?: boolean;
  isCheapPrice?: boolean;
}

export interface AiChatMessageInput {
  role: "user" | "assistant";
  text: string;
}

function detectKeyMode(apiKey: string): "vertex_express" | "gemini_dev" | "custom" {
  if (apiKey.startsWith("AQ.")) return "vertex_express";
  if (apiKey.startsWith("AIza")) return "gemini_dev";
  return "custom";
}

function getGeminiClient(): { ai: GoogleGenAI; keyMode: "vertex_express" | "gemini_dev" | "custom" } {
  const apiKey = (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "").trim();
  if (!apiKey) {
    const err: any = new Error(
      "GEMINI_API_KEY sozlanmagan. Iltimos, Settings > Secrets bo'limida Gemini API kalitingizni qo'shing."
    );
    err.status = 503;
    throw err;
  }

  const keyMode = detectKeyMode(apiKey);
  const ai = new GoogleGenAI({
    ...(keyMode === "vertex_express" ? { vertexai: true } : {}),
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build"
      }
    }
  });
  return { ai, keyMode };
}

function parseJsonSafe(rawText: string | undefined): any {
  const text = String(rawText || "{}").trim();
  const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  return JSON.parse(cleaned || "{}");
}

function normalizeGeminiError(err: any, keyMode?: string): { status: number; message: string } {
  const rawMsg = String(err?.message || err || "");
  const code = Number(err?.status || err?.code || 0);

  if (code === 503 && rawMsg.includes("GEMINI_API_KEY")) {
    return { status: 503, message: rawMsg };
  }
  console.error(`[Gemini AI Error] mode=${keyMode || "unknown"} status=${code}`, rawMsg.slice(0, 400));

  if (
    code === 401 ||
    code === 403 ||
    /API_KEY_INVALID|PERMISSION_DENIED|UNAUTHENTICATED|API key not valid|invalid api key|API_KEY_SERVICE_BLOCKED/i.test(
      rawMsg
    )
  ) {
    return {
      status: 403,
      message:
        "Gemini API kaliti yaroqsiz yoki ruxsat berilmagan. Iltimos, Settings > Secrets (yoki Vercel Environment Variables) bo'limida GEMINI_API_KEY qiymatini yangilang."
    };
  }
  if (code === 429 || /RESOURCE_EXHAUSTED|quota|rate limit/i.test(rawMsg)) {
    return {
      status: 429,
      message:
        "AI so'rovlar limiti vaqtincha tugadi. Biroz kuting yoki Settings > Secrets bo'limida billing yoqilgan kalit tanlang."
    };
  }
  if (code === 404 || /NOT_FOUND/i.test(rawMsg)) {
    return {
      status: 404,
      message: "AI modeli ushbu API kalit uchun topilmadi. Iltimos, kalit ruxsatlarini tekshiring."
    };
  }
  if (code === 400) {
    return {
      status: 400,
      message: "AI so'rovini qayta ishlashda xatolik yuz berdi. Iltimos, savol yoki rasmni qayta yuborib ko'ring."
    };
  }
  return {
    status: code >= 400 && code < 600 ? code : 500,
    message: rawMsg || "AI xizmati bilan bog'lanishda kutilmagan xatolik yuz berdi."
  };
}

async function generateStructuredJson(
  ai: GoogleGenAI,
  keyMode: "vertex_express" | "gemini_dev" | "custom",
  params: {
    contents: any;
    systemInstruction: string;
    responseSchema: any;
  }
): Promise<any> {
  const callModel = async (model: string, includeThinking: boolean) => {
    const config: any = {
      systemInstruction: params.systemInstruction,
      responseMimeType: "application/json",
      responseSchema: params.responseSchema
    };
    if (includeThinking) {
      config.thinkingConfig = { thinkingLevel: ThinkingLevel.LOW };
    }
    const response = await ai.models.generateContent({
      model,
      contents: params.contents,
      config
    });
    return parseJsonSafe(response.text);
  };

  try {
    return await callModel(MODEL_NAME, true);
  } catch (err: any) {
    const rawMsg = String(err?.message || err || "");
    const code = Number(err?.status || err?.code || 0);
    if (keyMode === "vertex_express" && (code === 404 || /NOT_FOUND/i.test(rawMsg))) {
      return await callModel(VERTEX_FALLBACK_MODEL, false);
    }
    throw err;
  }
}

async function withRetry<T>(fn: () => Promise<T>, keyMode?: string, maxAttempts = 2): Promise<T> {
  let lastErr: any;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      lastErr = err;
      const normalized = normalizeGeminiError(err, keyMode);
      if (normalized.status >= 400 && normalized.status < 500) {
        const clientErr: any = new Error(normalized.message);
        clientErr.status = normalized.status;
        throw clientErr;
      }
      if (attempt < maxAttempts - 1) {
        await new Promise((r) => setTimeout(r, 700 * (attempt + 1)));
      }
    }
  }
  const normalized = normalizeGeminiError(lastErr, keyMode);
  const finalErr: any = new Error(normalized.message);
  finalErr.status = normalized.status;
  throw finalErr;
}

function parseDataUrl(dataUrl: string): { mimeType: string; data: string } | null {
  if (!dataUrl || typeof dataUrl !== "string") return null;
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;
  return {
    mimeType: match[1] || "image/jpeg",
    data: match[2]
  };
}

function computeProductUzsPrice(p: AiCatalogItem): number {
  return Math.round((Number(p.pinduoduoPrice) || 0) * MARKUP_RATE * CURRENCY_RATE);
}

function buildCompactCatalogSummary(catalog: AiCatalogItem[]): string {
  if (!catalog.length) {
    return "Hozircha katalogda mahsulotlar mavjud emas. Mijozga 'Rasm orqali maxsus buyurtma' bo'limini taklif qiling.";
  }
  return catalog
    .slice(0, 80)
    .map((p) => {
      const uzs = computeProductUzsPrice(p);
      const vipPart = p.vipPrice ? `, VIP: ${p.vipPrice.toLocaleString("en-US")} so'm` : "";
      const sizes = Array.isArray(p.sizes) && p.sizes.length ? p.sizes.join("/") : "Standart";
      const weight = p.weight ? `${p.weight}kg` : "0.5kg";
      const desc = String(p.description || "").slice(0, 120);
      return `[ID:${p.id}] ${p.name} | Kat: ${p.category} | Narx: ${uzs.toLocaleString("en-US")} so'm${vipPart} | O'lchamlar: ${sizes} | Vazn: ${weight} | Reyting: ${p.rating || 4.8} | Sotilgan: ${p.salesCount || 0} | ${desc}`;
    })
    .join("\n");
}

const SHOP_POLICY_PROMPT = `
Sen YUYU Shop onlayn do'konining rasmiy AI Maslahatchisisan.
MUHIM QOIDALAR:
- Faqat o'zbek tilida (lotin alifbosida) javob ber.
- Ohang: samimiy, xushmuomala, halol va jonli do'kon sotuvchisi uslubida ("Assalomu alaykum!", "Sizga bajonidil yordam beraman", "Marhamat").
- YUYU Shop Xitoyning 1688, Taobao va Pinduoduo platformalaridan tovar olib keladi.
- Yetkazib berish muddati: odatda 7-15 kun. Kargo narxi: 1 kg uchun taxminan ${CARGO_RATE_USD}$ (~${Math.round(CARGO_RATE_USD * USD_RATE).toLocaleString("en-US")} so'm).
- VIP tizimi: SILVER (3% keshbek), GOLD (5% keshbek + 50% yetkazish chegirmasi + VIP narxlar), DIAMOND (10% keshbek + bepul yetkazish + VIP narxlar). Oylik VIP obuna: 39 000 so'm.
- Agar mijoz izlagan narsa katalogda yo'q bo'lsa, uni aldamasdan samimiy aytib, "Rasm orqali maxsus buyurtma" bo'limidan rasm yuborib Xitoydan topib berishimiz mumkinligini tushuntir.
- Javoblaring ixcham, aniq, foydali va o'qishga qulay bo'lsin (ortiqcha cho'zma).
`.trim();

export async function runAiShoppingChat(params: {
  messages: AiChatMessageInput[];
  catalog: AiCatalogItem[];
  userName?: string;
  vipTier?: string;
  imageDataUrl?: string;
}) {
  const { ai, keyMode } = getGeminiClient();
  const catalogSummary = buildCompactCatalogSummary(params.catalog);
  const validIds = new Set(params.catalog.map((p) => p.id));

  const recentHistory = (params.messages || [])
    .slice(-10)
    .map((m) => `${m.role === "user" ? "Mijoz" : "AI Maslahatchi"}: ${String(m.text || "").slice(0, 800)}`)
    .join("\n");

  const systemInstruction = `${SHOP_POLICY_PROMPT}

FOYDALANUVCHI MA'LUMOTI:
- Ismi: ${params.userName || "Mehmon"}
- VIP darajasi: ${params.vipTier || "NONE"}

DO'KONDAGI MAVJUD MAHSULOTLAR KATALOGI:
${catalogSummary}

KO'RSATMA:
- Mijozning oxirgi savoliga samimiy o'zbek tilida javob yoz.
- Faqat yuqoridagi katalogda REAL mavjud bo'lgan mahsulotlarning ID larini "recommendedProductIds" massiviga qo'sh (maksimum 3 ta eng mos mahsulot). Agar mos mahsulot bo'lmasa bo'sh [] qaytar.
- "quickFollowUps" ichiga mijoz keyin bosishi mumkin bo'lgan 2-3 ta qisqa o'zbekcha savol taklifini qo'sh (har biri 3-6 so'z).`;

  const parts: any[] = [];
  if (params.imageDataUrl) {
    const parsed = parseDataUrl(params.imageDataUrl);
    if (parsed) {
      parts.push({
        inlineData: {
          mimeType: parsed.mimeType,
          data: parsed.data
        }
      });
    }
  }
  parts.push({
    text: `Suhbat tarixi:\n${recentHistory || "Mijoz: Salom"}\n\nMijozning oxirgi murojaatiga javob bering.`
  });

  return withRetry(async () => {
    const parsed = await generateStructuredJson(ai, keyMode, {
      contents: { parts },
      systemInstruction,
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          reply: {
            type: Type.STRING,
            description: "Samimiy o'zbekcha javob matni"
          },
          recommendedProductIds: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "Katalogdan mos mahsulot ID lari (0-3 ta)"
          },
          quickFollowUps: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "2-3 ta qisqa davomiy savol takliflari"
          }
        },
        required: ["reply", "recommendedProductIds", "quickFollowUps"]
      }
    });

    const recommendedProductIds = Array.isArray(parsed.recommendedProductIds)
      ? parsed.recommendedProductIds.filter((id: any) => typeof id === "string" && validIds.has(id)).slice(0, 3)
      : [];
    const quickFollowUps = Array.isArray(parsed.quickFollowUps)
      ? parsed.quickFollowUps.filter((s: any) => typeof s === "string" && s.trim()).slice(0, 3)
      : [];

    return {
      reply: String(parsed.reply || "Assalomu alaykum! Sizga qanday mahsulot topishda yordam beray?"),
      recommendedProductIds,
      quickFollowUps
    };
  }, keyMode);
}

export async function runAiVisualSearch(params: {
  imageDataUrl: string;
  hintText?: string;
  catalog: AiCatalogItem[];
}) {
  const parsedImg = parseDataUrl(params.imageDataUrl);
  if (!parsedImg) {
    const err: any = new Error("Rasm formati noto'g'ri. Iltimos, JPG, PNG yoki WEBP rasm yuklang.");
    err.status = 400;
    throw err;
  }

  const { ai, keyMode } = getGeminiClient();
  const catalogSummary = buildCompactCatalogSummary(params.catalog);
  const validIds = new Set(params.catalog.map((p) => p.id));

  const systemInstruction = `${SHOP_POLICY_PROMPT}

VAZIFA: Mijoz yuklagan rasmdagi tovarni aniq tahlil qil va YUYU Shop katalogidagi o'xshash mahsulotlar bilan solishtir.

DO'KONDAGI MAVJUD MAHSULOTLAR:
${catalogSummary}

QOIDALAR:
- Rasmdagi asosiy tovar nomi, kategoriyasi, rangi/uslubi va 1688/Taobao/Pinduoduo da qidirish uchun mos kalit so'zlarni aniqlab ber.
- Agar katalogda o'xshash yoki aynan shu turdagi mahsulotlar bo'lsa, ularning ID larini eng mosidan boshlab "matchedProductIds" ga kirit (maksimum 4 ta).
- Agar katalogda o'xshash mahsulot yo'q bo'lsa, "matchedProductIds" ni [] qilib qaytar va "summary" da ushbu tovarni "Rasm orqali maxsus buyurtma" orqali Xitoydan keltirib berishimiz mumkinligini samimiy tushuntir.`;

  const promptText = params.hintText?.trim()
    ? `Ushbu rasmdagi mahsulotni aniqlang va katalogdan o'xshashlarini toping. Mijoz izohi: ${params.hintText.trim()}`
    : "Ushbu rasmdagi mahsulotni aniqlang va katalogimizdan eng mos o'xshash tovarlarni toping.";

  return withRetry(async () => {
    const parsed = await generateStructuredJson(ai, keyMode, {
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: parsedImg.mimeType,
              data: parsedImg.data
            }
          },
          { text: promptText }
        ]
      },
      systemInstruction,
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          productName: { type: Type.STRING, description: "Rasmdagi mahsulotning aniq nomi (o'zbekcha)" },
          category: { type: Type.STRING, description: "Mahsulot kategoriyasi" },
          colorAndStyle: { type: Type.STRING, description: "Rangi, materiali va uslubi" },
          chinaSearchKeywords: { type: Type.STRING, description: "1688/Taobao uchun qisqa qidiruv so'zlari" },
          summary: { type: Type.STRING, description: "Mijozga samimiy o'zbekcha xulosa va maslahat" },
          matchedProductIds: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "Katalogdan mos kelgan mahsulot ID lari"
          }
        },
        required: ["productName", "category", "colorAndStyle", "chinaSearchKeywords", "summary", "matchedProductIds"]
      }
    });

    const matchedProductIds = Array.isArray(parsed.matchedProductIds)
      ? parsed.matchedProductIds.filter((id: any) => typeof id === "string" && validIds.has(id)).slice(0, 4)
      : [];

    return {
      productName: String(parsed.productName || "Aniqlangan mahsulot"),
      category: String(parsed.category || "Boshqa"),
      colorAndStyle: String(parsed.colorAndStyle || "Zamonaviy uslub"),
      chinaSearchKeywords: String(parsed.chinaSearchKeywords || ""),
      summary: String(parsed.summary || "Rasm muvaffaqiyatli tahlil qilindi."),
      matchedProductIds
    };
  }, keyMode);
}

export async function runAiProductHelp(params: {
  product: AiCatalogItem;
  question: string;
  measurements?: string;
  vipTier?: string;
}) {
  const { ai, keyMode } = getGeminiClient();
  const uzsPrice = computeProductUzsPrice(params.product);
  const weightKg = Number(params.product.weight) || 0.5;
  const estCargoUzs = Math.round(weightKg * CARGO_RATE_USD * USD_RATE);
  const sizesList =
    Array.isArray(params.product.sizes) && params.product.sizes.length > 0
      ? params.product.sizes
      : ["Standard"];

  const systemInstruction = `${SHOP_POLICY_PROMPT}

MAHSULOT HAQIDA ANIQ MA'LUMOT:
- Nomi: ${params.product.name}
- Kategoriya: ${params.product.category}
- Oddiy narx: ${uzsPrice.toLocaleString("en-US")} so'm
- VIP narx: ${params.product.vipPrice ? `${params.product.vipPrice.toLocaleString("en-US")} so'm` : "Oddiy narxda (VIP keshbek ishlaydi)"}
- Mavjud o'lcham/variantlar: ${sizesList.join(", ")}
- Taxminiy vazni: ${weightKg} kg (taxminiy kargo: ~${estCargoUzs.toLocaleString("en-US")} so'm)
- Tavsif: ${params.product.description || "Tavsif kiritilmagan"}
- Original: ${params.product.isOriginal ? "Ha" : "Standart sifat"}
- Mijoz VIP darajasi: ${params.vipTier || "NONE"}

VAZIFA:
- Mijozning aynan shu mahsulot haqidagi savoliga (o'lcham tanlash, kargo/yetkazib berish, sifat, VIP foyda) aniq va samimiy o'zbek tilida javob ber.
- Agar o'lcham so'ralgan bo'lsa va mijoz o'lcham/bo'y/vazn bergan bo'lsa, mavjud variantlar (${sizesList.join(", ")}) ichidan eng mosini "recommendedSize" maydoniga yoz (aks holda bo'sh "" qoldir). Xitoy kiyim/oyoq kiyimlari ba'zan kichikroq (malomerka) kelishini hisobga ol.`;

  const userPrompt = [
    `Savol: ${params.question.trim()}`,
    params.measurements?.trim() ? `Mijoz parametrlari: ${params.measurements.trim()}` : ""
  ]
    .filter(Boolean)
    .join("\n");

  return withRetry(async () => {
    const parsed = await generateStructuredJson(ai, keyMode, {
      contents: userPrompt,
      systemInstruction,
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          answer: {
            type: Type.STRING,
            description: "Samimiy, aniq o'zbekcha javob"
          },
          recommendedSize: {
            type: Type.STRING,
            description: "Mavjud variantlardan tavsiya qilingan o'lcham yoki bo'sh satr"
          },
          cargoNote: {
            type: Type.STRING,
            description: "Qisqa kargo/yetkazish eslatmasi (1 qator)"
          }
        },
        required: ["answer", "recommendedSize", "cargoNote"]
      }
    });

    const recSize = String(parsed.recommendedSize || "").trim();
    const matchedSize = sizesList.find((s) => s.toLowerCase() === recSize.toLowerCase()) || "";

    return {
      answer: String(parsed.answer || "Ushbu mahsulot bo'yicha qo'shimcha ma'lumot berishga tayyorman!"),
      recommendedSize: matchedSize,
      cargoNote: String(
        parsed.cargoNote ||
          `Vazni ~${weightKg} kg · Yetkazib berish 7–15 kun · Kargo ~${estCargoUzs.toLocaleString("en-US")} so'm`
      )
    };
  }, keyMode);
}

export async function runAiAdminCopy(params: {
  name?: string;
  category?: string;
  sizes?: string;
  priceYuan?: string;
  imageDataUrl?: string;
}) {
  const { ai, keyMode } = getGeminiClient();

  const systemInstruction = `Sen YUYU Shop e-commerce do'konining tajribali kontent-marketologisan.
VAZIFA: Admin kiritgan mahsulot nomi, kategoriyasi va/yoki yuklangan rasmi asosida sotuvbop, ishonchli va chiroyli o'zbekcha (lotin alifbosida) mahsulot kartochkasi matnini tayyorla.
QOIDALAR:
- Faqat o'zbek tilida (lotin yozuvi), samimiy va professional uslubda yoz.
- Tavsif (description) 2-4 ta aniq jumladan iborat bo'lsin: asosiy afzalliklar, material/sifat va kimlar uchun mosligi. Ortiqcha emoji yoki mubolag'a ishlatma.
- Agar nom berilmagan, faqat rasm berilgan bo'lsa, rasm asosida chiroyli mahsulot nomi ham taklif qil.
- Kategoriya uchun o'zbekcha aniq nom tanla (masalan: "Elektronika", "Oyoq kiyim", "Kiyim", "Gadjeytlar", "Aksessuarlar", "Uy-ro'zg'or", "Go'zallik").
- O'lcham/variantlarni vergul bilan ajratilgan satr qilib ber (masalan: "S, M, L, XL" yoki "39, 40, 41, 42, 43, 44" yoki "Oq, Qora").`;

  const parts: any[] = [];
  if (params.imageDataUrl) {
    const parsedImg = parseDataUrl(params.imageDataUrl);
    if (parsedImg) {
      parts.push({
        inlineData: {
          mimeType: parsedImg.mimeType,
          data: parsedImg.data
        }
      });
    }
  }

  parts.push({
    text: [
      `Mahsulot nomi: ${params.name?.trim() || "(rasmdan aniqlang)"}`,
      params.category?.trim() ? `Kiritilgan kategoriya: ${params.category.trim()}` : "",
      params.sizes?.trim() ? `Mavjud variantlar: ${params.sizes.trim()}` : "",
      params.priceYuan?.trim() ? `Xitoy narxi (Yuan): ${params.priceYuan.trim()}` : "",
      "Shu ma'lumotlar asosida sotuvbop o'zbekcha tavsif, kategoriya, variantlar va taxminiy vazn (kg) taklifini tayyorlang."
    ]
      .filter(Boolean)
      .join("\n")
  });

  return withRetry(async () => {
    const parsed = await generateStructuredJson(ai, keyMode, {
      contents: { parts },
      systemInstruction,
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          suggestedName: { type: Type.STRING, description: "Mahsulot nomi" },
          description: { type: Type.STRING, description: "Sotuvbop o'zbekcha mahsulot tavsifi" },
          suggestedCategory: { type: Type.STRING, description: "Mos kategoriya nomi" },
          suggestedSizes: { type: Type.STRING, description: "Vergul bilan ajratilgan variantlar/o'lchamlar" },
          suggestedWeightKg: { type: Type.STRING, description: "Taxminiy vazn kg da, masalan 0.4 yoki 1.2" }
        },
        required: ["suggestedName", "description", "suggestedCategory", "suggestedSizes", "suggestedWeightKg"]
      }
    });

    return {
      suggestedName: String(parsed.suggestedName || params.name || "").trim(),
      description: String(parsed.description || "").trim(),
      suggestedCategory: String(parsed.suggestedCategory || params.category || "Boshqa").trim(),
      suggestedSizes: String(parsed.suggestedSizes || params.sizes || "Standard").trim(),
      suggestedWeightKg: String(parsed.suggestedWeightKg || "0.5").trim()
    };
  }, keyMode);
}
