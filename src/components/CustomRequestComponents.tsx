import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Camera,
  UploadCloud,
  Link2,
  Phone,
  FileText,
  Send,
  Loader2,
  X,
  Check,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  ExternalLink,
  ZoomIn,
  ZoomOut,
  ChevronLeft,
  ShoppingBag,
  ShoppingCart,
  ArrowRight,
  Truck,
  Tag,
  AlertCircle,
  MessageSquare,
  Image as ImageIcon
} from 'lucide-react';
import { CustomRequest, CustomRequestStatus, Product, User } from '../types';
import { MARKUP_RATE, CURRENCY_RATE } from '../constants';
import { SafeImage } from './YuyuPrimitives';
import { uploadMediaSmart } from '../utils/r2MediaUpload';

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

/**
 * Client-side image validation & compression (Canvas resize to max 1280px, JPEG/WebP quality 0.82)
 */
export const validateAndCompressImage = async (file: File): Promise<string> => {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    throw new Error("Faqat JPG, PNG yoki WEBP formatidagi rasmlarni yuklash mumkin.");
  }
  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    throw new Error("Rasm hajmi 5 MB dan oshmasligi kerak.");
  }
  return uploadMediaSmart(file, { folder: 'requests', maxDim: 1280, quality: 0.82 });
};

export const customRequestToProduct = (req: CustomRequest): Product => {
  const quotedUzs = Math.max(1000, Math.round(req.adminQuote?.price || 0));
  const normalizedPddPrice = quotedUzs / (MARKUP_RATE * CURRENCY_RATE);
  return {
    id: `custom-${req.id}`,
    name: req.description
      ? `Maxsus buyurtma: ${req.description.slice(0, 48)}`
      : `Rasm bo'yicha topilgan tovar (${req.id})`,
    pinduoduoPrice: normalizedPddPrice,
    description: [
      req.description ? `Mijoz izohi: ${req.description}` : '',
      req.adminQuote?.deliveryDays ? `Yetkazib berish: ${req.adminQuote.deliveryDays}` : '',
      req.adminQuote?.adminNote ? `Admin izohi: ${req.adminQuote.adminNote}` : ''
    ]
      .filter(Boolean)
      .join(' · '),
    category: 'Maxsus qidiruv',
    images: [req.imageUrl],
    sizes: ['Standart'],
    rating: 5.0,
    salesCount: 1,
    seller: {
      name: 'YUYU Sourcing',
      avatar: '',
      rating: 5.0,
      description: 'Xitoydan rasm bo\'yicha maxsus qidiruv xizmati'
    },
    isOriginal: true,
    weight: 0
  };
};

const getStatusBadgeMeta = (status: CustomRequestStatus) => {
  switch (status) {
    case 'PENDING':
      return {
        label: "Ko'rib chiqilmoqda",
        dot: 'bg-amber-400',
        cls: 'bg-amber-500/15 text-amber-300 border-amber-400/40'
      };
    case 'PRICED':
      return {
        label: 'Narx belgilandi',
        dot: 'bg-emerald-400',
        cls: 'bg-emerald-500/15 text-emerald-300 border-emerald-400/45 shadow-[0_0_14px_rgba(16,185,129,0.2)]'
      };
    case 'ACCEPTED':
      return {
        label: "Buyurtmaga o'tkazildi",
        dot: 'bg-cyan-400',
        cls: 'bg-cyan-500/15 text-cyan-300 border-cyan-400/45'
      };
    case 'REJECTED':
      return {
        label: 'Topilmadi / Bekor qilindi',
        dot: 'bg-rose-400',
        cls: 'bg-rose-500/15 text-rose-300 border-rose-400/40'
      };
    case 'COMPLETED':
      return {
        label: 'Yakunlandi',
        dot: 'bg-emerald-400',
        cls: 'bg-emerald-500/15 text-emerald-300 border-emerald-400/40'
      };
  }
};

