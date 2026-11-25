import crypto from "node:crypto";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export const ALLOWED_R2_FOLDERS = new Set([
  "products",
  "banners",
  "avatars",
  "receipts",
  "resale",
  "auctions",
  "videos",
  "requests",
  "general",
]);

export const ALLOWED_R2_MIME_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
  "application/pdf": "pdf",
};

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB
export const MAX_VIDEO_BYTES = 25 * 1024 * 1024; // 25 MB

interface R2Config {
  endpoint: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  publicUrl: string;
}

declare global {
  // eslint-disable-next-line no-var
  var __yuyuR2Client: { client: S3Client; fingerprint: string } | undefined;
}

export function getR2Config(): R2Config {
  const accountId = (process.env.R2_ACCOUNT_ID || "").trim();
  const explicitEndpoint = (process.env.R2_ENDPOINT || "").trim();
  const endpoint =
    explicitEndpoint ||
    (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : "");

  const accessKeyId = (process.env.R2_ACCESS_KEY_ID || "").trim();
  const secretAccessKey = (process.env.R2_SECRET_ACCESS_KEY || "").trim();
  const bucketName = (process.env.R2_BUCKET_NAME || "yuyushop").trim();
  const publicUrl = (process.env.R2_PUBLIC_URL || "").trim().replace(/\/+$/, "");

  return {
    endpoint,
    accessKeyId,
    secretAccessKey,
    bucketName,
    publicUrl,
  };
}

export function isR2Configured(): boolean {
  const cfg = getR2Config();
  return Boolean(
    cfg.endpoint && cfg.accessKeyId && cfg.secretAccessKey && cfg.bucketName
  );
}

export function getR2Client(): S3Client {
  const cfg = getR2Config();
  if (!isR2Configured()) {
    throw new Error(
      "Cloudflare R2 sozlanmagan. R2_ACCOUNT_ID (yoki R2_ENDPOINT), R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY va R2_BUCKET_NAME muhit o'zgaruvchilarini kiriting."
    );
  }

  const fingerprint = `${cfg.endpoint}|${cfg.accessKeyId}|${cfg.bucketName}`;
  if (globalThis.__yuyuR2Client?.fingerprint === fingerprint) {
    return globalThis.__yuyuR2Client.client;
  }

  const client = new S3Client({
    region: "auto",
    endpoint: cfg.endpoint,
    credentials: {
      accessKeyId: cfg.accessKeyId,
      secretAccessKey: cfg.secretAccessKey,
    },
  });

  globalThis.__yuyuR2Client = { client, fingerprint };
  return client;
}

export function sanitizeR2Folder(raw?: string): string {
  const clean = String(raw || "general")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "");
  return ALLOWED_R2_FOLDERS.has(clean) ? clean : "general";
}

export function validateR2Key(rawKey: string): string | null {
  const key = String(rawKey || "").trim().replace(/^\/+/, "");
  if (!key || key.length > 512) return null;
  if (key.includes("..") || key.includes("\\") || key.includes("\0")) return null;
  const segments = key.split("/");
  if (segments.length === 1) {
    // Safe top-level object key (e.g. from /api/upload: "1730000000000-photo.jpg")
    const file = segments[0];
    if (!file || file.startsWith(".") || !/^[a-zA-Z0-9._-]+$/.test(file)) {
      return null;
    }
    return key;
  }
  if (!ALLOWED_R2_FOLDERS.has(segments[0])) {
    return null;
  }
  if (segments.some((s) => !s || s.startsWith(".") || !/^[a-zA-Z0-9._-]+$/.test(s))) {
    return null;
  }
  return key;
}

