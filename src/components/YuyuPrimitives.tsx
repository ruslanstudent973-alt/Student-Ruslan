import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home, Grid, PlayCircle, ShoppingCart, User as UserIcon, Package, Sun, Moon, ArrowUpRight, Star, Volume2, VolumeX, Crown, Lock, Zap
} from 'lucide-react';
import { Product, View, User } from '../types';
import { MARKUP_RATE, CURRENCY_RATE } from '../constants';
import { getEffectiveVipStatus } from '../utils/vip';
import { useAdminAccess } from './AdminOnlyGuard';
import { Tilt3DGlassCard } from './GlassMotionPrimitives';

export const YUYU_AUTH_IMAGE = '/images/yuyu_auth_showcase_1795089980088.jpg';
export const YUYU_HERO_IMAGE = '/images/yuyu_hero_storefront_1795089979705.jpg';

export const YuyuMonogram: React.FC<{ size?: number; inverted?: boolean }> = ({
  size = 34,
  inverted = false
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 40 40"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="shrink-0"
    aria-hidden="true"
  >
    <rect
      width="40"
      height="40"
      rx="10"
      fill={inverted ? '#FFFFFF' : '#0F294A'}
    />
    <path
      d="M11 17H29L27 27H13L11 17Z"
      stroke={inverted ? '#0F294A' : '#FFFFFF'}
      strokeWidth="2"
      strokeLinejoin="round"
      fill={inverted ? '#F1F5F9' : '#1E3A8A'}
    />
    <path
      d="M15 17V13C15 11.3431 16.3431 10 18 10H22C23.5685 10 24.8973 11.1643 24.9947 12.7317L25 17"
      stroke={inverted ? '#1D4ED8' : '#93C5FD'}
      strokeWidth="2"
      strokeLinecap="round"
    />
    <path
      d="M28 10L29.2 12.8L32 14L29.2 15.2L28 18L26.8 15.2L24 14L26.8 12.8L28 10Z"
      fill="#FBBF24"
    />
  </svg>
);

export const SafeImage: React.FC<{
  src?: string;
  alt: string;
  className?: string;
  fallbackLabel?: string;
}> = ({ src, alt, className = '', fallbackLabel }) => {
  const [errored, setErrored] = useState(false);

  if (!src || errored) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-slate-100/80 dark:bg-slate-800/80 text-slate-400 dark:text-slate-500 p-4 text-center ${className}`}
        role="img"
        aria-label={alt}
      >
        <Package size={28} strokeWidth={1.5} className="mb-1.5 opacity-70" />
        <span className="text-xs font-medium line-clamp-1 max-w-[160px]">
          {fallbackLabel || alt}
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setErrored(true)}
      className={className}
    />
  );
};

interface DesktopHeaderProps {
  currentView: View;
  currentUser: User;
  cartCount: number;
  onNavigate: (view: View) => void;
}

export const DesktopHeader: React.FC<DesktopHeaderProps> = ({
  currentView,
  currentUser,
  cartCount,
  onNavigate
}) => {
  const vipInfo = getEffectiveVipStatus(currentUser);
  const { isAdminAuthorized } = useAdminAccess();
  const vipRingClass =
    vipInfo.tier === 'DIAMOND'
      ? 'ring-2 ring-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.55)]'
      : vipInfo.tier === 'GOLD'
      ? 'ring-2 ring-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.5)]'
      : vipInfo.tier === 'SILVER'
      ? 'ring-2 ring-slate-300 shadow-[0_0_10px_rgba(203,213,225,0.4)]'
      : '';

  const navItems: { view: View; label: string; activeViews: View[] }[] = [
    { view: 'home', label: 'Asosiy', activeViews: ['home'] },
    { view: 'catalog', label: 'Katalog', activeViews: ['catalog', 'detail', 'search', 'find_product'] },
    { view: 'tayyor_bozor', label: '⚡ Tayyor Bozor', activeViews: ['tayyor_bozor'] },
    { view: 'auction', label: 'Kim oshdi', activeViews: ['auction'] },
    { view: 'videos', label: 'Videolar', activeViews: ['videos'] },
    { view: 'ai_assistant', label: 'AI Maslahatchi', activeViews: ['ai_assistant'] },
    {
      view: 'profile',
      label: isAdminAuthorized ? 'Admin kabinet' : 'Kabinet',
      activeViews: [
        'profile',
        'orders',
        'receipt',
        'my_requests',
        'my_auctions',
        'affiliate_cabinet',
        'wishlist',
        'promo',
        'partnership',
        'support',
        'referral',
        'stats',
        'manage_orders',
        'manage_products',
        'manage_banners',
        'admin_add_product',
        'admin-users',
        'user_search',
        'admin-partnerships',
        'admin-support',
        'admin_vip',
        'admin_custom_requests',
        'admin_auctions',
        'admin_seller_payouts',
        'admin_tayyor_bozor',
        'admin_affiliates',
        'admin_access'
      ]
    }
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/65 dark:bg-[#0B1224]/68 backdrop-blur-2xl border-b border-white/85 dark:border-slate-700/50 shadow-[0_6px_28px_rgba(15,23,42,0.045)]">
      <div className="max-w-[1360px] mx-auto px-5 sm:px-6 lg:px-10 h-[72px] flex items-center justify-between gap-6">
        {/* Zone 1: Brand Wordmark */}
        <motion.button
          type="button"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => onNavigate('home')}
          className="flex items-center gap-2.5 text-left whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F294A] rounded-lg"
        >
          <YuyuMonogram size={32} />
          <span className="font-display text-lg font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap shrink-0">
            YUYU Shop
          </span>
        </motion.button>

        {/* Zone 2: Primary Navigation Links with sliding layoutId underline */}
        <nav className="hidden md:flex items-center gap-4 lg:gap-6" aria-label="Asosiy navigatsiya">
          {navItems.map((item) => {
            const isActive = item.activeViews.includes(currentView);
            const isProfileItem = item.view === 'profile';
            return (
              <motion.button
                key={item.view}
                type="button"
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => onNavigate(item.view)}
                className={`relative py-2 text-sm font-medium whitespace-nowrap shrink-0 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F294A] rounded inline-flex items-center gap-2 ${
                  isActive
                    ? 'text-[#0F294A] dark:text-white font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {isProfileItem && vipInfo.isVip && (
                  <span
                    className={`relative inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#090D16] text-amber-300 ${vipRingClass}`}
                    title={vipInfo.label}
                  >
                    <UserIcon size={12} className={vipInfo.tier === 'DIAMOND' ? 'text-cyan-300' : vipInfo.tier === 'SILVER' ? 'text-slate-200' : 'text-amber-300'} />
                    <Crown
                      size={10}
                      className={`absolute -top-1.5 -right-1.5 drop-shadow ${
                        vipInfo.tier === 'DIAMOND'
                          ? 'text-cyan-400 fill-cyan-400'
                          : vipInfo.tier === 'SILVER'
                          ? 'text-slate-300 fill-slate-300'
                          : 'text-amber-400 fill-amber-400'
                      }`}
                    />
                  </span>
                )}
                <span>{item.label}</span>
                {isActive && (
                  <motion.span
                    layoutId="yuyu-desktop-nav-underline"
                    transition={{ type: 'spring', stiffness: 440, damping: 32 }}
                    className="absolute left-0 right-0 -bottom-[19px] h-[2.5px] rounded-full bg-[#2563EB] dark:bg-blue-400"
                  />
                )}
              </motion.button>
            );
          })}
        </nav>

        {/* Zone 3: Single Primary Action with spring cart counter */}
        <div className="flex items-center shrink-0">
          <motion.button
            type="button"
            whileHover={{ y: -1.5, scale: 1.02 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => onNavigate('cart')}
            className="inline-flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-[#0F294A] hover:bg-[#163A66] dark:bg-blue-600 dark:hover:bg-blue-500 text-white text-sm font-semibold whitespace-nowrap shrink-0 shadow-md shadow-[#0F294A]/15 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#0F294A]"
          >
            <ShoppingCart size={16} />
            <span>Savat</span>
            <AnimatePresence mode="popLayout">
              {cartCount > 0 && (
                <motion.span
                  key={cartCount}
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.5, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 520, damping: 22 }}
                  className="font-mono tabular-nums text-xs px-1.5 py-0.5 rounded-md bg-white/20"
                >
                  {cartCount}
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        </div>
      </div>
    </header>
  );
};

