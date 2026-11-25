import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Crown,
  Trophy,
  Gavel,
  Upload,
  CreditCard,
  X,
  Loader2,
  CheckCircle2,
  Clock,
  Lock,
  Sparkles,
  Award,
  TrendingUp,
  Users
} from 'lucide-react';
import {
  AuctionLeaderboardData,
  User,
  UserSellerQuota
} from '../types';
import { getEffectiveVipStatus } from '../utils/vip';
import { uploadMediaSmart } from '../utils/r2MediaUpload';

const formatUzs = (amount: number): string =>
  `${Math.round(Number(amount) || 0).toLocaleString('en-US').replace(/,/g, ' ')} so'm`;

const formatCardInput = (raw: string): string => {
  const digits = raw.replace(/\D/g, '').slice(0, 16);
  return digits.replace(/(.{4})/g, '$1 ').trim();
};

const compressImageFile = (file: File): Promise<string> =>
  uploadMediaSmart(file, { folder: 'auctions', maxDim: 1000, quality: 0.82 });

// ================= 1. VIP WEEKLY SELLER SUBMIT MODAL =================

interface VipSellerSubmitModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  quota?: UserSellerQuota | null;
  onRequireLogin: () => void;
  onOpenVipModal?: () => void;
  onSubmitted: () => void;
  notify: (msg: string, type?: 'success' | 'error' | 'info') => void;
  safeFetchJSON: (url: string, options?: RequestInit) => Promise<any>;
}

