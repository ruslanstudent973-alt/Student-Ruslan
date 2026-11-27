import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Send,
  Image as ImageIcon,
  X,
  Loader2,
  Camera,
  ShoppingCart,
  ArrowRight,
  ChevronLeft,
  RotateCcw,
  Copy,
  Check,
  Ruler,
  MessageSquare,
  Maximize2,
  PackageSearch,
  AlertCircle,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Product, User, View } from '../types';
import { SafeImage } from './YuyuPrimitives';
import { getEffectiveVipStatus, getEffectiveProductPriceUzs } from '../utils/vip';

export interface AiChatEntry {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  imagePreview?: string;
  recommendedProductIds?: string[];
  quickFollowUps?: string[];
  timestamp: number;
}

export const INITIAL_AI_MESSAGES: AiChatEntry[] = [
  {
    id: 'ai-welcome',
    role: 'assistant',
    text: "Assalomu alaykum! Men YUYU Shop AI Maslahatchisiman. Byudjetingiz, uslubingiz yoki rasmingiz bo'yicha eng mos mahsulotni topishda, o'lcham tanlashda va yetkazib berish shartlarida sizga bajonidil yordam beraman.",
    quickFollowUps: [
      "500 000 so'mgacha eng yaxshi tovarlar",
      "Yetkazib berish va kargo narxi qancha?",
      "VIP obuna qanday foyda beradi?"
    ],
    timestamp: Date.now()
  }
];

async function compressImageForAi(file: File, maxDim = 960): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error("Iltimos, faqat rasm faylini (JPG, PNG, WEBP) tanlang.");
  }
  if (file.size > 12 * 1024 * 1024) {
    throw new Error("Rasm hajmi 12 MB dan oshmasligi kerak.");
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Rasmni o'qishda xatolik yuz berdi."));
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const img = new Image();
      img.onerror = () => resolve(dataUrl);
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width >= height) {
            height = Math.max(1, Math.round((height * maxDim) / width));
            width = maxDim;
          } else {
            width = Math.max(1, Math.round((width * maxDim) / height));
            height = maxDim;
          }
        }
        try {
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(dataUrl);
            return;
          }
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.8));
        } catch {
          resolve(dataUrl);
        }
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  });
}

const RecommendedProductMiniCard: React.FC<{
  product: Product;
  currentUser: User;
  onProductClick: (product: Product) => void;
  onAddToCart: (product: Product, size: string) => void;
  compact?: boolean;
}> = ({ product, currentUser, onProductClick, onAddToCart, compact = false }) => {
  const priceUzs = getEffectiveProductPriceUzs(product, currentUser);
  const defaultSize = product.sizes?.[0] || 'Standard';

  return (
    <motion.div
      whileHover={{ y: -2, scale: 1.008 }}
      transition={{ type: 'spring', stiffness: 360, damping: 26 }}
      className="flex items-center gap-3 p-2.5 rounded-2xl yuyu-glass-subtle hover:border-blue-300/70 dark:hover:border-blue-500/50 transition-colors"
    >
      <button
        type="button"
        onClick={() => onProductClick(product)}
        className={`${compact ? 'w-14 h-14' : 'w-16 h-16'} rounded-xl overflow-hidden bg-white/70 dark:bg-slate-800/70 shrink-0`}
      >
        <SafeImage
          src={product.images?.[0]}
          alt={product.name}
          className="w-full h-full object-cover"
        />
      </button>

      <div className="flex-1 min-w-0">
        <button
          type="button"
          onClick={() => onProductClick(product)}
          className="text-left block w-full"
        >
          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
            {product.category}
            {product.weight ? ` · ${product.weight} kg` : ''}
          </p>
          <h4 className="text-sm font-semibold text-slate-900 dark:text-white truncate">
            {product.name}
          </h4>
        </button>
        <div className="flex items-center justify-between gap-2 mt-1.5">
          <span className="font-mono tabular-nums text-xs font-bold text-[#0F294A] dark:text-blue-400">
            {priceUzs.toLocaleString()} so'm
          </span>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => onProductClick(product)}
              className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px] font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap"
            >
              Ko'rish
            </button>
            <button
              type="button"
              onClick={() => onAddToCart(product, defaultSize)}
              className="p-1.5 rounded-lg bg-[#0F294A] hover:bg-[#163A66] dark:bg-blue-600 dark:hover:bg-blue-500 text-white transition-colors"
              aria-label="Savatga qo'shish"
              title="Savatga qo'shish"
            >
              <ShoppingCart size={13} />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

