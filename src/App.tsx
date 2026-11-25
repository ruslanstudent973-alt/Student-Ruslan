'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { MotionConfig, AnimatePresence, motion } from 'framer-motion';
import { Check, Ban, Bell, Sparkles, Star, ShieldCheck } from 'lucide-react';
import { Product, View, User, Order, Banner, ProductVideo, CustomRequest } from './types';
import { MARKUP_RATE, CURRENCY_RATE } from './constants';
import { DesktopHeader, DesktopFooter, MobileBottomNav } from './components/YuyuPrimitives';
import { GlobalAmbientCanvas, pageTransitionVariants } from './components/GlassMotionPrimitives';
import {
  LoadingView, HomeView, CatalogView, SearchView, DetailView
} from './components/StorefrontViews';
import { AuthView } from './components/AuthView';
import { VideoReelsView } from './components/VideoReelsView';
import {
  FloatingPhotoRequestButton,
  FindProductView,
  MyCustomRequestsView,
  AdminCustomRequestsView,
  customRequestToProduct
} from './components/CustomRequestComponents';
import {
  CartView, PaymentView, ReceiptView, OrdersView
} from './components/CheckoutViews';
import {
  ProfileView, StatsView, AdminOrdersView, AdminAddProductView,
  ManageProductsView, ManageBannersView, UserSearchView,
  AdminPartnershipsView, AdminSupportView, WishlistView,
  SupportView, PartnershipView, PromoCodesView, ReferralView
} from './components/WorkspaceViews';
import { VipSubscribeModal, AdminVipManagementView } from './components/VipComponents';
import { AdminAccessView } from './components/AdminAccessView';
import { AdminAccessProvider, withAdminOnly } from './components/AdminOnlyGuard';
import {
  AiAssistantView,
  FloatingAiDrawer,
  INITIAL_AI_MESSAGES,
  AiChatEntry
} from './components/AiAssistantViews';
import {
  LiveAuctionView,
  MyAuctionsView,
  AdminAuctionsView,
  auctionToOrderProduct
} from './components/AuctionViews';
import { SellerPayoutsAdminView } from './components/SellerPayoutsAdminView';
import {
  TayyorBozorStorefront,
  AdminTayyorBozorView
} from './components/TayyorBozorViews';
import {
  AffiliateCabinetView,
  AdminAffiliateView
} from './components/AffiliateViews';
import {
  captureAffiliateRefFromUrl,
  getStoredAffiliateRef,
  extractDeepLinkProductId
} from './utils/affiliateTracking';
import { getEffectiveVipStatus } from './utils/vip';
import {
  getSuggestedDeviceLabel,
  readStoredAdminDeviceToken,
  writeStoredAdminDeviceToken
} from './utils/authHelpers';
import { soundEngine } from './utils/soundEngine';

// Higher-Order Component ('admin_only') protected Admin Panel views
const ProtectedStatsView = withAdminOnly(StatsView, { permission: 'admin_only' });
const ProtectedAdminOrdersView = withAdminOnly(AdminOrdersView, { permission: 'admin_only' });
const ProtectedManageBannersView = withAdminOnly(ManageBannersView, { permission: 'admin_only' });
const ProtectedManageProductsView = withAdminOnly(ManageProductsView, { permission: 'admin_only' });
const ProtectedUserSearchView = withAdminOnly(UserSearchView, { permission: 'admin_only' });
const ProtectedAdminAddProductView = withAdminOnly(AdminAddProductView, { permission: 'admin_only' });
const ProtectedAdminPartnershipsView = withAdminOnly(AdminPartnershipsView, { permission: 'admin_only' });
const ProtectedAdminSupportView = withAdminOnly(AdminSupportView, { permission: 'admin_only' });
const ProtectedAdminVipManagementView = withAdminOnly(AdminVipManagementView, { permission: 'admin_only' });
const ProtectedAdminCustomRequestsView = withAdminOnly(AdminCustomRequestsView, { permission: 'admin_only' });
const ProtectedAdminAccessView = withAdminOnly(AdminAccessView, { permission: 'admin_only' });
const ProtectedAdminAuctionsView = withAdminOnly(AdminAuctionsView, { permission: 'admin_only' });
const ProtectedAdminSellerPayoutsView = withAdminOnly(SellerPayoutsAdminView, { permission: 'admin_only' });
const ProtectedAdminTayyorBozorView = withAdminOnly(AdminTayyorBozorView, { permission: 'admin_only' });
const ProtectedAdminAffiliateView = withAdminOnly(AdminAffiliateView, { permission: 'admin_only' });

const translations = {
  uz: {
    welcome: 'YUYU Shop',
    mallDesc: 'Xitoydan (1688, Taobao, Pinduoduo) tovar keltirish',
    authBtn: 'Bot orqali kodni olish',
    back: 'Orqaga',
    home: 'Asosiy',
    catalog: 'Katalog',
    search: 'Qidiruv',
    profile: 'Kabinet',
    orders: 'Buyurtmalar',
    referral: 'Taklif dasturi',
    price: 'Narx',
    buy: 'Hoziroq xarid qilish',
    share: 'Ulashish',
    size: 'Variant',
    track: 'Trek',
    paid: "To'landi",
    pending: 'Kutilmoqda',
    verifying: 'Tekshirilmoqda',
    shipped: "Yo'lda",
    delivered: 'Yetib keldi',
    cancelled: 'Bekor qilindi',
    copied: 'Nusxalandi',
    paymentTitle: "To'lovni rasmiylashtirish",
    uploadReceipt: 'Chek rasmini yuklash',
    confirmPayment: "To'lovni tasdiqlash",
    verifyingPayment: "To'lov yuborilmoqda...",
    bio: 'Men haqimda',
    editProfile: 'Profilni tahrirlash',
    userList: 'Foydalanuvchilar',
    addProduct: "Yangi mahsulot qo'shish",
    manageOrders: 'Buyurtmalarni boshqarish',
    telegramId: 'Telegram ID',
    phoneNumber: 'Telefon raqami',
    cart: 'Savat',
    addToCart: "Savatga qo'shish",
    emptyCart: "Savatingiz hozircha bo'sh",
    checkout: "To'lovga o'tish",
    total: 'Jami',
    address: 'Yetkazib berish manzili',
    enterAddress: "Viloyat, tuman, ko'cha, uy raqami",
    receipt: 'Chek',
    viewReceipt: "Chekni ko'rish",
    orderDate: 'Sana',
    orderId: 'Buyurtma ID',
    paymentStatus: "To'lov holati",
    scanQR: 'Buyurtmani tekshirish uchun QR kod',
    adminOrders: 'Barcha buyurtmalar',
    wishlist: 'Saralanganlar',
    support: 'Yordam',
    promo: 'Promo-kodlar',
    partnership: 'Hamkorlik dasturi',
    partnershipDesc: "Hamkor bo'ling va chegirmali promo-kodlarga ega bo'ling",
    partnerships: "Hamkorlik so'rovlari",
    stats: 'Statistika',
    stock: 'Ombor',
    outOfStock: "Sotuvda yo'q",
    apply: "Qo'llash",
    filter: 'Filtr',
    minPrice: 'Min narx',
    maxPrice: 'Max narx',
    rating: 'Reyting',
    vipStatus: 'VIP Maqom',
    silver: 'Kumush',
    gold: 'Oltin',
    vip: 'VIP',
    promoCode: 'Promo-kod',
    enterPromo: 'Promo-kodni kiriting',
    invalidPromo: "Noto'g'ri promo-kod",
    promoApplied: "Promo-kod qo'llanildi!",
    partnership20k: '20 000 UZS — 40% chegirma',
    partnership30k: '30 000 UZS — 55% chegirma',
    partnershipSuccess: "Hamkorlik so'rovi yuborildi!",
    myPromoCodes: 'Mening promo-kodlarim'
  }
};

