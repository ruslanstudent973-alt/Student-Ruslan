import React, { useState, useEffect, useRef } from 'react';
import {
  ShoppingCart, ChevronLeft, Trash2, CreditCard, Package, Truck, MapPin,
  Copy, UploadCloud, ShieldCheck, Loader2, Check, Receipt, Clock, CheckCircle2, ArrowRight,
  Crown, Wallet, Zap, XCircle, RefreshCw
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Order, Product, User, View, ResaleListing } from '../types';
import {
  MARKUP_RATE, CURRENCY_RATE, CARD_NUMBER, CARD_OWNER,
  DELIVERY_RATES, PICKUP_ADDRESS, USD_RATE, CARGO_RATE_USD
} from '../constants';
import { SafeImage } from './YuyuPrimitives';
import { CartRecommendationsSection } from './CartRecommendationsSection';
import { CartSavingsNudge } from './VipComponents';
import { ResaleListingModal } from './TayyorBozorViews';
import { motion, AnimatePresence } from 'framer-motion';
import {
  getEffectiveVipStatus,
  getRegularPriceUzs,
  getEffectiveProductPriceUzs
} from '../utils/vip';
import { StaggerGrid, StaggerItem, GlassReveal } from './GlassMotionPrimitives';
import { uploadMediaSmart } from '../utils/r2MediaUpload';
import { LiveCargoTracker } from './LiveCargoTracker';

