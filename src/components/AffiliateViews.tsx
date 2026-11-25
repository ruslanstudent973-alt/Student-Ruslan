import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp,
  Wallet,
  Clock,
  MousePointerClick,
  ShoppingBag,
  Copy,
  Check,
  Link2,
  Search,
  CreditCard,
  Award,
  Sparkles,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Edit3,
  RotateCcw,
  Send,
  Users,
  Percent
} from 'lucide-react';
import {
  AffiliateProfile,
  AffiliateCommission,
  AffiliatePayout,
  Product,
  User
} from '../types';
import { MARKUP_RATE, CURRENCY_RATE } from '../constants';
import { SafeImage } from './YuyuPrimitives';
import { GlassReveal, StaggerGrid, StaggerItem } from './GlassMotionPrimitives';

const MIN_PAYOUT_UZS = 50000;

function formatCardInput(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 16);
  return digits.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
}

function formatDateUz(ts?: number | null): string {
  if (!ts) return '—';
  try {
    return new Date(ts).toLocaleDateString('uz-UZ', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  } catch {
    return new Date(ts).toLocaleDateString();
  }
}

/* ============================================================================
 * 1. USER CABINET: «YUYU HAMKOR» (AFFILIATE / BLOGGERS CABINET)
 * ========================================================================== */
interface AffiliateCabinetViewProps {
  user: User;
  products: Product[];
  onBack: () => void;
  notify: (msg: string, type?: 'success' | 'error' | 'info') => void;
  safeFetchJSON: (url: string, options?: RequestInit) => Promise<any>;
}

export const AffiliateCabinetView: React.FC<AffiliateCabinetViewProps> = ({
  user,
  products,
  onBack,
  notify,
  safeFetchJSON
}) => {
  const userId = user.telegramId || user.phoneNumber || '';
  const [loading, setLoading] = useState(true);
  const [activated, setActivated] = useState(false);
  const [profile, setProfile] = useState<AffiliateProfile | null>(null);
  const [commissions, setCommissions] = useState<AffiliateCommission[]>([]);
  const [payouts, setPayouts] = useState<AffiliatePayout[]>([]);

  // Activation / refCode edit state
  const [customCodeInput, setCustomCodeInput] = useState('');
  const [activating, setActivating] = useState(false);
  const [editingCode, setEditingCode] = useState(false);

  // Copy states
  const [copiedMain, setCopiedMain] = useState(false);
  const [copiedProduct, setCopiedProduct] = useState(false);

  // Product link generator state
  const [productSearch, setProductSearch] = useState('');
  const [selectedProductId, setSelectedProductId] = useState<string>('');

  // Payout form state
  const [payoutCard, setPayoutCard] = useState('');
  const [payoutHolder, setPayoutHolder] = useState(user.username || '');
  const [payoutAmount, setPayoutAmount] = useState('');
  const [submittingPayout, setSubmittingPayout] = useState(false);

  // History tab
  const [historyTab, setHistoryTab] = useState<'commissions' | 'payouts'>('commissions');

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://yuyu-shop.uz';

  const loadDashboard = async () => {
    if (!userId) return;
    try {
      setLoading(true);
      const res = await safeFetchJSON(`/api/affiliate/profile/${encodeURIComponent(userId)}`);
      if (res?.success) {
        setActivated(Boolean(res.activated));
        setProfile(res.profile || null);
        setCommissions(Array.isArray(res.commissions) ? res.commissions : []);
        setPayouts(Array.isArray(res.payouts) ? res.payouts : []);
        if (res.profile?.refCode) {
          setCustomCodeInput(res.profile.refCode);
        }
      }
    } catch (err: any) {
      notify(err?.message || "Hamkorlik ma'lumotlarini yuklashda xatolik", 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, [userId]);

  useEffect(() => {
    if (!selectedProductId && products.length > 0) {
      setSelectedProductId(products[0].id);
    }
  }, [products, selectedProductId]);

  const handleActivateOrUpdateCode = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!userId) return;
    try {
      setActivating(true);
      const res = await safeFetchJSON('/api/affiliate/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          customCode: customCodeInput.trim() || undefined
        })
      });
      if (res?.success && res.profile) {
        const wasActivated = activated;
        setActivated(true);
        setProfile(res.profile);
        setCustomCodeInput(res.profile.refCode);
        setEditingCode(false);
        notify(
          wasActivated
            ? `Referral kodingiz yangilandi: ${res.profile.refCode}`
            : `Tabriklaymiz! Hamkorlik kabinetingiz faollashdi (${res.profile.refCode})`,
          'success'
        );
      }
    } catch (err: any) {
      notify(err?.message || "Hamkorlik kodini saqlashda xatolik", 'error');
    } finally {
      setActivating(false);
    }
  };

  const handleCopyText = (text: string, which: 'main' | 'product') => {
    navigator.clipboard.writeText(text);
    if (which === 'main') {
      setCopiedMain(true);
      setTimeout(() => setCopiedMain(false), 2000);
    } else {
      setCopiedProduct(true);
      setTimeout(() => setCopiedProduct(false), 2000);
    }
    notify('Hamkorlik havolasi nusxalandi!', 'success');
  };

  const handlePayoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    const numericAmount = Math.round(Number(payoutAmount) || 0);
    const digits = payoutCard.replace(/\D/g, '');
    if (numericAmount < MIN_PAYOUT_UZS) {
      notify(`Minimal pul yechish summasi ${MIN_PAYOUT_UZS.toLocaleString()} so‘m`, 'error');
      return;
    }
    if (numericAmount > profile.availableBalance) {
      notify("Yechib olishga tayyor balansingizda yetarli mablag‘ yo‘q", 'error');
      return;
    }
    if (digits.length !== 16) {
      notify('Uzcard yoki Humo karta raqami 16 xonali bo‘lishi kerak', 'error');
      return;
    }
    if (payoutHolder.trim().length < 3) {
      notify('Karta egasining ism-familiyasini kiriting', 'error');
      return;
    }

    try {
      setSubmittingPayout(true);
      const res = await safeFetchJSON('/api/affiliate/payout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          amount: numericAmount,
          cardNumber: digits,
          cardHolderName: payoutHolder.trim()
        })
      });
      if (res?.success) {
        if (res.profile) setProfile(res.profile);
        if (res.payout) setPayouts((prev) => [res.payout, ...prev]);
        setPayoutAmount('');
        notify("Pul yechish so‘rovingiz qabul qilindi! Admin tekshirib kartangizga o‘tkazadi.", 'success');
      }
    } catch (err: any) {
      notify(err?.message || "Pul yechish so'rovida xatolik yuz berdi", 'error');
    } finally {
      setSubmittingPayout(false);
    }
  };

  const matchingProducts = useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    if (!q) return products.slice(0, 12);
    return products
      .filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.category || '').toLowerCase().includes(q)
      )
      .slice(0, 12);
  }, [products, productSearch]);

  const selectedProduct = useMemo(
    () => products.find((p) => p.id === selectedProductId) || matchingProducts[0] || null,
    [products, selectedProductId, matchingProducts]
  );

  const mainLink = profile ? `${origin}/?ref=${encodeURIComponent(profile.refCode)}` : '';
  const productLink =
    profile && selectedProduct
      ? `${origin}/product/${encodeURIComponent(selectedProduct.id)}?ref=${encodeURIComponent(profile.refCode)}`
      : '';

  const selectedProductPriceUzs = selectedProduct
    ? Math.round(selectedProduct.pinduoduoPrice * MARKUP_RATE * CURRENCY_RATE)
    : 0;
  const estProductCommission =
    profile && selectedProductPriceUzs > 0
      ? Math.round((selectedProductPriceUzs * profile.commissionRate) / 100)
      : 0;

  // Tier progress calculation
  const tierProgress = useMemo(() => {
    if (!profile) return { pct: 0, text: '', nextLabel: '' };
    const orders = profile.totalOrders || 0;
    const rate = profile.commissionRate || 5;
    if (orders < 10) {
      const rem = 10 - orders;
      return {
        pct: Math.min(100, Math.round((orders / 10) * 100)),
        text: `Hozir ${rate}% — 7% ga chiqish uchun yana ${rem} ta sotuv qoldi`,
        nextLabel: `${orders} / 10 sotuv`
      };
    }
    if (orders < 30) {
      const rem = 30 - orders;
      return {
        pct: Math.min(100, Math.round(((orders - 10) / 20) * 100)),
        text: `Hozir ${rate}% — 10% ga chiqish uchun yana ${rem} ta sotuv qoldi`,
        nextLabel: `${orders} / 30 sotuv`
      };
    }
    return {
      pct: 100,
      text: `Maksimal ${rate}% VIP Hamkor darajasidasiz! Har bir sotuvdan eng yuqori ulush olasiz.`,
      nextLabel: `${orders}+ sotuv`
    };
  }, [profile]);

  const conversionRate =
    profile && profile.totalClicks > 0
      ? ((profile.totalOrders / profile.totalClicks) * 100).toFixed(1)
      : '0.0';

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-slate-200/70 dark:border-slate-800/70">
        <div className="flex items-center gap-3.5">
          <motion.button
            type="button"
            whileHover={{ x: -2 }}
            whileTap={{ scale: 0.94 }}
            onClick={onBack}
            className="p-2.5 yuyu-glass-subtle rounded-xl hover:bg-white/85 dark:hover:bg-slate-800/80 transition-colors"
          >
            <ArrowLeft size={18} />
          </motion.button>
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
              YUYU Hamkor — Pul ishlash kabineti
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Shaxsiy havola ulashing va har bir muvaffaqiyatli xariddan 5%–10% real pul ishlang
            </p>
          </div>
        </div>
        {activated && profile && (
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl yuyu-glass-subtle border text-xs font-mono font-bold text-[#0F294A] dark:text-blue-400">
            <Award size={15} />
            <span>KOD: {profile.refCode}</span>
            <span className="text-slate-400">·</span>
            <span className="text-emerald-600 dark:text-emerald-400">{profile.commissionRate}%</span>
          </div>
        )}
      </div>

      {loading ? (
        <div className="yuyu-glass rounded-3xl py-20 text-center text-sm text-slate-500">
          Hamkorlik kabineti yuklanmoqda...
        </div>
      ) : !activated || !profile ? (
        /* ================= ONBOARDING (1-CLICK ACTIVATE) ================= */
        <GlassReveal>
          <div className="yuyu-glass-strong rounded-3xl p-7 sm:p-10 max-w-3xl mx-auto space-y-8">
            <div className="space-y-3 text-center">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-[#0F294A] dark:bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-950/20">
                <TrendingUp size={26} />
              </div>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
                Blogerlar, Reels montajchilari va mijozlar uchun real daromad
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 max-w-xl mx-auto leading-relaxed">
                O‘zingizning shaxsiy referral havolangizni oling va Instagram Reels, Telegram kanal yoki do‘stlaringizga ulashing. Havolangiz orqali 30 kun ichida qilingan har bir yetkazilgan buyurtmadan avtomatik pul olasiz.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="yuyu-glass-subtle p-5 rounded-2xl space-y-1.5 text-center">
                <p className="font-mono tabular-nums text-2xl font-bold text-[#0F294A] dark:text-blue-400">5%</p>
                <p className="text-xs font-semibold text-slate-900 dark:text-white">Boshlang‘ich daraja</p>
                <p className="text-[11px] text-slate-500">0–9 ta tasdiqlangan sotuv</p>
              </div>
              <div className="yuyu-glass-subtle p-5 rounded-2xl space-y-1.5 text-center border border-blue-400/40">
                <p className="font-mono tabular-nums text-2xl font-bold text-blue-600 dark:text-blue-400">7%</p>
                <p className="text-xs font-semibold text-slate-900 dark:text-white">Faol Hamkor</p>
                <p className="text-[11px] text-slate-500">10–29 ta tasdiqlangan sotuv</p>
              </div>
              <div className="yuyu-glass-subtle p-5 rounded-2xl space-y-1.5 text-center border border-emerald-400/40">
                <p className="font-mono tabular-nums text-2xl font-bold text-emerald-600 dark:text-emerald-400">10%</p>
                <p className="text-xs font-semibold text-slate-900 dark:text-white">VIP Bloger</p>
                <p className="text-[11px] text-slate-500">30+ tasdiqlangan sotuv</p>
              </div>
            </div>

            <form onSubmit={handleActivateOrUpdateCode} className="space-y-4 max-w-md mx-auto">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Shaxsiy referral kodingiz (ixtiyoriy, bo‘sh qoldirsangiz avtomatik yaratiladi)
                </label>
                <input
                  type="text"
                  value={customCodeInput}
                  onChange={(e) =>
                    setCustomCodeInput(e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, '').slice(0, 20))
                  }
                  placeholder="Masalan: YUYU77 yoki ALI_SHOP"
                  className="w-full px-4 py-3 rounded-xl yuyu-glass-input border font-mono text-sm uppercase text-slate-900 dark:text-white outline-none focus:border-[#2563EB]"
                />
              </div>
              <motion.button
                type="submit"
                disabled={activating}
                whileHover={{ y: -2, scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                className="w-full py-3.5 px-6 rounded-xl bg-[#0F294A] hover:bg-[#163A66] dark:bg-blue-600 dark:hover:bg-blue-500 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-950/20 disabled:opacity-60"
              >
                <Sparkles size={17} />
                <span>{activating ? 'Faollashtirilmoqda...' : 'Hamkor bo‘lish'}</span>
              </motion.button>
            </form>
          </div>
        </GlassReveal>
      ) : (
        /* ================= ACTIVE AFFILIATE DASHBOARD ================= */
        <div className="space-y-8">
          {/* 5 KPI Cards */}
          <StaggerGrid className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <StaggerItem>
              <div className="bg-gradient-to-br from-[#0F294A] via-[#133560] to-[#0B1F3B] border border-white/15 shadow-[0_18px_36px_rgba(15,41,74,0.22)] text-white p-5 rounded-3xl space-y-2 h-full">
                <div className="flex items-center justify-between text-blue-200">
                  <span className="text-xs font-medium">Yechib olishga tayyor</span>
                  <Wallet size={16} />
                </div>
                <p className="font-mono tabular-nums text-2xl font-bold">
                  {profile.availableBalance.toLocaleString()}
                </p>
                <p className="text-[11px] text-blue-200/80">so‘m · Uzcard / Humo</p>
              </div>
            </StaggerItem>

            <StaggerItem>
              <div className="yuyu-glass p-5 rounded-3xl space-y-2 h-full">
                <div className="flex items-center justify-between text-amber-600 dark:text-amber-400">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Kutilayotgan daromad</span>
                  <Clock size={16} />
                </div>
                <p className="font-mono tabular-nums text-2xl font-bold text-slate-900 dark:text-white">
                  {profile.pendingBalance.toLocaleString()}
                </p>
                <p className="text-[11px] text-slate-500">Yetkazilgach balansga o‘tadi</p>
              </div>
            </StaggerItem>

            <StaggerItem>
              <div className="yuyu-glass p-5 rounded-3xl space-y-2 h-full">
                <div className="flex items-center justify-between text-blue-600 dark:text-blue-400">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Jami o‘tishlar</span>
                  <MousePointerClick size={16} />
                </div>
                <p className="font-mono tabular-nums text-2xl font-bold text-slate-900 dark:text-white">
                  {profile.totalClicks.toLocaleString()}
                </p>
                <p className="text-[11px] text-slate-500">Havola bosilishlari</p>
              </div>
            </StaggerItem>

            <StaggerItem>
              <div className="yuyu-glass p-5 rounded-3xl space-y-2 h-full">
                <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Sotuvlar soni</span>
                  <ShoppingBag size={16} />
                </div>
                <p className="font-mono tabular-nums text-2xl font-bold text-slate-900 dark:text-white">
                  {profile.totalOrders.toLocaleString()}
                </p>
                <p className="text-[11px] text-slate-500">
                  Jami topilgan: {profile.totalEarned.toLocaleString()} so‘m
                </p>
              </div>
            </StaggerItem>

            <StaggerItem>
              <div className="yuyu-glass p-5 rounded-3xl space-y-2 h-full">
                <div className="flex items-center justify-between text-indigo-600 dark:text-indigo-400">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Konversiya</span>
                  <Percent size={16} />
                </div>
                <p className="font-mono tabular-nums text-2xl font-bold text-slate-900 dark:text-white">
                  {conversionRate}%
                </p>
                <p className="text-[11px] text-slate-500">O‘tishdan xaridda</p>
              </div>
            </StaggerItem>
          </StaggerGrid>

          {/* Tier & Progress Bar */}
          <div className="yuyu-glass p-6 rounded-3xl space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Award size={18} className="text-[#2563EB] dark:text-blue-400" />
                  <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">
                    Hamkorlik darajangiz: {profile.commissionRate}%
                  </h2>
                  {profile.manualRateOverride ? (
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-lg bg-amber-500/15 text-amber-700 dark:text-amber-300">
                      Admin maxsus foizi
                    </span>
                  ) : null}
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-300">{tierProgress.text}</p>
              </div>
              <span className="font-mono tabular-nums text-xs font-bold text-[#0F294A] dark:text-blue-400">
                {tierProgress.nextLabel}
              </span>
            </div>

            <div className="w-full h-3 rounded-full bg-slate-200/75 dark:bg-slate-800 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${tierProgress.pct}%` }}
                transition={{ duration: 0.7, ease: 'easeOut' }}
                className="h-full rounded-full bg-gradient-to-r from-[#0F294A] via-[#2563EB] to-emerald-500"
              />
            </div>

            <div className="flex justify-between text-[11px] font-mono text-slate-500 dark:text-slate-400">
              <span>0–9 sotuv: 5%</span>
              <span>10–29 sotuv: 7%</span>
              <span>30+ sotuv: 10%</span>
            </div>
          </div>

          {/* Main 12-Col Grid: Link Generator (7 cols) + Payout Form (5 cols) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Tezkor Havola Generatori */}
            <div className="lg:col-span-7 yuyu-glass p-6 sm:p-7 rounded-3xl space-y-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Link2 size={18} className="text-[#2563EB] dark:text-blue-400" />
                    <span>Tezkor havola generatori</span>
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    30 kunlik kuzatuv — xaridor keyinroq qaytib xarid qilsa ham ulush sizga yoziladi
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingCode((v) => !v)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl yuyu-glass-subtle text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-[#2563EB]"
                >
                  <Edit3 size={13} />
                  <span>Kodni tahrirlash</span>
                </button>
              </div>

              <AnimatePresence>
                {editingCode && (
                  <motion.form
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    onSubmit={handleActivateOrUpdateCode}
                    className="p-4 rounded-2xl yuyu-glass-subtle border flex flex-col sm:flex-row gap-2.5 overflow-hidden"
                  >
                    <input
                      type="text"
                      value={customCodeInput}
                      onChange={(e) =>
                        setCustomCodeInput(
                          e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, '').slice(0, 20)
                        )
                      }
                      placeholder="Yangi kod (masalan: YUYU77)"
                      className="flex-1 px-3.5 py-2.5 rounded-xl yuyu-glass-input border font-mono text-xs uppercase outline-none focus:border-[#2563EB]"
                    />
                    <button
                      type="submit"
                      disabled={activating}
                      className="px-4 py-2.5 rounded-xl bg-[#0F294A] dark:bg-blue-600 text-white text-xs font-semibold whitespace-nowrap disabled:opacity-60"
                    >
                      {activating ? 'Saqlanmoqda...' : 'Kodni saqlash'}
                    </button>
                  </motion.form>
                )}
              </AnimatePresence>

              {/* Main Store Referral Link */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  1. Asosiy do‘kon havolasi
                </label>
                <div className="flex gap-2">
                  <input
                    readOnly
                    value={mainLink}
                    className="flex-1 px-3.5 py-2.5 rounded-xl yuyu-glass-input border font-mono text-xs text-slate-800 dark:text-slate-200 truncate outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => handleCopyText(mainLink, 'main')}
                    className="px-4 py-2.5 rounded-xl bg-[#0F294A] hover:bg-[#163A66] dark:bg-blue-600 text-white text-xs font-semibold inline-flex items-center gap-1.5 shrink-0"
                  >
                    {copiedMain ? <Check size={14} /> : <Copy size={14} />}
                    <span>{copiedMain ? 'Nusxalandi' : 'Nusxalash'}</span>
                  </button>
                </div>
              </div>

              {/* Product-specific Link Generator */}
              <div className="pt-5 border-t border-slate-200/60 dark:border-slate-800/70 space-y-3.5">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    2. Muayyan mahsulot uchun havola yaratish (Reels / Telegram uchun)
                  </label>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Mahsulotni qidiring va tanlang — darhol maxsus sotuv havolasi tayyorlanadi
                  </p>
                </div>

                <div className="relative">
                  <Search
                    size={15}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="text"
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    placeholder="Mahsulot nomi yoki toifasi bo‘yicha qidirish..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl yuyu-glass-input border text-xs outline-none focus:border-[#2563EB]"
                  />
                </div>

                {matchingProducts.length > 0 && (
                  <select
                    value={selectedProduct?.id || ''}
                    onChange={(e) => setSelectedProductId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl yuyu-glass-input border text-xs font-medium text-slate-900 dark:text-white outline-none focus:border-[#2563EB]"
                  >
                    {matchingProducts.map((p) => {
                      const uzs = Math.round(p.pinduoduoPrice * MARKUP_RATE * CURRENCY_RATE);
                      return (
                        <option key={p.id} value={p.id}>
                          {p.name} — {uzs.toLocaleString()} so‘m
                        </option>
                      );
                    })}
                  </select>
                )}

                {selectedProduct && (
                  <div className="p-4 rounded-2xl yuyu-glass-subtle border space-y-3">
                    <div className="flex items-center gap-3.5">
                      <SafeImage
                        src={selectedProduct.images?.[0]}
                        alt={selectedProduct.name}
                        className="w-14 h-14 rounded-xl object-contain bg-white dark:bg-slate-800 p-1 shrink-0"
                      />
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                          {selectedProduct.name}
                        </p>
                        <p className="text-xs font-mono tabular-nums text-slate-500">
                          Narx: {selectedProductPriceUzs.toLocaleString()} so‘m
                        </p>
                        <p className="text-xs font-mono tabular-nums font-bold text-emerald-600 dark:text-emerald-400">
                          1 ta sotuvdan daromadingiz ({profile.commissionRate}%): +{estProductCommission.toLocaleString()} so‘m
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <input
                        readOnly
                        value={productLink}
                        className="flex-1 px-3 py-2 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700 font-mono text-[11px] text-slate-700 dark:text-slate-300 truncate outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => handleCopyText(productLink, 'product')}
                        className="px-3.5 py-2 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-semibold inline-flex items-center gap-1.5 shrink-0"
                      >
                        {copiedProduct ? <Check size={13} /> : <Copy size={13} />}
                        <span>{copiedProduct ? 'Nusxalandi' : 'Nusxalash'}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Pul Yechib Olish Bo'limi */}
            <div className="lg:col-span-5 yuyu-glass-strong p-6 sm:p-7 rounded-3xl space-y-5">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <CreditCard size={18} className="text-emerald-600 dark:text-emerald-400" />
                    <span>Pul yechib olish</span>
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Minimal yechish summasi: {MIN_PAYOUT_UZS.toLocaleString()} so‘m
                  </p>
                </div>
              </div>

              <form onSubmit={handlePayoutSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Yechib olish summasi (so‘m)
                    </label>
                    {profile.availableBalance >= MIN_PAYOUT_UZS && (
                      <button
                        type="button"
                        onClick={() => setPayoutAmount(String(profile.availableBalance))}
                        className="text-[11px] font-semibold text-[#2563EB] dark:text-blue-400 hover:underline"
                      >
                        Barchasini kiritish ({profile.availableBalance.toLocaleString()})
                      </button>
                    )}
                  </div>
                  <input
                    type="number"
                    required
                    min={MIN_PAYOUT_UZS}
                    max={Math.max(MIN_PAYOUT_UZS, profile.availableBalance)}
                    step={1000}
                    value={payoutAmount}
                    onChange={(e) => setPayoutAmount(e.target.value)}
                    placeholder="Masalan: 100000"
                    className="w-full px-4 py-3 rounded-xl yuyu-glass-input border font-mono tabular-nums text-sm font-bold text-slate-900 dark:text-white outline-none focus:border-[#2563EB]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Uzcard / Humo karta raqami (16 raqam)
                  </label>
                  <input
                    type="text"
                    required
                    inputMode="numeric"
                    value={payoutCard}
                    onChange={(e) => setPayoutCard(formatCardInput(e.target.value))}
                    placeholder="8600 0000 0000 0000"
                    className="w-full px-4 py-3 rounded-xl yuyu-glass-input border font-mono tabular-nums text-sm text-slate-900 dark:text-white outline-none focus:border-[#2563EB]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Karta egasining ism-familiyasi
                  </label>
                  <input
                    type="text"
                    required
                    value={payoutHolder}
                    onChange={(e) => setPayoutHolder(e.target.value)}
                    placeholder="Masalan: Alisher Karimov"
                    className="w-full px-4 py-3 rounded-xl yuyu-glass-input border text-sm text-slate-900 dark:text-white outline-none focus:border-[#2563EB]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submittingPayout || profile.availableBalance < MIN_PAYOUT_UZS}
                  className="w-full py-3.5 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-400 dark:disabled:bg-slate-700 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-colors shadow-md shadow-emerald-600/20"
                >
                  <Send size={15} />
                  <span>
                    {submittingPayout
                      ? 'So‘rov yuborilmoqda...'
                      : profile.availableBalance < MIN_PAYOUT_UZS
                      ? `Kamida ${MIN_PAYOUT_UZS.toLocaleString()} so‘m to‘plang`
                      : 'Kartaga yechib olish so‘rovi'}
                  </span>
                </button>
              </form>
            </div>
          </div>

          {/* History Tabs: Commissions & Payouts */}
          <div className="yuyu-glass p-6 sm:p-7 rounded-3xl space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                Daromadlar va to‘lovlar tarixi
              </h2>
              <div className="inline-flex p-1 yuyu-glass-subtle rounded-xl gap-1">
                <button
                  type="button"
                  onClick={() => setHistoryTab('commissions')}
                  className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors ${
                    historyTab === 'commissions'
                      ? 'bg-[#0F294A] dark:bg-blue-600 text-white'
                      : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  Komissiyalar ({commissions.length})
                </button>
                <button
                  type="button"
                  onClick={() => setHistoryTab('payouts')}
                  className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors ${
                    historyTab === 'payouts'
                      ? 'bg-[#0F294A] dark:bg-blue-600 text-white'
                      : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  Pul yechish ({payouts.length})
                </button>
              </div>
            </div>

            {historyTab === 'commissions' ? (
              commissions.length === 0 ? (
                <div className="py-12 text-center text-sm text-slate-500">
                  Hali komissiyalar yozilmagan. Havolangizni ulashing va birinchi daromadingizni oling!
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200/70 dark:border-slate-800 text-slate-500">
                        <th className="py-3 pr-4 font-semibold">Buyurtma / Tovar</th>
                        <th className="py-3 px-3 font-semibold">Sana</th>
                        <th className="py-3 px-3 font-semibold">Buyurtma summasi</th>
                        <th className="py-3 px-3 font-semibold">Ulush</th>
                        <th className="py-3 pl-3 font-semibold text-right">Holat</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200/50 dark:divide-slate-800/60">
                      {commissions.map((c) => (
                        <tr key={c.id}>
                          <td className="py-3.5 pr-4">
                            <p className="font-semibold text-slate-900 dark:text-white">{c.productName || 'Buyurtma'}</p>
                            <p className="font-mono text-[11px] text-slate-500">
                              {c.orderId}{c.buyerName ? ` · ${c.buyerName}` : ''}
                            </p>
                          </td>
                          <td className="py-3.5 px-3 font-mono tabular-nums text-slate-500 whitespace-nowrap">
                            {formatDateUz(c.createdAt)}
                          </td>
                          <td className="py-3.5 px-3 font-mono tabular-nums text-slate-700 dark:text-slate-300 whitespace-nowrap">
                            {c.orderAmount.toLocaleString()} so‘m
                          </td>
                          <td className="py-3.5 px-3 font-mono tabular-nums font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                            +{c.commissionAmount.toLocaleString()} so‘m ({c.ratePercent}%)
                          </td>
                          <td className="py-3.5 pl-3 text-right whitespace-nowrap">
                            <span
                              className={`inline-flex items-center gap-1 font-semibold ${
                                c.status === 'approved'
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : c.status === 'cancelled'
                                  ? 'text-red-600 dark:text-red-400'
                                  : 'text-amber-600 dark:text-amber-400'
                              }`}
                            >
                              {c.status === 'approved' && <CheckCircle2 size={13} />}
                              {c.status === 'pending' && <Clock size={13} />}
                              {c.status === 'cancelled' && <XCircle size={13} />}
                              <span>
                                {c.status === 'approved'
                                  ? 'Tasdiqlangan'
                                  : c.status === 'cancelled'
                                  ? 'Bekor qilindi'
                                  : 'Kutilmoqda'}
                              </span>
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            ) : payouts.length === 0 ? (
              <div className="py-12 text-center text-sm text-slate-500">
                Hali pul yechish so‘rovlari yuborilmagan.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200/70 dark:border-slate-800 text-slate-500">
                      <th className="py-3 pr-4 font-semibold">Karta va egasi</th>
                      <th className="py-3 px-3 font-semibold">Sana</th>
                      <th className="py-3 px-3 font-semibold">Summa</th>
                      <th className="py-3 pl-3 font-semibold text-right">Holat</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/50 dark:divide-slate-800/60">
                    {payouts.map((p) => (
                      <tr key={p.id}>
                        <td className="py-3.5 pr-4">
                          <p className="font-mono font-semibold text-slate-900 dark:text-white">{p.cardNumber}</p>
                          <p className="text-[11px] text-slate-500">{p.cardHolderName}</p>
                          {p.adminNote && (
                            <p className="text-[11px] text-red-600 dark:text-red-400 mt-0.5">
                              Izoh: {p.adminNote}
                            </p>
                          )}
                        </td>
                        <td className="py-3.5 px-3 font-mono tabular-nums text-slate-500 whitespace-nowrap">
                          {formatDateUz(p.createdAt)}
                        </td>
                        <td className="py-3.5 px-3 font-mono tabular-nums font-bold text-[#0F294A] dark:text-blue-400 whitespace-nowrap">
                          {p.amount.toLocaleString()} so‘m
                        </td>
                        <td className="py-3.5 pl-3 text-right whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1 font-semibold ${
                              p.status === 'paid'
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : p.status === 'rejected'
                                ? 'text-red-600 dark:text-red-400'
                                : 'text-amber-600 dark:text-amber-400'
                            }`}
                          >
                            {p.status === 'paid' && <CheckCircle2 size={13} />}
                            {p.status === 'pending' && <Clock size={13} />}
                            {p.status === 'rejected' && <XCircle size={13} />}
                            <span>
                              {p.status === 'paid'
                                ? "To'landi"
                                : p.status === 'rejected'
                                ? 'Rad etildi (qaytarildi)'
                                : 'Kutilmoqda'}
                            </span>
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

/* ============================================================================
 * 2. ADMIN PANEL: «HAMKORLAR (AFFILIATE)» LEADERBOARD, RATES & PAYOUTS
 * ========================================================================== */
interface AdminAffiliateViewProps {
  onBack: () => void;
  notify: (msg: string, type?: 'success' | 'error' | 'info') => void;
  safeFetchJSON: (url: string, options?: RequestInit) => Promise<any>;
  onPendingPayoutsChange?: (count: number) => void;
}

export const AdminAffiliateView: React.FC<AdminAffiliateViewProps> = ({
  onBack,
  notify,
  safeFetchJSON,
  onPendingPayoutsChange
}) => {
  const [profiles, setProfiles] = useState<AffiliateProfile[]>([]);
  const [payouts, setPayouts] = useState<AffiliatePayout[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'leaderboard' | 'payouts'>('leaderboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [payoutFilter, setPayoutFilter] = useState<'pending' | 'all'>('pending');

  // Manual rate edit state
  const [editingRateUserId, setEditingRateUserId] = useState<string | null>(null);
  const [customRateValue, setCustomRateValue] = useState<string>('10');
  const [updatingKey, setUpdatingKey] = useState<string | null>(null);

  // Reject payout state
  const [rejectingPayoutId, setRejectingPayoutId] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState('');
  const [copiedCardId, setCopiedCardId] = useState<string | null>(null);

  const loadAdminAffiliates = async () => {
    try {
      setLoading(true);
      const res = await safeFetchJSON('/api/admin/affiliates');
      if (res?.success) {
        const nextProfiles = Array.isArray(res.profiles) ? res.profiles : [];
        const nextPayouts = Array.isArray(res.payouts) ? res.payouts : [];
        setProfiles(nextProfiles);
        setPayouts(nextPayouts);
        onPendingPayoutsChange?.(nextPayouts.filter((p: AffiliatePayout) => p.status === 'pending').length);
      }
    } catch (err: any) {
      notify(err?.message || "Hamkorlar ro'yxatini yuklashda xatolik", 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminAffiliates();
  }, []);

  const handleUpdateRate = async (userId: string, rate?: number, resetToAuto = false) => {
    try {
      setUpdatingKey(userId);
      const res = await safeFetchJSON(`/api/admin/affiliates/rate/${encodeURIComponent(userId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(resetToAuto ? { resetToAuto: true } : { commissionRate: rate })
      });
      if (res?.success && res.profile) {
        setProfiles((prev) =>
          prev.map((p) => (p.userId === userId ? { ...p, ...res.profile } : p))
        );
        setEditingRateUserId(null);
        notify(
          resetToAuto
            ? `Hamkor foizi avtomatik darajaga qaytarildi (${res.profile.commissionRate}%)`
            : `Hamkor foizi ${res.profile.commissionRate}% qilib belgilandi`,
          'success'
        );
      }
    } catch (err: any) {
      notify(err?.message || "Foizni yangilashda xatolik", 'error');
    } finally {
      setUpdatingKey(null);
    }
  };

  const handleProcessPayout = async (id: string, status: 'paid' | 'rejected', adminNote = '') => {
    try {
      setUpdatingKey(id);
      const res = await safeFetchJSON(`/api/admin/affiliates/payouts/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, adminNote })
      });
      if (res?.success && res.payout) {
        const nextPayouts = payouts.map((po) =>
          po.id === id ? { ...po, ...res.payout } : po
        );
        setPayouts(nextPayouts);
        onPendingPayoutsChange?.(nextPayouts.filter((p) => p.status === 'pending').length);
        setRejectingPayoutId(null);
        setRejectNote('');
        if (status === 'rejected') {
          // Reload profiles so refunded balance updates cleanly
          loadAdminAffiliates();
        }
        notify(
          status === 'paid'
            ? "To'lov 'To'landi' deb belgilandi"
            : "So'rov rad etildi va mablag' hamkor balansiga qaytarildi",
          'success'
        );
      }
    } catch (err: any) {
      notify(err?.message || "To'lov holatini yangilashda xatolik", 'error');
    } finally {
      setUpdatingKey(null);
    }
  };

  const copyCard = (id: string, card: string) => {
    navigator.clipboard.writeText(card.replace(/\s+/g, ''));
    setCopiedCardId(id);
    notify('Karta raqami nusxalandi', 'success');
    setTimeout(() => setCopiedCardId(null), 2000);
  };

  const summary = useMemo(() => {
    const totalClicks = profiles.reduce((s, p) => s + (p.totalClicks || 0), 0);
    const totalEarned = profiles.reduce((s, p) => s + (p.totalEarned || 0), 0);
    const pendingPayoutList = payouts.filter((p) => p.status === 'pending');
    const pendingPayoutSum = pendingPayoutList.reduce((s, p) => s + (p.amount || 0), 0);
    return {
      affiliatesCount: profiles.length,
      totalClicks,
      totalEarned,
      pendingPayoutCount: pendingPayoutList.length,
      pendingPayoutSum
    };
  }, [profiles, payouts]);

  const filteredProfiles = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return profiles;
    return profiles.filter(
      (p) =>
        (p.username || '').toLowerCase().includes(q) ||
        (p.refCode || '').toLowerCase().includes(q) ||
        (p.phoneNumber || '').toLowerCase().includes(q)
    );
  }, [profiles, searchQuery]);

  const visiblePayouts = useMemo(
    () => (payoutFilter === 'pending' ? payouts.filter((p) => p.status === 'pending') : payouts),
    [payouts, payoutFilter]
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-slate-200/70 dark:border-slate-800/70">
        <div className="flex items-center gap-3.5">
          <motion.button
            type="button"
            whileHover={{ x: -2 }}
            whileTap={{ scale: 0.94 }}
            onClick={onBack}
            className="p-2.5 yuyu-glass-subtle rounded-xl hover:bg-white/85 dark:hover:bg-slate-800/80 transition-colors"
          >
            <ArrowLeft size={18} />
          </motion.button>
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
              Hamkorlar (Affiliate) boshqaruvi
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Blogerlar reytingi, individual komissiya foizlari va pul yechish so‘rovlari
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={loadAdminAffiliates}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl yuyu-glass-subtle text-xs font-semibold text-slate-700 dark:text-slate-200"
        >
          <RotateCcw size={14} />
          <span>Yangilash</span>
        </button>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="yuyu-glass p-5 rounded-3xl space-y-1.5">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span>Faol hamkorlar</span>
            <Users size={15} />
          </div>
          <p className="font-mono tabular-nums text-2xl font-bold text-slate-900 dark:text-white">
            {summary.affiliatesCount}
          </p>
        </div>
        <div className="yuyu-glass p-5 rounded-3xl space-y-1.5">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span>Jami o‘tishlar (Clicks)</span>
            <MousePointerClick size={15} />
          </div>
          <p className="font-mono tabular-nums text-2xl font-bold text-slate-900 dark:text-white">
            {summary.totalClicks.toLocaleString()}
          </p>
        </div>
        <div className="yuyu-glass p-5 rounded-3xl space-y-1.5">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span>Jami to‘plangan ulush</span>
            <TrendingUp size={15} className="text-emerald-500" />
          </div>
          <p className="font-mono tabular-nums text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {summary.totalEarned.toLocaleString()} so‘m
          </p>
        </div>
        <div className="yuyu-glass p-5 rounded-3xl space-y-1.5 border border-amber-400/40">
          <div className="flex items-center justify-between text-amber-600 dark:text-amber-400 text-xs font-semibold">
            <span>Kutilayotgan to‘lovlar ({summary.pendingPayoutCount})</span>
            <Wallet size={15} />
          </div>
          <p className="font-mono tabular-nums text-2xl font-bold text-amber-600 dark:text-amber-400">
            {summary.pendingPayoutSum.toLocaleString()} so‘m
          </p>
        </div>
      </div>

      {/* Main Switch Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="inline-flex p-1 yuyu-glass-subtle rounded-xl gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('leaderboard')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
              activeTab === 'leaderboard'
                ? 'bg-[#0F294A] dark:bg-blue-600 text-white'
                : 'text-slate-600 dark:text-slate-300'
            }`}
          >
            Hamkorlar reytingi ({profiles.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('payouts')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors inline-flex items-center gap-2 ${
              activeTab === 'payouts'
                ? 'bg-[#0F294A] dark:bg-blue-600 text-white'
                : 'text-slate-600 dark:text-slate-300'
            }`}
          >
            <span>Pul yechish so‘rovlari</span>
            {summary.pendingPayoutCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-md bg-amber-400 text-slate-950 font-mono text-[10px] font-bold">
                {summary.pendingPayoutCount}
              </span>
            )}
          </button>
        </div>

        {activeTab === 'leaderboard' ? (
          <div className="relative w-full sm:w-72">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Ism, telefon yoki kod..."
              className="w-full pl-9 pr-4 py-2 rounded-xl yuyu-glass-input border text-xs outline-none focus:border-[#2563EB]"
            />
          </div>
        ) : (
          <div className="inline-flex p-1 yuyu-glass-subtle rounded-xl gap-1">
            <button
              type="button"
              onClick={() => setPayoutFilter('pending')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                payoutFilter === 'pending'
                  ? 'bg-amber-500 text-slate-950'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              Kutilayotgan ({summary.pendingPayoutCount})
            </button>
            <button
              type="button"
              onClick={() => setPayoutFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                payoutFilter === 'all'
                  ? 'bg-[#0F294A] dark:bg-blue-600 text-white'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              Barchasi ({payouts.length})
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="yuyu-glass rounded-3xl py-16 text-center text-sm text-slate-500">
          Ma'lumotlar yuklanmoqda...
        </div>
      ) : activeTab === 'leaderboard' ? (
        filteredProfiles.length === 0 ? (
          <div className="yuyu-glass rounded-3xl py-16 text-center text-sm text-slate-500">
            Hali faol hamkorlar mavjud emas.
          </div>
        ) : (
          <div className="space-y-4">
            {filteredProfiles.map((p, idx) => {
              const conv = p.totalClicks > 0 ? ((p.totalOrders / p.totalClicks) * 100).toFixed(1) : '0.0';
              const isEditing = editingRateUserId === p.userId;
              return (
                <div key={p.userId} className="yuyu-glass p-5 sm:p-6 rounded-3xl space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <span className="w-9 h-9 rounded-xl bg-[#0F294A]/10 dark:bg-blue-500/15 text-[#0F294A] dark:text-blue-400 font-mono font-bold text-xs flex items-center justify-center shrink-0">
                        #{idx + 1}
                      </span>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-display font-bold text-base text-slate-900 dark:text-white truncate">
                            {p.username || p.refCode}
                          </h3>
                          <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-lg bg-blue-500/10 text-[#0F294A] dark:text-blue-400">
                            {p.refCode}
                          </span>
                          <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-lg bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                            {p.commissionRate}%{p.manualRateOverride ? ' (VIP qo‘lda)' : ' (Avto)'}
                          </span>
                        </div>
                        <p className="text-xs font-mono text-slate-500 mt-0.5">
                          {p.phoneNumber || p.userId}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        if (isEditing) {
                          setEditingRateUserId(null);
                        } else {
                          setEditingRateUserId(p.userId);
                          setCustomRateValue(String(p.commissionRate));
                        }
                      }}
                      className="px-3.5 py-2 rounded-xl yuyu-glass-subtle text-xs font-semibold text-[#0F294A] dark:text-blue-400 hover:bg-white/90 dark:hover:bg-slate-800 inline-flex items-center gap-1.5"
                    >
                      <Percent size={13} />
                      <span>Foizni o‘zgartirish</span>
                    </button>
                  </div>

                  {/* Metrics Row */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-3 border-t border-slate-200/60 dark:border-slate-800/70 text-xs">
                    <div>
                      <p className="text-slate-500">O‘tishlar</p>
                      <p className="font-mono tabular-nums font-bold text-slate-900 dark:text-white mt-0.5">
                        {p.totalClicks.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500">Sotuvlar / Konv.</p>
                      <p className="font-mono tabular-nums font-bold text-slate-900 dark:text-white mt-0.5">
                        {p.totalOrders} ta ({conv}%)
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500">Kutilayotgan</p>
                      <p className="font-mono tabular-nums font-bold text-amber-600 dark:text-amber-400 mt-0.5">
                        {p.pendingBalance.toLocaleString()} so‘m
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500">Tayyor balans</p>
                      <p className="font-mono tabular-nums font-bold text-[#0F294A] dark:text-blue-400 mt-0.5">
                        {p.availableBalance.toLocaleString()} so‘m
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500">Jami daromad</p>
                      <p className="font-mono tabular-nums font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                        {p.totalEarned.toLocaleString()} so‘m
                      </p>
                    </div>
                  </div>

                  {/* Manual Commission Rate Editor */}
                  {isEditing && (
                    <div className="p-4 rounded-2xl yuyu-glass-subtle border space-y-3">
                      <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Individual komissiya foizini belgilash (masalan, katta bloger uchun 10%):
                      </p>
                      <div className="flex flex-wrap items-center gap-2">
                        {[5, 7, 10, 12, 15].map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            disabled={updatingKey === p.userId}
                            onClick={() => handleUpdateRate(p.userId, preset, false)}
                            className="px-3 py-1.5 rounded-lg bg-[#0F294A]/10 hover:bg-[#0F294A] hover:text-white dark:bg-blue-500/15 dark:hover:bg-blue-600 text-xs font-mono font-bold transition-colors"
                          >
                            {preset}%
                          </button>
                        ))}
                        <div className="flex items-center gap-2 ml-auto">
                          <input
                            type="number"
                            min={1}
                            max={30}
                            step={0.5}
                            value={customRateValue}
                            onChange={(e) => setCustomRateValue(e.target.value)}
                            className="w-20 px-2.5 py-1.5 rounded-lg yuyu-glass-input border font-mono text-xs text-center"
                          />
                          <button
                            type="button"
                            disabled={updatingKey === p.userId}
                            onClick={() => handleUpdateRate(p.userId, Number(customRateValue), false)}
                            className="px-3.5 py-1.5 rounded-lg bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-semibold"
                          >
                            Saqlash
                          </button>
                          {p.manualRateOverride && (
                            <button
                              type="button"
                              disabled={updatingKey === p.userId}
                              onClick={() => handleUpdateRate(p.userId, undefined, true)}
                              className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300"
                            >
                              Avto daraja
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )
      ) : visiblePayouts.length === 0 ? (
        <div className="yuyu-glass rounded-3xl py-16 text-center text-sm text-slate-500">
          {payoutFilter === 'pending'
            ? 'Hozircha kutilayotgan pul yechish so‘rovlari yo‘q.'
            : 'Pul yechish so‘rovlari tarixi bo‘sh.'}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {visiblePayouts.map((po) => (
            <div key={po.id} className="yuyu-glass p-6 rounded-3xl space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-mono text-xs text-slate-500">
                    {po.id} · {formatDateUz(po.createdAt)}
                  </p>
                  <h3 className="font-display font-bold text-base text-slate-900 dark:text-white mt-0.5">
                    {po.affiliateName || po.cardHolderName}
                    {po.affiliateRefCode ? ` (${po.affiliateRefCode})` : ''}
                  </h3>
                </div>
                <span
                  className={`inline-flex items-center gap-1 text-xs font-semibold ${
                    po.status === 'paid'
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : po.status === 'rejected'
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-amber-600 dark:text-amber-400'
                  }`}
                >
                  {po.status === 'paid' && <CheckCircle2 size={14} />}
                  {po.status === 'pending' && <Clock size={14} />}
                  {po.status === 'rejected' && <XCircle size={14} />}
                  <span>
                    {po.status === 'paid'
                      ? "To'landi"
                      : po.status === 'rejected'
                      ? 'Rad etildi'
                      : 'Kutilmoqda'}
                  </span>
                </span>
              </div>

              <div className="p-4 rounded-2xl yuyu-glass-subtle border space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">To‘lanadigan summa:</span>
                  <span className="font-mono tabular-nums text-lg font-bold text-[#0F294A] dark:text-blue-400">
                    {po.amount.toLocaleString()} so‘m
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                  <div>
                    <p className="font-mono text-sm font-bold text-slate-900 dark:text-white">{po.cardNumber}</p>
                    <p className="text-xs text-slate-500">{po.cardHolderName}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyCard(po.id, po.cardNumber)}
                    className="px-3 py-1.5 rounded-lg yuyu-glass text-xs font-semibold inline-flex items-center gap-1.5 text-slate-700 dark:text-slate-200"
                  >
                    {copiedCardId === po.id ? <Check size={13} /> : <Copy size={13} />}
                    <span>{copiedCardId === po.id ? 'Nusxalandi' : 'Nusxalash'}</span>
                  </button>
                </div>
              </div>

              {po.adminNote && (
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Admin izohi: {po.adminNote}
                </p>
              )}

              {po.status === 'pending' && (
                <div className="space-y-3 pt-1">
                  {rejectingPayoutId === po.id ? (
                    <div className="space-y-2.5">
                      <input
                        type="text"
                        value={rejectNote}
                        onChange={(e) => setRejectNote(e.target.value)}
                        placeholder="Rad etish sababini kiriting (masalan: karta raqami noto‘g‘ri)"
                        className="w-full px-3.5 py-2.5 rounded-xl yuyu-glass-input border text-xs outline-none focus:border-red-500"
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setRejectingPayoutId(null);
                            setRejectNote('');
                          }}
                          className="flex-1 py-2.5 rounded-xl yuyu-glass-subtle text-xs font-semibold"
                        >
                          Bekor
                        </button>
                        <button
                          type="button"
                          disabled={updatingKey === po.id}
                          onClick={() => handleProcessPayout(po.id, 'rejected', rejectNote.trim())}
                          className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold"
                        >
                          Rad etish va balansga qaytarish
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2.5">
                      <button
                        type="button"
                        disabled={updatingKey === po.id}
                        onClick={() => handleProcessPayout(po.id, 'paid')}
                        className="py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5"
                      >
                        <CheckCircle2 size={14} />
                        <span>To‘landi</span>
                      </button>
                      <button
                        type="button"
                        disabled={updatingKey === po.id}
                        onClick={() => setRejectingPayoutId(po.id)}
                        className="py-2.5 rounded-xl border border-red-300 dark:border-red-900/60 bg-red-50/80 dark:bg-red-950/30 text-red-600 dark:text-red-400 text-xs font-semibold inline-flex items-center justify-center gap-1.5"
                      >
                        <XCircle size={14} />
                        <span>Rad etish</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
