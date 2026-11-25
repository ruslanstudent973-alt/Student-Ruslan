import React, { useState, useMemo, useEffect } from 'react';
import {
  Crown, Gem, ShieldCheck, Sparkles, Check, X, Copy, UploadCloud,
  Loader2, Search, ChevronLeft, Plus, Minus, Calendar, Wallet, Users,
  Award, ArrowRight, Save, RefreshCw
} from 'lucide-react';
import { User, VipTier } from '../types';
import { CARD_NUMBER, CARD_OWNER } from '../constants';
import {
  VIP_MONTHLY_PRICE,
  getEffectiveVipStatus,
  calculateGoldSavingsForCart
} from '../utils/vip';
import { soundEngine } from '../utils/soundEngine';
import { uploadMediaSmart } from '../utils/r2MediaUpload';

export const VipTierBadge: React.FC<{
  tier: VipTier;
  size?: 'sm' | 'md';
  showNone?: boolean;
}> = ({ tier, size = 'sm', showNone = false }) => {
  if (tier === 'NONE' && !showNone) return null;

  const styles: Record<VipTier, string> = {
    NONE: 'bg-slate-800/80 text-slate-300 border-slate-600/60',
    SILVER:
      'bg-gradient-to-r from-slate-200/15 via-slate-300/25 to-slate-100/15 text-slate-100 border-slate-300/50 shadow-[0_0_14px_rgba(203,213,225,0.2)]',
    GOLD:
      'bg-gradient-to-r from-amber-500/20 via-yellow-400/25 to-amber-600/20 text-amber-200 border-amber-400/60 shadow-[0_0_16px_rgba(251,191,36,0.28)]',
    DIAMOND:
      'bg-gradient-to-r from-cyan-500/20 via-purple-500/25 to-fuchsia-500/20 text-cyan-200 border-cyan-400/60 shadow-[0_0_18px_rgba(34,211,238,0.35)]'
  };

  const labels: Record<VipTier, string> = {
    NONE: 'ODDIY',
    SILVER: 'SILVER VIP',
    GOLD: 'GOLD VIP',
    DIAMOND: 'DIAMOND VIP'
  };

  const iconSize = size === 'sm' ? 12 : 14;

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-mono font-bold tracking-wider uppercase rounded-lg border backdrop-blur-md whitespace-nowrap ${
        size === 'sm' ? 'px-2.5 py-0.5 text-[10px]' : 'px-3 py-1 text-xs'
      } ${styles[tier]}`}
    >
      {tier === 'DIAMOND' && <Gem size={iconSize} className="text-cyan-300 shrink-0" />}
      {tier === 'GOLD' && <Crown size={iconSize} className="text-amber-300 shrink-0" />}
      {tier === 'SILVER' && <ShieldCheck size={iconSize} className="text-slate-200 shrink-0" />}
      <span>{labels[tier]}</span>
    </span>
  );
};

export const VipStatusCard: React.FC<{
  user: User;
  onOpenSubscribeModal: () => void;
}> = ({ user, onOpenSubscribeModal }) => {
  const status = getEffectiveVipStatus(user);

  const cardTheme: Record<
    VipTier,
    {
      outerBorder: string;
      bgGradient: string;
      orbPrimary: string;
      orbSecondary: string;
      accentText: string;
      barGradient: string;
      barGlow: string;
      iconSurface: string;
      milestoneActive: string;
    }
  > = {
    NONE: {
      outerBorder: 'border-amber-400/30 shadow-[0_12px_40px_rgba(2,6,23,0.45)]',
      bgGradient: 'from-[#111827]/95 via-[#090E1A]/95 to-[#050811]/98',
      orbPrimary: 'from-amber-500/35 to-yellow-300/20',
      orbSecondary: 'from-cyan-500/20 to-purple-600/20',
      accentText: 'text-amber-300',
      barGradient: 'from-amber-400 via-yellow-300 to-amber-500',
      barGlow: 'shadow-[0_0_14px_rgba(251,191,36,0.55)]',
      iconSurface: 'bg-white/[0.06] text-amber-300 border-amber-400/35',
      milestoneActive: 'text-amber-300'
    },
    SILVER: {
      outerBorder: 'border-slate-300/45 shadow-[0_12px_42px_rgba(203,213,225,0.16)]',
      bgGradient: 'from-slate-800/45 via-[#0B111E]/95 to-[#050811]/98',
      orbPrimary: 'from-slate-200/30 to-cyan-300/20',
      orbSecondary: 'from-blue-500/20 to-slate-400/15',
      accentText: 'text-slate-100',
      barGradient: 'from-slate-300 via-white to-cyan-200',
      barGlow: 'shadow-[0_0_14px_rgba(226,232,240,0.5)]',
      iconSurface: 'bg-slate-200/15 text-slate-100 border-slate-300/45',
      milestoneActive: 'text-slate-100'
    },
    GOLD: {
      outerBorder: 'border-amber-400/60 shadow-[0_14px_48px_rgba(245,158,11,0.22)]',
      bgGradient: 'from-amber-500/20 via-[#0E121E]/95 to-[#05070E]/98',
      orbPrimary: 'from-amber-400/40 to-yellow-300/25',
      orbSecondary: 'from-amber-600/20 to-purple-500/20',
      accentText: 'text-amber-300',
      barGradient: 'from-amber-400 via-yellow-300 to-amber-500',
      barGlow: 'shadow-[0_0_18px_rgba(251,191,36,0.65)]',
      iconSurface: 'bg-amber-400/15 text-amber-300 border-amber-400/55',
      milestoneActive: 'text-amber-300'
    },
    DIAMOND: {
      outerBorder: 'border-cyan-400/65 shadow-[0_14px_52px_rgba(34,211,238,0.24)]',
      bgGradient: 'from-cyan-500/20 via-purple-900/30 to-[#05070F]/98',
      orbPrimary: 'from-cyan-400/40 to-purple-500/30',
      orbSecondary: 'from-fuchsia-500/25 to-cyan-500/20',
      accentText: 'text-cyan-300',
      barGradient: 'from-cyan-400 via-purple-400 to-fuchsia-400',
      barGlow: 'shadow-[0_0_18px_rgba(34,211,238,0.7)]',
      iconSurface: 'bg-cyan-400/15 text-cyan-300 border-cyan-400/55',
      milestoneActive: 'text-cyan-300'
    }
  };

  const tStyle = cardTheme[status.tier];

  const formattedExpiry = status.vipExpiresAt
    ? new Date(status.vipExpiresAt).toLocaleDateString('uz-UZ', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    : null;

  // Dynamic milestone target for visual cashback balance progress bar (scales cleanly in 100k steps)
  const cashbackGoal = Math.max(100000, Math.ceil((status.cashbackBalance + 1) / 100000) * 100000);
  const cashbackProgress = Math.min(100, Math.round((status.cashbackBalance / cashbackGoal) * 100));

  const tierMilestones: { key: VipTier; label: string; threshold: string }[] = [
    { key: 'NONE', label: 'Start', threshold: '0' },
    { key: 'SILVER', label: 'Silver', threshold: '500k' },
    { key: 'GOLD', label: 'Gold', threshold: '2M' },
    { key: 'DIAMOND', label: 'Diamond', threshold: '5M' }
  ];

  const activeTierIndex = tierMilestones.findIndex((m) => m.key === status.tier);

  return (
    <section
      aria-label="VIP maqom va sodiqlik kartasi"
      className={`relative overflow-hidden rounded-2xl border backdrop-blur-xl bg-[#060912]/95 bg-gradient-to-br ${tStyle.bgGradient} ${tStyle.outerBorder} ring-1 ring-inset ring-white/10 p-6 sm:p-7 text-white`}
    >
      {/* Frosted glass specular sheen & neon/gold ambient glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/[0.07] via-transparent to-transparent"
      />
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute -top-24 -right-20 w-64 h-64 rounded-full blur-3xl bg-gradient-to-tr ${tStyle.orbPrimary}`}
      />
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute -bottom-28 -left-20 w-64 h-64 rounded-full blur-3xl bg-gradient-to-tr ${tStyle.orbSecondary}`}
      />

      <div className="relative space-y-6">
        {/* Band 1: Tier Identity + Cashback Balance */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-5">
          <div className="flex items-start gap-4">
            <div
              className={`w-12 h-12 rounded-xl border backdrop-blur-md flex items-center justify-center shrink-0 ${tStyle.iconSurface}`}
            >
              {status.tier === 'DIAMOND' ? (
                <Gem size={24} />
              ) : status.tier === 'GOLD' ? (
                <Crown size={24} />
              ) : status.tier === 'SILVER' ? (
                <ShieldCheck size={24} />
              ) : (
                <Sparkles size={22} />
              )}
            </div>

            <div className="space-y-1">
              <p className="text-xs font-medium text-slate-400">
                YUYU VIP sodiqlik darajasi
              </p>
              <div className="flex flex-wrap items-center gap-2.5">
                <h2 className="font-display text-2xl font-bold tracking-tight text-white">
                  {status.tier === 'NONE' ? 'Oddiy mijoz' : status.label}
                </h2>
                <VipTierBadge tier={status.tier} size="sm" />
              </div>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-400">
                <span>Keshbek stavkasi: <strong className="text-white font-mono tabular-nums">{Math.round(status.cashbackRate * 100)}%</strong></span>
                {status.deliveryDiscountRate > 0 && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>
                      Yetkazish:{' '}
                      <strong className={tStyle.accentText}>
                        {status.deliveryDiscountRate >= 1 ? 'Bepul' : `-${Math.round(status.deliveryDiscountRate * 100)}%`}
                      </strong>
                    </span>
                  </>
                )}
                {status.hasActiveSubscription && formattedExpiry && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="inline-flex items-center gap-1 text-amber-300">
                      <Calendar size={12} />
                      <span>{formattedExpiry} gacha</span>
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Right: Cashback Balance Readout */}
          <div className="sm:text-right space-y-1 shrink-0">
            <div className="inline-flex items-center gap-1.5 text-xs text-slate-400">
              <Wallet size={13} className={tStyle.accentText} />
              <span>Keshbek balansi</span>
            </div>
            <p className={`font-mono tabular-nums text-2xl sm:text-3xl font-bold tracking-tight ${tStyle.accentText}`}>
              {status.cashbackBalance.toLocaleString()} so'm
            </p>
            <p className="text-xs text-slate-400 font-mono tabular-nums">
              Jami xarid: {status.totalSpent.toLocaleString()} so'm
            </p>
          </div>
        </div>

        {/* Band 2: Dual Progress Bars (Tier Upgrade + Cashback Balance) */}
        <div className="pt-5 border-t border-white/10 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Tier Upgrade Progress (8 cols) */}
          <div className="lg:col-span-8 space-y-2.5">
            <div className="flex flex-wrap items-baseline justify-between gap-2 text-xs">
              <span className="text-slate-200 font-medium">
                {status.nextTier
                  ? `${status.nextTier} darajasigacha yana ${status.remainingForNextTier.toLocaleString()} so'm qoldi`
                  : "Siz eng yuqori DIAMOND VIP darajasiga yetdingiz"}
              </span>
              <span className="font-mono tabular-nums text-slate-400">
                <strong className={tStyle.accentText}>{status.progressPercent}%</strong>
                {' · '}
                {status.totalSpent.toLocaleString()} / {status.nextTierThreshold.toLocaleString()} so'm
              </span>
            </div>

            <div
              role="progressbar"
              aria-label="VIP daraja progressi"
              aria-valuenow={status.progressPercent}
              aria-valuemin={0}
              aria-valuemax={100}
              className="w-full h-2.5 rounded-full bg-white/[0.08] overflow-hidden p-[2px] border border-white/10"
            >
              <div
                style={{ width: `${Math.max(4, status.progressPercent)}%` }}
                className={`h-full rounded-full bg-gradient-to-r ${tStyle.barGradient} ${tStyle.barGlow} transition-all duration-700 ease-out`}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] font-mono tabular-nums pt-0.5">
              {tierMilestones.map((m, idx) => (
                <span
                  key={m.key}
                  className={idx <= activeTierIndex ? `${tStyle.milestoneActive} font-semibold` : 'text-slate-500'}
                >
                  {m.label} · {m.threshold}
                </span>
              ))}
            </div>
          </div>

          {/* Cashback Balance Progress (4 cols) */}
          <div className="lg:col-span-4 space-y-2.5 lg:pl-6 lg:border-l lg:border-white/10">
            <div className="flex items-baseline justify-between gap-2 text-xs">
              <span className="text-slate-200 font-medium">Keshbek jamg'armasi</span>
              <span className="font-mono tabular-nums text-cyan-300 font-semibold">
                {cashbackProgress}%
              </span>
            </div>

            <div
              role="progressbar"
              aria-label="Keshbek balansi ko'rsatkichi"
              aria-valuenow={cashbackProgress}
              aria-valuemin={0}
              aria-valuemax={100}
              className="w-full h-2.5 rounded-full bg-white/[0.08] overflow-hidden p-[2px] border border-white/10"
            >
              <div
                style={{ width: `${status.cashbackBalance > 0 ? Math.max(6, cashbackProgress) : 0}%` }}
                className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-sky-300 to-amber-300 shadow-[0_0_12px_rgba(34,211,238,0.55)] transition-all duration-700 ease-out"
              />
            </div>

            <div className="flex items-center justify-between text-[11px] font-mono tabular-nums text-slate-400">
              <span>{status.cashbackBalance.toLocaleString()} so'm</span>
              <span>Maqsad: {cashbackGoal.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Band 3: Active Benefits + Primary Subscription Action */}
        <div className="pt-5 border-t border-white/10 flex flex-col md:flex-row md:items-end justify-between gap-5">
          <div className="space-y-2 flex-1">
            <p className="text-xs font-semibold text-slate-300">Faol VIP imtiyozlaringiz</p>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5">
              {status.benefits.map((b, i) => (
                <li key={i} className="flex items-center gap-2 text-xs text-slate-300">
                  <Check size={13} className={`${tStyle.accentText} shrink-0`} />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </div>

          <button
            type="button"
            data-sound="welcome"
            onClick={onOpenSubscribeModal}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-bold text-xs sm:text-sm shadow-[0_0_24px_rgba(251,191,36,0.35)] transition-all whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#060912]"
          >
            <Crown size={16} />
            <span>
              {status.hasActiveSubscription
                ? `VIP obunani uzaytirish (${VIP_MONTHLY_PRICE.toLocaleString()} so'm/oy)`
                : `VIP obuna sotib olish (${VIP_MONTHLY_PRICE.toLocaleString()} so'm/oy)`}
            </span>
          </button>
        </div>
      </div>
    </section>
  );
};

export const VipSubscribeModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  user: User;
  onSubscribed: (updatedUser: User) => void;
  notify: (msg: string, type?: 'success' | 'error' | 'info') => void;
  safeFetchJSON: (url: string, options?: RequestInit) => Promise<any>;
}> = ({ isOpen, onClose, user, onSubscribed, notify, safeFetchJSON }) => {
  const [months, setMonths] = useState<number>(1);
  const [receipt, setReceipt] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const totalPrice = VIP_MONTHLY_PRICE * months;

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      notify("Iltimos, faqat rasm faylini yuklang", 'error');
      return;
    }
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

  const handleActivate = async () => {
    if (!receipt) {
      notify("Iltimos, avval to'lov cheki rasmini yuklang", 'error');
      return;
    }
    setSubmitting(true);
    try {
      const res = await safeFetchJSON('/api/vip/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.telegramId || user.phoneNumber,
          username: user.username,
          months,
          receiptImage: receipt
        })
      });

      if (res?.success && res.user) {
        soundEngine.playWelcome();
        onSubscribed(res.user);
        notify("Tabriklaymiz! GOLD VIP obunangiz muvaffaqiyatli faollashtirildi!", 'success');
        setReceipt(null);
        onClose();
      } else {
        notify(res?.error || "VIP obunani faollashtirishda xatolik", 'error');
      }
    } catch (e: any) {
      notify(e?.message || "Server bilan bog'lanishda xatolik", 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-2xl rounded-3xl bg-[#070B14]/95 border border-amber-400/45 shadow-[0_0_60px_rgba(245,158,11,0.2)] text-white p-6 sm:p-8 space-y-6 my-8">
        {/* Close */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Yopish"
          className="absolute top-5 right-5 p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 transition-colors"
        >
          <X size={18} />
        </button>

        {/* Header */}
        <div className="space-y-2 pr-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-amber-400/15 border border-amber-400/40 text-amber-300 text-xs font-mono font-bold">
            <Crown size={14} />
            <span>GOLD VIP OBUNA</span>
          </div>
          <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">
            YUYU Shop VIP klubiga qo'shiling
          </h2>
          <p className="text-sm text-slate-400">
            Birinchi xariddanoq maxsus VIP narxlar, 5% keshbek va yetkazib berishga 50% chegirmaga ega bo'ling.
          </p>
        </div>

        {/* Benefits Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { title: "5% Kafolatlangan keshbek", desc: "Har bir yetkazilgan buyurtmadan balansingizga qaytadi" },
            { title: "Yetkazib berish 50% arzon", desc: "Barcha viloyatlar bo'ylab kuryer xizmatiga chegirma" },
            { title: "Maxsus VIP narxlar", desc: "Tanlangan tovarlarni eng arzon VIP narxda xarid qiling" },
            { title: "Eksklyuziv VIP tovarlar", desc: "Faqat VIP mijozlar uchun yopiq mahsulotlarga kirish" }
          ].map((b, idx) => (
            <div
              key={idx}
              className="p-3.5 rounded-xl bg-white/[0.04] border border-white/10 flex items-start gap-3"
            >
              <div className="w-6 h-6 rounded-lg bg-amber-400/15 text-amber-300 flex items-center justify-center shrink-0 mt-0.5">
                <Check size={14} />
              </div>
              <div>
                <p className="text-xs font-bold text-white">{b.title}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">{b.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Duration Selector */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-300">Obuna muddatini tanlang</p>
          <div className="grid grid-cols-3 gap-3">
            {[
              { m: 1, label: '1 oy', sub: '39 000 so\'m' },
              { m: 3, label: '3 oy', sub: '117 000 so\'m' },
              { m: 6, label: '6 oy', sub: '234 000 so\'m' }
            ].map((opt) => (
              <button
                key={opt.m}
                type="button"
                onClick={() => setMonths(opt.m)}
                className={`p-3 rounded-xl border text-left transition-all ${
                  months === opt.m
                    ? 'bg-amber-400/15 border-amber-400 text-white shadow-[0_0_16px_rgba(251,191,36,0.2)]'
                    : 'bg-white/[0.03] border-white/10 text-slate-400 hover:border-white/25'
                }`}
              >
                <p className="font-display font-bold text-sm text-white">{opt.label}</p>
                <p className="font-mono text-xs text-amber-300 mt-0.5">{opt.sub}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Payment Card + Receipt */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-2xl bg-gradient-to-br from-[#0F294A] to-[#0B172B] border border-cyan-400/30 space-y-3">
            <div className="flex items-center justify-between text-xs text-cyan-200">
              <span>To'lov kartasi (UZCARD)</span>
              <span className="font-mono font-bold text-amber-300">
                {totalPrice.toLocaleString()} so'm
              </span>
            </div>
            <p className="font-mono text-base font-bold tracking-wider text-white">{CARD_NUMBER}</p>
            <div className="flex items-center justify-between pt-2 border-t border-white/10">
              <span className="text-xs text-slate-300">{CARD_OWNER}</span>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(CARD_NUMBER);
                  notify("Karta raqami nusxalandi", 'success');
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-[11px] font-semibold"
              >
                <Copy size={12} />
                <span>Nusxalash</span>
              </button>
            </div>
          </div>

          <label className="flex flex-col items-center justify-center p-4 rounded-2xl border-2 border-dashed border-white/20 hover:border-amber-400/60 bg-white/[0.03] cursor-pointer transition-colors min-h-[132px] relative overflow-hidden">
            {receipt ? (
              <img src={receipt} alt="VIP to'lov cheki" className="absolute inset-0 w-full h-full object-contain bg-black/60" />
            ) : (
              <div className="text-center space-y-1.5">
                <UploadCloud size={24} className="mx-auto text-amber-300" />
                <p className="text-xs font-semibold text-white">To'lov chekini yuklang</p>
                <p className="text-[11px] text-slate-400">PNG, JPG skrinshot</p>
              </div>
            )}
            <input type="file" accept="image/*" className="hidden" onChange={handleFile} />
          </label>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row justify-end gap-3 pt-2 border-t border-white/10">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-3 rounded-xl border border-white/15 text-slate-300 hover:bg-white/5 text-sm font-semibold transition-colors"
          >
            Bekor qilish
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={handleActivate}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 shadow-[0_0_24px_rgba(251,191,36,0.35)] disabled:opacity-60 transition-all"
          >
            {submitting ? <Loader2 size={16} className="animate-spin" /> : <Crown size={16} />}
            <span>VIP obunani faollashtirish ({totalPrice.toLocaleString()} so'm)</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export const CartSavingsNudge: React.FC<{
  cart: any[];
  user?: User | null;
  onOpenSubscribeModal: () => void;
}> = ({ cart, user, onOpenSubscribeModal }) => {
  const vipInfo = getEffectiveVipStatus(user);
  if (vipInfo.tier !== 'NONE' || !cart || cart.length === 0) return null;

  const { priceSavings, cashbackEarned, totalSavings } = calculateGoldSavingsForCart(cart);
  if (totalSavings <= 0) return null;

  return (
    <div className="relative overflow-hidden rounded-2xl bg-[#070B14] border border-amber-400/50 shadow-[0_0_30px_rgba(251,191,36,0.16)] p-5 text-white">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-12 -top-12 w-40 h-40 rounded-full bg-amber-400/20 blur-3xl"
      />
      <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-amber-400/15 border border-amber-400/40 text-amber-300 flex items-center justify-center shrink-0">
            <Crown size={20} />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium leading-relaxed text-slate-100">
              Agar <span className="font-bold text-amber-300">GOLD VIP</span> bo'lganingizda, bu xariddan{' '}
              <span className="font-mono font-bold text-amber-300">
                {totalSavings.toLocaleString()} so'm
              </span>{' '}
              keshbek va chegirma olgan bo'lardingiz!
            </p>
            <p className="text-xs text-slate-400 font-mono">
              {priceSavings > 0 && `VIP chegirma: ${priceSavings.toLocaleString()} so'm · `}
              5% keshbek: {cashbackEarned.toLocaleString()} so'm · Yetkazish 50% arzon
            </p>
          </div>
        </div>

        <button
          type="button"
          data-sound="welcome"
          onClick={onOpenSubscribeModal}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-slate-950 font-bold text-xs whitespace-nowrap shrink-0 shadow-[0_0_20px_rgba(251,191,36,0.3)] transition-all cursor-pointer"
        >
          <span>VIP bo'lish</span>
          <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
};

export const AdminVipManagementView: React.FC<{
  adminUser: User;
  users: User[];
  onUsersUpdated: (updatedUser: User) => void;
  onBack: () => void;
  notify: (msg: string, type?: 'success' | 'error' | 'info') => void;
  safeFetchJSON: (url: string, options?: RequestInit) => Promise<any>;
}> = ({ adminUser, users, onUsersUpdated, onBack, notify, safeFetchJSON }) => {
  const [tierFilter, setTierFilter] = useState<'ALL' | 'VIP_ONLY' | 'SILVER' | 'GOLD' | 'DIAMOND' | 'SUBSCRIBED'>('VIP_ONLY');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [overviewStats, setOverviewStats] = useState<{
    totalVipUsers: number;
    subscribedCount: number;
    totalCashbackDistributed: number;
    currentCashbackPool: number;
    tierCounts: { NONE: number; SILVER: number; GOLD: number; DIAMOND: number };
  } | null>(null);
  const [vipRequests, setVipRequests] = useState<any[]>([]);
  const [loadingOverview, setLoadingOverview] = useState(false);

  // Edit form state
  const [editTier, setEditTier] = useState<VipTier>('NONE');
  const [editSubscribed, setEditSubscribed] = useState(false);
  const [editExpiresDate, setEditExpiresDate] = useState('');
  const [cashbackAdjustAmount, setCashbackAdjustAmount] = useState('');
  const [savingUser, setSavingUser] = useState(false);

  const loadOverview = async () => {
    setLoadingOverview(true);
    try {
      const res = await safeFetchJSON('/api/admin/vip/overview');
      if (res?.success) {
        setOverviewStats(res.stats);
        setVipRequests(Array.isArray(res.vipRequests) ? res.vipRequests : []);
      }
    } catch {
      // fallback computed locally below
    } finally {
      setLoadingOverview(false);
    }
  };

  useEffect(() => {
    loadOverview();
  }, []);

  const enrichedUsers = useMemo(() => {
    return users.map((u) => ({
      user: u,
      vip: getEffectiveVipStatus(u)
    }));
  }, [users]);

  const localStats = useMemo(() => {
    const tierCounts = { NONE: 0, SILVER: 0, GOLD: 0, DIAMOND: 0 };
    let subscribedCount = 0;
    let currentCashbackPool = 0;
    for (const item of enrichedUsers) {
      tierCounts[item.vip.tier]++;
      if (item.vip.hasActiveSubscription) subscribedCount++;
      currentCashbackPool += item.vip.cashbackBalance;
    }
    return {
      totalVipUsers: tierCounts.SILVER + tierCounts.GOLD + tierCounts.DIAMOND,
      subscribedCount,
      totalCashbackDistributed: overviewStats?.totalCashbackDistributed ?? currentCashbackPool,
      currentCashbackPool,
      tierCounts
    };
  }, [enrichedUsers, overviewStats]);

  const stats = overviewStats || localStats;

  const filteredUsers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return enrichedUsers.filter(({ user, vip }) => {
      if (q) {
        const phoneMatch = (user.phoneNumber || '').toLowerCase().includes(q);
        const tgMatch = (user.telegramId || '').toLowerCase().includes(q);
        const nameMatch = (user.username || '').toLowerCase().includes(q);
        if (!phoneMatch && !tgMatch && !nameMatch) return false;
      }
      if (tierFilter === 'ALL') return true;
      if (tierFilter === 'VIP_ONLY') return vip.isVip;
      if (tierFilter === 'SUBSCRIBED') return vip.hasActiveSubscription;
      return vip.tier === tierFilter;
    });
  }, [enrichedUsers, tierFilter, searchQuery]);

  const selectedEntry = useMemo(
    () =>
      enrichedUsers.find(
        (item) => (item.user.telegramId || item.user.phoneNumber) === selectedUserId
      ) || null,
    [enrichedUsers, selectedUserId]
  );

  const selectUserForEdit = (u: User) => {
    const vip = getEffectiveVipStatus(u);
    setSelectedUserId(u.telegramId || u.phoneNumber || null);
    setEditTier(vip.tier);
    setEditSubscribed(Boolean(u.isSubscribedVip));
    setEditExpiresDate(
      u.vipExpiresAt ? new Date(u.vipExpiresAt).toISOString().split('T')[0] : ''
    );
    setCashbackAdjustAmount('');
  };

  const applyVipPatch = async (payload: Record<string, any>, successMsg: string) => {
    if (!selectedEntry) return;
    setSavingUser(true);
    try {
      const targetUserId = selectedEntry.user.telegramId || selectedEntry.user.phoneNumber;
      const res = await safeFetchJSON('/api/admin/vip/user', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminId: adminUser.telegramId || adminUser.phoneNumber,
          targetUserId,
          ...payload
        })
      });
      if (res?.success && res.user) {
        onUsersUpdated(res.user);
        notify(successMsg, 'success');
        loadOverview();
      } else {
        notify(res?.error || "Yangilashda xatolik", 'error');
      }
    } catch (e: any) {
      notify(e?.message || "Server xatosi", 'error');
    } finally {
      setSavingUser(false);
    }
  };

  const handleSaveTierAndSub = () => {
    const isoExp =
      editSubscribed && editExpiresDate
        ? new Date(`${editExpiresDate}T23:59:59.000Z`).toISOString()
        : editSubscribed
        ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        : null;
    applyVipPatch(
      {
        vipTier: editTier,
        isSubscribedVip: editSubscribed,
        vipExpiresAt: isoExp
      },
      "Foydalanuvchi VIP maqomi saqlandi"
    );
  };

  const handleCashbackDelta = (sign: 1 | -1) => {
    const amt = Math.round(Number(cashbackAdjustAmount) || 0);
    if (amt <= 0) {
      notify("Iltimos, musbat summa kiriting", 'error');
      return;
    }
    applyVipPatch(
      { cashbackDelta: sign * amt },
      sign > 0
        ? `+${amt.toLocaleString()} so'm keshbek qo'shildi`
        : `-${amt.toLocaleString()} so'm keshbek ayirildi`
    );
    setCashbackAdjustAmount('');
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3.5">
          <button
            type="button"
            onClick={onBack}
            className="p-2.5 yuyu-glass-subtle rounded-xl hover:bg-white/85 dark:hover:bg-slate-800/80 transition-colors"
          >
            <ChevronLeft size={18} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <Crown size={22} className="text-amber-500" />
              <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                VIP Boshqaruv
              </h1>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              VIP darajalar, pullik obunalar va mijozlar keshbek balansini boshqarish
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={loadOverview}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl yuyu-glass-subtle text-xs font-semibold hover:bg-white/85 dark:hover:bg-slate-800/80 transition-colors"
        >
          <RefreshCw size={14} className={loadingOverview ? 'animate-spin' : ''} />
          <span>Yangilash</span>
        </button>
      </div>

      {/* AMOLED Glassmorphic KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl bg-[#070B14] border border-amber-400/40 p-5 text-white space-y-2 shadow-[0_0_24px_rgba(251,191,36,0.12)]">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Jami VIP mijozlar</span>
            <Crown size={16} className="text-amber-400" />
          </div>
          <p className="font-mono tabular-nums text-3xl font-bold text-amber-300">
            {stats.totalVipUsers}
          </p>
          <p className="text-[11px] font-mono text-slate-400">
            S: {stats.tierCounts.SILVER} · G: {stats.tierCounts.GOLD} · D: {stats.tierCounts.DIAMOND}
          </p>
        </div>

        <div className="rounded-2xl bg-[#070B14] border border-cyan-400/40 p-5 text-white space-y-2 shadow-[0_0_24px_rgba(34,211,238,0.12)]">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Faol pullik obunalar</span>
            <Award size={16} className="text-cyan-400" />
          </div>
          <p className="font-mono tabular-nums text-3xl font-bold text-cyan-300">
            {stats.subscribedCount}
          </p>
          <p className="text-[11px] text-slate-400">39 000 so'm / oy tarifida</p>
        </div>

        <div className="rounded-2xl bg-[#070B14] border border-purple-400/40 p-5 text-white space-y-2 shadow-[0_0_24px_rgba(192,132,252,0.12)]">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Tarqatilgan keshbek</span>
            <Wallet size={16} className="text-purple-400" />
          </div>
          <p className="font-mono tabular-nums text-2xl sm:text-3xl font-bold text-purple-300">
            {stats.totalCashbackDistributed.toLocaleString()}
          </p>
          <p className="text-[11px] text-slate-400">Jami hisoblangan (UZS)</p>
        </div>

        <div className="rounded-2xl bg-[#070B14] border border-slate-700/80 p-5 text-white space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Barcha foydalanuvchilar</span>
            <Users size={16} className="text-slate-300" />
          </div>
          <p className="font-mono tabular-nums text-3xl font-bold text-white">{users.length}</p>
          <p className="text-[11px] text-slate-400">
            Joriy keshbek fondi: {stats.currentCashbackPool.toLocaleString()} so'm
          </p>
        </div>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="yuyu-glass p-5 rounded-3xl flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: 'ALL', label: 'Barchasi' },
            { id: 'VIP_ONLY', label: 'Faqat VIP' },
            { id: 'SILVER', label: 'SILVER' },
            { id: 'GOLD', label: 'GOLD' },
            { id: 'DIAMOND', label: 'DIAMOND' },
            { id: 'SUBSCRIBED', label: 'Obunachilar' }
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setTierFilter(tab.id as any)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap ${
                tierFilter === tab.id
                  ? 'bg-[#0F294A] dark:bg-amber-400 text-white dark:text-slate-950'
                  : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full lg:w-80">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Telefon raqam yoki ism bo'yicha qidirish..."
            className="w-full yuyu-glass-input rounded-xl py-2.5 pl-10 pr-4 text-sm outline-none focus:border-[#0F294A] dark:focus:border-amber-400"
          />
        </div>
      </div>

      {/* Main Split: User List + Manual VIP Editor */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 7 cols: User list */}
        <div className="lg:col-span-7 space-y-3">
          {filteredUsers.length === 0 ? (
            <div className="yuyu-glass rounded-3xl py-16 text-center space-y-2">
              <Crown size={32} className="mx-auto text-slate-300 dark:text-slate-600" />
              <p className="text-sm text-slate-500">Tanlangan filtr bo'yicha foydalanuvchi topilmadi.</p>
              {tierFilter !== 'ALL' && (
                <button
                  type="button"
                  onClick={() => setTierFilter('ALL')}
                  className="text-xs font-semibold text-[#0F294A] dark:text-amber-400 hover:underline"
                >
                  Barcha foydalanuvchilarni ko'rsatish
                </button>
              )}
            </div>
          ) : (
            filteredUsers.map(({ user, vip }) => {
              const uid = user.telegramId || user.phoneNumber || '';
              const isSelected = uid === selectedUserId;
              return (
                <button
                  key={uid}
                  type="button"
                  onClick={() => selectUserForEdit(user)}
                  className={`w-full text-left p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                    isSelected
                      ? 'bg-[#070B14] text-white border-amber-400 shadow-[0_0_24px_rgba(251,191,36,0.18)]'
                      : 'yuyu-glass hover:border-amber-400/60'
                  }`}
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`font-display font-bold text-sm truncate ${
                          isSelected ? 'text-white' : 'text-slate-900 dark:text-white'
                        }`}
                      >
                        {user.username}
                      </span>
                      <VipTierBadge tier={vip.tier} size="sm" showNone />
                      {vip.hasActiveSubscription && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-400/40">
                          OBUNA
                        </span>
                      )}
                    </div>
                    <p
                      className={`text-xs font-mono ${
                        isSelected ? 'text-slate-300' : 'text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      {user.phoneNumber || user.telegramId}
                    </p>
                  </div>

                  <div className="flex items-center gap-5 shrink-0 text-right font-mono tabular-nums">
                    <div>
                      <p className={`text-[10px] ${isSelected ? 'text-slate-400' : 'text-slate-400'}`}>
                        Jami xarid
                      </p>
                      <p className={`text-xs font-bold ${isSelected ? 'text-white' : 'text-slate-800 dark:text-slate-200'}`}>
                        {vip.totalSpent.toLocaleString()} so'm
                      </p>
                    </div>
                    <div>
                      <p className={`text-[10px] ${isSelected ? 'text-slate-400' : 'text-slate-400'}`}>
                        Keshbek
                      </p>
                      <p className="text-xs font-bold text-amber-500 dark:text-amber-300">
                        {vip.cashbackBalance.toLocaleString()} so'm
                      </p>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Right 5 cols: Manual Control Panel */}
        <aside className="lg:col-span-5 lg:sticky lg:top-24 rounded-2xl bg-[#070B14] border border-amber-400/40 text-white p-6 space-y-6 shadow-[0_0_32px_rgba(251,191,36,0.1)]">
          {!selectedEntry ? (
            <div className="py-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-400/15 border border-amber-400/30 text-amber-300 flex items-center justify-center mx-auto">
                <Crown size={22} />
              </div>
              <h3 className="font-display font-bold text-base">Foydalanuvchini tanlang</h3>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                Chap ro'yxatdan mijozni tanlang yoki telefon raqami bo'yicha qidiring — uning VIP darajasini, obunasini va keshbek balansini qo'lda boshqaring.
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-start justify-between gap-3 pb-4 border-b border-white/10">
                <div>
                  <h3 className="font-display text-lg font-bold text-white">
                    {selectedEntry.user.username}
                  </h3>
                  <p className="text-xs font-mono text-slate-400">
                    {selectedEntry.user.phoneNumber || selectedEntry.user.telegramId}
                  </p>
                </div>
                <VipTierBadge tier={selectedEntry.vip.tier} size="md" showNone />
              </div>

              {/* Tier Selector */}
              <div className="space-y-2.5">
                <label className="text-xs font-semibold text-slate-300">VIP darajani o'zgartirish</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['NONE', 'SILVER', 'GOLD', 'DIAMOND'] as VipTier[]).map((tier) => (
                    <button
                      key={tier}
                      type="button"
                      onClick={() => setEditTier(tier)}
                      className={`py-2.5 px-3 rounded-xl text-xs font-mono font-bold border transition-all ${
                        editTier === tier
                          ? tier === 'DIAMOND'
                            ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200'
                            : tier === 'GOLD'
                            ? 'bg-amber-400/20 border-amber-400 text-amber-200'
                            : 'bg-white/15 border-white/50 text-white'
                          : 'bg-white/[0.03] border-white/10 text-slate-400 hover:border-white/25'
                      }`}
                    >
                      {tier === 'NONE' ? 'ODDIY (NONE)' : tier}
                    </button>
                  ))}
                </div>
              </div>

              {/* Paid Subscription Controls */}
              <div className="p-4 rounded-xl bg-white/[0.04] border border-white/10 space-y-3">
                <label className="flex items-center justify-between gap-3 cursor-pointer">
                  <div>
                    <p className="text-xs font-bold text-white">Pullik VIP obuna (isSubscribedVip)</p>
                    <p className="text-[11px] text-slate-400">Faol obuna avtomatik GOLD imtiyozlarini beradi</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={editSubscribed}
                    onChange={(e) => {
                      const next = e.target.checked;
                      setEditSubscribed(next);
                      if (next && !editExpiresDate) {
                        const d = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
                        setEditExpiresDate(d.toISOString().split('T')[0]);
                      }
                    }}
                    className="w-5 h-5 accent-amber-400"
                  />
                </label>

                {editSubscribed && (
                  <div className="space-y-1.5 pt-2 border-t border-white/10">
                    <label className="text-[11px] text-slate-400">Amal qilish muddati (vipExpiresAt)</label>
                    <input
                      type="date"
                      value={editExpiresDate}
                      onChange={(e) => setEditExpiresDate(e.target.value)}
                      className="w-full bg-slate-900 border border-white/15 rounded-xl px-3.5 py-2 text-xs font-mono text-white outline-none focus:border-amber-400"
                    />
                  </div>
                )}
              </div>

              <button
                type="button"
                disabled={savingUser}
                onClick={handleSaveTierAndSub}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 disabled:opacity-60 transition-all"
              >
                {savingUser ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                <span>Daraja va obunani saqlash</span>
              </button>

              {/* Cashback Balance Manual Controls */}
              <div className="pt-5 border-t border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-300">Keshbek balansi</span>
                  <span className="font-mono font-bold text-base text-amber-300">
                    {selectedEntry.vip.cashbackBalance.toLocaleString()} so'm
                  </span>
                </div>

                <input
                  type="number"
                  value={cashbackAdjustAmount}
                  onChange={(e) => setCashbackAdjustAmount(e.target.value)}
                  placeholder="Summa (so'm), masalan: 25000"
                  className="w-full bg-slate-900 border border-white/15 rounded-xl px-4 py-2.5 text-sm font-mono text-white outline-none focus:border-cyan-400"
                />

                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    disabled={savingUser}
                    onClick={() => handleCashbackDelta(1)}
                    className="py-2.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/40 text-emerald-300 text-xs font-bold flex items-center justify-center gap-1.5"
                  >
                    <Plus size={14} />
                    <span>Qo'shish</span>
                  </button>
                  <button
                    type="button"
                    disabled={savingUser}
                    onClick={() => handleCashbackDelta(-1)}
                    className="py-2.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 border border-red-400/40 text-red-300 text-xs font-bold flex items-center justify-center gap-1.5"
                  >
                    <Minus size={14} />
                    <span>Ayirish</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </aside>
      </div>

      {/* Recent VIP Subscriptions Log */}
      {vipRequests.length > 0 && (
        <section className="yuyu-glass p-6 rounded-3xl space-y-4">
          <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
            So'nggi VIP obuna to'lovlari ({vipRequests.length})
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500">
                  <th className="py-2.5 pr-4">Mijoz</th>
                  <th className="py-2.5 pr-4">Telefon</th>
                  <th className="py-2.5 pr-4">Muddat</th>
                  <th className="py-2.5 pr-4">Summa</th>
                  <th className="py-2.5">Amal qilish muddati</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {vipRequests.slice(0, 10).map((req) => (
                  <tr key={req.id}>
                    <td className="py-3 pr-4 font-semibold text-slate-900 dark:text-white">
                      {req.username}
                    </td>
                    <td className="py-3 pr-4 font-mono text-slate-600 dark:text-slate-300">
                      {req.phoneNumber || req.userId}
                    </td>
                    <td className="py-3 pr-4">{req.months || 1} oy</td>
                    <td className="py-3 pr-4 font-mono font-bold text-amber-600 dark:text-amber-400">
                      {(Number(req.amount) || VIP_MONTHLY_PRICE).toLocaleString()} so'm
                    </td>
                    <td className="py-3 font-mono text-slate-500">
                      {req.expiresAt ? new Date(req.expiresAt).toLocaleDateString('uz-UZ') : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
};