const safeFetchJSON = async (url: string, options?: RequestInit, retries = 3) => {
  const adminToken = readStoredAdminDeviceToken();
  const baseHeaders: Record<string, string> = {
    Accept: 'application/json'
  };
  if (adminToken) {
    baseHeaders['x-admin-device-token'] = adminToken;
  }
  const mergedOptions: RequestInit = {
    ...options,
    headers: {
      ...baseHeaders,
      ...(options?.headers as Record<string, string> | undefined)
    }
  };

  for (let i = 0; i < retries; i++) {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 15000);
    try {
      const res = await fetch(url, { ...mergedOptions, signal: options?.signal || controller.signal });
      window.clearTimeout(timeoutId);
      const contentType = (res.headers.get('content-type') || '').toLowerCase();

      if (!res.ok) {
        const text = await res.text();
        let errorDetail = text.trim().startsWith('<')
          ? `Server vaqtincha javob bermadi (${res.status})`
          : text.substring(0, 140);
        try {
          const json = JSON.parse(text);
          errorDetail = json.error || json.message || errorDetail;
        } catch {}
        const err: any = new Error(errorDetail);
        err.status = res.status;
        // Do not retry 4xx client validation/auth errors
        if (res.status >= 400 && res.status < 500) {
          throw err;
        }
        throw err;
      }

      if (contentType.includes('application/json')) {
        return await res.json();
      }

      const text = await res.text();
      const trimmed = text.trim();
      if (!trimmed || trimmed.startsWith('<')) {
        throw new Error('Server JSON o‘rniga HTML qaytardi (qayta urinilmoqda)');
      }
      return JSON.parse(trimmed);
    } catch (e: any) {
      window.clearTimeout(timeoutId);
      if (e?.status && e.status >= 400 && e.status < 500) {
        throw e;
      }
      if (i === retries - 1) {
        console.warn(`Fetch (${url}) tugallanmadi:`, e?.message);
        throw e;
      }
      await new Promise((resolve) => setTimeout(resolve, 600 * (i + 1)));
    }
  }
};