interface DesktopFooterProps {
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onNavigate: (view: View) => void;
}

export const DesktopFooter: React.FC<DesktopFooterProps> = ({
  theme,
  onToggleTheme,
  soundEnabled,
  onToggleSound,
  onNavigate
}) => (
  <footer className="hidden md:block mt-20 border-t border-white/80 dark:border-slate-800/70 bg-white/55 dark:bg-[#0B1224]/60 backdrop-blur-2xl">
    <div className="max-w-[1360px] mx-auto px-6 lg:px-10 py-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
      <div className="space-y-1.5">
        <div className="flex items-center gap-2.5">
          <YuyuMonogram size={26} />
          <span className="font-display font-bold text-base text-slate-900 dark:text-white">
            YUYU Shop
          </span>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          1688, Taobao va Pinduoduo platformalaridan ishonchli logistika va zamonaviy xarid.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-6 text-sm text-slate-600 dark:text-slate-400">
        <button type="button" onClick={() => onNavigate('catalog')} className="hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap">
          Katalog
        </button>
        <button type="button" onClick={() => onNavigate('tayyor_bozor')} className="hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap">
          ⚡ Tayyor Bozor
        </button>
        <button type="button" onClick={() => onNavigate('auction')} className="hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap">
          Kim oshdi
        </button>
        <button type="button" onClick={() => onNavigate('videos')} className="hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap">
          Videolar
        </button>
        <button type="button" onClick={() => onNavigate('ai_assistant')} className="hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap">
          AI Maslahatchi
        </button>
        <button type="button" onClick={() => onNavigate('orders')} className="hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap">
          Buyurtmalar
        </button>
        <button type="button" onClick={() => onNavigate('affiliate_cabinet')} className="hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap">
          Hamkorlik (Pul ishlash)
        </button>
        <button type="button" onClick={() => onNavigate('support')} className="hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap">
          Yordam
        </button>
        <motion.button
          type="button"
          whileTap={{ scale: 0.95 }}
          onClick={onToggleSound}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/70 dark:bg-slate-800/70 backdrop-blur-lg border border-white/90 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 transition-colors whitespace-nowrap shadow-sm"
        >
          {soundEnabled ? <Volume2 size={14} /> : <VolumeX size={14} className="text-slate-400" />}
          <span>{soundEnabled ? 'Ovoz yoqilgan' : "Ovoz o'chirilgan"}</span>
        </motion.button>
        <motion.button
          type="button"
          whileTap={{ scale: 0.95 }}
          onClick={onToggleTheme}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/70 dark:bg-slate-800/70 backdrop-blur-lg border border-white/90 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 transition-colors whitespace-nowrap shadow-sm"
        >
          {theme === 'light' ? <Moon size={14} /> : <Sun size={14} className="text-amber-400" />}
          <span>{theme === 'light' ? "Tungi rejim" : "Kunduzgi rejim"}</span>
        </motion.button>
      </div>
    </div>
  </footer>
);

