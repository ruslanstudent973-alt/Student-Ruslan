import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  RefreshCw,
  Wallet,
  BellRing,
  CheckCircle2,
  Clock,
  CreditCard,
  Copy,
  Check,
  Phone,
  User as UserIcon,
  ShieldCheck,
  XCircle,
  Sparkles,
  Crown,
  Loader2,
  ArrowUpRight,
  Banknote
} from 'lucide-react';
import { Auction, SellerPayout, SellerPayoutStatus, View } from '../types';
import { SafeImage } from './YuyuPrimitives';
import { StaggerGrid, StaggerItem } from './GlassMotionPrimitives';

const formatUzs = (amount: number): string =>
  `${Math.round(Number(amount) || 0).toLocaleString('en-US').replace(/,/g, ' ')} so'm`;

const formatDateTimeUz = (iso?: string | null): string => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('uz-UZ', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

interface SellerPayoutsSummary {
  yellowTotal: number;
  blueTotal: number;
  withdrawRequestedTotal: number;
  paidTotal: number;
  yellowCount: number;
  blueCount: number;
  withdrawRequestedCount: number;
  paidCount: number;
  pendingApprovalCount: number;
  endedUnpaidCount: number;
  actionNeededCount: number;
}

interface SellerPayoutsAdminViewProps {
  onBack: () => void;
  onNavigate?: (view: View) => void;
  notify: (msg: string, type?: 'success' | 'error' | 'info') => void;
  safeFetchJSON: (url: string, options?: RequestInit) => Promise<any>;
  onActionCountChange?: (count: number) => void;
}

type AdminPayoutTab =
  | 'WITHDRAW_REQUESTED'
  | 'YELLOW_PENDING'
  | 'BLUE_AVAILABLE'
  | 'PAID'
  | 'APPROVALS';

export const SellerPayoutsAdminView: React.FC<SellerPayoutsAdminViewProps> = ({
  onBack,
  onNavigate,
  notify,
  safeFetchJSON,
  onActionCountChange
}) => {
  const [payouts, setPayouts] = useState<SellerPayout[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<Auction[]>([]);
  const [endedUnpaid, setEndedUnpaid] = useState<Auction[]>([]);
  const [summary, setSummary] = useState<SellerPayoutsSummary>({
    yellowTotal: 0,
    blueTotal: 0,
    withdrawRequestedTotal: 0,
    paidTotal: 0,
    yellowCount: 0,
    blueCount: 0,
    withdrawRequestedCount: 0,
    paidCount: 0,
    pendingApprovalCount: 0,
    endedUnpaidCount: 0,
    actionNeededCount: 0
  });
  const [activeTab, setActiveTab] = useState<AdminPayoutTab>('WITHDRAW_REQUESTED');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [copiedCardId, setCopiedCardId] = useState<string | null>(null);

  const loadData = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      try {
        const res = await safeFetchJSON('/api/admin/seller-payouts');
        const nextPayouts: SellerPayout[] = Array.isArray(res?.payouts) ? res.payouts : [];
        const nextPending: Auction[] = Array.isArray(res?.pendingApprovalAuctions)
          ? res.pendingApprovalAuctions
          : [];
        const nextEndedUnpaid: Auction[] = Array.isArray(res?.endedUnpaidSellerAuctions)
          ? res.endedUnpaidSellerAuctions
          : [];
        setPayouts(nextPayouts);
        setPendingApprovals(nextPending);
        setEndedUnpaid(nextEndedUnpaid);
        if (res?.summary) {
          setSummary(res.summary);
          onActionCountChange?.(res.summary.actionNeededCount || 0);
        }
      } catch (err: any) {
        if (!silent) {
          notify(err?.message || "Sotuvchi to'lovlarini yuklashda xatolik", 'error');
        }
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [safeFetchJSON, notify, onActionCountChange]
  );

  useEffect(() => {
    loadData(false);
    const interval = setInterval(() => loadData(true), 8000);
    return () => clearInterval(interval);
  }, [loadData]);

  // Auto-switch to the most urgent non-empty tab on initial load
  useEffect(() => {
    if (loading) return;
    if (summary.withdrawRequestedCount > 0) return;
    if (summary.yellowCount > 0 && activeTab === 'WITHDRAW_REQUESTED') {
      setActiveTab('YELLOW_PENDING');
    } else if (
      (summary.pendingApprovalCount > 0 || summary.endedUnpaidCount > 0) &&
      summary.yellowCount === 0 &&
      activeTab === 'WITHDRAW_REQUESTED'
    ) {
      setActiveTab('APPROVALS');
    }
  }, [loading]);

  const handleCopyCard = (id: string, card: string) => {
    const clean = card.replace(/\s+/g, '');
    navigator.clipboard?.writeText(clean || card);
    setCopiedCardId(id);
    notify('Karta raqami nusxalandi', 'success');
    setTimeout(() => setCopiedCardId(null), 1800);
  };

  const handlePayoutAction = async (
    payoutId: string,
    action: 'UNLOCK_BLUE' | 'MARK_PAID' | 'REVERT_YELLOW'
  ) => {
    setBusyId(payoutId);
    try {
      await safeFetchJSON(`/api/admin/seller-payouts/${payoutId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });
      if (action === 'UNLOCK_BLUE') {
        notify("Pul KO'K hisobga o'tkazildi! Sotuvchi endi chiqarib olishi mumkin", 'success');
      } else if (action === 'MARK_PAID') {
        notify("To'lov kartaga o'tkazilgan deb tasdiqlandi!", 'success');
      } else {
        notify("Hisob holati SARIQ (kutilmoqda) ga qaytarildi", 'info');
      }
      await loadData(true);
    } catch (err: any) {
      notify(err?.message || "Holatni yangilashda xatolik", 'error');
    } finally {
      setBusyId(null);
    }
  };

  const handleApproveListing = async (auctionId: string, approve: boolean) => {
    setBusyId(auctionId);
    try {
      await safeFetchJSON(`/api/admin/auctions/${auctionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: approve ? 'LIVE' : 'REJECTED',
          ...(approve ? {} : { rejectReason: "Admin tomonidan tasdiqlanmadi" })
        })
      });
      notify(
        approve
          ? "VIP sotuvchi mahsuloti tasdiqlandi va jonli auksionga chiqarildi!"
          : "Ariza rad etildi (sotuvchining haftalik imkoniyati qaytarildi)",
        approve ? 'success' : 'info'
      );
      await loadData(true);
    } catch (err: any) {
      notify(err?.message || "Auksion holatini yangilashda xatolik", 'error');
    } finally {
      setBusyId(null);
    }
  };

  const handleManualYellowCredit = async (auctionId: string) => {
    setBusyId(auctionId);
    try {
      await safeFetchJSON('/api/admin/seller-payouts/credit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ auctionId })
      });
      notify("Mijoz to'lovi sotuvchining SARIQ hisobiga tushirildi!", 'success');
      setActiveTab('YELLOW_PENDING');
      await loadData(true);
    } catch (err: any) {
      notify(err?.message || "Sariq hisob yaratishda xatolik", 'error');
    } finally {
      setBusyId(null);
    }
  };

  const filteredPayouts = useMemo(() => {
    if (activeTab === 'APPROVALS') return [];
    return payouts.filter((p) => p.status === (activeTab as SellerPayoutStatus));
  }, [payouts, activeTab]);

  const tabs: { id: AdminPayoutTab; label: string; count: number; accent: string }[] = [
    {
      id: 'WITHDRAW_REQUESTED',
      label: "Chiqarib olish (SMS)",
      count: summary.withdrawRequestedCount,
      accent: 'text-rose-600 dark:text-rose-400'
    },
    {
      id: 'YELLOW_PENDING',
      label: "Sariq hisob (Kutilmoqda)",
      count: summary.yellowCount,
      accent: 'text-amber-600 dark:text-amber-400'
    },
    {
      id: 'BLUE_AVAILABLE',
      label: "Ko'k hisob (Tayyor)",
      count: summary.blueCount,
      accent: 'text-blue-600 dark:text-blue-400'
    },
    {
      id: 'PAID',
      label: "To'lab berilgan",
      count: summary.paidCount,
      accent: 'text-emerald-600 dark:text-emerald-400'
    },
    {
      id: 'APPROVALS',
      label: "VIP ruxsatlar",
      count: summary.pendingApprovalCount + summary.endedUnpaidCount,
      accent: 'text-violet-600 dark:text-violet-400'
    }
  ];

  return (
    <div className="space-y-7">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-white/70 dark:border-slate-800">
        <div className="flex items-center gap-3.5">
          <motion.button
            type="button"
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.95 }}
            onClick={onBack}
            className="p-2.5 yuyu-glass-subtle rounded-xl hover:bg-white/90 dark:hover:bg-slate-800/80 transition-colors"
            aria-label="Orqaga"
          >
            <ChevronLeft size={18} />
          </motion.button>
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-600/15 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <Wallet size={19} />
              </div>
              <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                Sotuvchi to'lovlari
              </h1>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Sariq hisobni ko'k qilish, chiqarib olish so'rovlari (SMS) va VIP sotuvchi ruxsatlari
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {onNavigate && (
            <button
              type="button"
              onClick={() => onNavigate('admin_auctions')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl yuyu-glass-subtle text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-white/90 transition-colors"
            >
              <span>Auksion boshqaruvi</span>
              <ArrowUpRight size={14} />
            </button>
          )}
          <button
            type="button"
            onClick={() => loadData(false)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl yuyu-glass-subtle text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-white/90 transition-colors"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Yangilash</span>
          </button>
        </div>
      </div>

      {/* KPI Strip */}
      <StaggerGrid className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StaggerItem>
          <div className="yuyu-glass rounded-3xl p-5 border-rose-200/80 dark:border-rose-500/30 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-rose-600 dark:text-rose-400">
              <span>Chiqarib olish so'rovlari</span>
              <BellRing size={16} className={summary.withdrawRequestedCount > 0 ? 'animate-bounce' : ''} />
            </div>
            <p className="font-mono tabular-nums text-2xl font-extrabold text-slate-900 dark:text-white">
              {formatUzs(summary.withdrawRequestedTotal)}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {summary.withdrawRequestedCount} ta faol so'rov (kartaga o'tkazish kerak)
            </p>
          </div>
        </StaggerItem>

        <StaggerItem>
          <div className="yuyu-glass rounded-3xl p-5 border-amber-200/90 dark:border-amber-500/30 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-amber-600 dark:text-amber-400">
              <span>Sariq hisob (Kutilmoqda)</span>
              <Clock size={16} />
            </div>
            <p className="font-mono tabular-nums text-2xl font-extrabold text-slate-900 dark:text-white">
              {formatUzs(summary.yellowTotal)}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {summary.yellowCount} ta savdo — xaridor "Oldim" deyishi kutilmoqda
            </p>
          </div>
        </StaggerItem>

        <StaggerItem>
          <div className="yuyu-glass rounded-3xl p-5 border-blue-200/90 dark:border-blue-500/30 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-blue-600 dark:text-blue-400">
              <span>Ko'k hisob (Tasdiqlangan)</span>
              <ShieldCheck size={16} />
            </div>
            <p className="font-mono tabular-nums text-2xl font-extrabold text-slate-900 dark:text-white">
              {formatUzs(summary.blueTotal)}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {summary.blueCount} ta hisob — sotuvchi yechib olishga tayyor
            </p>
          </div>
        </StaggerItem>

        <StaggerItem>
          <div className="yuyu-glass rounded-3xl p-5 border-emerald-200/90 dark:border-emerald-500/30 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              <span>Jami to'lab berilgan</span>
              <Banknote size={16} />
            </div>
            <p className="font-mono tabular-nums text-2xl font-extrabold text-slate-900 dark:text-white">
              {formatUzs(summary.paidTotal)}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {summary.paidCount} ta yakunlangan o'tkazma
            </p>
          </div>
        </StaggerItem>
      </StaggerGrid>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`relative px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-semibold whitespace-nowrap shrink-0 transition-colors flex items-center gap-2 ${
                isActive
                  ? 'text-white'
                  : 'yuyu-glass-subtle text-slate-700 dark:text-slate-200 hover:bg-white/90'
              }`}
            >
              {isActive && (
                <motion.span
                  layoutId="admin-payout-active-tab"
                  transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                  className="absolute inset-0 rounded-2xl bg-[#0F294A] dark:bg-blue-600 shadow-md -z-10"
                />
              )}
              <span>{tab.label}</span>
              <span
                className={`px-2 py-0.5 rounded-lg text-[11px] font-mono tabular-nums font-bold ${
                  isActive
                    ? 'bg-white/20 text-white'
                    : 'bg-slate-900/5 dark:bg-white/10 text-slate-700 dark:text-slate-300'
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Main Content */}
      {loading ? (
        <div className="yuyu-glass rounded-3xl py-16 flex flex-col items-center justify-center gap-3">
          <Loader2 size={28} className="animate-spin text-blue-600" />
          <p className="text-sm text-slate-500 dark:text-slate-400">Ma'lumotlar yuklanmoqda...</p>
        </div>
      ) : activeTab === 'APPROVALS' ? (
        <div className="space-y-6">
          {/* Pending VIP Weekly Listings */}
          <section className="space-y-3">
            <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Crown size={18} className="text-amber-500" />
              <span>Tasdiqlashni kutayotgan VIP mahsulotlar ({pendingApprovals.length})</span>
            </h2>

            {pendingApprovals.length === 0 ? (
              <div className="yuyu-glass rounded-3xl p-8 text-center text-sm text-slate-500 dark:text-slate-400">
                Hozircha tasdiqlashni kutayotgan VIP sotuvchi arizalari yo'q.
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {pendingApprovals.map((auc) => (
                  <div key={auc.id} className="yuyu-glass rounded-3xl p-5 space-y-4">
                    <div className="flex gap-4">
                      <div className="w-24 h-24 rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0">
                        <SafeImage src={auc.imageUrl} alt={auc.title} className="w-full h-full object-cover" />
                      </div>
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="px-2 py-0.5 rounded-lg bg-amber-500/15 border border-amber-400/40 text-amber-700 dark:text-amber-300 text-[11px] font-bold">
                            {auc.sellerVipTier || 'VIP'} SOTUVCHI
                          </span>
                          <span className="text-[11px] font-mono text-slate-500">
                            {auc.durationHours || 24} soat
                          </span>
                        </div>
                        <h3 className="font-display text-base font-bold text-slate-900 dark:text-white line-clamp-2">
                          {auc.title}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                          {auc.description}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 p-3.5 rounded-2xl bg-white/60 dark:bg-slate-800/60 border border-white/80 dark:border-slate-700/60 text-xs">
                      <div>
                        <p className="text-slate-500">Sotuvchi</p>
                        <p className="font-semibold text-slate-900 dark:text-white mt-0.5">
                          {auc.sellerName}
                        </p>
                        <p className="font-mono text-[11px] text-slate-500">{auc.sellerPhone}</p>
                      </div>
                      <div>
                        <p className="text-slate-500">Karta raqami</p>
                        <p className="font-mono font-bold text-slate-900 dark:text-white mt-0.5">
                          {auc.sellerCardNumber || '—'}
                        </p>
                        <p className="text-[11px] text-slate-500 truncate">{auc.sellerCardHolder}</p>
                      </div>
                      <div>
                        <p className="text-slate-500">Boshlang'ich narx</p>
                        <p className="font-mono font-bold text-blue-600 dark:text-blue-400 mt-0.5">
                          {formatUzs(auc.startPrice)}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-500">Minimal qadam</p>
                        <p className="font-mono font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                          +{formatUzs(auc.minStep)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <button
                        type="button"
                        disabled={busyId === auc.id}
                        onClick={() => handleApproveListing(auc.id, true)}
                        className="flex-1 py-2.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 shadow-sm transition-colors disabled:opacity-60"
                      >
                        {busyId === auc.id ? (
                          <Loader2 size={15} className="animate-spin" />
                        ) : (
                          <CheckCircle2 size={15} />
                        )}
                        <span>Tasdiqlash (Jonli chiqarish)</span>
                      </button>
                      <button
                        type="button"
                        disabled={busyId === auc.id}
                        onClick={() => handleApproveListing(auc.id, false)}
                        className="py-2.5 px-4 rounded-2xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900/60 text-red-600 dark:text-red-400 text-xs sm:text-sm font-semibold hover:bg-red-100 transition-colors flex items-center gap-1.5 disabled:opacity-60"
                      >
                        <XCircle size={15} />
                        <span>Rad etish</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Ended VIP Auctions awaiting Yellow credit */}
          {endedUnpaid.length > 0 && (
            <section className="space-y-3">
              <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Sparkles size={18} className="text-blue-500" />
                <span>Yakunlangan VIP auksionlar — to'lov tushsa sariq hisobga o'tkazish ({endedUnpaid.length})</span>
              </h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {endedUnpaid.map((auc) => (
                  <div key={auc.id} className="yuyu-glass rounded-3xl p-5 flex flex-col justify-between gap-4">
                    <div className="flex gap-4">
                      <div className="w-20 h-20 rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0">
                        <SafeImage src={auc.imageUrl} alt={auc.title} className="w-full h-full object-cover" />
                      </div>
                      <div className="min-w-0 flex-1 space-y-1">
                        <h3 className="font-display text-base font-bold text-slate-900 dark:text-white line-clamp-1">
                          {auc.title}
                        </h3>
                        <p className="font-mono tabular-nums text-base font-extrabold text-blue-600 dark:text-blue-400">
                          Yutuq: {formatUzs(auc.currentPrice)}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Sotuvchi: <strong className="text-slate-700 dark:text-slate-200">{auc.sellerName}</strong> · G'olib: <strong className="text-slate-700 dark:text-slate-200">{auc.highestBidderName}</strong> ({auc.highestBidderPhone})
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={busyId === auc.id}
                      onClick={() => handleManualYellowCredit(auc.id)}
                      className="w-full py-2.5 px-4 rounded-2xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-sm transition-colors disabled:opacity-60"
                    >
                      {busyId === auc.id ? <Loader2 size={15} className="animate-spin" /> : <Clock size={15} />}
                      <span>Mijoz pulni tashladi → Sariq hisobga o'tkazish</span>
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      ) : filteredPayouts.length === 0 ? (
        <div className="yuyu-glass rounded-3xl p-12 text-center space-y-2">
          <Wallet size={30} className="mx-auto text-slate-400" />
          <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
            Ushbu bo'limda hozircha yozuvlar yo'q.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <AnimatePresence mode="popLayout">
            {filteredPayouts.map((payout) => {
              const isYellow = payout.status === 'YELLOW_PENDING';
              const isBlue = payout.status === 'BLUE_AVAILABLE';
              const isRequested = payout.status === 'WITHDRAW_REQUESTED';
              const isPaid = payout.status === 'PAID';

              return (
                <motion.div
                  key={payout.id}
                  layout
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.97 }}
                  className={`yuyu-glass rounded-3xl p-5 sm:p-6 space-y-4 ${
                    isRequested
                      ? 'border-rose-300/90 dark:border-rose-500/40'
                      : isYellow
                      ? 'border-amber-300/90 dark:border-amber-500/40'
                      : isBlue
                      ? 'border-blue-300/90 dark:border-blue-500/40'
                      : 'border-emerald-300/80 dark:border-emerald-500/30'
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Left: Product & Status */}
                    <div className="flex gap-4 min-w-0">
                      <div className="w-20 h-20 rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0">
                        <SafeImage
                          src={payout.auctionImage}
                          alt={payout.auctionTitle}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="min-w-0 space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          {isYellow && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-400/20 border border-amber-400/50 text-amber-800 dark:text-amber-200 text-xs font-bold">
                              <Clock size={12} />
                              <span>SARIQ HISOB · Kutilmoqda</span>
                            </span>
                          )}
                          {isBlue && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-blue-500/15 border border-blue-500/40 text-blue-700 dark:text-blue-300 text-xs font-bold">
                              <ShieldCheck size={12} />
                              <span>KO'K HISOB · Yechishga tayyor</span>
                            </span>
                          )}
                          {isRequested && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-rose-500/15 border border-rose-500/45 text-rose-700 dark:text-rose-300 text-xs font-bold">
                              <BellRing size={12} />
                              <span>CHIQARIB OLISH SO'ROVI (SMS)</span>
                            </span>
                          )}
                          {isPaid && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-700 dark:text-emerald-300 text-xs font-bold">
                              <CheckCircle2 size={12} />
                              <span>TO'LAB BERILGAN</span>
                            </span>
                          )}

                          {payout.buyerConfirmedReceipt && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold">
                              <Check size={12} />
                              <span>Xaridor "Oldim" deb tasdiqladi!</span>
                            </span>
                          )}
                        </div>

                        <h3 className="font-display text-base sm:text-lg font-bold text-slate-900 dark:text-white truncate">
                          {payout.auctionTitle}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                          ID: {payout.id} · {formatDateTimeUz(payout.createdAt)}
                        </p>
                      </div>
                    </div>

                    {/* Right: Amount */}
                    <div className="lg:text-right shrink-0">
                      <p className="text-xs text-slate-500 dark:text-slate-400">Sotuv summasi</p>
                      <p
                        className={`font-mono tabular-nums text-2xl font-extrabold ${
                          isYellow
                            ? 'text-amber-600 dark:text-amber-400'
                            : isBlue
                            ? 'text-blue-600 dark:text-blue-400'
                            : isRequested
                            ? 'text-rose-600 dark:text-rose-400'
                            : 'text-emerald-600 dark:text-emerald-400'
                        }`}
                      >
                        {formatUzs(payout.amount)}
                      </p>
                    </div>
                  </div>

                  {/* Seller Card + Buyer Details */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 rounded-2xl bg-white/60 dark:bg-slate-800/55 border border-white/85 dark:border-slate-700/60">
                    {/* Seller Info */}
                    <div className="space-y-1">
                      <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                        <UserIcon size={12} />
                        <span>Sotuvchi</span>
                      </p>
                      <p className="text-sm font-bold text-slate-900 dark:text-white">
                        {payout.sellerName}
                      </p>
                      <p className="text-xs font-mono text-slate-600 dark:text-slate-300 flex items-center gap-1">
                        <Phone size={11} />
                        <span>{payout.sellerPhone}</span>
                      </p>
                    </div>

                    {/* Seller Card Number with 1-click Copy */}
                    <div className="space-y-1">
                      <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                        <CreditCard size={12} />
                        <span>Sotuvchi kartasi</span>
                      </p>
                      <div className="flex items-center gap-2">
                        <span className="font-mono tabular-nums text-sm font-extrabold text-slate-900 dark:text-white tracking-wider">
                          {payout.sellerCardNumber || 'Kiritilmagan'}
                        </span>
                        {payout.sellerCardNumber && (
                          <button
                            type="button"
                            onClick={() => handleCopyCard(payout.id, payout.sellerCardNumber)}
                            className="p-1.5 rounded-lg bg-slate-900/5 dark:bg-white/10 hover:bg-blue-500/15 text-slate-700 dark:text-slate-200 transition-colors"
                            title="Karta raqamini nusxalash"
                          >
                            {copiedCardId === payout.id ? (
                              <Check size={13} className="text-emerald-600" />
                            ) : (
                              <Copy size={13} />
                            )}
                          </button>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {payout.sellerCardHolder}
                      </p>
                    </div>

                    {/* Buyer Info */}
                    <div className="space-y-1">
                      <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                        Xaridor (G'olib)
                      </p>
                      <p className="text-sm font-bold text-slate-900 dark:text-white">
                        {payout.buyerName}
                      </p>
                      <p className="text-xs font-mono text-slate-600 dark:text-slate-300">
                        {payout.buyerPhone || '—'}
                        {payout.orderId ? ` · ${payout.orderId}` : ''}
                      </p>
                    </div>
                  </div>

                  {/* Admin Action Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {isYellow &&
                        "Xaridor sizga 'Oldim' deb xabar bergach, pulni KO'K holatga o'tkazing."}
                      {isBlue &&
                        `Ko'k qilingan: ${formatDateTimeUz(payout.unlockedAt)} · Sotuvchi 'Chiqarib olish' tugmasini bosishi kutilmoqda.`}
                      {isRequested &&
                        `So'rov vaqti: ${formatDateTimeUz(payout.withdrawRequestedAt)} · Yuqoridagi kartaga o'tkazib tasdiqlang.`}
                      {isPaid && `To'lab berilgan: ${formatDateTimeUz(payout.paidAt)}`}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {isYellow && (
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.97 }}
                          type="button"
                          disabled={busyId === payout.id}
                          onClick={() => handlePayoutAction(payout.id, 'UNLOCK_BLUE')}
                          className="px-5 py-2.5 rounded-2xl bg-[#2563EB] hover:bg-blue-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-blue-600/20 flex items-center gap-2 transition-colors disabled:opacity-60"
                        >
                          {busyId === payout.id ? (
                            <Loader2 size={15} className="animate-spin" />
                          ) : (
                            <ShieldCheck size={16} />
                          )}
                          <span>Pulni KO'K qilish (Tovar topshirildi)</span>
                        </motion.button>
                      )}

                      {(isRequested || isBlue) && (
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.97 }}
                          type="button"
                          disabled={busyId === payout.id}
                          onClick={() => handlePayoutAction(payout.id, 'MARK_PAID')}
                          className="px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-emerald-600/20 flex items-center gap-2 transition-colors disabled:opacity-60"
                        >
                          {busyId === payout.id ? (
                            <Loader2 size={15} className="animate-spin" />
                          ) : (
                            <CheckCircle2 size={16} />
                          )}
                          <span>Kartaga o'tkazildi (Yopish)</span>
                        </motion.button>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};
