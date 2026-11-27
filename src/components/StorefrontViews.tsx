import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Star, ChevronLeft, ChevronRight, MessageCircle, Send, X, ShieldCheck,
  Package, Truck, Zap, CreditCard, Loader2, Play, PlusCircle, Share2, Heart,
  SlidersHorizontal, ArrowRight, Check, CheckCircle2, RotateCcw, Crown, Lock, Gavel
} from 'lucide-react';
import { Product, Banner, View, User } from '../types';
import { MARKUP_RATE, CURRENCY_RATE } from '../constants';
import {
  YuyuMonogram, SafeImage, ProductCard, YUYU_HERO_IMAGE
} from './YuyuPrimitives';
import {
  StaggerGrid, StaggerItem, GlassReveal, Tilt3DGlassCard
} from './GlassMotionPrimitives';
import { CartRecommendationsSection } from './CartRecommendationsSection';
import { PhotoSourcingBanner } from './CustomRequestComponents';
import { getEffectiveVipStatus } from '../utils/vip';
import { ProductAiAdvisor } from './AiAssistantViews';

export { AuthView } from './AuthView';

export const MAIN_REF_LINK = 'https://t.me/yuyu_shop_bot';

export const LoadingView: React.FC<{ onRetry?: () => void }> = ({ onRetry }) => {
  const [isSlowLoad, setIsSlowLoad] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setIsSlowLoad(true), 10000);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center">
      <div className="yuyu-glass-strong rounded-3xl border px-10 py-9 flex flex-col items-center max-w-xs w-full transition-all duration-300">
        <div className="mb-5 animate-pulse">
          <YuyuMonogram size={56} />
        </div>
        <h1 className="font-display text-3xl font-bold text-[#0F294A] dark:text-white tracking-tight mb-2">
          YUYU Shop
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {isSlowLoad ? 'Ulanish biroz kechikmoqda...' : 'Platforma yuklanmoqda...'}
        </p>
        {isSlowLoad && (
          <button
            type="button"
            onClick={() => {
              setIsSlowLoad(false);
              if (onRetry) {
                onRetry();
              } else {
                window.location.reload();
              }
            }}
            className="mt-5 min-h-[42px] px-5 py-2 rounded-xl bg-[#0F294A] hover:bg-[#163A66] dark:bg-blue-600 dark:hover:bg-blue-500 text-white text-xs font-semibold transition-colors whitespace-nowrap"
          >
            Qayta yuklash
          </button>
        )}
      </div>
    </div>
  );
};