const App: React.FC = () => {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [themeHydrated, setThemeHydrated] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [currentView, setCurrentView] = useState<View>('loading');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedCatalogCategory, setSelectedCatalogCategory] = useState<string>('Barchasi');
  const [pendingOrderData, setPendingOrderData] = useState<{
    product: Product;
    size: string;
    quantity?: number;
    cartItemId?: string;
    auctionId?: string;
  } | null>(null);
  const [returnAfterAuthView, setReturnAfterAuthView] = useState<View | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [notifications, setNotifications] = useState<{ id: string; message: string; type: string }[]>([]);
  const [receiptOrder, setReceiptOrder] = useState<Order | null>(null);
  const [productToEdit, setProductToEdit] = useState<Product | null>(null);
  const [aiMessages, setAiMessages] = useState<AiChatEntry[]>(INITIAL_AI_MESSAGES);

  const [wishlist, setWishlist] = useState<string[]>([]);
  const [promoCodes, setPromoCodes] = useState<any[]>([]);
  const [partnerships, setPartnerships] = useState<any[]>([]);
  const [supportMessages, setSupportMessages] = useState<any[]>([]);
  const [filters, setFilters] = useState({ minPrice: 0, maxPrice: 10000000, rating: 0 });
  const [cart, setCart] = useState<any[]>([]);

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [productVideos, setProductVideos] = useState<ProductVideo[]>([]);
  const [customRequests, setCustomRequests] = useState<CustomRequest[]>([]);
  const [pendingSellerPayoutActionsCount, setPendingSellerPayoutActionsCount] = useState<number>(0);
  const [pendingResaleCount, setPendingResaleCount] = useState<number>(0);
  const [pendingAffiliatePayoutsCount, setPendingAffiliatePayoutsCount] = useState<number>(0);
  const [pendingDeepLinkProductId, setPendingDeepLinkProductId] = useState<string | null>(null);
  const [isInitialLoaded, setIsInitialLoaded] = useState(false);
  const [isVipModalOpen, setIsVipModalOpen] = useState(false);

  const t = translations.uz;

  const notify = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = `${Date.now()}-${Math.random()}`;
    setNotifications((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, 3000);
  }, []);

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    soundEngine.setEnabled(next);
    if (next) {
      soundEngine.playPreset('toggle', 'ovoz yoqildi');
    }
  };

  const playClickSound = (label?: string) => {
    soundEngine.playPreset('soft', label || 'btn');
  };

  // Global unique sound delegation for every button, link, and interactive card
  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const interactive = target.closest('button, a, [role="button"], select') as HTMLElement | null;
      if (interactive) {
        soundEngine.playForElement(interactive);
      }
    };
    document.addEventListener('click', handleGlobalClick, true);
    return () => document.removeEventListener('click', handleGlobalClick, true);
  }, []);

  // Hydrate browser-only preferences & deep-link pathname after mount to prevent SSR hydration mismatch
  useEffect(() => {
    captureAffiliateRefFromUrl();
    try {
      const savedTheme = localStorage.getItem('yuyu_theme');
      if (savedTheme === 'dark' || savedTheme === 'light') {
        setTheme(savedTheme);
      }
    } catch {}
    setThemeHydrated(true);
    setSoundEnabled(soundEngine.isEnabled());
    const deepId = extractDeepLinkProductId(window.location.pathname);
    if (deepId) {
      setPendingDeepLinkProductId(deepId);
    }
  }, []);

  useEffect(() => {
    if (!themeHydrated) return;
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try {
      localStorage.setItem('yuyu_theme', theme);
    } catch {}
  }, [theme, themeHydrated]);

  const sendTelegramNotification = async (message: string) => {
    try {
      await safeFetchJSON('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message })
      });
    } catch {}
  };

  const fetchData = async (activeUserId?: string) => {
    try {
      const data = await safeFetchJSON('/api/data');
      if (data && Array.isArray(data.products)) {
        setAllProducts(data.products);
      }

      const sessionId =
        activeUserId ||
        currentUser?.telegramId ||
        (() => {
          try {
            return (
              localStorage.getItem('yuyu_shop_session_id') ||
              localStorage.getItem('ruslan_shop_session_id') ||
              ''
            );
          } catch {
            return '';
          }
        })();

      if (data && Array.isArray(data.users)) {
        setAllUsers(data.users);
        if (sessionId) {
          const foundUser = data.users.find(
            (u: any) => u.phoneNumber === sessionId || u.telegramId === sessionId
          );
          if (foundUser) {
            setCurrentUser(foundUser);
          }
        }
      }
      if (data && Array.isArray(data.orders)) setOrders(data.orders);
      if (data && Array.isArray(data.banners)) setBanners(data.banners);
      if (data && Array.isArray(data.productVideos)) setProductVideos(data.productVideos);
      if (data && Array.isArray(data.customRequests)) setCustomRequests(data.customRequests);
      if (data && Array.isArray(data.promoCodes)) setPromoCodes(data.promoCodes);
      if (data && Array.isArray(data.partnerships)) setPartnerships(data.partnerships);
      if (data && Array.isArray(data.supportMessages)) setSupportMessages(data.supportMessages);
      if (sessionId && data?.wishlists && Array.isArray(data.wishlists[sessionId])) {
        setWishlist(data.wishlists[sessionId]);
      }
      if (sessionId && data?.carts && Array.isArray(data.carts[sessionId])) {
        setCart(data.carts[sessionId]);
      }
      if (readStoredAdminDeviceToken()) {
        safeFetchJSON('/api/admin/seller-payouts', undefined, 0)
          .then((payoutRes) => {
            if (typeof payoutRes?.summary?.actionNeededCount === 'number') {
              setPendingSellerPayoutActionsCount(payoutRes.summary.actionNeededCount);
            }
          })
          .catch(() => {});
        safeFetchJSON('/api/admin/resale', undefined, 0)
          .then((resaleRes) => {
            if (Array.isArray(resaleRes?.listings)) {
              const count = resaleRes.listings.filter(
                (l: any) => l.status === 'pending_moderation' || l.status === 'reserved'
              ).length;
              setPendingResaleCount(count);
            }
          })
          .catch(() => {});
        safeFetchJSON('/api/admin/affiliates', undefined, 0)
          .then((affRes) => {
            if (Array.isArray(affRes?.payouts)) {
              setPendingAffiliatePayoutsCount(
                affRes.payouts.filter((p: any) => p.status === 'pending').length
              );
            }
          })
          .catch(() => {});
      }
    } catch (e: any) {
      console.warn('MongoDB fetch retry exhausted:', e?.message);
    } finally {
      setIsInitialLoaded(true);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => fetchData(), 30000);
    return () => clearInterval(interval);
  }, [currentUser?.telegramId]);

  useEffect(() => {
    if (currentView === 'loading' && isInitialLoaded) {
      const params = new URLSearchParams(window.location.search);
      if (params.get('admin_invite')) {
        if (currentUser && !currentUser.isAdmin) {
          // Claim invite on this device and send to auth screen so they can sign in as Admin
          (async () => {
            try {
              const res = await safeFetchJSON('/api/admin-access/claim-invite', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  inviteCode: params.get('admin_invite'),
                  label: getSuggestedDeviceLabel()
                })
              });
              if (res?.deviceToken) {
                writeStoredAdminDeviceToken(res.deviceToken);
                notify("Qurilmangizga Admin Panel ruxsati berildi!", 'success');
              }
            } catch (err: any) {
              notify(err?.message || "Taklif havolasi yaroqsiz", 'error');
            } finally {
              try {
                localStorage.removeItem('yuyu_shop_session_id');
                localStorage.removeItem('ruslan_shop_session_id');
              } catch {}
              window.history.replaceState({}, '', '/');
              setCurrentUser(null);
              setCurrentView('auth');
            }
          })();
          return;
        }
        if (!currentUser) {
          setCurrentView('auth');
          return;
        }
      }
      if (window.location.pathname === '/auction') {
        setCurrentView('auction');
        return;
      }
      if (currentUser) {
        if (pendingDeepLinkProductId) {
          const found = allProducts.find((p) => p.id === pendingDeepLinkProductId);
          if (found) {
            setSelectedProduct(found);
            setPendingDeepLinkProductId(null);
            setCurrentView('detail');
            return;
          }
        }
        if (window.location.pathname === '/find-product') {
          setCurrentView('find_product');
        } else if (window.location.pathname === '/tayyor-bozor') {
          setCurrentView('tayyor_bozor');
        } else {
          setCurrentView('home');
        }
      } else {
        if (window.location.pathname === '/tayyor-bozor') {
          setReturnAfterAuthView('tayyor_bozor');
        }
        setCurrentView('auth');
      }
    }
  }, [currentView, isInitialLoaded, currentUser, allProducts, pendingDeepLinkProductId]);

  const filteredProducts = allProducts.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category.toLowerCase().includes(searchQuery.toLowerCase());
    const price = p.pinduoduoPrice * MARKUP_RATE * CURRENCY_RATE;
    const matchesPrice = price >= filters.minPrice && price <= filters.maxPrice;
    const matchesRating = p.rating >= filters.rating;
    return matchesSearch && matchesPrice && matchesRating;
  });

  const toggleWishlist = async (productId: string) => {
    if (!currentUser) return;
    playClickSound();
    try {
      const data = await safeFetchJSON('/api/wishlist/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.telegramId, productId })
      });
      if (data.success) {
        setWishlist(data.wishlist);
        const added = data.wishlist.includes(productId);
        notify(added ? "Saralanganlarga qo'shildi" : "Saralanganlardan olib tashlandi", 'info');
      }
    } catch {}
  };

  const getVipStatus = (user: User) => {
    const info = getEffectiveVipStatus(user);
    if (info.tier === 'DIAMOND') return { label: 'DIAMOND VIP', color: 'text-cyan-400', icon: <Sparkles size={14} /> };
    if (info.tier === 'GOLD') return { label: 'GOLD VIP', color: 'text-amber-400', icon: <Star size={14} /> };
    if (info.tier === 'SILVER') return { label: 'SILVER VIP', color: 'text-slate-400', icon: <ShieldCheck size={14} /> };
    return null;
  };

  const handleAuthSuccess = async (savedUser: User) => {
    setCurrentUser(savedUser);
    try {
      localStorage.setItem('yuyu_shop_session_id', savedUser.telegramId);
    } catch {}

    await fetchData(savedUser.telegramId);
    soundEngine.playWelcome();
    notify(`Xush kelibsiz, ${savedUser.username}!`, 'success');
    if (pendingDeepLinkProductId) {
      const found = allProducts.find((p) => p.id === pendingDeepLinkProductId);
      if (found) {
        setSelectedProduct(found);
        setPendingDeepLinkProductId(null);
        setReturnAfterAuthView(null);
        setCurrentView('detail');
      } else {
        const nextView = returnAfterAuthView || 'home';
        setReturnAfterAuthView(null);
        setCurrentView(nextView);
      }
    } else {
      const nextView = returnAfterAuthView || 'home';
      setReturnAfterAuthView(null);
      setCurrentView(nextView);
    }

    sendTelegramNotification(
      `🆕 YUYU Shop foydalanuvchi kirdi:\n👤 Ism: ${savedUser.username}\n📱 Tel: ${savedUser.phoneNumber || savedUser.telegramId}\n👑 Admin: ${savedUser.isAdmin ? 'Ha' : "Yo'q"}`
    );
  };

  const processPayment = async (
    receiptImage: string,
    address: string,
    finalPrice?: number,
    usedPromo?: string,
    cashbackUsed?: number
  ) => {
    if (!currentUser || !pendingOrderData) return;
    const { product, size, quantity = 1, cartItemId } = pendingOrderData;
    const safeQty = Math.max(1, Math.round(quantity || 1));
    const actualPrice =
      typeof finalPrice === 'number'
        ? finalPrice
        : Math.round(product.pinduoduoPrice * MARKUP_RATE * CURRENCY_RATE * safeQty);

    const newOrder: Order = {
      id: 'YUYU-' + Date.now().toString().slice(-6),
      userId: currentUser.telegramId,
      username: currentUser.username,
      productId: product.id,
      productName: safeQty > 1 ? `${product.name} (${safeQty} dona)` : product.name,
      size,
      price: actualPrice,
      status: 'verifying',
      date: new Date().toLocaleDateString(),
      timestamp: Date.now(),
      receiptImage,
      address,
      cashbackUsed: Math.max(0, Math.round(cashbackUsed || 0)),
      referredBy: getStoredAffiliateRef() || undefined
    };

    try {
      const res = await safeFetchJSON('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newOrder)
      });
      const savedOrder = res?.order || newOrder;

      if (usedPromo) {
        await safeFetchJSON('/api/promo/use', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: usedPromo })
        });
      }

      if (cartItemId) {
        const remainingCart = cart.filter((item) => item.id !== cartItemId);
        setCart(remainingCart);
        syncCartToMongo(remainingCart);
      }

      if (pendingOrderData.auctionId) {
        try {
          await safeFetchJSON(`/api/auctions/${pendingOrderData.auctionId}/claim`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-user-id': currentUser.telegramId
            },
            body: JSON.stringify({
              userId: currentUser.telegramId,
              orderId: savedOrder.id
            })
          });
        } catch {}
      }

      setOrders((prev) => [savedOrder, ...prev]);
      setPendingOrderData(null);
      setReceiptOrder(savedOrder);
      notify("To'lov yuborildi, tekshirilmoqda", 'success');
      setCurrentView('receipt');
      fetchData();

      sendTelegramNotification(
        `💸 *YUYU Shop Yangi To'lov*\n📦 Tovar: ${savedOrder.productName}\n💰 Narx: ${savedOrder.price.toLocaleString()} so'm\n👤 Mijoz: ${currentUser.username}\n📍 Manzil: ${address}\n🆔 Buyurtma: ${savedOrder.id}`
      );
    } catch {
      notify("Buyurtmani saqlashda xatolik yuz berdi", 'error');
    }
  };

  const updateOrderStatus = async (
    orderId: string,
    status: Order['status'],
    trackNumber?: string
  ) => {
    try {
      const res = await safeFetchJSON('/api/orders/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: orderId, status, trackNumber })
      });
      const updatedOrder = res?.order;
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? {
                ...o,
                ...(updatedOrder || {}),
                status,
                trackNumber: trackNumber || o.trackNumber
              }
            : o
        )
      );
      if (res?.updatedUser) {
        const u: User = res.updatedUser;
        setAllUsers((prev) =>
          prev.map((item) =>
            item.telegramId === u.telegramId || item.phoneNumber === u.phoneNumber ? u : item
          )
        );
        if (
          currentUser &&
          (currentUser.telegramId === u.telegramId || currentUser.phoneNumber === u.phoneNumber)
        ) {
          setCurrentUser(u);
        }
      }
      if (status === 'delivered' && updatedOrder?.cashbackEarned > 0) {
        notify(
          `Buyurtma yetkazildi! Mijozga +${updatedOrder.cashbackEarned.toLocaleString()} so'm VIP keshbek berildi`,
          'success'
        );
      } else {
        notify("Buyurtma holati yangilandi", 'success');
      }
    } catch {
      notify("Buyurtmani yangilashda xatolik", 'error');
    }
  };

  const deleteOrder = async (orderId: string) => {
    try {
      await safeFetchJSON(`/api/orders/${orderId}`, { method: 'DELETE' });
      setOrders((prev) => prev.filter((o) => o.id !== orderId));
      notify("Buyurtma o'chirildi", 'info');
    } catch {
      notify("Buyurtmani o'chirishda xatolik", 'error');
    }
  };

  const syncCartToMongo = async (updatedCart: any[]) => {
    if (!currentUser) return;
    try {
      await safeFetchJSON('/api/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.telegramId, items: updatedCart })
      });
    } catch {}
  };

  const addToCart = (product: Product, size: string, quantity = 1) => {
    playClickSound();
    const safeQty = Math.max(1, Math.min(20, Math.round(quantity || 1)));
    const existingIdx = cart.findIndex(
      (item) => item.product?.id === product.id && item.size === size
    );
    let updated: any[];
    if (existingIdx > -1) {
      updated = cart.map((item, idx) =>
        idx === existingIdx
          ? { ...item, quantity: (item.quantity || 1) + safeQty }
          : item
      );
    } else {
      const newItem = { id: Date.now().toString(), product, size, quantity: safeQty };
      updated = [...cart, newItem];
    }
    setCart(updated);
    syncCartToMongo(updated);
    notify(
      safeQty > 1
        ? `Savatga qo'shildi (${safeQty} dona · ${size})`
        : `Savatga qo'shildi (${size})`,
      'success'
    );
  };

  const removeFromCart = (id: string) => {
    playClickSound();
    const updated = cart.filter((item) => item.id !== id);
    setCart(updated);
    syncCartToMongo(updated);
    notify("Savatdan olib tashlandi", 'info');
  };

  const navigate = (view: View) => {
    playClickSound();
    setCurrentView(view);
    try {
      const targetPath =
        view === 'find_product'
          ? '/find-product'
          : view === 'auction'
          ? '/auction'
          : view === 'tayyor_bozor'
          ? '/tayyor-bozor'
          : '/';
      if (window.location.pathname !== targetPath) {
        window.history.replaceState({}, '', targetPath);
      }
    } catch {}
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const pendingCustomRequestsCount = customRequests.filter((r) => r.status === 'PENDING').length;
  const myPricedCustomRequestsCount = currentUser
    ? customRequests.filter(
        (r) =>
          r.status === 'PRICED' &&
          (r.userId === currentUser.telegramId ||
            (currentUser.phoneNumber && r.phoneNumber === currentUser.phoneNumber))
      ).length
    : 0;

  const toggleTheme = () => {
    playClickSound();
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const handleLogout = () => {
    playClickSound();
    try {
      localStorage.removeItem('yuyu_shop_session_id');
      localStorage.removeItem('ruslan_shop_session_id');
    } catch {}
    setCurrentUser(null);
    setCart([]);
    setWishlist([]);
    navigate('auth');
  };

  if (currentView === 'loading') {
    return (
      <MotionConfig reducedMotion="user">
        <GlobalAmbientCanvas />
        <LoadingView onRetry={() => fetchData()} />
      </MotionConfig>
    );
  }

  if (currentView === 'auction' && !currentUser) {
    return (
      <MotionConfig reducedMotion="user">
        <GlobalAmbientCanvas />
        <div className="min-h-screen text-slate-900 dark:text-slate-100">
          <div className="max-w-[1360px] mx-auto px-5 sm:px-6 lg:px-10 py-6 lg:py-10">
            <LiveAuctionView
              currentUser={null}
              onNavigate={(view) => {
                if (view === 'auction') return;
                setReturnAfterAuthView(view);
                setCurrentView('auth');
              }}
              onRequireLogin={() => {
                setReturnAfterAuthView('auction');
                setCurrentView('auth');
              }}
              notify={notify}
              safeFetchJSON={safeFetchJSON}
            />
          </div>
          <ToastStack notifications={notifications} />
        </div>
      </MotionConfig>
    );
  }

  if (currentView === 'auth' || !currentUser) {
    return (
      <MotionConfig reducedMotion="user">
        <GlobalAmbientCanvas />
        <AuthView
          t={t}
          onAuthSuccess={handleAuthSuccess}
          playSound={playClickSound}
          soundEnabled={soundEnabled}
          onToggleSound={toggleSound}
          theme={theme}
          onToggleTheme={toggleTheme}
          notify={notify}
          safeFetchJSON={safeFetchJSON}
        />
        <ToastStack notifications={notifications} />
      </MotionConfig>
    );
  }

  return (
    <MotionConfig reducedMotion="user">
    <GlobalAmbientCanvas />
    <AdminAccessProvider
      currentUser={currentUser}
      safeFetchJSON={safeFetchJSON}
      notify={notify}
    >
    <div className="min-h-screen flex flex-col bg-transparent text-slate-900 dark:text-slate-100 pb-20 md:pb-0">
      <DesktopHeader
        currentView={currentView}
        currentUser={currentUser}
        cartCount={cart.length}
        onNavigate={navigate}
      />

      <main className="flex-1 w-full max-w-[1360px] mx-auto px-5 sm:px-6 lg:px-10 py-8 lg:py-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentView}
            variants={pageTransitionVariants}
            initial="initial"
            animate="animate"
            exit="exit"
          >
        {currentView === 'home' && (
          <HomeView
            t={t}
            products={allProducts}
            cart={cart}
            banners={banners}
            onProductClick={(p) => {
              playClickSound();
              setSelectedProduct(p);
              navigate('detail');
            }}
            onAddToCart={addToCart}
            onNavigate={navigate}
            onSelectCategory={(cat) => setSelectedCatalogCategory(cat)}
            isAdmin={currentUser.isAdmin}
            currentUser={currentUser}
            onOpenVipModal={() => setIsVipModalOpen(true)}
          />
        )}

        {currentView === 'catalog' && (
          <CatalogView
            t={t}
            products={allProducts}
            initialCategory={selectedCatalogCategory}
            currentUser={currentUser}
            onNavigate={navigate}
            videoCount={productVideos.length}
            pricedCustomRequestsCount={myPricedCustomRequestsCount}
            onProductClick={(p) => {
              playClickSound();
              setSelectedProduct(p);
              navigate('detail');
            }}
          />
        )}

        {currentView === 'find_product' && (
          <FindProductView
            currentUser={currentUser}
            onBack={() => navigate('catalog')}
            onCreated={(req) => setCustomRequests((prev) => [req, ...prev])}
            onOpenMyRequests={() => navigate('my_requests')}
            notify={notify}
            safeFetchJSON={safeFetchJSON}
            sendTelegramNotification={sendTelegramNotification}
          />
        )}

        {currentView === 'my_requests' && (
          <MyCustomRequestsView
            currentUser={currentUser}
            requests={customRequests}
            onRequestsChange={setCustomRequests}
            onOrderQuote={(req) => {
              const quoteProduct = customRequestToProduct(req);
              setPendingOrderData({ product: quoteProduct, size: 'Standart' });
              navigate('payment');
            }}
            onAddQuoteToCart={(req) => {
              const quoteProduct = customRequestToProduct(req);
              addToCart(quoteProduct, 'Standart', 1);
            }}
            onOpenFindProduct={() => navigate('find_product')}
            onBack={() => navigate('profile')}
            notify={notify}
            safeFetchJSON={safeFetchJSON}
          />
        )}

        {currentView === 'videos' && (
          <VideoReelsView
            videos={productVideos}
            products={allProducts}
            currentUser={currentUser}
            onAddToCart={addToCart}
            onOrder={(p, sz) => {
              playClickSound();
              setPendingOrderData({ product: p, size: sz });
              navigate('payment');
            }}
            onProductClick={(p) => {
              playClickSound();
              setSelectedProduct(p);
              navigate('detail');
            }}
            onOpenVipModal={() => setIsVipModalOpen(true)}
            onVideosChange={setProductVideos}
            notify={notify}
            safeFetchJSON={safeFetchJSON}
          />
        )}

        {currentView === 'ai_assistant' && (
          <AiAssistantView
            messages={aiMessages}
            onMessagesChange={setAiMessages}
            products={allProducts}
            currentUser={currentUser}
            onProductClick={(p) => {
              playClickSound();
              setSelectedProduct(p);
              navigate('detail');
            }}
            onAddToCart={addToCart}
            onNavigate={navigate}
            notify={notify}
            safeFetchJSON={safeFetchJSON}
          />
        )}

        {currentView === 'auction' && (
          <LiveAuctionView
            currentUser={currentUser}
            onNavigate={navigate}
            onRequireLogin={() => {
              setReturnAfterAuthView('auction');
              navigate('auth');
            }}
            onOpenVipModal={() => setIsVipModalOpen(true)}
            notify={notify}
            safeFetchJSON={safeFetchJSON}
            isAdminAuthorized={currentUser.isAdmin}
          />
        )}

        {currentView === 'my_auctions' && (
          <MyAuctionsView
            currentUser={currentUser}
            onBack={() => navigate('profile')}
            onNavigate={navigate}
            onOpenVipModal={() => setIsVipModalOpen(true)}
            onClaimWonAuction={(auc) => {
              playClickSound();
              const orderProduct = auctionToOrderProduct(auc);
              setPendingOrderData({
                product: orderProduct,
                size: "Auksion yutug'i",
                quantity: 1,
                auctionId: auc.id
              });
              navigate('payment');
            }}
            notify={notify}
            safeFetchJSON={safeFetchJSON}
          />
        )}

        {currentView === 'search' && (
          <SearchView
            t={t}
            query={searchQuery}
            setQuery={setSearchQuery}
            results={filteredProducts}
            currentUser={currentUser}
            onProductClick={(p) => {
              playClickSound();
              setSelectedProduct(p);
              navigate('detail');
            }}
            filters={filters}
            setFilters={setFilters}
            playSound={playClickSound}
          />
        )}

        {currentView === 'detail' && selectedProduct && (
          <DetailView
            t={t}
            product={selectedProduct}
            onBack={() => navigate('catalog')}
            onOrder={(p, sz) => {
              playClickSound();
              setPendingOrderData({ product: p, size: sz });
              navigate('payment');
            }}
            onAddToCart={addToCart}
            isWishlisted={wishlist.includes(selectedProduct.id)}
            onToggleWishlist={toggleWishlist}
            playSound={playClickSound}
            currentUser={currentUser}
            fetchData={fetchData}
            notify={notify}
            safeFetchJSON={safeFetchJSON}
            onOpenVipModal={() => setIsVipModalOpen(true)}
          />
        )}

        {currentView === 'cart' && (
          <CartView
            t={t}
            cart={cart}
            products={allProducts}
            onRemove={removeFromCart}
            onCheckout={(item) => {
              playClickSound();
              setPendingOrderData({
                product: item.product,
                size: item.size,
                quantity: item.quantity || 1,
                cartItemId: item.id
              });
              navigate('payment');
            }}
            onProductClick={(p) => {
              playClickSound();
              setSelectedProduct(p);
              navigate('detail');
            }}
            onAddToCart={addToCart}
            onBack={() => navigate('catalog')}
            playSound={playClickSound}
            currentUser={currentUser}
            onOpenVipModal={() => setIsVipModalOpen(true)}
          />
        )}

        {currentView === 'payment' && pendingOrderData && (
          <PaymentView
            t={t}
            product={pendingOrderData.product}
            quantity={pendingOrderData.quantity || 1}
            promoCodes={promoCodes}
            currentUser={currentUser}
            onConfirm={(r, addr, finalPrice, usedPromo, cashbackUsed) => {
              playClickSound();
              processPayment(r, addr, finalPrice, usedPromo, cashbackUsed);
            }}
            onBack={() => navigate(pendingOrderData.cartItemId ? 'cart' : 'detail')}
            playSound={playClickSound}
            notify={notify}
          />
        )}

        {currentView === 'receipt' && (
          <ReceiptView
            t={t}
            order={receiptOrder}
            onBack={() => navigate('orders')}
            playSound={playClickSound}
          />
        )}

        {currentView === 'orders' && (
          <OrdersView
            t={t}
            orders={orders.filter((o) => o.userId === currentUser.telegramId)}
            products={allProducts}
            currentUser={currentUser}
            onNavigate={navigate}
            setReceiptOrder={setReceiptOrder}
            notify={notify}
            safeFetchJSON={safeFetchJSON}
          />
        )}

        {currentView === 'tayyor_bozor' && (
          <TayyorBozorStorefront
            currentUser={currentUser}
            onNavigate={navigate}
            notify={notify}
            safeFetchJSON={safeFetchJSON}
            onRefreshData={() => fetchData(currentUser.telegramId)}
          />
        )}

        {currentView === 'affiliate_cabinet' && (
          <AffiliateCabinetView
            user={currentUser}
            products={allProducts}
            onBack={() => navigate('profile')}
            notify={notify}
            safeFetchJSON={safeFetchJSON}
          />
        )}

        {currentView === 'profile' && (
          <ProfileView
            t={t}
            user={currentUser}
            setUser={setCurrentUser}
            onLogout={handleLogout}
            onNavigate={navigate}
            playSound={playClickSound}
            vipStatus={getVipStatus(currentUser)}
            notify={notify}
            theme={theme}
            onToggleTheme={toggleTheme}
            soundEnabled={soundEnabled}
            onToggleSound={toggleSound}
            safeFetchJSON={safeFetchJSON}
            onOpenVipModal={() => setIsVipModalOpen(true)}
            pendingCustomRequestsCount={pendingCustomRequestsCount}
            pricedCustomRequestsCount={myPricedCustomRequestsCount}
            pendingSellerPayoutActionsCount={pendingSellerPayoutActionsCount}
            pendingResaleCount={pendingResaleCount}
            pendingAffiliatePayoutsCount={pendingAffiliatePayoutsCount}
          />
        )}

        {currentView === 'wishlist' && (
          <WishlistView
            t={t}
            products={allProducts}
            wishlist={wishlist}
            onProductClick={(p) => {
              playClickSound();
              setSelectedProduct(p);
              navigate('detail');
            }}
            onBack={() => navigate('profile')}
            playSound={playClickSound}
          />
        )}

        {currentView === 'support' && (
          <SupportView
            t={t}
            user={currentUser}
            onBack={() => navigate('profile')}
            playSound={playClickSound}
            notify={notify}
            safeFetchJSON={safeFetchJSON}
          />
        )}

        {currentView === 'partnership' && (
          <PartnershipView
            t={t}
            user={currentUser}
            onBack={() => navigate('profile')}
            playSound={playClickSound}
            notify={notify}
            safeFetchJSON={safeFetchJSON}
          />
        )}

        {currentView === 'promo' && (
          <PromoCodesView
            t={t}
            user={currentUser}
            promoCodes={promoCodes}
            onBack={() => navigate('profile')}
            playSound={playClickSound}
          />
        )}

        {currentView === 'referral' && (
          <ReferralView
            t={t}
            user={currentUser}
            playSound={playClickSound}
            notify={notify}
            onBack={() => navigate('profile')}
          />
        )}

        {currentView === 'stats' && (
          <ProtectedStatsView
            t={t}
            orders={orders}
            products={allProducts}
            users={allUsers}
            onBack={() => navigate('profile')}
            onUnauthorizedBack={() => navigate('profile')}
            playSound={playClickSound}
          />
        )}

        {currentView === 'manage_orders' && (
          <ProtectedAdminOrdersView
            t={t}
            orders={orders}
            onUpdateStatus={updateOrderStatus}
            onDelete={deleteOrder}
            onBack={() => navigate('profile')}
            onUnauthorizedBack={() => navigate('profile')}
            playSound={playClickSound}
          />
        )}

        {currentView === 'manage_banners' && (
          <ProtectedManageBannersView
            banners={banners}
            onUpdate={setBanners}
            onBack={() => navigate('profile')}
            onUnauthorizedBack={() => navigate('profile')}
            playSound={playClickSound}
            notify={notify}
            safeFetchJSON={safeFetchJSON}
          />
        )}

        {currentView === 'manage_products' && (
          <ProtectedManageProductsView
            products={allProducts}
            onEdit={(p) => {
              setProductToEdit(p);
              navigate('admin_add_product');
            }}
            onDelete={async (id) => {
              try {
                await safeFetchJSON(`/api/products/${id}`, { method: 'DELETE' });
                setAllProducts(allProducts.filter((p) => p.id !== id));
                notify("Mahsulot o'chirildi", 'info');
              } catch {
                notify("O'chirishda xatolik", 'error');
              }
            }}
            onBack={() => navigate('profile')}
            onUnauthorizedBack={() => navigate('profile')}
            playSound={playClickSound}
          />
        )}

        {(currentView === 'user_search' || currentView === 'admin-users') && (
          <ProtectedUserSearchView
            users={allUsers}
            onBack={() => navigate('profile')}
            onUnauthorizedBack={() => navigate('profile')}
          />
        )}

        {currentView === 'admin_add_product' && (
          <ProtectedAdminAddProductView
            productToEdit={productToEdit}
            onAdd={(p) => {
              setAllProducts((prev) => {
                const idx = prev.findIndex((x) => x.id === p.id);
                if (idx > -1) {
                  const n = [...prev];
                  n[idx] = p;
                  return n;
                }
                return [p, ...prev];
              });
              notify(productToEdit ? 'Mahsulot yangilandi' : "Mahsulot qo'shildi", 'success');
              setProductToEdit(null);
              fetchData();
              navigate('manage_products');
            }}
            onBack={() => {
              setProductToEdit(null);
              navigate('profile');
            }}
            onUnauthorizedBack={() => navigate('profile')}
            playSound={playClickSound}
            notify={notify}
            safeFetchJSON={safeFetchJSON}
          />
        )}

        {currentView === 'admin-partnerships' && (
          <ProtectedAdminPartnershipsView
            partnerships={partnerships}
            onUpdate={async (id, status) => {
              try {
                await safeFetchJSON('/api/partnerships/update', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ id, status })
                });
                fetchData();
                notify('Holat yangilandi', 'success');
              } catch {
                notify('Xatolik yuz berdi', 'error');
              }
            }}
            onBack={() => navigate('profile')}
            onUnauthorizedBack={() => navigate('profile')}
            playSound={playClickSound}
          />
        )}

        {currentView === 'admin-support' && (
          <ProtectedAdminSupportView
            messages={supportMessages}
            onBack={() => navigate('profile')}
            onUnauthorizedBack={() => navigate('profile')}
            playSound={playClickSound}
          />
        )}

        {currentView === 'admin_vip' && (
          <ProtectedAdminVipManagementView
            adminUser={currentUser}
            users={allUsers}
            onUsersUpdated={(updatedUser) => {
              setAllUsers((prev) =>
                prev.map((item) =>
                  item.telegramId === updatedUser.telegramId ||
                  item.phoneNumber === updatedUser.phoneNumber
                    ? updatedUser
                    : item
                )
              );
              if (
                currentUser.telegramId === updatedUser.telegramId ||
                currentUser.phoneNumber === updatedUser.phoneNumber
              ) {
                setCurrentUser(updatedUser);
              }
            }}
            onBack={() => navigate('profile')}
            onUnauthorizedBack={() => navigate('profile')}
            notify={notify}
            safeFetchJSON={safeFetchJSON}
          />
        )}
        {currentView === 'admin_custom_requests' && (
          <ProtectedAdminCustomRequestsView
            adminUser={currentUser}
            requests={customRequests}
            onRequestsChange={setCustomRequests}
            onBack={() => navigate('profile')}
            onUnauthorizedBack={() => navigate('profile')}
            notify={notify}
            safeFetchJSON={safeFetchJSON}
          />
        )}
        {currentView === 'admin_access' && (
          <ProtectedAdminAccessView
            adminUser={currentUser}
            onBack={() => navigate('profile')}
            onUnauthorizedBack={() => navigate('profile')}
            notify={notify}
            safeFetchJSON={safeFetchJSON}
          />
        )}
        {currentView === 'admin_auctions' && (
          <ProtectedAdminAuctionsView
            onBack={() => navigate('profile')}
            onNavigate={navigate}
            onUnauthorizedBack={() => navigate('profile')}
            notify={notify}
            safeFetchJSON={safeFetchJSON}
            sendTelegramNotification={sendTelegramNotification}
          />
        )}
        {currentView === 'admin_seller_payouts' && (
          <ProtectedAdminSellerPayoutsView
            onBack={() => navigate('profile')}
            onNavigate={navigate}
            onUnauthorizedBack={() => navigate('profile')}
            notify={notify}
            safeFetchJSON={safeFetchJSON}
            onActionCountChange={setPendingSellerPayoutActionsCount}
          />
        )}
        {currentView === 'admin_tayyor_bozor' && (
          <ProtectedAdminTayyorBozorView
            onBack={() => navigate('profile')}
            onUnauthorizedBack={() => navigate('profile')}
            notify={notify}
            safeFetchJSON={safeFetchJSON}
            onPendingCountChange={setPendingResaleCount}
          />
        )}
        {currentView === 'admin_affiliates' && (
          <ProtectedAdminAffiliateView
            onBack={() => navigate('profile')}
            onUnauthorizedBack={() => navigate('profile')}
            notify={notify}
            safeFetchJSON={safeFetchJSON}
            onPendingPayoutsChange={setPendingAffiliatePayoutsCount}
          />
        )}
          </motion.div>
        </AnimatePresence>
      </main>

      {currentView === 'catalog' && (
        <FloatingPhotoRequestButton onClick={() => navigate('find_product')} />
      )}

      <FloatingAiDrawer
        currentView={currentView}
        messages={aiMessages}
        onMessagesChange={setAiMessages}
        products={allProducts}
        currentUser={currentUser}
        onProductClick={(p) => {
          playClickSound();
          setSelectedProduct(p);
          navigate('detail');
        }}
        onAddToCart={addToCart}
        onNavigate={navigate}
        notify={notify}
        safeFetchJSON={safeFetchJSON}
      />

      <DesktopFooter
        theme={theme}
        onToggleTheme={toggleTheme}
        soundEnabled={soundEnabled}
        onToggleSound={toggleSound}
        onNavigate={navigate}
      />
      <MobileBottomNav
        currentView={currentView}
        cartCount={cart.length}
        onNavigate={navigate}
        currentUser={currentUser}
      />
      <VipSubscribeModal
        isOpen={isVipModalOpen}
        onClose={() => setIsVipModalOpen(false)}
        user={currentUser}
        onSubscribed={(updatedUser) => {
          setCurrentUser(updatedUser);
          setAllUsers((prev) =>
            prev.map((item) =>
              item.telegramId === updatedUser.telegramId ||
              item.phoneNumber === updatedUser.phoneNumber
                ? updatedUser
                : item
            )
          );
          fetchData(updatedUser.telegramId);
        }}
        notify={notify}
        safeFetchJSON={safeFetchJSON}
      />
      <ToastStack notifications={notifications} />
    </div>
    </AdminAccessProvider>
    </MotionConfig>
  );
};

