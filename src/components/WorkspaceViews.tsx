import React, { useState, useMemo, useEffect } from 'react';
import {
  ChevronLeft, LogOut, Camera, Edit3, Save, Heart, Ticket, Package, Users,
  MessageCircle, PlusCircle, Grid, ClipboardList, Image as ImageIcon, Handshake,
  BarChart3, Copy, Check, Search, Trash2, Plus, UploadCloud, X, Send, Loader2,
  MapPin, Video, Play, Zap, Lock, UserPlus, Calendar, Sun, Moon, Star, ShieldCheck, ShieldAlert,
  Clock, CheckCircle2, Volume2, VolumeX, Crown, Gavel, Wallet, TrendingUp, XCircle, Truck, Scale, AlertCircle
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell
} from 'recharts';
import { Product, User, Order, Banner, View, CargoStage } from '../types';
import {
  CARGO_STAGES,
  normalizeCargoStage,
  formatCargoTimestamp
} from '../lib/cargoStages';
import { MARKUP_RATE, CURRENCY_RATE, CARD_NUMBER, CARD_OWNER } from '../constants';
import { SafeImage, ProductCard } from './YuyuPrimitives';
import { MAIN_REF_LINK } from './StorefrontViews';
import { VipStatusCard, VipTierBadge } from './VipComponents';
import { getEffectiveVipStatus } from '../utils/vip';
import { AdminOnlyGate, useAdminAccess } from './AdminOnlyGuard';
import { motion, AnimatePresence } from 'framer-motion';
import {
  extractLocalUzDigits,
  formatLocalUzDigits,
  formatFullUzPhone,
  toNormalizedUzPhone,
  getUzOperatorName,
  writeRecentClient,
  readStoredAdminDeviceToken
} from '../utils/authHelpers';
import { StaggerGrid, StaggerItem, GlassReveal } from './GlassMotionPrimitives';
import { uploadMediaSmart, readFileAsDataUrl } from '../utils/r2MediaUpload';

const PageHeader: React.FC<{
  title: string;
  subtitle?: string;
  onBack?: () => void;
  action?: React.ReactNode;
}> = ({ title, subtitle, onBack, action }) => (
  <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-slate-200/70 dark:border-slate-800/70">
    <div className="flex items-center gap-3.5">
      {onBack && (
        <motion.button
          type="button"
          whileHover={{ x: -2 }}
          whileTap={{ scale: 0.94 }}
          onClick={onBack}
          className="p-2.5 yuyu-glass-subtle rounded-xl hover:bg-white/85 dark:hover:bg-slate-800/80 transition-colors"
        >
          <ChevronLeft size={18} />
        </motion.button>
      )}
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
          {title}
        </h1>
        {subtitle && <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>}
      </div>
    </div>
    {action && <div>{action}</div>}
  </div>
);

