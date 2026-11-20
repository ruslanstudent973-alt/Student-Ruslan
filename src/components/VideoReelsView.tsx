import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Heart,
  MessageCircle,
  Share2,
  Volume2,
  VolumeX,
  Play,
  Pause,
  ShoppingBag,
  ShoppingCart,
  CreditCard,
  Plus,
  X,
  Send,
  ChevronUp,
  ChevronDown,
  Upload,
  Link2,
  Crown,
  Lock,
  Trash2,
  Star,
  ArrowUpRight,
  Loader2,
  Film,
  Check,
  Minus,
  Palette,
  Ruler
} from 'lucide-react';
import { Product, ProductVideo, User } from '../types';
import { MARKUP_RATE, CURRENCY_RATE } from '../constants';
import { SafeImage } from './YuyuPrimitives';
import { getEffectiveVipStatus, getEffectiveProductPriceUzs } from '../utils/vip';
import { readVideoFileForVercel, assertVercelPayloadSafe } from '../utils/mediaCompress';
import { useAdminAccess } from './AdminOnlyGuard';

interface VideoReelsViewProps {
  videos: ProductVideo[];
  products: Product[];
  currentUser: User;
  onAddToCart: (product: Product, size: string, quantity?: number) => void;
  onOrder: (product: Product, size: string) => void;
  onProductClick: (product: Product) => void;
  onOpenVipModal: () => void;
  onVideosChange: (updater: (prev: ProductVideo[]) => ProductVideo[]) => void;
  notify: (msg: string, type?: 'success' | 'error' | 'info') => void;
  safeFetchJSON: (url: string, options?: RequestInit) => Promise<any>;
}

const COLOR_SWATCH_MAP: Record<string, string> = {
  oq: '#F8FAFC',
  white: '#F8FAFC',
  qora: '#111827',
  black: '#111827',
  kulrang: '#94A3B8',
  grey: '#94A3B8',
  gray: '#94A3B8',
  kumush: '#CBD5E1',
  silver: '#CBD5E1',
  oltin: '#F59E0B',
  gold: '#F59E0B',
  orange: '#F97316',
  "to'q sariq": '#F97316',
  sariq: '#FACC15',
  yellow: '#FACC15',
  qizil: '#EF4444',
  red: '#EF4444',
  "ko'k": '#2563EB',
  blue: '#2563EB',
  navy: '#0F294A',
  yashil: '#10B981',
  green: '#10B981',
  pushti: '#EC4899',
  pink: '#EC4899',
  binafsha: '#8B5CF6',
  purple: '#8B5CF6',
  jigarrang: '#92400E',
  brown: '#92400E',
  bej: '#D6C7B2',
  beige: '#D6C7B2'
};

const OPTIONAL_COLORS = [
  { label: 'Asl rang', swatch: 'linear-gradient(135deg, #F8FAFC 0%, #94A3B8 50%, #0F294A 100%)' },
  { label: 'Qora', swatch: '#111827' },
  { label: 'Oq', swatch: '#F8FAFC' },
  { label: 'Kulrang', swatch: '#94A3B8' }
];

const getVariantColorHex = (variant: string): string | null => {
  const key = variant.trim().toLowerCase();
  return COLOR_SWATCH_MAP[key] || null;
};

const formatRelativeTimeUz = (timestamp: number): string => {
  const diffSec = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (diffSec < 60) return 'hozirgina';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} daqiqa oldin`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} soat oldin`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 30) return `${diffDay} kun oldin`;
  return new Date(timestamp).toLocaleDateString('uz-UZ');
};

