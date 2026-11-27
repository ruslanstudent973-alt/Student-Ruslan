import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { triggerPushPermissionPrompt } from './SmartPwaManager';
import {
  Gavel,
  Crown,
  Clock,
  ShieldCheck,
  TrendingUp,
  Trophy,
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  Plus,
  UploadCloud,
  X,
  Phone,
  Users,
  History,
  Ban,
  Flag,
  RefreshCw,
  ArrowUpRight,
  Loader2,
  Sparkles,
  Image as ImageIcon,
  LogIn,
  Wallet,
  CreditCard,
  BellRing,
  PackagePlus,
  Send,
  XCircle
} from 'lucide-react';
import {
  Auction,
  AuctionBid,
  Product,
  SellerPayout,
  SellerWalletSummary,
  User,
  UserActiveBidEntry,
  UserSellerQuota,
  UserWonAuctionEntry,
  View
} from '../types';
import { MARKUP_RATE, CURRENCY_RATE } from '../constants';
import { SafeImage } from './YuyuPrimitives';
import { RealAuctionLeaderboard, VipSellerSubmitModal } from './AuctionVipExtras';
import { uploadMediaSmart } from '../utils/r2MediaUpload';

export const AUCTION_PRESET_IMAGES = [
  {
    label: 'Pearl Quloqchin',
    url: '/images/auction_headphones_pearl_1795274187706.jpg'
  },
  {
    label: 'Titanium Smart Soat',
    url: '/images/auction_watch_titanium_1795274187033.jpg'
  }
];

export function formatUzs(amount: number): string {
  const safe = Math.max(0, Math.round(Number(amount) || 0));
  return `${safe.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} so'm`;
}

export function auctionToOrderProduct(auction: Auction): Product {
  const yuanEquivalent =
    Math.max(1, Number(auction.currentPrice) || 10000) / (MARKUP_RATE * CURRENCY_RATE);
  return {
    id: `auction-${auction.id}`,
    name: `Auksion yutug'i: ${auction.title}`,
    pinduoduoPrice: yuanEquivalent,
    description: auction.description,
    category: 'Kim oshdi savdosi',
    images: auction.imageUrl ? [auction.imageUrl] : [],
    sizes: ['Auksion yutug\'i'],
    rating: 5,
    salesCount: auction.bidsCount || 1,
    seller: {
      name: 'YUYU Shop Auksion',
      avatar: '',
      rating: 5,
      description: 'Haftalik Kim oshdi savdosi rasmiy kafolati'
    },
    isOriginal: true,
    weight: 0.6
  };
}

function formatRelativeUzTime(iso: string, nowMs: number): string {
  const ts = new Date(iso).getTime();
  if (!Number.isFinite(ts)) return '';
  const diffSec = Math.max(0, Math.floor((nowMs - ts) / 1000));
  if (diffSec < 10) return 'Hozirgina';
  if (diffSec < 60) return `${diffSec} soniya oldin`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} daqiqa oldin`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} soat oldin`;
  return new Date(ts).toLocaleDateString('uz-UZ');
}