interface SharedChatProps {
  messages: AiChatEntry[];
  onMessagesChange: React.Dispatch<React.SetStateAction<AiChatEntry[]>>;
  products: Product[];
  currentUser: User;
  onProductClick: (product: Product) => void;
  onAddToCart: (product: Product, size: string) => void;
  notify: (msg: string, type?: 'success' | 'error' | 'info') => void;
  safeFetchJSON: (url: string, options?: RequestInit) => Promise<any>;
  compact?: boolean;
}

const AiChatPanel: React.FC<SharedChatProps> = ({
  messages,
  onMessagesChange,
  products,
  currentUser,
  onProductClick,
  onAddToCart,
  notify,
  safeFetchJSON,
  compact = false
}) => {
  const [input, setInput] = useState('');
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const listEndRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const productMap = useMemo(() => {
    const map = new Map<string, Product>();
    products.forEach((p) => map.set(p.id, p));
    return map;
  }, [products]);

  const vipInfo = getEffectiveVipStatus(currentUser);

  useEffect(() => {
    listEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleAttachPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImageForAi(file, 900);
      setAttachedImage(compressed);
    } catch (err: any) {
      notify(err?.message || "Rasmni yuklashda xatolik", 'error');
    } finally {
      e.target.value = '';
    }
  };

  const sendPrompt = async (overrideText?: string) => {
    const text = (overrideText ?? input).trim();
    if ((!text && !attachedImage) || loading) return;

    const outgoingImage = overrideText ? null : attachedImage;
    const userMsg: AiChatEntry = {
      id: `u-${Date.now()}`,
      role: 'user',
      text: text || "Ushbu rasm bo'yicha maslahat bering",
      imagePreview: outgoingImage || undefined,
      timestamp: Date.now()
    };

    const nextHistory = [...messages, userMsg];
    onMessagesChange(nextHistory);
    if (!overrideText) {
      setInput('');
      setAttachedImage(null);
    }
    setLastError(null);
    setLoading(true);

    try {
      const res = await safeFetchJSON('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: nextHistory.map((m) => ({
            role: m.role,
            content: m.text,
            text: m.text
          })),
          userName: currentUser.username,
          vipTier: vipInfo.tier,
          imageDataUrl: outgoingImage || undefined
        })
      });

      const followUps = Array.isArray(res?.quickFollowUps)
        ? res.quickFollowUps
        : Array.isArray(res?.followUpSuggestions)
        ? res.followUpSuggestions
        : [];

      const assistantMsg: AiChatEntry = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        text: res?.reply || "Savolingiz qabul qilindi, sizga yordam berishga tayyorman.",
        recommendedProductIds: Array.isArray(res?.recommendedProductIds) ? res.recommendedProductIds : [],
        quickFollowUps: followUps,
        timestamp: Date.now()
      };
      onMessagesChange((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      console.warn('[AiChatPanel] AI chat warning:', err);
      const msg = err?.message || "AI Maslahatchi bilan bog'lanishda xatolik yuz berdi.";
      setLastError(msg);
      notify(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    onMessagesChange(INITIAL_AI_MESSAGES);
    setLastError(null);
    setAttachedImage(null);
    setInput('');
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Messages List */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.map((msg, idx) => {
          const isUser = msg.role === 'user';
          const recProducts = (msg.recommendedProductIds || [])
            .map((id) => productMap.get(id))
            .filter((p): p is Product => Boolean(p));
          const isLatestAssistant = !isUser && idx === messages.length - 1;

          return (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: 'spring', stiffness: 360, damping: 28 }}
              className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} gap-2`}
            >
              <div
                className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  isUser
                    ? 'bg-[#0F294A] dark:bg-blue-600 text-white rounded-br-md shadow-md shadow-blue-950/15'
                    : 'yuyu-glass-subtle text-slate-900 dark:text-slate-100 rounded-bl-md'
                }`}
              >
                {msg.imagePreview && (
                  <img
                    src={msg.imagePreview}
                    alt="Yuklangan rasm"
                    referrerPolicy="no-referrer"
                    className="w-40 h-40 object-cover rounded-xl mb-2.5 border border-white/20"
                  />
                )}
                <p className="whitespace-pre-line">{msg.text}</p>
              </div>

              {/* Recommended Product Cards */}
              {recProducts.length > 0 && (
                <div className="w-full max-w-[92%] space-y-2 pt-0.5">
                  <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                    Siz uchun mos mahsulotlar
                  </p>
                  <div className="space-y-2">
                    {recProducts.map((prod) => (
                      <RecommendedProductMiniCard
                        key={prod.id}
                        product={prod}
                        currentUser={currentUser}
                        onProductClick={onProductClick}
                        onAddToCart={onAddToCart}
                        compact={compact}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Quick Follow-Up Controls */}
              {isLatestAssistant && msg.quickFollowUps && msg.quickFollowUps.length > 0 && !loading && (
                <div className="flex flex-wrap gap-2 max-w-[95%] pt-1">
                  {msg.quickFollowUps.map((q) => (
                    <motion.button
                      key={q}
                      type="button"
                      whileHover={{ y: -1, scale: 1.02 }}
                      whileTap={{ scale: 0.96 }}
                      onClick={() => sendPrompt(q)}
                      className="px-3 py-1.5 rounded-xl yuyu-glass-subtle hover:bg-white/90 dark:hover:bg-slate-800/90 text-xs font-medium text-slate-700 dark:text-slate-200 transition-colors text-left"
                    >
                      {q}
                    </motion.button>
                  ))}
                </div>
              )}
            </motion.div>
          );
        })}

        {loading && (
          <div className="flex items-start">
            <div className="inline-flex items-center gap-2.5 px-4 py-3 rounded-2xl rounded-bl-md bg-slate-100 dark:bg-slate-800 text-xs font-medium text-slate-600 dark:text-slate-300">
              <Loader2 size={14} className="animate-spin text-[#0F294A] dark:text-blue-400" />
              <span>AI Maslahatchi javob tayyorlamoqda...</span>
            </div>
          </div>
        )}

        {lastError && !loading && (
          <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 flex items-start gap-2.5 text-xs text-red-700 dark:text-red-300">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <div className="space-y-1.5 flex-1">
              <p className="font-medium">{lastError}</p>
            </div>
          </div>
        )}

        <div ref={listEndRef} />
      </div>

      {/* Composer */}
      <div className="border-t border-white/60 dark:border-slate-800/70 p-3 bg-white/50 dark:bg-slate-900/55 backdrop-blur-xl space-y-2.5">
        {attachedImage && (
          <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl yuyu-glass-subtle">
            <img
              src={attachedImage}
              alt="Tanlangan rasm"
              referrerPolicy="no-referrer"
              className="w-10 h-10 rounded-lg object-cover"
            />
            <span className="text-xs text-slate-600 dark:text-slate-300 flex-1 truncate">
              Rasm biriktirildi — savolingizni yozing yoki yuboring
            </span>
            <button
              type="button"
              onClick={() => setAttachedImage(null)}
              className="p-1 rounded-lg hover:bg-slate-200/70 dark:hover:bg-slate-800 text-slate-500"
              aria-label="Rasmni olib tashlash"
            >
              <X size={14} />
            </button>
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendPrompt();
          }}
          className="flex items-center gap-2"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleAttachPhoto}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={loading}
            className="p-2.5 rounded-xl yuyu-glass-subtle text-slate-600 dark:text-slate-300 hover:bg-white/85 dark:hover:bg-slate-800 transition-colors shrink-0 disabled:opacity-50"
            title="Rasm biriktirish"
            aria-label="Rasm biriktirish"
          >
            <ImageIcon size={18} />
          </button>

          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Savolingizni yozing..."
            disabled={loading}
            className="flex-1 min-w-0 px-3.5 py-2.5 rounded-xl yuyu-glass-input text-sm text-slate-900 dark:text-white outline-none focus:border-[#0F294A] dark:focus:border-blue-500"
          />

          <motion.button
            type="submit"
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.94 }}
            disabled={loading || (!input.trim() && !attachedImage)}
            className="px-4 py-2.5 rounded-xl bg-[#0F294A] hover:bg-[#163A66] dark:bg-blue-600 dark:hover:bg-blue-500 text-white font-semibold text-sm inline-flex items-center justify-center gap-1.5 transition-colors shrink-0 disabled:opacity-40 shadow-md shadow-blue-950/15"
            aria-label="Yuborish"
          >
            <Send size={16} />
          </motion.button>
        </form>

        <div className="flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500 px-1">
          <span>YUYU Shop katalogi asosida javob beradi</span>
          {messages.length > 1 && (
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-1 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
            >
              <RotateCcw size={11} />
              <span>Yangi suhbat</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

interface VisualSearchResult {
  productName: string;
  category: string;
  colorAndStyle: string;
  chinaSearchKeywords: string;
  summary: string;
  matchedProductIds: string[];
}

export const AiAssistantView: React.FC<{
  messages: AiChatEntry[];
  onMessagesChange: React.Dispatch<React.SetStateAction<AiChatEntry[]>>;
  products: Product[];
  currentUser: User;
  onProductClick: (product: Product) => void;
  onAddToCart: (product: Product, size: string) => void;
  onNavigate: (view: View) => void;
  notify: (msg: string, type?: 'success' | 'error' | 'info') => void;
  safeFetchJSON: (url: string, options?: RequestInit) => Promise<any>;
}> = ({
  messages,
  onMessagesChange,
  products,
  currentUser,
  onProductClick,
  onAddToCart,
  onNavigate,
  notify,
  safeFetchJSON
}) => {
  const [mobileTab, setMobileTab] = useState<'chat' | 'visual'>('chat');
  const [visualImage, setVisualImage] = useState<string | null>(null);
  const [visualHint, setVisualHint] = useState('');
  const [visualLoading, setVisualLoading] = useState(false);
  const [visualResult, setVisualResult] = useState<VisualSearchResult | null>(null);
  const [visualError, setVisualError] = useState<string | null>(null);
  const [copiedKeywords, setCopiedKeywords] = useState(false);

  const productMap = useMemo(() => {
    const map = new Map<string, Product>();
    products.forEach((p) => map.set(p.id, p));
    return map;
  }, [products]);

  const handleVisualFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImageForAi(file, 1024);
      setVisualImage(compressed);
      setVisualResult(null);
      setVisualError(null);
    } catch (err: any) {
      notify(err?.message || "Rasmni o'qishda xatolik", 'error');
    } finally {
      e.target.value = '';
    }
  };

  const handleRunVisualSearch = async () => {
    if (!visualImage) {
      notify("Iltimos, avval qidirmoqchi bo'lgan tovar rasmini yuklang", 'error');
      return;
    }
    setVisualLoading(true);
    setVisualError(null);
    try {
      const res = await safeFetchJSON('/api/ai/visual-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageDataUrl: visualImage,
          hintText: visualHint.trim() || undefined
        })
      });
      const fallbackStyle = Array.isArray(res?.styleKeywords)
        ? res.styleKeywords.join(', ')
        : 'Zamonaviy uslub';
      setVisualResult({
        productName: res.productName || res.detectedObject || 'Mahsulot aniqlandi',
        category: res.category || res.categoryGuess || 'Boshqa',
        colorAndStyle: res.colorAndStyle || fallbackStyle,
        chinaSearchKeywords:
          res.chinaSearchKeywords ||
          (Array.isArray(res?.styleKeywords) ? res.styleKeywords.join(' ') : ''),
        summary: res.summary || 'Rasm tahlil qilindi.',
        matchedProductIds: Array.isArray(res.matchedProductIds) ? res.matchedProductIds : []
      });
    } catch (err: any) {
      console.warn('[AiVisualSearch] Visual search warning:', err);
      const msg = err?.message || "Rasmni tahlil qilishda xatolik yuz berdi.";
      setVisualError(msg);
      notify(msg, 'error');
    } finally {
      setVisualLoading(false);
    }
  };

  const matchedProducts = useMemo(() => {
    if (!visualResult) return [];
    return visualResult.matchedProductIds
      .map((id) => productMap.get(id))
      .filter((p): p is Product => Boolean(p));
  }, [visualResult, productMap]);

  const handleCopyKeywords = () => {
    if (!visualResult?.chinaSearchKeywords) return;
    navigator.clipboard?.writeText(visualResult.chinaSearchKeywords).catch(() => {});
    setCopiedKeywords(true);
    notify("Qidiruv so'zlari nusxalandi", 'success');
    setTimeout(() => setCopiedKeywords(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-slate-200/70 dark:border-slate-800/70">
        <div className="flex items-center gap-3.5">
          <motion.button
            type="button"
            whileHover={{ x: -2 }}
            whileTap={{ scale: 0.94 }}
            onClick={() => onNavigate('home')}
            className="p-2.5 yuyu-glass-subtle rounded-xl hover:bg-white/85 dark:hover:bg-slate-800/80 transition-colors"
            aria-label="Orqaga"
          >
            <ChevronLeft size={18} />
          </motion.button>
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              AI Maslahatchi
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Tovar tanlash, rasm orqali aniqlash va o'lcham bo'yicha shaxsiy yordamchi
            </p>
          </div>
        </div>

        {/* Mobile Segmented Switcher */}
        <div className="flex lg:hidden items-center gap-1 p-1 yuyu-glass-subtle rounded-xl">
          <button
            type="button"
            onClick={() => setMobileTab('chat')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              mobileTab === 'chat'
                ? 'bg-[#0F294A] dark:bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-300'
            }`}
          >
            <MessageSquare size={14} />
            <span>AI Suhbat</span>
          </button>
          <button
            type="button"
            onClick={() => setMobileTab('visual')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              mobileTab === 'visual'
                ? 'bg-[#0F294A] dark:bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-300'
            }`}
          >
            <Camera size={14} />
            <span>Rasm orqali qidiruv</span>
          </button>
        </div>
      </div>

      {/* Main Split Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: AI Chat Studio */}
        <section
          className={`lg:col-span-7 yuyu-glass rounded-3xl overflow-hidden flex flex-col h-[640px] ${
            mobileTab === 'chat' ? 'flex' : 'hidden lg:flex'
          }`}
        >
          <div className="px-5 py-4 border-b border-white/60 dark:border-slate-800/70 flex items-center justify-between gap-3 bg-white/40 dark:bg-slate-900/40">
            <div>
              <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">
                Jonli AI Maslahatchi
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                O'zbek tilida · Do'kon katalogi · {products.length} ta mahsulot
              </p>
            </div>
          </div>

          <AiChatPanel
            messages={messages}
            onMessagesChange={onMessagesChange}
            products={products}
            currentUser={currentUser}
            onProductClick={onProductClick}
            onAddToCart={onAddToCart}
            notify={notify}
            safeFetchJSON={safeFetchJSON}
          />
        </section>

        {/* Right: Visual AI Search Studio */}
        <section
          className={`lg:col-span-5 yuyu-glass rounded-3xl p-5 sm:p-6 space-y-5 ${
            mobileTab === 'visual' ? 'block' : 'hidden lg:block'
          }`}
        >
          <div className="space-y-1">
            <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">
              Rasm orqali AI qidiruv
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Yoqtirgan kiyim, oyoq kiyim yoki gadjet rasmini yuklang — AI uni aniqlab katalogimizdan eng yaqin tovarlarni topib beradi.
            </p>
          </div>

          {/* Dropzone / Preview */}
          {visualImage ? (
            <div className="relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
              <img
                src={visualImage}
                alt="Qidiruv rasmi"
                referrerPolicy="no-referrer"
                className="w-full h-56 object-contain"
              />
              <button
                type="button"
                onClick={() => {
                  setVisualImage(null);
                  setVisualResult(null);
                  setVisualError(null);
                }}
                className="absolute top-2.5 right-2.5 p-2 rounded-lg bg-slate-950/75 text-white hover:bg-slate-950 transition-colors"
                aria-label="Rasmni o'chirish"
              >
                <X size={15} />
              </button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center gap-2.5 py-10 px-4 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-[#0F294A] dark:hover:border-blue-500 bg-slate-50 dark:bg-slate-900/60 cursor-pointer transition-colors text-center">
              <div className="w-11 h-11 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-[#0F294A] dark:text-blue-400">
                <Camera size={20} />
              </div>
              <div className="space-y-0.5">
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  Mahsulot rasmini tanlang
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  JPG, PNG yoki WEBP formatida
                </p>
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={handleVisualFile}
                className="hidden"
              />
            </label>
          )}

          {/* Optional Hint */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
              Qo'shimcha izoh (ixtiyoriy)
            </label>
            <input
              type="text"
              value={visualHint}
              onChange={(e) => setVisualHint(e.target.value)}
              placeholder="Masalan: 42 o'lcham yoki arzonroq variant kerak"
              className="w-full px-3.5 py-2.5 rounded-xl yuyu-glass-input text-sm text-slate-900 dark:text-white outline-none focus:border-[#0F294A] dark:focus:border-blue-500"
            />
          </div>

          <motion.button
            type="button"
            whileHover={{ y: -2, scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleRunVisualSearch}
            disabled={!visualImage || visualLoading}
            className="w-full py-3 px-4 rounded-xl bg-[#0F294A] hover:bg-[#163A66] dark:bg-blue-600 dark:hover:bg-blue-500 text-white font-semibold text-sm inline-flex items-center justify-center gap-2 transition-colors disabled:opacity-45 shadow-lg shadow-blue-950/15"
          >
            {visualLoading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>AI tahlil qilmoqda...</span>
              </>
            ) : (
              <>
                <PackageSearch size={16} />
                <span>AI bilan aniqlash va qidirish</span>
              </>
            )}
          </motion.button>

          {visualError && (
            <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-xs text-red-700 dark:text-red-300 flex items-start gap-2">
              <AlertCircle size={15} className="shrink-0 mt-0.5" />
              <span>{visualError}</span>
            </div>
          )}

          {/* Visual Analysis Result */}
          {visualResult && (
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-4">
              <div className="space-y-1.5">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {visualResult.category} · {visualResult.colorAndStyle}
                </p>
                <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                  {visualResult.productName}
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  {visualResult.summary}
                </p>
              </div>

              {visualResult.chinaSearchKeywords && (
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      1688 / Taobao qidiruv so'zlari
                    </p>
                    <p className="font-mono text-xs text-slate-800 dark:text-slate-200 truncate">
                      {visualResult.chinaSearchKeywords}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyKeywords}
                    className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-800 inline-flex items-center gap-1 shrink-0"
                  >
                    {copiedKeywords ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                    <span>{copiedKeywords ? 'Nusxalandi' : 'Nusxalash'}</span>
                  </button>
                </div>
              )}

              {matchedProducts.length > 0 ? (
                <div className="space-y-2.5">
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Katalogimizdan topilgan o'xshash tovarlar ({matchedProducts.length})
                  </p>
                  <div className="space-y-2">
                    {matchedProducts.map((prod) => (
                      <RecommendedProductMiniCard
                        key={prod.id}
                        product={prod}
                        currentUser={currentUser}
                        onProductClick={onProductClick}
                        onAddToCart={onAddToCart}
                        compact
                      />
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2.5">
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    Katalogimizda aynan shu mahsulot hozircha topilmadi, lekin Xitoydan siz uchun maxsus topib keltirib bera olamiz.
                  </p>
                  <button
                    type="button"
                    onClick={() => onNavigate('find_product')}
                    className="w-full py-2.5 px-4 rounded-lg bg-[#0F294A] hover:bg-[#163A66] dark:bg-blue-600 dark:hover:bg-blue-500 text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <span>Rasm orqali maxsus buyurtma berish</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export const FloatingAiDrawer: React.FC<{
  currentView: View;
  messages: AiChatEntry[];
  onMessagesChange: React.Dispatch<React.SetStateAction<AiChatEntry[]>>;
  products: Product[];
  currentUser: User;
  onProductClick: (product: Product) => void;
  onAddToCart: (product: Product, size: string) => void;
  onNavigate: (view: View) => void;
  notify: (msg: string, type?: 'success' | 'error' | 'info') => void;
  safeFetchJSON: (url: string, options?: RequestInit) => Promise<any>;
}> = ({
  currentView,
  messages,
  onMessagesChange,
  products,
  currentUser,
  onProductClick,
  onAddToCart,
  onNavigate,
  notify,
  safeFetchJSON
}) => {
  const [isOpen, setIsOpen] = useState(false);

  // Hide floating trigger when already in dedicated AI view, full-screen video reels, or payment flow
  if (currentView === 'ai_assistant' || currentView === 'videos' || currentView === 'payment') {
    return null;
  }

  // Keep spacing clean when Catalog already displays the floating photo-request button on bottom-right
  const positionClass =
    currentView === 'catalog'
      ? 'bottom-[136px] right-4 md:bottom-24 md:right-6'
      : 'bottom-20 right-4 md:bottom-6 md:right-6';

  return (
    <>
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            key="floating-ai-trigger"
            type="button"
            initial={{ opacity: 0, scale: 0.85, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 16 }}
            whileHover={{ y: -3, scale: 1.04 }}
            whileTap={{ scale: 0.94 }}
            transition={{ type: 'spring', stiffness: 360, damping: 24 }}
            onClick={() => setIsOpen(true)}
            className={`fixed ${positionClass} z-40 inline-flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-[#0F294A]/90 hover:bg-[#163A66] dark:bg-blue-600/90 dark:hover:bg-blue-500 backdrop-blur-xl border border-white/25 text-white text-sm font-semibold shadow-[0_14px_34px_rgba(15,41,74,0.28)] whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#0F294A]`}
            aria-label="AI Maslahatchini ochish"
          >
            <MessageSquare size={17} />
            <span>AI Maslahatchi</span>
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[120] flex justify-end">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 bg-slate-950/35 backdrop-blur-sm"
              onClick={() => setIsOpen(false)}
            />

            <motion.aside
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 340, damping: 32 }}
              className="relative z-10 w-full max-w-md h-full yuyu-glass-strong border-l border-white/80 dark:border-slate-700/70 shadow-2xl flex flex-col"
            >
              <div className="px-4 py-3.5 border-b border-white/60 dark:border-slate-800/70 flex items-center justify-between gap-3 bg-white/40 dark:bg-slate-900/40">
                <div className="min-w-0">
                  <h2 className="font-display text-sm font-bold text-slate-900 dark:text-white truncate">
                    YUYU AI Maslahatchi
                  </h2>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                    O'zbek tilida tezkor yordam va tavsiyalar
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setIsOpen(false);
                      onNavigate('ai_assistant');
                    }}
                    className="px-2.5 py-1.5 rounded-lg yuyu-glass-subtle text-[11px] font-semibold text-slate-700 dark:text-slate-200 hover:bg-white/90 dark:hover:bg-slate-800 inline-flex items-center gap-1 whitespace-nowrap"
                    title="To'liq sahifada ochish"
                  >
                    <Maximize2 size={12} />
                    <span>To'liq sahifa</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="p-1.5 rounded-lg hover:bg-white/70 dark:hover:bg-slate-800 text-slate-500"
                    aria-label="Yopish"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              <div className="flex-1 min-h-0">
                <AiChatPanel
                  messages={messages}
                  onMessagesChange={onMessagesChange}
                  products={products}
                  currentUser={currentUser}
                  onProductClick={(p) => {
                    setIsOpen(false);
                    onProductClick(p);
                  }}
                  onAddToCart={onAddToCart}
                  notify={notify}
                  safeFetchJSON={safeFetchJSON}
                  compact
                />
              </div>
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

export const ProductAiAdvisor: React.FC<{
  product: Product;
  currentUser: User;
  selectedSize: string;
  onSelectSize: (size: string) => void;
  notify: (msg: string, type?: 'success' | 'error' | 'info') => void;
  safeFetchJSON: (url: string, options?: RequestInit) => Promise<any>;
}> = ({ product, currentUser, selectedSize, onSelectSize, notify, safeFetchJSON }) => {
  const [measurements, setMeasurements] = useState('');
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [activePresetQ, setActivePresetQ] = useState<string | null>(null);
  const [result, setResult] = useState<{
    answer: string;
    recommendedSize: string;
    cargoNote: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const vipInfo = getEffectiveVipStatus(currentUser);

  // Reset answer when switching products
  useEffect(() => {
    setResult(null);
    setError(null);
    setQuestion('');
    setActivePresetQ(null);
  }, [product.id]);

  const askProductAi = async (customQ?: string) => {
    const q = (customQ ?? question).trim();
    if (!q || loading) return;
    setLoading(true);
    setActivePresetQ(customQ ?? null);
    setError(null);
    try {
      const primaryImage =
        (Array.isArray(product.images) && product.images[0]) ||
        (Array.isArray(product.colorVariants) && product.colorVariants[0]?.imageUrl) ||
        undefined;

      const res = await safeFetchJSON('/api/ai/product-help', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: product.id,
          product: {
            id: product.id,
            name: product.name,
            category: product.category,
            description: product.description,
            pinduoduoPrice: product.pinduoduoPrice,
            vipPrice: product.vipPrice,
            sizes: product.sizes,
            colorVariants: product.colorVariants,
            weight: product.weight,
            isOriginal: product.isOriginal,
            rating: product.rating,
            salesCount: product.salesCount,
            images: primaryImage ? [primaryImage] : undefined
          },
          imageUrl: primaryImage && !primaryImage.startsWith('data:') ? primaryImage : undefined,
          imageDataUrl: primaryImage && primaryImage.startsWith('data:') ? primaryImage : undefined,
          question: q,
          measurements: measurements.trim() || undefined,
          vipTier: vipInfo.tier
        })
      });
      setResult({
        answer: res.answer,
        recommendedSize: res.recommendedSize || '',
        cargoNote: res.cargoNote || ''
      });
      if (!customQ) setQuestion('');
    } catch (err: any) {
      console.warn('[ProductAiAdvisor] AI product help warning:', err);
      const msg = err?.message || "AI yordamchi javob bera olmadi";
      setError(msg);
      notify(msg, 'error');
    } finally {
      setLoading(false);
      setActivePresetQ(null);
    }
  };

  const quickQuestions = [
    "Virtual Try-On: menga qaysi o'lcham va rang mos keladi?",
    "Xitoy sharhlari va sifat AI tahlili qanday?",
    "Kargo to'lovi va bojxona AI hisob-kitobi qancha?",
    "VIP mijozlar uchun qancha foyda bor?"
  ];

  return (
    <section className="yuyu-glass rounded-3xl p-6 sm:p-7 space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Ruler size={18} className="text-[#0F294A] dark:text-blue-400" />
            <span>AI O'lcham, Sifat va Kargo Maslahatchisi</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Bo'y, vazn yoki oyoq o'lchamingizni yozing — «{product.name}» bo'yicha Virtual Try-On, Xitoy sharhlari tahlili va kargo hisobini oling.
          </p>
        </div>
        <span className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
          Tanlangan: {selectedSize}
        </span>
      </div>

      {/* Quick Prompts */}
      <div className="flex flex-wrap gap-2">
        {quickQuestions.map((q) => {
          const isThisLoading = loading && activePresetQ === q;
          return (
            <motion.button
              key={q}
              type="button"
              whileHover={{ y: -1, scale: 1.02 }}
              whileTap={{ scale: 0.96 }}
              disabled={loading}
              onClick={() => askProductAi(q)}
              className="px-3 py-1.5 rounded-xl yuyu-glass-subtle hover:bg-white/90 dark:hover:bg-slate-800/80 text-xs font-medium text-slate-700 dark:text-slate-200 transition-colors disabled:opacity-50 inline-flex items-center gap-1.5"
            >
              {isThisLoading ? (
                <Loader2 size={13} className="animate-spin text-[#2563EB]" />
              ) : (
                <Sparkles size={12} className="text-[#2563EB]" />
              )}
              <span>{q}</span>
            </motion.button>
          );
        })}
      </div>

      {/* Inputs */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          askProductAi();
        }}
        className="grid grid-cols-1 md:grid-cols-12 gap-3"
      >
        <input
          type="text"
          value={measurements}
          onChange={(e) => setMeasurements(e.target.value)}
          placeholder="Parametrlaringiz (ixtiyoriy: bo'y 176 sm, vazn 72 kg / oyoq 26.5 sm)"
          className="md:col-span-5 px-3.5 py-2.5 rounded-xl yuyu-glass-input text-sm text-slate-900 dark:text-white outline-none focus:border-[#0F294A] dark:focus:border-blue-500"
        />
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Shu mahsulot haqida savolingizni yozing..."
          className="md:col-span-5 px-3.5 py-2.5 rounded-xl yuyu-glass-input text-sm text-slate-900 dark:text-white outline-none focus:border-[#0F294A] dark:focus:border-blue-500"
        />
        <motion.button
          type="submit"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.96 }}
          disabled={loading || !question.trim()}
          className="md:col-span-2 py-2.5 px-4 rounded-xl bg-[#0F294A] hover:bg-[#163A66] dark:bg-blue-600 dark:hover:bg-blue-500 text-white text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors disabled:opacity-45 whitespace-nowrap shadow-md shadow-blue-950/15"
        >
          {loading ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
          <span>So'rash</span>
        </motion.button>
      </form>

      {error && (
        <div className="p-3.5 rounded-xl bg-red-50/85 dark:bg-red-950/50 border border-red-200 dark:border-red-900/60 text-xs text-red-700 dark:text-red-300 flex items-start gap-2">
          <AlertCircle size={15} className="shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {result && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 sm:p-5 rounded-2xl yuyu-glass-subtle space-y-3"
        >
          <p className="text-sm text-slate-800 dark:text-slate-100 leading-relaxed whitespace-pre-line">
            {result.answer}
          </p>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-200 dark:border-slate-800">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
              {result.cargoNote}
            </span>

            {result.recommendedSize && (
              <button
                type="button"
                onClick={() => {
                  onSelectSize(result.recommendedSize);
                  notify(`«${result.recommendedSize}» o'lchami tanlandi`, 'success');
                }}
                className="px-3.5 py-1.5 rounded-lg bg-[#0F294A] hover:bg-[#163A66] dark:bg-blue-600 dark:hover:bg-blue-500 text-white text-xs font-semibold transition-colors whitespace-nowrap"
              >
                Tavsiya etilgan «{result.recommendedSize}» ni tanlash
              </button>
            )}
          </div>
        </motion.div>
      )}
    </section>
  );
};