interface MobileBottomNavProps {
  currentView: View;
  cartCount: number;
  onNavigate: (view: View) => void;
  currentUser?: User | null;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  currentView,
  cartCount,
  onNavigate,
  currentUser
}) => {
  const vipInfo = getEffectiveVipStatus(currentUser);
  const mobileVipRing =
    vipInfo.tier === 'DIAMOND'
      ? 'ring-2 ring-cyan-400 rounded-full p-0.5 shadow-[0_0_10px_rgba(34,211,238,0.5)]'
      : vipInfo.tier === 'GOLD'
      ? 'ring-2 ring-amber-400 rounded-full p-0.5 shadow-[0_0_10px_rgba(251,191,36,0.5)]'
      : vipInfo.tier === 'SILVER'
      ? 'ring-2 ring-slate-300 rounded-full p-0.5'
      : '';

  const items: { view: View; label: string; icon: React.ReactNode }[] = [
    { view: 'home', label: 'Asosiy', icon: <Home size={19} /> },
    { view: 'catalog', label: 'Katalog', icon: <Grid size={19} /> },
    { view: 'tayyor_bozor', label: 'Tayyor', icon: <Zap size={19} /> },
    { view: 'videos', label: 'Videolar', icon: <PlayCircle size={19} /> },
    {
      view: 'cart',
      label: 'Savat',
      icon: (
        <div className="relative">
          <ShoppingCart size={19} />
          {cartCount > 0 && (
            <motion.span
              key={cartCount}
              initial={{ scale: 0.5 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 500, damping: 20 }}
              className="absolute -top-1.5 -right-2 bg-[#2563EB] text-white text-[10px] font-mono font-bold px-1 rounded-full min-w-[16px] text-center"
            >
              {cartCount}
            </motion.span>
          )}
        </div>
      )
    },
    {
      view: 'profile',
      label: 'Kabinet',
      icon: (
        <div className={`relative ${mobileVipRing}`}>
          <UserIcon size={18} />
          {vipInfo.isVip && (
            <Crown
              size={11}
              className={`absolute -top-1.5 -right-1.5 ${
                vipInfo.tier === 'DIAMOND'
                  ? 'text-cyan-400 fill-cyan-400'
                  : vipInfo.tier === 'SILVER'
                  ? 'text-slate-300 fill-slate-300'
                  : 'text-amber-400 fill-amber-400'
              }`}
            />
          )}
        </div>
      )
    }
  ];

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 h-16 bg-white/75 dark:bg-[#0B1224]/80 backdrop-blur-2xl border-t border-white/90 dark:border-slate-700/60 shadow-[0_-8px_30px_rgba(15,23,42,0.06)] flex items-center justify-around px-1"
      aria-label="Mobil navigatsiya"
    >
      {items.map((item) => {
        const active = currentView === item.view;
        return (
          <motion.button
            key={item.view}
            type="button"
            whileTap={{ scale: 0.9 }}
            onClick={() => onNavigate(item.view)}
            className={`relative flex flex-col items-center justify-center gap-0.5 flex-1 py-1.5 rounded-xl transition-colors ${
              active
                ? 'text-[#2563EB] dark:text-blue-400 font-semibold'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            {active && (
              <motion.span
                layoutId="yuyu-mobile-nav-bg"
                transition={{ type: 'spring', stiffness: 420, damping: 30 }}
                className="absolute inset-x-1 inset-y-1 rounded-xl bg-blue-500/10 dark:bg-blue-400/15 -z-10"
              />
            )}
            {item.icon}
            <span className="text-[10px] leading-none">{item.label}</span>
          </motion.button>
        );
      })}
    </nav>
  );
};

export const ProductCard: React.FC<{
  product: Product;
  onClick: () => void;
  currentUser?: User | null;
}> = ({ product, onClick, currentUser }) => {
  const displayPrice = Math.round(product.pinduoduoPrice * MARKUP_RATE * CURRENCY_RATE);
  const displayOldPrice = product.oldPrice
    ? Math.round(product.oldPrice * MARKUP_RATE * CURRENCY_RATE)
    : null;
  const discountPct =
    product.oldPrice && product.oldPrice > product.pinduoduoPrice
      ? Math.round((1 - product.pinduoduoPrice / product.oldPrice) * 100)
      : null;

  const vipInfo = getEffectiveVipStatus(currentUser);
  const hasVipPrice = Boolean(product.vipPrice && product.vipPrice > 0 && product.vipPrice < displayPrice);
  const isLockedForUser = Boolean(product.isVipOnly && !vipInfo.hasVipOnlyAccess);

  return (
    <Tilt3DGlassCard
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      maxTilt={6}
      className={`group cursor-pointer yuyu-glass rounded-3xl border overflow-hidden flex flex-col transition-shadow duration-300 hover:shadow-[0_22px_50px_rgba(37,99,235,0.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] ${
        product.isVipOnly
          ? 'border-amber-400/70 dark:border-amber-400/50 hover:border-amber-400'
          : 'border-white/90 dark:border-slate-700/60 hover:border-blue-200/90 dark:hover:border-blue-500/40'
      }`}
    >
      {/* Image Stage: Frosted translucent showcase */}
      <div className="aspect-[4/3] w-full bg-white/45 dark:bg-slate-800/50 relative overflow-hidden flex items-center justify-center p-5 border-b border-white/70 dark:border-slate-700/40">
        <SafeImage
          src={product.images?.[0]}
          alt={product.name}
          fallbackLabel={product.name}
          className="w-full h-full object-contain transition-transform duration-500 ease-out group-hover:scale-110"
        />

        {product.isVipOnly && (
          <div className="absolute top-3 left-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#070B14]/85 backdrop-blur-md border border-amber-400/60 text-amber-300 text-[10px] font-mono font-bold shadow-[0_0_14px_rgba(251,191,36,0.3)]">
            {isLockedForUser ? <Lock size={11} /> : <Crown size={11} />}
            <span>Faqat VIP mijozlar uchun</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-5 flex-1 flex flex-col justify-between gap-4">
        <div className="space-y-1.5">
          {/* Unboxed quiet metadata row */}
          <div className="flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span className="truncate">
              {product.category}
              {product.isOriginal ? ' · Original' : ''}
            </span>
            <span className="inline-flex items-center gap-1 shrink-0 font-mono tabular-nums text-slate-600 dark:text-slate-300">
              <Star size={12} className="text-amber-500 fill-amber-500" />
              {product.rating}
            </span>
          </div>

          <h4 className="font-display text-base font-semibold text-slate-900 dark:text-white leading-snug line-clamp-2 group-hover:text-[#2563EB] dark:group-hover:text-blue-400 transition-colors">
            {product.name}
          </h4>
        </div>

        <div className="pt-3 border-t border-white/70 dark:border-slate-700/50 space-y-2">
          <div className="flex items-end justify-between gap-2">
            <div className="space-y-0.5 min-w-0">
              {displayOldPrice && (
                <div className="flex items-center gap-1.5 text-xs font-mono tabular-nums">
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
              <p className="font-mono tabular-nums text-base font-bold text-[#0F294A] dark:text-blue-400">
                {displayPrice.toLocaleString()} so'm
              </p>
            </div>

            <span
              aria-hidden="true"
              className="w-9 h-9 rounded-xl bg-white/75 dark:bg-slate-800/80 border border-white/95 dark:border-slate-700 text-slate-600 dark:text-slate-300 group-hover:bg-[#2563EB] group-hover:border-[#2563EB] group-hover:text-white group-hover:rotate-12 flex items-center justify-center transition-all duration-300 shrink-0 shadow-sm"
            >
              {isLockedForUser ? <Lock size={14} className="text-amber-500" /> : <ArrowUpRight size={15} />}
            </span>
          </div>

          {hasVipPrice && product.vipPrice && (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#070B14]/90 backdrop-blur-md border border-amber-400/50 text-amber-300 shadow-[0_0_12px_rgba(251,191,36,0.2)] text-[11px] font-mono tabular-nums font-bold w-full justify-between">
              <span className="inline-flex items-center gap-1">
                <Crown size={11} className="text-amber-400 shrink-0" />
                <span>VIP narx:</span>
              </span>
              <span>{product.vipPrice.toLocaleString()} so'm</span>
            </div>
          )}
        </div>
      </div>
    </Tilt3DGlassCard>
  );
};