export const VipSellerSubmitModal: React.FC<VipSellerSubmitModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  quota,
  onRequireLogin,
  onOpenVipModal,
  onSubmitted,
  notify,
  safeFetchJSON
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [startPrice, setStartPrice] = useState('25000');
  const [minStep, setMinStep] = useState('5000');
  const [durationHours, setDurationHours] = useState<number>(24);
  const [cardNumber, setCardNumber] = useState('');
  const [cardHolder, setCardHolder] = useState(currentUser?.username || '');
  const [uploadingImg, setUploadingImg] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (currentUser?.username && !cardHolder) {
      setCardHolder(currentUser.username);
    }
  }, [currentUser?.username, cardHolder]);

  const clientVip = getEffectiveVipStatus(currentUser);
  const isVip = quota ? quota.isVip : clientVip.isVip;
  const canSubmitNow = quota ? quota.canSubmitNow : isVip;

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImg(true);
    try {
      const dataUrl = await compressImageFile(file);
      setImageUrl(dataUrl);
      notify('Rasm muvaffaqiyatli yuklandi', 'success');
    } catch {
      notify("Rasmni qayta ishlashda xatolik", 'error');
    } finally {
      setUploadingImg(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      onRequireLogin();
      return;
    }
    const cleanCard = cardNumber.replace(/\D/g, '');
    if (title.trim().length < 3) {
      notify("Mahsulot nomini kiriting (kamida 3 ta belgi)", 'error');
      return;
    }
    if (!imageUrl.trim()) {
      notify("Iltimos, mahsulot rasmini yuklang yoki havola kiriting", 'error');
      return;
    }
    if (cleanCard.length !== 16) {
      notify("16 xonali UZCARD/HUMO karta raqamingizni to'liq kiriting", 'error');
      return;
    }

    setSubmitting(true);
    try {
      await safeFetchJSON('/api/auctions/seller-submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.telegramId
        },
        body: JSON.stringify({
          userId: currentUser.telegramId,
          title: title.trim(),
          description: description.trim(),
          imageUrl: imageUrl.trim(),
          startPrice: Math.max(10000, Number(startPrice) || 10000),
          minStep: Math.max(5000, Number(minStep) || 5000),
          durationHours,
          sellerCardNumber: cleanCard,
          sellerCardHolder: cardHolder.trim() || currentUser.username
        })
      });
      notify(
        "Arizangiz adminga yuborildi! Admin tasdiqlagach mahsulotingiz jonli auksionga chiqadi.",
        'success'
      );
      setTitle('');
      setDescription('');
      setImageUrl('');
      onSubmitted();
      onClose();
    } catch (err: any) {
      notify(err?.message || "Arizani yuborishda xatolik yuz berdi", 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[130] bg-slate-950/55 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-label="VIP sotuvchi auksion mahsuloti qo'shish"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 12 }}
            transition={{ type: 'spring', stiffness: 360, damping: 28 }}
            className="w-full max-w-xl yuyu-glass-strong rounded-3xl overflow-hidden my-6"
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-white/60 dark:border-slate-700/60 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-400/15 border border-amber-400/40 text-amber-600 dark:text-amber-300 flex items-center justify-center">
                  <Crown size={20} />
                </div>
                <div>
                  <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                    O'z mahsulotingizni auksionga qo'ying
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    VIP mijozlar uchun haftasiga 1 marta · Admin tasdig'i bilan
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-9 h-9 rounded-xl yuyu-glass-subtle flex items-center justify-center text-slate-500 hover:text-slate-900 dark:hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 max-h-[80vh] overflow-y-auto">
              {!currentUser ? (
                <div className="text-center py-6 space-y-4">
                  <Lock size={34} className="mx-auto text-blue-600" />
                  <div className="space-y-1">
                    <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                      Avval tizimga kiring
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Auksionga o'z mahsulotingizni qo'yish uchun hisobingizga kiring.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onRequireLogin();
                    }}
                    className="px-6 py-3 rounded-2xl bg-[#2563EB] hover:bg-blue-700 text-white text-sm font-semibold"
                  >
                    Tizimga kirish
                  </button>
                </div>
              ) : !isVip ? (
                <div className="text-center py-5 space-y-5">
                  <div className="w-16 h-16 rounded-3xl bg-amber-400/15 border border-amber-400/40 text-amber-500 mx-auto flex items-center justify-center">
                    <Crown size={32} />
                  </div>
                  <div className="space-y-2 max-w-md mx-auto">
                    <h3 className="font-display text-xl font-bold text-slate-900 dark:text-white">
                      Faqat VIP a'zolar uchun ochiq
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                      Haftada 1 marta o'z buyumingizni jonli auksionda sotish uchun istalgan VIP maqomiga (eng arzon VIP tarifiga ham) ega bo'lishingiz kifoya!
                    </p>
                  </div>
                  <div className="p-4 rounded-2xl bg-white/60 dark:bg-slate-800/60 border border-white/80 dark:border-slate-700/60 text-left text-xs space-y-1.5 text-slate-600 dark:text-slate-300">
                    <p className="font-bold text-slate-900 dark:text-white">Qanday ishlaydi?</p>
                    <p>1. Mahsulotingiz va 16 xonali kartangizni kiritasiz — admin tasdiqlaydi.</p>
                    <p>2. Xaridor pulni to'lagach, hisobingizda <strong>Sariq</strong> holatda ko'rinadi.</p>
                    <p>3. Xaridor tovarni olib adminga tasdiqlagach, pulingiz <strong>Ko'k</strong> bo'ladi va kartangizga chiqarib olasiz!</p>
                  </div>
                  {onOpenVipModal && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenVipModal();
                      }}
                      className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2"
                    >
                      <Crown size={17} />
                      <span>VIP obuna sotib olish</span>
                    </button>
                  )}
                </div>
              ) : !canSubmitNow ? (
                <div className="text-center py-6 space-y-4">
                  <div className="w-14 h-14 rounded-2xl bg-blue-500/15 text-blue-600 dark:text-blue-400 mx-auto flex items-center justify-center">
                    <Clock size={28} />
                  </div>
                  <div className="space-y-1.5">
                    <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                      Haftalik limit ishlatilgan (1 marta / 7 kun)
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                      Siz ushbu haftada mahsulot joylagansiz. Keyingi mahsulotni{' '}
                      <strong className="text-blue-600 dark:text-blue-400">
                        {quota?.daysRemaining || 1} kundan so'ng
                      </strong>{' '}
                      joylashingiz mumkin.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-6 py-2.5 rounded-2xl yuyu-glass-subtle text-sm font-semibold text-slate-800 dark:text-slate-100"
                  >
                    Tushunarli
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="p-3.5 rounded-2xl bg-blue-50/75 dark:bg-blue-950/35 border border-blue-200/80 dark:border-blue-800/50 text-xs text-blue-900 dark:text-blue-200 leading-relaxed">
                    <strong>Escrow himoyasi:</strong> Xaridor pulni to'lagach hisobingizda <strong>🟡 Sariq</strong> bo'lib ko'rinadi. Xaridor tovarni olib adminga tasdiqlagach <strong>🔵 Ko'k</strong> bo'ladi va kartangizga chiqarib olasiz.
                  </div>

                  {/* Product Title */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Mahsulot nomi *
                    </label>
                    <input
                      type="text"
                      required
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Masalan: iPhone 13 Pro g'ilofi yoki Original Nike krossovka"
                      className="w-full yuyu-glass-input rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white outline-none focus:border-blue-500"
                    />
                  </div>

                  {/* Image Upload / URL */}
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Mahsulot rasmi *
                    </label>
                    <div className="flex flex-col sm:flex-row gap-2.5">
                      <label className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#0F294A] dark:bg-blue-600 text-white text-xs font-semibold cursor-pointer hover:opacity-90 shrink-0">
                        {uploadingImg ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <Upload size={14} />
                        )}
                        <span>Galereyadan yuklash</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleFile}
                        />
                      </label>
                      <input
                        type="url"
                        value={imageUrl.startsWith('data:') ? '' : imageUrl}
                        onChange={(e) => setImageUrl(e.target.value)}
                        placeholder="Yoki rasm HTTPS havolasini kiriting"
                        className="flex-1 yuyu-glass-input rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white outline-none focus:border-blue-500"
                      />
                    </div>
                    {imageUrl && (
                      <div className="relative w-28 h-28 rounded-2xl overflow-hidden border border-white/80 dark:border-slate-700">
                        <img src={imageUrl} alt="Oldindan ko'rish" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setImageUrl('')}
                          className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Description */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Qisqacha tavsif (holati, o'lchami)
                    </label>
                    <textarea
                      rows={2}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Mahsulot holati, yangi yoki ishlatilganligi va muhim xususiyatlari..."
                      className="w-full yuyu-glass-input rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white outline-none focus:border-blue-500 resize-none"
                    />
                  </div>

                  {/* Prices & Duration */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Boshlang'ich narx (so'm)
                      </label>
                      <input
                        type="number"
                        min={10000}
                        step={5000}
                        value={startPrice}
                        onChange={(e) => setStartPrice(e.target.value)}
                        className="w-full yuyu-glass-input rounded-xl px-3.5 py-2.5 text-sm font-mono text-slate-900 dark:text-white outline-none focus:border-blue-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Minimal qadam (so'm)
                      </label>
                      <input
                        type="number"
                        min={5000}
                        step={1000}
                        value={minStep}
                        onChange={(e) => setMinStep(e.target.value)}
                        className="w-full yuyu-glass-input rounded-xl px-3.5 py-2.5 text-sm font-mono text-slate-900 dark:text-white outline-none focus:border-blue-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Davomiyligi
                      </label>
                      <select
                        value={durationHours}
                        onChange={(e) => setDurationHours(Number(e.target.value))}
                        className="w-full yuyu-glass-input rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-white outline-none focus:border-blue-500"
                      >
                        <option value={12}>12 soat</option>
                        <option value={24}>24 soat</option>
                        <option value={48}>48 soat</option>
                      </select>
                    </div>
                  </div>

                  {/* Seller Bank Card Info */}
                  <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/25 border border-amber-200/80 dark:border-amber-700/40 space-y-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-amber-900 dark:text-amber-200">
                      <CreditCard size={15} />
                      <span>Sotuv puli tushadigan sizning kartangiz (UZCARD / HUMO)</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                          16 xonali karta raqami *
                        </label>
                        <input
                          type="text"
                          inputMode="numeric"
                          required
                          value={cardNumber}
                          onChange={(e) => setCardNumber(formatCardInput(e.target.value))}
                          placeholder="8600 0000 0000 0000"
                          className="w-full yuyu-glass-input rounded-xl px-3.5 py-2.5 text-sm font-mono tracking-wider text-slate-900 dark:text-white outline-none focus:border-amber-500"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                          Karta egasi ism-familiyasi *
                        </label>
                        <input
                          type="text"
                          required
                          value={cardHolder}
                          onChange={(e) => setCardHolder(e.target.value)}
                          placeholder="Aliyev Vali"
                          className="w-full yuyu-glass-input rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-white outline-none focus:border-amber-500"
                        />
                      </div>
                    </div>
                  </div>

                  <motion.button
                    whileHover={{ scale: 1.015 }}
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    disabled={submitting}
                    className="w-full py-3.5 px-5 rounded-2xl bg-[#2563EB] hover:bg-blue-700 text-white text-sm font-bold shadow-lg shadow-blue-600/25 flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
                  >
                    {submitting ? (
                      <Loader2 size={17} className="animate-spin" />
                    ) : (
                      <CheckCircle2 size={17} />
                    )}
                    <span>Admin tasdig'iga yuborish</span>
                  </motion.button>
                </form>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// ================= 2. REAL PEOPLE TOP LEADERBOARD =================

interface RealAuctionLeaderboardProps {
  safeFetchJSON: (url: string, options?: RequestInit) => Promise<any>;
  currentUserId?: string;
}

export const RealAuctionLeaderboard: React.FC<RealAuctionLeaderboardProps> = ({
  safeFetchJSON,
  currentUserId
}) => {
  const [data, setData] = useState<AuctionLeaderboardData | null>(null);
  const [tab, setTab] = useState<'sellers' | 'bidders'>('sellers');
  const [loading, setLoading] = useState(true);

  const loadLeaderboard = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      try {
        const res = await safeFetchJSON('/api/auctions/leaderboard');
        if (res?.success) {
          setData({
            topSellers: Array.isArray(res.topSellers) ? res.topSellers : [],
            topBidders: Array.isArray(res.topBidders) ? res.topBidders : [],
            stats: res.stats || {
              totalLive: 0,
              totalSoldAuctions: 0,
              totalRealSellers: 0,
              totalBids: 0
            }
          });
        }
      } catch {
        // silent fallback
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [safeFetchJSON]
  );

  useEffect(() => {
    loadLeaderboard(false);
    const interval = setInterval(() => loadLeaderboard(true), 15000);
    return () => clearInterval(interval);
  }, [loadLeaderboard]);

  const rankBadge = (idx: number) => {
    if (idx === 0)
      return 'bg-gradient-to-br from-amber-400 to-yellow-500 text-slate-950 shadow-md shadow-amber-500/30';
    if (idx === 1)
      return 'bg-gradient-to-br from-slate-300 to-slate-400 text-slate-900 shadow-sm';
    if (idx === 2)
      return 'bg-gradient-to-br from-orange-400 to-amber-600 text-white shadow-sm';
    return 'bg-slate-900/5 dark:bg-white/10 text-slate-600 dark:text-slate-300';
  };

  return (
    <section className="mt-8 pt-6 border-t border-white/70 dark:border-slate-800 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-600 dark:text-amber-400">
            <Trophy size={14} />
            <span>100% Haqiqiy foydalanuvchilar statistikasi</span>
          </div>
          <h2 className="font-display text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight mt-1">
            Auksion Top Reytingi
          </h2>
        </div>

        {/* Toggle Switch */}
        <div className="inline-flex p-1 rounded-2xl yuyu-glass-subtle self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setTab('sellers')}
            className={`relative px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-colors ${
              tab === 'sellers' ? 'text-white' : 'text-slate-600 dark:text-slate-300'
            }`}
          >
            {tab === 'sellers' && (
              <motion.span
                layoutId="leaderboard-tab-bg"
                transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                className="absolute inset-0 rounded-xl bg-[#2563EB] shadow-sm -z-10"
              />
            )}
            <span className="inline-flex items-center gap-1.5">
              <TrendingUp size={14} />
              <span>Top sotuvchilar</span>
            </span>
          </button>
          <button
            type="button"
            onClick={() => setTab('bidders')}
            className={`relative px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-colors ${
              tab === 'bidders' ? 'text-white' : 'text-slate-600 dark:text-slate-300'
            }`}
          >
            {tab === 'bidders' && (
              <motion.span
                layoutId="leaderboard-tab-bg"
                transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                className="absolute inset-0 rounded-xl bg-[#2563EB] shadow-sm -z-10"
              />
            )}
            <span className="inline-flex items-center gap-1.5">
              <Award size={14} />
              <span>Top xaridorlar</span>
            </span>
          </button>
        </div>
      </div>

      {/* Live Real Stats Strip */}
      {data?.stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="yuyu-glass rounded-2xl p-3.5 text-center">
            <p className="text-[11px] text-slate-500 dark:text-slate-400">Jonli auksionlar</p>
            <p className="font-mono tabular-nums text-lg font-extrabold text-blue-600 dark:text-blue-400">
              {data.stats.totalLive}
            </p>
          </div>
          <div className="yuyu-glass rounded-2xl p-3.5 text-center">
            <p className="text-[11px] text-slate-500 dark:text-slate-400">Sotilgan lotlar</p>
            <p className="font-mono tabular-nums text-lg font-extrabold text-emerald-600 dark:text-emerald-400">
              {data.stats.totalSoldAuctions}
            </p>
          </div>
          <div className="yuyu-glass rounded-2xl p-3.5 text-center">
            <p className="text-[11px] text-slate-500 dark:text-slate-400">Haqiqiy VIP sotuvchilar</p>
            <p className="font-mono tabular-nums text-lg font-extrabold text-amber-600 dark:text-amber-400">
              {data.stats.totalRealSellers}
            </p>
          </div>
          <div className="yuyu-glass rounded-2xl p-3.5 text-center">
            <p className="text-[11px] text-slate-500 dark:text-slate-400">Jami stavkalar</p>
            <p className="font-mono tabular-nums text-lg font-extrabold text-slate-900 dark:text-white">
              {data.stats.totalBids}
            </p>
          </div>
        </div>
      )}

      {/* Leaderboard List */}
      <div className="yuyu-glass rounded-3xl p-4 sm:p-6">
        {loading ? (
          <div className="py-10 flex items-center justify-center gap-2 text-sm text-slate-500">
            <Loader2 size={18} className="animate-spin text-blue-600" />
            <span>Haqiqiy reyting hisoblanmoqda...</span>
          </div>
        ) : tab === 'sellers' ? (
          !data || data.topSellers.length === 0 ? (
            <div className="py-10 text-center space-y-2">
              <Users size={28} className="mx-auto text-slate-400" />
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                Hozircha yakunlangan VIP sotuvlar yo'q
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                Birinchi bo'lib o'z mahsulotingizni auksionda soting va Haqiqiy Top Sotuvchilar reytingida #1 o'rinni egallang!
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {data.topSellers.map((seller, idx) => {
                const isMe = currentUserId && seller.userId === currentUserId;
                return (
                  <motion.div
                    key={seller.userId}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.04 }}
                    className={`flex items-center justify-between gap-3 p-3.5 rounded-2xl border transition-colors ${
                      idx === 0
                        ? 'bg-amber-50/70 dark:bg-amber-950/25 border-amber-300/70 dark:border-amber-500/40'
                        : 'bg-white/60 dark:bg-slate-800/50 border-white/80 dark:border-slate-700/60'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center font-mono font-extrabold text-sm shrink-0 ${rankBadge(idx)}`}
                      >
                        #{idx + 1}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-display text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate">
                            {seller.name}
                          </span>
                          {seller.vipTier !== 'NONE' && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-amber-400/20 text-amber-700 dark:text-amber-300 text-[10px] font-bold">
                              <Crown size={10} />
                              {seller.vipTier}
                            </span>
                          )}
                          {isMe && (
                            <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400">
                              (Siz)
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {seller.soldCount} ta mahsulot sotgan · {seller.paidCount} ta tasdiqlangan
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="font-mono tabular-nums text-sm sm:text-base font-extrabold text-emerald-700 dark:text-emerald-400">
                        {formatUzs(seller.totalSalesUzs)}
                      </p>
                      <p className="text-[10px] text-slate-500">Jami savdo</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )
        ) : !data || data.topBidders.length === 0 ? (
          <div className="py-10 text-center space-y-2">
            <Gavel size={28} className="mx-auto text-slate-400" />
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              Hozircha stavka qo'ygan ishtirokchilar yo'q
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Stavka qo'ying va haqiqiy faol xaridorlar reytingiga kiring!
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {data.topBidders.map((bidder, idx) => {
              const isMe = currentUserId && bidder.userId === currentUserId;
              return (
                <motion.div
                  key={bidder.userId}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.04 }}
                  className={`flex items-center justify-between gap-3 p-3.5 rounded-2xl border ${
                    idx === 0
                      ? 'bg-blue-50/70 dark:bg-blue-950/30 border-blue-300/70 dark:border-blue-500/40'
                      : 'bg-white/60 dark:bg-slate-800/50 border-white/80 dark:border-slate-700/60'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center font-mono font-extrabold text-sm shrink-0 ${rankBadge(idx)}`}
                    >
                      #{idx + 1}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-display text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate">
                          {bidder.name}
                        </span>
                        {bidder.vipTier !== 'NONE' && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-amber-400/20 text-amber-700 dark:text-amber-300 text-[10px] font-bold">
                            <Crown size={10} />
                            {bidder.vipTier}
                          </span>
                        )}
                        {isMe && (
                          <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400">
                            (Siz)
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {bidder.winsCount} ta yutuq · {bidder.totalBids} ta stavka
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="font-mono tabular-nums text-sm sm:text-base font-extrabold text-blue-600 dark:text-blue-400">
                      {bidder.totalSpentUzs > 0
                        ? formatUzs(bidder.totalSpentUzs)
                        : `${bidder.totalBids} stavka`}
                    </p>
                    <p className="text-[10px] text-slate-500">
                      {bidder.winsCount > 0 ? 'Yutilgan summa' : 'Faollik'}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};
