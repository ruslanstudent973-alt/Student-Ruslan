'use client';

import { readStoredAdminDeviceToken } from './authHelpers';

export type R2UploadFolder =
  | 'products'
  | 'banners'
  | 'avatars'
  | 'receipts'
  | 'resale'
  | 'auctions'
  | 'videos'
  | 'requests'
  | 'general';

// Keep direct serverless uploads safely below Vercel's 4.5 MB request body ceiling
const PRESIGN_THRESHOLD_BYTES = 3.8 * 1024 * 1024;

let r2StatusCache: { configured: boolean; checkedAt: number } | null = null;
const R2_STATUS_TTL_MS = 60_000;

async function isR2AvailableOnServer(): Promise<boolean> {
  const now = Date.now();
  if (r2StatusCache && now - r2StatusCache.checkedAt < R2_STATUS_TTL_MS) {
    return r2StatusCache.configured;
  }
  try {
    const res = await fetch('/api/r2/status', {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return false;
    const data = await res.json();
    const configured = Boolean(data?.configured);
    r2StatusCache = { configured, checkedAt: now };
    return configured;
  } catch {
    return false;
  }
}

export function readFileAsDataUrl(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Faylni o'qib bo'lmadi"));
    reader.onload = () => resolve(String(reader.result || ''));
    reader.readAsDataURL(file);
  });
}

export async function compressImageToBlobAndDataUrl(
  file: File,
  maxDim = 1280,
  quality = 0.84
): Promise<{ blob: Blob; dataUrl: string; mimeType: string }> {
  const originalDataUrl = await readFileAsDataUrl(file);
  if (typeof document === 'undefined' || !file.type.startsWith('image/') || file.type === 'image/gif') {
    return { blob: file, dataUrl: originalDataUrl, mimeType: file.type || 'image/jpeg' };
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.onerror = () =>
      resolve({ blob: file, dataUrl: originalDataUrl, mimeType: file.type || 'image/jpeg' });
    img.onload = () => {
      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        const ratio = Math.min(maxDim / width, maxDim / height);
        width = Math.max(1, Math.round(width * ratio));
        height = Math.max(1, Math.round(height * ratio));
      }
      try {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve({ blob: file, dataUrl: originalDataUrl, mimeType: file.type || 'image/jpeg' });
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
        if (compressedDataUrl.length >= originalDataUrl.length) {
          resolve({ blob: file, dataUrl: originalDataUrl, mimeType: file.type || 'image/jpeg' });
          return;
        }
        canvas.toBlob(
          (blob) => {
            if (blob && blob.size > 0) {
              resolve({ blob, dataUrl: compressedDataUrl, mimeType: 'image/jpeg' });
            } else {
              resolve({ blob: file, dataUrl: compressedDataUrl, mimeType: 'image/jpeg' });
            }
          },
          'image/jpeg',
          quality
        );
      } catch {
        resolve({ blob: file, dataUrl: originalDataUrl, mimeType: file.type || 'image/jpeg' });
      }
    };
    img.src = originalDataUrl;
  });
}

/**
 * Smart media uploader for Next.js + Vercel + Cloudflare R2:
 * 1. If Cloudflare R2 is configured on the server:
 *    - Files <= 3.8 MB upload via POST /api/r2/upload (FormData)
 *    - Larger files (e.g. videos) upload directly to R2 via POST /api/r2/presign + PUT
 * 2. If Cloudflare R2 is not configured yet (or unavailable), seamlessly falls back
 *    to a compressed Data URL so existing flows never break.
 */
export async function uploadMediaSmart(
  file: File,
  options: {
    folder: R2UploadFolder;
    maxDim?: number;
    quality?: number;
  }
): Promise<string> {
  const isImage = file.type.startsWith('image/');
  let uploadBlob: Blob = file;
  let uploadMime = file.type || (isImage ? 'image/jpeg' : 'application/octet-stream');
  let fallbackDataUrl: string | null = null;

  if (isImage) {
    const compressed = await compressImageToBlobAndDataUrl(
      file,
      options.maxDim ?? 1280,
      options.quality ?? 0.84
    );
    uploadBlob = compressed.blob;
    uploadMime = compressed.mimeType;
    fallbackDataUrl = compressed.dataUrl;
  }

  const r2Ready = await isR2AvailableOnServer();
  if (r2Ready) {
    const adminToken = readStoredAdminDeviceToken();
    const authHeaders: Record<string, string> = { Accept: 'application/json' };
    if (adminToken) {
      authHeaders['x-admin-device-token'] = adminToken;
    }

    try {
      if (uploadBlob.size > PRESIGN_THRESHOLD_BYTES) {
        const presignRes = await fetch('/api/r2/presign', {
          method: 'POST',
          headers: { ...authHeaders, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            folder: options.folder,
            contentType: uploadMime,
            filename: file.name,
          }),
        });
        if (presignRes.ok) {
          const presignData = await presignRes.json();
          if (presignData?.uploadUrl && presignData?.publicUrl) {
            const putRes = await fetch(presignData.uploadUrl, {
              method: 'PUT',
              headers: { 'Content-Type': uploadMime },
              body: uploadBlob,
            });
            if (putRes.ok) {
              return String(presignData.publicUrl);
            }
          }
        }
      } else {
        const formData = new FormData();
        formData.append('folder', options.folder);
        formData.append('file', uploadBlob, file.name || 'upload');

        const uploadRes = await fetch('/api/r2/upload', {
          method: 'POST',
          headers: authHeaders,
          body: formData,
        });
        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          if (uploadData?.url) {
            return String(uploadData.url);
          }
        }
      }
    } catch {
      // Fall through cleanly to local compressed Data URL fallback
    }
  }

  if (fallbackDataUrl) {
    return fallbackDataUrl;
  }
  return readFileAsDataUrl(uploadBlob);
}
