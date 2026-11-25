import { NextRequest, NextResponse } from "next/server";
import { verifyNextAdminDevice } from "@/lib/adminAuth";
import {
  ALLOWED_R2_MIME_TYPES,
  createR2PresignedUploadUrl,
  isR2Configured,
  sanitizeR2Folder,
} from "@/lib/r2";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ADMIN_ONLY_FOLDERS = new Set(["products", "banners"]);

/**
 * Generates a short-lived Cloudflare R2 presigned PUT URL so browsers can upload
 * large media directly to R2 without hitting Vercel's 4.5MB serverless body limit.
 */
export async function POST(request: NextRequest) {
  try {
    if (!isR2Configured()) {
      return NextResponse.json(
        {
          error:
            "Cloudflare R2 sozlanmagan. R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY va R2_BUCKET_NAME muhit o'zgaruvchilarini sozlang.",
        },
        { status: 503 }
      );
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Noto'g'ri JSON so'rov" }, { status: 400 });
    }

    const contentType = String(body.contentType || "").toLowerCase().trim();
    if (!ALLOWED_R2_MIME_TYPES[contentType]) {
      return NextResponse.json(
        { error: `Ruxsat etilmagan fayl turi: ${contentType || "noma'lum"}` },
        { status: 400 }
      );
    }

    const folder = sanitizeR2Folder(String(body.folder || "general"));
    if (ADMIN_ONLY_FOLDERS.has(folder)) {
      const adminDevice = await verifyNextAdminDevice(request);
      if (!adminDevice) {
        return NextResponse.json(
          { error: "Ushbu bo'lim uchun admin ruxsati talab qilinadi" },
          { status: 403 }
        );
      }
    }

    const filename = typeof body.filename === "string" ? body.filename : undefined;
    const expiresIn = Number(body.expiresIn) || 300;

    const presigned = await createR2PresignedUploadUrl({
      contentType,
      folder,
      filename,
      expiresIn,
    });

    return NextResponse.json({
      success: true,
      ...presigned,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Presigned URL yaratishda xatolik" },
      { status: 500 }
    );
  }
}
