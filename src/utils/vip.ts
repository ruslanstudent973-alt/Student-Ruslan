import { Product, User, VipTier } from '../types';
import { MARKUP_RATE, CURRENCY_RATE } from '../constants';

export const VIP_MONTHLY_PRICE = 39000;

export const VIP_THRESHOLDS: Record<VipTier, number> = {
  NONE: 0,
  SILVER: 500000,
  GOLD: 2000000,
  DIAMOND: 5000000
};

export const VIP_CASHBACK_RATES: Record<VipTier, number> = {
  NONE: 0,
  SILVER: 0.03,
  GOLD: 0.05,
  DIAMOND: 0.1
};

export const VIP_DELIVERY_DISCOUNT: Record<VipTier, number> = {
  NONE: 0,
  SILVER: 0,
  GOLD: 0.5,
  DIAMOND: 1.0
};

export const TIER_ORDER: VipTier[] = ['NONE', 'SILVER', 'GOLD', 'DIAMOND'];

export interface EffectiveVipStatus {
  tier: VipTier;
  isVip: boolean;
  hasActiveSubscription: boolean;
  hasVipPriceAccess: boolean;
  hasVipOnlyAccess: boolean;
  cashbackRate: number;
  deliveryDiscountRate: number;
  totalSpent: number;
  cashbackBalance: number;
  vipExpiresAt: string | null;
  nextTier: VipTier | null;
  nextTierThreshold: number;
  remainingForNextTier: number;
  progressPercent: number;
  label: string;
  benefits: string[];
}

export function isSubscriptionActive(user?: Partial<User> | null): boolean {
  if (!user?.isSubscribedVip) return false;
  if (!user.vipExpiresAt) return true;
  const exp = new Date(user.vipExpiresAt).getTime();
  return !Number.isNaN(exp) && exp > Date.now();
}

export function computeTierFromSpent(totalSpent: number): VipTier {
  if (totalSpent >= VIP_THRESHOLDS.DIAMOND) return 'DIAMOND';
  if (totalSpent >= VIP_THRESHOLDS.GOLD) return 'GOLD';
  if (totalSpent >= VIP_THRESHOLDS.SILVER) return 'SILVER';
  return 'NONE';
}

export function maxTier(a: VipTier, b: VipTier): VipTier {
  return TIER_ORDER.indexOf(a) >= TIER_ORDER.indexOf(b) ? a : b;
}

