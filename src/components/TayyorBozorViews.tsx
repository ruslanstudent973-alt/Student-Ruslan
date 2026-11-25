import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Zap,
  ShoppingBag,
  MapPin,
  CheckCircle2,
  Clock,
  XCircle,
  CreditCard,
  Search,
  Upload,
  X,
  ArrowLeft,
  RotateCcw,
  Copy,
  Check,
  Phone,
  SlidersHorizontal,
  PackageCheck
} from 'lucide-react';
import { ResaleListing, ResaleCondition, ResaleStatus, Order, Product, User, View } from '../types';
import { SafeImage } from './YuyuPrimitives';
import { GlassReveal, StaggerGrid, StaggerItem } from './GlassMotionPrimitives';
import { getStoredAffiliateRef } from '../utils/affiliateTracking';
import { uploadMediaSmart } from '../utils/r2MediaUpload';

const UZ_CITIES = [
  'Toshkent',
  'Samarqand',
  'Buxoro',
  "Farg'ona",
  'Andijon',
  'Namangan',
  'Qashqadaryo',
  'Surxondaryo',
  'Xorazm',
  'Navoiy',
  'Jizzax',
  'Sirdaryo',
  'Nukus'
];

function formatCardInput(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 16);
  return digits.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
}

async function compressImageFile(file: File, maxDim = 1080): Promise<string> {
  return uploadMediaSmart(file, { folder: 'resale', maxDim, quality: 0.82 });
}

/* ============================================================================
 * 1. STOREFRONT: «⚡ TAYYOR BOZOR» (O‘zbekistonda tayyor)
 * ========================================================================== */
interface TayyorBozorStorefrontProps {
  currentUser: User;
  onNavigate: (view: View) => void;
  notify: (msg: string, type?: 'success' | 'error' | 'info') => void;
  safeFetchJSON: (url: string, options?: RequestInit) => Promise<any>;
  onRefreshData: () => void;
}

