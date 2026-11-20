export type ImageCompressionPreset = 'avatar' | 'receipt' | 'product' | 'banner';

export const VERCEL_SAFE_PAYLOAD_BYTES = Math.floor(3.8 * 1024 * 1024); // 3.8 MB safe margin under Vercel's 4.5 MB limit
export const VERCEL_MAX_VIDEO_FILE_BYTES = Math.floor(2.8 * 1024 * 1024); // ~3.7 MB after base64 expansion

const MAX_RAW_IMAGE_BYTES = 15 * 1024 * 1024; // 15 MB raw input before client compression

const PRESET_CONFIG: Record<
  ImageCompressionPreset,
  { maxDim: number; quality: number; maxOutputBytes: number }
> = {
  avatar: { maxDim: 512, quality: 0.78, maxOutputBytes: 220 * 1024 },
  receipt: { maxDim: 1280, quality: 0.78, maxOutputBytes: 600 * 1024 },
  product: { maxDim: 1280, quality: 0.8, maxOutputBytes: 650 * 1024 },
  banner: { maxDim: 1600, quality: 0.82, maxOutputBytes: 850 * 1024 }
};

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Faylni o'qishda xatolik yuz berdi."));
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error("Fayl formati noto'g'ri."));
      }
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Compresses any uploaded image via HTML5 Canvas so it stays fast and well within
 * Vercel Serverless Functions' 4.5 MB payload limit while preserving clear quality.
 */
export async function compressImageFile(
  file: File,
  preset: ImageCompressionPreset = 'product'
): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error("Iltimos, faqat rasm faylini (JPG, PNG, WEBP) tanlang.");
  }
  if (file.size > MAX_RAW_IMAGE_BYTES) {
    throw new Error("Tanlangan rasm juda katta (15 MB dan oshmasligi kerak).");
  }

  const dataUrl = await readFileAsDataUrl(file);
  const { maxDim, quality, maxOutputBytes } = PRESET_CONFIG[preset];

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onerror = () => {
      if (dataUrl.length > maxOutputBytes * 2) {
        reject(new Error("Rasmni siqib bo'lmadi. Iltimos, JPG yoki PNG formatida yuklang."));
      } else {
        resolve(dataUrl);
      }
    };
    img.onload = () => {
      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        if (width >= height) {
          height = Math.max(1, Math.round((height * maxDim) / width));
          width = maxDim;
        } else {
          width = Math.max(1, Math.round((width * maxDim) / height));
          height = maxDim;
        }
      }

      try {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(dataUrl);
          return;
        }

        // Fill white background before JPEG conversion so transparent PNGs don't turn black
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        let currentQuality = quality;
        let compressed = canvas.toDataURL('image/jpeg', currentQuality);

        // Adaptive compression pass if still larger than preset target
        while (compressed.length > maxOutputBytes && currentQuality > 0.45) {
          currentQuality = Math.max(0.45, Number((currentQuality - 0.12).toFixed(2)));
          compressed = canvas.toDataURL('image/jpeg', currentQuality);
        }

        // Keep original only if it is already smaller than compressed output and under limit
        if (dataUrl.length < compressed.length && dataUrl.length <= maxOutputBytes) {
          resolve(dataUrl);
        } else {
          resolve(compressed);
        }
      } catch {
        resolve(dataUrl);
      }
    };
    img.src = dataUrl;
  });
}

/**
 * Validates video file size against Vercel's 4.5 MB Serverless payload limit
 * (accounting for ~33% base64 overhead) and converts to a Data URL.
 */
export async function readVideoFileForVercel(file: File): Promise<string> {
  if (!file.type.startsWith('video/')) {
    throw new Error("Iltimos, faqat video fayl (.mp4, .webm) tanlang.");
  }
  if (file.size > VERCEL_MAX_VIDEO_FILE_BYTES) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    throw new Error(
      `Video hajmi ${sizeMb} MB — Vercel limiti bo'yicha fayl 2.8 MB dan oshmasligi kerak. Kichikroq klip yuklang yoki tayyor video havolasini (URL) kiriting.`
    );
  }
  return readFileAsDataUrl(file);
}

/**
 * Estimates serialized JSON payload byte length to prevent Vercel 413 errors before sending.
 */
export function estimateJsonPayloadBytes(payload: unknown): number {
  const serialized = typeof payload === 'string' ? payload : JSON.stringify(payload);
  return new Blob([serialized]).size;
}

export function assertVercelPayloadSafe(payload: unknown): void {
  const bytes = estimateJsonPayloadBytes(payload);
  if (bytes > VERCEL_SAFE_PAYLOAD_BYTES) {
    const mb = (bytes / (1024 * 1024)).toFixed(2);
    throw new Error(
      `Yuborilayotgan ma'lumotlar hajmi (${mb} MB) Vercel limitidan oshib ketdi. Iltimos, rasm/video sonini kamaytiring yoki video uchun URL havoladan foydalaning.`
    );
  }
}