const ToastStack: React.FC<{
  notifications: { id: string; message: string; type: string }[];
}> = ({ notifications }) => (
  <div className="fixed top-20 right-5 z-[200] space-y-2.5 pointer-events-none">
    <AnimatePresence initial={false}>
      {notifications.map((n) => (
        <motion.div
          key={n.id}
          layout
          initial={{ opacity: 0, x: 42, scale: 0.92 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: 36, scale: 0.92 }}
          transition={{ type: 'spring', stiffness: 420, damping: 28 }}
          className={`px-4 py-3 rounded-2xl backdrop-blur-2xl border shadow-[0_14px_34px_rgba(15,23,42,0.16)] flex items-center gap-2.5 pointer-events-auto text-xs font-semibold ${
            n.type === 'success'
              ? 'bg-emerald-600/90 border-emerald-300/40 text-white'
              : n.type === 'error'
              ? 'bg-red-600/90 border-red-300/40 text-white'
              : 'bg-[#0F294A]/90 border-white/25 text-white'
          }`}
        >
          {n.type === 'success' && <Check size={15} />}
          {n.type === 'error' && <Ban size={15} />}
          {n.type === 'info' && <Bell size={15} />}
          <span>{n.message}</span>
        </motion.div>
      ))}
    </AnimatePresence>
  </div>
);

export default App;