export const HomeView: React.FC<{
  t: any;
  products: Product[];
  cart: any[];
  banners: Banner[];
  onProductClick: (p: Product) => void;
  onAddToCart: (p: Product, size: string) => void;
  onNavigate: (view: View) => void;
  onSelectCategory: (cat: string) => void;
  isAdmin?: boolean;
  currentUser?: User | null;
  onOpenVipModal?: () => void;
}> = ({ products, cart, banners, onProductClick, onAddToCart, onNavigate, onSelectCategory, currentUser, onOpenVipModal }) => {
  const [activeBannerIdx, setActiveBannerIdx] = useState(0);
  const [activeCategory, setActiveCategory] = useState<string>('Barchasi');

  const categories = useMemo(() => {
    const unique = Array.from(new Set(products.map((p) => p.category).filter(Boolean)));
    return ['Barchasi', ...unique];
  }, [products]);

  const displayedProducts = useMemo(() => {
    if (activeCategory === 'Barchasi') return products.slice(0, 8);
    return products.filter((p) => p.category === activeCategory).slice(0, 8);
  }, [products, activeCategory]);

  const flashProducts = useMemo(
    () => products.filter((p) => p.isFlashSale),
    [products]
  );

  const activeBanner = banners && banners.length > 0 ? banners[activeBannerIdx % banners.length] : null;

  return (
    <div className="space-y-14">
      {/* Section 1: Frosted Glass Storefront Hero */}
      <GlassReveal>
        <section className="yuyu-glass rounded-3xl border overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch">
            <div className="lg:col-span-6 p-8 sm:p-10 lg:p-14 flex flex-col justify-center space-y-6">
              <p className="text-xs font-semibold tracking-wide text-[#2563EB] dark:text-blue-400">
                YUYU Shop · Yangi mavsum to'plami
              </p>
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeBanner?.id || 'default-hero'}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.28 }}
                  className="space-y-4"
                >
                  <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 dark:text-white leading-[1.1] tracking-tight">
                    {activeBanner?.title || "Xitoydan saralangan mahsulotlar — to'g'ridan-to'g'ri sizga"}
                  </h1>
                  <p className="text-base text-slate-600 dark:text-slate-300 leading-relaxed max-w-lg">
                    {activeBanner?.subtitle || "1688, Taobao va Pinduoduo platformalaridan ishonchli yetkazib berish va qulay narxlar."}
                  </p>
                </motion.div>
              </AnimatePresence>
              <div className="flex flex-wrap items-center gap-3.5 pt-2">
                <motion.button
                  type="button"
                  whileHover={{ y: -2, scale: 1.02 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => onNavigate((activeBanner?.link as View) || 'catalog')}
                  className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-2xl bg-[#0F294A] hover:bg-[#163A66] dark:bg-blue-600 dark:hover:bg-blue-500 text-white text-sm font-semibold shadow-lg shadow-[#0F294A]/20 transition-colors whitespace-nowrap"
                >
                  <span>Katalogni ko'rish</span>
                  <ArrowRight size={16} />
                </motion.button>
                <motion.button
                  type="button"
                  whileHover={{ y: -2, scale: 1.02 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => onNavigate('auction')}
                  className="inline-flex items-center gap-2 px-5 py-3.5 rounded-2xl bg-blue-500/12 dark:bg-blue-500/20 backdrop-blur-xl border border-blue-400/35 text-[#2563EB] dark:text-blue-300 hover:bg-blue-500/20 text-sm font-semibold transition-colors whitespace-nowrap"
                >
                  <Gavel size={16} />
                  <span>Kim oshdi</span>
                </motion.button>
                <motion.button
                  type="button"
                  whileHover={{ y: -2, scale: 1.02 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => onNavigate('search')}
                  className="inline-flex items-center gap-2 px-5 py-3.5 rounded-2xl bg-white/75 dark:bg-slate-800/70 backdrop-blur-xl border border-white/95 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-800 text-sm font-semibold shadow-sm transition-colors whitespace-nowrap"
                >
                  <Search size={16} />
                  <span>Mahsulot izlash</span>
                </motion.button>
              </div>

              {banners && banners.length > 1 && (
                <div className="flex items-center gap-2 pt-4">
                  {banners.map((b, idx) => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => setActiveBannerIdx(idx)}
                      aria-label={`Banner ${idx + 1}`}
                      className={`h-1.5 rounded-full transition-all ${
                        idx === activeBannerIdx
                          ? 'w-8 bg-[#2563EB] dark:bg-blue-400'
                          : 'w-2.5 bg-slate-300/80 dark:bg-slate-700 hover:bg-slate-400'
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>

            <div className="lg:col-span-6 relative min-h-[280px] lg:min-h-[420px] bg-white/30 dark:bg-slate-900/40 overflow-hidden">
              <SafeImage
                src={activeBanner?.image || YUYU_HERO_IMAGE}
                alt={activeBanner?.title || 'YUYU Shop vitrinasi'}
                fallbackLabel="YUYU Shop"
                className="w-full h-full object-cover lg:absolute lg:inset-0 transition-transform duration-700 hover:scale-105"
              />
            </div>
          </div>
        </section>
      </GlassReveal>

      {/* Optional Flash Sale Collection (only if admin enabled flash sales) */}
      {flashProducts.length > 0 && (
        <FlashSaleDesktopSection products={flashProducts} onProductClick={onProductClick} currentUser={currentUser} />
      )}

      {/* Section 2: Category Filter & Featured Product Grid */}
      <section className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-1">
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
              Ommabop mahsulotlar
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Eng ko'p buyurtma qilinayotgan va tekshirilgan tovarlar
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              if (activeCategory !== 'Barchasi') onSelectCategory(activeCategory);
              onNavigate('catalog');
            }}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#0F294A] dark:text-blue-400 hover:underline whitespace-nowrap self-start md:self-auto"
          >
            <span>Barcha mahsulotlar</span>
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Interactive Category Segmented Bar with sliding glass highlight */}
        {categories.length > 1 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            {categories.map((cat) => {
              const active = activeCategory === cat;
              return (
                <motion.button
                  key={cat}
                  type="button"
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setActiveCategory(cat)}
                  className={`relative px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap shrink-0 transition-colors border ${
                    active
                      ? 'text-white border-transparent shadow-md shadow-blue-600/20'
                      : 'yuyu-glass-subtle text-slate-700 dark:text-slate-300 hover:bg-white/80 dark:hover:bg-slate-800/80'
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId="home-category-active"
                      transition={{ type: 'spring', stiffness: 420, damping: 30 }}
                      className="absolute inset-0 rounded-xl bg-[#0F294A] dark:bg-blue-600 -z-10"
                    />
                  )}
                  <span className="relative z-10">{cat}</span>
                </motion.button>
              );
            })}
          </div>
        )}

        {displayedProducts.length > 0 ? (
          <StaggerGrid key={activeCategory} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {displayedProducts.map((product) => (
              <StaggerItem key={product.id}>
                <ProductCard
                  product={product}
                  currentUser={currentUser}
                  onClick={() => onProductClick(product)}
                />
              </StaggerItem>
            ))}
          </StaggerGrid>
        ) : (
          <div className="py-16 text-center yuyu-glass rounded-3xl border text-slate-500 dark:text-slate-400 text-sm">
            Ushbu toifada hozircha mahsulotlar mavjud emas.
          </div>
        )}
      </section>

      {/* Personalized Cart-Based Recommendations */}
      <CartRecommendationsSection
        cart={cart}
        products={products}
        currentUser={currentUser}
        onOpenVipModal={onOpenVipModal}
        onProductClick={onProductClick}
        onQuickAdd={onAddToCart}
      />

      {/* Section 3: Service & Logistics Proof Strip (3D Glass Cards) */}
      <StaggerGrid className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
        <StaggerItem>
          <Tilt3DGlassCard maxTilt={5} className="yuyu-glass p-6 rounded-3xl border flex items-start gap-4">
            <div className="w-11 h-11 rounded-2xl bg-blue-500/12 dark:bg-blue-500/20 text-[#2563EB] dark:text-blue-400 flex items-center justify-center shrink-0">
              <Truck size={20} />
            </div>
            <div className="space-y-1">
              <h3 className="font-display font-semibold text-base text-slate-900 dark:text-white">
                7–15 kunlik logistika
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Xitoy omboridan O'zbekistongacha muntazam avia va avto reyslar orqali yetkazish.
              </p>
            </div>
          </Tilt3DGlassCard>
        </StaggerItem>

        <StaggerItem>
          <Tilt3DGlassCard maxTilt={5} className="yuyu-glass p-6 rounded-3xl border flex items-start gap-4">
            <div className="w-11 h-11 rounded-2xl bg-emerald-500/12 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <ShieldCheck size={20} />
            </div>
            <div className="space-y-1">
              <h3 className="font-display font-semibold text-base text-slate-900 dark:text-white">
                100% yuk sug'urtasi
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Har bir buyurtma jo'natishdan oldin tekshiriladi va trek raqami taqdim etiladi.
              </p>
            </div>
          </Tilt3DGlassCard>
        </StaggerItem>

        <StaggerItem>
          <Tilt3DGlassCard maxTilt={5} className="yuyu-glass p-6 rounded-3xl border flex items-start gap-4">
            <div className="w-11 h-11 rounded-2xl bg-violet-500/12 dark:bg-violet-500/20 text-violet-600 dark:text-violet-400 flex items-center justify-center shrink-0">
              <Package size={20} />
            </div>
            <div className="space-y-1">
              <h3 className="font-display font-semibold text-base text-slate-900 dark:text-white">
                Bevosita fabrika narxlari
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                1688, Taobao va Pinduoduo manbalaridan ortiqcha vositachilarsiz shaffof hisob.
              </p>
            </div>
          </Tilt3DGlassCard>
        </StaggerItem>
      </StaggerGrid>
    </div>
  );
};

