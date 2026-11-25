import { NextRequest, NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { verifyNextAdminDevice } from "@/lib/adminAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_MIME_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
};

const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB
const MAX_VIDEO_BYTES = 25 * 1024 * 1024; // 25 MB

declare global {
  // eslint-disable-next-line no-var
  var __yuyuUploadS3Client: { client: S3Client; fingerprint: string } | undefined;
}

function getUploadR2Config() {
  const accountId = (process.env.R2_ACCOUNT_ID || "").trim();
  const accessKeyId = (process.env.R2_ACCESS_KEY_ID || "").trim();
  const secretAccessKey = (process.env.R2_SECRET_ACCESS_KEY || "").trim();
  const bucketName = (process.env.R2_BUCKET_NAME || "yuyushop").trim();
  const publicUrl = (process.env.R2_PUBLIC_URL || "").trim().replace(/\/+$/, "");
  const endpoint = accountId
    ? `https://${accountId}.r2.cloudflarestorage.com`
    : (process.env.R2_ENDPOINT || "").trim();

  return {
    accountId,
    endpoint,
    accessKeyId,
    secretAccessKey,
    bucketName,
    publicUrl,
  };
}

function getS3Client(): S3Client {
  const cfg = getUploadR2Config();
  const fingerprint = `${cfg.endpoint}|${cfg.accessKeyId}|${cfg.bucketName}`;
  if (globalThis.__yuyuUploadS3Client?.fingerprint === fingerprint) {
    return globalThis.__yuyuUploadS3Client.client;
  }

  const client = new S3Client({
    region: "auto",
    endpoint: cfg.endpoint,
    credentials: {
      accessKeyId: cfg.accessKeyId,
      secretAccessKey: cfg.secretAccessKey,
    },
  });

  globalThis.__yuyuUploadS3Client = { client, fingerprint };
  return client;
}

function buildSafeUniqueFileName(originalName: string, mimeType: string): string {
  const extFromMime = ALLOWED_MIME_TYPES[mimeType] || "bin";
  // Strip any directory segments and sanitize filename characters
  const leafName = String(originalName || "media").split(/[\\/]/).pop() || "media";
  const withoutExt = leafName.replace(/\.[^/.]+$/, "");
  const safeBase = withoutExt
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "-")
    .replace(/\.+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 64);

  return `${Date.now()}-${safeBase || "file"}.${extFromMime}`;
}

export async function POST(request: NextRequest) {
  try {
    // Only authenticated admin devices may upload catalog media into the R2 bucket
    const adminDevice = await verifyNextAdminDevice(request);
    if (!adminDevice) {
      return NextResponse.json(
        { error: "Media yuklash uchun admin qurilmasi tasdiqlanishi kerak" },
        { status: 403 }
      );
    }

    const cfg = getUploadR2Config();
    if (!cfg.endpoint || !cfg.accessKeyId || !cfg.secretAccessKey || !cfg.bucketName) {
      return NextResponse.json(
        {
          error:
            "Cloudflare R2 muhit o'zgaruvchilari (R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME) sozlanmagan.",
        },
        { status: 503 }
      );
    }

    const contentTypeHeader = (request.headers.get("content-type") || "").toLowerCase();
    if (!contentTypeHeader.includes("multipart/form-data")) {
      return NextResponse.json(
        { error: "So'rov multipart/form-data formatida bo'lishi kerak" },
        { status: 415 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Yuklash uchun 'file' maydoni topilmadi" },
        { status: 400 }
      );
    }

    const mimeType = (file.type || "").toLowerCase().trim();
    if (!ALLOWED_MIME_TYPES[mimeType]) {
      return NextResponse.json(
        { error: `Faqat rasm yoki video yuklash mumkin (olingan tur: ${mimeType || "noma'lum"})` },
        { status: 400 }
      );
    }

    const maxBytes = mimeType.startsWith("video/") ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
    if (file.size <= 0 || file.size > maxBytes) {
      return NextResponse.json(
        {
          error: `Fayl hajmi 1 baytdan ${Math.round(maxBytes / (1024 * 1024))} MB gacha bo'lishi kerak`,
        },
        { status: 400 }
      );
    }

    const fileName = buildSafeUniqueFileName(file.name, mimeType);
    const buffer = Buffer.from(await file.arrayBuffer());

    const s3 = getS3Client();
    await s3.send(
      new PutObjectCommand({
        Bucket: cfg.bucketName,
        Key: fileName,
        Body: buffer,
        ContentType: mimeType,
        CacheControl: "public, max-age=31536000, immutable",
      })
    );

    const url = cfg.publicUrl
      ? `${cfg.publicUrl}/${fileName}`
      : `/api/r2/media/${fileName}`;

    return NextResponse.json({
      url,
      key: fileName,
      bucket: cfg.bucketName,
      contentType: mimeType,
      size: buffer.byteLength,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Faylni Cloudflare R2 ga yuklashda xatolik yuz berdi" },
      { status: 500 }
    );
  }
}
