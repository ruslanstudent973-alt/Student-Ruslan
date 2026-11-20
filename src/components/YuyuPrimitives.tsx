import React, { useState } from 'react';
import {
  Home, Grid, PlayCircle, ShoppingCart, User as UserIcon, Package, Sun, Moon, ArrowUpRight, Star, Volume2, VolumeX, Crown, Lock
} from 'lucide-react';
import { Product, View, User } from '../types';
import { MARKUP_RATE, CURRENCY_RATE } from '../constants';
import { getEffectiveVipStatus } from '../utils/vip';
import { useAdminAccess } from './AdminOnlyGuard';

export const YUYU_AUTH_IMAGE = '/src/assets/images/yuyu_auth_showcase_1795089980088.jpg';
export const YUYU_HERO_IMAGE = '/src/assets/images/yuyu_hero_storefront_1795089979705.jpg';

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
      d="M9.5 12.5L14.5 20.5V27.5H17.5V20.5L22.5 12.5H19.1L16 17.8L12.9 12.5H9.5Z"
      fill={inverted ? '#0F294A' : '#FFFFFF'}
    />
    <path
      d="M19.5 12.5L24.5 20.5V27.5H27.5V20.5L32.5 12.5H29.1L26 17.8L22.9 12.5H19.5Z"
      fill={inverted ? '#1D4ED8' : '#93C5FD'}
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
        className={`flex flex-col items-center justify-center bg-slate-100 dark:bg-slate-800/90 text-slate-400 dark:text-slate-500 p-4 text-center ${className}`}
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
    { view: 'videos', label: 'Videolar', activeViews: ['videos'] },
    { view: 'orders', label: 'Buyurtmalar', activeViews: ['orders', 'receipt'] },
    {
      view: 'profile',
      label: isAdminAuthorized ? 'Admin kabinet' : 'Kabinet',
      activeViews: [
        'profile',
        'my_requests',
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
        'admin_access'
      ]
    }
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-[#0B1120]/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
      <div className="max-w-[1360px] mx-auto px-5 sm:px-6 lg:px-10 h-[72px] flex items-center justify-between gap-8">
        {/* Zone 1: Brand Wordmark */}
        <button
          type="button"
          onClick={() => onNavigate('home')}
          className="flex items-center gap-2.5 text-left whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F294A] rounded-lg"
        >
          <YuyuMonogram size={32} />
          <span className="font-display text-lg font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap shrink-0">
            YUYU Shop
          </span>
        </button>

        {/* Zone 2: Primary Navigation Links */}
        <nav className="hidden md:flex items-center gap-7 lg:gap-8" aria-label="Asosiy navigatsiya">
          {navItems.map((item) => {
            const isActive = item.activeViews.includes(currentView);
            const isProfileItem = item.view === 'profile';
            return (
              <button
                key={item.view}
                type="button"
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
                  <span className="absolute left-0 right-0 -bottom-[19px] h-[2px] bg-[#0F294A] dark:bg-blue-400" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Single Primary Action */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={() => onNavigate('cart')}
            className="inline-flex items-center gap-2.5 px-4 py-2.5 rounded-lg bg-[#0F294A] hover:bg-[#163A66] dark:bg-blue-600 dark:hover:bg-blue-500 text-white text-sm font-semibold whitespace-nowrap shrink-0 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#0F294A]"
          >
            <ShoppingCart size={16} />
            <span>Savat</span>
            {cartCount > 0 && (
              <span className="font-mono tabular-nums text-xs px-1.5 py-0.5 rounded bg-white/15">
                {cartCount}
              </span>
            )}
          </button>
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
  <footer className="hidden md:block mt-20 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1426]">
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
        <button type="button" onClick={() => onNavigate('videos')} className="hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap">
          Videolar
        </button>
        <button type="button" onClick={() => onNavigate('search')} className="hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap">
          Qidiruv
        </button>
        <button type="button" onClick={() => onNavigate('orders')} className="hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap">
          Buyurtmalar
        </button>
        <button type="button" onClick={() => onNavigate('partnership')} className="hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap">
          Hamkorlik
        </button>
        <button type="button" onClick={() => onNavigate('support')} className="hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap">
          Yordam
        </button>
        <button
          type="button"
          onClick={onToggleSound}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap"
        >
          {soundEnabled ? <Volume2 size={14} /> : <VolumeX size={14} className="text-slate-400" />}
          <span>{soundEnabled ? 'Ovoz yoqilgan' : "Ovoz o'chirilgan"}</span>
        </button>
        <button
          type="button"
          onClick={onToggleTheme}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap"
        >
          {theme === 'light' ? <Moon size={14} /> : <Sun size={14} className="text-amber-400" />}
          <span>{theme === 'light' ? "Tungi rejim" : "Kunduzgi rejim"}</span>
        </button>
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
    { view: 'home', label: 'Asosiy', icon: <Home size={20} /> },
    { view: 'catalog', label: 'Katalog', icon: <Grid size={20} /> },
    { view: 'videos', label: 'Videolar', icon: <PlayCircle size={20} /> },
    {
      view: 'cart',
      label: 'Savat',
      icon: (
        <div className="relative">
          <ShoppingCart size={20} />
          {cartCount > 0 && (
            <span className="absolute -top-1.5 -right-2 bg-[#0F294A] dark:bg-blue-500 text-white text-[10px] font-mono font-bold px-1 rounded-full min-w-[16px] text-center">
              {cartCount}
            </span>
          )}
        </div>
      )
    },
    {
      view: 'profile',
      label: 'Kabinet',
      icon: (
        <div className={`relative ${mobileVipRing}`}>
          <UserIcon size={19} />
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
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 h-16 bg-white/95 dark:bg-[#0B1120]/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 flex items-center justify-around px-2"
      aria-label="Mobil navigatsiya"
    >
      {items.map((item) => {
        const active = currentView === item.view;
        return (
          <button
            key={item.view}
            type="button"
            onClick={() => onNavigate(item.view)}
            className={`flex flex-col items-center justify-center gap-0.5 flex-1 py-1.5 transition-colors ${
              active
                ? 'text-[#0F294A] dark:text-blue-400 font-semibold'
                : 'text-slate-400 dark:text-slate-500'
            }`}
          >
            {item.icon}
            <span className="text-[11px] leading-none">{item.label}</span>
          </button>
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
    <article
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      className={`group cursor-pointer bg-white dark:bg-[#111827] rounded-2xl border overflow-hidden flex flex-col transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-900/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F294A] ${
        product.isVipOnly
          ? 'border-amber-400/60 dark:border-amber-400/50 hover:border-amber-400'
          : 'border-slate-200/90 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
      }`}
    >
      {/* Image Stage: 65-75% visual focus on uniform neutral surface */}
      <div className="aspect-[4/3] w-full bg-[#F1F5F9] dark:bg-slate-800/70 relative overflow-hidden flex items-center justify-center p-5">
        <SafeImage
          src={product.images?.[0]}
          alt={product.name}
          fallbackLabel={product.name}
          className="w-full h-full object-contain transition-transform duration-300 ease-out group-hover:scale-105"
        />

        {product.isVipOnly && (
          <div className="absolute top-3 left-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#070B14]/90 backdrop-blur-md border border-amber-400/60 text-amber-300 text-[10px] font-mono font-bold shadow-[0_0_14px_rgba(251,191,36,0.3)]">
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

          <h4 className="font-display text-base font-semibold text-slate-900 dark:text-white leading-snug line-clamp-2 group-hover:text-[#0F294A] dark:group-hover:text-blue-400 transition-colors">
            {product.name}
          </h4>
        </div>

        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
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
              className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 group-hover:bg-[#0F294A] group-hover:border-[#0F294A] group-hover:text-white dark:group-hover:bg-blue-600 dark:group-hover:border-blue-600 flex items-center justify-center transition-colors shrink-0"
            >
              {isLockedForUser ? <Lock size={14} className="text-amber-500" /> : <ArrowUpRight size={15} />}
            </span>
          </div>

          {hasVipPrice && product.vipPrice && (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#070B14] border border-amber-400/50 text-amber-300 shadow-[0_0_12px_rgba(251,191,36,0.2)] text-[11px] font-mono tabular-nums font-bold w-full justify-between">
              <span className="inline-flex items-center gap-1">
                <Crown size={11} className="text-amber-400 shrink-0" />
                <span>VIP narx:</span>
              </span>
              <span>{product.vipPrice.toLocaleString()} so'm</span>
            </div>
          )}
        </div>
      </div>
    </article>
  );
};
