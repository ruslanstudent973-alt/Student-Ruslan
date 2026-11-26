'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  Download,
  Loader2,
  PlusSquare,
  Share,
  Smartphone,
  WifiOff,
  X,
} from 'lucide-react';
import type { User } from '../types';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

type DetectedPlatform = 'android' | 'ios' | 'desktop' | 'unknown';

const INSTALL_DISMISS_KEY = 'yuyu_pwa_install_dismissed_at';
const PUSH_DISMISS_KEY = 'yuyu_pwa_push_dismissed_at';
const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export const PUSH_PROMPT_EVENT = 'yuyu:trigger-push-prompt';

export function triggerPushPermissionPrompt(reason: 'login' | 'order' | 'bid') {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(PUSH_PROMPT_EVENT, { detail: { reason } }));
}

function isDismissedWithin(storageKey: string, durationMs: number): boolean {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return false;
    const ts = Number(raw);
    if (!Number.isFinite(ts)) return false;
    return Date.now() - ts < durationMs;
  } catch {
    return false;
  }
}

function markDismissedNow(storageKey: string) {
  try {
    localStorage.setItem(storageKey, String(Date.now()));
  } catch {}
}

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const buffer = new ArrayBuffer(rawData.length);
  const outputArray = new Uint8Array(buffer);
  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function detectClientPlatform(): {
  platform: DetectedPlatform;
  isStandalone: boolean;
  isIosSafari: boolean;
} {
  if (typeof window === 'undefined') {
    return { platform: 'unknown', isStandalone: false, isIosSafari: false };
  }

  const ua = window.navigator.userAgent || '';
  const lower = ua.toLowerCase();
  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true;

  const isIos =
    /iphone|ipad|ipod/.test(lower) ||
    (window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1);
  const isAndroid = /android/.test(lower);

  const isIosSafari =
    isIos && /safari/.test(lower) && !/crios|fxios|edgios|opios/.test(lower);

  if (isIos) return { platform: 'ios', isStandalone, isIosSafari };
  if (isAndroid) return { platform: 'android', isStandalone, isIosSafari: false };
  return { platform: 'desktop', isStandalone, isIosSafari: false };
}

interface SmartPwaManagerProps {
  currentUser: User | null;
  notify?: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const SmartPwaManager: React.FC<SmartPwaManagerProps> = ({
  currentUser,
  notify,
}) => {
  const [platform, setPlatform] = useState<DetectedPlatform>('unknown');
  const [isStandalone, setIsStandalone] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallCard, setShowInstallCard] = useState(false);
  const [installing, setInstalling] = useState(false);

  const [showPushPrompt, setShowPushPrompt] = useState(false);
  const [pushReason, setPushReason] = useState<'login' | 'order' | 'bid'>('login');
  const [subscribingPush, setSubscribingPush] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  const cachedVapidKeyRef = useRef<string>(
    (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '').trim()
  );
  const syncedUserRef = useRef<string>('');

  const resolvePublicVapidKey = useCallback(async (): Promise<string> => {
    if (cachedVapidKeyRef.current) return cachedVapidKeyRef.current;
    try {
      const res = await fetch('/api/push/subscribe', { method: 'GET' });
      if (res.ok) {
        const data = await res.json();
        if (typeof data?.publicKey === 'string' && data.publicKey.trim()) {
          cachedVapidKeyRef.current = data.publicKey.trim();
          return cachedVapidKeyRef.current;
        }
      }
    } catch {}
    return '';
  }, []);