export const TayyorBozorStorefront: React.FC<TayyorBozorStorefrontProps> = ({
  currentUser,
  onNavigate,
  notify,
  safeFetchJSON,
  onRefreshData
}) => {
  const [listings, setListings] = useState<ResaleListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState('Barchasi');
  const [selectedCategory, setSelectedCategory] = useState('Barchasi');
  const [selectedSize, setSelectedSize] = useState('Barchasi');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [activeImageIdx, setActiveImageIdx] = useState<Record<string, number>>({});

  // Buy modal state
  const [buyingListing, setBuyingListing] = useState<ResaleListing | null>(null);
  const [buyerPhone, setBuyerPhone] = useState(currentUser.phoneNumber || '');
  const [buyerAddress, setBuyerAddress] = useState(currentUser.city || '');
  const [submittingBuy, setSubmittingBuy] = useState(false);

  const fetchListings = async () => {
    try {
      setLoading(true);
      const data = await safeFetchJSON('/api/resale/active');
      if (data?.success && Array.isArray(data.listings)) {
        setListings(data.listings);
      }
    } catch {
      notify("Tayyor Bozor e'lonlarini yuklashda xatolik", 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchListings();
  }, []);

  const dynamicCategories = useMemo(() => {
    const set = new Set<string>(['Barchasi']);
    listings.forEach((item) => {
      if (item.category) set.add(item.category);
    });
    return Array.from(set);
  }, [listings]);

  const dynamicCities = useMemo(() => {
    const set = new Set<string>(['Barchasi', ...UZ_CITIES]);
    listings.forEach((item) => {
      if (item.city) set.add(item.city);
    });
    return Array.from(set);
  }, [listings]);

  const dynamicSizes = useMemo(() => {
    const set = new Set<string>(['Barchasi']);
    listings.forEach((item) => {
      if (item.size) set.add(item.size);
    });
    return Array.from(set);
  }, [listings]);

  const filteredListings = useMemo(() => {
    const minVal = minPrice.trim() ? Number(minPrice) : 0;
    const maxVal = maxPrice.trim() ? Number(maxPrice) : Infinity;
    const q = searchQuery.trim().toLowerCase();

    return listings.filter((item) => {
      if (selectedCity !== 'Barchasi' && item.city !== selectedCity) return false;
      if (selectedCategory !== 'Barchasi' && item.category !== selectedCategory) return false;
      if (selectedSize !== 'Barchasi' && item.size !== selectedSize) return false;
      if (Number.isFinite(minVal) && item.resalePrice < minVal) return false;
      if (Number.isFinite(maxVal) && item.resalePrice > maxVal) return false;
      if (
        q &&
        !item.title.toLowerCase().includes(q) &&
        !item.city.toLowerCase().includes(q) &&
        !item.size.toLowerCase().includes(q) &&
        !item.category.toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [listings, selectedCity, selectedCategory, selectedSize, minPrice, maxPrice, searchQuery]);

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    selectedCity !== 'Barchasi' ||
    selectedCategory !== 'Barchasi' ||
    selectedSize !== 'Barchasi' ||
    minPrice.trim() !== '' ||
    maxPrice.trim() !== '';

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedCity('Barchasi');
    setSelectedCategory('Barchasi');
    setSelectedSize('Barchasi');
    setMinPrice('');
    setMaxPrice('');
  };

  const activeAvailableCount = listings.filter((l) => l.status === 'active').length;

  const handleBuySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!buyingListing) return;
    if (!buyerPhone.trim() || buyerPhone.replace(/\D/g, '').length < 9) {
      notify("Iltimos, to'g'ri telefon raqamingizni kiriting", 'error');
      return;
    }
    if (!buyerAddress.trim()) {
      notify("Iltimos, yetkazib berish manzilini kiriting", 'error');
      return;
    }

    try {
      setSubmittingBuy(true);
      const res = await safeFetchJSON(`/api/resale/${encodeURIComponent(buyingListing.id)}/buy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          buyerUserId: currentUser.telegramId || currentUser.phoneNumber,
          buyerName: currentUser.username,
          buyerPhone: buyerPhone.trim(),
          buyerAddress: buyerAddress.trim(),
          referredBy: getStoredAffiliateRef()
        })
      });
      if (res?.success) {
        notify("Tovar siz uchun band qilindi! Admin tez orada bog'lanadi.", 'success');
        setListings((prev) =>
          prev.map((item) =>
            item.id === buyingListing.id
              ? { ...item, status: 'reserved', buyerOrderId: res.buyerOrderId }
              : item
          )
        );
        setBuyingListing(null);
        onRefreshData();
      }
    } catch (err: any) {
      notify(err?.message || "Xaridni rasmiylashtirishda xatolik", 'error');
      fetchListings();
    } finally {
      setSubmittingBuy(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Focused Hero Header */}
      <GlassReveal>
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0F294A] via-[#133560] to-[#091A33] text-white p-7 sm:p-10 border border-white/15 shadow-[0_20px_50px_rgba(15,41,74,0.22)]">
          <div className="relative z-10 flex flex-col lg:flex-row lg:items-end justify-between gap-6">
            <div className="max-w-2xl space-y-3">
              <p className="inline-flex items-center gap-2 text-xs font-semibold text-cyan-300 tracking-wide">
                <Zap size={14} className="fill-cyan-300" />
                <span>O‘zbekistonda tayyor • 1 kunda yetkazish</span>
              </p>
              <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight leading-tight">
                YUYU Tayyor Bozor
              </h1>
              <p className="text-sm sm:text-base text-slate-200/90 leading-relaxed">
                Xitoydan kelgan va razmeri to‘g‘ri kelmay qolgan yangi tovarlarni kutmasdan, O‘zbekiston ichida 1 kunda va arzonroq narxda sotib oling.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <div className="px-4 py-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15">
                <p className="text-[11px] text-slate-300">Sotuvda tayyor</p>
                <p className="font-mono tabular-nums text-xl font-bold text-white">
                  {activeAvailableCount} ta tovar
                </p>
              </div>
              <motion.button
                type="button"
                whileHover={{ y: -2, scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => onNavigate('orders')}
                className="px-5 py-3.5 rounded-2xl bg-white text-[#0F294A] hover:bg-slate-100 text-xs sm:text-sm font-bold whitespace-nowrap shadow-lg transition-colors"
              >
                Buyurtmamni sotuvga qo‘yish
              </motion.button>
            </div>
          </div>
        </section>
      </GlassReveal>

      {/* Filter Bar: Search, City, Category, Size, Price Range */}
      <section className="yuyu-glass p-5 sm:p-6 rounded-3xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
            <SlidersHorizontal size={16} className="text-[#2563EB] dark:text-blue-400" />
            <span>Filtrlar</span>
            <span className="text-xs font-mono tabular-nums font-normal text-slate-500 dark:text-slate-400">
              · {filteredListings.length} ta topildi
            </span>
          </div>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
            >
              <RotateCcw size={13} />
              <span>Filtrlarni tozalash</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          <div className="relative sm:col-span-2">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tovar nomi, shahar yoki razmer..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl yuyu-glass-input border text-sm text-slate-900 dark:text-white outline-none focus:border-[#2563EB]"
            />
          </div>

          <select
            value={selectedCity}
            onChange={(e) => setSelectedCity(e.target.value)}
            aria-label="Shahar bo'yicha filtr"
            className="px-3.5 py-2.5 rounded-xl yuyu-glass-input border text-sm text-slate-900 dark:text-white outline-none focus:border-[#2563EB]"
          >
            {dynamicCities.map((c) => (
              <option key={c} value={c}>
                {c === 'Barchasi' ? 'Barcha shaharlar' : c}
              </option>
            ))}
          </select>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            aria-label="Kategoriya bo'yicha filtr"
            className="px-3.5 py-2.5 rounded-xl yuyu-glass-input border text-sm text-slate-900 dark:text-white outline-none focus:border-[#2563EB]"
          >
            {dynamicCategories.map((cat) => (
              <option key={cat} value={cat}>
                {cat === 'Barchasi' ? 'Barcha kategoriyalar' : cat}
              </option>
            ))}
          </select>

          <select
            value={selectedSize}
            onChange={(e) => setSelectedSize(e.target.value)}
            aria-label="Razmer bo'yicha filtr"
            className="px-3.5 py-2.5 rounded-xl yuyu-glass-input border text-sm text-slate-900 dark:text-white outline-none focus:border-[#2563EB]"
          >
            {dynamicSizes.map((sz) => (
              <option key={sz} value={sz}>
                {sz === 'Barchasi' ? 'Barcha razmerlar' : `Razmer: ${sz}`}
              </option>
            ))}
          </select>

          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              min={0}
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              placeholder="Min so'm"
              className="w-full px-3 py-2.5 rounded-xl yuyu-glass-input border text-xs font-mono tabular-nums text-slate-900 dark:text-white outline-none focus:border-[#2563EB]"
            />
            <input
              type="number"
              min={0}
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              placeholder="Max so'm"
              className="w-full px-3 py-2.5 rounded-xl yuyu-glass-input border text-xs font-mono tabular-nums text-slate-900 dark:text-white outline-none focus:border-[#2563EB]"
            />
          </div>
        </div>
      </section>

      {/* Listings Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-[420px] rounded-3xl yuyu-glass animate-pulse" />
          ))}
        </div>
      ) : filteredListings.length === 0 ? (
        <GlassReveal>
          <div className="yuyu-glass rounded-3xl py-20 px-6 text-center space-y-4">
            <ShoppingBag size={42} strokeWidth={1.3} className="mx-auto text-slate-300 dark:text-slate-600" />
            <div className="space-y-1">
              <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                Hozircha mos tayyor tovar topilmadi
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                {hasActiveFilters
                  ? "Filtr shartlarini o'zgartirib ko'ring yoki barcha e'lonlarni ko'ring."
                  : "Yetib kelgan buyurtmangizning razmeri to'g'ri kelmasa, 'Mening buyurtmalarim' bo'limidan 1 bosishda sotuvga chiqaring."}
              </p>
            </div>
            {hasActiveFilters ? (
              <button
                type="button"
                onClick={resetFilters}
                className="px-5 py-2.5 rounded-xl bg-[#0F294A] dark:bg-blue-600 text-white text-sm font-semibold"
              >
                Barcha e'lonlarni ko'rish
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onNavigate('orders')}
                className="px-5 py-2.5 rounded-xl bg-[#0F294A] dark:bg-blue-600 text-white text-sm font-semibold"
              >
                Buyurtmalarimga o‘tish
              </button>
            )}
          </div>
        </GlassReveal>
      ) : (
        <StaggerGrid className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredListings.map((item) => {
            const imgIdx = activeImageIdx[item.id] || 0;
            const currentImg = item.images?.[imgIdx] || item.images?.[0];
            const savings = Math.max(0, item.originalPrice - item.resalePrice);
            const discountPct =
              item.originalPrice > 0 ? Math.round((savings / item.originalPrice) * 100) : 0;
            const isReserved = item.status === 'reserved';
            const isOwnListing =
              item.sellerUserId === currentUser.telegramId ||
              (currentUser.phoneNumber && item.sellerUserId === currentUser.phoneNumber);

            return (
              <StaggerItem key={item.id}>
                <motion.article
                  whileHover={{ y: -4 }}
                  transition={{ type: 'spring', stiffness: 320, damping: 26 }}
                  className="yuyu-glass rounded-3xl border border-white/90 dark:border-slate-700/60 overflow-hidden flex flex-col h-full justify-between"
                >
                  <div>
                    {/* Product Image Stage */}
                    <div className="relative aspect-[4/3] w-full bg-white/50 dark:bg-slate-800/60 overflow-hidden border-b border-white/70 dark:border-slate-700/40">
                      <SafeImage
                        src={currentImg}
                        alt={item.title}
                        fallbackLabel={item.title}
                        className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                      />
                      <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/65 via-black/25 to-transparent pointer-events-none" />

                      {/* Required Prominent Fast-Delivery Badge */}
                      <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-600/95 backdrop-blur-md text-white text-[11px] font-semibold shadow-md">
                          <Zap size={12} className="fill-white shrink-0" />
                          <span>O‘zbekistonda tayyor • 1 kunda yetkazish</span>
                        </span>
                      </div>

                      {/* City & Size overlay on measured scrim */}
                      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2 text-xs text-white font-medium">
                        <span className="inline-flex items-center gap-1 truncate">
                          <MapPin size={13} className="text-cyan-300 shrink-0" />
                          <span className="truncate">{item.city}</span>
                        </span>
                        <span className="font-mono font-bold px-2 py-0.5 rounded-lg bg-black/55 backdrop-blur-md border border-white/20 shrink-0">
                          Razmer: {item.size}
                        </span>
                      </div>
                    </div>

                    {/* Multi-photo switcher if seller attached live photos */}
                    {item.images && item.images.length > 1 && (
                      <div className="flex items-center gap-1.5 px-5 pt-3">
                        {item.images.map((imgUrl, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setActiveImageIdx((prev) => ({ ...prev, [item.id]: idx }))}
                            className={`w-10 h-10 rounded-lg overflow-hidden border-2 transition-all ${
                              imgIdx === idx
                                ? 'border-[#2563EB] scale-105'
                                : 'border-transparent opacity-65 hover:opacity-100'
                            }`}
                          >
                            <SafeImage src={imgUrl} alt={`${item.title} ${idx + 1}`} className="w-full h-full object-cover" />
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Card Details */}
                    <div className="p-5 space-y-3">
                      <div className="flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
                        <span className="truncate">
                          {item.category} · {item.condition}
                        </span>
                        {discountPct > 0 && (
                          <span className="font-mono tabular-nums font-bold text-red-600 dark:text-red-400 shrink-0">
                            -{discountPct}%
                          </span>
                        )}
                      </div>

                      <h3 className="font-display text-base font-bold text-slate-900 dark:text-white leading-snug line-clamp-2">
                        {item.title}
                      </h3>

                      <div className="flex items-baseline justify-between gap-2 pt-2 border-t border-slate-200/60 dark:border-slate-800/70">
                        <div>
                          {item.originalPrice > item.resalePrice && (
                            <p className="text-xs font-mono tabular-nums text-slate-400 line-through">
                              {item.originalPrice.toLocaleString()} so‘m
                            </p>
                          )}
                          <p className="font-mono tabular-nums text-xl font-bold text-[#0F294A] dark:text-blue-400">
                            {item.resalePrice.toLocaleString()} so‘m
                          </p>
                        </div>
                        <span className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[120px]">
                          Sotuvchi: {item.sellerName}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="px-5 pb-5">
                    {isReserved ? (
                      <button
                        type="button"
                        disabled
                        className="w-full py-3 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs font-bold flex items-center justify-center gap-2 cursor-not-allowed"
                      >
                        <Clock size={15} />
                        <span>Band qilingan (Xarid jarayonida)</span>
                      </button>
                    ) : isOwnListing ? (
                      <div className="w-full py-3 rounded-xl yuyu-glass-subtle border text-center text-xs font-semibold text-slate-600 dark:text-slate-300">
                        Sizning faol e‘loningiz
                      </div>
                    ) : (
                      <motion.button
                        type="button"
                        whileHover={{ scale: 1.015 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => {
                          setBuyerPhone(currentUser.phoneNumber || '');
                          setBuyerAddress(currentUser.city || item.city || '');
                          setBuyingListing(item);
                        }}
                        className="w-full py-3 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white text-sm font-semibold shadow-md shadow-blue-600/20 flex items-center justify-center gap-2 transition-colors"
                      >
                        <ShoppingBag size={16} />
                        <span>Sotib olish (1 kunda yetkazish)</span>
                      </motion.button>
                    )}
                  </div>
                </motion.article>
              </StaggerItem>
            );
          })}
        </StaggerGrid>
      )}

      {/* Quick Reserve & Checkout Modal */}
      <AnimatePresence>
        {buyingListing && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 16 }}
              className="yuyu-glass-strong border rounded-3xl p-6 sm:p-7 max-w-md w-full space-y-5"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                    Tayyor tovarni rasmiylashtirish
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Tasdiqlashingiz bilan tovar boshqalar uchun band qilinadi
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setBuyingListing(null)}
                  className="p-2 rounded-xl hover:bg-slate-200/60 dark:hover:bg-slate-800 text-slate-500"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="yuyu-glass-subtle border p-3.5 rounded-2xl flex items-center gap-3.5">
                <SafeImage
                  src={buyingListing.images?.[0]}
                  alt={buyingListing.title}
                  className="w-16 h-16 rounded-xl object-cover shrink-0"
                />
                <div className="min-w-0 space-y-0.5">
                  <h4 className="font-semibold text-sm text-slate-900 dark:text-white truncate">
                    {buyingListing.title}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Razmer: {buyingListing.size} · {buyingListing.city}
                  </p>
                  <p className="font-mono tabular-nums text-base font-bold text-[#2563EB] dark:text-blue-400">
                    {buyingListing.resalePrice.toLocaleString()} so‘m
                  </p>
                </div>
              </div>

              <form onSubmit={handleBuySubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Telefon raqamingiz
                  </label>
                  <input
                    type="tel"
                    required
                    value={buyerPhone}
                    onChange={(e) => setBuyerPhone(e.target.value)}
                    placeholder="+998 90 123 45 67"
                    className="w-full px-4 py-3 rounded-xl yuyu-glass-input border text-sm text-slate-900 dark:text-white outline-none focus:border-[#2563EB]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Yetkazib berish manzili (Shahar, tuman)
                  </label>
                  <input
                    type="text"
                    required
                    value={buyerAddress}
                    onChange={(e) => setBuyerAddress(e.target.value)}
                    placeholder="Toshkent sh., Yunusobod 4-kvartal"
                    className="w-full px-4 py-3 rounded-xl yuyu-glass-input border text-sm text-slate-900 dark:text-white outline-none focus:border-[#2563EB]"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setBuyingListing(null)}
                    className="flex-1 py-3 rounded-xl yuyu-glass-subtle border text-sm font-semibold text-slate-700 dark:text-slate-300"
                  >
                    Bekor qilish
                  </button>
                  <button
                    type="submit"
                    disabled={submittingBuy}
                    className="flex-1 py-3 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white text-sm font-semibold shadow-md shadow-blue-600/25 disabled:opacity-60"
                  >
                    {submittingBuy ? 'Band qilinmoqda...' : 'Buyurtmani tasdiqlash'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

/* ============================================================================
 * 2. USER CABINET MODAL: «1 BOSISHDA SOTUVGA QO‘Y» (FROM DELIVERED ORDER)
 * ========================================================================== */
interface ResaleListingModalProps {
  order: Order;
  product?: Product | null;
  currentUser: User;
  onClose: () => void;
  onCreated: (listing: ResaleListing) => void;
  notify: (msg: string, type?: 'success' | 'error' | 'info') => void;
  safeFetchJSON: (url: string, options?: RequestInit) => Promise<any>;
}

export const ResaleListingModal: React.FC<ResaleListingModalProps> = ({
  order,
  product,
  currentUser,
  onClose,
  onCreated,
  notify,
  safeFetchJSON
}) => {
  const recommendedPrice = Math.max(10000, Math.round((order.price * 0.85) / 1000) * 1000);
  const [resalePrice, setResalePrice] = useState<number>(recommendedPrice);
  const [condition, setCondition] = useState<ResaleCondition>('Yangi, birkasi bilan');
  const [city, setCity] = useState(currentUser.city || 'Toshkent');
  const [sellerPhone, setSellerPhone] = useState(currentUser.phoneNumber || '');
  const [sellerCard, setSellerCard] = useState('');
  const [liveImages, setLiveImages] = useState<string[]>([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const previewProductImage = product?.images?.[0] || order.receiptImage || '';

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).slice(0, Math.max(0, 3 - liveImages.length));
    if (files.length === 0) return;
    try {
      setUploadingPhoto(true);
      const compressed = await Promise.all(files.map((f) => compressImageFile(f)));
      setLiveImages((prev) => [...prev, ...compressed].slice(0, 3));
    } catch {
      notify("Rasmni yuklashda xatolik", 'error');
    } finally {
      setUploadingPhoto(false);
      e.target.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCardDigits = sellerCard.replace(/\D/g, '');
    if (resalePrice < 5000 || resalePrice > order.price) {
      notify(
        `Sotuv narxi 5 000 so‘mdan ${order.price.toLocaleString()} so‘mgacha bo‘lishi kerak`,
        'error'
      );
      return;
    }
    if (!city.trim()) {
      notify("Shahar yoki tuman nomini kiriting", 'error');
      return;
    }
    if (cleanCardDigits.length !== 16) {
      notify("Pul qaytariladigan karta raqami 16 xonali bo‘lishi kerak", 'error');
      return;
    }
    if (!sellerPhone.trim() || sellerPhone.replace(/\D/g, '').length < 9) {
      notify("Bog‘lanish uchun to‘g‘ri telefon raqamini kiriting", 'error');
      return;
    }

    try {
      setSubmitting(true);
      const res = await safeFetchJSON('/api/resale/listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          originalOrderId: order.id,
          productId: order.productId,
          sellerUserId: currentUser.telegramId || currentUser.phoneNumber,
          sellerName: currentUser.username,
          title: order.productName,
          category: product?.category || 'Kiyim',
          size: order.size || 'Standart',
          originalPrice: order.price,
          resalePrice: Number(resalePrice),
          condition,
          city: city.trim(),
          sellerPhone: sellerPhone.trim(),
          sellerCard: cleanCardDigits,
          images: liveImages
        })
      });
      if (res?.success && res.listing) {
        notify("E'loningiz moderatsiyaga yuborildi! Tasdiqlangach Tayyor Bozorda ko'rinadi.", 'success');
        onCreated(res.listing);
        onClose();
      }
    } catch (err: any) {
      notify(err?.message || "E'lonni joylashda xatolik yuz berdi", 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/65 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 18 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 18 }}
        className="yuyu-glass-strong border rounded-3xl p-6 sm:p-7 max-w-lg w-full max-h-[90vh] overflow-y-auto space-y-5"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-display text-xl font-bold text-slate-900 dark:text-white">
              1 bosishda Tayyor Bozorga qo‘yish
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Tovar ma‘lumotlari buyurtmangizdan avtomatik to‘ldirildi
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-slate-200/60 dark:hover:bg-slate-800 text-slate-500"
          >
            <X size={18} />
          </button>
        </div>

        {/* Auto-filled Order Preview */}
        <div className="yuyu-glass-subtle border p-4 rounded-2xl flex items-center gap-4">
          <SafeImage
            src={previewProductImage}
            alt={order.productName}
            fallbackLabel={order.productName}
            className="w-16 h-16 rounded-xl object-cover shrink-0 bg-white dark:bg-slate-800"
          />
          <div className="min-w-0 space-y-0.5">
            <h4 className="font-display font-semibold text-sm text-slate-900 dark:text-white truncate">
              {order.productName}
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Razmer: <strong className="text-slate-800 dark:text-slate-200">{order.size}</strong> · Buyurtma: {order.id}
            </p>
            <p className="text-xs font-mono tabular-nums text-slate-600 dark:text-slate-300">
              Asl narx: <strong>{order.price.toLocaleString()} so‘m</strong>
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Resale Price with Fast-Sale Recommendation */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Sotuv narxi (maks. {order.price.toLocaleString()} so‘m)
              </label>
              <button
                type="button"
                onClick={() => setResalePrice(recommendedPrice)}
                className="text-[11px] font-semibold text-[#2563EB] dark:text-blue-400 hover:underline"
              >
                Tavsiya: {recommendedPrice.toLocaleString()} so‘m
              </button>
            </div>
            <input
              type="number"
              required
              min={5000}
              max={order.price}
              step={1000}
              value={resalePrice}
              onChange={(e) => setResalePrice(Number(e.target.value))}
              className="w-full px-4 py-3 rounded-xl yuyu-glass-input border font-mono tabular-nums text-base font-bold text-[#0F294A] dark:text-blue-400 outline-none focus:border-[#2563EB]"
            />
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Tez sotilishi uchun asl narxidan 10–15% arzonroq qo‘yish tavsiya etiladi.
            </p>
          </div>

          {/* Condition & City */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Tovar holati
              </label>
              <select
                value={condition}
                onChange={(e) => setCondition(e.target.value as ResaleCondition)}
                className="w-full px-3.5 py-3 rounded-xl yuyu-glass-input border text-sm text-slate-900 dark:text-white outline-none focus:border-[#2563EB]"
              >
                <option value="Yangi, birkasi bilan">Yangi, birkasi bilan</option>
                <option value="Faqat o‘lchab ko‘rilgan">Faqat o‘lchab ko‘rilgan</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Shahringiz / viloyat
              </label>
              <select
                value={UZ_CITIES.includes(city) ? city : 'Toshkent'}
                onChange={(e) => setCity(e.target.value)}
                className="w-full px-3.5 py-3 rounded-xl yuyu-glass-input border text-sm text-slate-900 dark:text-white outline-none focus:border-[#2563EB]"
              >
                {UZ_CITIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Phone & Payout Card */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Telefon raqamingiz
              </label>
              <input
                type="tel"
                required
                value={sellerPhone}
                onChange={(e) => setSellerPhone(e.target.value)}
                placeholder="+998 90 123 45 67"
                className="w-full px-3.5 py-3 rounded-xl yuyu-glass-input border text-sm text-slate-900 dark:text-white outline-none focus:border-[#2563EB]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Pul qaytariladigan karta (16 raqam)
              </label>
              <input
                type="text"
                required
                inputMode="numeric"
                value={sellerCard}
                onChange={(e) => setSellerCard(formatCardInput(e.target.value))}
                placeholder="8600 0000 0000 0000"
                className="w-full px-3.5 py-3 rounded-xl yuyu-glass-input border font-mono tabular-nums text-sm text-slate-900 dark:text-white outline-none focus:border-[#2563EB]"
              />
            </div>
          </div>

          {/* Optional 1-3 Live Photos */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Jonli rasmlar (ixtiyoriy, 1–3 ta)
              </label>
              <span className="text-[11px] font-mono text-slate-400">{liveImages.length}/3</span>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {liveImages.map((img, idx) => (
                <div key={idx} className="relative w-20 h-20 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">
                  <img src={img} alt={`Jonli rasm ${idx + 1}`} className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setLiveImages((prev) => prev.filter((_, i) => i !== idx))}
                    className="absolute top-1 right-1 p-1 rounded-full bg-black/70 text-white"
                  >
                    <X size={11} />
                  </button>
                </div>
              ))}
              {liveImages.length < 3 && (
                <label className="w-20 h-20 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-[#2563EB] flex flex-col items-center justify-center gap-1 cursor-pointer text-slate-500 hover:text-[#2563EB] transition-colors">
                  <Upload size={16} />
                  <span className="text-[10px] font-semibold">
                    {uploadingPhoto ? 'Yuklanmoqda' : 'Rasm'}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    disabled={uploadingPhoto}
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl yuyu-glass-subtle border text-sm font-semibold text-slate-700 dark:text-slate-300"
            >
              Bekor qilish
            </button>
            <button
              type="submit"
              disabled={submitting || uploadingPhoto}
              className="flex-1 py-3 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white text-sm font-semibold shadow-md shadow-blue-600/25 disabled:opacity-60"
            >
              {submitting ? 'Yuborilmoqda...' : 'Sotuvga joylash'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

/* ============================================================================
 * 3. ADMIN PANEL: «TAYYOR BOZOR» MODERATION & COMPLETION
 * ========================================================================== */
interface AdminTayyorBozorViewProps {
  onBack: () => void;
  notify: (msg: string, type?: 'success' | 'error' | 'info') => void;
  safeFetchJSON: (url: string, options?: RequestInit) => Promise<any>;
  onPendingCountChange?: (count: number) => void;
}

const STATUS_LABELS: Record<ResaleStatus, { label: string; color: string }> = {
  pending_moderation: { label: 'Moderatsiyada', color: 'text-amber-600 dark:text-amber-400' },
  active: { label: 'Faol (Sotuvda)', color: 'text-blue-600 dark:text-blue-400' },
  reserved: { label: 'Band qilingan', color: 'text-purple-600 dark:text-purple-400' },
  sold: { label: 'Sotildi va to‘landi', color: 'text-emerald-600 dark:text-emerald-400' },
  rejected: { label: 'Rad etilgan', color: 'text-red-600 dark:text-red-400' }
};

export const AdminTayyorBozorView: React.FC<AdminTayyorBozorViewProps> = ({
  onBack,
  notify,
  safeFetchJSON,
  onPendingCountChange
}) => {
  const [listings, setListings] = useState<ResaleListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | ResaleStatus>('all');
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [copiedCardId, setCopiedCardId] = useState<string | null>(null);

  const loadListings = async () => {
    try {
      setLoading(true);
      const data = await safeFetchJSON('/api/admin/resale');
      if (data?.success && Array.isArray(data.listings)) {
        setListings(data.listings);
        const actionCount = data.listings.filter(
          (l: ResaleListing) => l.status === 'pending_moderation' || l.status === 'reserved'
        ).length;
        onPendingCountChange?.(actionCount);
      }
    } catch (err: any) {
      notify(err?.message || "E'lonlarni yuklashda xatolik", 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadListings();
  }, []);

  const updateListingStatus = async (id: string, status: ResaleStatus, adminNote?: string) => {
    try {
      setUpdatingId(id);
      const res = await safeFetchJSON(`/api/admin/resale/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, adminNote })
      });
      if (res?.success) {
        const updated = listings.map((l) =>
          l.id === id ? { ...l, ...(res.listing || {}), status, adminNote: adminNote ?? l.adminNote } : l
        );
        setListings(updated);
        onPendingCountChange?.(
          updated.filter((l) => l.status === 'pending_moderation' || l.status === 'reserved').length
        );
        setRejectingId(null);
        setRejectReason('');
        notify(
          status === 'active'
            ? "E'lon tasdiqlandi va Tayyor Bozorda faollashtirildi"
            : status === 'sold'
            ? "Sotuv yakunlandi! Mijoz kabinetida 'Sotildi — pulingiz o‘tkazildi' ko'rinadi"
            : "E'lon rad etildi",
          'success'
        );
      }
    } catch (err: any) {
      notify(err?.message || "Statusni yangilashda xatolik", 'error');
    } finally {
      setUpdatingId(null);
    }
  };

  const copyCard = (id: string, card: string) => {
    navigator.clipboard.writeText(card.replace(/\s+/g, ''));
    setCopiedCardId(id);
    notify("Karta raqami nusxalandi", 'info');
    setTimeout(() => setCopiedCardId(null), 1800);
  };

  const counts = useMemo(() => {
    return {
      pending_moderation: listings.filter((l) => l.status === 'pending_moderation').length,
      active: listings.filter((l) => l.status === 'active').length,
      reserved: listings.filter((l) => l.status === 'reserved').length,
      sold: listings.filter((l) => l.status === 'sold').length,
      rejected: listings.filter((l) => l.status === 'rejected').length
    };
  }, [listings]);

  const filtered = statusFilter === 'all' ? listings : listings.filter((l) => l.status === statusFilter);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-slate-200/70 dark:border-slate-800/70">
        <div className="flex items-center gap-3.5">
          <button
            type="button"
            onClick={onBack}
            className="w-10 h-10 rounded-xl yuyu-glass-subtle border flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-800"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
              Tayyor Bozor boshqaruvi
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Qayta sotuv e‘lonlarini moderatsiya qilish va sotuvchilarga pul qaytarishni yakunlash
            </p>
          </div>
        </div>
      </div>

      {/* 4-Column KPI Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="yuyu-glass p-5 rounded-3xl space-y-1">
          <p className="text-xs text-slate-500 dark:text-slate-400">Moderatsiyada</p>
          <p className="font-mono tabular-nums text-2xl font-bold text-amber-600 dark:text-amber-400">
            {counts.pending_moderation}
          </p>
        </div>
        <div className="yuyu-glass p-5 rounded-3xl space-y-1">
          <p className="text-xs text-slate-500 dark:text-slate-400">Faol e‘lonlar</p>
          <p className="font-mono tabular-nums text-2xl font-bold text-[#2563EB] dark:text-blue-400">
            {counts.active}
          </p>
        </div>
        <div className="yuyu-glass p-5 rounded-3xl space-y-1">
          <p className="text-xs text-slate-500 dark:text-slate-400">Band qilingan (Yetkazishda)</p>
          <p className="font-mono tabular-nums text-2xl font-bold text-purple-600 dark:text-purple-400">
            {counts.reserved}
          </p>
        </div>
        <div className="yuyu-glass p-5 rounded-3xl space-y-1">
          <p className="text-xs text-slate-500 dark:text-slate-400">Sotilgan va to‘langan</p>
          <p className="font-mono tabular-nums text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {counts.sold}
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 p-1.5 yuyu-glass-subtle rounded-2xl w-fit">
        {(
          [
            { id: 'all', label: `Barchasi (${listings.length})` },
            { id: 'pending_moderation', label: `Moderatsiya (${counts.pending_moderation})` },
            { id: 'active', label: `Faol (${counts.active})` },
            { id: 'reserved', label: `Band (${counts.reserved})` },
            { id: 'sold', label: `Sotilgan (${counts.sold})` },
            { id: 'rejected', label: `Rad etilgan (${counts.rejected})` }
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setStatusFilter(tab.id)}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
              statusFilter === tab.id
                ? 'bg-[#0F294A] dark:bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Listings */}
      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {[1, 2].map((i) => (
            <div key={i} className="h-56 rounded-3xl yuyu-glass animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="yuyu-glass rounded-3xl py-16 text-center text-sm text-slate-500 dark:text-slate-400">
          Ushbu toifada e‘lonlar mavjud emas.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filtered.map((item) => {
            const st = STATUS_LABELS[item.status] || STATUS_LABELS.pending_moderation;
            const busy = updatingId === item.id;
            return (
              <div key={item.id} className="yuyu-glass p-6 rounded-3xl space-y-4 flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <SafeImage
                        src={item.images?.[0]}
                        alt={item.title}
                        className="w-16 h-16 rounded-2xl object-cover shrink-0 border border-white/70 dark:border-slate-700"
                      />
                      <div className="min-w-0">
                        <p className="font-mono text-[11px] text-slate-400">
                          {item.id} · Buyurtma: {item.originalOrderId}
                        </p>
                        <h3 className="font-display font-bold text-base text-slate-900 dark:text-white truncate">
                          {item.title}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Razmer: <strong>{item.size}</strong> · {item.city} · {item.condition}
                        </p>
                      </div>
                    </div>
                    <span className={`text-xs font-bold shrink-0 ${st.color}`}>{st.label}</span>
                  </div>

                  {/* Price & Seller Payout Info */}
                  <div className="p-4 rounded-2xl yuyu-glass-subtle border space-y-2 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-500 dark:text-slate-400">Sotuv / Asl narx</span>
                      <span className="font-mono tabular-nums font-bold text-slate-900 dark:text-white">
                        {item.resalePrice.toLocaleString()} so‘m{' '}
                        <span className="text-slate-400 font-normal">
                          / {item.originalPrice.toLocaleString()}
                        </span>
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-500 dark:text-slate-400">Sotuvchi</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200 inline-flex items-center gap-1.5">
                        <Phone size={12} />
                        {item.sellerName} · {item.sellerPhone}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-500 dark:text-slate-400">Qaytarish kartasi</span>
                      <button
                        type="button"
                        onClick={() => copyCard(item.id, item.sellerCard)}
                        className="inline-flex items-center gap-1.5 font-mono tabular-nums font-bold text-[#0F294A] dark:text-blue-400 hover:underline"
                      >
                        <CreditCard size={13} />
                        <span>{item.sellerCard}</span>
                        {copiedCardId === item.id ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                      </button>
                    </div>
                  </div>

                  {/* Buyer Info if Reserved or Sold */}
                  {item.buyerOrderId && (
                    <div className="p-3.5 rounded-2xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200/70 dark:border-blue-800/60 text-xs space-y-1">
                      <p className="font-semibold text-blue-900 dark:text-blue-200">
                        Yangi xaridor · Buyurtma {item.buyerOrderId}
                      </p>
                      <p className="text-slate-700 dark:text-slate-300">
                        {item.buyerName} · {item.buyerPhone} · {item.buyerAddress}
                      </p>
                    </div>
                  )}

                  {item.adminNote && (
                    <p className="text-xs text-red-600 dark:text-red-400">
                      Admin izohi: {item.adminNote}
                    </p>
                  )}

                  {/* Reject Reason Form */}
                  {rejectingId === item.id && (
                    <div className="p-3.5 rounded-2xl bg-red-50/80 dark:bg-red-950/35 border border-red-200 dark:border-red-900/50 space-y-2.5">
                      <input
                        type="text"
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        placeholder="Rad etish sababini yozing (masalan: rasm xira)..."
                        className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-red-200 dark:border-red-800 text-xs outline-none"
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setRejectingId(null);
                            setRejectReason('');
                          }}
                          className="flex-1 py-2 rounded-xl bg-white dark:bg-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300"
                        >
                          Bekor
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            updateListingStatus(
                              item.id,
                              'rejected',
                              rejectReason.trim() || "Moderatsiya talablariga mos kelmadi"
                            )
                          }
                          className="flex-1 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold"
                        >
                          Rad etishni tasdiqlash
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-200/60 dark:border-slate-800/70">
                  {item.status === 'pending_moderation' && (
                    <>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => updateListingStatus(item.id, 'active')}
                        className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5 disabled:opacity-50"
                      >
                        <CheckCircle2 size={14} />
                        <span>Tasdiqlash (Faol)</span>
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => {
                          setRejectingId(item.id);
                          setRejectReason('');
                        }}
                        className="flex-1 py-2.5 px-3 rounded-xl bg-red-600/10 hover:bg-red-600 hover:text-white text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/60 text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                      >
                        <XCircle size={14} />
                        <span>Rad etish</span>
                      </button>
                    </>
                  )}

                  {item.status === 'reserved' && (
                    <>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => updateListingStatus(item.id, 'sold')}
                        className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5 disabled:opacity-50"
                      >
                        <PackageCheck size={14} />
                        <span>Sotildi va pul qaytarildi</span>
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => updateListingStatus(item.id, 'active')}
                        className="py-2.5 px-3 rounded-xl yuyu-glass-subtle border text-xs font-semibold text-slate-700 dark:text-slate-300"
                      >
                        Bandni yechish
                      </button>
                    </>
                  )}

                  {item.status === 'active' && (
                    <>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => updateListingStatus(item.id, 'sold')}
                        className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
                      >
                        Sotildi va pul qaytarildi
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => {
                          setRejectingId(item.id);
                          setRejectReason('');
                        }}
                        className="py-2.5 px-3 rounded-xl border border-red-200 dark:border-red-900/60 text-red-600 dark:text-red-400 text-xs font-semibold"
                      >
                        Olib tashlash
                      </button>
                    </>
                  )}

                  {item.status === 'rejected' && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => updateListingStatus(item.id, 'active', '')}
                      className="flex-1 py-2.5 px-3 rounded-xl yuyu-glass-subtle border text-xs font-semibold text-slate-700 dark:text-slate-300"
                    >
                      Qayta faollashtirish
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