const formatDateUz = (iso: string) => {
  try {
    return new Date(iso).toLocaleString('uz-UZ', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return iso;
  }
};

/* ============================================================================
 * 1. HOME & CATALOG GLOWING DARK GLASSMORPHIC BANNER CTA
 * ============================================================================ */
export const PhotoSourcingBanner: React.FC<{
  onOpenFindProduct: () => void;
  onOpenMyRequests?: () => void;
  pricedCount?: number;
  compact?: boolean;
}> = ({ onOpenFindProduct, onOpenMyRequests, pricedCount = 0, compact = false }) => {
  return (
    <section className="relative overflow-hidden rounded-3xl bg-[#070B14] border border-cyan-400/35 shadow-[0_18px_50px_rgba(6,182,212,0.16)] text-white">
      {/* Subtle AMOLED neon ambient accents */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 -right-24 w-72 h-72 rounded-full bg-cyan-500/20 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-28 -left-20 w-72 h-72 rounded-full bg-purple-600/20 blur-3xl"
      />

      <div
        className={`relative z-10 backdrop-blur-md flex flex-col lg:flex-row lg:items-center justify-between gap-6 ${
          compact ? 'p-6 sm:p-7' : 'p-7 sm:p-9'
        }`}
      >
        <div className="flex items-start gap-4 max-w-2xl">
          <div className="w-13 h-13 rounded-2xl bg-gradient-to-br from-cyan-400/25 to-purple-500/25 border border-cyan-400/45 flex items-center justify-center shrink-0 shadow-[0_0_24px_rgba(34,211,238,0.28)]">
            <Camera size={24} className="text-cyan-300" />
          </div>
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 text-[11px] font-mono font-semibold tracking-wide text-cyan-300">
              <Sparkles size={12} />
              <span>Xitoy fabrikalaridan rasm bo'yicha qidiruv</span>
            </div>
            <h2 className="font-display text-xl sm:text-2xl font-bold text-white tracking-tight leading-snug">
              Saytda yo'qmi? Rasm tashlang — topib beramiz!
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              Istalgan kiyim, poyabzal yoki gadjet rasmini yuklang. Biz uni 1688, Taobao va Pinduoduo bazasidan topib, aniq narx va yetkazish muddatini yuboramiz.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          {onOpenMyRequests && pricedCount > 0 && (
            <button
              type="button"
              onClick={onOpenMyRequests}
              className="inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-400/45 text-emerald-200 text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap"
            >
              <CheckCircle2 size={16} />
              <span>{pricedCount} ta narx tayyor</span>
            </button>
          )}
          <button
            type="button"
            onClick={onOpenFindProduct}
            className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-xl bg-gradient-to-r from-cyan-400 via-sky-400 to-purple-500 hover:brightness-110 text-slate-950 font-display font-bold text-sm shadow-[0_0_28px_rgba(34,211,238,0.35)] transition-all active:scale-95 whitespace-nowrap"
          >
            <Camera size={17} />
            <span>Rasm yuklash</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </section>
  );
};

/* ============================================================================
 * 2. FLOATING GLASSMORPHIC ACTION BUTTON
 * ============================================================================ */
export const FloatingPhotoRequestButton: React.FC<{
  onClick: () => void;
}> = ({ onClick }) => (
  <button
    type="button"
    onClick={onClick}
    aria-label="Rasm tashla — topib beramiz"
    className="fixed bottom-20 md:bottom-7 right-4 md:right-7 z-40 group inline-flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-[#070B14]/90 hover:bg-[#0B1224] backdrop-blur-xl border border-cyan-400/50 text-white shadow-[0_12px_35px_rgba(6,182,212,0.32)] transition-all hover:-translate-y-0.5 active:scale-95"
  >
    <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-400 to-purple-500 text-slate-950 flex items-center justify-center shrink-0">
      <Camera size={17} />
    </span>
    <span className="text-xs sm:text-sm font-display font-bold whitespace-nowrap pr-1">
      Rasm tashlash
    </span>
  </button>
);

/* ============================================================================
 * 3. FULL-SCREEN ZOOMABLE IMAGE LIGHTBOX
 * ============================================================================ */
const ImageZoomLightbox: React.FC<{
  src: string;
  alt: string;
  onClose: () => void;
}> = ({ src, alt, onClose }) => {
  const [zoomed, setZoomed] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[150] bg-black/90 backdrop-blur-xl flex flex-col items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Rasmni kattalashtirib ko'rish"
      onClick={onClose}
    >
      <div
        className="absolute top-4 right-4 z-20 flex items-center gap-2"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={() => setZoomed((z) => !z)}
          className="px-3.5 py-2 rounded-xl bg-white/15 hover:bg-white/25 backdrop-blur-md border border-white/20 text-white text-xs font-semibold inline-flex items-center gap-1.5"
        >
          {zoomed ? <ZoomOut size={15} /> : <ZoomIn size={15} />}
          <span>{zoomed ? 'Kichraytirish' : 'Kattalashtirish'}</span>
        </button>
        <button
          type="button"
          onClick={onClose}
          aria-label="Yopish"
          className="w-10 h-10 rounded-xl bg-white/15 hover:bg-white/25 backdrop-blur-md border border-white/20 text-white flex items-center justify-center"
        >
          <X size={18} />
        </button>
      </div>

      <div
        className="max-w-5xl max-h-[85vh] overflow-auto rounded-2xl border border-white/15 bg-black/40 p-2"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={src}
          alt={alt}
          onClick={() => setZoomed((z) => !z)}
          className={`transition-transform duration-200 rounded-xl cursor-zoom-in ${
            zoomed ? 'scale-150 sm:scale-[1.75] cursor-zoom-out' : 'max-h-[80vh] w-auto object-contain'
          }`}
        />
      </div>
    </div>
  );
};

/* ============================================================================
 * 4. USER REQUEST SUBMISSION PAGE (/find-product)
 * ============================================================================ */
export const FindProductView: React.FC<{
  currentUser: User;
  onBack: () => void;
  onCreated: (req: CustomRequest) => void;
  onOpenMyRequests: () => void;
  notify: (msg: string, type?: 'success' | 'error' | 'info') => void;
  safeFetchJSON: (url: string, options?: RequestInit) => Promise<any>;
  sendTelegramNotification: (msg: string) => Promise<void>;
}> = ({
  currentUser,
  onBack,
  onCreated,
  onOpenMyRequests,
  notify,
  safeFetchJSON,
  sendTelegramNotification
}) => {
  const [imagePreview, setImagePreview] = useState<string>('');
  const [fileInfo, setFileInfo] = useState<string>('');
  const [productLink, setProductLink] = useState('');
  const [description, setDescription] = useState('');
  const [phoneNumber, setPhoneNumber] = useState(
    currentUser.phoneNumber || currentUser.telegramId || '+998'
  );
  const [isDragging, setIsDragging] = useState(false);
  const [compressing, setCompressing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleSelectedFile = async (file?: File | null) => {
    if (!file) return;
    setErrorMsg('');
    setCompressing(true);
    try {
      const compressed = await validateAndCompressImage(file);
      setImagePreview(compressed);
      const kb = Math.round((compressed.length * 3) / 4 / 1024);
      setFileInfo(`${file.name} · ~${kb} KB`);
    } catch (err: any) {
      setErrorMsg(err?.message || "Rasmni qayta ishlashda xatolik");
    } finally {
      setCompressing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imagePreview) {
      setErrorMsg("Iltimos, avval mahsulot rasmini yuklang.");
      return;
    }
    const cleanPhone = phoneNumber.trim();
    if (cleanPhone.replace(/\D/g, '').length < 9) {
      setErrorMsg("Telefon raqamini to'liq kiriting.");
      return;
    }

    setErrorMsg('');
    setSubmitting(true);
    try {
      const res = await safeFetchJSON('/api/custom-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.telegramId,
          username: currentUser.username,
          phoneNumber: cleanPhone,
          imageUrl: imagePreview,
          productLink: productLink.trim(),
          description: description.trim()
        })
      });

      if (res?.request) {
        onCreated(res.request);
        notify("So'rovingiz yuborildi! Admin tez orada narx belgilaydi.", 'success');
        sendTelegramNotification(
          `📸 *YUYU Shop — Yangi rasm so'rovi*\n👤 Mijoz: ${currentUser.username}\n📱 Tel: ${cleanPhone}\n📝 Izoh: ${description.trim() || "Yo'q"}\n🔗 Havola: ${productLink.trim() || "Yo'q"}\n🆔 ID: ${res.request.id}`
        );
        onOpenMyRequests();
      }
    } catch (err: any) {
      const msg = err?.message || "So'rov yuborishda xatolik yuz berdi";
      setErrorMsg(msg);
      notify(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="p-2.5 yuyu-glass-subtle rounded-xl hover:bg-white/85 dark:hover:bg-slate-800/80 transition-colors"
          >
            <ChevronLeft size={18} />
          </button>
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
              Rasm tashla — topib beramiz
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Mahsulot suratini yuboring, mutaxassislarimiz Xitoydan eng qulay narxni topib berishadi
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenMyRequests}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl yuyu-glass-subtle text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-white/85 dark:hover:bg-slate-800/80 transition-colors"
        >
          <Clock size={15} />
          <span>Mening so'rovlarim</span>
        </button>
      </div>

      {/* Dark AMOLED Glassmorphic Request Form */}
      <form
        onSubmit={handleSubmit}
        className="relative overflow-hidden rounded-3xl bg-[#070B14] border border-cyan-400/30 shadow-[0_24px_70px_rgba(0,0,0,0.45)] p-6 sm:p-8 text-white space-y-6"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 -right-24 w-72 h-72 rounded-full bg-cyan-500/15 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-24 -left-24 w-72 h-72 rounded-full bg-purple-600/15 blur-3xl"
        />

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-7 items-start">
          {/* Left 6 cols: Drag & Drop / Camera Upload Zone */}
          <div className="lg:col-span-6 space-y-3">
            <label className="block text-xs font-semibold text-cyan-200">
              Mahsulot rasmi * (JPG, PNG, WEBP — 5 MB gacha)
            </label>

            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                handleSelectedFile(e.dataTransfer.files?.[0]);
              }}
              className={`relative rounded-2xl border-2 border-dashed transition-all overflow-hidden min-h-[300px] flex flex-col items-center justify-center p-5 text-center ${
                isDragging
                  ? 'border-cyan-400 bg-cyan-500/15'
                  : imagePreview
                  ? 'border-white/20 bg-black/50'
                  : 'border-white/20 hover:border-cyan-400/60 bg-white/5 hover:bg-white/8 cursor-pointer'
              }`}
              onClick={() => {
                if (!imagePreview) fileInputRef.current?.click();
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => handleSelectedFile(e.target.files?.[0])}
                className="hidden"
              />

              {compressing ? (
                <div className="space-y-3">
                  <Loader2 size={32} className="animate-spin text-cyan-400 mx-auto" />
                  <p className="text-xs text-slate-300">Rasm optimallashtirilmoqda...</p>
                </div>
              ) : imagePreview ? (
                <div className="w-full space-y-3">
                  <div className="relative rounded-xl overflow-hidden bg-black/60 border border-white/15 max-h-[280px] flex items-center justify-center">
                    <img
                      src={imagePreview}
                      alt="Yuklangan mahsulot rasmi"
                      className="max-h-[280px] w-auto object-contain"
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setImagePreview('');
                        setFileInfo('');
                      }}
                      aria-label="Rasmni olib tashlash"
                      className="absolute top-2.5 right-2.5 w-8 h-8 rounded-xl bg-black/65 hover:bg-red-600/80 backdrop-blur-md border border-white/20 text-white flex items-center justify-center transition-colors"
                    >
                      <X size={15} />
                    </button>
                  </div>
                  <div className="flex items-center justify-between gap-2 text-[11px] text-slate-300">
                    <span className="truncate font-mono">{fileInfo}</span>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-cyan-300 hover:underline font-semibold shrink-0"
                    >
                      Boshqa rasm tanlash
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 py-6">
                  <div className="w-16 h-16 rounded-2xl bg-cyan-500/15 border border-cyan-400/35 text-cyan-300 mx-auto flex items-center justify-center shadow-[0_0_24px_rgba(34,211,238,0.2)]">
                    <UploadCloud size={30} />
                  </div>
                  <div className="space-y-1">
                    <p className="font-display font-bold text-base text-white">
                      Rasmni shu yerga tashlang yoki tanlang
                    </p>
                    <p className="text-xs text-slate-400">
                      Telefondan kamera/galereya yoki kompyuterdan bevosita yuklang
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/10 border border-white/20 text-xs font-semibold text-white">
                    <Camera size={14} />
                    <span>Galereyadan tanlash</span>
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Right 6 cols: Form Fields */}
          <div className="lg:col-span-6 space-y-4">
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
                <Phone size={13} className="text-cyan-400" />
                <span>Telefon raqam *</span>
              </label>
              <input
                type="tel"
                required
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+998 90 123 45 67"
                className="w-full bg-white/8 backdrop-blur-md border border-white/15 rounded-xl px-4 py-3 text-sm font-mono tabular-nums text-white placeholder:text-slate-500 outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
                <Link2 size={13} className="text-cyan-400" />
                <span>Tovar ssilkasi (ixtiyoriy)</span>
              </label>
              <input
                type="url"
                value={productLink}
                onChange={(e) => setProductLink(e.target.value)}
                placeholder="Pinduoduo, Taobao, 1688 yoki Instagram havolasi..."
                className="w-full bg-white/8 backdrop-blur-md border border-white/15 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-500 outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
                <FileText size={13} className="text-cyan-400" />
                <span>O'lcham, rang yoki izoh</span>
              </label>
              <textarea
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Masalan: 42-o'lcham, qora rang, 1 dona kerak. Original sifati bo'lsa yaxshi..."
                maxLength={1000}
                className="w-full bg-white/8 backdrop-blur-md border border-white/15 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-500 outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 transition-all resize-none"
              />
            </div>

            {errorMsg && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/15 border border-rose-400/40 text-rose-200 text-xs font-medium">
                <AlertCircle size={15} className="shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || compressing}
              className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-cyan-400 via-sky-400 to-purple-500 hover:brightness-110 disabled:opacity-55 text-slate-950 font-display font-bold text-sm flex items-center justify-center gap-2 shadow-[0_0_28px_rgba(34,211,238,0.3)] transition-all"
            >
              {submitting ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>Yuborilmoqda...</span>
                </>
              ) : (
                <>
                  <Send size={17} />
                  <span>So'rov yuborish</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

/* ============================================================================
 * 5. USER PROFILE — "MENING SO'ROVLARIM" SECTION
 * ============================================================================ */
export const MyCustomRequestsView: React.FC<{
  currentUser: User;
  requests: CustomRequest[];
  onRequestsChange: (updater: (prev: CustomRequest[]) => CustomRequest[]) => void;
  onOrderQuote: (req: CustomRequest) => void;
  onAddQuoteToCart: (req: CustomRequest) => void;
  onOpenFindProduct: () => void;
  onBack: () => void;
  notify: (msg: string, type?: 'success' | 'error' | 'info') => void;
  safeFetchJSON: (url: string, options?: RequestInit) => Promise<any>;
}> = ({
  currentUser,
  requests,
  onRequestsChange,
  onOrderQuote,
  onAddQuoteToCart,
  onOpenFindProduct,
  onBack,
  notify,
  safeFetchJSON
}) => {
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [zoomImage, setZoomImage] = useState<{ src: string; alt: string } | null>(null);

  useEffect(() => {
    let active = true;
    const loadMine = async () => {
      setLoading(true);
      try {
        const qs = new URLSearchParams({ userId: currentUser.telegramId });
        if (currentUser.phoneNumber) {
          qs.set('phoneNumber', currentUser.phoneNumber);
        }
        const res = await safeFetchJSON(`/api/custom-requests/my?${qs.toString()}`);
        if (active && Array.isArray(res?.requests)) {
          onRequestsChange((prev) => {
            const incomingIds = new Set(res.requests.map((r: CustomRequest) => r.id));
            const others = prev.filter(
              (r) =>
                !incomingIds.has(r.id) &&
                r.userId !== currentUser.telegramId &&
                r.phoneNumber !== currentUser.telegramId &&
                (!currentUser.phoneNumber || r.phoneNumber !== currentUser.phoneNumber)
            );
            return [...res.requests, ...others];
          });
        }
      } catch {}
      if (active) setLoading(false);
    };
    loadMine();
    return () => {
      active = false;
    };
  }, [currentUser.telegramId, currentUser.phoneNumber]);

  const myRequests = useMemo(
    () =>
      requests
        .filter(
          (r) =>
            r.userId === currentUser.telegramId ||
            (currentUser.phoneNumber && r.phoneNumber === currentUser.phoneNumber)
        )
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [requests, currentUser.telegramId, currentUser.phoneNumber]
  );

  const handleRespond = async (
    req: CustomRequest,
    action: 'ACCEPT' | 'REJECT',
    mode: 'checkout' | 'cart' = 'checkout'
  ) => {
    setBusyId(req.id);
    try {
      const res = await safeFetchJSON(`/api/custom-requests/${req.id}/respond`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.telegramId,
          action
        })
      });
      const updated: CustomRequest = res?.request || {
        ...req,
        status: action === 'ACCEPT' ? 'ACCEPTED' : 'REJECTED'
      };
      onRequestsChange((prev) => prev.map((r) => (r.id === req.id ? updated : r)));

      if (action === 'ACCEPT') {
        if (mode === 'cart') {
          onAddQuoteToCart(updated);
          notify("Taklif qabul qilindi va savatga qo'shildi!", 'success');
        } else {
          notify("Taklif qabul qilindi! To'lov sahifasiga o'tilmoqda...", 'success');
          onOrderQuote(updated);
        }
      } else {
        notify("Taklif rad etildi", 'info');
      }
    } catch (err: any) {
      notify(err?.message || "Amalni bajarishda xatolik", 'error');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="p-2.5 yuyu-glass-subtle rounded-xl hover:bg-white/85 dark:hover:bg-slate-800/80 transition-colors"
          >
            <ChevronLeft size={18} />
          </button>
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
              Mening so'rovlarim
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 tabular-nums">
              Rasm orqali yuborilgan qidiruv so'rovlari ({myRequests.length} ta)
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenFindProduct}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-400 to-purple-500 text-slate-950 font-display font-bold text-xs sm:text-sm shadow-md hover:brightness-110 transition-all"
        >
          <Camera size={16} />
          <span>Yangi rasm yuborish</span>
        </button>
      </div>

      {loading && myRequests.length === 0 ? (
        <div className="py-20 text-center space-y-3">
          <Loader2 size={28} className="animate-spin text-cyan-500 mx-auto" />
          <p className="text-sm text-slate-500">So'rovlar yuklanmoqda...</p>
        </div>
      ) : myRequests.length === 0 ? (
        <div className="rounded-3xl bg-[#070B14] border border-white/10 p-12 text-center text-white space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-cyan-500/15 border border-cyan-400/35 text-cyan-300 mx-auto flex items-center justify-center">
            <ImageIcon size={28} />
          </div>
          <div className="space-y-1 max-w-md mx-auto">
            <h2 className="font-display text-xl font-bold">Hozircha so'rovlar yo'q</h2>
            <p className="text-sm text-slate-400">
              Saytda topa olmagan mahsulotingiz rasmini yuboring — biz Xitoydan topib narxini aytamiz.
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenFindProduct}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-cyan-400 to-purple-500 text-slate-950 font-display font-bold text-sm"
          >
            <Camera size={16} />
            <span>Rasm tashlash</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {myRequests.map((req) => {
            const badge = getStatusBadgeMeta(req.status);
            const isBusy = busyId === req.id;

            return (
              <article
                key={req.id}
                className="rounded-3xl bg-[#070B14] border border-white/12 backdrop-blur-md p-5 sm:p-6 text-white space-y-4 shadow-xl"
              >
                <div className="flex items-start gap-4">
                  <button
                    type="button"
                    onClick={() => setZoomImage({ src: req.imageUrl, alt: req.description || req.id })}
                    className="relative group w-24 h-24 rounded-2xl overflow-hidden bg-white/10 border border-white/15 shrink-0"
                    title="Kattalashtirib ko'rish"
                  >
                    <SafeImage
                      src={req.imageUrl}
                      alt={req.description || req.id}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                    <span className="absolute bottom-1.5 right-1.5 w-6 h-6 rounded-lg bg-black/65 text-white flex items-center justify-center">
                      <ZoomIn size={12} />
                    </span>
                  </button>

                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-mono text-xs text-slate-400">{req.id}</span>
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-semibold ${badge.cls}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                        <span>{badge.label}</span>
                      </span>
                    </div>

                    <p className="text-sm text-white/95 line-clamp-2 leading-snug">
                      {req.description || "Izoh qoldirilmagan"}
                    </p>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-400 font-mono">
                      <span>{formatDateUz(req.createdAt)}</span>
                      {req.productLink && (
                        <a
                          href={req.productLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-cyan-300 hover:underline font-sans"
                        >
                          <span>Havola</span>
                          <ExternalLink size={11} />
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                {/* Admin Quote Box when PRICED or ACCEPTED */}
                {req.adminQuote && req.adminQuote.price > 0 && (
                  <div className="rounded-2xl bg-gradient-to-br from-emerald-500/12 via-cyan-500/10 to-purple-500/10 border border-emerald-400/35 p-4 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-[11px] font-semibold text-emerald-300">
                          Belgilangan narx
                        </p>
                        <p className="font-mono tabular-nums text-xl font-bold text-white">
                          {req.adminQuote.price.toLocaleString()} so'm
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[11px] text-slate-400 inline-flex items-center gap-1">
                          <Truck size={12} className="text-cyan-300" />
                          <span>Yetkazib berish</span>
                        </p>
                        <p className="text-xs font-semibold text-cyan-200">
                          {req.adminQuote.deliveryDays || '10-14 kun'}
                        </p>
                      </div>
                    </div>

                    {req.adminQuote.adminNote && (
                      <div className="flex items-start gap-2 text-xs text-slate-200 bg-black/30 border border-white/10 rounded-xl p-2.5">
                        <MessageSquare size={14} className="text-cyan-300 shrink-0 mt-0.5" />
                        <span>{req.adminQuote.adminNote}</span>
                      </div>
                    )}

                    {req.status === 'PRICED' && (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleRespond(req, 'ACCEPT', 'checkout')}
                          className="sm:col-span-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-400 to-cyan-400 hover:brightness-110 disabled:opacity-50 text-slate-950 font-display font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg transition-all"
                        >
                          {isBusy ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <ShoppingBag size={14} />
                          )}
                          <span>Buyurtma berish</span>
                        </button>
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleRespond(req, 'REJECT')}
                          className="py-2.5 px-3 rounded-xl bg-white/8 hover:bg-rose-500/20 border border-white/15 hover:border-rose-400/40 text-rose-200 text-xs font-semibold flex items-center justify-center gap-1 transition-colors"
                        >
                          <XCircle size={14} />
                          <span>Rad etish</span>
                        </button>
                        <button
                          type="button"
                          data-sound="cart"
                          disabled={isBusy}
                          onClick={() => handleRespond(req, 'ACCEPT', 'cart')}
                          className="sm:col-span-3 py-2 px-3 rounded-xl bg-white/8 hover:bg-white/15 border border-white/15 text-cyan-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                        >
                          <ShoppingCart size={13} />
                          <span>Savatga qo'shib qo'yish</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Rejected admin note (if any) */}
                {req.status === 'REJECTED' && req.adminQuote?.adminNote && (
                  <div className="text-xs text-rose-200 bg-rose-500/10 border border-rose-400/30 rounded-xl p-3">
                    Admin izohi: {req.adminQuote.adminNote}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      {zoomImage && (
        <ImageZoomLightbox
          src={zoomImage.src}
          alt={zoomImage.alt}
          onClose={() => setZoomImage(null)}
        />
      )}
    </div>
  );
};

/* ============================================================================
 * 6. ADMIN PANEL — "RASM SO'ROVLARI" TAB
 * ============================================================================ */
export const AdminCustomRequestsView: React.FC<{
  adminUser: User;
  requests: CustomRequest[];
  onRequestsChange: (updater: (prev: CustomRequest[]) => CustomRequest[]) => void;
  onBack: () => void;
  notify: (msg: string, type?: 'success' | 'error' | 'info') => void;
  safeFetchJSON: (url: string, options?: RequestInit) => Promise<any>;
}> = ({
  adminUser,
  requests,
  onRequestsChange,
  onBack,
  notify,
  safeFetchJSON
}) => {
  const [statusFilter, setStatusFilter] = useState<'ALL' | CustomRequestStatus>('ALL');
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [zoomImage, setZoomImage] = useState<{ src: string; alt: string } | null>(null);
  const [drafts, setDrafts] = useState<
    Record<string, { price: string; deliveryDays: string; adminNote: string }>
  >({});

  useEffect(() => {
    let active = true;
    const loadAll = async () => {
      setLoading(true);
      try {
        const res = await safeFetchJSON(
          `/api/admin/custom-requests?adminId=${encodeURIComponent(adminUser.telegramId)}`
        );
        if (active && Array.isArray(res?.requests)) {
          onRequestsChange(() => res.requests);
        }
      } catch {}
      if (active) setLoading(false);
    };
    loadAll();
    return () => {
      active = false;
    };
  }, [adminUser.telegramId]);

  const getDraft = (req: CustomRequest) => {
    if (drafts[req.id]) return drafts[req.id];
    return {
      price: req.adminQuote?.price ? String(req.adminQuote.price) : '',
      deliveryDays: req.adminQuote?.deliveryDays || '12-15 kun',
      adminNote: req.adminQuote?.adminNote || ''
    };
  };

  const setDraftField = (
    req: CustomRequest,
    field: 'price' | 'deliveryDays' | 'adminNote',
    value: string
  ) => {
    const current = getDraft(req);
    setDrafts((prev) => ({
      ...prev,
      [req.id]: { ...current, [field]: value }
    }));
  };

  const counts = useMemo(() => {
    const c = { ALL: requests.length, PENDING: 0, PRICED: 0, ACCEPTED: 0, REJECTED: 0 };
    for (const r of requests) {
      if (r.status === 'PENDING') c.PENDING++;
      else if (r.status === 'PRICED') c.PRICED++;
      else if (r.status === 'ACCEPTED' || r.status === 'COMPLETED') c.ACCEPTED++;
      else if (r.status === 'REJECTED') c.REJECTED++;
    }
    return c;
  }, [requests]);

  const filteredRequests = useMemo(() => {
    const sorted = [...requests].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    if (statusFilter === 'ALL') return sorted;
    return sorted.filter((r) => r.status === statusFilter);
  }, [requests, statusFilter]);

  const handleAdminAction = async (req: CustomRequest, targetStatus: 'PRICED' | 'REJECTED') => {
    const draft = getDraft(req);
    const numericPrice = Math.round(Number(draft.price) || 0);

    if (targetStatus === 'PRICED' && numericPrice <= 0) {
      notify("Iltimos, to'g'ri narx (so'mda) kiriting", 'error');
      return;
    }

    setSavingId(req.id);
    try {
      const res = await safeFetchJSON(`/api/admin/custom-requests/${req.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminId: adminUser.telegramId,
          status: targetStatus,
          price: numericPrice,
          deliveryDays: draft.deliveryDays.trim() || '12-15 kun',
          adminNote: draft.adminNote.trim()
        })
      });

      if (res?.request) {
        onRequestsChange((prev) => prev.map((item) => (item.id === req.id ? res.request : item)));
        notify(
          targetStatus === 'PRICED'
            ? `Narx yuborildi (${numericPrice.toLocaleString()} so'm)`
            : "So'rov rad etildi",
          targetStatus === 'PRICED' ? 'success' : 'info'
        );
      }
    } catch (err: any) {
      notify(err?.message || "Saqlashda xatolik yuz berdi", 'error');
    } finally {
      setSavingId(null);
    }
  };

  const filterTabs: { key: 'ALL' | CustomRequestStatus; label: string; count: number }[] = [
    { key: 'ALL', label: 'Barchasi', count: counts.ALL },
    { key: 'PENDING', label: 'Kutilmoqda', count: counts.PENDING },
    { key: 'PRICED', label: 'Narx berilgan', count: counts.PRICED },
    { key: 'ACCEPTED', label: 'Qabul qilingan', count: counts.ACCEPTED },
    { key: 'REJECTED', label: 'Rad etilgan', count: counts.REJECTED }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="p-2.5 yuyu-glass-subtle rounded-xl hover:bg-white/85 dark:hover:bg-slate-800/80 transition-colors"
          >
            <ChevronLeft size={18} />
          </button>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                Rasm so'rovlari
              </h1>
              {counts.PENDING > 0 && (
                <span className="px-2.5 py-0.5 rounded-lg bg-amber-500/15 border border-amber-400/50 text-amber-600 dark:text-amber-300 font-mono tabular-nums text-xs font-bold">
                  {counts.PENDING} kutilmoqda
                </span>
              )}
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Mijozlar yuborgan rasmlar bo'yicha narx belgilash va yetkazish muddatini yuborish
            </p>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        {filterTabs.map((tab) => {
          const active = statusFilter === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setStatusFilter(tab.key)}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap shrink-0 inline-flex items-center gap-2 border transition-colors ${
                active
                  ? 'bg-[#070B14] dark:bg-cyan-500/20 text-white dark:text-cyan-200 border-cyan-400/50 shadow-sm'
                  : 'yuyu-glass-subtle text-slate-600 dark:text-slate-400 hover:border-slate-300'
              }`}
            >
              <span>{tab.label}</span>
              <span className="font-mono tabular-nums text-[11px] opacity-80">{tab.count}</span>
            </button>
          );
        })}
      </div>

      {loading && filteredRequests.length === 0 ? (
        <div className="py-20 text-center space-y-3">
          <Loader2 size={28} className="animate-spin text-cyan-500 mx-auto" />
          <p className="text-sm text-slate-500">So'rovlar yuklanmoqda...</p>
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="rounded-3xl bg-[#070B14] border border-white/10 p-14 text-center text-slate-400 text-sm">
          Ushbu filtr bo'yicha so'rovlar topilmadi.
        </div>
      ) : (
        <div className="space-y-5">
          {filteredRequests.map((req) => {
            const badge = getStatusBadgeMeta(req.status);
            const draft = getDraft(req);
            const isSaving = savingId === req.id;
            const canEditQuote = req.status === 'PENDING' || req.status === 'PRICED';

            return (
              <article
                key={req.id}
                className="rounded-3xl bg-[#070B14] border border-white/12 backdrop-blur-md p-5 sm:p-6 text-white shadow-xl"
              >
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  {/* Left 4 cols: Clickable Zoomable Image */}
                  <div className="lg:col-span-4 space-y-2.5">
                    <button
                      type="button"
                      onClick={() =>
                        setZoomImage({ src: req.imageUrl, alt: req.description || req.id })
                      }
                      className="relative group w-full aspect-[4/3] rounded-2xl overflow-hidden bg-black/60 border border-white/15 flex items-center justify-center"
                    >
                      <SafeImage
                        src={req.imageUrl}
                        alt={req.description || req.id}
                        className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-200"
                      />
                      <span className="absolute bottom-3 right-3 px-2.5 py-1.5 rounded-xl bg-black/70 backdrop-blur-md border border-white/20 text-white text-[11px] font-semibold inline-flex items-center gap-1.5">
                        <ZoomIn size={13} />
                        <span>Kattalashtirish</span>
                      </span>
                    </button>

                    <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                      <span>{req.id}</span>
                      <span>{formatDateUz(req.createdAt)}</span>
                    </div>
                  </div>

                  {/* Right 8 cols: Details + Admin Quote Form */}
                  <div className="lg:col-span-8 space-y-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-1">
                        <h3 className="font-display text-lg font-bold text-white">
                          {req.username || 'Mijoz'}
                        </h3>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-300">
                          <span className="inline-flex items-center gap-1.5 font-mono tabular-nums text-cyan-300">
                            <Phone size={13} />
                            {req.phoneNumber}
                          </span>
                          {req.productLink && (
                            <a
                              href={req.productLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-sky-300 hover:underline break-all"
                            >
                              <Link2 size={13} />
                              <span>Mahsulot havolasini ochish</span>
                              <ExternalLink size={11} />
                            </a>
                          )}
                        </div>
                      </div>

                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border text-xs font-semibold ${badge.cls}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                        <span>{badge.label}</span>
                      </span>
                    </div>

                    <div className="rounded-2xl bg-white/5 border border-white/10 p-3.5 text-sm text-slate-200 leading-relaxed">
                      <p className="text-[11px] font-semibold text-slate-400 mb-1">
                        Mijoz izohi (o'lcham / rang / talablar):
                      </p>
                      <p>{req.description || "Qo'shimcha izoh qoldirilmagan."}</p>
                    </div>

                    {canEditQuote ? (
                      <div className="rounded-2xl bg-white/5 border border-cyan-400/25 p-4 space-y-4">
                        <div className="flex items-center gap-2 text-xs font-semibold text-cyan-300">
                          <Tag size={14} />
                          <span>Admin javobi va narx belgilash</span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                          <div className="space-y-1">
                            <label className="text-[11px] font-semibold text-slate-300">
                              Narx (so'mda) *
                            </label>
                            <input
                              type="number"
                              min={0}
                              step={1000}
                              value={draft.price}
                              onChange={(e) => setDraftField(req, 'price', e.target.value)}
                              placeholder="Masalan: 380000"
                              className="w-full bg-black/40 border border-white/15 rounded-xl px-3.5 py-2.5 text-sm font-mono tabular-nums text-white placeholder:text-slate-500 outline-none focus:border-cyan-400"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[11px] font-semibold text-slate-300">
                              Yetkazib berish muddati
                            </label>
                            <input
                              type="text"
                              value={draft.deliveryDays}
                              onChange={(e) => setDraftField(req, 'deliveryDays', e.target.value)}
                              placeholder="12-15 kun"
                              className="w-full bg-black/40 border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none focus:border-cyan-400"
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[11px] font-semibold text-slate-300">
                            Izoh (ixtiyoriy)
                          </label>
                          <input
                            type="text"
                            value={draft.adminNote}
                            onChange={(e) => setDraftField(req, 'adminNote', e.target.value)}
                            placeholder="Masalan: Xitoydan original varianti bor, kargo narxi ichida"
                            className="w-full bg-black/40 border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none focus:border-cyan-400"
                          />
                        </div>

                        <div className="flex flex-wrap items-center gap-3 pt-1">
                          <button
                            type="button"
                            disabled={isSaving}
                            onClick={() => handleAdminAction(req, 'PRICED')}
                            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-400 to-cyan-400 hover:brightness-110 disabled:opacity-50 text-slate-950 font-display font-bold text-xs sm:text-sm inline-flex items-center gap-2 shadow-lg transition-all"
                          >
                            {isSaving ? (
                              <Loader2 size={15} className="animate-spin" />
                            ) : (
                              <Check size={15} />
                            )}
                            <span>
                              {req.status === 'PRICED' ? 'Narxni yangilash' : 'Narxni yuborish'}
                            </span>
                          </button>

                          <button
                            type="button"
                            disabled={isSaving}
                            onClick={() => handleAdminAction(req, 'REJECTED')}
                            className="px-4 py-2.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-400/40 text-rose-200 text-xs sm:text-sm font-semibold inline-flex items-center gap-1.5 transition-colors"
                          >
                            <XCircle size={15} />
                            <span>Topilmadi / Rad etish</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      req.adminQuote && (
                        <div className="rounded-2xl bg-white/5 border border-white/12 p-4 flex flex-wrap items-center justify-between gap-4">
                          <div className="space-y-0.5">
                            <p className="text-[11px] text-slate-400">Yuborilgan narx</p>
                            <p className="font-mono tabular-nums text-base font-bold text-emerald-300">
                              {(req.adminQuote.price || 0).toLocaleString()} so'm
                            </p>
                          </div>
                          {req.adminQuote.deliveryDays && (
                            <div className="space-y-0.5">
                              <p className="text-[11px] text-slate-400">Muddat</p>
                              <p className="text-xs font-semibold text-white">
                                {req.adminQuote.deliveryDays}
                              </p>
                            </div>
                          )}
                          {req.adminQuote.adminNote && (
                            <p className="text-xs text-slate-300 w-full border-t border-white/10 pt-2.5">
                              Izoh: {req.adminQuote.adminNote}
                            </p>
                          )}
                        </div>
                      )
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {zoomImage && (
        <ImageZoomLightbox
          src={zoomImage.src}
          alt={zoomImage.alt}
          onClose={() => setZoomImage(null)}
        />
      )}
    </div>
  );
};