const FlashSaleDesktopSection: React.FC<{
  products: Product[];
  onProductClick: (p: Product) => void;
  currentUser?: User | null;
}> = ({ products, onProductClick, currentUser }) => {
  const [timeLeft, setTimeLeft] = useState({ h: 0, m: 0, s: 0 });

  useEffect(() => {
    const updateTimer = () => {
      const now = Date.now();
      const end = products[0]?.flashSaleEnd || now;
      const diff = Math.max(0, end - now);
      setTimeLeft({
        h: Math.floor(diff / 3600000),
        m: Math.floor((diff % 3600000) / 60000),
        s: Math.floor((diff % 60000) / 1000)
      });
    };
    updateTimer();
    const timer = setInterval(updateTimer, 1000);
    return () => clearInterval(timer);
  }, [products]);

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 flex items-center justify-center">
            <Zap size={18} />
          </div>
          <div>
            <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              Tezkor chegirmalar
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Cheklangan muddatli maxsus narxlar
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 font-mono tabular-nums text-sm font-semibold text-slate-900 dark:text-white">
          <span className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            {String(timeLeft.h).padStart(2, '0')}
          </span>
          <span className="text-slate-400">:</span>
          <span className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            {String(timeLeft.m).padStart(2, '0')}
          </span>
          <span className="text-slate-400">:</span>
          <span className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            {String(timeLeft.s).padStart(2, '0')}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {products.slice(0, 4).map((product) => (
          <ProductCard key={product.id} product={product} currentUser={currentUser} onClick={() => onProductClick(product)} />
        ))}
      </div>
    </section>
  );
};

