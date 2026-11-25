import React, { useMemo } from 'react';
import { Plus, Star, Crown, Lock } from 'lucide-react';
import { Product, User } from '../types';
import { MARKUP_RATE, CURRENCY_RATE } from '../constants';
import { SafeImage } from './YuyuPrimitives';
import { getEffectiveVipStatus } from '../utils/vip';
import { Tilt3DGlassCard, StaggerGrid, StaggerItem } from './GlassMotionPrimitives';

interface CartRecommendationsSectionProps {
  cart: any[];
  products: Product[];
  onProductClick: (product: Product) => void;
  onQuickAdd: (product: Product, size: string) => void;
  currentUser?: User | null;
  onOpenVipModal?: () => void;
}

export const CartRecommendationsSection: React.FC<CartRecommendationsSectionProps> = ({
  cart,
  products,
  onProductClick,
  onQuickAdd,
  currentUser,
  onOpenVipModal
}) => {
  const vipInfo = getEffectiveVipStatus(currentUser);

  const { recommended, cartCategories, hasDirectMatch } = useMemo(() => {
    if (!cart || cart.length === 0 || !products || products.length === 0) {
      return { recommended: [] as Product[], cartCategories: [] as string[], hasDirectMatch: false };
    }

    const cartProductIds = new Set<string>();
    const categoryFreq: Record<string, { label: string; count: number }> = {};

    for (const item of cart) {
      const prod = item?.product;
      if (!prod) continue;
      if (prod.id) cartProductIds.add(prod.id);
      const rawCat = (prod.category || '').trim();
      if (rawCat) {
        const key = rawCat.toLowerCase();
        if (!categoryFreq[key]) {
          categoryFreq[key] = { label: rawCat, count: 0 };
        }
        categoryFreq[key].count += item.quantity || 1;
      }
    }

    const orderedCategories = Object.values(categoryFreq)
      .sort((a, b) => b.count - a.count)
      .map((entry) => entry.label);

    const candidates = products.filter((p) => !cartProductIds.has(p.id));
    if (candidates.length === 0) {
      return { recommended: [] as Product[], cartCategories: orderedCategories, hasDirectMatch: false };
    }

    const sameCategoryMatches = candidates
      .filter((p) => {
        const key = (p.category || '').trim().toLowerCase();
        return Boolean(categoryFreq[key]);
      })
      .sort((a, b) => {
        const freqA = categoryFreq[(a.category || '').trim().toLowerCase()]?.count || 0;
        const freqB = categoryFreq[(b.category || '').trim().toLowerCase()]?.count || 0;
        if (freqB !== freqA) return freqB - freqA;
        if ((b.salesCount || 0) !== (a.salesCount || 0)) return (b.salesCount || 0) - (a.salesCount || 0);
        return (b.rating || 0) - (a.rating || 0);
      });

    const complementaryMatches = candidates
      .filter((p) => !sameCategoryMatches.some((m) => m.id === p.id))
      .sort((a, b) => {
        if ((b.rating || 0) !== (a.rating || 0)) return (b.rating || 0) - (a.rating || 0);
        return (b.salesCount || 0) - (a.salesCount || 0);
      });

    const combined = [...sameCategoryMatches, ...complementaryMatches].slice(0, 4);

    return {
      recommended: combined,
      cartCategories: orderedCategories,
      hasDirectMatch: sameCategoryMatches.length > 0
    };
  }, [cart, products]);

  if (recommended.length === 0) return null;

  const categorySummary = cartCategories.slice(0, 3).join(', ');

  return (
    <section className="pt-10 border-t border-slate-200/70 dark:border-slate-800/70 space-y-6">
      <div className="space-y-1">
        <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
          Sizga mos kelishi mumkin
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {hasDirectMatch && categorySummary
            ? `Savatingizdagi ${categorySummary} toifalari asosida tanlangan tavsiyalar`
            : categorySummary
            ? `Savatingizdagi ${categorySummary} mahsulotlariga qo'shimcha takliflar`
            : "Savatingizdagi mahsulotlarga mos tanlangan takliflar"}
        </p>
      </div>

      <StaggerGrid className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {recommended.map((product) => {
          const displayPrice = Math.round(product.pinduoduoPrice * MARKUP_RATE * CURRENCY_RATE);
          const displayOldPrice = product.oldPrice
            ? Math.round(product.oldPrice * MARKUP_RATE * CURRENCY_RATE)
            : null;
          const defaultSize = product.sizes?.[0] || 'Standard';
          const hasVipPrice = Boolean(product.vipPrice && product.vipPrice > 0 && product.vipPrice < displayPrice);
          const isLocked = Boolean(product.isVipOnly && !vipInfo.hasVipOnlyAccess);

          return (
            <StaggerItem key={product.id} className="h-full">
              <Tilt3DGlassCard
                onClick={() => onProductClick(product)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onProductClick(product);
                  }
                }}
                className={`group cursor-pointer yuyu-glass rounded-3xl overflow-hidden flex flex-col ${
                  product.isVipOnly
                    ? '!border-amber-400/70 dark:!border-amber-400/60'
                    : 'hover:border-blue-300/80 dark:hover:border-blue-500/50'
                }`}
              >
                <div className="aspect-[4/3] w-full bg-white/55 dark:bg-slate-800/50 p-5 flex items-center justify-center overflow-hidden relative">
                  <SafeImage
                    src={product.images?.[0]}
                    alt={product.name}
                    fallbackLabel={product.name}
                    className="w-full h-full object-contain transition-transform duration-300 ease-out group-hover:scale-105"
                  />
                {product.isVipOnly && (
                  <span className="absolute top-3 left-3 inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#070B14]/90 border border-amber-400/60 text-amber-300 text-[10px] font-mono font-bold">
                    {isLocked ? <Lock size={10} /> : <Crown size={10} />}
                    <span>Faqat VIP</span>
                  </span>
                )}
              </div>

              <div className="p-5 flex-1 flex flex-col justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <span className="truncate">{product.category}</span>
                    <span className="inline-flex items-center gap-1 shrink-0 font-mono tabular-nums text-slate-600 dark:text-slate-300">
                      <Star size={12} className="text-amber-500 fill-amber-500" />
                      {product.rating}
                    </span>
                  </div>
                  <h3 className="font-display text-base font-semibold text-slate-900 dark:text-white leading-snug line-clamp-2 group-hover:text-[#0F294A] dark:group-hover:text-blue-400 transition-colors">
                    {product.name}
                  </h3>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                  <div className="flex items-end justify-between gap-2">
                    <div className="space-y-0.5 min-w-0">
                      {displayOldPrice && (
                        <p className="text-xs font-mono tabular-nums text-slate-400 line-through truncate">
                          {displayOldPrice.toLocaleString()} so'm
                        </p>
                      )}
                      <p className="font-mono tabular-nums text-sm sm:text-base font-bold text-[#0F294A] dark:text-blue-400 truncate">
                        {displayPrice.toLocaleString()} so'm
                      </p>
                    </div>

                    {isLocked ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenVipModal?.();
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#070B14] border border-amber-400/60 text-amber-300 text-xs font-semibold whitespace-nowrap shrink-0"
                      >
                        <Lock size={12} />
                        <span>VIP</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        data-sound="cart"
                        onClick={(e) => {
                          e.stopPropagation();
                          onQuickAdd(product, defaultSize);
                        }}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#0F294A] hover:bg-[#163A66] dark:bg-blue-600 dark:hover:bg-blue-500 text-white text-xs font-semibold whitespace-nowrap shrink-0 transition-colors"
                      >
                        <Plus size={13} />
                        <span>Savatga</span>
                      </button>
                    )}
                  </div>

                  {hasVipPrice && product.vipPrice && (
                    <div className="inline-flex items-center justify-between gap-1 px-2 py-1 rounded-lg bg-[#070B14] border border-amber-400/50 text-amber-300 text-[10px] font-mono font-bold w-full">
                      <span className="inline-flex items-center gap-1">
                        <Crown size={10} />
                        <span>VIP narx:</span>
                      </span>
                      <span>{product.vipPrice.toLocaleString()} so'm</span>
                    </div>
                  )}
                </div>
              </div>
              </Tilt3DGlassCard>
            </StaggerItem>
          );
        })}
      </StaggerGrid>
    </section>
  );
};
