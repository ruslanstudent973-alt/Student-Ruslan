import React, { useState, useEffect, useMemo } from 'react';
import {
  Search, Star, ChevronLeft, ChevronRight, MessageCircle, Send, X, ShieldCheck,
  Package, Truck, Zap, CreditCard, Loader2, Play, PlusCircle, Share2, Heart,
  SlidersHorizontal, ArrowRight, Check, CheckCircle2, RotateCcw, Crown, Lock
} from 'lucide-react';
import { Product, Banner, View, User } from '../types';
import { MARKUP_RATE, CURRENCY_RATE } from '../constants';
import {
  YuyuMonogram, SafeImage, ProductCard, YUYU_HERO_IMAGE
} from './YuyuPrimitives';
import { CartRecommendationsSection } from './CartRecommendationsSection';
import { PhotoSourcingBanner } from './CustomRequestComponents';
import { getEffectiveVipStatus } from '../utils/vip';

export { AuthView } from './AuthView';

export const MAIN_REF_LINK = 'https://t.me/yuyu_shop_bot';

export const LoadingView: React.FC = () => (
  <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B1120] flex flex-col items-center justify-center p-8 text-center">
    <div className="mb-5">
      <YuyuMonogram size={56} />
    </div>
    <h1 className="font-display text-3xl font-bold text-[#0F294A] dark:text-white tracking-tight mb-2">
      YUYU Shop
    </h1>
    <p className="text-sm text-slate-500 dark:text-slate-400">
      Platforma yuklanmoqda...
    </p>
  </div>
);


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
      {/* Section 1: Desktop Storefront Hero */}
      <section className="bg-white dark:bg-[#111827] rounded-3xl border border-slate-200/90 dark:border-slate-800 overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch">
          <div className="lg:col-span-6 p-8 sm:p-10 lg:p-14 flex flex-col justify-center space-y-6">
            <p className="text-xs font-semibold tracking-wide text-[#0F294A] dark:text-blue-400">
              YUYU Shop · Yangi mavsum to'plami
            </p>
            <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 dark:text-white leading-[1.1] tracking-tight">
              {activeBanner?.title || "Xitoydan saralangan mahsulotlar — to'g'ridan-to'g'ri sizga"}
            </h1>
            <p className="text-base text-slate-600 dark:text-slate-400 leading-relaxed max-w-lg">
              {activeBanner?.subtitle || "1688, Taobao va Pinduoduo platformalaridan ishonchli yetkazib berish va qulay narxlar."}
            </p>
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <button
                type="button"
                onClick={() => onNavigate((activeBanner?.link as View) || 'catalog')}
                className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-xl bg-[#0F294A] hover:bg-[#163A66] dark:bg-blue-600 dark:hover:bg-blue-500 text-white text-sm font-semibold transition-colors whitespace-nowrap"
              >
                <span>Katalogni ko'rish</span>
                <ArrowRight size={16} />
              </button>
              <button
                type="button"
                onClick={() => onNavigate('search')}
                className="inline-flex items-center gap-2 px-5 py-3.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm font-semibold transition-colors whitespace-nowrap"
              >
                <Search size={16} />
                <span>Mahsulot izlash</span>
              </button>
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
                        ? 'w-8 bg-[#0F294A] dark:bg-blue-400'
                        : 'w-2.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="lg:col-span-6 relative min-h-[280px] lg:min-h-[420px] bg-slate-100 dark:bg-slate-900">
            <SafeImage
              src={activeBanner?.image || YUYU_HERO_IMAGE}
              alt={activeBanner?.title || 'YUYU Shop vitrinasi'}
              fallbackLabel="YUYU Shop"
              className="w-full h-full object-cover lg:absolute lg:inset-0"
            />
          </div>
        </div>
      </section>

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

        {/* Interactive Category Segmented Bar */}
        {categories.length > 1 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap shrink-0 transition-colors border ${
                  activeCategory === cat
                    ? 'bg-[#0F294A] dark:bg-blue-600 text-white border-[#0F294A] dark:border-blue-600'
                    : 'bg-white dark:bg-[#111827] text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {displayedProducts.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {displayedProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                currentUser={currentUser}
                onClick={() => onProductClick(product)}
              />
            ))}
          </div>
        ) : (
          <div className="py-16 text-center bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-sm">
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

      {/* Section 3: Service & Logistics Proof Strip */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
        <div className="bg-white dark:bg-[#111827] p-6 rounded-2xl border border-slate-200/90 dark:border-slate-800 flex items-start gap-4">
          <div className="w-11 h-11 rounded-xl bg-[#EEF4FA] dark:bg-slate-800 text-[#0F294A] dark:text-blue-400 flex items-center justify-center shrink-0">
            <Truck size={20} />
          </div>
          <div className="space-y-1">
            <h3 className="font-display font-semibold text-base text-slate-900 dark:text-white">
              7–15 kunlik logistika
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              Xitoy omboridan O'zbekistongacha muntazam avia va avto reyslar orqali yetkazish.
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-[#111827] p-6 rounded-2xl border border-slate-200/90 dark:border-slate-800 flex items-start gap-4">
          <div className="w-11 h-11 rounded-xl bg-[#EEF4FA] dark:bg-slate-800 text-[#0F294A] dark:text-blue-400 flex items-center justify-center shrink-0">
            <ShieldCheck size={20} />
          </div>
          <div className="space-y-1">
            <h3 className="font-display font-semibold text-base text-slate-900 dark:text-white">
              100% yuk sug'urtasi
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              Har bir buyurtma jo'natishdan oldin tekshiriladi va trek raqami taqdim etiladi.
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-[#111827] p-6 rounded-2xl border border-slate-200/90 dark:border-slate-800 flex items-start gap-4">
          <div className="w-11 h-11 rounded-xl bg-[#EEF4FA] dark:bg-slate-800 text-[#0F294A] dark:text-blue-400 flex items-center justify-center shrink-0">
            <Package size={20} />
          </div>
          <div className="space-y-1">
            <h3 className="font-display font-semibold text-base text-slate-900 dark:text-white">
              Bevosita fabrika narxlari
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              1688, Taobao va Pinduoduo manbalaridan ortiqcha vositachilarsiz shaffof hisob.
            </p>
          </div>
        </div>
      </section>
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
            <button
              type="button"
              onClick={() => onNavigate('search')}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#111827] text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <Search size={15} />
              <span>Qidiruv</span>
            </button>
          )}
          <label className="text-xs font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap">
            Saralash:
          </label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-700 rounded-lg px-3.5 py-2 text-sm font-medium text-slate-800 dark:text-slate-200 outline-none focus:border-[#0F294A]"
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
        {/* Left Category Sidebar */}
        <aside className="bg-white dark:bg-[#111827] p-5 rounded-2xl border border-slate-200 dark:border-slate-800 lg:sticky lg:top-24 space-y-4">
          <h2 className="font-display text-sm font-semibold text-slate-900 dark:text-white">
            Toifalar
          </h2>
          <div className="flex lg:flex-col gap-1.5 overflow-x-auto lg:overflow-visible no-scrollbar">
            {onNavigate && (
              <button
                type="button"
                onClick={() => onNavigate('videos')}
                className="flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-colors whitespace-nowrap shrink-0 text-left bg-[#070B14] dark:bg-blue-950/70 text-white hover:bg-[#0F294A] border border-slate-800 dark:border-blue-500/40"
              >
                <span className="inline-flex items-center gap-2 truncate">
                  <Play size={14} className="fill-current text-blue-400 shrink-0" />
                  <span>Videolar</span>
                </span>
                <span className="font-mono tabular-nums text-xs text-blue-300">
                  {videoCount}
                </span>
              </button>
            )}

            {categories.map((cat) => {
              const count =
                cat === 'Barchasi'
                  ? products.length
                  : products.filter((p) => p.category === cat).length;
              const active = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors whitespace-nowrap shrink-0 text-left ${
                    active
                      ? 'bg-[#0F294A] dark:bg-blue-600 text-white'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
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
                </button>
              );
            })}
          </div>
        </aside>

        {/* Right Product Grid */}
        <div>
          {sortedAndFiltered.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {sortedAndFiltered.map((p) => (
                <ProductCard key={p.id} product={p} currentUser={currentUser} onClick={() => onProductClick(p)} />
              ))}
            </div>
          ) : (
            <div className="py-20 text-center bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
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
        {/* Persistent Desktop Filter Panel */}
        <aside className="bg-white dark:bg-[#111827] p-6 rounded-2xl border border-slate-200 dark:border-slate-800 lg:sticky lg:top-24 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-900 dark:text-white font-display font-semibold text-sm">
              <SlidersHorizontal size={16} />
              <span>Filtrlar</span>
            </div>
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-[#0F294A] dark:hover:text-blue-400 transition-colors"
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
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 pl-10 pr-3 text-sm text-slate-900 dark:text-white outline-none focus:border-[#0F294A]"
              />
            </div>
          </div>

          <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
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
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-mono tabular-nums outline-none focus:border-[#0F294A]"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] text-slate-500">{t.maxPrice}</label>
                <input
                  type="number"
                  value={filters.maxPrice}
                  onChange={(e) => setFilters({ ...filters, maxPrice: Number(e.target.value) })}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-mono tabular-nums outline-none focus:border-[#0F294A]"
                />
              </div>
            </div>
          </div>

          <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">{t.rating}</p>
            <div className="grid grid-cols-2 gap-2">
              {[0, 3, 4, 4.5].map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => {
                    playSound();
                    setFilters({ ...filters, rating: r });
                  }}
                  className={`py-2 px-3 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                    filters.rating === r
                      ? 'bg-[#0F294A] dark:bg-blue-600 text-white'
                      : 'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {r === 0 ? 'Barchasi' : `${r}+ yulduz`}
                </button>
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
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {results.map((p) => (
                <ProductCard key={p.id} product={p} currentUser={currentUser} onClick={() => onProductClick(p)} />
              ))}
            </div>
          ) : (
            <div className="py-20 text-center bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
              <Search size={36} className="mx-auto text-slate-300 dark:text-slate-600" />
              <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                So'rovingiz bo'yicha mahsulot topilmadi
              </p>
              <button
                type="button"
                onClick={resetFilters}
                className="text-xs font-semibold text-[#0F294A] dark:text-blue-400 hover:underline"
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
  onOrder: (p: Product, sz: string) => void;
  onAddToCart: (p: Product, sz: string) => void;
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
  const [activeMedia, setActiveMedia] = useState(0);
  const [selectedSize, setSelectedSize] = useState(product.sizes?.[0] || 'Standard');
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);

  const mediaItems = [...(product.images || []), ...(product.videos || [])];
  const isVideo = (url: string) => url?.includes('.mp4') || url?.startsWith('data:video');

  const displayPrice = Math.round(product.pinduoduoPrice * MARKUP_RATE * CURRENCY_RATE);
  const displayOldPrice = product.oldPrice ? Math.round(product.oldPrice * MARKUP_RATE * CURRENCY_RATE) : null;
  const discountPct =
    product.oldPrice && product.oldPrice > product.pinduoduoPrice
      ? Math.round((1 - product.pinduoduoPrice / product.oldPrice) * 100)
      : null;

  const vipInfo = getEffectiveVipStatus(currentUser);
  const hasVipPrice = Boolean(product.vipPrice && product.vipPrice > 0 && product.vipPrice < displayPrice);
  const isVipLocked = Boolean(product.isVipOnly && !vipInfo.hasVipOnlyAccess);

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
        {/* Left 7 Columns: Gallery */}
        <div className="lg:col-span-7 space-y-4">
          <div className="aspect-[4/3] w-full bg-[#F1F5F9] dark:bg-slate-800/70 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden flex items-center justify-center p-6">
            {isVideo(mediaItems[activeMedia]) ? (
              <video
                src={mediaItems[activeMedia]}
                controls
                autoPlay
                className="max-h-full max-w-full rounded-xl object-contain"
              />
            ) : (
              <SafeImage
                src={mediaItems[activeMedia]}
                alt={product.name}
                fallbackLabel={product.name}
                className="max-h-full max-w-full object-contain"
              />
            )}
          </div>

          {mediaItems.length > 1 && (
            <div className="flex gap-3 overflow-x-auto pb-1 no-scrollbar">
              {mediaItems.map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    playSound();
                    setActiveMedia(idx);
                  }}
                  className={`w-20 h-20 rounded-xl overflow-hidden border-2 shrink-0 bg-[#F1F5F9] dark:bg-slate-800 transition-all ${
                    activeMedia === idx
                      ? 'border-[#0F294A] dark:border-blue-500'
                      : 'border-transparent opacity-65 hover:opacity-100'
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
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right 5 Columns: Contiguous Sticky Purchase Module */}
        <div className="lg:col-span-5 lg:sticky lg:top-24 bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-slate-800 p-7 sm:p-8 space-y-6">
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

          {/* Variant / Size Selector */}
          <div className="space-y-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700 dark:text-slate-300">{t.size}</span>
              <span className="text-slate-500">{selectedSize}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {(product.sizes || ['Standard']).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    playSound();
                    setSelectedSize(s);
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors whitespace-nowrap ${
                    selectedSize === s
                      ? 'bg-[#0F294A] dark:bg-blue-600 text-white border-[#0F294A] dark:border-blue-600'
                      : 'bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                  }`}
                >
                  {s}
                </button>
              ))}
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
                  onClick={() => onOrder(product, selectedSize)}
                  className="w-full py-3.5 px-6 bg-[#0F294A] hover:bg-[#163A66] dark:bg-blue-600 dark:hover:bg-blue-500 text-white font-semibold rounded-xl flex items-center justify-center gap-2.5 transition-colors text-sm"
                >
                  <CreditCard size={18} />
                  <span>{t.buy}</span>
                </button>

                <div className="grid grid-cols-[1fr_auto_auto] gap-2.5">
                  <button
                    type="button"
                    onClick={() => onAddToCart(product, selectedSize)}
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
                {product.weight || 0.5} kg
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Yetkazib berish</span>
              <span className="font-medium text-slate-800 dark:text-slate-200">7–15 kun</span>
            </div>
          </div>
        </div>
      </div>

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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-[#111827] w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-800 p-7 space-y-6 shadow-2xl">
        <div className="flex justify-between items-center">
          <h3 className="font-display text-xl font-bold text-slate-900 dark:text-white">
            Sharh qoldirish
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-500">Mahsulotni baholang</p>
          <div className="flex gap-1.5">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
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
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-500">Fikringiz</label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Mahsulot sifati va yetkazib berish haqida yozing..."
            className="w-full h-32 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-4 text-sm outline-none focus:border-[#0F294A] resize-none"
          />
        </div>

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-600 dark:text-slate-300"
          >
            Bekor qilish
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-6 py-2.5 bg-[#0F294A] hover:bg-[#163A66] dark:bg-blue-600 text-white font-semibold rounded-xl flex items-center gap-2 text-sm disabled:opacity-50"
          >
            {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            <span>Yuborish</span>
          </button>
        </div>
      </div>
    </div>
  );
};

const ReviewsSection: React.FC<{
  reviews?: any[];
  onWriteReview: () => void;
  playSound: () => void;
}> = ({ reviews, onWriteReview, playSound }) => (
  <section className="pt-8 border-t border-slate-200 dark:border-slate-800 space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="space-y-1">
        <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
          Xaridorlar sharhlari ({reviews?.length || 0})
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Haqiqiy foydalanuvchilar fikr-mulohazalari
        </p>
      </div>
      <button
        type="button"
        onClick={() => {
          playSound();
          onWriteReview();
        }}
        className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#111827] hover:bg-slate-50 dark:hover:bg-slate-800 text-sm font-semibold text-slate-900 dark:text-white transition-colors"
      >
        Sharh yozish
      </button>
    </div>

    {!reviews || reviews.length === 0 ? (
      <div className="py-12 text-center bg-white dark:bg-[#111827] rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 space-y-2">
        <MessageCircle size={28} className="mx-auto text-slate-300 dark:text-slate-600" />
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Hali sharhlar qoldirilmagan. Birinchi bo'lib fikr bildiring.
        </p>
      </div>
    ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {reviews.map((r) => (
          <div
            key={r.id}
            className="bg-white dark:bg-[#111827] p-6 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[#EEF4FA] dark:bg-slate-800 text-[#0F294A] dark:text-blue-400 flex items-center justify-center font-semibold text-sm">
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
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              {r.comment}
            </p>
          </div>
        ))}
      </div>
    )}
  </section>
);