export const VideoReelsView: React.FC<VideoReelsViewProps> = ({
  videos,
  products,
  currentUser,
  onAddToCart,
  onOrder,
  onProductClick,
  onOpenVipModal,
  onVideosChange,
  notify,
  safeFetchJSON
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('Barchasi');
  const [activeIndex, setActiveIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [videoErrorMap, setVideoErrorMap] = useState<Record<string, boolean>>({});
  const [progressPct, setProgressPct] = useState(0);
  const [likePopId, setLikePopId] = useState<string | null>(null);

  // Overlays & modals
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const [isQuickBuyOpen, setIsQuickBuyOpen] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Quick Buy state
  const [selectedSize, setSelectedSize] = useState<string>('Standart');
  const [selectedColor, setSelectedColor] = useState<string>('Asl rang');
  const [buyQuantity, setBuyQuantity] = useState<number>(1);
  const [justAddedToCart, setJustAddedToCart] = useState(false);

  // Comments state
  const [commentText, setCommentText] = useState('');
  const [sendingComment, setSendingComment] = useState(false);

  // Upload state
  const [uploadProductId, setUploadProductId] = useState<string>(products[0]?.id || '');
  const [uploadCaption, setUploadCaption] = useState('');
  const [uploadMode, setUploadMode] = useState<'file' | 'url'>('file');
  const [uploadVideoUrl, setUploadVideoUrl] = useState('');
  const [uploadFileName, setUploadFileName] = useState('');
  const [uploading, setUploading] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const touchStartYRef = useRef<number | null>(null);

  const productMap = useMemo(() => {
    const map = new Map<string, Product>();
    for (const p of products) {
      map.set(p.id, p);
    }
    return map;
  }, [products]);

  useEffect(() => {
    if (!uploadProductId && products.length > 0) {
      setUploadProductId(products[0].id);
    }
  }, [products, uploadProductId]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const v of videos) {
      const p = productMap.get(v.productId);
      if (p?.category) set.add(p.category);
    }
    return ['Barchasi', ...Array.from(set)];
  }, [videos, productMap]);

  const filteredVideos = useMemo(() => {
    const valid = videos.filter((v) => productMap.has(v.productId));
    if (selectedCategory === 'Barchasi') return valid;
    return valid.filter((v) => productMap.get(v.productId)?.category === selectedCategory);
  }, [videos, productMap, selectedCategory]);

  useEffect(() => {
    if (activeIndex >= filteredVideos.length) {
      setActiveIndex(Math.max(0, filteredVideos.length - 1));
    }
  }, [filteredVideos.length, activeIndex]);

  const activeReel = filteredVideos[activeIndex] || null;
  const activeProduct = activeReel ? productMap.get(activeReel.productId) || null : null;

  // Reset per-reel interactive state when active reel changes
  useEffect(() => {
    setIsPaused(false);
    setProgressPct(0);
    setConfirmDeleteId(null);
    setJustAddedToCart(false);
    setBuyQuantity(1);
    setSelectedColor('Asl rang');
    if (activeProduct) {
      setSelectedSize(activeProduct.sizes?.[0] || 'Standart');
    }
  }, [activeReel?.id, activeProduct?.id]);

  // Keyboard navigation (Up / Down arrows) when not typing
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || isUploadOpen) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setIsCommentsOpen(false);
        setIsQuickBuyOpen(false);
        setActiveIndex((prev) => Math.min(filteredVideos.length - 1, prev + 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setIsCommentsOpen(false);
        setIsQuickBuyOpen(false);
        setActiveIndex((prev) => Math.max(0, prev - 1));
      } else if (e.key === 'Escape') {
        setIsCommentsOpen(false);
        setIsQuickBuyOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [filteredVideos.length, isUploadOpen]);

  const goPrev = () => {
    if (activeIndex <= 0) return;
    setIsCommentsOpen(false);
    setIsQuickBuyOpen(false);
    setActiveIndex((i) => Math.max(0, i - 1));
  };

  const goNext = () => {
    if (activeIndex >= filteredVideos.length - 1) return;
    setIsCommentsOpen(false);
    setIsQuickBuyOpen(false);
    setActiveIndex((i) => Math.min(filteredVideos.length - 1, i + 1));
  };

  const togglePlayPause = () => {
    const vid = videoRef.current;
    if (!vid) {
      setIsPaused((p) => !p);
      return;
    }
    if (vid.paused) {
      vid.play().catch(() => {});
      setIsPaused(false);
    } else {
      vid.pause();
      setIsPaused(true);
    }
  };

  const handleLike = async (reel: ProductVideo) => {
    const userId = currentUser.telegramId;
    const alreadyLiked = Array.isArray(reel.likes) && reel.likes.includes(userId);

    setLikePopId(reel.id);
    setTimeout(() => setLikePopId((cur) => (cur === reel.id ? null : cur)), 300);

    // Optimistic update
    onVideosChange((prev) =>
      prev.map((v) => {
        if (v.id !== reel.id) return v;
        const likes = Array.isArray(v.likes) ? v.likes : [];
        return {
          ...v,
          likes: alreadyLiked ? likes.filter((id) => id !== userId) : [...likes, userId]
        };
      })
    );

    try {
      const res = await safeFetchJSON(`/api/videos/${reel.id}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });
      if (res?.video) {
        onVideosChange((prev) => prev.map((v) => (v.id === reel.id ? res.video : v)));
      }
    } catch {
      // Rollback on failure
      onVideosChange((prev) =>
        prev.map((v) => (v.id === reel.id ? reel : v))
      );
      notify("Layk saqlashda xatolik yuz berdi", 'error');
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeReel || !commentText.trim() || sendingComment) return;
    const text = commentText.trim();
    setSendingComment(true);
    try {
      const res = await safeFetchJSON(`/api/videos/${activeReel.id}/comment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.telegramId,
          username: currentUser.username,
          userAvatar: currentUser.avatar || '',
          text
        })
      });
      if (res?.video) {
        onVideosChange((prev) => prev.map((v) => (v.id === activeReel.id ? res.video : v)));
        setCommentText('');
        notify("Izohingiz qo'shildi", 'success');
      }
    } catch {
      notify("Izoh yuborishda xatolik yuz berdi", 'error');
    } finally {
      setSendingComment(false);
    }
  };

  const handleShare = async (reel: ProductVideo, product: Product) => {
    const regularPrice = Math.round(product.pinduoduoPrice * MARKUP_RATE * CURRENCY_RATE);
    const shareText = `YUYU Shop Video: ${product.name}\n${reel.caption}\nNarxi: ${regularPrice.toLocaleString()} so'm`;

    let shared = false;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `YUYU Shop — ${product.name}`,
          text: shareText,
          url: window.location.href
        });
        shared = true;
      } catch {
        // User cancelled or share unsupported — fallback to clipboard
      }
    }

    if (!shared) {
      try {
        await navigator.clipboard.writeText(`${shareText}\n${window.location.href}`);
        notify("Video havolasi nusxalandi!", 'success');
      } catch {
        notify("Havolani nusxalab bo'lmadi", 'info');
      }
    } else {
      notify("Video ulashildi!", 'success');
    }

    // Persist share count in MongoDB
    onVideosChange((prev) =>
      prev.map((v) => (v.id === reel.id ? { ...v, sharesCount: (v.sharesCount || 0) + 1 } : v))
    );
    try {
      const res = await safeFetchJSON(`/api/videos/${reel.id}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (res?.video) {
        onVideosChange((prev) => prev.map((v) => (v.id === reel.id ? res.video : v)));
      }
    } catch {}
  };

  const handleDeleteVideo = async (reelId: string) => {
    if (!currentUser.isAdmin) {
      notify("Faqat administrator videoni o'chirishi mumkin", 'error');
      return;
    }
    try {
      await safeFetchJSON(`/api/videos/${reelId}?userId=${encodeURIComponent(currentUser.telegramId)}`, {
        method: 'DELETE'
      });
      onVideosChange((prev) => prev.filter((v) => v.id !== reelId));
      setConfirmDeleteId(null);
      notify("Video o'chirildi", 'info');
    } catch {
      notify("Videoni o'chirishda xatolik", 'error');
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await readVideoFileForVercel(file);
      setUploadFileName(file.name);
      setUploadVideoUrl(dataUrl);
    } catch (err: any) {
      e.target.value = '';
      notify(err?.message || "Video faylni o'qishda xatolik", 'error');
    }
  };

  const handlePublishVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser.isAdmin) {
      notify("Faqat administrator yangi video yuklashi mumkin", 'error');
      return;
    }
    if (!uploadProductId) {
      notify("Iltimos, mahsulotni tanlang", 'error');
      return;
    }
    if (!uploadVideoUrl.trim()) {
      notify("Video fayl yuklang yoki video havolasini kiriting", 'error');
      return;
    }
    setUploading(true);
    try {
      const linkedProduct = productMap.get(uploadProductId);
      const payload = {
        productId: uploadProductId,
        caption: uploadCaption.trim(),
        videoUrl: uploadVideoUrl.trim(),
        posterImage: linkedProduct?.images?.[0] || '',
        uploaderId: currentUser.telegramId,
        uploaderName: currentUser.username,
        uploaderRole: 'admin'
      };
      assertVercelPayloadSafe(payload);
      const res = await safeFetchJSON('/api/videos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res?.video) {
        onVideosChange((prev) => [res.video, ...prev]);
        setSelectedCategory('Barchasi');
        setActiveIndex(0);
        setUploadCaption('');
        setUploadVideoUrl('');
        setUploadFileName('');
        setIsUploadOpen(false);
        notify("Yangi video muvaffaqiyatli joylandi!", 'success');
      }
    } catch (err: any) {
      notify(err?.message || "Video yuklashda xatolik yuz berdi", 'error');
    } finally {
      setUploading(false);
    }
  };

  const vipInfo = getEffectiveVipStatus(currentUser);
  const regularPrice = activeProduct
    ? Math.round(activeProduct.pinduoduoPrice * MARKUP_RATE * CURRENCY_RATE)
    : 0;
  const effectivePrice = activeProduct
    ? getEffectiveProductPriceUzs(activeProduct, currentUser)
    : 0;
  const hasVipPrice = Boolean(
    activeProduct?.vipPrice && activeProduct.vipPrice > 0 && activeProduct.vipPrice < regularPrice
  );
  const isVipLocked = Boolean(activeProduct?.isVipOnly && !vipInfo.hasVipOnlyAccess);

  const isLikedByMe = Boolean(
    activeReel && Array.isArray(activeReel.likes) && activeReel.likes.includes(currentUser.telegramId)
  );
  const { isAdminAuthorized } = useAdminAccess();
  const isAdmin = isAdminAuthorized;
  const canDeleteActive = Boolean(isAdmin && activeReel);

  const hasPlayableVideo = Boolean(
    activeReel?.videoUrl && !videoErrorMap[activeReel.id]
  );
  const activePoster = activeReel?.posterImage || activeProduct?.images?.[0] || '';

  return (
    <div className="space-y-6">
      {/* Compact Header Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200 dark:border-slate-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
              Mahsulot videolari
            </h1>
            <span className="font-mono tabular-nums text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              {filteredVideos.length} ta
            </span>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Mahsulotlarni jonli videoda ko'ring, izoh qoldiring va bir bosishda sotib oling
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {categories.length > 2 && (
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setActiveIndex(0);
              }}
              aria-label="Video toifasi"
              className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-800 dark:text-slate-200 outline-none focus:border-[#0F294A]"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          )}

          {isAdmin && (
            <button
              type="button"
              onClick={() => setIsUploadOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0F294A] hover:bg-[#163A66] dark:bg-blue-600 dark:hover:bg-blue-500 text-white text-sm font-semibold transition-colors whitespace-nowrap"
            >
              <Plus size={17} />
              <span>Video qo'shish</span>
            </button>
          )}
        </div>
      </div>

      {filteredVideos.length === 0 || !activeReel || !activeProduct ? (
        <div className="py-24 px-6 text-center bg-white dark:bg-[#111827] rounded-3xl border border-slate-200 dark:border-slate-800 space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 mx-auto flex items-center justify-center">
            <Film size={30} />
          </div>
          <div className="space-y-1 max-w-md mx-auto">
            <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white">
              Hozircha videolar mavjud emas
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {isAdmin
                ? "Birinchi bo'lib mahsulot videosini joylang va mijozlar bilan ulashing."
                : "Tez orada do'kon tomonidan yangi mahsulot videolari joylanadi."}
            </p>
          </div>
          {isAdmin && (
            <button
              type="button"
              onClick={() => setIsUploadOpen(true)}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#0F294A] hover:bg-[#163A66] text-white text-sm font-semibold transition-colors"
            >
              <Upload size={16} />
              <span>Birinchi videoni yuklash</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px] xl:grid-cols-[minmax(0,1fr)_400px] gap-6 items-start">
          {/* Left / Main Cinema Stage */}
          <div className="relative bg-[#070B14] rounded-3xl border border-slate-800/90 overflow-hidden flex items-center justify-center p-2.5 sm:p-5 lg:p-6 min-h-[580px] lg:h-[760px]">
            {/* Ambient subtle backdrop from poster */}
            {activePoster && (
              <div
                aria-hidden="true"
                className="absolute inset-0 bg-cover bg-center opacity-25 blur-3xl scale-110 pointer-events-none"
                style={{ backgroundImage: `url(${activePoster})` }}
              />
            )}

            {/* 9:16 Vertical Reel Frame */}
            <div
              onTouchStart={(e) => {
                touchStartYRef.current = e.touches[0].clientY;
              }}
              onTouchEnd={(e) => {
                if (touchStartYRef.current === null || isCommentsOpen || isQuickBuyOpen) return;
                const deltaY = touchStartYRef.current - e.changedTouches[0].clientY;
                touchStartYRef.current = null;
                if (deltaY > 55) goNext();
                else if (deltaY < -55) goPrev();
              }}
              className="relative z-10 w-full max-w-[410px] h-[74vh] max-h-[710px] sm:aspect-[9/16] sm:h-full rounded-[26px] overflow-hidden bg-black border border-white/15 shadow-[0_25px_70px_rgba(0,0,0,0.65)] select-none"
            >
              {/* Thin Top Playback Progress Bar */}
              <div className="absolute top-0 left-0 right-0 z-30 h-1 bg-white/15">
                <div
                  className="h-full bg-white/90 transition-[width] duration-200"
                  style={{ width: `${hasPlayableVideo ? progressPct : 100}%` }}
                />
              </div>

              {/* Media Layer: Real Video OR Smooth Animated Poster Fallback */}
              {hasPlayableVideo ? (
                <video
                  ref={videoRef}
                  key={activeReel.id}
                  src={activeReel.videoUrl}
                  poster={activePoster}
                  autoPlay
                  loop
                  muted={isMuted}
                  playsInline
                  onClick={togglePlayPause}
                  onTimeUpdate={(e) => {
                    const el = e.currentTarget;
                    if (el.duration > 0) {
                      setProgressPct((el.currentTime / el.duration) * 100);
                    }
                  }}
                  onError={() =>
                    setVideoErrorMap((prev) => ({ ...prev, [activeReel.id]: true }))
                  }
                  className="w-full h-full object-cover cursor-pointer"
                />
              ) : (
                <div
                  onClick={togglePlayPause}
                  className="w-full h-full relative overflow-hidden cursor-pointer bg-[#0B1120]"
                >
                  <SafeImage
                    src={activePoster}
                    alt={activeProduct.name}
                    fallbackLabel={activeProduct.name}
                    className={`w-full h-full object-cover ${isPaused ? '' : 'reel-ken-burns'}`}
                  />
                </div>
              )}

              {/* Contrast Scrims (never block touches on buttons) */}
              <div
                aria-hidden="true"
                className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/70 via-black/25 to-transparent pointer-events-none z-10"
              />
              <div
                aria-hidden="true"
                className="absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-black/90 via-black/50 to-transparent pointer-events-none z-10"
              />

              {/* Center Pause Overlay Icon */}
              {isPaused && (
                <button
                  type="button"
                  onClick={togglePlayPause}
                  aria-label="Davom ettirish"
                  className="absolute inset-0 m-auto w-16 h-16 rounded-full bg-black/45 backdrop-blur-xl border border-white/25 text-white flex items-center justify-center z-20 transition-transform active:scale-95"
                >
                  <Play size={28} className="fill-white ml-1" />
                </button>
              )}

              {/* Top Transparent Glass Header inside Reel */}
              <div className="absolute top-3.5 left-3.5 right-3.5 z-20 flex items-center justify-between gap-2">
                <div className="inline-flex items-center gap-2.5 px-3 py-1.5 rounded-2xl bg-black/35 backdrop-blur-xl border border-white/20 max-w-[70%]">
                  <div className="w-7 h-7 rounded-xl bg-white/15 border border-white/20 text-white font-display font-bold text-xs flex items-center justify-center shrink-0">
                    {(activeReel.uploaderName || 'Y')[0].toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-white truncate leading-tight">
                      {activeReel.uploaderName}
                    </p>
                    <p className="text-[10px] text-white/75 truncate leading-tight">
                      {activeReel.uploaderRole === 'admin' ? 'Rasmiy do\'kon' : 'Mijoz sharhi'} · {formatRelativeTimeUz(activeReel.createdAt)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {hasPlayableVideo && (
                    <button
                      type="button"
                      data-sound="toggle"
                      onClick={() => setIsMuted((m) => !m)}
                      aria-label={isMuted ? 'Ovozni yoqish' : "Ovozni o'chirish"}
                      className="w-9 h-9 rounded-xl bg-black/35 hover:bg-black/55 backdrop-blur-xl border border-white/20 text-white flex items-center justify-center transition-colors"
                    >
                      {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                    </button>
                  )}

                  {canDeleteActive && (
                    confirmDeleteId === activeReel.id ? (
                      <button
                        type="button"
                        onClick={() => handleDeleteVideo(activeReel.id)}
                        className="px-2.5 h-9 rounded-xl bg-red-600/90 hover:bg-red-600 backdrop-blur-xl border border-red-400/50 text-white text-[11px] font-semibold transition-colors whitespace-nowrap"
                      >
                        O'chirish?
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(activeReel.id)}
                        aria-label="Videoni o'chirish"
                        className="w-9 h-9 rounded-xl bg-black/35 hover:bg-red-600/70 backdrop-blur-xl border border-white/20 text-white/90 hover:text-white flex items-center justify-center transition-colors"
                      >
                        <Trash2 size={15} />
                      </button>
                    )
                  )}
                </div>
              </div>

              {/* RIGHT-SIDE TRANSPARENT GLASSMORPHIC ACTION RAIL (Layk, Kament, Uzatish) */}
              <div className="absolute right-3 bottom-44 sm:bottom-48 z-20 flex flex-col items-center gap-3.5">
                {/* Layk Button */}
                <button
                  type="button"
                  onClick={() => handleLike(activeReel)}
                  aria-label="Layk bosish"
                  className="group flex flex-col items-center gap-1 focus-visible:outline-none"
                >
                  <span
                    className={`w-12 h-12 rounded-2xl backdrop-blur-xl border flex items-center justify-center transition-all active:scale-90 shadow-lg ${
                      isLikedByMe
                        ? 'bg-rose-500/35 border-rose-400/60 text-rose-400 shadow-[0_0_20px_rgba(244,63,94,0.35)]'
                        : 'bg-black/35 hover:bg-black/55 border-white/20 text-white'
                    } ${likePopId === activeReel.id ? 'heart-pop' : ''}`}
                  >
                    <Heart
                      size={21}
                      className={isLikedByMe ? 'fill-rose-500 text-rose-500' : 'text-white'}
                    />
                  </span>
                  <span className="font-mono tabular-nums text-[11px] font-semibold text-white drop-shadow">
                    {activeReel.likes?.length || 0}
                  </span>
                  <span className="text-[10px] text-white/80 leading-none drop-shadow">
                    Layk
                  </span>
                </button>

                {/* Kament Button */}
                <button
                  type="button"
                  onClick={() => {
                    setIsQuickBuyOpen(false);
                    setIsCommentsOpen(true);
                  }}
                  aria-label="Kamentlarni ochish"
                  className="group flex flex-col items-center gap-1 focus-visible:outline-none"
                >
                  <span className="w-12 h-12 rounded-2xl bg-black/35 hover:bg-black/55 backdrop-blur-xl border border-white/20 text-white flex items-center justify-center transition-all active:scale-90 shadow-lg">
                    <MessageCircle size={21} />
                  </span>
                  <span className="font-mono tabular-nums text-[11px] font-semibold text-white drop-shadow">
                    {activeReel.comments?.length || 0}
                  </span>
                  <span className="text-[10px] text-white/80 leading-none drop-shadow">
                    Kament
                  </span>
                </button>

                {/* Uzatish (Share) Button */}
                <button
                  type="button"
                  onClick={() => handleShare(activeReel, activeProduct)}
                  aria-label="Uzatish"
                  className="group flex flex-col items-center gap-1 focus-visible:outline-none"
                >
                  <span className="w-12 h-12 rounded-2xl bg-black/35 hover:bg-black/55 backdrop-blur-xl border border-white/20 text-white flex items-center justify-center transition-all active:scale-90 shadow-lg">
                    <Share2 size={20} />
                  </span>
                  <span className="font-mono tabular-nums text-[11px] font-semibold text-white drop-shadow">
                    {activeReel.sharesCount || 0}
                  </span>
                  <span className="text-[10px] text-white/80 leading-none drop-shadow">
                    Uzatish
                  </span>
                </button>
              </div>

              {/* BOTTOM TRANSPARENT GLASSMORPHIC PRODUCT & SOTIB OLISH OVERLAY */}
              <div className="absolute left-3 right-3 bottom-3 z-20 space-y-2.5">
                {activeReel.caption && (
                  <p className="text-xs sm:text-[13px] text-white/95 leading-snug line-clamp-2 pr-14 drop-shadow">
                    {activeReel.caption}
                  </p>
                )}

                <div className="bg-black/40 backdrop-blur-xl border border-white/20 rounded-2xl p-2.5 sm:p-3 flex items-center gap-3 shadow-[0_12px_36px_rgba(0,0,0,0.45)]">
                  <button
                    type="button"
                    onClick={() => onProductClick(activeProduct)}
                    className="w-13 h-13 rounded-xl bg-white/15 border border-white/15 overflow-hidden shrink-0 flex items-center justify-center"
                    title="Mahsulot sahifasini ochish"
                  >
                    <SafeImage
                      src={activeProduct.images?.[0]}
                      alt={activeProduct.name}
                      fallbackLabel={activeProduct.name}
                      className="w-full h-full object-cover"
                    />
                  </button>

                  <div className="min-w-0 flex-1 space-y-0.5">
                    <button
                      type="button"
                      onClick={() => onProductClick(activeProduct)}
                      className="text-left text-xs sm:text-sm font-display font-bold text-white truncate block w-full hover:underline"
                    >
                      {activeProduct.name}
                    </button>

                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                      <span className="font-mono tabular-nums text-xs sm:text-sm font-bold text-white">
                        {regularPrice.toLocaleString()} so'm
                      </span>
                      {hasVipPrice && activeProduct.vipPrice && (
                        <span className="inline-flex items-center gap-1 font-mono tabular-nums text-[10px] font-bold text-amber-300 bg-amber-400/15 border border-amber-400/35 px-1.5 py-0.5 rounded-md">
                          <Crown size={10} />
                          VIP {activeProduct.vipPrice.toLocaleString()}
                        </span>
                      )}
                      {activeProduct.isVipOnly && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-300">
                          <Lock size={10} />
                          Faqat VIP
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    data-sound="cart"
                    onClick={() => {
                      setIsCommentsOpen(false);
                      setIsQuickBuyOpen(true);
                    }}
                    className="px-3.5 sm:px-4 py-2.5 rounded-xl bg-white/90 hover:bg-white text-[#0F294A] font-display font-bold text-xs sm:text-sm shadow-lg transition-all active:scale-95 whitespace-nowrap shrink-0 inline-flex items-center gap-1.5"
                  >
                    <ShoppingBag size={15} />
                    <span>Sotib olish</span>
                  </button>
                </div>
              </div>

              {/* TRANSPARENT GLASSMORPHIC COMMENTS DRAWER (Kament) */}
              {isCommentsOpen && (
                <div className="absolute inset-x-0 bottom-0 top-20 z-30 bg-[#070B14]/82 backdrop-blur-2xl border-t border-white/20 rounded-t-[26px] flex flex-col animate-[pageFadeIn_180ms_ease-out]">
                  <div className="flex items-center justify-between px-4 py-3.5 border-b border-white/15">
                    <div className="flex items-center gap-2">
                      <MessageCircle size={16} className="text-white/90" />
                      <h3 className="font-display font-bold text-sm text-white">
                        Izohlar
                      </h3>
                      <span className="font-mono tabular-nums text-xs text-white/70">
                        ({activeReel.comments?.length || 0})
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsCommentsOpen(false)}
                      aria-label="Izohlarni yopish"
                      className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 no-scrollbar">
                    {!activeReel.comments || activeReel.comments.length === 0 ? (
                      <div className="py-12 text-center space-y-2">
                        <MessageCircle size={28} className="mx-auto text-white/30" />
                        <p className="text-xs text-white/70">
                          Hali izohlar yo'q. Birinchi bo'lib fikr bildiring!
                        </p>
                      </div>
                    ) : (
                      activeReel.comments.map((c) => (
                        <div
                          key={c.id}
                          className="p-3 rounded-2xl bg-white/8 border border-white/10 space-y-1"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-semibold text-white">
                              {c.username}
                            </span>
                            <span className="text-[10px] text-white/55">
                              {formatRelativeTimeUz(c.createdAt)}
                            </span>
                          </div>
                          <p className="text-xs text-white/90 leading-relaxed break-words">
                            {c.text}
                          </p>
                        </div>
                      ))
                    )}
                  </div>

                  <form
                    onSubmit={handleAddComment}
                    className="p-3 border-t border-white/15 bg-black/30 flex items-center gap-2"
                  >
                    <input
                      type="text"
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      placeholder="Izohingizni yozing..."
                      maxLength={400}
                      className="flex-1 bg-white/10 border border-white/20 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-white/50 outline-none focus:border-white/50"
                    />
                    <button
                      type="submit"
                      disabled={sendingComment || !commentText.trim()}
                      aria-label="Izoh yuborish"
                      className="w-10 h-10 rounded-xl bg-white text-[#0F294A] hover:bg-blue-50 disabled:opacity-45 flex items-center justify-center shrink-0 transition-colors"
                    >
                      {sendingComment ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <Send size={16} />
                      )}
                    </button>
                  </form>
                </div>
              )}

              {/* TRANSPARENT GLASSMORPHIC QUICK BUY VARIANT PANEL (Size / Color & Cart Integration) */}
              {isQuickBuyOpen && (() => {
                const rawVariants = activeProduct.sizes?.length
                  ? activeProduct.sizes
                  : ['Standart'];
                const variantsAreColors = rawVariants.every((v) => Boolean(getVariantColorHex(v)));
                const combinedVariantLabel =
                  !variantsAreColors && selectedColor !== 'Asl rang'
                    ? `${selectedSize} · ${selectedColor}`
                    : selectedSize;
                const totalBuyPrice = effectivePrice * buyQuantity;

                return (
                  <div className="absolute inset-0 z-30 flex flex-col justify-end">
                    {/* Dismissible translucent backdrop */}
                    <button
                      type="button"
                      aria-label="Oynani yopish"
                      onClick={() => setIsQuickBuyOpen(false)}
                      className="flex-1 w-full bg-black/45 backdrop-blur-[2px] cursor-default"
                    />

                    {/* Glassmorphic Quick Buy Mini Sheet */}
                    <div
                      role="dialog"
                      aria-modal="true"
                      aria-label="Variant tanlash va sotib olish"
                      className="relative bg-[#070B14]/86 backdrop-blur-2xl border-t border-white/25 rounded-t-[28px] p-4 sm:p-5 space-y-4 shadow-[0_-18px_50px_rgba(0,0,0,0.65)] animate-[pageFadeIn_180ms_ease-out]"
                    >
                      {/* Drag handle */}
                      <div className="w-10 h-1 rounded-full bg-white/25 mx-auto -mt-1" />

                      {/* Product Header */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/20 overflow-hidden shrink-0">
                            <SafeImage
                              src={activeProduct.images?.[0]}
                              alt={activeProduct.name}
                              fallbackLabel={activeProduct.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="min-w-0 space-y-0.5">
                            <div className="flex items-center gap-1.5 text-[11px] text-white/65">
                              <span>{activeProduct.category}</span>
                              <span>·</span>
                              <span className="inline-flex items-center gap-0.5 text-amber-300 font-mono">
                                <Star size={11} className="fill-amber-400 text-amber-400" />
                                {activeProduct.rating}
                              </span>
                            </div>
                            <h3 className="font-display font-bold text-sm text-white line-clamp-1">
                              {activeProduct.name}
                            </h3>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-mono tabular-nums text-sm font-bold text-white">
                                {effectivePrice.toLocaleString()} so'm
                              </span>
                              {hasVipPrice && vipInfo.hasVipPriceAccess && (
                                <span className="font-mono tabular-nums text-[11px] text-white/50 line-through">
                                  {regularPrice.toLocaleString()}
                                </span>
                              )}
                              {hasVipPrice && activeProduct.vipPrice && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-400/15 border border-amber-400/40 text-amber-300 text-[10px] font-mono font-bold">
                                  <Crown size={10} />
                                  <span>VIP</span>
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => setIsQuickBuyOpen(false)}
                          aria-label="Yopish"
                          className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center shrink-0 transition-colors"
                        >
                          <X size={16} />
                        </button>
                      </div>

                      {/* Primary Variant Selector (Color swatches OR Size options) */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-white/85">
                            {variantsAreColors ? <Palette size={13} className="text-blue-300" /> : <Ruler size={13} className="text-blue-300" />}
                            <span>{variantsAreColors ? 'Rang tanlang' : "O'lcham tanlang"}</span>
                            <span className="text-white/50 font-normal">· {selectedSize}</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setIsQuickBuyOpen(false);
                              onProductClick(activeProduct);
                            }}
                            className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-300 hover:underline"
                          >
                            <span>Batafsil</span>
                            <ArrowUpRight size={12} />
                          </button>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {rawVariants.map((variant) => {
                            const active = selectedSize === variant;
                            const swatchHex = getVariantColorHex(variant);
                            return (
                              <button
                                key={variant}
                                type="button"
                                onClick={() => setSelectedSize(variant)}
                                className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all inline-flex items-center gap-2 ${
                                  active
                                    ? 'bg-white text-[#0F294A] border-white shadow-md'
                                    : 'bg-white/10 text-white/90 border-white/20 hover:bg-white/20'
                                }`}
                              >
                                {swatchHex && (
                                  <span
                                    aria-hidden="true"
                                    className="w-3.5 h-3.5 rounded-full border border-black/25 shrink-0"
                                    style={{ backgroundColor: swatchHex }}
                                  />
                                )}
                                <span>{variant}</span>
                                {active && <Check size={12} className="shrink-0" />}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Secondary Color Swatch Row (when primary variants are sizes like 39-44 or S-XL) */}
                      {!variantsAreColors && (
                        <div className="space-y-2">
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-white/85">
                            <Palette size={13} className="text-blue-300" />
                            <span>Rang</span>
                            <span className="text-white/50 font-normal">· {selectedColor}</span>
                          </span>
                          <div className="flex flex-wrap gap-2">
                            {OPTIONAL_COLORS.map((col) => {
                              const active = selectedColor === col.label;
                              return (
                                <button
                                  key={col.label}
                                  type="button"
                                  onClick={() => setSelectedColor(col.label)}
                                  className={`px-2.5 py-1.5 rounded-xl text-[11px] font-semibold border transition-all inline-flex items-center gap-1.5 ${
                                    active
                                      ? 'bg-white/25 text-white border-white/70'
                                      : 'bg-white/8 text-white/75 border-white/15 hover:bg-white/15'
                                  }`}
                                >
                                  <span
                                    aria-hidden="true"
                                    className="w-3 h-3 rounded-full border border-white/40 shrink-0"
                                    style={{ background: col.swatch }}
                                  />
                                  <span>{col.label}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Quantity Stepper & Live Total */}
                      {!isVipLocked && (
                        <div className="flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-2xl bg-white/8 border border-white/15">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-white/75">Miqdor:</span>
                            <div className="inline-flex items-center gap-1 bg-black/35 border border-white/15 rounded-xl p-0.5">
                              <button
                                type="button"
                                aria-label="Miqdorni kamaytirish"
                                onClick={() => setBuyQuantity((q) => Math.max(1, q - 1))}
                                disabled={buyQuantity <= 1}
                                className="w-7 h-7 rounded-lg hover:bg-white/15 disabled:opacity-35 text-white flex items-center justify-center transition-colors"
                              >
                                <Minus size={13} />
                              </button>
                              <span className="w-7 text-center font-mono tabular-nums text-xs font-bold text-white">
                                {buyQuantity}
                              </span>
                              <button
                                type="button"
                                aria-label="Miqdorni oshirish"
                                onClick={() => setBuyQuantity((q) => Math.min(20, q + 1))}
                                className="w-7 h-7 rounded-lg hover:bg-white/15 text-white flex items-center justify-center transition-colors"
                              >
                                <Plus size={13} />
                              </button>
                            </div>
                          </div>

                          <div className="text-right">
                            <p className="text-[10px] text-white/55 leading-none">Jami</p>
                            <p className="font-mono tabular-nums text-sm font-bold text-white mt-0.5">
                              {totalBuyPrice.toLocaleString()} so'm
                            </p>
                          </div>
                        </div>
                      )}

                      {/* VIP Lock OR Add to Cart & Buy Now Actions */}
                      {isVipLocked ? (
                        <div className="p-3.5 rounded-2xl bg-amber-500/15 border border-amber-400/40 space-y-2.5">
                          <div className="flex items-center gap-2 text-amber-300 text-xs font-semibold">
                            <Lock size={14} />
                            <span>Faqat VIP mijozlar uchun eksklyuziv mahsulot</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setIsQuickBuyOpen(false);
                              onOpenVipModal();
                            }}
                            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 font-display font-bold text-xs flex items-center justify-center gap-1.5"
                          >
                            <Crown size={14} />
                            <span>VIP bo'lish</span>
                          </button>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-2.5">
                          <button
                            type="button"
                            data-sound="cart"
                            onClick={() => {
                              onAddToCart(activeProduct, combinedVariantLabel, buyQuantity);
                              setJustAddedToCart(true);
                              setTimeout(() => {
                                setJustAddedToCart(false);
                                setIsQuickBuyOpen(false);
                                setBuyQuantity(1);
                              }, 650);
                            }}
                            className={`py-3 px-3 rounded-xl border font-semibold text-xs flex items-center justify-center gap-1.5 transition-all ${
                              justAddedToCart
                                ? 'bg-emerald-500/30 border-emerald-400/60 text-emerald-200'
                                : 'bg-white/15 hover:bg-white/25 border-white/25 text-white'
                            }`}
                          >
                            {justAddedToCart ? <Check size={15} /> : <ShoppingCart size={15} />}
                            <span>{justAddedToCart ? "Qo'shildi!" : "Savatga qo'shish"}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setIsQuickBuyOpen(false);
                              onOrder(activeProduct, combinedVariantLabel);
                            }}
                            className="py-3 px-3 rounded-xl bg-white hover:bg-blue-50 text-[#0F294A] font-display font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg transition-colors"
                          >
                            <CreditCard size={15} />
                            <span>Hoziroq to'lash</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Desktop Vertical Navigation Controls */}
            {filteredVideos.length > 1 && (
              <div className="hidden sm:flex flex-col items-center gap-2.5 absolute right-4 lg:right-5 top-1/2 -translate-y-1/2 z-20">
                <button
                  type="button"
                  onClick={goPrev}
                  disabled={activeIndex === 0}
                  aria-label="Oldingi video"
                  className="w-11 h-11 rounded-2xl bg-white/10 hover:bg-white/20 disabled:opacity-30 backdrop-blur-xl border border-white/20 text-white flex items-center justify-center transition-all"
                >
                  <ChevronUp size={20} />
                </button>
                <span className="font-mono tabular-nums text-[11px] font-semibold text-white/75 px-2 py-1 rounded-lg bg-black/40 border border-white/10">
                  {activeIndex + 1}/{filteredVideos.length}
                </span>
                <button
                  type="button"
                  onClick={goNext}
                  disabled={activeIndex === filteredVideos.length - 1}
                  aria-label="Keyingi video"
                  className="w-11 h-11 rounded-2xl bg-white/10 hover:bg-white/20 disabled:opacity-30 backdrop-blur-xl border border-white/20 text-white flex items-center justify-center transition-all"
                >
                  <ChevronDown size={20} />
                </button>
              </div>
            )}

            {/* Mobile Prev / Next Quick Pills */}
            {filteredVideos.length > 1 && (
              <div className="sm:hidden absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/40 backdrop-blur-md border border-white/15 text-[10px] font-mono tabular-nums text-white/85 pointer-events-none">
                <span>
                  {activeIndex + 1} / {filteredVideos.length}
                </span>
              </div>
            )}
          </div>

          {/* Right Column: Desktop Video Queue & Upload Card */}
          <aside className="bg-white dark:bg-[#111827] rounded-3xl border border-slate-200 dark:border-slate-800 p-5 lg:h-[760px] flex flex-col gap-4">
            <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">
                  Videolar navbati
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Istalgan mahsulot videosini tanlang
                </p>
              </div>
              <span className="font-mono tabular-nums text-xs font-semibold text-slate-500 dark:text-slate-400">
                {activeIndex + 1}/{filteredVideos.length}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 no-scrollbar">
              {filteredVideos.map((reel, idx) => {
                const prod = productMap.get(reel.productId);
                if (!prod) return null;
                const priceUzs = Math.round(prod.pinduoduoPrice * MARKUP_RATE * CURRENCY_RATE);
                const isActive = idx === activeIndex;
                return (
                  <button
                    key={reel.id}
                    type="button"
                    onClick={() => {
                      setIsCommentsOpen(false);
                      setIsQuickBuyOpen(false);
                      setActiveIndex(idx);
                    }}
                    className={`w-full text-left p-2.5 rounded-2xl border transition-all flex items-center gap-3 ${
                      isActive
                        ? 'bg-[#EEF4FA] dark:bg-blue-950/40 border-[#0F294A] dark:border-blue-500'
                        : 'bg-slate-50/70 dark:bg-slate-900/60 border-slate-200/70 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="relative w-14 h-20 rounded-xl overflow-hidden bg-slate-900 shrink-0">
                      <SafeImage
                        src={reel.posterImage || prod.images?.[0]}
                        alt={prod.name}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/25 flex items-center justify-center">
                        {isActive && !isPaused ? (
                          <Pause size={14} className="text-white fill-white" />
                        ) : (
                          <Play size={14} className="text-white fill-white ml-0.5" />
                        )}
                      </div>
                    </div>

                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="font-display text-sm font-semibold text-slate-900 dark:text-white truncate">
                        {prod.name}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
                        {reel.caption}
                      </p>
                      <div className="flex items-center justify-between gap-2 pt-0.5">
                        <span className="font-mono tabular-nums text-xs font-bold text-[#0F294A] dark:text-blue-400">
                          {priceUzs.toLocaleString()} so'm
                        </span>
                        <div className="flex items-center gap-2 text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400">
                          <span className="inline-flex items-center gap-0.5">
                            <Heart size={11} className="text-rose-500" />
                            {reel.likes?.length || 0}
                          </span>
                          <span className="inline-flex items-center gap-0.5">
                            <MessageCircle size={11} />
                            {reel.comments?.length || 0}
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {isAdmin && (
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsUploadOpen(true)}
                  className="w-full py-3 px-4 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 hover:border-[#0F294A] dark:hover:border-blue-500 bg-slate-50 dark:bg-slate-900/50 hover:bg-[#EEF4FA]/60 dark:hover:bg-blue-950/30 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
                >
                  <Upload size={15} />
                  <span>Yangi mahsulot videosini yuklash</span>
                </button>
              </div>
            )}
          </aside>
        </div>
      )}

      {/* UPLOAD PRODUCT VIDEO MODAL (Admin only) */}
      {isAdmin && isUploadOpen && (
        <div
          className="fixed inset-0 z-[120] bg-black/70 backdrop-blur-md flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Yangi mahsulot videosini qo'shish"
        >
          <div className="w-full max-w-lg bg-white dark:bg-[#111827] rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="space-y-0.5">
                <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                  Yangi video qo'shish
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Mahsulotni tanlang va uning qisqa video sharhini joylang
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsUploadOpen(false)}
                className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center justify-center"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handlePublishVideo} className="p-6 space-y-5 max-h-[82vh] overflow-y-auto">
              {/* Linked Product Select */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Biriktiriladigan mahsulot
                </label>
                <select
                  value={uploadProductId}
                  onChange={(e) => setUploadProductId(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-3 text-sm text-slate-900 dark:text-white outline-none focus:border-[#0F294A]"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({Math.round(p.pinduoduoPrice * MARKUP_RATE * CURRENCY_RATE).toLocaleString()} so'm)
                    </option>
                  ))}
                </select>
              </div>

              {/* Upload Source Toggle */}
              <div className="space-y-2.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Video manbasi
                </label>
                <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800">
                  <button
                    type="button"
                    onClick={() => {
                      setUploadMode('file');
                      setUploadVideoUrl('');
                      setUploadFileName('');
                    }}
                    className={`py-2 px-3 rounded-lg text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors ${
                      uploadMode === 'file'
                        ? 'bg-white dark:bg-slate-900 text-[#0F294A] dark:text-white shadow-sm'
                        : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    <Upload size={14} />
                    <span>Fayl yuklash</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setUploadMode('url');
                      setUploadVideoUrl('');
                      setUploadFileName('');
                    }}
                    className={`py-2 px-3 rounded-lg text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors ${
                      uploadMode === 'url'
                        ? 'bg-white dark:bg-slate-900 text-[#0F294A] dark:text-white shadow-sm'
                        : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    <Link2 size={14} />
                    <span>Video havola (URL)</span>
                  </button>
                </div>

                {uploadMode === 'file' ? (
                  <label className="flex flex-col items-center justify-center gap-2 p-5 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-[#0F294A] dark:hover:border-blue-500 bg-slate-50 dark:bg-slate-900/60 cursor-pointer transition-colors text-center">
                    <Upload size={22} className="text-slate-400" />
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                      {uploadFileName ? uploadFileName : 'MP4 yoki WebM video tanlang (2.8 MB gacha)'}
                    </span>
                    <input
                      type="file"
                      accept="video/mp4,video/webm,video/quicktime"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                ) : (
                  <input
                    type="url"
                    value={uploadVideoUrl}
                    onChange={(e) => setUploadVideoUrl(e.target.value)}
                    placeholder="https://.../mahsulot-videosi.mp4"
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white outline-none focus:border-[#0F294A]"
                  />
                )}

                {uploadVideoUrl && (
                  <div className="rounded-2xl overflow-hidden bg-black aspect-video border border-slate-200 dark:border-slate-800">
                    <video
                      src={uploadVideoUrl}
                      controls
                      muted
                      className="w-full h-full object-contain"
                    />
                  </div>
                )}
              </div>

              {/* Caption */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Video tavsifi
                </label>
                <textarea
                  rows={3}
                  value={uploadCaption}
                  onChange={(e) => setUploadCaption(e.target.value)}
                  placeholder="Masalan: Mahsulot sifati juda zo'r, barcha o'lchamlar mavjud!"
                  maxLength={240}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white outline-none focus:border-[#0F294A] resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsUploadOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  disabled={uploading || !uploadVideoUrl.trim()}
                  className="px-5 py-2.5 rounded-xl bg-[#0F294A] hover:bg-[#163A66] dark:bg-blue-600 dark:hover:bg-blue-500 text-white text-sm font-semibold inline-flex items-center gap-2 disabled:opacity-50"
                >
                  {uploading ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                  <span>Videoni joylash</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