export function buildR2ObjectKey(
  folder: string,
  contentType: string,
  originalFilename?: string
): string {
  const safeFolder = sanitizeR2Folder(folder);
  const ext = ALLOWED_R2_MIME_TYPES[contentType.toLowerCase()] || "bin";
  const baseName = String(originalFilename || "")
    .replace(/\.[^/.]+$/, "")
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 32);

  const uniquePart = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}`;
  const filePart = baseName ? `${baseName}-${uniquePart}.${ext}` : `${uniquePart}.${ext}`;
  return `${safeFolder}/${filePart}`;
}

export function buildR2PublicUrl(key: string): string {
  const cfg = getR2Config();
  if (cfg.publicUrl) {
    return `${cfg.publicUrl}/${key}`;
  }
  return `/api/r2/media/${key}`;
}

export function getMaxSizeForMime(contentType: string): number {
  return contentType.toLowerCase().startsWith("video/")
    ? MAX_VIDEO_BYTES
    : MAX_IMAGE_BYTES;
}

export async function uploadToR2(params: {
  buffer: Buffer | Uint8Array;
  contentType: string;
  folder?: string;
  filename?: string;
}): Promise<{
  key: string;
  url: string;
  contentType: string;
  size: number;
}> {
  const contentType = params.contentType.toLowerCase().trim();
  if (!ALLOWED_R2_MIME_TYPES[contentType]) {
    throw new Error(`Qo'llab-quvvatlanmaydigan fayl turi: ${contentType}`);
  }

  const maxBytes = getMaxSizeForMime(contentType);
  if (params.buffer.byteLength <= 0) {
    throw new Error("Bo'sh fayl yuklab bo'lmaydi");
  }
  if (params.buffer.byteLength > maxBytes) {
    throw new Error(
      `Fayl hajmi ruxsat etilgan limitdan katta (maksimal ${Math.round(maxBytes / (1024 * 1024))} MB)`
    );
  }

  const cfg = getR2Config();
  const client = getR2Client();
  const key = buildR2ObjectKey(params.folder || "general", contentType, params.filename);

  await client.send(
    new PutObjectCommand({
      Bucket: cfg.bucketName,
      Key: key,
      Body: params.buffer,
      ContentType: contentType,
      CacheControl: "public, max-age=31536000, immutable",
    })
  );

  return {
    key,
    url: buildR2PublicUrl(key),
    contentType,
    size: params.buffer.byteLength,
  };
}

export async function createR2PresignedUploadUrl(params: {
  contentType: string;
  folder?: string;
  filename?: string;
  expiresIn?: number;
}): Promise<{
  uploadUrl: string;
  key: string;
  publicUrl: string;
  contentType: string;
  expiresIn: number;
}> {
  const contentType = params.contentType.toLowerCase().trim();
  if (!ALLOWED_R2_MIME_TYPES[contentType]) {
    throw new Error(`Qo'llab-quvvatlanmaydigan fayl turi: ${contentType}`);
  }

  const cfg = getR2Config();
  const client = getR2Client();
  const key = buildR2ObjectKey(params.folder || "general", contentType, params.filename);
  const expiresIn = Math.min(900, Math.max(60, Number(params.expiresIn) || 300));

  const command = new PutObjectCommand({
    Bucket: cfg.bucketName,
    Key: key,
    ContentType: contentType,
    CacheControl: "public, max-age=31536000, immutable",
  });

  const uploadUrl = await getSignedUrl(client, command, { expiresIn });

  return {
    uploadUrl,
    key,
    publicUrl: buildR2PublicUrl(key),
    contentType,
    expiresIn,
  };
}

export async function getObjectFromR2(rawKey: string) {
  const key = validateR2Key(rawKey);
  if (!key) {
    throw new Error("Noto'g'ri media kaliti");
  }
  const cfg = getR2Config();
  const client = getR2Client();

  return client.send(
    new GetObjectCommand({
      Bucket: cfg.bucketName,
      Key: key,
    })
  );
}

export async function deleteFromR2(rawKey: string): Promise<void> {
  const key = validateR2Key(rawKey);
  if (!key) {
    throw new Error("Noto'g'ri media kaliti");
  }
  const cfg = getR2Config();
  const client = getR2Client();

  await client.send(
    new DeleteObjectCommand({
      Bucket: cfg.bucketName,
      Key: key,
    })
  );
}
