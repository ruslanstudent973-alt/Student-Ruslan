import { NextRequest, NextResponse } from "next/server";
import { verifyNextAdminDevice } from "@/lib/adminAuth";
import {
  ALLOWED_R2_MIME_TYPES,
  getMaxSizeForMime,
  isR2Configured,
  sanitizeR2Folder,
  uploadToR2,
} from "@/lib/r2";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ADMIN_ONLY_FOLDERS = new Set(["products", "banners"]);

export async function POST(request: NextRequest) {
  try {
    if (!isR2Configured()) {
      return NextResponse.json(
        {
          error:
            "Cloudflare R2 sozlanmagan. Vercel Environment Variables bo'limida R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY va R2_BUCKET_NAME qiymatlarini kiriting.",
        },
        { status: 503 }
      );
    }

    const contentTypeHeader = (request.headers.get("content-type") || "").toLowerCase();

    let buffer: Buffer;
    let fileMime = "";
    let filename = "";
    let folder = "general";

    if (contentTypeHeader.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file");
      folder = sanitizeR2Folder(String(formData.get("folder") || "general"));

      if (!(file instanceof File)) {
        return NextResponse.json(
          { error: "Yuklash uchun 'file' maydoni topilmadi" },
          { status: 400 }
        );
      }

      fileMime = (file.type || "").toLowerCase().trim();
      filename = file.name || "upload";

      if (!ALLOWED_R2_MIME_TYPES[fileMime]) {
        return NextResponse.json(
          { error: `Ruxsat etilmagan fayl turi: ${fileMime || "noma'lum"}` },
          { status: 400 }
        );
      }

      const maxBytes = getMaxSizeForMime(fileMime);
      if (file.size <= 0 || file.size > maxBytes) {
        return NextResponse.json(
          {
            error: `Fayl hajmi 1 baytdan ${Math.round(maxBytes / (1024 * 1024))} MB gacha bo'lishi kerak`,
          },
          { status: 400 }
        );
      }

      buffer = Buffer.from(await file.arrayBuffer());
    } else if (contentTypeHeader.includes("application/json")) {
      const body = await request.json().catch(() => null);
      if (!body || typeof body !== "object") {
        return NextResponse.json({ error: "Noto'g'ri JSON so'rov" }, { status: 400 });
      }
      folder = sanitizeR2Folder(String(body.folder || "general"));
      filename = typeof body.filename === "string" ? body.filename : "upload";
      const dataUrl = typeof body.dataUrl === "string" ? body.dataUrl.trim() : "";
      const match = /^data:([a-z0-9/+.-]+);base64,([A-Za-z0-9+/=]+)$/i.exec(dataUrl);
      if (!match) {
        return NextResponse.json(
          { error: "dataUrl noto'g'ri formatda (data:image/...;base64,...)" },
          { status: 400 }
        );
      }
      fileMime = match[1].toLowerCase();
      if (!ALLOWED_R2_MIME_TYPES[fileMime]) {
        return NextResponse.json(
          { error: `Ruxsat etilmagan fayl turi: ${fileMime}` },
          { status: 400 }
        );
      }
      buffer = Buffer.from(match[2], "base64");
    } else {
      return NextResponse.json(
        { error: "So'rov multipart/form-data yoki application/json bo'lishi kerak" },
        { status: 415 }
      );
    }

    if (ADMIN_ONLY_FOLDERS.has(folder)) {
      const adminDevice = await verifyNextAdminDevice(request);
      if (!adminDevice) {
        return NextResponse.json(
          { error: "Ushbu bo'limga fayl yuklash uchun admin ruxsati talab qilinadi" },
          { status: 403 }
        );
      }
    }

    const uploaded = await uploadToR2({
      buffer,
      contentType: fileMime,
      folder,
      filename,
    });

    return NextResponse.json({
      success: true,
      ...uploaded,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Cloudflare R2 yuklashda xatolik yuz berdi" },
      { status: 500 }
    );
  }
}