function splitRemaining(endsAtIso: string, nowMs: number) {
  const endMs = new Date(endsAtIso).getTime();
  const remainingMs = Math.max(0, (Number.isFinite(endMs) ? endMs : 0) - nowMs);
  const totalSec = Math.floor(remainingMs / 1000);
  const hours = Math.floor(totalSec / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  return {
    remainingMs,
    isEnded: remainingMs <= 0,
    isUrgent: remainingMs > 0 && remainingMs <= 5 * 60 * 1000,
    isCritical: remainingMs > 0 && remainingMs <= 30 * 1000,
    hours: String(hours).padStart(2, '0'),
    minutes: String(minutes).padStart(2, '0'),
    seconds: String(seconds).padStart(2, '0')
  };
}

async function compressImageFile(file: File): Promise<string> {
  return uploadMediaSmart(file, { folder: 'auctions', maxDim: 1200, quality: 0.84 });
}

const GlassBackdropOrbs: React.FC = () => (
  <div
    className="pointer-events-none absolute inset-0 overflow-hidden rounded-[32px] -z-10"
    aria-hidden="true"
  >
    <div className="auction-orb-slow absolute -top-24 -left-20 w-[420px] h-[420px] rounded-full bg-sky-200/55 dark:bg-sky-500/15 blur-3xl" />
    <div className="auction-orb-slower absolute top-1/3 -right-24 w-[440px] h-[440px] rounded-full bg-orange-200/45 dark:bg-amber-500/10 blur-3xl" />
    <div className="auction-orb-slow absolute -bottom-24 left-1/3 w-[380px] h-[380px] rounded-full bg-violet-200/45 dark:bg-indigo-500/15 blur-3xl" />
  </div>
);

const CountdownDigitBlock: React.FC<{
  value: string;
  label: string;
  urgent: boolean;
}> = ({ value, label, urgent }) => (
  <div className="flex flex-col items-center">
    <div
      className={`relative overflow-hidden min-w-[68px] sm:min-w-[78px] h-[64px] sm:h-[72px] rounded-2xl flex items-center justify-center border backdrop-blur-xl shadow-sm transition-colors ${
        urgent
          ? 'bg-red-50/85 dark:bg-red-950/50 border-red-200/90 dark:border-red-500/40 text-red-600 dark:text-red-400'
          : 'bg-white/80 dark:bg-slate-800/80 border-white/95 dark:border-slate-700/80 text-slate-900 dark:text-white'
      }`}
    >
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={value}
          initial={{ y: -14, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 14, opacity: 0 }}
          transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          className="font-mono tabular-nums text-2xl sm:text-3xl font-bold tracking-tight"
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </div>
    <span className="mt-1.5 text-[11px] font-medium text-slate-500 dark:text-slate-400">
      {label}
    </span>
  </div>
);

const GLASS_CARD_CLASS =
  'bg-white/65 dark:bg-slate-900/65 backdrop-blur-2xl border border-white/90 dark:border-slate-700/60 shadow-[0_12px_40px_rgba(15,23,42,0.06)] dark:shadow-[0_12px_40px_rgba(0,0,0,0.28)] rounded-3xl';

// ================= 1. LIVE AUCTION PAGE (/auction) =================

interface LiveAuctionViewProps {
  currentUser: User | null;
  onNavigate: (view: View) => void;
  onRequireLogin: () => void;
  onOpenVipModal?: () => void;
  notify: (msg: string, type?: 'success' | 'error' | 'info') => void;
  safeFetchJSON: (url: string, options?: RequestInit) => Promise<any>;
  isAdminAuthorized?: boolean;
}

export const LiveAuctionView: React.FC<LiveAuctionViewProps> = ({
  currentUser,
  onNavigate,
  onRequireLogin,
  onOpenVipModal,
  notify,
  safeFetchJSON,
  isAdminAuthorized = false
}) => {
  const [liveAuctions, setLiveAuctions] = useState<Auction[]>([]);
  const [recentEnded, setRecentEnded] = useState<Auction[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [customAmount, setCustomAmount] = useState('');
  const [placingBid, setPlacingBid] = useState(false);
  const [antiSnipeNotice, setAntiSnipeNotice] = useState(false);
  const [nowMs, setNowMs] = useState<number>(0);
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [sellerQuota, setSellerQuota] = useState<UserSellerQuota | null>(null);
  const clockOffsetRef = useRef(0);

  const loadSellerQuota = useCallback(async () => {
    if (!currentUser?.telegramId) {
      setSellerQuota(null);
      return;
    }
    try {
      const res = await safeFetchJSON(
        `/api/user/auctions?userId=${encodeURIComponent(currentUser.telegramId)}`,
        { headers: { 'x-user-id': currentUser.telegramId } }
      );
      if (res?.sellerQuota) setSellerQuota(res.sellerQuota);
    } catch {
      // ignore
    }
  }, [currentUser?.telegramId, safeFetchJSON]);

  useEffect(() => {
    loadSellerQuota();
  }, [loadSellerQuota]);

  const fetchActiveAuctions = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      try {
        const res = await safeFetchJSON('/api/auctions/active');
        if (res?.serverTime) {
          const serverMs = new Date(res.serverTime).getTime();
          if (Number.isFinite(serverMs)) {
            clockOffsetRef.current = serverMs - Date.now();
          }
        }
        const nextLive: Auction[] = Array.isArray(res?.auctions) ? res.auctions : [];
        const nextEnded: Auction[] = Array.isArray(res?.recentEnded) ? res.recentEnded : [];
        setLiveAuctions(nextLive);
        setRecentEnded(nextEnded);
        setSelectedId((prev) => {
          if (prev && nextLive.some((a) => a.id === prev)) return prev;
          return nextLive[0]?.id || '';
        });
      } catch (err: any) {
        if (!silent) {
          notify(err?.message || "Auksion ma'lumotlarini yuklashda xatolik", 'error');
        }
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [safeFetchJSON, notify]
  );

  // Initial load + 3-second polling for live bids
  useEffect(() => {
    fetchActiveAuctions(false);
    const pollTimer = setInterval(() => {
      fetchActiveAuctions(true);
    }, 3000);
    return () => clearInterval(pollTimer);
  }, [fetchActiveAuctions]);

  // 1-second smooth countdown tick
  useEffect(() => {
    const tick = setInterval(() => {
      setNowMs(Date.now() + clockOffsetRef.current);
    }, 1000);
    return () => clearInterval(tick);
  }, []);

  const activeAuction = useMemo(
    () => liveAuctions.find((a) => a.id === selectedId) || liveAuctions[0] || null,
    [liveAuctions, selectedId]
  );

  const timer = useMemo(
    () =>
      activeAuction
        ? splitRemaining(activeAuction.endsAt, nowMs)
        : {
            remainingMs: 0,
            isEnded: true,
            isUrgent: false,
            isCritical: false,
            hours: '00',
            minutes: '00',
            seconds: '00'
          },
    [activeAuction, nowMs]
  );

  const minStep = activeAuction?.minStep || 5000;
  const minNextBid = activeAuction ? activeAuction.currentPrice + minStep : 15000;
  const isCurrentUserLeading = Boolean(
    currentUser &&
      activeAuction?.highestBidderId &&
      (activeAuction.highestBidderId === currentUser.telegramId ||
        activeAuction.highestBidderId === currentUser.phoneNumber)
  );

  const quickIncrements = useMemo(() => {
    const base = Math.max(5000, minStep);
    if (base === 5000) return [5000, 10000, 25000];
    return [base, base * 2, base * 5];
  }, [minStep]);

  const submitBid = async (targetAmount: number) => {
    if (!activeAuction) return;
    if (!currentUser) {
      notify("Stavka qo'yish uchun avval tizimga kiring", 'info');
      onRequireLogin();
      return;
    }
    if (timer.isEnded || activeAuction.status !== 'LIVE') {
      notify('Ushbu auksion yakunlangan', 'error');
      return;
    }
    const cleanAmount = Math.round(Number(targetAmount) || 0);
    if (cleanAmount < minNextBid) {
      notify(`Minimal stavka ${formatUzs(minNextBid)} bo'lishi kerak`, 'error');
      return;
    }

    setPlacingBid(true);
    try {
      const res = await safeFetchJSON(`/api/auctions/${activeAuction.id}/bid`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.telegramId
        },
        body: JSON.stringify({
          userId: currentUser.telegramId,
          amount: cleanAmount
        })
      });

      if (res?.auction) {
        setLiveAuctions((prev) =>
          prev.map((a) => (a.id === res.auction.id ? res.auction : a))
        );
      }
      if (res?.serverTime) {
        const serverMs = new Date(res.serverTime).getTime();
        if (Number.isFinite(serverMs)) {
          clockOffsetRef.current = serverMs - Date.now();
          setNowMs(serverMs);
        }
      }
      setCustomAmount('');

      if (res?.antiSniped) {
        setAntiSnipeNotice(true);
        notify("Stavkangiz qabul qilindi! Adolat qoidasi: vaqt +30 soniyaga uzaytirildi", 'success');
        setTimeout(() => setAntiSnipeNotice(false), 6000);
      } else {
        notify(`Tabriklaymiz! ${formatUzs(cleanAmount)} stavkangiz qabul qilindi`, 'success');
      }
      triggerPushPermissionPrompt('bid');
    } catch (err: any) {
      notify(err?.message || "Stavka qo'yishda xatolik yuz berdi", 'error');
      fetchActiveAuctions(true);
    } finally {
      setPlacingBid(false);
    }
  };

  const handleCustomBidSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numeric = Number(customAmount.replace(/\s+/g, ''));
    submitBid(numeric || minNextBid);
  };

  return (
    <div className="relative isolate rounded-[32px] bg-white/45 dark:bg-slate-900/35 backdrop-blur-xl border border-white/80 dark:border-slate-700/60 p-4 sm:p-6 lg:p-8 overflow-hidden shadow-[0_14px_44px_rgba(15,23,42,0.06)]">
      <GlassBackdropOrbs />

      {/* Top Page Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6 lg:mb-8">
        <div>
          <p className="text-xs font-medium text-blue-600 dark:text-blue-400">
            YUYU Shop · Haftalik jonli kim oshdi savdosi
          </p>
          <h1 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 dark:text-white tracking-tight mt-1">
            Kim oshdi savdosi
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <motion.button
            whileHover={{ y: -1, scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            type="button"
            onClick={() => setIsSubmitModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-slate-950 text-sm font-bold shadow-md shadow-amber-500/20 hover:brightness-105 transition-all whitespace-nowrap shrink-0"
          >
            <Crown size={16} />
            <span>O'z tovarimni qo'shish (VIP)</span>
          </motion.button>
          {currentUser && (
            <button
              type="button"
              onClick={() => onNavigate('my_auctions')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/75 dark:bg-slate-800/80 backdrop-blur-xl border border-white/90 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-sm font-semibold hover:bg-white dark:hover:bg-slate-800 shadow-sm transition-all whitespace-nowrap shrink-0"
            >
              <Trophy size={16} className="text-blue-600 dark:text-blue-400" />
              <span>Mening auksionlarim</span>
            </button>
          )}
          {isAdminAuthorized && (
            <button
              type="button"
              onClick={() => onNavigate('admin_auctions')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-900 dark:bg-blue-600 text-white text-sm font-semibold hover:bg-slate-800 dark:hover:bg-blue-500 transition-colors whitespace-nowrap shrink-0"
            >
              <Gavel size={16} />
              <span>Auksion boshqaruvi</span>
            </button>
          )}
        </div>
      </div>

      {/* Multi-auction tabs if multiple live auctions exist */}
      {liveAuctions.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2 mb-6">
          {liveAuctions.map((auc) => {
            const active = auc.id === activeAuction?.id;
            return (
              <button
                key={auc.id}
                type="button"
                onClick={() => setSelectedId(auc.id)}
                className={`px-4 py-2 rounded-2xl text-sm font-semibold whitespace-nowrap shrink-0 transition-all border ${
                  active
                    ? 'bg-[#2563EB] text-white border-[#2563EB] shadow-md shadow-blue-600/20'
                    : 'bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl text-slate-700 dark:text-slate-200 border-white/90 dark:border-slate-700 hover:bg-white'
                }`}
              >
                {auc.title} · <span className="font-mono tabular-nums">{formatUzs(auc.currentPrice)}</span>
              </button>
            );
          })}
        </div>
      )}

      {loading ? (
        <div className={`${GLASS_CARD_CLASS} p-12 flex flex-col items-center justify-center text-center min-h-[420px]`}>
          <Loader2 size={32} className="animate-spin text-blue-600 mb-3" />
          <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
            Jonli auksion yuklanmoqda...
          </p>
        </div>
      ) : !activeAuction ? (
        <div className={`${GLASS_CARD_CLASS} p-10 sm:p-14 text-center space-y-4`}>
          <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto">
            <Gavel size={28} />
          </div>
          <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
            Hozirda faol jonli auksion yo'q
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
            Keyingi haftalik Kim oshdi savdosi tez orada boshlanadi. Ungacha katalogimizdagi mahsulotlarni ko'rib chiqishingiz mumkin.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => onNavigate('catalog')}
              className="px-5 py-2.5 rounded-2xl bg-[#2563EB] hover:bg-blue-700 text-white text-sm font-semibold transition-colors"
            >
              Katalogga o'tish
            </button>
            {isAdminAuthorized && (
              <button
                type="button"
                onClick={() => onNavigate('admin_auctions')}
                className="px-5 py-2.5 rounded-2xl bg-white/80 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white text-sm font-semibold hover:bg-white transition-colors"
              >
                Yangi auksion yaratish
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
          {/* LEFT: Hero Showcase Frosted Glass Card (7 cols) */}
          <div className={`${GLASS_CARD_CLASS} lg:col-span-7 p-5 sm:p-7 space-y-6`}>
            {/* High-Res Product Stage */}
            <div className="relative aspect-[4/3] w-full rounded-2xl overflow-hidden bg-gradient-to-br from-slate-50 via-white to-blue-50/40 dark:from-slate-800 dark:to-slate-900 border border-white/80 dark:border-slate-700/70">
              <SafeImage
                src={activeAuction.imageUrl}
                alt={activeAuction.title}
                fallbackLabel={activeAuction.title}
                className="w-full h-full object-cover"
              />

              {/* Live polling indicator (genuine live 3s feed) */}
              <div className="absolute top-4 left-4 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/85 dark:bg-slate-900/85 backdrop-blur-xl border border-white/95 dark:border-slate-700 shadow-sm">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
                </span>
                <span className="text-xs font-bold tracking-wide text-slate-900 dark:text-white">
                  JONLI AUKSION
                </span>
              </div>

              {/* Bid count overlay */}
              <div className="absolute bottom-4 right-4 px-3.5 py-1.5 rounded-xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white/90 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-100 font-mono tabular-nums">
                {activeAuction.bidsCount} ta stavka
              </div>
            </div>

            {/* Product Details */}
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                {activeAuction.isUserSubmitted && activeAuction.sellerName && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-amber-400/15 border border-amber-400/40 text-amber-800 dark:text-amber-200 font-bold">
                    <Crown size={11} />
                    <span>VIP Sotuvchi: {activeAuction.sellerName}</span>
                  </span>
                )}
                <span>Boshlang'ich narx: <strong className="font-mono tabular-nums text-slate-700 dark:text-slate-200">{formatUzs(activeAuction.startPrice)}</strong></span>
                <span aria-hidden="true">·</span>
                <span>Minimal qadam: <strong className="font-mono tabular-nums text-slate-700 dark:text-slate-200">+{formatUzs(minStep)}</strong></span>
              </div>

              <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white leading-tight">
                {activeAuction.title}
              </h2>

              <p className="text-sm sm:text-[15px] text-slate-600 dark:text-slate-300 leading-relaxed">
                {activeAuction.description}
              </p>
            </div>

            {/* Countdown Timer Strip */}
            <div className="pt-5 border-t border-slate-200/70 dark:border-slate-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                  <Clock size={16} className={timer.isUrgent ? 'text-red-500' : 'text-blue-600 dark:text-blue-400'} />
                  <span>{timer.isEnded ? 'Auksion vaqti tugadi' : 'Tugashiga qolgan vaqt'}</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Oxirgi 30 soniyada stavka qo'yilsa, vaqt avtomatik +30s uzayadi.
                </p>
              </div>

              <div className="flex items-center gap-2 sm:gap-3 self-start sm:self-auto">
                <CountdownDigitBlock value={timer.hours} label="SOAT" urgent={timer.isUrgent} />
                <span className="font-mono text-xl font-bold text-slate-400 pb-5">:</span>
                <CountdownDigitBlock value={timer.minutes} label="DAQIQA" urgent={timer.isUrgent} />
                <span className="font-mono text-xl font-bold text-slate-400 pb-5">:</span>
                <CountdownDigitBlock value={timer.seconds} label="SONIYA" urgent={timer.isUrgent} />
              </div>
            </div>

            <AnimatePresence>
              {antiSnipeNotice && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="p-3.5 rounded-2xl bg-amber-50/90 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-700/60 text-xs font-medium text-amber-900 dark:text-amber-200 flex items-center gap-2.5"
                >
                  <Sparkles size={16} className="shrink-0 text-amber-600 dark:text-amber-400" />
                  <span>Anti-Sniping faollashdi! Oxirgi 30 soniyadagi stavka sababli taymer +30 soniyaga uzaytirildi.</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* RIGHT: Bidding Panel + Live Feed (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            {/* Current Price & Interactive Bidding Card */}
            <div className={`${GLASS_CARD_CLASS} p-5 sm:p-6 space-y-5`}>
              {/* Current Price Display */}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    Joriy eng yuqori narx
                  </p>
                  <motion.p
                    key={activeAuction.currentPrice}
                    initial={{ scale: 0.96, opacity: 0.6 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.2 }}
                    className="font-mono tabular-nums text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight mt-1"
                  >
                    {formatUzs(activeAuction.currentPrice)}
                  </motion.p>
                </div>

                {isCurrentUserLeading && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-bold shrink-0">
                    <CheckCircle2 size={14} />
                    <span>Siz yetakchisiz</span>
                  </div>
                )}
              </div>

              {/* Current Leader Row */}
              <div className="flex items-center justify-between gap-3 py-3 px-4 rounded-2xl bg-white/75 dark:bg-slate-800/70 border border-white/90 dark:border-slate-700/70">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      isCurrentUserLeading
                        ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                        : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                    }`}
                  >
                    <Crown size={18} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-slate-500 dark:text-slate-400">Hozirgi yetakchi</p>
                    <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                      {activeAuction.highestBidderName
                        ? `${activeAuction.highestBidderName}${isCurrentUserLeading ? ' (Siz)' : ''}`
                        : "Hali stavka qo'yilmagan — birinchi bo'ling!"}
                    </p>
                  </div>
                </div>
                <span className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400 shrink-0">
                  Keyingi min: {formatUzs(minNextBid)}
                </span>
              </div>

              {/* Quick-Bid Glass Buttons */}
              <div className="space-y-2.5">
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                  Tezkor stavka qo'shish
                </p>
                <div className="grid grid-cols-3 gap-2.5">
                  {quickIncrements.map((step) => {
                    const target = activeAuction.currentPrice + step;
                    return (
                      <button
                        key={step}
                        type="button"
                        disabled={placingBid || timer.isEnded}
                        onClick={() => submitBid(target)}
                        className="group py-3 px-2 rounded-2xl bg-white/80 dark:bg-slate-800/80 hover:bg-blue-50 dark:hover:bg-blue-950/60 border border-white/95 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-500/50 shadow-sm transition-all disabled:opacity-50 text-center"
                      >
                        <span className="block font-mono tabular-nums text-xs sm:text-sm font-bold text-[#2563EB] dark:text-blue-400">
                          +{step.toLocaleString('ru-RU')}
                        </span>
                        <span className="block text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400 mt-0.5">
                          {target.toLocaleString('ru-RU')}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Custom Bid Form */}
              <form onSubmit={handleCustomBidSubmit} className="space-y-3">
                <div className="relative">
                  <input
                    type="number"
                    min={minNextBid}
                    step={1000}
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                    placeholder={`Masalan: ${minNextBid}`}
                    aria-label="O'z stavkangiz summasi (so'm)"
                    className="w-full h-12 pl-4 pr-16 rounded-2xl bg-white/85 dark:bg-slate-800/85 border border-slate-200/90 dark:border-slate-700 text-slate-900 dark:text-white font-mono tabular-nums text-sm font-semibold placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/40 focus:border-[#2563EB]"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                    so'm
                  </span>
                </div>

                {currentUser ? (
                  <button
                    type="submit"
                    disabled={placingBid || timer.isEnded}
                    className="w-full h-12 rounded-2xl bg-[#2563EB] hover:bg-blue-700 active:scale-[0.99] text-white font-semibold text-sm shadow-lg shadow-blue-600/25 transition-all flex items-center justify-center gap-2 disabled:opacity-55"
                  >
                    {placingBid ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        <span>Stavka yuborilmoqda...</span>
                      </>
                    ) : (
                      <>
                        <Gavel size={18} />
                        <span>
                          Stavka qo'yish (
                          {formatUzs(
                            Number(customAmount) >= minNextBid
                              ? Number(customAmount)
                              : minNextBid
                          )}
                          )
                        </span>
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={onRequireLogin}
                    className="w-full h-12 rounded-2xl bg-[#2563EB] hover:bg-blue-700 text-white font-semibold text-sm shadow-lg shadow-blue-600/25 transition-all flex items-center justify-center gap-2"
                  >
                    <LogIn size={18} />
                    <span>Stavka qo'yish uchun tizimga kiring</span>
                  </button>
                )}
              </form>

              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 pt-1">
                <ShieldCheck size={15} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>G'olibga mahsulot auksiondagi yakuniy narxda kafolat bilan rasmiylashtiriladi.</span>
              </div>
            </div>

            {/* Live Bid History Feed (Latest 10 Bids, 3s polling) */}
            <div className={`${GLASS_CARD_CLASS} p-5 sm:p-6 space-y-4`}>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <TrendingUp size={17} className="text-blue-600 dark:text-blue-400" />
                  <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
                    Jonli stavkalar tarixi
                  </h3>
                </div>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Har 3 soniyada yangilanadi
                </span>
              </div>

              {!activeAuction.latestBids || activeAuction.latestBids.length === 0 ? (
                <div className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                  Hozircha stavkalar yo'q. Birinchi stavkani qo'yib yetakchiga aylaning!
                </div>
              ) : (
                <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
                  <AnimatePresence initial={false}>
                    {activeAuction.latestBids.map((bid, idx) => {
                      const isTop = idx === 0;
                      const isMine =
                        currentUser &&
                        (bid.userId === currentUser.telegramId ||
                          bid.userId === currentUser.phoneNumber);
                      return (
                        <motion.div
                          key={bid.id}
                          layout
                          initial={{ opacity: 0, x: -16 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 16 }}
                          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                          className={`flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-2xl border ${
                            isTop
                              ? 'bg-emerald-50/80 dark:bg-emerald-950/35 border-emerald-200/80 dark:border-emerald-700/50'
                              : 'bg-white/70 dark:bg-slate-800/60 border-white/85 dark:border-slate-700/60'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span
                              className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-mono font-bold shrink-0 ${
                                isTop
                                  ? 'bg-emerald-500 text-white'
                                  : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                              }`}
                            >
                              {isTop ? <Crown size={14} /> : idx + 1}
                            </span>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                                {bid.userName}
                                {isMine && (
                                  <span className="ml-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                                    (Siz)
                                  </span>
                                )}
                              </p>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                {formatRelativeUzTime(bid.createdAt, nowMs)}
                              </p>
                            </div>
                          </div>

                          <span
                            className={`font-mono tabular-nums text-sm font-bold shrink-0 ${
                              isTop
                                ? 'text-emerald-700 dark:text-emerald-300'
                                : 'text-slate-800 dark:text-slate-200'
                            }`}
                          >
                            {formatUzs(bid.amount)}
                          </span>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Recently Ended Auctions (Transparency Row) */}
      {recentEnded.length > 0 && (
        <div className="mt-8 pt-6 border-t border-slate-200/70 dark:border-slate-800">
          <div className="flex items-center justify-between gap-2 mb-4">
            <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white">
              Yaqinda yakunlangan auksionlar
            </h3>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Oxirgi natijalar
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {recentEnded.map((auc) => (
              <div
                key={auc.id}
                className={`${GLASS_CARD_CLASS} p-4 flex items-center gap-3.5`}
              >
                <div className="w-16 h-16 rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0">
                  <SafeImage
                    src={auc.imageUrl}
                    alt={auc.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                    {auc.title}
                  </p>
                  <p className="font-mono tabular-nums text-sm font-bold text-blue-600 dark:text-blue-400 mt-0.5">
                    {formatUzs(auc.currentPrice)}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                    G'olib: {auc.highestBidderName || 'Aniqlanmadi'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Real Users Top Rating Section */}
      <RealAuctionLeaderboard
        safeFetchJSON={safeFetchJSON}
        currentUserId={currentUser?.telegramId}
      />

      {/* VIP Seller Weekly Submission Modal */}
      <VipSellerSubmitModal
        isOpen={isSubmitModalOpen}
        onClose={() => setIsSubmitModalOpen(false)}
        currentUser={currentUser}
        quota={sellerQuota}
        onRequireLogin={onRequireLogin}
        onOpenVipModal={onOpenVipModal}
        onSubmitted={() => {
          loadSellerQuota();
          fetchActiveAuctions(true);
        }}
        notify={notify}
        safeFetchJSON={safeFetchJSON}
      />
    </div>
  );
};

// ================= 2. USER CABINET: "MENING AUKSIONLARIM" =================

interface MyAuctionsViewProps {
  currentUser: User;
  onBack: () => void;
  onNavigate: (view: View) => void;
  onClaimWonAuction: (auction: Auction) => void;
  onOpenVipModal?: () => void;
  notify: (msg: string, type?: 'success' | 'error' | 'info') => void;
  safeFetchJSON: (url: string, options?: RequestInit) => Promise<any>;
}

export const MyAuctionsView: React.FC<MyAuctionsViewProps> = ({
  currentUser,
  onBack,
  onNavigate,
  onClaimWonAuction,
  onOpenVipModal,
  notify,
  safeFetchJSON
}) => {
  const [activeBids, setActiveBids] = useState<UserActiveBidEntry[]>([]);
  const [wonAuctions, setWonAuctions] = useState<UserWonAuctionEntry[]>([]);
  const [myListings, setMyListings] = useState<Auction[]>([]);
  const [sellerPayouts, setSellerPayouts] = useState<SellerPayout[]>([]);
  const [wallet, setWallet] = useState<SellerWalletSummary>({
    yellowBalance: 0,
    blueBalance: 0,
    withdrawRequestedBalance: 0,
    totalPaidOut: 0,
    totalEarned: 0
  });
  const [sellerQuota, setSellerQuota] = useState<UserSellerQuota | null>(null);
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [withdrawingId, setWithdrawingId] = useState<string | null>(null);
  const [confirmingReceiptId, setConfirmingReceiptId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [rebiddingId, setRebiddingId] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState<number>(0);

  const loadMyAuctions = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      try {
        const res = await safeFetchJSON(
          `/api/user/auctions?userId=${encodeURIComponent(currentUser.telegramId)}`,
          {
            headers: { 'x-user-id': currentUser.telegramId }
          }
        );
        setActiveBids(Array.isArray(res?.activeBids) ? res.activeBids : []);
        setWonAuctions(Array.isArray(res?.wonAuctions) ? res.wonAuctions : []);
        setMyListings(Array.isArray(res?.myListings) ? res.myListings : []);
        setSellerPayouts(Array.isArray(res?.sellerPayouts) ? res.sellerPayouts : []);
        if (res?.wallet) setWallet(res.wallet);
        if (res?.sellerQuota) setSellerQuota(res.sellerQuota);
      } catch (err: any) {
        if (!silent) {
          notify(err?.message || "Auksionlaringizni yuklashda xatolik", 'error');
        }
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [currentUser.telegramId, safeFetchJSON, notify]
  );

  const handleWithdrawPayout = async (payoutId: string) => {
    setWithdrawingId(payoutId);
    try {
      await safeFetchJSON(`/api/user/seller-payouts/${payoutId}/withdraw`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.telegramId
        },
        body: JSON.stringify({ userId: currentUser.telegramId })
      });
      notify("Chiqarib olish so'rovi adminga SMS orqali yuborildi! Tez orada kartangizga o'tkaziladi.", 'success');
      await loadMyAuctions(true);
    } catch (err: any) {
      notify(err?.message || "Chiqarib olishda xatolik yuz berdi", 'error');
    } finally {
      setWithdrawingId(null);
    }
  };

  const handleConfirmReceipt = async (auctionId: string) => {
    setConfirmingReceiptId(auctionId);
    try {
      await safeFetchJSON(`/api/auctions/${auctionId}/confirm-receipt`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.telegramId
        },
        body: JSON.stringify({ userId: currentUser.telegramId })
      });
      notify("Tovarni olganingiz adminga xabar qilindi! Rahmat!", 'success');
      await loadMyAuctions(true);
    } catch (err: any) {
      notify(err?.message || "Xabar yuborishda xatolik", 'error');
    } finally {
      setConfirmingReceiptId(null);
    }
  };

  useEffect(() => {
    loadMyAuctions(false);
    const poll = setInterval(() => loadMyAuctions(true), 5000);
    const tick = setInterval(() => setNowMs(Date.now()), 1000);
    return () => {
      clearInterval(poll);
      clearInterval(tick);
    };
  }, [loadMyAuctions]);

  const handleQuickRebid = async (entry: UserActiveBidEntry) => {
    const nextAmount = entry.auction.currentPrice + (entry.auction.minStep || 5000);
    setRebiddingId(entry.auction.id);
    try {
      await safeFetchJSON(`/api/auctions/${entry.auction.id}/bid`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.telegramId
        },
        body: JSON.stringify({
          userId: currentUser.telegramId,
          amount: nextAmount
        })
      });
      notify(`Qayta stavka qo'yildi: ${formatUzs(nextAmount)}! Endi siz yetakchisiz`, 'success');
      triggerPushPermissionPrompt('bid');
      await loadMyAuctions(true);
    } catch (err: any) {
      notify(err?.message || "Qayta stavka qo'yishda xatolik", 'error');
      loadMyAuctions(true);
    } finally {
      setRebiddingId(null);
    }
  };

  return (
    <div className="relative isolate rounded-[32px] bg-[#FFFFFF]/80 dark:bg-[#0B1120]/70 border border-white/80 dark:border-slate-800/80 p-4 sm:p-6 lg:p-8 space-y-8 overflow-hidden">
      <GlassBackdropOrbs />

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-slate-200/70 dark:border-slate-800">
        <div className="flex items-center gap-3.5">
          <button
            type="button"
            onClick={onBack}
            className="p-2.5 bg-white/80 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 rounded-xl hover:bg-white dark:hover:bg-slate-700 transition-colors"
            aria-label="Orqaga"
          >
            <ChevronLeft size={18} />
          </button>
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
              Mening auksionlarim
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Faol stavkalaringiz va yutib olgan tovarlaringiz
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setIsSubmitModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-slate-950 text-sm font-bold shadow-md shadow-amber-500/20 hover:brightness-105 transition-all whitespace-nowrap shrink-0"
          >
            <PackagePlus size={16} />
            <span>Tovar qo'shish (VIP)</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate('auction')}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#2563EB] hover:bg-blue-700 text-white text-sm font-semibold shadow-md shadow-blue-600/20 transition-colors whitespace-nowrap shrink-0"
          >
            <Gavel size={16} />
            <span>Jonli auksionga o'tish</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className={`${GLASS_CARD_CLASS} p-12 flex flex-col items-center justify-center`}>
          <Loader2 size={28} className="animate-spin text-blue-600 mb-3" />
          <p className="text-sm text-slate-500 dark:text-slate-400">Ma'lumotlar yuklanmoqda...</p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Seller Escrow Balance (Yellow -> Blue -> Withdraw) */}
          <section className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Wallet size={20} className="text-blue-600 dark:text-blue-400" />
                <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white">
                  Sotuvchi hisobim (Sariq / Ko'k balans)
                </h2>
              </div>
              {sellerQuota && (
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                  {sellerQuota.isVip
                    ? sellerQuota.canSubmitNow
                      ? '✅ Bu hafta tovar joylash ruxsati ochiq'
                      : `⏳ Keyingi joylash: ${sellerQuota.daysRemaining} kundan so'ng`
                    : '🔒 Tovar joylash faqat VIP a’zolar uchun'}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* YELLOW ESCROW */}
              <div className="rounded-3xl p-5 bg-amber-50/85 dark:bg-amber-950/35 backdrop-blur-xl border-2 border-amber-300/90 dark:border-amber-500/50 shadow-sm space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold text-amber-800 dark:text-amber-300">
                  <span>🟡 Sariq hisob (Kutilmoqda)</span>
                  <Clock size={15} />
                </div>
                <p className="font-mono tabular-nums text-2xl font-extrabold text-amber-700 dark:text-amber-300">
                  {formatUzs(wallet.yellowBalance)}
                </p>
                <p className="text-[11px] text-amber-800/80 dark:text-amber-200/75">
                  Xaridor tovarni olib adminga tasdiqlagach ko'k bo'ladi
                </p>
              </div>

              {/* BLUE AVAILABLE */}
              <div className="rounded-3xl p-5 bg-blue-50/85 dark:bg-blue-950/35 backdrop-blur-xl border-2 border-blue-400/90 dark:border-blue-500/55 shadow-sm space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold text-blue-800 dark:text-blue-300">
                  <span>🔵 Ko'k hisob (Tayyor!)</span>
                  <ShieldCheck size={15} />
                </div>
                <p className="font-mono tabular-nums text-2xl font-extrabold text-blue-700 dark:text-blue-300">
                  {formatUzs(wallet.blueBalance)}
                </p>
                <p className="text-[11px] text-blue-800/80 dark:text-blue-200/75">
                  Chiqarib olishni bossangiz adminga SMS boradi
                </p>
              </div>

              {/* WITHDRAW REQUESTED */}
              <div className={`${GLASS_CARD_CLASS} p-5 space-y-1.5`}>
                <div className="flex items-center justify-between text-xs font-semibold text-rose-600 dark:text-rose-400">
                  <span>🔔 So'rov yuborilgan</span>
                  <BellRing size={15} />
                </div>
                <p className="font-mono tabular-nums text-2xl font-extrabold text-slate-900 dark:text-white">
                  {formatUzs(wallet.withdrawRequestedBalance)}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Admin kartangizga o'tkazmoqda
                </p>
              </div>

              {/* PAID OUT */}
              <div className={`${GLASS_CARD_CLASS} p-5 space-y-1.5`}>
                <div className="flex items-center justify-between text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  <span>✅ Yechib olingan</span>
                  <CheckCircle2 size={15} />
                </div>
                <p className="font-mono tabular-nums text-2xl font-extrabold text-slate-900 dark:text-white">
                  {formatUzs(wallet.totalPaidOut)}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Kartangizga o'tkazib berilgan jami summa
                </p>
              </div>
            </div>

            {/* Individual Seller Payout Items */}
            {sellerPayouts.length > 0 && (
              <div className="space-y-3">
                {sellerPayouts.map((p) => {
                  const isYellow = p.status === 'YELLOW_PENDING';
                  const isBlue = p.status === 'BLUE_AVAILABLE';
                  const isReq = p.status === 'WITHDRAW_REQUESTED';
                  const isPaid = p.status === 'PAID';
                  return (
                    <div
                      key={p.id}
                      className={`rounded-3xl p-4 sm:p-5 backdrop-blur-xl border flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                        isYellow
                          ? 'bg-amber-50/75 dark:bg-amber-950/25 border-amber-300/80 dark:border-amber-500/40'
                          : isBlue
                          ? 'bg-blue-50/80 dark:bg-blue-950/30 border-blue-400/80 dark:border-blue-500/50'
                          : 'yuyu-glass'
                      }`}
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="w-16 h-16 rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0">
                          <SafeImage src={p.auctionImage} alt={p.auctionTitle} className="w-full h-full object-cover" />
                        </div>
                        <div className="min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            {isYellow && (
                              <span className="px-2.5 py-0.5 rounded-lg bg-amber-400/25 text-amber-900 dark:text-amber-200 text-[11px] font-bold">
                                🟡 SARIQ · Xaridor tasdig'i kutilmoqda
                              </span>
                            )}
                            {isBlue && (
                              <span className="px-2.5 py-0.5 rounded-lg bg-blue-600 text-white text-[11px] font-bold">
                                🔵 KO'K · Chiqarib olishga tayyor!
                              </span>
                            )}
                            {isReq && (
                              <span className="px-2.5 py-0.5 rounded-lg bg-rose-500/15 text-rose-700 dark:text-rose-300 text-[11px] font-bold">
                                🔔 Adminga SMS yuborildi · O'tkazilmoqda
                              </span>
                            )}
                            {isPaid && (
                              <span className="px-2.5 py-0.5 rounded-lg bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold">
                                ✅ Kartangizga o'tkazildi
                              </span>
                            )}
                          </div>
                          <p className="font-display font-bold text-sm sm:text-base text-slate-900 dark:text-white truncate">
                            {p.auctionTitle}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 font-mono flex items-center gap-1.5">
                            <CreditCard size={12} />
                            <span>{p.sellerCardNumber}</span>
                            <span>· Xaridor: {p.buyerName}</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-between md:justify-end gap-3 shrink-0">
                        <span
                          className={`font-mono tabular-nums text-lg font-extrabold ${
                            isYellow
                              ? 'text-amber-700 dark:text-amber-300'
                              : isBlue
                              ? 'text-blue-700 dark:text-blue-300'
                              : isPaid
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-slate-900 dark:text-white'
                          }`}
                        >
                          {formatUzs(p.amount)}
                        </span>

                        {isBlue && (
                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.97 }}
                            type="button"
                            disabled={withdrawingId === p.id}
                            onClick={() => handleWithdrawPayout(p.id)}
                            className="px-4 py-2.5 rounded-2xl bg-[#2563EB] hover:bg-blue-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-blue-600/25 flex items-center gap-1.5 transition-colors disabled:opacity-60"
                          >
                            {withdrawingId === p.id ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : (
                              <Send size={14} />
                            )}
                            <span>Chiqarib olish</span>
                          </motion.button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* My Submitted VIP Auction Listings */}
          {myListings.length > 0 && (
            <section className="space-y-4">
              <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white">
                Auksionga qo'ygan mahsulotlarim ({myListings.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {myListings.map((item) => (
                  <div key={item.id} className={`${GLASS_CARD_CLASS} p-4 flex gap-4`}>
                    <div className="w-20 h-20 rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0">
                      <SafeImage src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" />
                    </div>
                    <div className="min-w-0 flex-1 space-y-1">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[11px] font-bold ${
                          item.status === 'PENDING_APPROVAL'
                            ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
                            : item.status === 'LIVE'
                            ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                            : item.status === 'REJECTED'
                            ? 'bg-red-500/15 text-red-700 dark:text-red-300'
                            : 'bg-blue-500/15 text-blue-700 dark:text-blue-300'
                        }`}
                      >
                        {item.status === 'PENDING_APPROVAL'
                          ? "⏳ Admin tasdig'ini kutmoqda"
                          : item.status === 'LIVE'
                          ? '🔴 Jonli auksionda'
                          : item.status === 'REJECTED'
                          ? '❌ Rad etilgan'
                          : item.status === 'ENDED'
                          ? '🏁 Yakunlangan'
                          : 'Bekor qilingan'}
                      </span>
                      <h3 className="font-display text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate">
                        {item.title}
                      </h3>
                      <p className="font-mono tabular-nums text-sm font-bold text-blue-600 dark:text-blue-400">
                        {formatUzs(item.currentPrice)} · {item.bidsCount} stavka
                      </p>
                      {item.rejectReason && (
                        <p className="text-xs text-red-600 dark:text-red-400">{item.rejectReason}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
          {/* Active Bids Section */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white">
                Faol stavkalarim ({activeBids.length})
              </h2>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Jonli kuzatuv
              </span>
            </div>

            {activeBids.length === 0 ? (
              <div className={`${GLASS_CARD_CLASS} p-8 text-center space-y-3`}>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  Siz hozircha faol auksionlarda stavka qo'ymagansiz.
                </p>
                <button
                  type="button"
                  onClick={() => onNavigate('auction')}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#2563EB] text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
                >
                  <span>Haftalik auksionni ko'rish</span>
                  <ArrowUpRight size={15} />
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {activeBids.map((entry) => {
                  const countdown = splitRemaining(entry.auction.endsAt, nowMs);
                  const nextMin = entry.auction.currentPrice + (entry.auction.minStep || 5000);
                  return (
                    <div
                      key={entry.auction.id}
                      className={`${GLASS_CARD_CLASS} p-5 flex flex-col justify-between gap-4`}
                    >
                      <div className="flex gap-4">
                        <div className="w-24 h-24 rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0">
                          <SafeImage
                            src={entry.auction.imageUrl}
                            alt={entry.auction.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="min-w-0 flex-1 space-y-1.5">
                          <div className="flex items-center gap-2">
                            {entry.isLeading ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-bold">
                                <CheckCircle2 size={13} />
                                <span>Siz yetakchisiz!</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-red-500/15 border border-red-500/30 text-red-700 dark:text-red-300 text-xs font-bold">
                                <AlertCircle size={13} />
                                <span>Narxingiz oshirildi!</span>
                              </span>
                            )}
                          </div>

                          <h3 className="font-display text-base font-bold text-slate-900 dark:text-white line-clamp-2">
                            {entry.auction.title}
                          </h3>

                          <p className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
                            Qolgan vaqt: {countdown.hours}:{countdown.minutes}:{countdown.seconds}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-200/70 dark:border-slate-700/60">
                        <div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            Sizning stavkangiz
                          </p>
                          <p className="font-mono tabular-nums text-sm font-bold text-slate-800 dark:text-slate-200">
                            {formatUzs(entry.myHighestBid)}
                          </p>
                        </div>
                        <div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            Joriy eng yuqori
                          </p>
                          <p className="font-mono tabular-nums text-sm font-bold text-blue-600 dark:text-blue-400">
                            {formatUzs(entry.auction.currentPrice)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5">
                        {!entry.isLeading && (
                          <button
                            type="button"
                            disabled={rebiddingId === entry.auction.id}
                            onClick={() => handleQuickRebid(entry)}
                            className="flex-1 py-2.5 px-4 rounded-2xl bg-[#2563EB] hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold shadow-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
                          >
                            {rebiddingId === entry.auction.id ? (
                              <Loader2 size={15} className="animate-spin" />
                            ) : (
                              <Gavel size={15} />
                            )}
                            <span>Qayta stavka qo'yish ({formatUzs(nextMin)})</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => onNavigate('auction')}
                          className={`py-2.5 px-4 rounded-2xl bg-white/80 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-xs sm:text-sm font-semibold hover:bg-white transition-colors ${
                            entry.isLeading ? 'w-full' : ''
                          }`}
                        >
                          Auksionni ochish
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Won Auctions Section */}
          <section className="space-y-4">
            <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white">
              Yutib olgan auksionlarim ({wonAuctions.length})
            </h2>

            {wonAuctions.length === 0 ? (
              <div className={`${GLASS_CARD_CLASS} p-8 text-center text-sm text-slate-500 dark:text-slate-400`}>
                Hozircha yutib olingan auksionlar mavjud emas.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {wonAuctions.map((win) => (
                  <div
                    key={win.auction.id}
                    className={`${GLASS_CARD_CLASS} p-5 space-y-4 border-emerald-200/90 dark:border-emerald-700/50`}
                  >
                    <div className="flex gap-4">
                      <div className="w-24 h-24 rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0">
                        <SafeImage
                          src={win.auction.imageUrl}
                          alt={win.auction.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-bold">
                          <Trophy size={13} />
                          <span>Tabriklaymiz, siz g'olibsiz!</span>
                        </span>
                        <h3 className="font-display text-base font-bold text-slate-900 dark:text-white line-clamp-2">
                          {win.auction.title}
                        </h3>
                        <p className="font-mono tabular-nums text-base font-extrabold text-emerald-700 dark:text-emerald-400">
                          Yutuq narxi: {formatUzs(win.winningAmount)}
                        </p>
                      </div>
                    </div>

                    {win.claimedOrderId ? (
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between gap-3 py-3 px-4 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800 text-xs font-semibold text-emerald-800 dark:text-emerald-200">
                          <span>Rasmiylashtirilgan · Buyurtma: {win.claimedOrderId}</span>
                          <button
                            type="button"
                            onClick={() => onNavigate('orders')}
                            className="underline hover:opacity-80 whitespace-nowrap"
                          >
                            Buyurtmalarim
                          </button>
                        </div>

                        {win.buyerConfirmedReceipt ? (
                          <div className="py-2.5 px-4 rounded-2xl bg-blue-50/80 dark:bg-blue-950/35 border border-blue-200/80 dark:border-blue-800 text-xs font-semibold text-blue-700 dark:text-blue-300 flex items-center gap-2">
                            <CheckCircle2 size={15} />
                            <span>"Tovarni oldim" deb adminga tasdiqlangan</span>
                          </div>
                        ) : (
                          <button
                            type="button"
                            disabled={confirmingReceiptId === win.auction.id}
                            onClick={() => handleConfirmReceipt(win.auction.id)}
                            className="w-full py-2.5 px-4 rounded-2xl bg-[#2563EB] hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold shadow-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
                          >
                            {confirmingReceiptId === win.auction.id ? (
                              <Loader2 size={15} className="animate-spin" />
                            ) : (
                              <CheckCircle2 size={15} />
                            )}
                            <span>Tovarni oldim (Adminga xabar berish)</span>
                          </button>
                        )}
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onClaimWonAuction(win.auction)}
                        className="w-full py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold shadow-md shadow-emerald-600/20 transition-colors flex items-center justify-center gap-2"
                      >
                        <Trophy size={16} />
                        <span>Yutuqni rasmiylashtirish</span>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      <VipSellerSubmitModal
        isOpen={isSubmitModalOpen}
        onClose={() => setIsSubmitModalOpen(false)}
        currentUser={currentUser}
        quota={sellerQuota}
        onRequireLogin={() => onNavigate('auth')}
        onOpenVipModal={onOpenVipModal}
        onSubmitted={() => loadMyAuctions(true)}
        notify={notify}
        safeFetchJSON={safeFetchJSON}
      />
    </div>
  );
};

// ================= 3. ADMIN PANEL: "AUKSION BOSHQARUVI" =================

interface AdminAuctionsViewProps {
  onBack: () => void;
  onNavigate?: (view: View) => void;
  notify: (msg: string, type?: 'success' | 'error' | 'info') => void;
  safeFetchJSON: (url: string, options?: RequestInit) => Promise<any>;
  sendTelegramNotification?: (msg: string) => void;
}

export const AdminAuctionsView: React.FC<AdminAuctionsViewProps> = ({
  onBack,
  onNavigate,
  notify,
  safeFetchJSON,
  sendTelegramNotification
}) => {
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<
    'ALL' | 'PENDING_APPROVAL' | 'LIVE' | 'ENDED' | 'CANCELLED'
  >('ALL');

  // Create form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState(AUCTION_PRESET_IMAGES[0].url);
  const [startPrice, setStartPrice] = useState('10000');
  const [minStep, setMinStep] = useState('5000');
  const [durationHours, setDurationHours] = useState<number>(24);
  const [creating, setCreating] = useState(false);
  const [uploadingImg, setUploadingImg] = useState(false);

  // Action & Bid History Modal state
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [historyAuction, setHistoryAuction] = useState<Auction | null>(null);
  const [historyBids, setHistoryBids] = useState<AuctionBid[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const loadAdminAuctions = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      try {
        const res = await safeFetchJSON('/api/admin/auctions');
        setAuctions(Array.isArray(res?.auctions) ? res.auctions : []);
      } catch (err: any) {
        if (!silent) {
          notify(err?.message || "Auksionlar ro'yxatini yuklashda xatolik", 'error');
        }
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [safeFetchJSON, notify]
  );

  useEffect(() => {
    loadAdminAuctions(false);
    const interval = setInterval(() => loadAdminAuctions(true), 8000);
    return () => clearInterval(interval);
  }, [loadAdminAuctions]);

  const handleImageFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImg(true);
    try {
      const compressed = await compressImageFile(file);
      setImageUrl(compressed);
      notify('Rasm yuklandi va optimallashtirildi', 'success');
    } catch (err: any) {
      notify(err?.message || 'Rasmni yuklashda xatolik', 'error');
    } finally {
      setUploadingImg(false);
    }
  };

  const handleCreateAuction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim().length < 3) {
      notify('Mahsulot nomini kiriting (kamida 3 ta belgi)', 'error');
      return;
    }
    if (!imageUrl.trim()) {
      notify('Iltimos, mahsulot rasmini yuklang yoki URL kiriting', 'error');
      return;
    }

    setCreating(true);
    try {
      const res = await safeFetchJSON('/api/admin/auctions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          imageUrl: imageUrl.trim(),
          startPrice: Number(startPrice) || 10000,
          minStep: Number(minStep) || 5000,
          durationHours
        })
      });
      if (res?.auction) {
        setAuctions((prev) => [res.auction, ...prev]);
        setTitle('');
        setDescription('');
        notify('Yangi jonli auksion muvaffaqiyatli boshlandi!', 'success');
        if (sendTelegramNotification) {
          sendTelegramNotification(
            `🔨 *YUYU Shop Yangi Auksion Boshlandi!*\n📦 ${res.auction.title}\n💰 Boshlang'ich narx: ${formatUzs(res.auction.startPrice)}\n⏱ Davomiyligi: ${durationHours} soat`
          );
        }
      }
    } catch (err: any) {
      notify(err?.message || 'Auksion yaratishda xatolik', 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleStatusChange = async (auction: Auction, status: 'ENDED' | 'CANCELLED') => {
    setUpdatingId(auction.id);
    try {
      const res = await safeFetchJSON(`/api/admin/auctions/${auction.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (res?.auction) {
        setAuctions((prev) => prev.map((a) => (a.id === auction.id ? res.auction : a)));
        notify(
          status === 'ENDED'
            ? `Auksion yakunlandi! G'olib: ${res.auction.highestBidderName || 'Topilmadi'}`
            : 'Auksion bekor qilindi',
          status === 'ENDED' ? 'success' : 'info'
        );
      }
    } catch (err: any) {
      notify(err?.message || 'Holatni yangilashda xatolik', 'error');
    } finally {
      setUpdatingId(null);
    }
  };

  const openBidHistory = async (auction: Auction) => {
    setHistoryAuction(auction);
    setHistoryBids([]);
    setHistoryLoading(true);
    try {
      const res = await safeFetchJSON(`/api/admin/auctions/${auction.id}/bids`);
      setHistoryBids(Array.isArray(res?.bids) ? res.bids : []);
    } catch (err: any) {
      notify(err?.message || 'Stavkalar tarixini yuklashda xatolik', 'error');
    } finally {
      setHistoryLoading(false);
    }
  };

  const filteredAuctions = useMemo(() => {
    if (filterStatus === 'ALL') return auctions;
    return auctions.filter((a) => a.status === filterStatus);
  }, [auctions, filterStatus]);

  const liveCount = auctions.filter((a) => a.status === 'LIVE').length;
  const endedCount = auctions.filter((a) => a.status === 'ENDED').length;
  const pendingApprovalList = auctions.filter((a) => a.status === 'PENDING_APPROVAL');

  const handleApprovalDecision = async (aucId: string, approve: boolean) => {
    setUpdatingId(aucId);
    try {
      await safeFetchJSON(`/api/admin/auctions/${aucId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: approve ? 'LIVE' : 'REJECTED',
          ...(approve ? {} : { rejectReason: 'Admin tomonidan tasdiqlanmadi' })
        })
      });
      notify(
        approve
          ? "VIP sotuvchi auksioni tasdiqlandi va jonli efirga chiqarildi!"
          : "Ariza rad etildi",
        approve ? 'success' : 'info'
      );
      await loadAdminAuctions(true);
    } catch (err: any) {
      notify(err?.message || "Holatni yangilashda xatolik", 'error');
    } finally {
      setUpdatingId(null);
    }
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
            aria-label="Orqaga"
          >
            <ChevronLeft size={18} />
          </button>
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
              Auksion boshqaruvi
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Tasdiq kutmoqda: {pendingApprovalList.length} · Jonli: {liveCount} · Yakunlangan: {endedCount}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onNavigate && (
            <button
              type="button"
              onClick={() => onNavigate('admin_seller_payouts')}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white text-sm font-semibold shadow-sm transition-colors"
            >
              <Wallet size={15} />
              <span>Sotuvchi to'lovlari (Sariq/Ko'k)</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => loadAdminAuctions(false)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl yuyu-glass-subtle text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-white/85 dark:hover:bg-slate-800/80 transition-colors"
          >
            <RefreshCw size={15} />
            <span>Yangilash</span>
          </button>
        </div>
      </div>

      {/* Pending VIP Seller Listings Approval Queue */}
      {pendingApprovalList.length > 0 && (
        <section className={`${GLASS_CARD_CLASS} p-5 sm:p-6 border-amber-300/90 dark:border-amber-500/45 space-y-4`}>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-400/20 text-amber-600 dark:text-amber-300 flex items-center justify-center">
              <Crown size={20} />
            </div>
            <div>
              <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                Tasdiqlashni kutayotgan VIP sotuvchi auksionlari ({pendingApprovalList.length})
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Tasdiqlasangiz darhol jonli auksionda paydo bo'ladi
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {pendingApprovalList.map((auc) => (
              <div
                key={auc.id}
                className="p-4 rounded-2xl bg-white/70 dark:bg-slate-800/70 border border-white/90 dark:border-slate-700/70 space-y-3"
              >
                <div className="flex gap-3.5">
                  <div className="w-20 h-20 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0">
                    <SafeImage src={auc.imageUrl} alt={auc.title} className="w-full h-full object-cover" />
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md bg-amber-400/20 text-amber-800 dark:text-amber-300 text-[10px] font-bold">
                        {auc.sellerVipTier || 'VIP'}
                      </span>
                      <span className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400">
                        {formatUzs(auc.startPrice)}
                      </span>
                    </div>
                    <h3 className="font-display font-bold text-sm text-slate-900 dark:text-white line-clamp-1">
                      {auc.title}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Sotuvchi: <strong className="text-slate-800 dark:text-slate-200">{auc.sellerName}</strong> ({auc.sellerPhone})
                    </p>
                    <p className="text-xs font-mono text-slate-600 dark:text-slate-300">
                      Karta: {auc.sellerCardNumber || '—'} ({auc.sellerCardHolder})
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={updatingId === auc.id}
                    onClick={() => handleApprovalDecision(auc.id, true)}
                    className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-60"
                  >
                    {updatingId === auc.id ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                    <span>Tasdiqlash (Jonli chiqarish)</span>
                  </button>
                  <button
                    type="button"
                    disabled={updatingId === auc.id}
                    onClick={() => handleApprovalDecision(auc.id, false)}
                    className="py-2 px-3 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 text-xs font-bold flex items-center gap-1 disabled:opacity-60"
                  >
                    <XCircle size={14} />
                    <span>Rad etish</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Create New Auction Form */}
      <section className={`${GLASS_CARD_CLASS} p-5 sm:p-7`}>
        <div className="flex items-center gap-2.5 mb-6">
          <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <Plus size={20} />
          </div>
          <div>
            <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
              Yangi jonli auksion boshlash
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Yaratilgan zahoti /auction sahifasida JONLI holatda ishga tushadi
            </p>
          </div>
        </div>

        <form onSubmit={handleCreateAuction} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Fields (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Mahsulot nomi
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Masalan: Apple Watch Ultra Titanium Edition"
                className="w-full h-11 px-4 rounded-xl bg-white/90 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Mahsulot tavsifi
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Tovar xususiyatlari, holati va yetkazib berish shartlarini qisqacha yozing..."
                className="w-full p-3.5 rounded-xl bg-white/90 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 resize-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Boshlang'ich narx (so'm)
                </label>
                <input
                  type="number"
                  min={1000}
                  step={1000}
                  required
                  value={startPrice}
                  onChange={(e) => setStartPrice(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl bg-white/90 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 text-sm font-mono tabular-nums font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Minimal qadam (so'm)
                </label>
                <input
                  type="number"
                  min={1000}
                  step={1000}
                  required
                  value={minStep}
                  onChange={(e) => setMinStep(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl bg-white/90 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 text-sm font-mono tabular-nums font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Davomiyligi
                </label>
                <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-slate-100/90 dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700">
                  {[12, 24, 48].map((hrs) => (
                    <button
                      key={hrs}
                      type="button"
                      onClick={() => setDurationHours(hrs)}
                      className={`h-9 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                        durationHours === hrs
                          ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      {hrs} soat
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right Image Uploader & Preview (5 cols) */}
          <div className="lg:col-span-5 flex flex-col justify-between gap-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Mahsulot rasmi
                </label>
                <div className="flex items-center gap-1.5">
                  {AUCTION_PRESET_IMAGES.map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => setImageUrl(preset.url)}
                      className="text-[11px] font-medium px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="aspect-[16/10] w-full rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 relative">
                {imageUrl ? (
                  <SafeImage
                    src={imageUrl}
                    alt="Auksion rasmi"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                    <ImageIcon size={28} />
                    <span className="text-xs mt-1">Rasm tanlanmagan</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <label className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 cursor-pointer shrink-0 transition-colors">
                  {uploadingImg ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <UploadCloud size={14} />
                  )}
                  <span>Qurilmadan yuklash</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageFile}
                    className="hidden"
                  />
                </label>
                <input
                  type="text"
                  value={imageUrl.startsWith('data:') ? '' : imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="yoki HTTPS rasm manzili..."
                  className="flex-1 h-10 px-3 rounded-xl bg-white/90 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={creating}
              className="w-full h-12 rounded-2xl bg-[#2563EB] hover:bg-blue-700 text-white text-sm font-semibold shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {creating ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>Ishga tushirilmoqda...</span>
                </>
              ) : (
                <>
                  <Gavel size={18} />
                  <span>Auksionni boshlash</span>
                </>
              )}
            </button>
          </div>
        </form>
      </section>

      {/* Live Monitor & Management Table */}
      <section className={`${GLASS_CARD_CLASS} p-5 sm:p-7 space-y-5`}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
            Auksionlar monitoringi
          </h2>

          <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100/90 dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700 overflow-x-auto no-scrollbar">
            {(
              [
                ['ALL', 'Barchasi'],
                ['PENDING_APPROVAL', 'Tasdiq kutmoqda'],
                ['LIVE', 'Jonli'],
                ['ENDED', 'Yakunlangan'],
                ['CANCELLED', 'Bekor qilingan']
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setFilterStatus(key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                  filterStatus === key
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="py-12 flex justify-center">
            <Loader2 size={26} className="animate-spin text-blue-600" />
          </div>
        ) : filteredAuctions.length === 0 ? (
          <div className="py-10 text-center text-sm text-slate-500 dark:text-slate-400">
            Bu toifada auksionlar topilmadi.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[780px]">
              <thead>
                <tr className="border-b border-slate-200/80 dark:border-slate-700/70 text-xs font-semibold text-slate-500 dark:text-slate-400">
                  <th className="py-3 pr-4">Mahsulot</th>
                  <th className="py-3 px-3">Holat</th>
                  <th className="py-3 px-3">Joriy narx</th>
                  <th className="py-3 px-3">Stavkalar</th>
                  <th className="py-3 px-3">Yetakchi / G'olib aloqasi</th>
                  <th className="py-3 pl-3 text-right">Boshqaruv</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/60 dark:divide-slate-800 text-sm">
                {filteredAuctions.map((auc) => (
                  <tr key={auc.id} className="hover:bg-white/50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-4 pr-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0">
                          <SafeImage
                            src={auc.imageUrl}
                            alt={auc.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="min-w-0 max-w-[230px]">
                          <p className="font-semibold text-slate-900 dark:text-white truncate">
                            {auc.title}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                            Tugash: {new Date(auc.endsAt).toLocaleString('uz-UZ')}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-3 whitespace-nowrap">
                      <span
                        className={`text-xs font-bold ${
                          auc.status === 'LIVE'
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : auc.status === 'ENDED'
                            ? 'text-blue-600 dark:text-blue-400'
                            : 'text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        {auc.status === 'LIVE'
                          ? 'JONLI'
                          : auc.status === 'ENDED'
                          ? 'YAKUNLANGAN'
                          : auc.status === 'CANCELLED'
                          ? 'BEKOR QILINGAN'
                          : 'KUTILMOQDA'}
                      </span>
                    </td>

                    <td className="py-4 px-3 font-mono tabular-nums font-bold text-slate-900 dark:text-white whitespace-nowrap">
                      {formatUzs(auc.currentPrice)}
                    </td>

                    <td className="py-4 px-3 font-mono tabular-nums text-slate-700 dark:text-slate-300 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5">
                        <Users size={14} className="text-slate-400" />
                        {auc.bidsCount}
                      </span>
                    </td>

                    <td className="py-4 px-3">
                      {auc.highestBidderName ? (
                        <div className="space-y-0.5">
                          <p className="font-semibold text-slate-900 dark:text-white text-xs sm:text-sm">
                            {auc.highestBidderName}
                          </p>
                          {auc.highestBidderPhone && (
                            <a
                              href={`tel:${auc.highestBidderPhone}`}
                              className="inline-flex items-center gap-1 text-xs font-mono tabular-nums text-blue-600 dark:text-blue-400 hover:underline"
                            >
                              <Phone size={12} />
                              <span>{auc.highestBidderPhone}</span>
                            </a>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">Hali stavka yo'q</span>
                      )}
                    </td>

                    <td className="py-4 pl-3 text-right whitespace-nowrap">
                      <div className="inline-flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openBidHistory(auc)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 transition-colors"
                        >
                          <History size={13} />
                          <span>Tarix</span>
                        </button>

                        {auc.status === 'LIVE' && (
                          <>
                            <button
                              type="button"
                              disabled={updatingId === auc.id}
                              onClick={() => handleStatusChange(auc, 'ENDED')}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors disabled:opacity-50"
                            >
                              <Flag size={13} />
                              <span>Yakunlash</span>
                            </button>
                            <button
                              type="button"
                              disabled={updatingId === auc.id}
                              onClick={() => handleStatusChange(auc, 'CANCELLED')}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-100 text-xs font-semibold transition-colors disabled:opacity-50"
                            >
                              <Ban size={13} />
                              <span>Bekor qilish</span>
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Bid History Modal */}
      <AnimatePresence>
        {historyAuction && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setHistoryAuction(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-white dark:border-slate-700 rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white truncate">
                    Stavkalar tarixi — {historyAuction.title}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Jami {historyBids.length} ta stavka · Ishtirokchilar aloqa raqamlari bilan
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setHistoryAuction(null)}
                  className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
                  aria-label="Yopish"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-6 max-h-[65vh] overflow-y-auto space-y-2.5">
                {historyLoading ? (
                  <div className="py-10 flex justify-center">
                    <Loader2 size={24} className="animate-spin text-blue-600" />
                  </div>
                ) : historyBids.length === 0 ? (
                  <p className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                    Ushbu auksionda hali stavkalar qo'yilmagan.
                  </p>
                ) : (
                  historyBids.map((bid, index) => (
                    <div
                      key={bid.id}
                      className={`flex items-center justify-between gap-3 p-3.5 rounded-2xl border ${
                        index === 0
                          ? 'bg-emerald-50/80 dark:bg-emerald-950/35 border-emerald-200 dark:border-emerald-700/60'
                          : 'bg-slate-50/80 dark:bg-slate-800/60 border-slate-200/80 dark:border-slate-700'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-slate-900 dark:text-white">
                            {bid.userName}
                          </span>
                          {index === 0 && (
                            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                              · Eng yuqori
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          {bid.userPhone && (
                            <a
                              href={`tel:${bid.userPhone}`}
                              className="font-mono tabular-nums text-blue-600 dark:text-blue-400 hover:underline"
                            >
                              {bid.userPhone}
                            </a>
                          )}
                          <span aria-hidden="true">·</span>
                          <span>{new Date(bid.createdAt).toLocaleString('uz-UZ')}</span>
                        </div>
                      </div>
                      <span className="font-mono tabular-nums text-sm font-bold text-slate-900 dark:text-white shrink-0">
                        {formatUzs(bid.amount)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