export const CatalogView: React.FC<{
  t: any;
  products: Product[];
  initialCategory?: string;
  onProductClick: (p: Product) => void;
  currentUser?: User | null;
  onNavigate?: (view: View) => void;
  videoCount?: number;
  pricedCustomRequestsCount?: number;
}> = ({ products, initialCategory = 'Barchasi', onProductClick, currentUser, onNavigate, videoCount = 0, pricedCustomRequestsCount = 0 }) => {
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [sortBy, setSortBy] = useState<'default' | 'price-asc' | 'price-desc' | 'popular'>('default');

  useEffect(() => {
    setSelectedCategory(initialCategory || 'Barchasi');
  }, [initialCategory]);

  const categories = useMemo(() => {
    const unique = Array.from(new Set(products.map((p) => p.category).filter(Boolean)));
    return ['Barchasi', ...unique];
  }, [products]);

  const sortedAndFiltered = useMemo(() => {
    const base =
      selectedCategory === 'Barchasi'
        ? [...products]
        : products.filter((p) => p.category === selectedCategory);

    if (sortBy === 'price-asc') {
      base.sort((a, b) => a.pinduoduoPrice - b.pinduoduoPrice);
    } else if (sortBy === 'price-desc') {
      base.sort((a, b) => b.pinduoduoPrice - a.pinduoduoPrice);
    } else if (sortBy === 'popular') {
      base.sort((a, b) => (b.salesCount || 0) - (a.salesCount || 0));
    }
    return base;
  }, [products, selectedCategory, sortBy]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div className="space-y-1">
          <h1 className="font-display text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
            Mahsulotlar katalogi
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 tabular-nums">
            Jami {sortedAndFiltered.length} ta mahsulot topildi
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {onNavigate && (
            <motion.button
              type="button"
              whileTap={{ scale: 0.96 }}
              onClick={() => onNavigate('search')}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border yuyu-glass-subtle text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-white/85 dark:hover:bg-slate-800 transition-colors"
            >
              <Search size={15} />
              <span>Qidiruv</span>
            </motion.button>
          )}
          <label className="text-xs font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap">
            Saralash:
          </label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="yuyu-glass-input border rounded-xl px-3.5 py-2 text-sm font-medium text-slate-800 dark:text-slate-200 outline-none focus:border-[#2563EB]"
          >
            <option value="default">Standart</option>
            <option value="popular">Ommabop</option>
            <option value="price-asc">Arzonroq avval</option>
            <option value="price-desc">Qimmatroq avval</option>
          </select>
        </div>
      </div>

      {onNavigate && (
        <PhotoSourcingBanner
          compact
          onOpenFindProduct={() => onNavigate('find_product')}
          onOpenMyRequests={() => onNavigate('my_requests')}
          pricedCount={pricedCustomRequestsCount}
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[250px_1fr] gap-8 items-start">
        {/* Left Frosted Glass Category Sidebar */}
        <aside className="yuyu-glass p-5 rounded-3xl border lg:sticky lg:top-24 space-y-4">
          <h2 className="font-display text-sm font-semibold text-slate-900 dark:text-white">
            Toifalar
          </h2>
          <div className="flex lg:flex-col gap-1.5 overflow-x-auto lg:overflow-visible no-scrollbar">
            {onNavigate && (
              <motion.button
                type="button"
                whileTap={{ scale: 0.97 }}
                onClick={() => onNavigate('videos')}
                className="flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-colors whitespace-nowrap shrink-0 text-left bg-[#070B14]/90 backdrop-blur-md dark:bg-blue-950/70 text-white hover:bg-[#0F294A] border border-slate-800 dark:border-blue-500/40"
              >
                <span className="inline-flex items-center gap-2 truncate">
                  <Play size={14} className="fill-current text-blue-400 shrink-0" />
                  <span>Videolar</span>
                </span>
                <span className="font-mono tabular-nums text-xs text-blue-300">
                  {videoCount}
                </span>
              </motion.button>
            )}

            {categories.map((cat) => {
              const count =
                cat === 'Barchasi'
                  ? products.length
                  : products.filter((p) => p.category === cat).length;
              const active = selectedCategory === cat;
              return (
                <motion.button
                  key={cat}
                  type="button"
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setSelectedCategory(cat)}
                  className={`flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap shrink-0 text-left ${
                    active
                      ? 'bg-[#0F294A] dark:bg-blue-600 text-white shadow-md shadow-[#0F294A]/15'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-white/75 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <span className="truncate">{cat}</span>
                  <span
                    className={`font-mono tabular-nums text-xs ${
                      active ? 'text-blue-200' : 'text-slate-400'
                    }`}
                  >
                    {count}
                  </span>
                </motion.button>
              );
            })}
          </div>
        </aside>

        {/* Right Product Grid with staggered cascade */}
        <div>
          {sortedAndFiltered.length > 0 ? (
            <StaggerGrid
              key={`${selectedCategory}-${sortBy}`}
              className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6"
            >
              {sortedAndFiltered.map((p) => (
                <StaggerItem key={p.id}>
                  <ProductCard product={p} currentUser={currentUser} onClick={() => onProductClick(p)} />
                </StaggerItem>
              ))}
            </StaggerGrid>
          ) : (
            <div className="py-20 text-center yuyu-glass rounded-3xl border space-y-3">
              <Package size={36} className="mx-auto text-slate-300 dark:text-slate-600" />
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Hozircha bu toifada mahsulotlar yo'q.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const SearchView: React.FC<{
  t: any;
  query: string;
  setQuery: (q: string) => void;
  results: Product[];
  onProductClick: (p: Product) => void;
  filters: { minPrice: number; maxPrice: number; rating: number };
  setFilters: (f: { minPrice: number; maxPrice: number; rating: number }) => void;
  playSound: () => void;
  currentUser?: User | null;
}> = ({ t, query, setQuery, results, onProductClick, filters, setFilters, playSound, currentUser }) => {
  const resetFilters = () => {
    playSound();
    setQuery('');
    setFilters({ minPrice: 0, maxPrice: 10000000, rating: 0 });
  };

  return (
    <div className="space-y-8">
      <div className="pb-6 border-b border-slate-200 dark:border-slate-800 space-y-1">
        <h1 className="font-display text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
          {t.search}
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Nomi, toifasi, narx oralig'i va reyting bo'yicha aniq qidiruv
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-8 items-start">
        {/* Persistent Frosted Glass Filter Panel */}
        <aside className="yuyu-glass p-6 rounded-3xl border lg:sticky lg:top-24 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-900 dark:text-white font-display font-semibold text-sm">
              <SlidersHorizontal size={16} />
              <span>Filtrlar</span>
            </div>
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-[#2563EB] dark:hover:text-blue-400 transition-colors"
            >
              <RotateCcw size={12} />
              <span>Tozalash</span>
            </button>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400">
              Kalit so'z
            </label>
            <div className="relative">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Mahsulot nomi..."
                className="w-full yuyu-glass-input border rounded-xl py-2.5 pl-10 pr-3 text-sm text-slate-900 dark:text-white outline-none focus:border-[#2563EB]"
              />
            </div>
          </div>

          <div className="space-y-3 pt-4 border-t border-white/60 dark:border-slate-700/60">
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
              {t.price} (UZS)
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] text-slate-500">{t.minPrice}</label>
                <input
                  type="number"
                  value={filters.minPrice}
                  onChange={(e) => setFilters({ ...filters, minPrice: Number(e.target.value) })}
                  className="w-full yuyu-glass-input border rounded-xl px-3 py-2 text-xs font-mono tabular-nums outline-none focus:border-[#2563EB]"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] text-slate-500">{t.maxPrice}</label>
                <input
                  type="number"
                  value={filters.maxPrice}
                  onChange={(e) => setFilters({ ...filters, maxPrice: Number(e.target.value) })}
                  className="w-full yuyu-glass-input border rounded-xl px-3 py-2 text-xs font-mono tabular-nums outline-none focus:border-[#2563EB]"
                />
              </div>
            </div>
          </div>

          <div className="space-y-3 pt-4 border-t border-white/60 dark:border-slate-700/60">
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">{t.rating}</p>
            <div className="grid grid-cols-2 gap-2">
              {[0, 3, 4, 4.5].map((r) => (
                <motion.button
                  key={r}
                  type="button"
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    playSound();
                    setFilters({ ...filters, rating: r });
                  }}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap ${
                    filters.rating === r
                      ? 'bg-[#0F294A] dark:bg-blue-600 text-white shadow-sm'
                      : 'yuyu-glass-subtle border text-slate-600 dark:text-slate-300 hover:bg-white/80 dark:hover:bg-slate-800'
                  }`}
                >
                  {r === 0 ? 'Barchasi' : `${r}+ yulduz`}
                </motion.button>
              ))}
            </div>
          </div>
        </aside>

        {/* Results Grid */}
        <div className="space-y-5">
          <div className="flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
            <span className="tabular-nums">
              Natijalar: <strong className="text-slate-900 dark:text-white">{results.length} ta</strong>
            </span>
          </div>

          {results.length > 0 ? (
            <StaggerGrid className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {results.map((p) => (
                <StaggerItem key={p.id}>
                  <ProductCard product={p} currentUser={currentUser} onClick={() => onProductClick(p)} />
                </StaggerItem>
              ))}
            </StaggerGrid>
          ) : (
            <div className="py-20 text-center yuyu-glass rounded-3xl border space-y-3">
              <Search size={36} className="mx-auto text-slate-300 dark:text-slate-600" />
              <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                So'rovingiz bo'yicha mahsulot topilmadi
              </p>
              <button
                type="button"
                onClick={resetFilters}
                className="text-xs font-semibold text-[#2563EB] dark:text-blue-400 hover:underline"
              >
                Filtrlarni qayta tiklash
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const DetailView: React.FC<{
  t: any;
  product: Product;
  onBack: () => void;
  onOrder: (
    p: Product,
    sz: string,
    quantity?: number,
    selectedColor?: string,
    selectedColorImage?: string
  ) => void;
  onAddToCart: (
    p: Product,
    sz: string,
    quantity?: number,
    selectedColor?: string,
    selectedColorImage?: string
  ) => void;
  isWishlisted: boolean;
  onToggleWishlist: (productId: string) => void;
  playSound: () => void;
  currentUser: any;
  fetchData: () => void;
  notify: (msg: string, type?: 'success' | 'error' | 'info') => void;
  safeFetchJSON: (url: string, options?: RequestInit) => Promise<any>;
  onOpenVipModal?: () => void;
}> = ({
  t,
  product,
  onBack,
  onOrder,
  onAddToCart,
  isWishlisted,
  onToggleWishlist,
  playSound,
  currentUser,
  fetchData,
  notify,
  safeFetchJSON,
  onOpenVipModal
}) => {
  const colorVariants = useMemo(
    () =>
      Array.isArray(product.colorVariants)
        ? product.colorVariants.filter((cv) => cv && cv.name && cv.imageUrl)
        : [],
    [product.colorVariants]
  );
  const availableSizes = useMemo(
    () =>
      Array.isArray(product.sizes) && product.sizes.length > 0
        ? product.sizes.filter((s) => typeof s === 'string' && s.trim().length > 0)
        : ['Standard'],
    [product.sizes]
  );

  const [activeMedia, setActiveMedia] = useState(0);
  const [selectedColor, setSelectedColor] = useState<string>(colorVariants[0]?.name || '');
  const [selectedColorImage, setSelectedColorImage] = useState<string>(
    colorVariants[0]?.imageUrl || ''
  );
  const [heroOverrideImage, setHeroOverrideImage] = useState<string | null>(
    colorVariants[0]?.imageUrl || null
  );
  const [selectedSize, setSelectedSize] = useState<string>(availableSizes[0] || 'Standard');
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);

  useEffect(() => {
    const firstColor = colorVariants[0];
    setSelectedColor(firstColor?.name || '');
    setSelectedColorImage(firstColor?.imageUrl || '');
    setHeroOverrideImage(firstColor?.imageUrl || null);
    setSelectedSize(availableSizes[0] || 'Standard');
    setActiveMedia(0);
  }, [product.id, colorVariants, availableSizes]);

  const mediaItems = [...(product.images || []), ...(product.videos || [])];
  const isVideo = (url: string) => url?.includes('.mp4') || url?.startsWith('data:video');
  const activeHeroSrc = heroOverrideImage || mediaItems[activeMedia] || product.images?.[0] || '';

  const displayPrice = Math.round(product.pinduoduoPrice * MARKUP_RATE * CURRENCY_RATE);
  const displayOldPrice = product.oldPrice ? Math.round(product.oldPrice * MARKUP_RATE * CURRENCY_RATE) : null;
  const discountPct =
    product.oldPrice && product.oldPrice > product.pinduoduoPrice
      ? Math.round((1 - product.pinduoduoPrice / product.oldPrice) * 100)
      : null;

  const vipInfo = getEffectiveVipStatus(currentUser);
  const hasVipPrice = Boolean(product.vipPrice && product.vipPrice > 0 && product.vipPrice < displayPrice);
  const isVipLocked = Boolean(product.isVipOnly && !vipInfo.hasVipOnlyAccess);

  const validateVariantSelection = (): boolean => {
    if (colorVariants.length > 0 && !selectedColor) {
      notify("Iltimos, avval mahsulot rangini tanlang", 'error');
      return false;
    }
    if (availableSizes.length > 0 && !selectedSize) {
      notify("Iltimos, avval mahsulot razmerini tanlang", 'error');
      return false;
    }
    return true;
  };

  const handleReviewSubmit = async (reviewData: { rating: number; comment: string }) => {
    try {
      const res = await safeFetchJSON(`/api/products/${product.id}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...reviewData,
          userId: currentUser?.telegramId || 'guest',
          username: currentUser?.username || 'Mehmon',
          userAvatar: currentUser?.avatar
        })
      });
      if (res?.success) {
        notify("Sharhingiz qabul qilindi!", "success");
        fetchData();
      }
    } catch (e) {
      notify("Sharh yuborishda xatolik yuz berdi", "error");
    }
  };

  const handleShare = async () => {
    playSound();
    const shareText = `YUYU Shop: ${product.name}\nNarxi: ${displayPrice.toLocaleString()} UZS\nKategoriya: ${product.category}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: product.name, text: shareText, url: window.location.href });
        return;
      } catch {
        // Fallback to clipboard
      }
    }
    try {
      await navigator.clipboard.writeText(`${shareText}\n${window.location.href}`);
      notify("Mahsulot havolasi nusxalandi!", "success");
    } catch {
      notify("Ulashish imkoni bo'lmadi", "info");
    }
  };

  return (
    <div className="space-y-14">
      {/* Breadcrumb Back Action */}
      <div>
        <button
          type="button"
          onClick={() => {
            playSound();
            onBack();
          }}
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-[#0F294A] dark:hover:text-white transition-colors"
        >
          <ChevronLeft size={18} />
          <span>Katalogga qaytish</span>
        </button>
      </div>

      {/* Contiguous 12-Column Desktop PDP */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        {/* Left 7 Columns: Frosted Glass Gallery */}
        <div className="lg:col-span-7 space-y-4">
          <div className="aspect-[4/3] w-full yuyu-glass rounded-3xl border overflow-hidden flex items-center justify-center p-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeHeroSrc}
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.22 }}
                className="w-full h-full flex items-center justify-center"
              >
                {isVideo(activeHeroSrc) ? (
                  <video
                    src={activeHeroSrc}
                    controls
                    autoPlay
                    className="max-h-full max-w-full rounded-2xl object-contain"
                  />
                ) : (
                  <SafeImage
                    src={activeHeroSrc}
                    alt={selectedColor ? `${product.name} - ${selectedColor}` : product.name}
                    fallbackLabel={product.name}
                    className="max-h-full max-w-full object-contain"
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {mediaItems.length > 1 && (
            <div className="flex gap-3 overflow-x-auto pb-1 no-scrollbar">
              {mediaItems.map((item, idx) => {
                const isSelectedThumb = !heroOverrideImage && activeMedia === idx;
                return (
                  <motion.button
                    key={idx}
                    type="button"
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.94 }}
                    onClick={() => {
                      playSound();
                      setHeroOverrideImage(null);
                      setActiveMedia(idx);
                    }}
                    className={`w-20 h-20 rounded-2xl overflow-hidden border-2 shrink-0 yuyu-glass-subtle transition-all ${
                      isSelectedThumb
                        ? 'border-[#2563EB] dark:border-blue-400 shadow-md'
                        : 'border-white/70 dark:border-slate-700 opacity-70 hover:opacity-100'
                    }`}
                  >
                    {isVideo(item) ? (
                      <div className="w-full h-full bg-slate-900 flex items-center justify-center">
                        <Play size={18} className="text-white fill-current" />
                      </div>
                    ) : (
                      <SafeImage
                        src={item}
                        alt={`${product.name} ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                    )}
                  </motion.button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right 5 Columns: Contiguous Sticky Frosted Glass Purchase Module */}
        <div className="lg:col-span-5 lg:sticky lg:top-24 yuyu-glass rounded-3xl border p-7 sm:p-8 space-y-6">
          <div className="space-y-3">
            {/* Unboxed quiet metadata */}
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span>{product.category}</span>
              <span aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1 font-mono tabular-nums text-slate-700 dark:text-slate-300 font-medium">
                <Star size={12} className="text-amber-500 fill-amber-500" />
                {product.rating}
              </span>
              {product.isOriginal && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="text-emerald-700 dark:text-emerald-400 font-medium">Original</span>
                </>
              )}
            </div>

            <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight leading-tight">
              {product.name}
            </h1>

            <div className="pt-2 space-y-2.5">
              {product.isVipOnly && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#070B14] border border-amber-400/60 text-amber-300 text-xs font-mono font-bold shadow-[0_0_16px_rgba(251,191,36,0.25)]">
                  {isVipLocked ? <Lock size={13} /> : <Crown size={13} />}
                  <span>Faqat VIP mijozlar uchun</span>
                </div>
              )}

              <div className="space-y-1">
                {displayOldPrice && (
                  <div className="flex items-center gap-2 text-sm font-mono tabular-nums">
                    <span className="text-slate-400 line-through">
                      {displayOldPrice.toLocaleString()} so'm
                    </span>
                    {discountPct && discountPct > 0 && (
                      <span className="text-red-600 dark:text-red-400 font-semibold">
                        -{discountPct}%
                      </span>
                    )}
                  </div>
                )}
                <p
                  className={`font-mono tabular-nums text-3xl font-bold ${
                    hasVipPrice && vipInfo.hasVipPriceAccess
                      ? 'text-slate-400 line-through text-xl'
                      : 'text-[#0F294A] dark:text-blue-400'
                  }`}
                >
                  {displayPrice.toLocaleString()} so'm
                </p>
              </div>

              {hasVipPrice && product.vipPrice && (
                <div className="p-3.5 rounded-xl bg-[#070B14] border border-amber-400/60 shadow-[0_0_24px_rgba(251,191,36,0.2)] flex items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="inline-flex items-center gap-1.5 text-amber-300 text-xs font-mono font-bold">
                      <Crown size={14} className="text-amber-400" />
                      <span>VIP narx:</span>
                    </div>
                    <p className="font-mono tabular-nums text-xl font-bold text-amber-300">
                      {product.vipPrice.toLocaleString()} so'm
                    </p>
                  </div>
                  {vipInfo.hasVipPriceAccess ? (
                    <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-[11px] font-bold whitespace-nowrap">
                      Siz uchun faol
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onOpenVipModal?.()}
                      className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-400 to-yellow-400 text-slate-950 text-xs font-bold whitespace-nowrap"
                    >
                      VIP bo'lish
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            {product.description}
          </p>

          {/* 1688 & Pinduoduo Style Image-Based Color Selector */}
          {colorVariants.length > 0 && (
            <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  Tanlangan rang:{' '}
                  <span className="text-blue-600 dark:text-blue-400 font-bold">
                    {selectedColor || 'Tanlanmagan'}
                  </span>
                </span>
                <span className="text-[11px] font-mono text-slate-400">
                  {colorVariants.length} xil rang
                </span>
              </div>
              <div className="flex items-center gap-3 overflow-x-auto pb-2 pt-1 px-1 no-scrollbar">
                {colorVariants.map((variant, idx) => {
                  const isSelected = selectedColor === variant.name;
                  return (
                    <motion.button
                      key={`${variant.name}-${idx}`}
                      type="button"
                      whileHover={{ y: -2 }}
                      whileTap={{ scale: 0.96 }}
                      onClick={() => {
                        playSound();
                        setSelectedColor(variant.name);
                        setSelectedColorImage(variant.imageUrl);
                        setHeroOverrideImage(variant.imageUrl);
                      }}
                      className="group shrink-0 flex flex-col items-center gap-1.5 text-center focus:outline-none"
                    >
                      <div
                        className={`relative w-16 h-16 rounded-xl overflow-hidden transition-all yuyu-glass-subtle ${
                          isSelected
                            ? 'ring-2 ring-blue-600 border border-blue-600 shadow-md shadow-blue-600/20'
                            : 'border border-slate-200/80 dark:border-slate-700 opacity-85 hover:opacity-100 hover:border-slate-400'
                        }`}
                      >
                        <SafeImage
                          src={variant.imageUrl}
                          alt={variant.name}
                          className="w-full h-full object-cover"
                        />
                        {isSelected && (
                          <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-sm">
                            <Check size={10} strokeWidth={3} />
                          </span>
                        )}
                      </div>
                      <span
                        className={`text-[11px] font-medium max-w-[64px] truncate transition-colors ${
                          isSelected
                            ? 'text-blue-600 dark:text-blue-400 font-bold'
                            : 'text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white'
                        }`}
                      >
                        {variant.name}
                      </span>
                    </motion.button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Frosted Glassmorphic Size Selector */}
          <div className="space-y-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                {t.size}:{' '}
                <span className="text-[#0F294A] dark:text-blue-400 font-bold">{selectedSize}</span>
              </span>
              <span className="text-slate-500 font-mono">{selectedSize}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {availableSizes.map((s) => {
                const isActiveSize = selectedSize === s;
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => {
                      playSound();
                      setSelectedSize(s);
                    }}
                    className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all whitespace-nowrap inline-flex items-center gap-1.5 ${
                      isActiveSize
                        ? 'bg-[#0F294A] dark:bg-blue-600 text-white border-[#0F294A] dark:border-blue-600 ring-2 ring-[#2563EB]/30 shadow-sm'
                        : 'yuyu-glass-subtle text-slate-700 dark:text-slate-300 border-slate-200/80 dark:border-slate-700 hover:border-[#2563EB]/60'
                    }`}
                  >
                    {isActiveSize && <Check size={13} strokeWidth={2.5} />}
                    <span>{s}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Purchase CTAs */}
          <div className="space-y-3 pt-2">
            {isVipLocked ? (
              <div className="space-y-3">
                <div className="p-4 rounded-xl bg-[#070B14] border border-amber-400/50 text-white space-y-2">
                  <div className="flex items-center gap-2 text-amber-300 text-xs font-bold">
                    <Lock size={15} />
                    <span>Faqat VIP mijozlar uchun yopiq mahsulot</span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Ushbu eksklyuziv mahsulotni xarid qilish uchun SILVER, GOLD yoki DIAMOND VIP a'zosi bo'ling.
                  </p>
                  <button
                    type="button"
                    data-sound="welcome"
                    onClick={() => onOpenVipModal?.()}
                    className="w-full py-3 px-5 rounded-xl bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 shadow-[0_0_24px_rgba(251,191,36,0.3)]"
                  >
                    <Crown size={16} />
                    <span>VIP bo'lish (39 000 so'm/oy)</span>
                  </button>
                </div>

                <div className="grid grid-cols-[1fr_auto_auto] gap-2.5">
                  <button
                    type="button"
                    disabled
                    className="py-3 px-4 bg-slate-100 dark:bg-slate-800/80 text-slate-400 border border-slate-200 dark:border-slate-700 font-semibold rounded-xl flex items-center justify-center gap-2 text-sm cursor-not-allowed"
                  >
                    <Lock size={15} />
                    <span>Faqat VIP mijozlar uchun</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onToggleWishlist(product.id)}
                    aria-label={t.wishlist}
                    className={`p-3 rounded-xl border transition-colors ${
                      isWishlisted
                        ? 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900/50 text-red-600'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Heart size={18} className={isWishlisted ? 'fill-current' : ''} />
                  </button>

                  <button
                    type="button"
                    onClick={handleShare}
                    aria-label={t.share}
                    className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    <Share2 size={18} />
                  </button>
                </div>
              </div>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => {
                    if (!validateVariantSelection()) return;
                    onOrder(
                      product,
                      selectedSize,
                      1,
                      selectedColor || undefined,
                      selectedColorImage || undefined
                    );
                  }}
                  className="w-full py-3.5 px-6 bg-[#0F294A] hover:bg-[#163A66] dark:bg-blue-600 dark:hover:bg-blue-500 text-white font-semibold rounded-xl flex items-center justify-center gap-2.5 transition-colors text-sm"
                >
                  <CreditCard size={18} />
                  <span>{t.buy}</span>
                </button>

                <div className="grid grid-cols-[1fr_auto_auto] gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      if (!validateVariantSelection()) return;
                      onAddToCart(
                        product,
                        selectedSize,
                        1,
                        selectedColor || undefined,
                        selectedColorImage || undefined
                      );
                    }}
                    className="py-3 px-4 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors text-sm whitespace-nowrap"
                  >
                    <PlusCircle size={17} />
                    <span>{t.addToCart}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onToggleWishlist(product.id)}
                    aria-label={t.wishlist}
                    className={`p-3 rounded-xl border transition-colors ${
                      isWishlisted
                        ? 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900/50 text-red-600'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Heart size={18} className={isWishlisted ? 'fill-current' : ''} />
                  </button>

                  <button
                    type="button"
                    onClick={handleShare}
                    aria-label={t.share}
                    className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    <Share2 size={18} />
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Quiet Fulfillment Summary */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2 text-xs text-slate-500 dark:text-slate-400">
            <div className="flex items-center justify-between">
              <span>Sotuvchi</span>
              <span className="font-medium text-slate-800 dark:text-slate-200">
                {product.seller?.name || 'YUYU Shop'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Taxminiy vazn</span>
              <span className="font-mono tabular-nums font-medium text-slate-800 dark:text-slate-200">
                {product.weight ? `${product.weight} kg` : "Omborda o'lchanadi"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Yetkazib berish</span>
              <span className="font-medium text-slate-800 dark:text-slate-200">7–15 kun</span>
            </div>
          </div>
        </div>
      </div>

      {/* AI Size & Product Q&A Advisor */}
      <ProductAiAdvisor
        product={product}
        currentUser={currentUser}
        selectedSize={selectedSize}
        onSelectSize={(sz) => {
          playSound();
          setSelectedSize(sz);
        }}
        notify={notify}
        safeFetchJSON={safeFetchJSON}
      />

      {/* Customer Reviews Section */}
      <ReviewsSection
        reviews={product.reviews}
        onWriteReview={() => setIsReviewModalOpen(true)}
        playSound={playSound}
      />

      <ReviewModal
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        onSubmit={handleReviewSubmit}
        playSound={playSound}
        notify={notify}
      />
    </div>
  );
};

const ReviewModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { rating: number; comment: string }) => Promise<void>;
  playSound: () => void;
  notify: (msg: string, type?: 'success' | 'error' | 'info') => void;
}> = ({ isOpen, onClose, onSubmit, playSound, notify }) => {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!comment.trim()) {
      notify("Iltimos, fikringizni yozing", "error");
      return;
    }
    setIsSubmitting(true);
    playSound();
    await onSubmit({ rating, comment });
    setIsSubmitting(false);
    setComment('');
    setRating(5);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/45 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="yuyu-glass-strong w-full max-w-lg rounded-3xl border p-7 space-y-6"
      >
        <div className="flex justify-between items-center">
          <h3 className="font-display text-xl font-bold text-slate-900 dark:text-white">
            Sharh qoldirish
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-500 hover:bg-white/70 dark:hover:bg-slate-800 rounded-xl"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-500">Mahsulotni baholang</p>
          <div className="flex gap-1.5">
            {[1, 2, 3, 4, 5].map((star) => (
              <motion.button
                key={star}
                type="button"
                whileHover={{ scale: 1.15 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => {
                  playSound();
                  setRating(star);
                }}
                className="p-1"
              >
                <Star
                  size={28}
                  fill={star <= rating ? 'currentColor' : 'none'}
                  className={star <= rating ? 'text-amber-400' : 'text-slate-300 dark:text-slate-600'}
                />
              </motion.button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-500">Fikringiz</label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Mahsulot sifati va yetkazib berish haqida yozing..."
            className="w-full h-32 yuyu-glass-input border rounded-2xl p-4 text-sm outline-none focus:border-[#2563EB] resize-none"
          />
        </div>

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-slate-200/80 dark:border-slate-700 text-sm font-semibold text-slate-600 dark:text-slate-300"
          >
            Bekor qilish
          </button>
          <motion.button
            type="button"
            whileTap={{ scale: 0.96 }}
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-6 py-2.5 bg-[#0F294A] hover:bg-[#163A66] dark:bg-blue-600 text-white font-semibold rounded-xl flex items-center gap-2 text-sm disabled:opacity-50"
          >
            {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            <span>Yuborish</span>
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
};

const ReviewsSection: React.FC<{
  reviews?: any[];
  onWriteReview: () => void;
  playSound: () => void;
}> = ({ reviews, onWriteReview, playSound }) => (
  <section className="pt-8 border-t border-white/70 dark:border-slate-800 space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="space-y-1">
        <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
          Xaridorlar sharhlari ({reviews?.length || 0})
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Haqiqiy foydalanuvchilar fikr-mulohazalari
        </p>
      </div>
      <motion.button
        type="button"
        whileHover={{ y: -1 }}
        whileTap={{ scale: 0.96 }}
        onClick={() => {
          playSound();
          onWriteReview();
        }}
        className="px-4 py-2.5 rounded-xl border yuyu-glass-subtle hover:bg-white/85 dark:hover:bg-slate-800 text-sm font-semibold text-slate-900 dark:text-white transition-colors"
      >
        Sharh yozish
      </motion.button>
    </div>

    {!reviews || reviews.length === 0 ? (
      <div className="py-12 text-center yuyu-glass rounded-3xl border border-dashed space-y-2">
        <MessageCircle size={28} className="mx-auto text-slate-300 dark:text-slate-600" />
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Hali sharhlar qoldirilmagan. Birinchi bo'lib fikr bildiring.
        </p>
      </div>
    ) : (
      <StaggerGrid className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {reviews.map((r) => (
          <StaggerItem
            key={r.id}
            className="yuyu-glass p-6 rounded-3xl border space-y-3"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-blue-500/12 dark:bg-slate-800 text-[#2563EB] dark:text-blue-400 flex items-center justify-center font-semibold text-sm">
                  {(r.username || 'M')[0].toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    {r.username}
                  </p>
                  <div className="flex gap-0.5">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        size={11}
                        fill={i < r.rating ? 'currentColor' : 'none'}
                        className={i < r.rating ? 'text-amber-400' : 'text-slate-300 dark:text-slate-600'}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <span className="text-xs font-mono tabular-nums text-slate-400">{r.date}</span>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              {r.comment}
            </p>
          </StaggerItem>
        ))}
      </StaggerGrid>
    )}
  </section>
);