export const CartView: React.FC<{
  t: any;
  cart: any[];
  products: Product[];
  onRemove: (id: string) => void;
  onCheckout: (item: any) => void;
  onProductClick: (product: Product) => void;
  onAddToCart: (product: Product, size: string) => void;
  onBack: () => void;
  playSound: () => void;
  currentUser?: User | null;
  onOpenVipModal?: () => void;
}> = ({
  t,
  cart,
  products,
  onRemove,
  onCheckout,
  onProductClick,
  onAddToCart,
  onBack,
  playSound,
  currentUser,
  onOpenVipModal
}) => {
  const total = cart.reduce(
    (acc: number, item: any) =>
      acc + getEffectiveProductPriceUzs(item.product, currentUser) * (item.quantity || 1),
    0
  );

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between pb-6 border-b border-slate-200/70 dark:border-slate-800/70">
        <div className="space-y-1">
          <h1 className="font-display text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
            {t.cart}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 tabular-nums">
            Savatda {cart.length} ta mahsulot mavjud
          </p>
        </div>
        <motion.button
          type="button"
          whileHover={{ x: -2 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => {
            playSound();
            onBack();
          }}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl yuyu-glass-subtle text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-[#0F294A] dark:hover:text-white transition-colors"
        >
          <ChevronLeft size={16} />
          <span>Xaridni davom ettirish</span>
        </motion.button>
      </div>

      {cart.length === 0 ? (
        <GlassReveal>
          <div className="yuyu-glass rounded-3xl py-20 text-center space-y-4">
            <ShoppingCart size={44} strokeWidth={1.3} className="mx-auto text-slate-300 dark:text-slate-600" />
            <div className="space-y-1">
              <p className="font-display font-semibold text-lg text-slate-900 dark:text-white">
                {t.emptyCart}
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Katalogdan o'zingizga yoqqan mahsulotlarni qo'shing.
              </p>
            </div>
            <motion.button
              type="button"
              whileHover={{ y: -2, scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => {
                playSound();
                onBack();
              }}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#0F294A] hover:bg-[#163A66] dark:bg-blue-600 text-white text-sm font-semibold rounded-xl transition-colors shadow-lg shadow-blue-950/15"
            >
              <span>Xaridni boshlash</span>
              <ArrowRight size={16} />
            </motion.button>
          </div>
        </GlassReveal>
      ) : (
        <div className="space-y-6">
          <CartSavingsNudge
            cart={cart}
            user={currentUser}
            onOpenSubscribeModal={() => onOpenVipModal?.()}
          />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Itemized List */}
            <div className="lg:col-span-8 space-y-4">
              <AnimatePresence mode="popLayout">
                {cart.map((item: any) => {
                  const regularPrice = getRegularPriceUzs(item.product);
                  const itemPrice = getEffectiveProductPriceUzs(item.product, currentUser);
                  const hasVipDiscount = itemPrice < regularPrice;
                  return (
                    <motion.div
                      key={item.id}
                      layout
                      initial={{ opacity: 0, y: 14, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, x: -32, scale: 0.95 }}
                      transition={{ type: 'spring', stiffness: 360, damping: 28 }}
                      whileHover={{ y: -2 }}
                      className="yuyu-glass p-5 rounded-3xl flex flex-col sm:flex-row sm:items-center gap-5"
                    >
                      <div className="w-24 h-24 rounded-2xl bg-white/75 dark:bg-slate-800/75 border border-white/80 dark:border-slate-700/60 p-2 shrink-0 flex items-center justify-center overflow-hidden">
                        <SafeImage
                          src={item.product.images?.[0]}
                          alt={item.product.name}
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <div className="flex-1 min-w-0 space-y-1">
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {item.product.category} · Variant: {item.size}
                          {(item.quantity || 1) > 1 ? ` · ${item.quantity} dona` : ''}
                        </p>
                        <h3 className="font-display font-semibold text-base text-slate-900 dark:text-white truncate">
                          {item.product.name}
                        </h3>
                        <div className="flex flex-wrap items-center gap-2">
                          {hasVipDiscount && (
                            <span className="font-mono tabular-nums text-xs text-slate-400 line-through">
                              {(regularPrice * (item.quantity || 1)).toLocaleString()} so'm
                            </span>
                          )}
                          <p className="font-mono tabular-nums text-base font-bold text-[#0F294A] dark:text-blue-400">
                            {(itemPrice * (item.quantity || 1)).toLocaleString()} so'm
                          </p>
                          {hasVipDiscount && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-400/15 border border-amber-400/40 text-amber-600 dark:text-amber-300 text-[10px] font-mono font-bold">
                              <Crown size={10} />
                              <span>VIP narx</span>
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2.5 shrink-0">
                        <motion.button
                          type="button"
                          whileHover={{ scale: 1.03 }}
                          whileTap={{ scale: 0.96 }}
                          onClick={() => {
                            playSound();
                            onCheckout(item);
                          }}
                          className="px-4 py-2.5 rounded-xl bg-[#0F294A] hover:bg-[#163A66] dark:bg-blue-600 text-white text-xs font-semibold transition-colors whitespace-nowrap shadow-md shadow-blue-950/15"
                        >
                          Rasmiylashtirish
                        </motion.button>
                        <motion.button
                          type="button"
                          whileHover={{ scale: 1.06 }}
                          whileTap={{ scale: 0.92 }}
                          onClick={() => {
                            playSound();
                            onRemove(item.id);
                          }}
                          aria-label="O'chirish"
                          className="p-2.5 rounded-xl yuyu-glass-subtle text-slate-500 hover:text-red-600 hover:border-red-300/70 dark:hover:border-red-900/60 transition-colors"
                        >
                          <Trash2 size={16} />
                        </motion.button>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>

            {/* Sticky Summary Panel */}
            <aside className="lg:col-span-4 lg:sticky lg:top-24 yuyu-glass-strong p-6 rounded-3xl space-y-5">
              <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                Buyurtma xulosasi
              </h2>
              <div className="space-y-3 text-sm border-y border-slate-200/60 dark:border-slate-700/60 py-4">
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Mahsulotlar soni</span>
                  <span className="font-mono tabular-nums font-medium text-slate-900 dark:text-white">
                    {cart.length} ta
                  </span>
                </div>
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>{t.total}</span>
                  <span className="font-mono tabular-nums text-xl font-bold text-[#0F294A] dark:text-blue-400">
                    {total.toLocaleString()} so'm
                  </span>
                </div>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Har bir mahsulot alohida buyurtma sifatida rasmiylashtiriladi va trek raqami biriktiriladi.
              </p>
              <motion.button
                type="button"
                whileHover={{ y: -2, scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  playSound();
                  onCheckout(cart[0]);
                }}
                className="w-full py-3.5 px-5 bg-[#0F294A] hover:bg-[#163A66] dark:bg-blue-600 text-white font-semibold rounded-xl text-sm transition-colors shadow-lg shadow-blue-950/15"
              >
                Birinchi mahsulotni to'lash
              </motion.button>
            </aside>
          </div>
        </div>
      )}

      <CartRecommendationsSection
        cart={cart}
        products={products}
        currentUser={currentUser}
        onOpenVipModal={onOpenVipModal}
        onProductClick={onProductClick}
        onQuickAdd={onAddToCart}
      />
    </div>
  );
};

export const PaymentView: React.FC<{
  t: any;
  product: Product;
  quantity?: number;
  onConfirm: (receipt: string, addr: string, finalPrice: number, usedPromo?: string, cashbackUsed?: number) => void;
  onBack: () => void;
  playSound: () => void;
  promoCodes: any[];
  notify: (msg: string, type?: 'success' | 'error' | 'info') => void;
  currentUser?: User | null;
}> = ({ t, product, quantity = 1, onConfirm, onBack, playSound, promoCodes, notify, currentUser }) => {
  const safeQty = Math.max(1, Math.round(quantity || 1));
  const [receipt, setReceipt] = useState<string | null>(null);
  const [address, setAddress] = useState(PICKUP_ADDRESS);
  const [isSimulating, setIsSimulating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const [promoCode, setPromoCode] = useState('');
  const [discount, setDiscount] = useState(0);
  const [promoError, setPromoError] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<string | null>(null);

  const [deliveryMethod, setDeliveryMethod] = useState<'pickup' | 'courier'>('pickup');
  const [selectedRegion, setSelectedRegion] = useState(DELIVERY_RATES[0].region);
  const [rawDeliveryPrice, setRawDeliveryPrice] = useState(0);
  const [useCashback, setUseCashback] = useState(false);

  const timerRef = useRef<number | null>(null);
  const hasSubmittedRef = useRef(false);
  const prevDeliveryMethodRef = useRef<'pickup' | 'courier'>('pickup');

  const vipInfo = getEffectiveVipStatus(currentUser);
  const unitRegularPrice = getRegularPriceUzs(product);
  const unitBasePrice = getEffectiveProductPriceUzs(product, currentUser);
  const regularPrice = unitRegularPrice * safeQty;
  const basePrice = unitBasePrice * safeQty;
  const vipPriceSavings = Math.max(0, regularPrice - basePrice);
  const totalWeightKg = Number(((product.weight || 0) * safeQty).toFixed(2));
  const cargoCost = Math.round(totalWeightKg * CARGO_RATE_USD * USD_RATE);

  useEffect(() => {
    if (deliveryMethod === 'pickup') {
      setRawDeliveryPrice(0);
      setAddress(PICKUP_ADDRESS);
    } else {
      const rate = DELIVERY_RATES.find((r) => r.region === selectedRegion);
      setRawDeliveryPrice(rate ? rate.price : 0);
      // Only clear address when switching from pickup -> courier (preserve user's typed address on region change)
      if (prevDeliveryMethodRef.current === 'pickup' || address === PICKUP_ADDRESS) {
        setAddress('');
      }
    }
    prevDeliveryMethodRef.current = deliveryMethod;
  }, [deliveryMethod, selectedRegion]);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  const deliveryDiscountAmount = Math.round(rawDeliveryPrice * vipInfo.deliveryDiscountRate);
  const deliveryPrice = Math.max(0, rawDeliveryPrice - deliveryDiscountAmount);

  const subtotalBeforeCashback = Math.max(
    0,
    Math.round(basePrice * (1 - discount) + cargoCost + deliveryPrice)
  );
  const availableCashback = vipInfo.cashbackBalance;
  const cashbackApplied =
    useCashback && availableCashback > 0 ? Math.min(availableCashback, subtotalBeforeCashback) : 0;
  const finalPrice = Math.max(0, subtotalBeforeCashback - cashbackApplied);
  const expectedCashbackEarn = Math.round(finalPrice * vipInfo.cashbackRate);

  const handleApplyPromo = () => {
    playSound();
    const trimmed = promoCode.trim().toUpperCase();
    const code = promoCodes.find(
      (p: any) => String(p.code || '').toUpperCase() === trimmed && !p.isUsed
    );
    if (code) {
      setDiscount(code.discount);
      setAppliedPromo(code.code);
      setPromoError('');
      notify(`Promo-kod qabul qilindi: ${Math.round(code.discount * 100)}% chegirma`, 'success');
    } else {
      setPromoError("Noto'g'ri yoki ishlatilgan promo-kod");
      setDiscount(0);
      setAppliedPromo(null);
    }
  };

  const handleFile = async (file: File) => {
    playSound();
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

  const handleConfirm = () => {
    if (isSimulating || hasSubmittedRef.current) return;
    playSound();
    if (!address.trim()) {
      notify("Iltimos, yetkazib berish manzilini kiriting", 'error');
      return;
    }
    if (!receipt && finalPrice > 0) {
      notify("Iltimos, avval to'lov cheki rasmini yuklang", 'error');
      return;
    }
    const fullAddress =
      deliveryMethod === 'courier' ? `${selectedRegion}, ${address.trim()}` : address.trim();
    setIsSimulating(true);
    setProgress(0);
    const duration = 1800;
    const step = 80;
    let currentPct = 0;

    timerRef.current = window.setInterval(() => {
      currentPct = Math.min(100, currentPct + (step / duration) * 100);
      setProgress(currentPct);
      if (currentPct >= 100) {
        if (timerRef.current !== null) {
          window.clearInterval(timerRef.current);
          timerRef.current = null;
        }
        if (!hasSubmittedRef.current) {
          hasSubmittedRef.current = true;
          onConfirm(receipt || '', fullAddress, finalPrice, appliedPromo || undefined, cashbackApplied);
        }
      }
    }, step);
  };

  if (isSimulating) {
    return (
      <div className="py-24 flex flex-col items-center justify-center text-center space-y-6">
        <div className="relative">
          <Loader2 className="w-24 h-24 text-[#0F294A] dark:text-blue-400 animate-spin" strokeWidth={1.5} />
          <div className="absolute inset-0 flex items-center justify-center font-mono tabular-nums font-bold text-lg">
            {Math.round(progress)}%
          </div>
        </div>
        <div className="space-y-1">
          <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
            {t.verifyingPayment}
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Buyurtma va chek ma'lumotlari saqlanmoqda. Iltimos, kuting.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4 pb-6 border-b border-slate-200/70 dark:border-slate-800/70">
        <motion.button
          type="button"
          whileHover={{ x: -2 }}
          whileTap={{ scale: 0.94 }}
          onClick={() => {
            playSound();
            onBack();
          }}
          className="p-2.5 yuyu-glass-subtle rounded-xl hover:bg-white/80 dark:hover:bg-slate-800/80 transition-colors"
        >
          <ChevronLeft size={18} />
        </motion.button>
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
            {t.paymentTitle}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">{product.name}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left 7 Cols: Delivery, Promo & Receipt Upload */}
        <div className="lg:col-span-7 space-y-6">
          {/* Delivery Method Card */}
          <div className="yuyu-glass p-6 sm:p-7 rounded-3xl space-y-5">
            <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">
              Yetkazib berish usuli
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => {
                  playSound();
                  setDeliveryMethod('pickup');
                }}
                className={`p-4 rounded-2xl border text-left transition-all space-y-1.5 ${
                  deliveryMethod === 'pickup'
                    ? 'border-[#0F294A] bg-blue-50/75 dark:border-blue-500 dark:bg-blue-950/40 shadow-sm'
                    : 'border-white/70 dark:border-slate-700/70 bg-white/45 dark:bg-slate-900/45 hover:bg-white/75 dark:hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center justify-between">
                  <Package size={18} className="text-[#0F294A] dark:text-blue-400" />
                  <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                    Bepul
                  </span>
                </div>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                  Olib ketish punkti
                </p>
              </button>

              <button
                type="button"
                onClick={() => {
                  playSound();
                  setDeliveryMethod('courier');
                }}
                className={`p-4 rounded-2xl border text-left transition-all space-y-1.5 ${
                  deliveryMethod === 'courier'
                    ? 'border-[#0F294A] bg-blue-50/75 dark:border-blue-500 dark:bg-blue-950/40 shadow-sm'
                    : 'border-white/70 dark:border-slate-700/70 bg-white/45 dark:bg-slate-900/45 hover:bg-white/75 dark:hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center justify-between">
                  <Truck size={18} className="text-[#0F294A] dark:text-blue-400" />
                  <span className="text-xs font-semibold text-slate-500">Hudud bo'yicha</span>
                </div>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                  Kuryer orqali
                </p>
              </button>
            </div>

            {deliveryMethod === 'pickup' ? (
              <div className="yuyu-glass-subtle p-4 rounded-2xl space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-semibold text-[#0F294A] dark:text-blue-400">
                  <MapPin size={14} />
                  <span>YUYU Shop topshirish punkti</span>
                </div>
                <p className="text-sm font-medium text-slate-900 dark:text-white">{PICKUP_ADDRESS}</p>
                <p className="text-xs text-slate-500">Ish vaqti: 09:00 – 20:00</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                    Viloyatni tanlang
                  </label>
                  <select
                    value={selectedRegion}
                    onChange={(e) => {
                      playSound();
                      setSelectedRegion(e.target.value);
                    }}
                    className="w-full yuyu-glass-input rounded-xl px-4 py-3 text-sm font-medium outline-none focus:border-[#0F294A]"
                  >
                    {DELIVERY_RATES.map((r) => (
                      <option key={r.region} value={r.region}>
                        {r.region} — {r.price.toLocaleString()} UZS
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                    Aniq manzil (ko'cha, uy, xonadon)
                  </label>
                  <textarea
                    className="w-full yuyu-glass-input rounded-xl p-4 text-sm outline-none focus:border-[#0F294A] resize-none"
                    placeholder="Masalan: Navoiy ko'chasi, 12-uy, 4-xonadon"
                    rows={2}
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* Promo Code Row */}
            <div className="pt-5 border-t border-slate-200/60 dark:border-slate-800/70 space-y-2.5">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                Promo-kod (ixtiyoriy)
              </label>
              <div className="flex gap-2.5">
                <input
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value)}
                  placeholder="Kodni kiriting"
                  className="flex-1 yuyu-glass-input rounded-xl px-4 py-2.5 text-sm font-mono uppercase outline-none focus:border-[#0F294A]"
                />
                <button
                  type="button"
                  onClick={handleApplyPromo}
                  className="px-5 py-2.5 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-semibold rounded-xl text-xs whitespace-nowrap"
                >
                  Qo'llash
                </button>
              </div>
              {promoError && <p className="text-xs text-red-600 dark:text-red-400">{promoError}</p>}
              {appliedPromo && (
                <p className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">
                  Promo-kod qo'llanildi: {appliedPromo}
                </p>
              )}
            </div>

            {/* Cashback Usage Toggle */}
            {availableCashback > 0 && (
              <div className="pt-5 border-t border-slate-100 dark:border-slate-800">
                <div className="p-4 rounded-xl bg-[#070B14] border border-amber-400/50 text-white flex items-center justify-between gap-4 shadow-[0_0_20px_rgba(251,191,36,0.12)]">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-amber-400/15 border border-amber-400/40 text-amber-300 flex items-center justify-center shrink-0">
                      <Wallet size={17} />
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-sm font-bold text-white">Keshbekdan foydalanish</p>
                      <p className="text-xs text-slate-400 font-mono">
                        Mavjud balans:{' '}
                        <span className="text-amber-300 font-bold">
                          {availableCashback.toLocaleString()} so'm
                        </span>
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={useCashback}
                    onClick={() => {
                      playSound();
                      setUseCashback((prev) => !prev);
                    }}
                    className={`relative w-12 h-7 rounded-full transition-colors shrink-0 ${
                      useCashback ? 'bg-amber-400' : 'bg-slate-700'
                    }`}
                  >
                    <span
                      className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white transition-transform ${
                        useCashback ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Receipt Uploader */}
          <div className="yuyu-glass p-6 sm:p-7 rounded-3xl space-y-4">
            <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">
              {t.uploadReceipt}
            </h2>
            <label
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                setIsDragging(false);
              }}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                const file = e.dataTransfer.files?.[0];
                if (file) handleFile(file);
              }}
              className={`flex flex-col items-center justify-center w-full h-52 border-2 border-dashed rounded-2xl cursor-pointer transition-colors relative overflow-hidden ${
                isDragging
                  ? 'border-[#0F294A] bg-blue-50/70 dark:bg-blue-950/35'
                  : 'border-slate-300/70 dark:border-slate-700/80 bg-white/40 dark:bg-slate-900/40 hover:bg-white/70 dark:hover:bg-slate-800/50'
              }`}
            >
              {receipt ? (
                <div className="absolute inset-0 group">
                  <img src={receipt} alt="To'lov cheki" className="h-full w-full object-contain bg-slate-950/5" />
                  <div className="absolute inset-0 bg-slate-950/50 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 transition-opacity text-white text-xs font-semibold">
                    <UploadCloud size={20} />
                    <span>Rasmni almashtirish</span>
                  </div>
                </div>
              ) : (
                <div className="text-center px-4 space-y-2">
                  <UploadCloud size={28} className="mx-auto text-slate-400" />
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Chek rasmini tanlang yoki shu yerga tashlang
                  </p>
                  <p className="text-xs text-slate-400">PNG, JPG formatlar qo'llab-quvvatlanadi</p>
                </div>
              )}
              <input
                type="file"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFile(file);
                }}
                accept="image/*"
              />
            </label>
          </div>
        </div>

        {/* Right 5 Cols: Payment Card + Itemized Totals */}
        <aside className="lg:col-span-5 lg:sticky lg:top-24 space-y-6">
          <motion.div
            whileHover={{ y: -3, scale: 1.01 }}
            transition={{ type: 'spring', stiffness: 320, damping: 24 }}
            className="bg-gradient-to-br from-[#0F294A] via-[#133560] to-[#0B1F3B] rounded-3xl p-6 text-white space-y-5 relative overflow-hidden shadow-[0_20px_45px_rgba(15,41,74,0.24)] border border-white/15"
          >
            <CreditCard className="absolute -top-4 -right-4 w-28 h-28 opacity-10" />
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-blue-200">To'lov kartasi</span>
              <span className="font-display text-sm font-bold tracking-wider">UZCARD</span>
            </div>
            <p className="text-xl sm:text-2xl font-mono tabular-nums tracking-wider">{CARD_NUMBER}</p>
            <div className="flex items-center justify-between pt-2 border-t border-white/15">
              <span className="text-sm font-medium text-slate-200">{CARD_OWNER}</span>
              <button
                type="button"
                onClick={() => {
                  playSound();
                  navigator.clipboard.writeText(CARD_NUMBER);
                  notify("Karta raqami nusxalandi", 'success');
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-xs font-semibold transition-colors"
              >
                <Copy size={13} />
                <span>Nusxalash</span>
              </button>
            </div>
          </motion.div>

          <div className="yuyu-glass-strong p-6 rounded-3xl space-y-5">
            <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">
              To'lov hisob-kitobi
            </h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>
                  Mahsulot narxi{safeQty > 1 ? ` (${safeQty} dona)` : ''}
                </span>
                <span className="font-mono tabular-nums font-medium text-slate-900 dark:text-white">
                  {regularPrice.toLocaleString()} so'm
                </span>
              </div>
              {vipPriceSavings > 0 && (
                <div className="flex justify-between text-amber-600 dark:text-amber-400 font-medium">
                  <span className="inline-flex items-center gap-1">
                    <Crown size={13} />
                    <span>VIP maxsus narx chegirmasi</span>
                  </span>
                  <span className="font-mono tabular-nums font-semibold">
                    -{vipPriceSavings.toLocaleString()} so'm
                  </span>
                </div>
              )}
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Kargo ({totalWeightKg} kg)</span>
                <span className="font-mono tabular-nums font-medium text-slate-900 dark:text-white">
                  {cargoCost.toLocaleString()} so'm
                </span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-emerald-700 dark:text-emerald-400">
                  <span>Promo-kod ({Math.round(discount * 100)}%)</span>
                  <span className="font-mono tabular-nums font-semibold">
                    -{Math.round(basePrice * discount).toLocaleString()} so'm
                  </span>
                </div>
              )}
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>
                  Yetkazib berish
                  {deliveryDiscountAmount > 0 && (
                    <span className="ml-1.5 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                      (VIP -{Math.round(vipInfo.deliveryDiscountRate * 100)}%)
                    </span>
                  )}
                </span>
                <span className="font-mono tabular-nums font-medium text-slate-900 dark:text-white">
                  {deliveryPrice === 0 ? 'Bepul' : `${deliveryPrice.toLocaleString()} so'm`}
                </span>
              </div>
              {cashbackApplied > 0 && (
                <div className="flex justify-between text-amber-600 dark:text-amber-400 font-medium">
                  <span>Ishlatilgan keshbek</span>
                  <span className="font-mono tabular-nums font-semibold">
                    -{cashbackApplied.toLocaleString()} so'm
                  </span>
                </div>
              )}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between items-baseline">
                <span className="font-semibold text-slate-900 dark:text-white">Jami summa</span>
                <span className="font-mono tabular-nums text-2xl font-bold text-[#0F294A] dark:text-blue-400">
                  {finalPrice.toLocaleString()} so'm
                </span>
              </div>

              {expectedCashbackEarn > 0 && (
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-500/30 flex items-center justify-between text-xs text-amber-800 dark:text-amber-300">
                  <span className="inline-flex items-center gap-1.5 font-semibold">
                    <Crown size={13} />
                    <span>Yetkazilganda keshbek ({Math.round(vipInfo.cashbackRate * 100)}%)</span>
                  </span>
                  <span className="font-mono font-bold">+{expectedCashbackEarn.toLocaleString()} so'm</span>
                </div>
              )}
            </div>

            <motion.button
              type="button"
              whileHover={{ y: -2, scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleConfirm}
              className="w-full py-3.5 px-6 bg-[#0F294A] hover:bg-[#163A66] dark:bg-blue-600 dark:hover:bg-blue-500 text-white font-semibold rounded-xl flex items-center justify-center gap-2 text-sm transition-colors shadow-lg shadow-blue-950/15"
            >
              <ShieldCheck size={18} />
              <span>{t.confirmPayment}</span>
            </motion.button>
          </div>
        </aside>
      </div>
    </div>
  );
};

export const ReceiptView: React.FC<{
  t: any;
  order: Order | null;
  onBack: () => void;
  playSound: () => void;
}> = ({ t, order, onBack, playSound }) => {
  if (!order) return null;

  return (
    <GlassReveal className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <motion.button
          type="button"
          whileHover={{ x: -2 }}
          whileTap={{ scale: 0.94 }}
          onClick={() => {
            playSound();
            onBack();
          }}
          className="p-2.5 yuyu-glass-subtle rounded-xl"
        >
          <ChevronLeft size={18} />
        </motion.button>
        <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
          YUYU Shop · Buyurtma cheki
        </h1>
      </div>

      <div className="yuyu-glass-strong rounded-3xl p-8 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Check size={24} />
            </div>
            <div>
              <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white">
                Buyurtma qabul qilindi
              </h2>
              <p className="text-xs font-mono tabular-nums text-slate-500">
                {t.orderId}: {order.id}
              </p>
            </div>
          </div>
          <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
            {t[order.status] || order.status}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
          <div className="md:col-span-7 space-y-3.5 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-slate-500">{t.orderDate}</span>
              <span className="font-mono tabular-nums font-medium text-slate-900 dark:text-white">
                {order.date}
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-slate-500">Mahsulot</span>
              <span className="font-medium text-right text-slate-900 dark:text-white">
                {order.productName}
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-slate-500">Manzil</span>
              <span className="font-medium text-right text-slate-900 dark:text-white max-w-[220px]">
                {order.address}
              </span>
            </div>
            {Boolean(order.cashbackUsed && order.cashbackUsed > 0) && (
              <div className="flex justify-between gap-4 text-amber-600 dark:text-amber-400">
                <span>Ishlatilgan keshbek</span>
                <span className="font-mono tabular-nums font-semibold">
                  -{(order.cashbackUsed || 0).toLocaleString()} so'm
                </span>
              </div>
            )}
            {Boolean(order.cashbackEarned && order.cashbackEarned > 0) && (
              <div className="flex justify-between gap-4 text-emerald-600 dark:text-emerald-400">
                <span>Olingan VIP keshbek</span>
                <span className="font-mono tabular-nums font-semibold">
                  +{(order.cashbackEarned || 0).toLocaleString()} so'm
                </span>
              </div>
            )}
            <div className="flex justify-between items-baseline pt-3 border-t border-slate-100 dark:border-slate-800">
              <span className="font-semibold text-slate-900 dark:text-white">Jami to'lov</span>
              <span className="font-mono tabular-nums text-xl font-bold text-[#0F294A] dark:text-blue-400">
                {order.price.toLocaleString()} so'm
              </span>
            </div>
          </div>

          <div className="md:col-span-5 flex flex-col items-center space-y-3">
            <div className="p-3 bg-white rounded-xl border border-slate-200">
              <QRCodeSVG value={`https://yuyu-shop.uz/order/${order.id}`} size={132} />
            </div>
            <p className="text-xs text-slate-400">{t.scanQR}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            playSound();
            onBack();
          }}
          className="w-full py-3 yuyu-glass-subtle hover:bg-white/90 dark:hover:bg-slate-800 text-slate-800 dark:text-white rounded-xl font-semibold text-sm transition-colors"
        >
          Buyurtmalarim sahifasiga o'tish
        </button>
      </div>
    </GlassReveal>
  );
};

export const OrdersView: React.FC<{
  t: any;
  orders: Order[];
  products?: Product[];
  currentUser?: User | null;
  onNavigate: (view: View) => void;
  setReceiptOrder: (o: Order) => void;
  notify?: (msg: string, type?: 'success' | 'error' | 'info') => void;
  safeFetchJSON?: (url: string, options?: RequestInit) => Promise<any>;
  onRefreshOrders?: () => Promise<void> | void;
}> = ({
  t,
  orders,
  products = [],
  currentUser,
  onNavigate,
  setReceiptOrder,
  notify,
  safeFetchJSON,
  onRefreshOrders
}) => {
  const [myResales, setMyResales] = useState<ResaleListing[]>([]);
  const [resaleModalOrder, setResaleModalOrder] = useState<Order | null>(null);
  const [refreshingCargo, setRefreshingCargo] = useState(false);

  const onRefreshRef = useRef(onRefreshOrders);
  useEffect(() => {
    onRefreshRef.current = onRefreshOrders;
  }, [onRefreshOrders]);

  useEffect(() => {
    if (!onRefreshRef.current) return;
    const interval = window.setInterval(() => {
      void onRefreshRef.current?.();
    }, 15000);
    return () => window.clearInterval(interval);
  }, []);

  const handleManualRefresh = async () => {
    if (!onRefreshRef.current || refreshingCargo) return;
    setRefreshingCargo(true);
    try {
      await onRefreshRef.current();
    } finally {
      window.setTimeout(() => setRefreshingCargo(false), 400);
    }
  };

  useEffect(() => {
    const uid = currentUser?.telegramId || currentUser?.phoneNumber;
    if (!uid || !safeFetchJSON) return;
    let active = true;
    safeFetchJSON(`/api/resale/user/${encodeURIComponent(uid)}`)
      .then((res) => {
        if (active && res?.success && Array.isArray(res.listings)) {
          setMyResales(res.listings);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [currentUser?.telegramId, currentUser?.phoneNumber]);

  const resaleByOrderId = React.useMemo(() => {
    const map = new Map<string, ResaleListing>();
    for (const item of myResales) {
      const existing = map.get(item.originalOrderId);
      // Prefer non-rejected or latest listing
      if (!existing || (existing.status === 'rejected' && item.status !== 'rejected')) {
        map.set(item.originalOrderId, item);
      }
    }
    return map;
  }, [myResales]);

  return (
    <div className="space-y-8">
      <div className="pb-6 border-b border-slate-200/70 dark:border-slate-800/70 flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="font-display text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
            Buyurtmalarim
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 tabular-nums">
            Jami {orders.length} ta buyurtma tarixi
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          {onRefreshOrders && (
            <button
              type="button"
              onClick={handleManualRefresh}
              disabled={refreshingCargo}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white/90 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 text-xs font-semibold text-[#2563EB] dark:text-blue-400 hover:bg-blue-50/70 dark:hover:bg-slate-800 transition-colors whitespace-nowrap"
            >
              <RefreshCw size={14} className={refreshingCargo ? 'animate-spin' : ''} />
              <span>Kargoni yangilash</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => onNavigate('tayyor_bozor')}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl yuyu-glass-subtle text-xs font-semibold text-[#0F294A] dark:text-blue-400 hover:bg-white/90 dark:hover:bg-slate-800 transition-colors whitespace-nowrap"
          >
            <Zap size={14} className="text-amber-500" />
            <span>Tayyor Bozor vitrinasi</span>
          </button>
        </div>
      </div>

      {orders.length === 0 ? (
        <GlassReveal>
          <div className="yuyu-glass rounded-3xl py-20 text-center space-y-4">
            <Package size={40} strokeWidth={1.3} className="mx-auto text-slate-300 dark:text-slate-600" />
            <p className="text-sm text-slate-500 dark:text-slate-400">Hali buyurtmalar mavjud emas.</p>
            <motion.button
              type="button"
              whileHover={{ y: -2, scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => onNavigate('catalog')}
              className="px-5 py-2.5 rounded-xl bg-[#0F294A] dark:bg-blue-600 text-white text-sm font-semibold shadow-md shadow-blue-950/15"
            >
              Katalogni ko'rish
            </motion.button>
          </div>
        </GlassReveal>
      ) : (
        <StaggerGrid className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {orders.map((o) => {
            const isDone = o.status === 'delivered' || o.status === 'paid';
            const isCancelled = o.status === 'cancelled';
            const resale = resaleByOrderId.get(o.id);
            const canListResale =
              o.status === 'delivered' &&
              Boolean(currentUser && safeFetchJSON && notify) &&
              (!resale || resale.status === 'rejected');

            return (
              <StaggerItem key={o.id}>
                <motion.div
                  whileHover={{ y: -3 }}
                  transition={{ type: 'spring', stiffness: 320, damping: 26 }}
                  className="yuyu-glass p-6 rounded-3xl space-y-4 h-full flex flex-col justify-between"
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-200/60 dark:border-slate-800/70">
                      <div className="flex items-center gap-2 text-xs font-mono tabular-nums text-slate-500">
                        <span className="font-semibold text-slate-900 dark:text-white">{o.id}</span>
                        <span aria-hidden="true">·</span>
                        <span>{o.date}</span>
                      </div>
                      <span
                        className={`inline-flex items-center gap-1.5 text-xs font-semibold ${
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
                        <span>{t[o.status] || o.status}</span>
                      </span>
                    </div>

                    <div className="flex items-start gap-4">
                      {o.receiptImage && (
                        <img
                          src={o.receiptImage}
                          alt="Chek"
                          className="w-16 h-16 rounded-xl object-cover border border-white/70 dark:border-slate-700 shrink-0"
                        />
                      )}
                      <div className="flex-1 min-w-0 space-y-1">
                        <h3 className="font-display font-semibold text-base text-slate-900 dark:text-white truncate">
                          {o.productName}
                        </h3>
                        <p className="text-xs text-slate-500">Variant: {o.size}</p>
                        <p className="font-mono tabular-nums text-lg font-bold text-[#0F294A] dark:text-blue-400 pt-1">
                          {o.price.toLocaleString()} so'm
                        </p>
                        <div className="flex flex-wrap gap-2 pt-1">
                          {Boolean(o.cashbackUsed && o.cashbackUsed > 0) && (
                            <span className="text-[11px] font-mono text-amber-600 dark:text-amber-400">
                              Keshbek ishlatildi: -{(o.cashbackUsed || 0).toLocaleString()} so'm
                            </span>
                          )}
                          {Boolean(o.cashbackEarned && o.cashbackEarned > 0) && (
                            <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400">
                              VIP keshbek: +{(o.cashbackEarned || 0).toLocaleString()} so'm
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Live China -> Uzbekistan Cargo Tracker with animated blue truck */}
                    {!isCancelled ? (
                      <LiveCargoTracker order={o} />
                    ) : (
                      <div className="rounded-2xl bg-red-50/80 dark:bg-red-950/30 border border-red-200/70 dark:border-red-900/50 px-4 py-3 text-xs text-red-700 dark:text-red-300">
                        Ushbu buyurtma bekor qilingan, kargo harakati to&apos;xtatilgan.
                      </div>
                    )}

                    {/* Tayyor Bozor Resale Status / 1-Click CTA on Delivered Orders */}
                    {resale && resale.status !== 'rejected' && (
                      <div
                        className={`p-3.5 rounded-2xl border text-xs space-y-1 ${
                          resale.status === 'sold'
                            ? 'bg-emerald-50/90 dark:bg-emerald-950/35 border-emerald-300/70 dark:border-emerald-700/60 text-emerald-800 dark:text-emerald-300'
                            : resale.status === 'reserved'
                            ? 'bg-purple-50/90 dark:bg-purple-950/35 border-purple-300/70 dark:border-purple-700/60 text-purple-800 dark:text-purple-300'
                            : resale.status === 'active'
                            ? 'bg-blue-50/90 dark:bg-blue-950/35 border-blue-300/70 dark:border-blue-700/60 text-blue-800 dark:text-blue-300'
                            : 'bg-amber-50/90 dark:bg-amber-950/35 border-amber-300/70 dark:border-amber-700/60 text-amber-800 dark:text-amber-300'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 font-semibold">
                          <span className="inline-flex items-center gap-1.5">
                            <Zap size={13} />
                            <span>
                              {resale.status === 'sold'
                                ? 'Sotildi — pulingiz o‘tkazildi'
                                : resale.status === 'reserved'
                                ? 'Tayyor Bozorda band qilindi'
                                : resale.status === 'active'
                                ? 'Tayyor Bozorda sotuvda'
                                : 'Tayyor Bozor: Moderatsiyada'}
                            </span>
                          </span>
                          <span className="font-mono tabular-nums">
                            {resale.resalePrice.toLocaleString()} so‘m
                          </span>
                        </div>
                        {resale.status === 'active' && (
                          <button
                            type="button"
                            onClick={() => onNavigate('tayyor_bozor')}
                            className="text-[11px] underline font-semibold"
                          >
                            Tayyor Bozorda ko‘rish
                          </button>
                        )}
                      </div>
                    )}

                    {resale && resale.status === 'rejected' && (
                      <div className="p-3 rounded-2xl bg-red-50/80 dark:bg-red-950/30 border border-red-200/70 dark:border-red-900/50 text-xs text-red-700 dark:text-red-300">
                        Oldingi Tayyor Bozor e’loni rad etildi
                        {resale.adminNote ? `: ${resale.adminNote}` : ''}. Qayta joylashingiz mumkin.
                      </div>
                    )}

                    {canListResale && (
                      <motion.button
                        type="button"
                        whileHover={{ y: -1, scale: 1.01 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setResaleModalOrder(o)}
                        className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-[#0F294A] via-[#2563EB] to-blue-600 hover:from-[#163A66] hover:to-blue-500 text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-md shadow-blue-600/20 transition-all"
                      >
                        <Zap size={15} className="text-amber-300 shrink-0" />
                        <span>Razmeri to‘g‘ri kelmadimi? — 1 bosishda sotuvga qo‘y</span>
                      </motion.button>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-200/60 dark:border-slate-800/70">
                    {(o.trackingCode || o.trackNumber) ? (
                      <div className="text-xs font-mono tabular-nums text-slate-600 dark:text-slate-300">
                        Trek-kod:{' '}
                        <span className="font-semibold text-[#2563EB] dark:text-blue-400">
                          {o.trackingCode || o.trackNumber}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">Trek-kod kutilmoqda</span>
                    )}

                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.96 }}
                      onClick={() => {
                        setReceiptOrder(o);
                        onNavigate('receipt');
                      }}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl yuyu-glass-subtle text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-white/90 dark:hover:bg-slate-800 transition-colors"
                    >
                      <Receipt size={14} />
                      <span>{t.viewReceipt}</span>
                    </motion.button>
                  </div>
                </motion.div>
              </StaggerItem>
            );
          })}
        </StaggerGrid>
      )}

      {/* 1-Click Resale Modal */}
      <AnimatePresence>
        {resaleModalOrder && currentUser && safeFetchJSON && notify && (
          <ResaleListingModal
            order={resaleModalOrder}
            product={products.find((p) => p.id === resaleModalOrder.productId) || null}
            currentUser={currentUser}
            onClose={() => setResaleModalOrder(null)}
            onCreated={(createdListing) => {
              setMyResales((prev) => [createdListing, ...prev]);
            }}
            notify={notify}
            safeFetchJSON={safeFetchJSON}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