  const syncPushSubscription = useCallback(
    async (userId: string, requestPermissionIfDefault: boolean): Promise<boolean> => {
      if (
        typeof window === 'undefined' ||
        !('serviceWorker' in navigator) ||
        !('PushManager' in window) ||
        !('Notification' in window)
      ) {
        return false;
      }

      let permission = Notification.permission;
      if (permission === 'default' && requestPermissionIfDefault) {
        permission = await Notification.requestPermission();
      }
      if (permission !== 'granted') {
        return false;
      }

      const publicKey = await resolvePublicVapidKey();
      if (!publicKey) {
        return false;
      }

      const registration = await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        });
      }

      const json = subscription.toJSON();
      if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
        return false;
      }

      const detected = detectClientPlatform();
      const saveRes = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          subscription: {
            endpoint: json.endpoint,
            keys: {
              p256dh: json.keys.p256dh,
              auth: json.keys.auth,
            },
          },
          deviceType: detected.platform,
          isStandalone: detected.isStandalone,
        }),
      });

      return saveRes.ok;
    },
    [resolvePublicVapidKey]
  );

  // Detect device, standalone state, online status, and beforeinstallprompt
  useEffect(() => {
    const info = detectClientPlatform();
    setPlatform(info.platform);
    setIsStandalone(info.isStandalone);
    setIsOnline(typeof navigator !== 'undefined' ? navigator.onLine : true);

    const dismissedRecently = isDismissedWithin(INSTALL_DISMISS_KEY, THREE_DAYS_MS);

    // iOS Safari has no beforeinstallprompt — show guided installation card automatically
    if (!info.isStandalone && info.platform === 'ios' && !dismissedRecently) {
      const timer = window.setTimeout(() => setShowInstallCard(true), 1600);
      return () => window.clearTimeout(timer);
    }

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      if (!info.isStandalone && !isDismissedWithin(INSTALL_DISMISS_KEY, THREE_DAYS_MS)) {
        setShowInstallCard(true);
      }
    };

    const handleInstalled = () => {
      setIsStandalone(true);
      setDeferredPrompt(null);
      setShowInstallCard(false);
    };

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleInstalled);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleInstalled);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Automatically sync Push subscription when logged in & already granted (especially in standalone mode)
  useEffect(() => {
    const uid = currentUser?.telegramId;
    if (!uid) return;
    if (typeof window === 'undefined' || !('Notification' in window)) return;

    if (Notification.permission === 'granted' && syncedUserRef.current !== uid) {
      syncedUserRef.current = uid;
      void syncPushSubscription(uid, false).catch(() => {});
    }
  }, [currentUser?.telegramId, syncPushSubscription]);

  // Listen for login / order / bid events to offer Web Push notifications automatically
  useEffect(() => {
    const handleTrigger = (e: Event) => {
      const uid = currentUser?.telegramId;
      if (!uid) return;
      if (
        typeof window === 'undefined' ||
        !('Notification' in window) ||
        !('serviceWorker' in navigator) ||
        !('PushManager' in window)
      ) {
        return;
      }

      const custom = e as CustomEvent<{ reason?: 'login' | 'order' | 'bid' }>;
      const reason = custom.detail?.reason || 'login';

      if (Notification.permission === 'granted') {
        void syncPushSubscription(uid, false).catch(() => {});
        return;
      }

      if (Notification.permission !== 'default') return;

      // On iOS outside standalone mode, Push requires adding to Home Screen first
      const info = detectClientPlatform();
      if (info.platform === 'ios' && !info.isStandalone) {
        if (!isDismissedWithin(INSTALL_DISMISS_KEY, THREE_DAYS_MS)) {
          setShowInstallCard(true);
        }
        return;
      }

      // Respect user dismissal unless they just placed an order or auction bid
      if (reason === 'login' && isDismissedWithin(PUSH_DISMISS_KEY, ONE_DAY_MS)) {
        return;
      }

      setPushReason(reason);
      setShowPushPrompt(true);
    };

    window.addEventListener(PUSH_PROMPT_EVENT, handleTrigger);
    return () => window.removeEventListener(PUSH_PROMPT_EVENT, handleTrigger);
  }, [currentUser?.telegramId, syncPushSubscription]);

  const handleInstallClick = async () => {
    if (!deferredPrompt || installing) return;
    setInstalling(true);
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsStandalone(true);
        setShowInstallCard(false);
        setDeferredPrompt(null);
        notify?.("YuYu Shop ilovasi qurilmangizga o'rnatildi!", 'success');
      } else {
        markDismissedNow(INSTALL_DISMISS_KEY);
        setShowInstallCard(false);
      }
    } catch {
      setShowInstallCard(false);
    } finally {
      setInstalling(false);
    }
  };

  const handleDismissInstall = () => {
    markDismissedNow(INSTALL_DISMISS_KEY);
    setShowInstallCard(false);
  };

  const handleEnablePush = async () => {
    if (!currentUser?.telegramId || subscribingPush) return;
    setSubscribingPush(true);
    try {
      const ok = await syncPushSubscription(currentUser.telegramId, true);
      setShowPushPrompt(false);
      if (ok) {
        notify?.("Push bildirishnomalar muvaffaqiyatli yoqildi!", 'success');
      } else if (typeof Notification !== 'undefined' && Notification.permission === 'denied') {
        notify?.("Brauzer sozlamalaridan bildirishnomalarga ruxsat bering", 'info');
      } else {
        notify?.("Bildirishnoma ruxsati saqlandi (VAPID kalitlari ulanganda faollashadi)", 'info');
      }
    } catch {
      setShowPushPrompt(false);
      notify?.("Bildirishnomani yoqishda xatolik yuz berdi", 'error');
    } finally {
      setSubscribingPush(false);
    }
  };

  const handleDismissPush = () => {
    markDismissedNow(PUSH_DISMISS_KEY);
    setShowPushPrompt(false);
  };

  const pushHeadline =
    pushReason === 'order'
      ? "Buyurtma kargosini jonli kuzating"
      : pushReason === 'bid'
      ? "Auksion stavkalarini boy bermang"
      : "Tezkor bildirishnomalarni yoqing";

  const pushDescription =
    pushReason === 'order'
      ? "Yuk mashinasi yangi bosqichga o'tishi bilan telefoningizga darhol xabar keladi."
      : pushReason === 'bid'
      ? "Stavkangizdan o'tib ketishsa yoki tugashiga 10 daqiqa qolganda darhol ogohlantiramiz."
      : "Kargo harakati, VIP chegirmalar va jonli auksion xabarlarini telefoningizda oling.";

  return (
    <>
      {/* Offline Connectivity Banner */}
      <AnimatePresence>
        {!isOnline && (
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-[70] px-4 py-2 rounded-xl bg-amber-500 text-white text-xs font-semibold shadow-lg flex items-center gap-2 whitespace-nowrap"
          >
            <WifiOff size={14} />
            <span>Oflayn rejim — internet aloqasi tiklanishi kutilmoqda</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Auto Push Notification Subscription Offer */}
      <AnimatePresence>
        {showPushPrompt && currentUser && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.97 }}
            transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
            className="fixed bottom-20 md:bottom-6 right-4 left-4 sm:left-auto sm:w-[390px] z-[65] rounded-2xl bg-white/92 backdrop-blur-xl border border-blue-200/80 shadow-[0_20px_54px_-16px_rgba(37,99,235,0.28)] p-4 text-slate-900"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 text-[#2563EB] flex items-center justify-center shrink-0">
                <Bell size={18} />
              </div>
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-start justify-between gap-2">
                  <h4 className="font-display text-sm font-bold text-slate-900 leading-snug">
                    {pushHeadline}
                  </h4>
                  <button
                    type="button"
                    onClick={handleDismissPush}
                    aria-label="Yopish"
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors shrink-0"
                  >
                    <X size={15} />
                  </button>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">{pushDescription}</p>
                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    disabled={subscribingPush}
                    onClick={handleEnablePush}
                    className="px-3.5 py-2 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold inline-flex items-center gap-1.5 shadow-sm shadow-blue-600/25 transition-colors whitespace-nowrap disabled:opacity-60"
                  >
                    {subscribingPush ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : (
                      <Bell size={13} />
                    )}
                    <span>Yoqish</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDismissPush}
                    className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-600 text-xs font-semibold transition-colors whitespace-nowrap"
                  >
                    Keyinroq
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Smart Device-Detecting PWA Install Prompt (Hidden automatically if already standalone) */}
      <AnimatePresence>
        {!isStandalone && showInstallCard && !showPushPrompt && (
          <>
            {/* Android / Chrome / Edge Bottom Frosted Glass Sheet */}
            {platform === 'android' && deferredPrompt && (
              <motion.div
                initial={{ opacity: 0, y: 28 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 28 }}
                transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
                className="fixed bottom-20 md:bottom-5 left-4 right-4 sm:left-1/2 sm:-translate-x-1/2 sm:max-w-md z-[60] rounded-2xl bg-white/92 backdrop-blur-xl border border-white shadow-[0_20px_56px_-14px_rgba(37,99,235,0.26)] p-4 text-slate-900"
              >
                <div className="flex items-start gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#2563EB] to-[#1D4ED8] text-white flex items-center justify-center shadow-md shadow-blue-600/25 shrink-0">
                    <Smartphone size={20} />
                  </div>
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-display text-sm font-bold text-slate-900 leading-snug">
                        YuYu Shop ilovasini telefoningizga o&apos;rnating — tezroq va qulayroq
                      </p>
                      <button
                        type="button"
                        onClick={handleDismissInstall}
                        aria-label="Keyinroq"
                        className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 shrink-0"
                      >
                        <X size={15} />
                      </button>
                    </div>
                    <div className="flex items-center gap-2 pt-2">
                      <button
                        type="button"
                        disabled={installing}
                        onClick={handleInstallClick}
                        className="px-4 py-2 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold inline-flex items-center gap-1.5 shadow-sm shadow-blue-600/25 transition-colors whitespace-nowrap disabled:opacity-60"
                      >
                        {installing ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <Download size={14} />
                        )}
                        <span>Ilovani o&apos;rnatish</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleDismissInstall}
                        className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-600 text-xs font-semibold transition-colors whitespace-nowrap"
                      >
                        Keyinroq
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* iPhone / iPad (iOS Safari) Guided Glassmorphic Instruction Card */}
            {platform === 'ios' && (
              <motion.div
                initial={{ opacity: 0, y: 28 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 28 }}
                transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
                className="fixed bottom-20 md:bottom-5 left-4 right-4 sm:left-1/2 sm:-translate-x-1/2 sm:max-w-md z-[60] rounded-2xl bg-white/94 backdrop-blur-xl border border-blue-200/75 shadow-[0_20px_56px_-14px_rgba(37,99,235,0.24)] p-4 text-slate-900"
              >
                <div className="flex items-start justify-between gap-2 pb-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 text-[#2563EB] flex items-center justify-center shrink-0">
                      <Smartphone size={18} />
                    </div>
                    <div>
                      <h4 className="font-display text-sm font-bold text-slate-900">
                        iPhone&apos;ga ilova qilib o&apos;rnatish
                      </h4>
                      <p className="text-[11px] text-[#2563EB] font-medium">
                        iOS 16.4+ da Push bildirishnomalar uchun zarur
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleDismissInstall}
                    aria-label="Keyinroq"
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 shrink-0"
                  >
                    <X size={15} />
                  </button>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">
                  iPhone&apos;ga ilova qilib o&apos;rnatish uchun pastdagi{' '}
                  <span className="inline-flex items-center gap-1 font-semibold text-slate-900">
                    <Share size={13} className="text-[#2563EB]" />
                    Ulashish (Share)
                  </span>{' '}
                  belgisini bosing va{' '}
                  <span className="inline-flex items-center gap-1 font-semibold text-slate-900">
                    <PlusSquare size={13} className="text-[#2563EB]" />
                    &apos;Bosh ekranga qo&apos;shish&apos; (Add to Home Screen)
                  </span>{' '}
                  tugmasini tanlang.
                </p>

                <div className="flex items-center justify-end pt-3">
                  <button
                    type="button"
                    onClick={handleDismissInstall}
                    className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-700 text-xs font-semibold transition-colors whitespace-nowrap"
                  >
                    Keyinroq
                  </button>
                </div>
              </motion.div>
            )}

            {/* Desktop Compact Non-Intrusive Install Button */}
            {platform === 'desktop' && deferredPrompt && (
              <motion.div
                initial={{ opacity: 0, y: 16, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 16, scale: 0.96 }}
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                className="fixed bottom-5 left-5 z-[60] rounded-2xl bg-white/90 backdrop-blur-xl border border-slate-200/85 shadow-[0_14px_36px_-12px_rgba(15,23,42,0.18)] p-2 flex items-center gap-2 text-slate-900"
              >
                <button
                  type="button"
                  disabled={installing}
                  onClick={handleInstallClick}
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold transition-colors whitespace-nowrap disabled:opacity-60"
                >
                  {installing ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Download size={14} />
                  )}
                  <span>Ilovani o&apos;rnatish</span>
                </button>
                <button
                  type="button"
                  onClick={handleDismissInstall}
                  title="Keyinroq"
                  aria-label="Keyinroq"
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  <X size={14} />
                </button>
              </motion.div>
            )}
          </>
        )}
      </AnimatePresence>
    </>
  );
};