export const ProfileView: React.FC<{
  t: any;
  user: User;
  setUser: (u: User) => void;
  onLogout: () => void;
  onNavigate: (view: View) => void;
  playSound: () => void;
  vipStatus: any;
  notify: (msg: string, type?: 'success' | 'error' | 'info') => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  safeFetchJSON: (url: string, options?: RequestInit) => Promise<any>;
  onOpenVipModal: () => void;
  pendingCustomRequestsCount?: number;
  pricedCustomRequestsCount?: number;
  pendingSellerPayoutActionsCount?: number;
  pendingResaleCount?: number;
  pendingAffiliatePayoutsCount?: number;
  securityAttacks24h?: number;
}> = ({
  t,
  user,
  setUser,
  onLogout,
  onNavigate,
  playSound,
  vipStatus,
  notify,
  theme,
  onToggleTheme,
  soundEnabled,
  onToggleSound,
  safeFetchJSON,
  onOpenVipModal,
  pendingCustomRequestsCount = 0,
  pricedCustomRequestsCount = 0,
  pendingSellerPayoutActionsCount = 0,
  pendingResaleCount = 0,
  pendingAffiliatePayoutsCount = 0,
  securityAttacks24h = 0
}) => {
  const [editing, setEditing] = useState(false);
  const [tempBio, setTempBio] = useState(user.bio || '');
  const [tempName, setTempName] = useState(user.username);
  const [tempPhoneDigits, setTempPhoneDigits] = useState(() =>
    extractLocalUzDigits(user.phoneNumber || '')
  );
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [copiedRef, setCopiedRef] = useState(false);
  const effectiveVip = getEffectiveVipStatus(user);
  const { isAdminAuthorized } = useAdminAccess();

  const referralLink = `${MAIN_REF_LINK}?start=${user.telegramId || 'user'}`;

  const isStandardUzPhone = (val?: string) => {
    const digits = (val || '').replace(/\D/g, '');
    return digits.length === 9 || (digits.length === 12 && digits.startsWith('998'));
  };

  const displayPhone = user.phoneNumber
    ? isStandardUzPhone(user.phoneNumber)
      ? formatFullUzPhone(user.phoneNumber)
      : user.phoneNumber
    : "Raqam kiritilmagan";

  const openEditMode = () => {
    playSound();
    setTempName(user.username || '');
    setTempBio(user.bio || '');
    setTempPhoneDigits(
      isStandardUzPhone(user.phoneNumber) ? extractLocalUzDigits(user.phoneNumber || '') : ''
    );
    setPhoneTouched(false);
    setProfileError('');
    setEditing(true);
  };

  const persistUserToDb = async (
    updatedUser: User,
    previousPhoneNumber?: string
  ): Promise<boolean> => {
    const prevUser = user;
    setSavingProfile(true);
    setProfileError('');
    try {
      const res = await safeFetchJSON('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...updatedUser,
          previousPhoneNumber: previousPhoneNumber || prevUser.phoneNumber
        })
      });
      const savedUser: User = res?.user || updatedUser;
      setUser(savedUser);
      if (!savedUser.isAdmin && savedUser.phoneNumber) {
        writeRecentClient({
          username: savedUser.username,
          phoneNumber: savedUser.phoneNumber
        });
      }
      notify("Profil saqlandi", 'success');
      return true;
    } catch (err: any) {
      const msg = err?.message || "Profilni saqlashda xatolik";
      setProfileError(msg);
      notify(msg, 'error');
      return false;
    } finally {
      setSavingProfile(false);
    }
  };

  const handleAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    playSound();
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      notify("Iltimos, faqat rasm faylini tanlang", 'error');
      return;
    }
    notify("Avatar yuklanmoqda...", 'info');
    try {
      const uploadedUrl = await uploadMediaSmart(file, {
        folder: 'avatars',
        maxDim: 512,
        quality: 0.84
      });
      await persistUserToDb({ ...user, avatar: uploadedUrl });
    } catch (err: any) {
      notify(err?.message || "Avatarni yuklashda xatolik", 'error');
    }
  };

  const saveProfile = async () => {
    playSound();
    const cleanName = tempName.trim();
    if (cleanName.length < 2) {
      setProfileError("Iltimos, ismingizni kiriting (kamida 2 ta harf).");
      return;
    }

    let nextPhone = user.phoneNumber || '';
    if (phoneTouched || tempPhoneDigits.length > 0) {
      if (tempPhoneDigits.length < 9) {
        setProfileError("Iltimos, 9 xonali telefon raqamingizni to'liq kiriting.");
        return;
      }
      nextPhone = toNormalizedUzPhone(tempPhoneDigits);
    }

    const ok = await persistUserToDb(
      {
        ...user,
        username: cleanName,
        bio: tempBio.trim(),
        phoneNumber: nextPhone
      },
      user.phoneNumber
    );
    if (ok) {
      setEditing(false);
    }
  };

  const copyReferral = () => {
    playSound();
    navigator.clipboard.writeText(referralLink);
    setCopiedRef(true);
    notify("Referal havola nusxalandi", 'success');
    setTimeout(() => setCopiedRef(false), 2000);
  };

  const customerLinks: {
    view: View;
    label: string;
    desc: string;
    icon: React.ReactNode;
    badge?: number;
  }[] = [
    { view: 'orders', label: t.orders, desc: 'Buyurtmalar va trek raqamlar', icon: <Package size={18} /> },
    {
      view: 'affiliate_cabinet',
      label: 'Hamkorlik (Pul ishlash)',
      desc: '5%–10% real daromad va havolalar',
      icon: <TrendingUp size={18} />
    },
    {
      view: 'tayyor_bozor',
      label: '⚡ Tayyor Bozor',
      desc: "O'zbekistonda tayyor • 1 kunda yetkazish",
      icon: <Zap size={18} />
    },
    {
      view: 'my_auctions',
      label: 'Auksionlarim',
      desc: 'Faol stavkalar va yutuqlar',
      icon: <Gavel size={18} />
    },
    {
      view: 'my_requests',
      label: "Mening so'rovlarim",
      desc: "Rasm bo'yicha topilgan narxlar",
      icon: <Camera size={18} />,
      badge: pricedCustomRequestsCount
    },
    { view: 'wishlist', label: t.wishlist, desc: 'Saqlangan mahsulotlar', icon: <Heart size={18} /> },
    { view: 'promo', label: t.promo, desc: 'Faol chegirma kodlari', icon: <Ticket size={18} /> },
    { view: 'partnership', label: t.partnership, desc: 'Hamkorlik va chegirmalar', icon: <Handshake size={18} /> },
    { view: 'support', label: t.support, desc: "Admin bilan bog'lanish", icon: <MessageCircle size={18} /> },
    { view: 'referral', label: t.referral, desc: "Do'stlarni taklif qilish", icon: <UserPlus size={18} /> }
  ];

  const adminLinks: {
    view: View;
    label: string;
    icon: React.ReactNode;
    highlight?: boolean;
    badge?: number;
  }[] = [
    {
      view: 'admin_tayyor_bozor',
      label: 'Tayyor Bozor',
      icon: <Zap size={18} />,
      highlight: true,
      badge: pendingResaleCount
    },
    {
      view: 'admin_affiliates',
      label: 'Hamkorlar (Affiliate)',
      icon: <TrendingUp size={18} />,
      highlight: true,
      badge: pendingAffiliatePayoutsCount
    },
    { view: 'admin_auctions', label: 'Auksion boshqaruvi', icon: <Gavel size={18} />, highlight: true },
    {
      view: 'admin_seller_payouts',
      label: "Sotuvchi to'lovlari",
      icon: <Wallet size={18} />,
      highlight: true,
      badge: pendingSellerPayoutActionsCount
    },
    { view: 'admin_vip', label: 'VIP Boshqaruv', icon: <Crown size={18} />, highlight: true },
    {
      view: 'admin_custom_requests',
      label: "Rasm so'rovlari",
      icon: <Camera size={18} />,
      highlight: true,
      badge: pendingCustomRequestsCount
    },
    { view: 'admin_access', label: 'Admin ruxsatlari', icon: <ShieldCheck size={18} />, highlight: true },
    {
      view: 'admin_security',
      label: 'Xavfsizlik markazi',
      icon: <ShieldAlert size={18} />,
      highlight: true,
      badge: securityAttacks24h
    },
    { view: 'stats', label: 'Statistika', icon: <BarChart3 size={18} /> },
    { view: 'manage_orders', label: 'Buyurtmalar', icon: <ClipboardList size={18} /> },
    { view: 'admin_add_product', label: "Mahsulot qo'shish", icon: <PlusCircle size={18} /> },
    { view: 'manage_products', label: 'Mahsulotlar', icon: <Grid size={18} /> },
    { view: 'manage_banners', label: 'Bannerlar', icon: <ImageIcon size={18} /> },
    { view: 'admin-users', label: 'Mijozlar', icon: <Users size={18} /> },
    { view: 'admin-partnerships', label: 'Hamkorlik', icon: <Handshake size={18} /> },
    { view: 'admin-support', label: 'Yordam xabarlari', icon: <MessageCircle size={18} /> }
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        title={isAdminAuthorized ? 'Admin va shaxsiy kabinet' : 'Shaxsiy kabinet'}
        subtitle="Hisob sozlamalari, buyurtmalar va boshqaruv bo'limlari"
        action={
          <div className="flex flex-wrap items-center gap-2.5">
            <motion.button
              type="button"
              whileHover={{ y: -1, scale: 1.02 }}
              whileTap={{ scale: 0.96 }}
              onClick={onToggleSound}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl yuyu-glass-subtle text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-white/90 dark:hover:bg-slate-800/80 transition-colors"
            >
              {soundEnabled ? <Volume2 size={15} /> : <VolumeX size={15} className="text-slate-400" />}
              <span>{soundEnabled ? 'Ovoz yoqilgan' : "Ovoz o'chirilgan"}</span>
            </motion.button>
            <motion.button
              type="button"
              whileHover={{ y: -1, scale: 1.02 }}
              whileTap={{ scale: 0.96 }}
              onClick={onToggleTheme}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl yuyu-glass-subtle text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-white/90 dark:hover:bg-slate-800/80 transition-colors"
            >
              {theme === 'light' ? <Moon size={15} /> : <Sun size={15} className="text-amber-400" />}
              <span>{theme === 'light' ? 'Tungi rejim' : 'Kunduzgi rejim'}</span>
            </motion.button>
            <motion.button
              type="button"
              whileHover={{ y: -1, scale: 1.02 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => {
                playSound();
                onLogout();
              }}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-red-200/80 dark:border-red-900/50 bg-red-50/75 dark:bg-red-950/35 backdrop-blur-md text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-100/85 dark:hover:bg-red-950/55 transition-colors"
            >
              <LogOut size={15} />
              <span>Chiqish</span>
            </motion.button>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left 4 Columns: User Identity Card */}
        <aside className="lg:col-span-4 yuyu-glass p-7 rounded-3xl space-y-6">
          <div className="flex flex-col items-center text-center space-y-4">
            <div
              className={`relative w-28 h-28 rounded-full border-2 p-1 bg-slate-50 dark:bg-slate-900 ${
                effectiveVip.tier === 'DIAMOND'
                  ? 'border-cyan-400 shadow-[0_0_24px_rgba(34,211,238,0.45)]'
                  : effectiveVip.tier === 'GOLD'
                  ? 'border-amber-400 shadow-[0_0_24px_rgba(251,191,36,0.45)]'
                  : effectiveVip.tier === 'SILVER'
                  ? 'border-slate-300 shadow-[0_0_18px_rgba(203,213,225,0.35)]'
                  : 'border-slate-200 dark:border-slate-700'
              }`}
            >
              <SafeImage
                src={user.avatar}
                alt={user.username}
                fallbackLabel={user.username}
                className="w-full h-full rounded-full object-cover"
              />
              {effectiveVip.isVip && (
                <span className="absolute -top-2 -right-1 w-8 h-8 rounded-full bg-[#070B14] border border-amber-400/70 flex items-center justify-center shadow-lg">
                  <Crown
                    size={16}
                    className={
                      effectiveVip.tier === 'DIAMOND'
                        ? 'text-cyan-400 fill-cyan-400'
                        : effectiveVip.tier === 'SILVER'
                        ? 'text-slate-200 fill-slate-200'
                        : 'text-amber-400 fill-amber-400'
                    }
                  />
                </span>
              )}
              <label className="absolute bottom-0 right-0 p-2 bg-[#0F294A] dark:bg-blue-600 text-white rounded-full cursor-pointer border-2 border-white dark:border-[#111827] hover:bg-[#163A66] transition-colors">
                <Camera size={14} />
                <input type="file" className="hidden" onChange={handleAvatar} accept="image/*" />
              </label>
            </div>

            {editing ? (
              <div className="w-full space-y-3 text-left">
                <div className="space-y-1">
                  <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                    Ismingiz
                  </label>
                  <input
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-900 dark:text-white outline-none focus:border-[#0F294A] dark:focus:border-blue-500"
                    placeholder="Ismingiz"
                    value={tempName}
                    onChange={(e) => {
                      setTempName(e.target.value);
                      if (profileError) setProfileError('');
                    }}
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                      {t.phoneNumber}
                    </label>
                    <span className="text-[11px] font-mono tabular-nums text-slate-400">
                      {getUzOperatorName(tempPhoneDigits)
                        ? `${getUzOperatorName(tempPhoneDigits)} · `
                        : ''}
                      {tempPhoneDigits.length}/9
                    </span>
                  </div>
                  <div
                    className={`flex items-center rounded-xl border bg-slate-50 dark:bg-slate-900 overflow-hidden transition-all ${
                      tempPhoneDigits.length === 9
                        ? 'border-emerald-500/70 focus-within:ring-2 focus-within:ring-emerald-500/20'
                        : 'border-slate-200 dark:border-slate-700 focus-within:border-[#0F294A] dark:focus-within:border-blue-500'
                    }`}
                  >
                    <span className="pl-3 pr-2.5 py-2.5 text-xs font-mono font-semibold text-slate-600 dark:text-slate-300 bg-slate-100/80 dark:bg-slate-800/80 border-r border-slate-200 dark:border-slate-700 select-none">
                      +998
                    </span>
                    <input
                      type="tel"
                      inputMode="numeric"
                      autoComplete="tel"
                      className="flex-1 bg-transparent px-3 py-2.5 text-sm font-mono tabular-nums text-slate-900 dark:text-white outline-none placeholder:text-slate-400"
                      placeholder="90 123 45 67"
                      value={formatLocalUzDigits(tempPhoneDigits)}
                      onChange={(e) => {
                        setPhoneTouched(true);
                        setTempPhoneDigits(extractLocalUzDigits(e.target.value));
                        if (profileError) setProfileError('');
                      }}
                    />
                    {tempPhoneDigits.length === 9 && (
                      <span className="pr-2.5 text-emerald-500">
                        <CheckCircle2 size={15} />
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                    {t.bio}
                  </label>
                  <textarea
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs text-slate-900 dark:text-white outline-none resize-none focus:border-[#0F294A] dark:focus:border-blue-500"
                    rows={3}
                    placeholder="O'zingiz haqingizda qisqacha..."
                    value={tempBio}
                    onChange={(e) => setTempBio(e.target.value)}
                  />
                </div>

                {profileError && (
                  <p className="text-xs font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-xl px-3 py-2">
                    {profileError}
                  </p>
                )}

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    disabled={savingProfile}
                    onClick={() => {
                      setProfileError('');
                      setEditing(false);
                    }}
                    className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    Bekor
                  </button>
                  <button
                    type="button"
                    disabled={savingProfile}
                    onClick={saveProfile}
                    className="flex-1 py-2.5 bg-[#0F294A] hover:bg-[#163A66] dark:bg-blue-600 dark:hover:bg-blue-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-60 cursor-pointer"
                  >
                    {savingProfile ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                    <span>Saqlash</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-1.5">
                <div className="flex flex-col items-center gap-1.5">
                  <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white">
                    {user.username}
                  </h2>
                  <VipTierBadge tier={effectiveVip.tier} size="sm" />
                </div>
                <p className="text-xs font-mono tabular-nums text-slate-600 dark:text-slate-300">
                  {displayPhone}
                  {vipStatus ? ` · ${vipStatus.label}` : ''}
                </p>
                {user.telegramId && user.telegramId !== user.phoneNumber && (
                  <p className="text-[11px] font-mono text-slate-400 dark:text-slate-500">
                    ID: {user.telegramId}
                  </p>
                )}
                <p className="text-sm text-slate-600 dark:text-slate-400 pt-1">
                  {user.bio || "Bio qo'shilmagan"}
                </p>
                <button
                  type="button"
                  onClick={openEditMode}
                  className="mt-2 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <Edit3 size={13} />
                  <span>{t.editProfile}</span>
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 pt-5 border-t border-slate-200/60 dark:border-slate-800/70">
            <div className="yuyu-glass-subtle p-4 rounded-2xl text-center space-y-1">
              <p className="text-xs text-slate-500">Bonuslar</p>
              <p className="font-mono tabular-nums text-base font-bold text-[#0F294A] dark:text-blue-400">
                {(user.referralBalance || 0).toLocaleString()} UZS
              </p>
            </div>
            <div className="yuyu-glass-subtle p-4 rounded-2xl text-center space-y-1">
              <p className="text-xs text-slate-500">Do'stlar</p>
              <p className="font-mono tabular-nums text-base font-bold text-slate-900 dark:text-white">
                {user.invitedCount || 0}
              </p>
            </div>
          </div>
        </aside>

        {/* Right 8 Columns: VIP Status Card, Admin Panel & Customer Workspace */}
        <div className="lg:col-span-8 space-y-8">
          {/* Sleek Dark Glassmorphic VIP Status Card */}
          <VipStatusCard user={user} onOpenSubscribeModal={onOpenVipModal} />

          {/* Admin Control Grid — Strictly hidden on devices without verified admin token */}
          <AdminOnlyGate permission="admin_only">
            <section className="yuyu-glass p-6 sm:p-7 rounded-3xl space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                    YUYU Shop boshqaruv paneli
                  </h2>
                  <p className="text-xs text-slate-500">
                    Do'kon statistikasi, VIP tizimi, buyurtmalar va mahsulotlarni boshqarish
                  </p>
                </div>
                <span className="text-xs font-semibold text-[#0F294A] dark:text-blue-400">
                  Administrator
                </span>
              </div>

              <StaggerGrid className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {adminLinks.map((item) => (
                  <StaggerItem key={item.view}>
                    <motion.button
                      type="button"
                      whileHover={{ y: -3, scale: 1.02 }}
                      whileTap={{ scale: 0.96 }}
                      transition={{ type: 'spring', stiffness: 360, damping: 24 }}
                      onClick={() => {
                        playSound();
                        onNavigate(item.view);
                      }}
                      className={`relative w-full h-full p-4 rounded-2xl flex flex-col items-start gap-3 text-left transition-colors ${
                        item.highlight
                          ? 'bg-[#070B14]/92 backdrop-blur-xl border border-amber-400/60 hover:border-amber-300 text-amber-200 shadow-[0_10px_28px_rgba(251,191,36,0.18)]'
                          : 'bg-[#0F294A]/92 hover:bg-[#163A66] dark:bg-slate-800/85 dark:hover:bg-slate-700/90 backdrop-blur-md border border-white/15 text-white shadow-md shadow-blue-950/10'
                      }`}
                    >
                      {item.badge !== undefined && item.badge > 0 && (
                        <span className="absolute top-3 right-3 px-2 py-0.5 rounded-lg bg-cyan-400 text-slate-950 font-mono tabular-nums text-[10px] font-extrabold shadow-[0_0_12px_rgba(34,211,238,0.55)]">
                          {item.badge}
                        </span>
                      )}
                      <span className={item.highlight ? 'text-amber-400' : 'text-blue-200'}>{item.icon}</span>
                      <span className="text-xs font-semibold leading-snug">{item.label}</span>
                    </motion.button>
                  </StaggerItem>
                ))}
              </StaggerGrid>
            </section>
          </AdminOnlyGate>

          {/* Customer Shortcuts Grid */}
          <section className="yuyu-glass p-6 sm:p-7 rounded-3xl space-y-5">
            <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
              Xaridor bo'limlari
            </h2>
            <StaggerGrid className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {customerLinks.map((item) => (
                <StaggerItem key={item.view}>
                  <motion.button
                    type="button"
                    whileHover={{ y: -3, scale: 1.018 }}
                    whileTap={{ scale: 0.97 }}
                    transition={{ type: 'spring', stiffness: 360, damping: 24 }}
                    onClick={() => {
                      playSound();
                      onNavigate(item.view);
                    }}
                    className="relative w-full h-full p-4 rounded-2xl yuyu-glass-subtle hover:border-blue-400/60 dark:hover:border-blue-500/60 hover:bg-white/85 dark:hover:bg-slate-800/80 text-left space-y-2 transition-colors"
                  >
                    {item.badge !== undefined && item.badge > 0 && (
                      <span className="absolute top-3.5 right-3.5 px-2 py-0.5 rounded-lg bg-emerald-500 text-white font-mono tabular-nums text-[10px] font-bold">
                        {item.badge} narx
                      </span>
                    )}
                    <div className="w-9 h-9 rounded-xl bg-blue-50/90 dark:bg-blue-950/60 border border-blue-200/60 dark:border-blue-800/60 text-[#0F294A] dark:text-blue-400 flex items-center justify-center">
                      {item.icon}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">
                        {item.label}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{item.desc}</p>
                    </div>
                  </motion.button>
                </StaggerItem>
              ))}
            </StaggerGrid>
          </section>

          {/* Compact Referral Banner */}
          <section className="bg-gradient-to-br from-[#0F294A] via-[#133560] to-[#0B1F3B] border border-white/15 shadow-[0_18px_40px_rgba(15,41,74,0.2)] text-white p-6 sm:p-7 rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div className="space-y-1">
              <h3 className="font-display text-lg font-bold">Do'stlaringizni taklif qiling</h3>
              <p className="text-xs text-slate-300">
                Har bir taklif qilingan do'st uchun bonus to'plang va xaridlaringizda ishlating.
              </p>
            </div>
            <div className="flex items-center gap-2 min-w-0 md:max-w-sm w-full">
              <input
                readOnly
                value={referralLink}
                className="flex-1 bg-white/10 border border-white/15 rounded-xl px-3.5 py-2.5 text-xs font-mono text-white truncate outline-none"
              />
              <motion.button
                type="button"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.96 }}
                onClick={copyReferral}
                className="px-4 py-2.5 bg-white text-[#0F294A] rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 shrink-0 hover:bg-slate-100 transition-colors"
              >
                {copiedRef ? <Check size={14} /> : <Copy size={14} />}
                <span>{copiedRef ? 'Nusxalandi' : 'Nusxalash'}</span>
              </motion.button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export const StatsView: React.FC<{
  t: any;
  orders: Order[];
  products: Product[];
  users: User[];
  onBack: () => void;
  playSound: () => void;
}> = ({ t, orders, products, users, onBack, playSound }) => {
  const [chartMode, setChartMode] = useState<'products' | 'categories'>('products');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [activePreset, setActivePreset] = useState<'all' | 'today' | '7d' | '30d' | 'custom'>('all');

  const toDateInputValue = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const applyPreset = (preset: 'all' | 'today' | '7d' | '30d') => {
    playSound();
    setActivePreset(preset);
    if (preset === 'all') {
      setStartDate('');
      setEndDate('');
      return;
    }
    const now = new Date();
    const endStr = toDateInputValue(now);
    const start = new Date(now);
    if (preset === '7d') start.setDate(now.getDate() - 6);
    if (preset === '30d') start.setDate(now.getDate() - 29);
    setStartDate(toDateInputValue(start));
    setEndDate(endStr);
  };

  const handleStartDateChange = (val: string) => {
    setStartDate(val);
    setActivePreset(val || endDate ? 'custom' : 'all');
  };

  const handleEndDateChange = (val: string) => {
    setEndDate(val);
    setActivePreset(startDate || val ? 'custom' : 'all');
  };

  const isDateFiltered = Boolean(startDate || endDate);

  const dateBounds = useMemo(() => {
    const startMs = startDate ? new Date(`${startDate}T00:00:00`).getTime() : null;
    const endMs = endDate ? new Date(`${endDate}T23:59:59.999`).getTime() : null;
    return { startMs, endMs };
  }, [startDate, endDate]);

  const isTimestampInRange = (ts: number | undefined | null) => {
    if (!isDateFiltered) return true;
    if (!ts || Number.isNaN(ts)) return false;
    if (dateBounds.startMs !== null && ts < dateBounds.startMs) return false;
    if (dateBounds.endMs !== null && ts > dateBounds.endMs) return false;
    return true;
  };

  const getOrderTimestamp = (o: any): number | null => {
    if (typeof o?.timestamp === 'number' && !Number.isNaN(o.timestamp)) return o.timestamp;
    if (o?.date) {
      const parsed = Date.parse(o.date);
      if (!Number.isNaN(parsed)) return parsed;
    }
    return null;
  };

  const filteredOrders = useMemo(() => {
    if (!isDateFiltered) return orders;
    return orders.filter((o: any) => isTimestampInRange(getOrderTimestamp(o)));
  }, [orders, isDateFiltered, dateBounds]);

  const totalSales = useMemo(() => {
    return filteredOrders
      .filter((o: any) => o.status === 'delivered')
      .reduce((acc: number, o: any) => acc + (Number(o.price) || 0), 0);
  }, [filteredOrders]);

  const totalOrders = filteredOrders.length;

  const totalUsers = useMemo(() => {
    if (!isDateFiltered) return users.length;
    const matchedIds = new Set<string>();
    for (const u of users as any[]) {
      const ts =
        typeof u?.createdAt === 'number'
          ? u.createdAt
          : u?.createdAt
          ? Date.parse(u.createdAt)
          : null;
      if (isTimestampInRange(ts)) {
        matchedIds.add(u.telegramId || u.phoneNumber);
      }
    }
    for (const o of filteredOrders) {
      if (o?.userId) matchedIds.add(o.userId);
    }
    return matchedIds.size;
  }, [users, filteredOrders, isDateFiltered, dateBounds]);

  const orderCountsByProduct = useMemo(() => {
    const map: Record<string, { count: number; revenue: number }> = {};
    for (const o of filteredOrders) {
      if (!o?.productId) continue;
      if (!map[o.productId]) map[o.productId] = { count: 0, revenue: 0 };
      map[o.productId].count += 1;
      map[o.productId].revenue += Number(o.price) || 0;
    }
    return map;
  }, [filteredOrders]);

  const sortedProducts = useMemo(() => {
    return [...products]
      .map((p: any) => {
        const periodOrders = orderCountsByProduct[p.id]?.count || 0;
        const periodRevenue = orderCountsByProduct[p.id]?.revenue || 0;
        const unitPrice = (Number(p.pinduoduoPrice) || 0) * MARKUP_RATE * CURRENCY_RATE;
        const totalUnits = isDateFiltered ? periodOrders : (Number(p.salesCount) || 0) + periodOrders;
        const estimatedRevenue = isDateFiltered ? periodRevenue : totalUnits * unitPrice;
        return { ...p, liveOrders: periodOrders, totalUnits, estimatedRevenue };
      })
      .filter((p: any) => !isDateFiltered || p.totalUnits > 0)
      .sort((a: any, b: any) => b.totalUnits - a.totalUnits);
  }, [products, orderCountsByProduct, isDateFiltered]);

  const productChartData = useMemo(() => {
    return sortedProducts.slice(0, 8).map((p: any) => ({
      shortName: p.name.length > 14 ? `${p.name.slice(0, 14)}…` : p.name,
      fullName: p.name,
      category: p.category || 'Boshqa',
      sales: p.totalUnits,
      liveOrders: p.liveOrders,
      revenue: p.estimatedRevenue
    }));
  }, [sortedProducts]);

  const categoryChartData = useMemo(() => {
    const catMap: Record<string, { sales: number; liveOrders: number; revenue: number; count: number }> = {};
    for (const p of sortedProducts) {
      const cat = p.category || 'Boshqa';
      if (!catMap[cat]) catMap[cat] = { sales: 0, liveOrders: 0, revenue: 0, count: 0 };
      catMap[cat].sales += p.totalUnits;
      catMap[cat].liveOrders += p.liveOrders;
      catMap[cat].revenue += p.estimatedRevenue;
      catMap[cat].count += 1;
    }
    return Object.entries(catMap)
      .map(([cat, stats]) => ({
        shortName: cat.length > 14 ? `${cat.slice(0, 14)}…` : cat,
        fullName: cat,
        category: `${stats.count} ta mahsulot`,
        sales: stats.sales,
        liveOrders: stats.liveOrders,
        revenue: stats.revenue
      }))
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 8);
  }, [sortedProducts]);

  const chartData = chartMode === 'products' ? productChartData : categoryChartData;
  const barColors = ['#0F294A', '#1E3A8A', '#1D4ED8', '#2563EB', '#3B82F6', '#60A5FA', '#64748B', '#94A3B8'];

  const CustomBarTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;
    const item = payload[0].payload;
    return (
      <div className="bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl border border-slate-700 text-xs space-y-1 max-w-[240px]">
        <p className="font-display font-bold text-sm leading-tight">{item.fullName}</p>
        <p className="text-[11px] text-slate-400">{item.category}</p>
        <div className="pt-1.5 border-t border-slate-700 space-y-0.5 font-mono tabular-nums">
          <p className="text-blue-300">
            {isDateFiltered ? 'Davr ichida:' : 'Jami sotilgan:'}{' '}
            <span className="text-white font-semibold">{item.sales.toLocaleString()} ta</span>
          </p>
          {!isDateFiltered && item.liveOrders > 0 && (
            <p className="text-emerald-400">Yangi buyurtmalar: +{item.liveOrders} ta</p>
          )}
          <p className="text-slate-300">Aylanma: {Math.round(item.revenue).toLocaleString()} UZS</p>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title={`${t.stats} va sotuv dinamikasi`}
        subtitle="Tanlangan davr bo'yicha real tushum, buyurtmalar va mahsulotlar tahlili"
        onBack={() => {
          playSound();
          onBack();
        }}
        action={
          isDateFiltered ? (
            <button
              type="button"
              onClick={() => applyPreset('all')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 text-xs font-semibold"
            >
              <X size={14} />
              <span>Filtrni tozalash</span>
            </button>
          ) : null
        }
      />

      {/* Horizontal Desktop Date Range Filter Toolbar */}
      <div className="yuyu-glass p-5 rounded-3xl flex flex-col lg:flex-row lg:items-end justify-between gap-5">
        <div className="space-y-2.5">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
            <Calendar size={15} className="text-[#0F294A] dark:text-blue-400" />
            <span>Sana oralig'i</span>
            {isDateFiltered && (
              <span className="font-mono text-[#0F294A] dark:text-blue-400">
                · {startDate || '…'} — {endDate || '…'}
              </span>
            )}
          </div>
          <div className="inline-flex p-1 yuyu-glass-subtle rounded-xl gap-1">
            {[
              { id: 'all', label: 'Hammasi' },
              { id: 'today', label: 'Bugun' },
              { id: '7d', label: '7 kun' },
              { id: '30d', label: '30 kun' }
            ].map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => applyPreset(preset.id as any)}
                className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                  activePreset === preset.id
                    ? 'bg-[#0F294A] dark:bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 lg:w-auto">
          <div className="space-y-1">
            <label className="block text-[11px] font-medium text-slate-500">Boshlanish sanasi</label>
            <input
              type="date"
              value={startDate}
              max={endDate || undefined}
              onChange={(e) => handleStartDateChange(e.target.value)}
              className="w-full yuyu-glass-input rounded-xl px-3.5 py-2 text-xs font-mono font-medium outline-none focus:border-[#0F294A]"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-[11px] font-medium text-slate-500">Tugash sanasi</label>
            <input
              type="date"
              value={endDate}
              min={startDate || undefined}
              onChange={(e) => handleEndDateChange(e.target.value)}
              className="w-full yuyu-glass-input rounded-xl px-3.5 py-2 text-xs font-mono font-medium outline-none focus:border-[#0F294A]"
            />
          </div>
        </div>
      </div>

      {/* 3-Column KPI Strip */}
      <StaggerGrid className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StaggerItem>
          <motion.div
            whileHover={{ y: -3, scale: 1.01 }}
            transition={{ type: 'spring', stiffness: 320, damping: 24 }}
            className="bg-gradient-to-br from-[#0F294A] via-[#133560] to-[#0B1F3B] border border-white/15 shadow-[0_18px_40px_rgba(15,41,74,0.2)] text-white p-6 rounded-3xl space-y-2"
          >
            <p className="text-xs font-medium text-blue-200">
              {isDateFiltered ? 'Davr tushumi (yetkazilgan)' : 'Umumiy tushum'}
            </p>
            <p className="font-mono tabular-nums text-3xl font-bold">
              {totalSales.toLocaleString()} UZS
            </p>
          </motion.div>
        </StaggerItem>
        <StaggerItem>
          <motion.div
            whileHover={{ y: -3, scale: 1.01 }}
            transition={{ type: 'spring', stiffness: 320, damping: 24 }}
            className="yuyu-glass p-6 rounded-3xl space-y-2"
          >
            <p className="text-xs font-medium text-slate-500">Buyurtmalar soni</p>
            <p className="font-mono tabular-nums text-3xl font-bold text-slate-900 dark:text-white">
              {totalOrders.toLocaleString()}
            </p>
          </motion.div>
        </StaggerItem>
        <StaggerItem>
          <motion.div
            whileHover={{ y: -3, scale: 1.01 }}
            transition={{ type: 'spring', stiffness: 320, damping: 24 }}
            className="yuyu-glass p-6 rounded-3xl space-y-2"
          >
            <p className="text-xs font-medium text-slate-500">
              {isDateFiltered ? 'Faol mijozlar' : 'Jami mijozlar'}
            </p>
            <p className="font-mono tabular-nums text-3xl font-bold text-slate-900 dark:text-white">
              {totalUsers.toLocaleString()}
            </p>
          </motion.div>
        </StaggerItem>
      </StaggerGrid>

      {/* 12-Col Analytics Split: Wide BarChart + Top Sellers */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-8 yuyu-glass p-6 sm:p-7 rounded-3xl space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                Sotilish dinamikasi
              </h2>
              <p className="text-xs text-slate-500">
                {isDateFiltered ? 'Tanlangan davr buyurtmalari kesimida' : 'Mahsulot va toifalar kesimida'}
              </p>
            </div>
            <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-900 rounded-xl gap-1">
              <button
                type="button"
                onClick={() => {
                  playSound();
                  setChartMode('products');
                }}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  chartMode === 'products'
                    ? 'bg-[#0F294A] dark:bg-blue-600 text-white'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Tovarlar
              </button>
              <button
                type="button"
                onClick={() => {
                  playSound();
                  setChartMode('categories');
                }}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  chartMode === 'categories'
                    ? 'bg-[#0F294A] dark:bg-blue-600 text-white'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Toifa
              </button>
            </div>
          </div>

          {chartData.length > 0 ? (
            <div className="w-full h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 12, left: -12, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#94a3b8" strokeOpacity={0.2} />
                  <XAxis
                    dataKey="shortName"
                    tick={{ fill: '#64748b', fontSize: 11, fontWeight: 500 }}
                    axisLine={false}
                    tickLine={false}
                    interval={0}
                    angle={-15}
                    textAnchor="end"
                    height={46}
                  />
                  <YAxis
                    tick={{ fill: '#64748b', fontSize: 11, fontWeight: 500 }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip content={<CustomBarTooltip />} cursor={{ fill: 'rgba(15, 41, 74, 0.06)' }} />
                  <Bar dataKey="sales" radius={[8, 8, 2, 2]} maxBarSize={48}>
                    {chartData.map((_: any, idx: number) => (
                      <Cell key={`bar-${idx}`} fill={barColors[idx % barColors.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="py-20 text-center text-sm text-slate-400">
              {isDateFiltered
                ? "Tanlangan sanalar oralig'ida sotuvlar topilmadi."
                : "Grafik uchun mahsulotlar mavjud emas."}
            </div>
          )}
        </div>

        {/* Right 4 Columns: Top Sellers */}
        <div className="lg:col-span-4 yuyu-glass p-6 rounded-3xl space-y-5">
          <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
            Eng ko'p sotilganlar
          </h2>

          {sortedProducts.length > 0 ? (
            <div className="divide-y divide-slate-200/60 dark:divide-slate-800/70">
              {sortedProducts.slice(0, 6).map((p: any, idx: number) => (
                <div key={p.id} className="py-3.5 first:pt-0 last:pb-0 flex items-center gap-3.5">
                  <span className="font-mono tabular-nums text-xs font-bold text-slate-400 w-5 shrink-0">
                    0{idx + 1}
                  </span>
                  <div className="w-11 h-11 rounded-xl bg-white/75 dark:bg-slate-800/75 p-1 shrink-0 overflow-hidden">
                    <SafeImage src={p.images?.[0]} alt={p.name} className="w-full h-full object-contain" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                      {p.name}
                    </p>
                    <p className="text-xs font-mono tabular-nums text-slate-500">
                      {p.totalUnits.toLocaleString()} ta sotilgan
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-12 text-center text-xs text-slate-400">
              Ushbu davrda sotilgan mahsulotlar yo'q.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

const AdminOrderCard: React.FC<{
  order: Order;
  t: any;
  onUpdateStatus: (id: string, status: Order['status'], trackNumber?: string) => void;
  onUpdateCargoStatus?: (id: string, cargoStatus: CargoStage, trackingCode?: string) => Promise<void> | void;
  onSaveCargoWeighing?: (orderId: string, data: { trackingCode: string; cargoWeightKg: number; cargoRatePerKg: number; cargoMethod: 'avto' | 'avia' }) => Promise<void> | void;
  onApproveCargoPayment?: (orderId: string) => Promise<void> | void;
  onDelete: (id: string) => void;
}> = ({ order, t, onUpdateStatus, onUpdateCargoStatus, onSaveCargoWeighing, onApproveCargoPayment, onDelete }) => {
  const [trackNum, setTrackNum] = useState(order.trackingCode || order.trackNumber || '');
  const [weightInput, setWeightInput] = useState(String(order.cargoWeightKg || '0.5'));
  const [rateInput, setRateInput] = useState(String(order.cargoRatePerKg || '76800'));
  const [cargoMethod, setCargoMethod] = useState<'avto' | 'avia'>(order.cargoMethod || 'avto');
  const [savingCargoWeigh, setSavingCargoWeigh] = useState(false);
  const [approvingCargo, setApprovingCargo] = useState(false);
  const [updatingStage, setUpdatingStage] = useState<CargoStage | 'track' | null>(null);

  const currentCargoStage = normalizeCargoStage(order.cargoStatus, order.status);
  const isDone = order.status === 'delivered' || order.status === 'paid';
  const isCancelled = order.status === 'cancelled';

  const parsedWeight = parseFloat(weightInput) || 0;
  const parsedRate = parseFloat(rateInput) || 0;
  const calculatedCargoFee = Math.round(parsedWeight * parsedRate);

  useEffect(() => {
    setTrackNum(order.trackingCode || order.trackNumber || '');
    if (order.cargoWeightKg) setWeightInput(String(order.cargoWeightKg));
    if (order.cargoRatePerKg) setRateInput(String(order.cargoRatePerKg));
    if (order.cargoMethod) setCargoMethod(order.cargoMethod);
  }, [order.trackingCode, order.trackNumber, order.cargoWeightKg, order.cargoRatePerKg, order.cargoMethod]);

  const activeStepTsRaw =
    currentCargoStage === 1
      ? order.statusTimestamps?.step1 || order.timestamp
      : currentCargoStage === 2
      ? order.statusTimestamps?.step2
      : currentCargoStage === 3
      ? order.statusTimestamps?.step3
      : order.statusTimestamps?.step4;
  const activeStepFormatted = formatCargoTimestamp(activeStepTsRaw);

  const handleStageClick = async (stage: CargoStage) => {
    if (!onUpdateCargoStatus || updatingStage !== null) return;
    setUpdatingStage(stage);
    try {
      await onUpdateCargoStatus(order.id, stage, trackNum.trim());
    } finally {
      setUpdatingStage(null);
    }
  };

  const handleSaveTracking = async () => {
    if (!onUpdateCargoStatus || updatingStage !== null) return;
    setUpdatingStage('track');
    try {
      await onUpdateCargoStatus(order.id, currentCargoStage, trackNum.trim());
    } finally {
      setUpdatingStage(null);
    }
  };

  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ type: 'spring', stiffness: 340, damping: 26 }}
      className="yuyu-glass p-6 rounded-3xl space-y-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3.5 min-w-0">
          {order.selectedColorImage && (
            <div className="w-14 h-14 rounded-2xl overflow-hidden border-2 border-[#2563EB]/40 bg-white dark:bg-slate-800 shrink-0 shadow-sm">
              <SafeImage
                src={order.selectedColorImage}
                alt={order.selectedColor || order.productName}
                className="w-full h-full object-cover"
              />
            </div>
          )}
          <div className="space-y-1 min-w-0">
            <p className="font-mono text-xs font-semibold text-[#0F294A] dark:text-blue-400">
              {order.id} · {order.date}
            </p>
            <h3 className="font-display font-semibold text-base text-slate-900 dark:text-white truncate">
              {order.productName}
            </h3>
            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
              {order.selectedColor && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-200/80 dark:border-blue-800/70 text-[11px] font-semibold text-[#1D4ED8] dark:text-blue-300">
                  <span>Rang: {order.selectedColor}</span>
                </span>
              )}
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                <span>Razmer: {order.selectedSize || order.size || 'Standard'}</span>
              </span>
            </div>
            <p className="text-xs text-slate-500 pt-0.5">
              Mijoz: {order.username}
              {order.referredBy ? ` · Hamkor: ${order.referredBy}` : ''}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span
            className={`inline-flex items-center gap-1 text-xs font-semibold ${
              isCancelled
                ? 'text-red-600 dark:text-red-400'
                : isDone
                ? 'text-emerald-700 dark:text-emerald-400'
                : 'text-amber-700 dark:text-amber-400'
            }`}
          >
            {isCancelled ? (
              <XCircle size={14} />
            ) : isDone ? (
              <CheckCircle2 size={14} />
            ) : (
              <Clock size={14} />
            )}
            <span>{t[order.status] || order.status}</span>
          </span>
          <button
            type="button"
            onClick={() => onDelete(order.id)}
            aria-label="Buyurtmani o'chirish"
            className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-red-600 hover:border-red-200 transition-colors"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <div className="p-3.5 yuyu-glass-subtle rounded-2xl flex items-center justify-between gap-3 text-xs">
        <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400 truncate">
          <MapPin size={13} className="shrink-0" />
          <span className="truncate">{order.address}</span>
        </span>
        <span className="font-mono tabular-nums font-bold text-[#0F294A] dark:text-blue-400 shrink-0">
          {order.price.toLocaleString()} UZS
        </span>
      </div>

      {/* Trek-kod va Kargo hisoblash (Scale SVG) */}
      <div className="rounded-2xl bg-white/95 dark:bg-slate-900/85 border border-blue-200/70 dark:border-blue-900/60 p-4 space-y-4">
        <div className="flex items-center justify-between gap-2 text-xs font-semibold text-slate-900 dark:text-white pb-2 border-b border-slate-200/60 dark:border-slate-800">
          <span className="inline-flex items-center gap-1.5">
            <Scale size={15} className="text-[#2563EB]" />
            <span>Trek-kod va Kargo hisoblash</span>
          </span>
          <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium ${
            order.cargoPaymentStatus === 'paid'
              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
              : order.cargoPaymentStatus === 'verifying'
              ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
              : order.cargoPaymentStatus === 'unpaid'
              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
              : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
          }`}>
            Kargo holati: {order.cargoPaymentStatus || 'pending_weighing'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">Trek-kod</label>
            <input
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono outline-none focus:border-[#2563EB]"
              placeholder="YY-884210"
              value={trackNum}
              onChange={(e) => setTrackNum(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">Vazni (kg)</label>
            <input
              type="number"
              step="0.05"
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono outline-none focus:border-[#2563EB]"
              value={weightInput}
              onChange={(e) => setWeightInput(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">1 kg tarifi (so'm)</label>
            <div className="flex gap-1.5">
              <input
                type="number"
                className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono outline-none focus:border-[#2563EB]"
                value={rateInput}
                onChange={(e) => setRateInput(e.target.value)}
              />
              <button
                type="button"
                onClick={() => {
                  setRateInput('76800');
                  setCargoMethod('avto');
                }}
                className={`px-2 py-1 rounded-lg text-[10px] font-semibold ${cargoMethod === 'avto' ? 'bg-[#2563EB] text-white' : 'yuyu-glass-subtle text-slate-600 dark:text-slate-300'}`}
                title="Avto kargo"
              >
                Avto
              </button>
              <button
                type="button"
                onClick={() => {
                  setRateInput('140800');
                  setCargoMethod('avia');
                }}
                className={`px-2 py-1 rounded-lg text-[10px] font-semibold ${cargoMethod === 'avia' ? 'bg-[#2563EB] text-white' : 'yuyu-glass-subtle text-slate-600 dark:text-slate-300'}`}
                title="Avia kargo"
              >
                Avia
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <div className="text-xs font-mono">
            Hisoblangan kargo: <span className="font-bold text-[#2563EB] dark:text-blue-400">{calculatedCargoFee.toLocaleString()} so'm</span> ({parsedWeight} kg × {parsedRate.toLocaleString()} so'm)
          </div>
          <button
            type="button"
            disabled={savingCargoWeigh}
            onClick={async () => {
              if (!onSaveCargoWeighing) return;
              setSavingCargoWeigh(true);
              try {
                await onSaveCargoWeighing(order.id, {
                  trackingCode: trackNum.trim(),
                  cargoWeightKg: parsedWeight,
                  cargoRatePerKg: parsedRate,
                  cargoMethod
                });
              } finally {
                setSavingCargoWeigh(false);
              }
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#2563EB] hover:bg-blue-600 text-white rounded-xl text-xs font-semibold transition-colors shadow-sm"
          >
            {savingCargoWeigh ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
            <span>Saqlash va Mijozga yuborish</span>
          </button>
        </div>

        {(order.cargoReceiptUrl || order.cargoPaymentStatus === 'verifying') && (
          <div className="pt-3 border-t border-slate-200/60 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {order.cargoReceiptUrl && (
                <a href={order.cargoReceiptUrl} target="_blank" rel="noreferrer" className="w-12 h-12 rounded-xl overflow-hidden border border-slate-300 dark:border-slate-700 block shrink-0">
                  <img src={order.cargoReceiptUrl} alt="Kargo cheki" className="w-full h-full object-cover" />
                </a>
              )}
              <div className="space-y-0.5 text-xs">
                <p className="font-semibold text-slate-900 dark:text-white">Mijoz kargo chekini yukladi</p>
                <p className="text-slate-500 font-mono">Summa: {(order.cargoFeeUzs || calculatedCargoFee).toLocaleString()} so'm</p>
              </div>
            </div>

            {order.cargoPaymentStatus !== 'paid' ? (
              <button
                type="button"
                disabled={approvingCargo}
                onClick={async () => {
                  if (!onApproveCargoPayment) return;
                  setApprovingCargo(true);
                  try {
                    await onApproveCargoPayment(order.id);
                  } finally {
                    setApprovingCargo(false);
                  }
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition-colors shadow-sm whitespace-nowrap"
              >
                {approvingCargo ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                <span>Kargo to'lovini tasdiqlash</span>
              </button>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                <CheckCircle2 size={14} />
                <span>Kargo to'lovi tasdiqlangan</span>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Quick 1-Click Cargo Tracking Controls (1 -> 2 -> 3 -> 4 + Tracking Code) */}
      <div className="rounded-2xl bg-white/90 dark:bg-slate-900/75 border border-blue-200/70 dark:border-blue-900/50 p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-900 dark:text-white">
            <Truck size={14} className="text-[#2563EB] shrink-0" />
            <span>Kargo bosqichi ({currentCargoStage}/4)</span>
          </div>
          {activeStepFormatted && (
            <span className="text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400">
              {activeStepFormatted}
            </span>
          )}
        </div>

        {/* 4 Quick Stage Buttons */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {CARGO_STAGES.map((stage) => {
            const isActive = stage.step === currentCargoStage;
            const isPassed = stage.step < currentCargoStage;
            const isSavingThis = updatingStage === stage.step;

            return (
              <button
                key={stage.step}
                type="button"
                disabled={updatingStage !== null || isCancelled}
                onClick={() => handleStageClick(stage.step)}
                title={stage.label}
                className={`px-2.5 py-2.5 rounded-xl text-left transition-all border flex flex-col gap-1 disabled:opacity-60 ${
                  isActive
                    ? 'bg-[#2563EB] border-[#2563EB] text-white shadow-md shadow-blue-600/20'
                    : isPassed
                    ? 'bg-blue-50/90 dark:bg-blue-950/40 border-blue-200/80 dark:border-blue-800/70 text-[#1D4ED8] dark:text-blue-300 hover:bg-blue-100/80'
                    : 'bg-slate-50/90 dark:bg-slate-800/70 border-slate-200/80 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-blue-300 hover:text-[#2563EB]'
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[11px] font-mono tabular-nums font-bold">
                    {stage.step}-bosqich
                  </span>
                  {isSavingThis ? (
                    <Loader2 size={12} className="animate-spin shrink-0" />
                  ) : isActive || isPassed ? (
                    <Check size={12} strokeWidth={3} className="shrink-0" />
                  ) : null}
                </div>
                <span className="text-[11px] font-semibold leading-tight line-clamp-1">
                  {stage.shortLabel}
                </span>
              </button>
            );
          })}
        </div>

        {/* Tracking Code Input + Save */}
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            className="flex-1 px-3.5 py-2.5 bg-slate-50/90 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-900 dark:text-white outline-none focus:border-[#2563EB]"
            placeholder="Trek-kodni kiriting (masalan: YY-884210)..."
            value={trackNum}
            onChange={(e) => setTrackNum(e.target.value)}
          />
          <button
            type="button"
            disabled={updatingStage !== null}
            onClick={handleSaveTracking}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold transition-colors whitespace-nowrap shrink-0 disabled:opacity-60"
          >
            {updatingStage === 'track' ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <Save size={13} />
            )}
            <span>Trekni saqlash</span>
          </button>
          {order.receiptImage && (
            <a
              href={order.receiptImage}
              target="_blank"
              rel="noreferrer"
              className="px-3.5 py-2.5 rounded-xl yuyu-glass-subtle text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-white/90 dark:hover:bg-slate-800 text-center whitespace-nowrap"
            >
              Chek
            </a>
          )}
        </div>
      </div>

      {/* Legacy payment / fulfillment / cancel actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
        <button
          type="button"
          onClick={() => onUpdateStatus(order.id, 'paid', trackNum)}
          className="py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition-colors"
        >
          Tasdiqlash
        </button>
        <button
          type="button"
          onClick={() => onUpdateStatus(order.id, 'shipped', trackNum)}
          className="py-2.5 bg-[#0F294A] hover:bg-[#163A66] dark:bg-blue-600 text-white rounded-xl text-xs font-semibold transition-colors"
        >
          Yo'lda
        </button>
        <button
          type="button"
          onClick={() => onUpdateStatus(order.id, 'delivered', trackNum)}
          className="py-2.5 bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 text-white rounded-xl text-xs font-semibold transition-colors"
        >
          Yetib keldi
        </button>
        <button
          type="button"
          onClick={() => onUpdateStatus(order.id, 'cancelled', trackNum)}
          className="py-2.5 border border-red-300 dark:border-red-900/60 bg-red-50/80 dark:bg-red-950/30 hover:bg-red-600 hover:text-white text-red-600 dark:text-red-400 rounded-xl text-xs font-semibold transition-colors"
        >
          Bekor qilish
        </button>
      </div>
    </motion.div>
  );
};

export const AdminOrdersView: React.FC<{
  t: any;
  orders: Order[];
  onUpdateStatus: (id: string, status: Order['status'], trackNumber?: string) => void;
  onUpdateCargoStatus?: (id: string, cargoStatus: CargoStage, trackingCode?: string) => Promise<void> | void;
  onSaveCargoWeighing?: (orderId: string, data: { trackingCode: string; cargoWeightKg: number; cargoRatePerKg: number; cargoMethod: 'avto' | 'avia' }) => Promise<void> | void;
  onApproveCargoPayment?: (orderId: string) => Promise<void> | void;
  onDelete: (id: string) => void;
  onBack: () => void;
  playSound: () => void;
}> = ({ t, orders, onUpdateStatus, onUpdateCargoStatus, onSaveCargoWeighing, onApproveCargoPayment, onDelete, onBack, playSound }) => (
  <div className="space-y-8">
    <PageHeader
      title={t.adminOrders}
      subtitle={`Jami ${orders.length} ta buyurtma · 1 bosishda kargo bosqichi va to'lovlarini boshqarish`}
      onBack={() => {
        playSound();
        onBack();
      }}
    />
    {orders.length === 0 ? (
      <div className="yuyu-glass rounded-3xl py-16 text-center text-sm text-slate-400">
        Hali buyurtmalar kelib tushmagan.
      </div>
    ) : (
      <StaggerGrid className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {orders.map((order) => (
          <StaggerItem key={order.id}>
            <AdminOrderCard
              order={order}
              t={t}
              onUpdateStatus={onUpdateStatus}
              onUpdateCargoStatus={onUpdateCargoStatus}
              onSaveCargoWeighing={onSaveCargoWeighing}
              onApproveCargoPayment={onApproveCargoPayment}
              onDelete={onDelete}
            />
          </StaggerItem>
        ))}
      </StaggerGrid>
    )}
  </div>
);

export const AdminAddProductView: React.FC<{
  onAdd: (p: Product) => void;
  onBack: () => void;
  playSound: () => void;
  notify: (msg: string, type?: 'success' | 'error' | 'info') => void;
  productToEdit?: Product | null;
  safeFetchJSON: (url: string, options?: RequestInit) => Promise<any>;
}> = ({ onAdd, onBack, playSound, notify, productToEdit, safeFetchJSON }) => {
  const [form, setForm] = useState({
    name: productToEdit?.name || '',
    price: productToEdit?.pinduoduoPrice.toString() || '',
    oldPrice: productToEdit?.oldPrice?.toString() || '',
    vipPrice: productToEdit?.vipPrice?.toString() || '',
    isVipOnly: productToEdit?.isVipOnly || false,
    category: productToEdit?.category || '',
    desc: productToEdit?.description || '',
    sizes: productToEdit?.sizes.join(', ') || 'S, M, L, XL',
    isOriginal: productToEdit?.isOriginal || false,
    isCheapPrice: productToEdit?.isCheapPrice || false,
    isFlashSale: productToEdit?.isFlashSale || false,
    flashSaleHours: '24',
    weight: productToEdit?.weight?.toString() || ''
  });
  type MediaDraftItem = {
    previewUrl: string;
    url?: string;
    file?: File;
    isBlobPreview?: boolean;
  };
  type ColorVariantDraftItem = {
    id: string;
    name: string;
    previewUrl: string;
    url?: string;
    file?: File;
    isBlobPreview?: boolean;
  };

  const [imageItems, setImageItems] = useState<MediaDraftItem[]>(() =>
    (productToEdit?.images || []).map((url) => ({ previewUrl: url, url }))
  );
  const [videoItems, setVideoItems] = useState<MediaDraftItem[]>(() =>
    (productToEdit?.videos || []).map((url) => ({ previewUrl: url, url }))
  );
  const [colorVariantItems, setColorVariantItems] = useState<ColorVariantDraftItem[]>(() =>
    (productToEdit?.colorVariants || []).map((cv, idx) => ({
      id: `cv-${idx}-${Date.now()}`,
      name: cv.name || '',
      previewUrl: cv.imageUrl || '',
      url: cv.imageUrl || ''
    }))
  );
  const [aiGenerating, setAiGenerating] = useState(false);
  const [savingStatus, setSavingStatus] = useState<'' | 'uploading' | 'saving'>('');

  useEffect(() => {
    return () => {
      imageItems.forEach((item) => {
        if (item.isBlobPreview) URL.revokeObjectURL(item.previewUrl);
      });
      videoItems.forEach((item) => {
        if (item.isBlobPreview) URL.revokeObjectURL(item.previewUrl);
      });
      colorVariantItems.forEach((item) => {
        if (item.isBlobPreview && item.previewUrl) URL.revokeObjectURL(item.previewUrl);
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addColorVariantRow = () => {
    playSound();
    setColorVariantItems((prev) => [
      ...prev,
      {
        id: `cv-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: '',
        previewUrl: ''
      }
    ]);
  };

  const updateColorVariantName = (idx: number, name: string) => {
    setColorVariantItems((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, name } : item))
    );
  };

  const handleColorVariantFile = (idx: number, e: React.ChangeEvent<HTMLInputElement>) => {
    playSound();
    const file = e.target.files?.[0];
    if (!file) return;
    const blobUrl = URL.createObjectURL(file);
    setColorVariantItems((prev) =>
      prev.map((item, i) => {
        if (i !== idx) return item;
        if (item.isBlobPreview && item.previewUrl) {
          URL.revokeObjectURL(item.previewUrl);
        }
        return {
          ...item,
          previewUrl: blobUrl,
          url: undefined,
          file,
          isBlobPreview: true
        };
      })
    );
    e.target.value = '';
  };

  const removeColorVariantRow = (idx: number) => {
    playSound();
    setColorVariantItems((prev) => {
      const target = prev[idx];
      if (target?.isBlobPreview && target.previewUrl) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return prev.filter((_, i) => i !== idx);
    });
  };

  const parsedSizeList = useMemo(
    () =>
      form.sizes
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    [form.sizes]
  );

  const removeSingleSizeChip = (sizeToRemove: string) => {
    playSound();
    const remaining = parsedSizeList.filter((s) => s !== sizeToRemove);
    setForm((prev) => ({
      ...prev,
      sizes: remaining.length > 0 ? remaining.join(', ') : 'Standard'
    }));
  };

  const uploadSingleFileToApi = async (file: File, type: 'img' | 'vid'): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);

    const headers: Record<string, string> = { Accept: 'application/json' };
    const adminToken = readStoredAdminDeviceToken();
    if (adminToken) {
      headers['x-admin-device-token'] = adminToken;
    }

    const res = await fetch('/api/upload', {
      method: 'POST',
      headers,
      body: formData
    });

    const data = await res.json().catch(() => ({}));
    if (res.ok && typeof data?.url === 'string' && data.url.trim()) {
      return data.url.trim();
    }

    // If R2 env vars are not yet set in local preview, gracefully fall back to compressed Data URL
    if (res.status === 503) {
      return uploadMediaSmart(file, {
        folder: type === 'img' ? 'products' : 'videos',
        maxDim: 1400,
        quality: 0.84
      });
    }

    throw new Error(data?.error || "Faylni /api/upload orqali yuklashda xatolik yuz berdi");
  };

  const [aiCopyError, setAiCopyError] = useState<string | null>(null);

  const handleGenerateAiCopy = async () => {
    playSound();
    setAiCopyError(null);
    let firstDataImage =
      imageItems.find(
        (item) => typeof item.url === 'string' && item.url.startsWith('data:image/')
      )?.url ||
      colorVariantItems.find(
        (item) => typeof item.url === 'string' && item.url.startsWith('data:image/')
      )?.url;

    if (!firstDataImage) {
      const pendingImgFile =
        imageItems.find((item) => item.file)?.file ||
        colorVariantItems.find((item) => item.file)?.file;
      if (pendingImgFile) {
        try {
          firstDataImage = await readFileAsDataUrl(pendingImgFile);
        } catch {
          firstDataImage = undefined;
        }
      }
    }

    const firstRemoteImageUrl =
      imageItems.find(
        (item) =>
          typeof item.url === 'string' &&
          (item.url.startsWith('https://') || item.url.startsWith('http://'))
      )?.url ||
      colorVariantItems.find(
        (item) =>
          typeof item.url === 'string' &&
          (item.url.startsWith('https://') || item.url.startsWith('http://'))
      )?.url;

    if (!form.name.trim() && !firstDataImage && !firstRemoteImageUrl) {
      const msg = "Avval mahsulot nomini kiriting yoki rasm tanlang";
      setAiCopyError(msg);
      notify(msg, 'error');
      return;
    }
    setAiGenerating(true);
    try {
      const res = await safeFetchJSON('/api/ai/admin-copy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim() || undefined,
          category: form.category.trim() || undefined,
          sizes: form.sizes.trim() || undefined,
          priceYuan: form.price.trim() || undefined,
          imageDataUrl: firstDataImage || undefined,
          imageUrl: !firstDataImage ? firstRemoteImageUrl : undefined
        })
      });
      setForm((prev) => ({
        ...prev,
        name: prev.name.trim() ? prev.name : (res.suggestedName || prev.name),
        desc: res.description || prev.desc,
        category: prev.category.trim() ? prev.category : (res.suggestedCategory || prev.category),
        sizes:
          !prev.sizes.trim() || prev.sizes.trim() === 'S, M, L, XL'
            ? (res.suggestedSizes || prev.sizes)
            : prev.sizes,
        weight:
          !prev.weight.trim() || prev.weight.trim() === '0.5'
            ? (res.suggestedWeightKg || prev.weight)
            : prev.weight
      }));
      notify("AI mahsulot tavsifi va takliflarini tayyorladi!", 'success');
    } catch (err: any) {
      console.warn('[AdminAddProductView] AI copywriter warning:', err);
      const msg = err?.message || "AI tavsif yaratishda xatolik yuz berdi";
      setAiCopyError(msg);
      notify(msg, 'error');
    } finally {
      setAiGenerating(false);
    }
  };

  const handleMedia = (e: React.ChangeEvent<HTMLInputElement>, type: 'img' | 'vid') => {
    playSound();
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const newDrafts: MediaDraftItem[] = files.map((file) => ({
      previewUrl: URL.createObjectURL(file),
      file,
      isBlobPreview: true
    }));

    if (type === 'img') {
      setImageItems((prev) => [...prev, ...newDrafts]);
    } else {
      setVideoItems((prev) => [...prev, ...newDrafts]);
    }
    e.target.value = '';
  };

  const removeMedia = (idx: number, type: 'img' | 'vid') => {
    playSound();
    if (type === 'img') {
      setImageItems((prev) => {
        const target = prev[idx];
        if (target?.isBlobPreview) URL.revokeObjectURL(target.previewUrl);
        return prev.filter((_, i) => i !== idx);
      });
    } else {
      setVideoItems((prev) => {
        const target = prev[idx];
        if (target?.isBlobPreview) URL.revokeObjectURL(target.previewUrl);
        return prev.filter((_, i) => i !== idx);
      });
    }
  };

  const handleSave = async () => {
    if (savingStatus) return;
    playSound();

    const activeColorRows = colorVariantItems.filter(
      (cv) => cv.name.trim().length > 0 || Boolean(cv.file || cv.url || cv.previewUrl)
    );
    for (const cv of activeColorRows) {
      if (!cv.name.trim()) {
        notify("Har bir qo'shilgan rang varianti uchun rang nomini kiriting (masalan: Qora, Oq)", 'error');
        return;
      }
      if (!cv.file && !cv.url && !cv.previewUrl) {
        notify(`"${cv.name.trim()}" rangi uchun rasm yuklang`, 'error');
        return;
      }
    }

    if (!form.name.trim() || !form.price || (imageItems.length === 0 && activeColorRows.length === 0)) {
      notify("Iltimos, nomi, narxi va kamida bitta rasm (yoki rang rasmi) kiriting", 'error');
      return;
    }

    const parsedPrice = parseFloat(form.price);
    if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
      notify("Mahsulot narxi to'g'ri musbat son bo'lishi kerak", 'error');
      return;
    }

    try {
      const hasPendingUploads =
        imageItems.some((item) => item.file && !item.url) ||
        videoItems.some((item) => item.file && !item.url) ||
        activeColorRows.some((item) => item.file && !item.url);

      if (hasPendingUploads) {
        setSavingStatus('uploading');
        notify("Rasm va videolar /api/upload orqali Cloudflare R2 ga yuklanmoqda...", 'info');
      }

      // 1-qadam: Barcha yangi fayllarni avval /api/upload ga yuklab URL olish
      const uploadedMainImages = await Promise.all(
        imageItems.map(async (item) => {
          if (item.url) return item.url;
          if (!item.file) return item.previewUrl;
          return uploadSingleFileToApi(item.file, 'img');
        })
      );

      const finalColorVariants = await Promise.all(
        activeColorRows.map(async (cv) => {
          const uploadedUrl = cv.url
            ? cv.url
            : cv.file
            ? await uploadSingleFileToApi(cv.file, 'img')
            : cv.previewUrl;
          return {
            name: cv.name.trim(),
            imageUrl: uploadedUrl
          };
        })
      );

      const finalImages =
        uploadedMainImages.length > 0
          ? uploadedMainImages
          : finalColorVariants.map((cv) => cv.imageUrl);

      const finalVideos = await Promise.all(
        videoItems.map(async (item) => {
          if (item.url) return item.url;
          if (!item.file) return item.previewUrl;
          return uploadSingleFileToApi(item.file, 'vid');
        })
      );

      setSavingStatus('saving');

      const newProduct: Product = {
        id: productToEdit?.id || Date.now().toString(),
        name: form.name.trim(),
        pinduoduoPrice: parsedPrice,
        oldPrice: form.oldPrice ? parseFloat(form.oldPrice) : undefined,
        vipPrice: form.vipPrice ? Math.round(parseFloat(form.vipPrice)) : undefined,
        isVipOnly: form.isVipOnly,
        description: form.desc.trim() || `${form.name.trim()} — YUYU Shop sifatli mahsuloti.`,
        category: form.category.trim() || 'Boshqa',
        images: finalImages,
        videos: finalVideos.length > 0 ? finalVideos : undefined,
        colorVariants: finalColorVariants,
        sizes: parsedSizeList.length > 0 ? parsedSizeList : ['Standard'],
        rating: productToEdit?.rating || 5,
        salesCount: productToEdit?.salesCount || 0,
        seller: productToEdit?.seller || {
          name: 'YUYU Shop',
          avatar: '',
          rating: 5,
          description: "Rasmiy do'kon"
        },
        isOriginal: form.isOriginal,
        isCheapPrice: form.isCheapPrice,
        isFlashSale: form.isFlashSale,
        flashSaleEnd: form.isFlashSale
          ? Date.now() + parseInt(form.flashSaleHours || '24', 10) * 3600000
          : undefined,
        weight: form.weight ? parseFloat(form.weight) || undefined : undefined
      };

      // 2-qadam: Olingan R2 media URL'lari bilan mahsulotni /api/products ga saqlash
      const savedRes = await safeFetchJSON('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newProduct,
          price: parsedPrice,
          video: finalVideos[0] || ''
        })
      });

      onAdd(savedRes?.product || newProduct);
    } catch (err: any) {
      notify(err?.message || "Mahsulotni saqlashda xatolik", 'error');
    } finally {
      setSavingStatus('');
    }
  };

  const setPreset = (type: string) => {
    playSound();
    if (type === 'clothes') setForm({ ...form, category: 'Kiyim', sizes: 'S, M, L, XL, XXL' });
    if (type === 'shoes') setForm({ ...form, category: 'Oyoq kiyim', sizes: '38, 39, 40, 41, 42, 43, 44' });
    if (type === 'electronics') setForm({ ...form, category: 'Elektronika', sizes: 'Standard' });
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title={productToEdit ? 'Mahsulotni tahrirlash' : "Yangi mahsulot qo'shish"}
        subtitle="Mahsulot ma'lumotlari, narxi, rang rasmlari va razmerlarini kiriting"
        onBack={() => {
          playSound();
          onBack();
        }}
        action={
          <div className="flex gap-2">
            <button type="button" onClick={() => setPreset('clothes')} className="px-3 py-1.5 rounded-xl yuyu-glass-subtle text-xs font-medium hover:bg-white/90 dark:hover:bg-slate-800">
              Kiyim
            </button>
            <button type="button" onClick={() => setPreset('shoes')} className="px-3 py-1.5 rounded-xl yuyu-glass-subtle text-xs font-medium hover:bg-white/90 dark:hover:bg-slate-800">
              Oyoq kiyim
            </button>
            <button type="button" onClick={() => setPreset('electronics')} className="px-3 py-1.5 rounded-xl yuyu-glass-subtle text-xs font-medium hover:bg-white/90 dark:hover:bg-slate-800">
              Elektronika
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-7 yuyu-glass p-7 rounded-3xl space-y-5">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Mahsulot nomi</label>
            <input
              className="w-full px-4 py-3 yuyu-glass-input rounded-xl text-sm outline-none focus:border-[#0F294A]"
              placeholder="Masalan: Wireless Headphones Pro"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Asl narxi (Yuan)</label>
              <input
                type="number"
                className="w-full px-4 py-3 yuyu-glass-input rounded-xl text-sm font-mono outline-none focus:border-[#0F294A]"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Eski narxi (ixtiyoriy)</label>
              <input
                type="number"
                className="w-full px-4 py-3 yuyu-glass-input rounded-xl text-sm font-mono outline-none focus:border-[#0F294A]"
                value={form.oldPrice}
                onChange={(e) => setForm({ ...form, oldPrice: e.target.value })}
              />
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#070B14] border border-amber-400/40 text-white grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-amber-300 flex items-center gap-1.5">
                <Crown size={13} />
                <span>VIP maxsus narxi (so'm, ixtiyoriy)</span>
              </label>
              <input
                type="number"
                placeholder="Masalan: 159000"
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-white/15 rounded-xl text-sm font-mono text-white outline-none focus:border-amber-400"
                value={form.vipPrice}
                onChange={(e) => setForm({ ...form, vipPrice: e.target.value })}
              />
            </div>
            <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-amber-200 pt-2 sm:pt-5">
              <input
                type="checkbox"
                checked={form.isVipOnly}
                onChange={(e) => setForm({ ...form, isVipOnly: e.target.checked })}
                className="w-4 h-4 accent-amber-400"
              />
              <span>Faqat VIP mijozlar uchun (isVipOnly)</span>
            </label>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Kategoriya</label>
              <input
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:border-[#0F294A]"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Vazni (kg — ixtiyoriy)</label>
              <input
                type="number"
                step="0.05"
                placeholder="Masalan: 0.5"
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-mono outline-none focus:border-[#0F294A]"
                value={form.weight}
                onChange={(e) => setForm({ ...form, weight: e.target.value })}
              />
            </div>
          </div>

          {/* 1688 / Pinduoduo Style Razmerlar Block */}
          <div className="space-y-2.5 p-4 rounded-2xl yuyu-glass-subtle border border-slate-200/70 dark:border-slate-800">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Razmerlar (vergul bilan ajratib yozing)
              </label>
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    playSound();
                    setForm({ ...form, sizes: 'S, M, L, XL, XXL' });
                  }}
                  className="px-2.5 py-1 rounded-lg bg-white/80 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] font-mono font-semibold text-slate-700 dark:text-slate-300 hover:border-[#2563EB]"
                >
                  S-XXL
                </button>
                <button
                  type="button"
                  onClick={() => {
                    playSound();
                    setForm({ ...form, sizes: '36, 37, 38, 39, 40, 41' });
                  }}
                  className="px-2.5 py-1 rounded-lg bg-white/80 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] font-mono font-semibold text-slate-700 dark:text-slate-300 hover:border-[#2563EB]"
                >
                  36-41
                </button>
                <button
                  type="button"
                  onClick={() => {
                    playSound();
                    setForm({ ...form, sizes: '39, 40, 41, 42, 43, 44' });
                  }}
                  className="px-2.5 py-1 rounded-lg bg-white/80 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] font-mono font-semibold text-slate-700 dark:text-slate-300 hover:border-[#2563EB]"
                >
                  39-44
                </button>
                <button
                  type="button"
                  onClick={() => {
                    playSound();
                    setForm({ ...form, sizes: 'Standard' });
                  }}
                  className="px-2.5 py-1 rounded-lg bg-white/80 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] font-mono font-semibold text-slate-700 dark:text-slate-300 hover:border-[#2563EB]"
                >
                  Standard
                </button>
              </div>
            </div>
            <input
              className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-mono outline-none focus:border-[#0F294A]"
              placeholder="Masalan: S, M, L, XL yoki 38, 39, 40, 41"
              value={form.sizes}
              onChange={(e) => setForm({ ...form, sizes: e.target.value })}
            />
            {parsedSizeList.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {parsedSizeList.map((sz) => (
                  <span
                    key={sz}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#0F294A]/10 dark:bg-blue-500/15 border border-[#0F294A]/20 dark:border-blue-400/30 text-xs font-mono font-semibold text-[#0F294A] dark:text-blue-300"
                  >
                    <span>{sz}</span>
                    {parsedSizeList.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeSingleSizeChip(sz)}
                        className="text-slate-400 hover:text-red-500 transition-colors"
                        aria-label={`${sz} razmerini o'chirish`}
                      >
                        <X size={11} />
                      </button>
                    )}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* 1688 & Pinduoduo Style Rang variantlari (Rasm bilan) Block */}
          <div className="space-y-3 p-4 rounded-2xl yuyu-glass-subtle border border-blue-200/70 dark:border-blue-900/50">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  Rang variantlari (Rasm bilan — 1688 / Pinduoduo uslubida)
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Har bir rangning o'z rasmini Cloudflare R2 ga yuklang
                </p>
              </div>
              <button
                type="button"
                disabled={Boolean(savingStatus)}
                onClick={addColorVariantRow}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#2563EB] hover:bg-blue-600 text-white text-xs font-semibold transition-colors shadow-sm disabled:opacity-50 whitespace-nowrap"
              >
                <Plus size={14} />
                <span>Rang qo'shish</span>
              </button>
            </div>

            {colorVariantItems.length === 0 ? (
              <div className="py-5 px-4 rounded-xl border border-dashed border-slate-300/80 dark:border-slate-700 text-center text-xs text-slate-500 dark:text-slate-400">
                Hozircha rang variantlari qo'shilmagan. Yuqoridagi &quot;Rang qo'shish&quot; tugmasini bosing.
              </div>
            ) : (
              <div className="space-y-2.5">
                {colorVariantItems.map((cv, idx) => (
                  <div
                    key={cv.id}
                    className="p-3 rounded-xl bg-white/85 dark:bg-slate-900/85 border border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center gap-3"
                  >
                    <label className="w-16 h-16 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 overflow-hidden shrink-0 flex flex-col items-center justify-center cursor-pointer hover:border-[#2563EB] transition-colors bg-slate-50 dark:bg-slate-800/60 relative group">
                      {cv.previewUrl ? (
                        <>
                          <img
                            src={cv.previewUrl}
                            alt={cv.name || `Rang ${idx + 1}`}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-slate-950/55 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                            <UploadCloud size={15} />
                          </div>
                        </>
                      ) : (
                        <>
                          <UploadCloud size={17} className="text-slate-400" />
                          <span className="text-[10px] text-slate-400 mt-0.5">Rasm</span>
                        </>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={Boolean(savingStatus)}
                        onChange={(e) => handleColorVariantFile(idx, e)}
                      />
                    </label>

                    <div className="flex-1 min-w-0 space-y-1">
                      <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                        Rang nomi #{idx + 1}
                      </label>
                      <input
                        type="text"
                        placeholder="Masalan: Qora, Oq, To'q ko'k..."
                        value={cv.name}
                        disabled={Boolean(savingStatus)}
                        onChange={(e) => updateColorVariantName(idx, e.target.value)}
                        className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium outline-none focus:border-[#2563EB]"
                      />
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <label className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl yuyu-glass-subtle text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer hover:border-[#2563EB]">
                        <UploadCloud size={14} className="text-[#2563EB]" />
                        <span>{cv.previewUrl ? 'Almashtirish' : 'Rasm yuklash'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          disabled={Boolean(savingStatus)}
                          onChange={(e) => handleColorVariantFile(idx, e)}
                        />
                      </label>
                      <button
                        type="button"
                        disabled={Boolean(savingStatus)}
                        onClick={() => removeColorVariantRow(idx)}
                        className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-red-600 hover:border-red-300 transition-colors"
                        aria-label="Rang variantini o'chirish"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Tavsif</label>
              <button
                type="button"
                onClick={handleGenerateAiCopy}
                disabled={aiGenerating}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0F294A] hover:bg-[#163A66] dark:bg-blue-600 dark:hover:bg-blue-500 text-white text-xs font-semibold transition-colors disabled:opacity-50 whitespace-nowrap"
              >
                {aiGenerating ? <Loader2 size={13} className="animate-spin" /> : <Zap size={13} />}
                <span>{aiGenerating ? 'AI yozmoqda...' : 'AI bilan tavsif yozish'}</span>
              </button>
            </div>
            {aiCopyError && (
              <div className="p-3 rounded-xl bg-red-50/90 dark:bg-red-950/50 border border-red-200 dark:border-red-900/60 text-xs text-red-700 dark:text-red-300 flex items-start gap-2">
                <AlertCircle size={14} className="shrink-0 mt-0.5" />
                <span>{aiCopyError}</span>
              </div>
            )}
            <textarea
              rows={4}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none resize-none focus:border-[#0F294A]"
              placeholder="Mahsulot tavsifini kiriting yoki yuqoridagi AI tugmasi bilan avtomatik yarating..."
              value={form.desc}
              onChange={(e) => setForm({ ...form, desc: e.target.value })}
            />
          </div>

          <div className="flex flex-wrap gap-6 pt-2">
            <label className="flex items-center gap-2.5 cursor-pointer text-sm text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={form.isOriginal}
                onChange={(e) => setForm({ ...form, isOriginal: e.target.checked })}
                className="w-4 h-4 accent-[#0F294A]"
              />
              <span>Original mahsulot</span>
            </label>
            <label className="flex items-center gap-2.5 cursor-pointer text-sm text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={form.isCheapPrice}
                onChange={(e) => setForm({ ...form, isCheapPrice: e.target.checked })}
                className="w-4 h-4 accent-[#0F294A]"
              />
              <span>Arzon narx kafolati</span>
            </label>
            <label className="flex items-center gap-2.5 cursor-pointer text-sm text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={form.isFlashSale}
                onChange={(e) => setForm({ ...form, isFlashSale: e.target.checked })}
                className="w-4 h-4 accent-[#0F294A]"
              />
              <span>Tezkor chegirma (Flash Sale)</span>
            </label>
          </div>

          {form.isFlashSale && (
            <div className="space-y-1.5 max-w-xs">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Muddat (soatda)</label>
              <input
                type="number"
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-mono outline-none"
                value={form.flashSaleHours}
                onChange={(e) => setForm({ ...form, flashSaleHours: e.target.value })}
              />
            </div>
          )}
        </div>

        <div className="lg:col-span-5 yuyu-glass-strong p-7 rounded-3xl space-y-6">
          <div className="space-y-3">
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">Mahsulot rasmlari</p>
            <div className="flex flex-wrap gap-3">
              <label className="w-24 h-24 border-2 border-dashed border-slate-300/80 dark:border-slate-700 rounded-2xl flex flex-col items-center justify-center text-slate-400 cursor-pointer hover:bg-white/70 dark:hover:bg-slate-800/60 transition-colors">
                <ImageIcon size={22} />
                <span className="text-[11px] mt-1">Yuklash</span>
                <input type="file" className="hidden" accept="image/*" multiple onChange={(e) => handleMedia(e, 'img')} />
              </label>
              {imageItems.map((img, i) => (
                <div key={i} className="w-24 h-24 rounded-xl relative border border-slate-200 dark:border-slate-700 overflow-hidden">
                  <img src={img.previewUrl} alt="Yuklangan rasm" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    disabled={Boolean(savingStatus)}
                    onClick={() => removeMedia(i, 'img')}
                    className="absolute top-1 right-1 p-1 bg-slate-900/80 text-white rounded-full disabled:opacity-50"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">Videolar (ixtiyoriy)</p>
            <div className="flex flex-wrap gap-3">
              <label className="w-24 h-24 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl flex flex-col items-center justify-center text-slate-400 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors">
                <Video size={22} />
                <span className="text-[11px] mt-1">Video</span>
                <input type="file" className="hidden" accept="video/*" onChange={(e) => handleMedia(e, 'vid')} />
              </label>
              {videoItems.map((_, i) => (
                <div key={i} className="w-24 h-24 rounded-xl bg-slate-900 flex items-center justify-center relative">
                  <Play size={20} className="text-white" />
                  <button
                    type="button"
                    disabled={Boolean(savingStatus)}
                    onClick={() => removeMedia(i, 'vid')}
                    className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-full disabled:opacity-50"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <button
            type="button"
            disabled={Boolean(savingStatus)}
            onClick={handleSave}
            className="w-full py-3.5 bg-[#0F294A] hover:bg-[#163A66] dark:bg-blue-600 text-white font-semibold rounded-xl text-sm transition-colors disabled:opacity-60 inline-flex items-center justify-center gap-2"
          >
            {savingStatus ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>
                  {savingStatus === 'uploading'
                    ? 'Fayllar R2 ga yuklanmoqda...'
                    : 'Mahsulot bazaga saqlanmoqda...'}
                </span>
              </>
            ) : (
              <span>{productToEdit ? "O'zgarishlarni saqlash" : "Mahsulotni qo'shish"}</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export const ManageProductsView: React.FC<{
  products: Product[];
  onEdit: (p: Product) => void;
  onDelete: (id: string) => void;
  onBack: () => void;
  playSound: () => void;
}> = ({ products, onEdit, onDelete, onBack, playSound }) => {
  const [q, setQ] = useState('');
  const filtered = products.filter((p) => p.name.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="space-y-8">
      <PageHeader
        title="Mahsulotlarni boshqarish"
        subtitle={`Katalogda ${products.length} ta mahsulot`}
        onBack={onBack}
        action={
          <div className="relative w-64">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              className="w-full yuyu-glass-input py-2.5 pl-10 pr-3 rounded-xl text-sm outline-none focus:border-[#0F294A]"
              placeholder="Mahsulotni izlash..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
        }
      />

      <StaggerGrid className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map((p) => (
          <StaggerItem key={p.id}>
            <motion.div
              whileHover={{ y: -3 }}
              transition={{ type: 'spring', stiffness: 340, damping: 26 }}
              className="yuyu-glass p-4 rounded-3xl flex items-center gap-4"
            >
              <div className="w-16 h-16 rounded-2xl bg-white/75 dark:bg-slate-800/75 p-1.5 shrink-0 overflow-hidden">
                <SafeImage src={p.images?.[0]} alt={p.name} className="w-full h-full object-contain" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-500">{p.category}</p>
                <p className="font-semibold text-sm text-slate-900 dark:text-white truncate">{p.name}</p>
                <p className="font-mono tabular-nums text-xs font-bold text-[#0F294A] dark:text-blue-400 mt-0.5">
                  {(p.pinduoduoPrice * MARKUP_RATE * CURRENCY_RATE).toLocaleString()} UZS
                </p>
              </div>
              <div className="flex gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    playSound();
                    onEdit(p);
                  }}
                  aria-label="Tahrirlash"
                  className="p-2 rounded-xl yuyu-glass-subtle text-slate-600 dark:text-slate-300 hover:bg-white/90 dark:hover:bg-slate-800"
                >
                  <Edit3 size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    playSound();
                    onDelete(p.id);
                  }}
                  aria-label="O'chirish"
                  className="p-2 rounded-xl yuyu-glass-subtle text-slate-500 hover:text-red-600 hover:border-red-300"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </motion.div>
          </StaggerItem>
        ))}
      </StaggerGrid>
    </div>
  );
};

export const ManageBannersView: React.FC<{
  banners: Banner[];
  onUpdate: (b: Banner[]) => void;
  onBack: () => void;
  playSound: () => void;
  notify: (msg: string, type?: 'success' | 'error' | 'info') => void;
  safeFetchJSON: (url: string, options?: RequestInit) => Promise<any>;
}> = ({ banners, onUpdate, onBack, playSound, notify, safeFetchJSON }) => {
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ title: '', subtitle: '', image: '', link: '' });

  const handleSave = async () => {
    playSound();
    if (!form.title || !form.image) {
      notify("Sarlavha va rasm majburiy", 'error');
      return;
    }
    const updatedBanners = editingBanner
      ? banners.map((b) => (b.id === editingBanner.id ? { ...b, ...form } : b))
      : [...banners, { id: Date.now().toString(), ...form }];

    try {
      await safeFetchJSON('/api/banners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedBanners)
      });
      onUpdate(updatedBanners);
      setEditingBanner(null);
      setShowModal(false);
      setForm({ title: '', subtitle: '', image: '', link: '' });
      notify("Banner saqlandi", 'success');
    } catch {
      notify("Xatolik yuz berdi", 'error');
    }
  };

  const deleteBanner = async (id: string) => {
    const updated = banners.filter((b) => b.id !== id);
    try {
      await safeFetchJSON('/api/banners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      });
      onUpdate(updated);
      notify("Banner o'chirildi", 'info');
    } catch {
      notify("Xatolik yuz berdi", 'error');
    }
  };

  const handleImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    notify("Rasm yuklanmoqda...", 'info');
    try {
      const uploadedUrl = await uploadMediaSmart(file, {
        folder: 'banners',
        maxDim: 1600,
        quality: 0.86
      });
      setForm((prev) => ({ ...prev, image: uploadedUrl }));
      notify("Banner rasmi yuklandi", 'success');
    } catch (err: any) {
      notify(err?.message || "Banner rasmini yuklashda xatolik", 'error');
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Bosh sahifa bannerlari"
        subtitle="Aksiyalar va asosiy vitrina rasmlarini boshqarish"
        onBack={onBack}
        action={
          <button
            type="button"
            onClick={() => {
              setEditingBanner(null);
              setForm({ title: '', subtitle: '', image: '', link: '' });
              setShowModal(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#0F294A] dark:bg-blue-600 text-white rounded-xl text-xs font-semibold"
          >
            <Plus size={15} />
            <span>Yangi banner</span>
          </button>
        }
      />

      <StaggerGrid className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {banners.map((b) => (
          <StaggerItem key={b.id}>
            <motion.div
              whileHover={{ y: -3 }}
              transition={{ type: 'spring', stiffness: 320, damping: 24 }}
              className="yuyu-glass rounded-3xl overflow-hidden flex flex-col"
            >
              <div className="aspect-[16/9] bg-slate-100/70 dark:bg-slate-800/70 overflow-hidden">
                <SafeImage src={b.image} alt={b.title} className="w-full h-full object-cover" />
              </div>
              <div className="p-5 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-display font-semibold text-base text-slate-900 dark:text-white truncate">
                    {b.title}
                  </p>
                  <p className="text-xs text-slate-500 truncate">{b.subtitle}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingBanner(b);
                      setForm({ title: b.title, subtitle: b.subtitle, image: b.image, link: b.link || '' });
                      setShowModal(true);
                    }}
                    className="p-2 rounded-xl yuyu-glass-subtle text-slate-600 dark:text-slate-300"
                  >
                    <Edit3 size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteBanner(b.id)}
                    className="p-2 rounded-xl yuyu-glass-subtle text-slate-500 hover:text-red-600"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </motion.div>
          </StaggerItem>
        ))}
      </StaggerGrid>

      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-slate-950/50 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 16 }}
              transition={{ type: 'spring', stiffness: 360, damping: 28 }}
              className="yuyu-glass-strong w-full max-w-md rounded-3xl p-7 space-y-5 shadow-2xl"
            >
              <div className="flex justify-between items-center">
                <h3 className="font-display font-bold text-lg text-slate-900 dark:text-white">
                  {editingBanner ? 'Bannerni tahrirlash' : 'Yangi banner'}
                </h3>
                <button type="button" onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-white/70 dark:hover:bg-slate-800">
                  <X size={18} />
                </button>
              </div>
              <div className="space-y-3.5">
                <input
                  className="w-full px-4 py-3 yuyu-glass-input rounded-xl text-sm outline-none"
                  placeholder="Sarlavha"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
                <input
                  className="w-full px-4 py-3 yuyu-glass-input rounded-xl text-sm outline-none"
                  placeholder="Tavsif matni"
                  value={form.subtitle}
                  onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
                />
                <input
                  className="w-full px-4 py-3 yuyu-glass-input rounded-xl text-sm outline-none"
                  placeholder="Havola (masalan: catalog)"
                  value={form.link}
                  onChange={(e) => setForm({ ...form, link: e.target.value })}
                />
                <label className="block w-full p-6 border-2 border-dashed border-slate-300/80 dark:border-slate-700 rounded-2xl text-center text-slate-500 cursor-pointer hover:bg-white/60 dark:hover:bg-slate-900/60">
                  {form.image ? (
                    <img src={form.image} alt="Banner" className="h-24 mx-auto rounded-lg object-cover" />
                  ) : (
                    <div className="space-y-1">
                      <UploadCloud size={26} className="mx-auto text-slate-400" />
                      <span className="text-xs font-medium">Banner rasmini yuklang</span>
                    </div>
                  )}
                  <input type="file" className="hidden" accept="image/*" onChange={handleImage} />
                </label>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 yuyu-glass-subtle rounded-xl text-xs font-semibold"
                >
                  Bekor qilish
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  className="flex-1 py-2.5 bg-[#0F294A] dark:bg-blue-600 text-white rounded-xl text-xs font-semibold"
                >
                  Saqlash
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export const UserSearchView: React.FC<{ users: User[]; onBack: () => void }> = ({ users, onBack }) => {
  const [q, setQ] = useState('');
  const filtered = users.filter(
    (u) => u.username.toLowerCase().includes(q.toLowerCase()) || u.telegramId.includes(q)
  );

  return (
    <div className="space-y-8">
      <PageHeader
        title="Mijozlar ro'yxati"
        subtitle={`Jami ${users.length} ta foydalanuvchi`}
        onBack={onBack}
        action={
          <div className="relative w-64">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              className="w-full yuyu-glass-input py-2.5 pl-10 pr-3 rounded-xl text-sm outline-none focus:border-[#0F294A]"
              placeholder="Ism yoki telefon..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
        }
      />

      <StaggerGrid className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((u) => (
          <StaggerItem key={u.telegramId}>
            <motion.div
              whileHover={{ y: -2 }}
              className="flex items-center gap-4 p-4 yuyu-glass rounded-3xl"
            >
              <div className="w-12 h-12 rounded-full overflow-hidden shrink-0 bg-white/75 dark:bg-slate-800/75">
                <SafeImage src={u.avatar} alt={u.username} className="w-full h-full object-cover" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-sm text-slate-900 dark:text-white truncate">{u.username}</p>
                <p className="text-xs font-mono text-slate-500 truncate">{u.telegramId}</p>
              </div>
              {u.isAdmin && (
                <span className="text-xs font-semibold text-[#0F294A] dark:text-blue-400">Admin</span>
              )}
            </motion.div>
          </StaggerItem>
        ))}
      </StaggerGrid>
    </div>
  );
};

export const WishlistView: React.FC<{
  t: any;
  products: Product[];
  wishlist: string[];
  onProductClick: (p: Product) => void;
  onBack: () => void;
  playSound: () => void;
}> = ({ t, products, wishlist, onProductClick, onBack, playSound }) => {
  const wishlistProducts = products.filter((p) => wishlist.includes(p.id));

  return (
    <div className="space-y-8">
      <PageHeader
        title={t.wishlist}
        subtitle={`Saqlangan ${wishlistProducts.length} ta mahsulot`}
        onBack={() => {
          playSound();
          onBack();
        }}
      />
      {wishlistProducts.length === 0 ? (
        <GlassReveal>
          <div className="yuyu-glass rounded-3xl py-20 text-center space-y-3">
            <Heart size={36} strokeWidth={1.3} className="mx-auto text-slate-300 dark:text-slate-600" />
            <p className="text-sm text-slate-500">Hali hech qanday mahsulot saqlanmagan.</p>
          </div>
        </GlassReveal>
      ) : (
        <StaggerGrid className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {wishlistProducts.map((p) => (
            <StaggerItem key={p.id}>
              <ProductCard product={p} onClick={() => onProductClick(p)} />
            </StaggerItem>
          ))}
        </StaggerGrid>
      )}
    </div>
  );
};

export const SupportView: React.FC<{
  t: any;
  user: User;
  onBack: () => void;
  playSound: () => void;
  notify: (msg: string, type?: 'success' | 'error' | 'info') => void;
  safeFetchJSON: (url: string, options?: RequestInit) => Promise<any>;
}> = ({ t, user, onBack, playSound, notify, safeFetchJSON }) => {
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  const handleSend = async () => {
    if (!message.trim()) return;
    setIsSending(true);
    playSound();
    try {
      await safeFetchJSON('/api/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.telegramId, username: user.username, message })
      });
      notify("Xabaringiz yuborildi! Tez orada javob beramiz.", 'success');
      setMessage('');
    } catch {
      notify("Xabar yuborishda xatolik", 'error');
    }
    setIsSending(false);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <PageHeader
        title={t.support}
        subtitle="YUYU Shop qo'llab-quvvatlash xizmati"
        onBack={() => {
          playSound();
          onBack();
        }}
      />
      <div className="yuyu-glass p-7 rounded-3xl space-y-5">
        <div className="space-y-1">
          <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
            Admin bilan bog'lanish
          </h2>
          <p className="text-sm text-slate-500">
            Buyurtma, yetkazib berish yoki hamkorlik bo'yicha savollaringizni yozib qoldiring.
          </p>
        </div>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Xabaringizni kiriting..."
          className="w-full h-40 yuyu-glass-input rounded-2xl p-4 text-sm outline-none resize-none focus:border-[#0F294A]"
        />
        <motion.button
          type="button"
          whileHover={{ y: -1, scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          onClick={handleSend}
          disabled={isSending}
          className="px-6 py-3 bg-[#0F294A] hover:bg-[#163A66] dark:bg-blue-600 text-white font-semibold rounded-xl inline-flex items-center gap-2 text-sm disabled:opacity-50 shadow-md shadow-blue-950/15"
        >
          {isSending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          <span>Xabar yuborish</span>
        </motion.button>
      </div>
    </div>
  );
};

export const PartnershipView: React.FC<{
  t: any;
  user: User;
  onBack: () => void;
  playSound: () => void;
  notify: (msg: string, type?: 'success' | 'error' | 'info') => void;
  safeFetchJSON: (url: string, options?: RequestInit) => Promise<any>;
}> = ({ t, user, onBack, playSound, notify, safeFetchJSON }) => {
  const [receipt, setReceipt] = useState<string | null>(null);
  const [type, setType] = useState<'40' | '55' | null>(null);

  const handleReceipt = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    notify("Chek rasmi yuklanmoqda...", 'info');
    try {
      const uploadedUrl = await uploadMediaSmart(file, {
        folder: 'receipts',
        maxDim: 1400,
        quality: 0.84
      });
      setReceipt(uploadedUrl);
      notify("Chek rasmi yuklandi", 'success');
    } catch (err: any) {
      notify(err?.message || "Chek rasmini yuklashda xatolik", 'error');
    }
  };

  const handleSubmit = async () => {
    if (!receipt || !type) {
      notify("Iltimos, dastur turini tanlang va chekni yuklang", 'error');
      return;
    }
    playSound();
    try {
      await safeFetchJSON('/api/partnerships', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.telegramId, username: user.username, type, receipt })
      });
      notify(t.partnershipSuccess, 'success');
      onBack();
    } catch {
      notify("So'rov yuborishda xatolik", 'error');
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <PageHeader
        title={t.partnership}
        subtitle={t.partnershipDesc}
        onBack={() => {
          playSound();
          onBack();
        }}
      />

      <div className="yuyu-glass p-7 rounded-3xl space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => setType('40')}
            className={`p-5 rounded-2xl border text-left space-y-1 transition-all ${
              type === '40'
                ? 'border-[#0F294A] bg-blue-50/75 dark:border-blue-500 dark:bg-blue-950/40 shadow-sm'
                : 'border-white/70 dark:border-slate-700/70 bg-white/45 dark:bg-slate-900/45'
            }`}
          >
            <p className="font-display font-bold text-base text-slate-900 dark:text-white">
              {t.partnership20k}
            </p>
            <p className="text-xs text-slate-500">50 ta 40% chegirmali promo-kodlar</p>
          </button>
          <button
            type="button"
            onClick={() => setType('55')}
            className={`p-5 rounded-2xl border text-left space-y-1 transition-all ${
              type === '55'
                ? 'border-[#0F294A] bg-blue-50/75 dark:border-blue-500 dark:bg-blue-950/40 shadow-sm'
                : 'border-white/70 dark:border-slate-700/70 bg-white/45 dark:bg-slate-900/45'
            }`}
          >
            <p className="font-display font-bold text-base text-slate-900 dark:text-white">
              {t.partnership30k}
            </p>
            <p className="text-xs text-slate-500">50 ta 55% chegirmali promo-kodlar</p>
          </button>
        </div>

        <div className="yuyu-glass-subtle p-5 rounded-2xl flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs text-slate-500">To'lov kartasi ({CARD_OWNER})</p>
            <p className="font-mono font-bold text-base text-slate-900 dark:text-white mt-0.5">
              {CARD_NUMBER}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(CARD_NUMBER);
              notify("Karta raqami nusxalandi", 'success');
            }}
            className="px-3.5 py-2 rounded-xl yuyu-glass-subtle text-xs font-semibold hover:bg-white/90 dark:hover:bg-slate-800"
          >
            Nusxalash
          </button>
        </div>

        <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-slate-300/80 dark:border-slate-700 rounded-2xl cursor-pointer hover:bg-white/60 dark:hover:bg-slate-900/60 overflow-hidden">
          {receipt ? (
            <img src={receipt} alt="Chek" className="w-full h-full object-contain" />
          ) : (
            <div className="text-center space-y-1">
              <UploadCloud size={26} className="mx-auto text-slate-400" />
              <p className="text-xs font-medium text-slate-500">To'lov chekini yuklang</p>
            </div>
          )}
          <input type="file" accept="image/*" onChange={handleReceipt} className="hidden" />
        </label>

        <motion.button
          type="button"
          whileHover={{ y: -2, scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleSubmit}
          className="w-full py-3.5 bg-[#0F294A] hover:bg-[#163A66] dark:bg-blue-600 text-white font-semibold rounded-xl text-sm transition-colors shadow-lg shadow-blue-950/15"
        >
          So'rov yuborish
        </motion.button>
      </div>
    </div>
  );
};

export const PromoCodesView: React.FC<{
  t: any;
  user: User;
  promoCodes: any[];
  onBack: () => void;
  playSound: () => void;
}> = ({ t, user, promoCodes, onBack, playSound }) => {
  const myCodes = promoCodes.filter((p) => p.ownerId === user.telegramId);

  return (
    <div className="space-y-8">
      <PageHeader
        title={t.myPromoCodes}
        subtitle={`Sizda ${myCodes.length} ta promo-kod mavjud`}
        onBack={() => {
          playSound();
          onBack();
        }}
      />
      {myCodes.length === 0 ? (
        <GlassReveal>
          <div className="yuyu-glass rounded-3xl py-20 text-center space-y-3">
            <Lock size={36} strokeWidth={1.3} className="mx-auto text-slate-300 dark:text-slate-600" />
            <p className="text-sm text-slate-500">
              Sizda hali promo-kodlar yo'q. Hamkorlik dasturiga qo'shilib chegirma kodlariga ega bo'ling.
            </p>
          </div>
        </GlassReveal>
      ) : (
        <StaggerGrid className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {myCodes.map((p) => (
            <StaggerItem key={p.id}>
              <motion.div
                whileHover={{ y: -3 }}
                className="yuyu-glass p-5 rounded-3xl flex items-center justify-between gap-4"
              >
                <div>
                  <p className="text-xl font-mono font-bold text-[#0F294A] dark:text-blue-400">{p.code}</p>
                  <p className="text-xs text-slate-500">Chegirma: {Math.round(p.discount * 100)}%</p>
                </div>
                <span
                  className={`text-xs font-semibold ${
                    p.isUsed ? 'text-red-600 dark:text-red-400' : 'text-emerald-700 dark:text-emerald-400'
                  }`}
                >
                  {p.isUsed ? 'Ishlatilgan' : 'Faol'}
                </span>
              </motion.div>
            </StaggerItem>
          ))}
        </StaggerGrid>
      )}
    </div>
  );
};

export const AdminPartnershipsView: React.FC<{
  partnerships: any[];
  onUpdate: (id: string, status: string) => void;
  onBack: () => void;
  playSound: () => void;
}> = ({ partnerships, onUpdate, onBack, playSound }) => (
  <div className="space-y-8">
    <PageHeader
      title="Hamkorlik so'rovlari"
      subtitle={`Jami ${partnerships.length} ta ariza`}
      onBack={() => {
        playSound();
        onBack();
      }}
    />
    <StaggerGrid className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {partnerships.map((p) => (
        <StaggerItem key={p.id}>
          <motion.div
            whileHover={{ y: -2 }}
            className="yuyu-glass p-6 rounded-3xl space-y-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-display font-bold text-base text-slate-900 dark:text-white">
                  {p.username}
                </p>
                <p className="text-xs font-mono text-slate-500">{p.date}</p>
              </div>
              <span className="text-xs font-semibold text-[#0F294A] dark:text-blue-400">{p.status}</span>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Dastur: <strong>{p.type === '40' ? '20 000 UZS (40%)' : '30 000 UZS (55%)'}</strong>
            </p>
            {p.receipt && (
              <img src={p.receipt} alt="Hamkorlik cheki" className="w-full h-44 object-cover rounded-2xl" />
            )}
            {p.status === 'pending' && (
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => onUpdate(p.id, 'approved')}
                  className="py-2.5 bg-emerald-600 text-white font-semibold rounded-xl text-xs"
                >
                  Tasdiqlash
                </button>
                <button
                  type="button"
                  onClick={() => onUpdate(p.id, 'rejected')}
                  className="py-2.5 bg-red-600 text-white font-semibold rounded-xl text-xs"
                >
                  Rad etish
                </button>
              </div>
            )}
          </motion.div>
        </StaggerItem>
      ))}
    </StaggerGrid>
  </div>
);

export const AdminSupportView: React.FC<{
  messages: any[];
  onBack: () => void;
  playSound: () => void;
}> = ({ messages, onBack, playSound }) => (
  <div className="space-y-8">
    <PageHeader
      title="Yordam xabarlari"
      subtitle={`Jami ${messages.length} ta murojaat`}
      onBack={() => {
        playSound();
        onBack();
      }}
    />
    <StaggerGrid className="grid grid-cols-1 md:grid-cols-2 gap-5">
      {messages.map((m) => (
        <StaggerItem key={m.id}>
          <motion.div
            whileHover={{ y: -2 }}
            className="yuyu-glass p-6 rounded-3xl space-y-2.5"
          >
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-900 dark:text-white">{m.username}</span>
              <span className="font-mono text-slate-400">{m.date}</span>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{m.message}</p>
          </motion.div>
        </StaggerItem>
      ))}
    </StaggerGrid>
  </div>
);

export const ReferralView: React.FC<{
  t: any;
  user: User;
  playSound: () => void;
  notify: (msg: string, type?: 'success' | 'error' | 'info') => void;
  onBack: () => void;
}> = ({ user, playSound, notify, onBack }) => {
  const [copied, setCopied] = useState(false);
  const refLink = `${MAIN_REF_LINK}?start=${user.telegramId || 'user'}`;

  const handleCopy = () => {
    playSound();
    navigator.clipboard.writeText(refLink);
    setCopied(true);
    notify("Havola nusxalandi", 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <PageHeader
        title="Taklif va bonuslar"
        subtitle="Do'stlaringizni YUYU Shop ga taklif qiling va bonus jamg'aring"
        onBack={() => {
          playSound();
          onBack();
        }}
      />

      <div className="yuyu-glass p-8 rounded-3xl space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="p-5 yuyu-glass-subtle rounded-2xl space-y-1">
            <p className="text-xs text-slate-500">Jami bonuslar</p>
            <p className="font-mono tabular-nums text-2xl font-bold text-[#0F294A] dark:text-blue-400">
              {(user.referralBalance || 0).toLocaleString()} UZS
            </p>
          </div>
          <div className="p-5 yuyu-glass-subtle rounded-2xl space-y-1">
            <p className="text-xs text-slate-500">Taklif qilinganlar</p>
            <p className="font-mono tabular-nums text-2xl font-bold text-slate-900 dark:text-white">
              {user.invitedCount || 0}
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
            Shaxsiy taklif havolangiz
          </label>
          <div className="flex gap-2.5">
            <input
              readOnly
              value={refLink}
              className="flex-1 yuyu-glass-input px-4 py-3 rounded-xl text-xs font-mono truncate outline-none"
            />
            <motion.button
              type="button"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.96 }}
              onClick={handleCopy}
              className="px-5 py-3 bg-[#0F294A] dark:bg-blue-600 text-white rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 shadow-md shadow-blue-950/15"
            >
              {copied ? <Check size={15} /> : <Copy size={15} />}
              <span>{copied ? 'Nusxalandi' : 'Nusxalash'}</span>
            </motion.button>
          </div>
        </div>
      </div>
    </div>
  );
};