export function getEffectiveVipStatus(user?: Partial<User> | null): EffectiveVipStatus {
  const totalSpent = Math.max(0, Number(user?.totalSpent) || 0);
  const cashbackBalance = Math.max(0, Number(user?.cashbackBalance) || 0);
  const hasActiveSubscription = isSubscriptionActive(user);
  const storedTier: VipTier =
    user?.vipTier && TIER_ORDER.includes(user.vipTier) ? user.vipTier : 'NONE';

  // Hybrid logic: highest of stored/manual tier, spent tier, or active Gold subscription
  let tier: VipTier = storedTier;
  if (hasActiveSubscription) {
    tier = maxTier(tier, 'GOLD');
  }
  const spentTier = computeTierFromSpent(totalSpent);
  // If user wasn't explicitly downgraded below NONE, auto-promote by totalSpent
  if (storedTier === 'NONE' && spentTier !== 'NONE') {
    tier = maxTier(tier, spentTier);
  }

  let nextTier: VipTier | null = null;
  let currentFloor = 0;
  let nextTierThreshold = 0;

  if (tier === 'NONE') {
    nextTier = 'SILVER';
    currentFloor = 0;
    nextTierThreshold = VIP_THRESHOLDS.SILVER;
  } else if (tier === 'SILVER') {
    nextTier = 'GOLD';
    currentFloor = VIP_THRESHOLDS.SILVER;
    nextTierThreshold = VIP_THRESHOLDS.GOLD;
  } else if (tier === 'GOLD') {
    nextTier = 'DIAMOND';
    currentFloor = VIP_THRESHOLDS.GOLD;
    nextTierThreshold = VIP_THRESHOLDS.DIAMOND;
  } else {
    nextTier = null;
    currentFloor = VIP_THRESHOLDS.DIAMOND;
    nextTierThreshold = VIP_THRESHOLDS.DIAMOND;
  }

  const remainingForNextTier = nextTier ? Math.max(0, nextTierThreshold - totalSpent) : 0;
  const progressPercent = nextTier
    ? Math.min(
        100,
        Math.max(
          0,
          Math.round(((Math.max(totalSpent, currentFloor) - currentFloor) / (nextTierThreshold - currentFloor)) * 100)
        )
      )
    : 100;

  const tierLabels: Record<VipTier, string> = {
    NONE: 'Oddiy mijoz',
    SILVER: 'SILVER VIP',
    GOLD: 'GOLD VIP',
    DIAMOND: 'DIAMOND VIP'
  };

  const tierBenefits: Record<VipTier, string[]> = {
    NONE: [
      "Standart yetkazib berish",
      "500 000 so'm xariddan so'ng avtomatik SILVER VIP"
    ],
    SILVER: [
      "Har xariddan 3% keshbek",
      "Maxsus Silver VIP belgisi",
      "VIP mahsulotlarni ko'rish imkoniyati"
    ],
    GOLD: [
      "Har xariddan 5% keshbek",
      "Yetkazib berishga 50% chegirma",
      "Maxsus VIP narxlardan foydalanish",
      "Ustuvor qo'llab-quvvatlash xizmati"
    ],
    DIAMOND: [
      "Har xariddan 10% keshbek",
      "Barcha hududlarga mutlaqo bepul yetkazish",
      "Eksklyuziv VIP mahsulotlarga birinchi kirish",
      "Maxsus VIP narxlar va Diamond neon maqomi"
    ]
  };

  return {
    tier,
    isVip: tier !== 'NONE',
    hasActiveSubscription,
    hasVipPriceAccess: tier === 'GOLD' || tier === 'DIAMOND',
    hasVipOnlyAccess: tier !== 'NONE',
    cashbackRate: VIP_CASHBACK_RATES[tier],
    deliveryDiscountRate: VIP_DELIVERY_DISCOUNT[tier],
    totalSpent,
    cashbackBalance,
    vipExpiresAt: user?.vipExpiresAt || null,
    nextTier,
    nextTierThreshold,
    remainingForNextTier,
    progressPercent,
    label: tierLabels[tier],
    benefits: tierBenefits[tier]
  };
}

export function getRegularPriceUzs(product: Product): number {
  return Math.round((Number(product.pinduoduoPrice) || 0) * MARKUP_RATE * CURRENCY_RATE);
}

export function getEffectiveProductPriceUzs(product: Product, user?: Partial<User> | null): number {
  const regular = getRegularPriceUzs(product);
  const vipInfo = getEffectiveVipStatus(user);
  if (vipInfo.hasVipPriceAccess && product.vipPrice && product.vipPrice > 0 && product.vipPrice < regular) {
    return Math.round(product.vipPrice);
  }
  return regular;
}

export function calculateGoldSavingsForCart(cart: any[]): {
  priceSavings: number;
  cashbackEarned: number;
  totalSavings: number;
} {
  let priceSavings = 0;
  let goldTotal = 0;

  for (const item of cart || []) {
    const product: Product | undefined = item?.product;
    if (!product) continue;
    const qty = Number(item.quantity) || 1;
    const regular = getRegularPriceUzs(product);
    const vip = product.vipPrice && product.vipPrice > 0 && product.vipPrice < regular ? product.vipPrice : regular;
    priceSavings += (regular - vip) * qty;
    goldTotal += vip * qty;
  }

  const cashbackEarned = Math.round(goldTotal * VIP_CASHBACK_RATES.GOLD);
  return {
    priceSavings: Math.round(priceSavings),
    cashbackEarned,
    totalSavings: Math.round(priceSavings + cashbackEarned)
  };
}
