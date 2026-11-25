'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  motion,
  AnimatePresence,
  useScroll,
  useTransform,
  useReducedMotion
} from 'framer-motion';
import {
  X,
  ShieldCheck,
  Loader2,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  CheckCircle2,
  Volume2,
  VolumeX,
  User as UserIcon,
  MapPin,
  Eye,
  EyeOff,
  KeyRound,
  Monitor,
  RotateCw,
  Camera,
  Globe,
  Gavel,
  Crown,
  Truck,
  Search
} from 'lucide-react';
import { soundEngine } from '../utils/soundEngine';
import { User, AdminDevice } from '../types';
import { LandingThreeStage } from './LandingThreeStage';
import {
  UZ_REGIONS,
  extractLocalUzDigits,
  formatLocalUzDigits,
  formatFullUzPhone,
  toNormalizedUzPhone,
  getUzOperatorName,
  getSuggestedDeviceLabel,
  readStoredAdminDeviceToken,
  writeStoredAdminDeviceToken,
  readRecentClient,
  writeRecentClient,
  RecentClientProfile
} from '../utils/authHelpers';

export interface AuthViewProps {
  t: any;
  onAuthSuccess: (user: User) => Promise<void> | void;
  playSound: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
  notify: (msg: string, type?: 'success' | 'error' | 'info') => void;
  safeFetchJSON: (url: string, options?: RequestInit) => Promise<any>;
}

interface WorkflowStep {
  num: string;
  title: string;
  subtitle: string;
  description: string;
  meta: string;
  icon: React.ReactNode;
  align: 'left' | 'right';
}

const WORKFLOW_STEPS: WorkflowStep[] = [
  {
    num: '01',
    title: 'Mahsulot rasmini yuklang',
    subtitle: '«Rasm tashla — topib beramiz» aqlli qidiruvi',
    description:
      "Instagram, Telegram yoki istalgan joyda yoqtirgan kiyim, gadjet yoki aksessuar suratini yuklang. Havola qidirish shart emas — tizimimiz mahsulotni bir necha daqiqada Xitoy bazasidan topib beradi.",
    meta: "Bepul qidiruv · 1688 va Taobao skaneri",
    icon: <Camera size={20} />,
    align: 'left'
  },
  {
    num: '02',
    title: 'Xitoy fabrikalaridan eng arzon narxni topamiz',
    subtitle: '1688 · Taobao · Pinduoduo to‘g‘ridan-to‘g‘ri narxlari',
    description:
      "Vositachilarsiz eng ishonchli ishlab chiqaruvchi va ulgurji sotuvchini tanlaymiz. Mahsulot narxi, vazni va kargo hisob-kitobi oldindan ochiq va shaffof so‘mda ko‘rsatiladi.",
    meta: "Asl fabrika narxi · Shaffof UZS hisob-kitob",
    icon: <Search size={20} />,
    align: 'right'
  },
  {
    num: '03',
    title: 'Haftalik auksion va VIP bonuslar',
    subtitle: 'Jonli narx kurashi va 10% gacha keshbek',
    description:
      "Har hafta saralangan brend tovarlar hamda gadjetlar uchun jonli auksionlarda qatnashing. Muntazam xaridlaringiz bilan VIP darajangiz oshadi va har bir buyurtmadan real keshbek jamg‘arasiz.",
    meta: "Haftalik jonli auksion · Kumush / Oltin / Olmos VIP",
    icon: <Gavel size={20} />,
    align: 'left'
  },
  {
    num: '04',
    title: 'Uyingizgacha yetkazamiz',
    subtitle: '100% yuk sug‘urtasi va tezkor O‘zbekiston logistikasi',
    description:
      "Har bir buyurtma Xitoy omborida sifat tekshiruvidan o‘tadi, shaxsiy trek-kod biriktiriladi va Toshkent hamda barcha viloyatlarga 7–15 kun ichida eshigingizgacha xavfsiz yetkaziladi.",
    meta: "7–15 kun yetkazish · Barcha 14 hudud bo‘ylab",
    icon: <Truck size={20} />,
    align: 'right'
  }
];

const ScrollStepCard: React.FC<{
  step: WorkflowStep;
  reducedMotion: boolean;
}> = ({ step, reducedMotion }) => {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const { scrollYProgress } = useScroll({
    target: cardRef,
    offset: ['start end', 'end start']
  });

  const parallaxY = useTransform(scrollYProgress, [0, 0.5, 1], [46, 0, -42]);
  const scale = useTransform(scrollYProgress, [0, 0.45, 1], [0.965, 1, 0.975]);

  return (
    <div
      ref={cardRef}
      className={`flex w-full ${
        step.align === 'right' ? 'justify-end' : 'justify-start'
      }`}
    >
      <motion.article
        style={reducedMotion ? undefined : { y: parallaxY, scale }}
        className="w-full max-w-[540px] rounded-[1.85rem] border border-white/90 bg-white/70 backdrop-blur-xl p-6 sm:p-8 shadow-[0_24px_60px_-24px_rgba(15,41,74,0.13),inset_0_1px_1px_rgba(255,255,255,0.95)] transition-shadow hover:shadow-[0_30px_72px_-22px_rgba(15,41,74,0.18)]"
      >
        <div className="flex items-start justify-between gap-4 mb-5">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#0F294A] to-[#245694] text-white flex items-center justify-center shadow-[0_10px_24px_-8px_rgba(15,41,74,0.45)] shrink-0">
              {step.icon}
            </div>
            <div>
              <p className="text-xs font-medium text-sky-700">
                {step.subtitle}
              </p>
              <h3 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-slate-900 mt-0.5">
                {step.num}. {step.title}
              </h3>
            </div>
          </div>
        </div>

        <p className="text-sm sm:text-[15px] leading-relaxed text-slate-600">
          {step.description}
        </p>

        <div className="mt-5 pt-4 border-t border-slate-200/70 flex items-center justify-between gap-3 text-xs font-medium text-slate-500">
          <span>{step.meta}</span>
          <span className="font-mono tabular-nums text-[#0F294A] font-semibold">
            {step.num} / 04
          </span>
        </div>
      </motion.article>
    </div>
  );
};

/**
 * Pure abstract 3D-inspired geometric pearl & prism emblem (zero letters, per design brief).
 */
const AbstractPearlEmblem: React.FC = () => (
  <span
    aria-hidden="true"
    className="relative w-9 h-9 rounded-2xl bg-gradient-to-br from-white via-sky-50 to-sky-200/80 border border-white/95 shadow-[0_10px_24px_-8px_rgba(15,41,74,0.22),inset_0_1px_2px_rgba(255,255,255,1)] flex items-center justify-center shrink-0 overflow-hidden"
  >
    <span className="w-5 h-5 rounded-full border-[1.75px] border-[#0F294A]/75 rotate-12 flex items-center justify-center bg-gradient-to-tr from-sky-200/70 via-white to-blue-100/80">
      <span className="w-2 h-2 rotate-45 rounded-[2px] bg-[#0F294A]" />
    </span>
  </span>
);

export const AuthView: React.FC<AuthViewProps> = ({
  t,
  onAuthSuccess,
  playSound,
  soundEnabled,
  onToggleSound,
  notify,
  safeFetchJSON
}) => {
  const prefersReducedMotion = Boolean(useReducedMotion());

  // =========================================================================
  // 100% UNCHANGED EXISTING AUTHENTICATION STATE & HANDLERS
  // =========================================================================
  const [authTab, setAuthTab] = useState<'login' | 'register' | 'admin'>('login');
  const [username, setUsername] = useState('');
  const [localDigits, setLocalDigits] = useState('');
  const [city, setCity] = useState('Toshkent shahri');

  // Admin form state (ONLY accessible after server verifies this device token)
  const [adminUsername, setAdminUsername] = useState('YUYU Admin');
  const [adminPhone, setAdminPhone] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [showAdminPassword, setShowAdminPassword] = useState(false);

  // Device authorization state
  const [authorizedDevice, setAuthorizedDevice] = useState<AdminDevice | null>(null);
  const [isUnlockModalOpen, setIsUnlockModalOpen] = useState(false);
  const [unlockLabel, setUnlockLabel] = useState('Mening kompyuterim');
  const [unlockMasterPassword, setUnlockMasterPassword] = useState('');
  const [showUnlockPassword, setShowUnlockPassword] = useState(false);
  const [unlockLoading, setUnlockLoading] = useState(false);
  const [unlockError, setUnlockError] = useState('');

  // Form feedback & UX helpers
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [errorAction, setErrorAction] = useState<'switch_register' | 'switch_login' | null>(null);
  const [recentClient, setRecentClient] = useState<RecentClientProfile | null>(null);
  const [hasPlayedEntrance, setHasPlayedEntrance] = useState(false);

  const loginSectionRef = useRef<HTMLDivElement | null>(null);
  const loginPhoneInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setUnlockLabel(getSuggestedDeviceLabel());
    setRecentClient(readRecentClient());
  }, []);

  // Secret 5-tap emblem counter
  const logoClickTimesRef = useRef<number[]>([]);

  // Soft entrance chime on first interaction
  useEffect(() => {
    if (hasPlayedEntrance || !soundEnabled) return;
    const handleFirstInteraction = (e: PointerEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest('[data-sound-toggle]')) return;
      setHasPlayedEntrance(true);
      soundEngine.playWelcome();
    };
    window.addEventListener('pointerdown', handleFirstInteraction, { once: true });
    return () => window.removeEventListener('pointerdown', handleFirstInteraction);
  }, [hasPlayedEntrance, soundEnabled]);

  // Verify existing device token OR claim ?admin_invite=... OR open ?admin=1 modal
  useEffect(() => {
    let cancelled = false;
    const initDeviceAccess = async () => {
      const params = new URLSearchParams(window.location.search);
      const inviteCode = params.get('admin_invite');
      const wantsAdminUnlock = params.get('admin') === '1';

      if (inviteCode) {
        try {
          const res = await safeFetchJSON('/api/admin-access/claim-invite', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              inviteCode,
              label: getSuggestedDeviceLabel()
            })
          });
          if (!cancelled && res?.deviceToken && res?.device) {
            writeStoredAdminDeviceToken(res.deviceToken);
            setAuthorizedDevice(res.device);
            setAuthTab('admin');
            notify("Qurilmangizga Admin Panel ruxsati berildi!", 'success');
          }
        } catch (err: any) {
          if (!cancelled) {
            notify(err?.message || "Taklif havolasi yaroqsiz yoki avval ishlatilgan", 'error');
          }
        } finally {
          window.history.replaceState({}, '', window.location.pathname);
        }
        return;
      }

      const storedToken = readStoredAdminDeviceToken();
      if (storedToken) {
        try {
          const res = await safeFetchJSON('/api/admin-access/verify-device', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ deviceToken: storedToken })
          });
          if (!cancelled) {
            if (res?.authorized && res?.device) {
              setAuthorizedDevice(res.device);
              if (wantsAdminUnlock) {
                setAuthTab('admin');
              }
            } else {
              writeStoredAdminDeviceToken('');
              setAuthorizedDevice(null);
            }
          }
        } catch {
          // Keep hidden on network failure
        }
      }

      if (!cancelled && wantsAdminUnlock) {
        window.history.replaceState({}, '', window.location.pathname);
        if (!storedToken) {
          setIsUnlockModalOpen(true);
        }
      }
    };

    initDeviceAccess();
    return () => {
      cancelled = true;
    };
  }, [notify, safeFetchJSON]);

  // Secret keyboard shortcut: Ctrl + Shift + A (or Cmd + Shift + A on Mac)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        if (authorizedDevice) {
          setAuthTab('admin');
        } else {
          setUnlockError('');
          setUnlockMasterPassword('');
          setIsUnlockModalOpen(true);
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [authorizedDevice]);

  // Secret 5 rapid clicks on brand mark
  const handleBrandLogoClick = () => {
    const now = Date.now();
    const recent = [...logoClickTimesRef.current.filter((ts) => now - ts < 2500), now];
    logoClickTimesRef.current = recent;
    if (recent.length >= 5) {
      logoClickTimesRef.current = [];
      if (authorizedDevice) {
        setAuthTab('admin');
      } else {
        setUnlockError('');
        setUnlockMasterPassword('');
        setIsUnlockModalOpen(true);
      }
    }
  };

  const formattedPhone = formatLocalUzDigits(localDigits);
  const operatorName = getUzOperatorName(localDigits);
  const isPhoneComplete = localDigits.length === 9;
  const isRegisterFace = authTab === 'register';

  const handlePhoneInputChange = (rawVal: string) => {
    setLocalDigits(extractLocalUzDigits(rawVal));
    if (errorMsg) {
      setErrorMsg('');
      setErrorAction(null);
    }
  };

  const switchTab = (next: 'login' | 'register' | 'admin') => {
    if (next === authTab) return;
    playSound();
    setAuthTab(next);
    setErrorMsg('');
    setErrorAction(null);
  };

  const scrollToLogin = (targetTab?: 'login' | 'register') => {
    playSound();
    if (targetTab) {
      setAuthTab(targetTab);
      setErrorMsg('');
      setErrorAction(null);
    }
    window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
    window.setTimeout(() => {
      loginPhoneInputRef.current?.focus({ preventScroll: true });
    }, 450);
  };

  const scrollToSection = (id: string) => {
    playSound();
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'start' });
    }
  };

  const handleQuickClientLogin = async (profile: RecentClientProfile) => {
    playSound();
    setErrorMsg('');
    setErrorAction(null);
    setLoading(true);
    try {
      const res = await safeFetchJSON('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: profile.phoneNumber,
          deviceToken: readStoredAdminDeviceToken() || undefined
        })
      });
      if (res?.user) {
        await onAuthSuccess(res.user);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "Tezkor kirishda xatolik yuz berdi");
      setLocalDigits(extractLocalUzDigits(profile.phoneNumber));
    } finally {
      setLoading(false);
    }
  };

  const handleClientLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (localDigits.length < 9) {
      setErrorMsg("Iltimos, 9 xonali telefon raqamingizni to'liq kiriting.");
      setErrorAction(null);
      return;
    }
    setErrorMsg('');
    setErrorAction(null);
    playSound();
    setLoading(true);
    try {
      const normalized = toNormalizedUzPhone(localDigits);
      const res = await safeFetchJSON('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: normalized,
          deviceToken: readStoredAdminDeviceToken() || undefined
        })
      });
      if (res?.user) {
        if (!res.user.isAdmin) {
          writeRecentClient({
            username: res.user.username,
            phoneNumber: res.user.phoneNumber || normalized
          });
        }
        await onAuthSuccess(res.user);
      }
    } catch (err: any) {
      const msg = err?.message || "Kirishda xatolik yuz berdi";
      setErrorMsg(msg);
      if (msg.toLowerCase().includes("ro'yxatdan o'tmagan")) {
        setErrorAction('switch_register');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClientRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = username.trim();
    if (cleanName.length < 2) {
      setErrorMsg("Iltimos, ismingizni kiriting (kamida 2 ta harf).");
      setErrorAction(null);
      return;
    }
    if (localDigits.length < 9) {
      setErrorMsg("Iltimos, 9 xonali telefon raqamingizni to'liq kiriting.");
      setErrorAction(null);
      return;
    }
    setErrorMsg('');
    setErrorAction(null);
    playSound();
    setLoading(true);
    try {
      const normalized = toNormalizedUzPhone(localDigits);
      const res = await safeFetchJSON('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: cleanName,
          phoneNumber: normalized,
          city
        })
      });
      if (res?.user) {
        writeRecentClient({
          username: res.user.username,
          phoneNumber: res.user.phoneNumber || normalized
        });
        await onAuthSuccess(res.user);
      }
    } catch (err: any) {
      const msg = err?.message || "Ro'yxatdan o'tishda xatolik yuz berdi";
      setErrorMsg(msg);
      if (msg.toLowerCase().includes("allaqachon")) {
        setErrorAction('switch_login');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const deviceToken = readStoredAdminDeviceToken();
    if (!deviceToken || !authorizedDevice) {
      setErrorMsg("Ushbu qurilmada admin ruxsati mavjud emas.");
      setAuthTab('login');
      return;
    }
    if (!adminPassword.trim()) {
      setErrorMsg("Admin parolini kiriting.");
      return;
    }
    setErrorMsg('');
    playSound();
    setLoading(true);
    try {
      const res = await safeFetchJSON('/api/admin-access/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceToken,
          username: adminUsername.trim() || 'YUYU Admin',
          phoneNumber: adminPhone.trim() || '8215056224',
          password: adminPassword.trim()
        })
      });
      if (res?.user) {
        await onAuthSuccess(res.user);
      }
    } catch (err: any) {
      const msg = err?.message || "Admin sifatida kirishda xatolik";
      setErrorMsg(msg);
      if (
        msg.toLowerCase().includes("bekor qilingan") ||
        msg.toLowerCase().includes("ruxsati yo'q")
      ) {
        writeStoredAdminDeviceToken('');
        setAuthorizedDevice(null);
        setAuthTab('login');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAuthorizeThisDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!unlockMasterPassword.trim()) {
      setUnlockError("Maxfiy parolni kiriting.");
      return;
    }
    setUnlockError('');
    setUnlockLoading(true);
    try {
      const res = await safeFetchJSON('/api/admin-access/authorize-device', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          masterPassword: unlockMasterPassword.trim(),
          label: unlockLabel.trim() || getSuggestedDeviceLabel()
        })
      });
      if (res?.deviceToken && res?.device) {
        writeStoredAdminDeviceToken(res.deviceToken);
        setAuthorizedDevice(res.device);
        setAdminPassword(unlockMasterPassword.trim());
        setUnlockMasterPassword('');
        setIsUnlockModalOpen(false);
        setAuthTab('admin');
        notify("Ushbu kompyuter ishonchli admin qurilmasi sifatida bog'landi!", 'success');
      }
    } catch (err: any) {
      setUnlockError(err?.message || "Maxfiy parol noto'g'ri");
    } finally {
      setUnlockLoading(false);
    }
  };

  const flipTransition = prefersReducedMotion
    ? { duration: 0.01 }
    : {
        type: 'spring' as const,
        stiffness: 155,
        damping: 21,
        mass: 0.92
      };

  const glassInputContainerClass = (complete?: boolean) =>
    `flex items-center rounded-2xl border backdrop-blur-md transition-all overflow-hidden ${
      complete
        ? 'bg-white/85 border-emerald-500/75 focus-within:ring-2 focus-within:ring-emerald-500/20'
        : 'bg-white/80 border-slate-200/90 focus-within:border-[#0F294A] focus-within:ring-2 focus-within:ring-[#0F294A]/12'
    }`;

  return (
    <div className="relative min-h-screen w-full overflow-x-clip bg-[#F4F8FF] text-slate-900 selection:bg-sky-200 selection:text-[#0F294A]">
      {/* =====================================================================
          INTERACTIVE THREE.JS 3D STAGE (Mouse Parallax + Scroll Choreography)
         ===================================================================== */}
      <LandingThreeStage reducedMotion={prefersReducedMotion} />

      {/* =====================================================================
          TOP NAVIGATION BAR (Clean 3-Zone Apple/Stripe Frosted Header)
         ===================================================================== */}
      <header className="sticky top-0 z-30 border-b border-white/80 bg-white/65 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-12 h-[72px] flex items-center justify-between gap-8">
          {/* Zone 1: Abstract 3D Pearl Emblem (No lettered logo) + Wordmark */}
          <div
            onClick={handleBrandLogoClick}
            className="flex items-center gap-3 select-none cursor-default whitespace-nowrap shrink-0"
          >
            <AbstractPearlEmblem />
            <span className="font-display text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0">
              YuYu Shop
            </span>
          </div>

          {/* Zone 2: Clean Single-Line Navigation Links */}
          <nav
            className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600"
            aria-label="Sahifa bo'limlari"
          >
            <button
              type="button"
              onClick={() => scrollToSection('capabilities')}
              className="hover:text-[#0F294A] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Imkoniyatlar
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('how-it-works')}
              className="hover:text-[#0F294A] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Qanday ishlaydi
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('back-to-login')}
              className="hover:text-[#0F294A] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Boshlash
            </button>
          </nav>

          {/* Zone 3: Sound Control + Primary Action */}
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              data-sound-toggle="true"
              onClick={onToggleSound}
              aria-label={soundEnabled ? "Ovozni o'chirish" : "Ovozni yoqish"}
              className="inline-flex items-center justify-center w-9 h-9 rounded-xl border border-white/90 bg-white/75 backdrop-blur-xl text-slate-600 hover:text-[#0F294A] hover:bg-white transition-colors shadow-sm cursor-pointer shrink-0"
            >
              {soundEnabled ? <Volume2 size={15} /> : <VolumeX size={15} className="text-slate-400" />}
            </button>
            <button
              type="button"
              onClick={() => scrollToLogin('login')}
              className="px-4 py-2 rounded-xl bg-[#0F294A] hover:bg-[#173B6A] text-white text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer shadow-sm"
            >
              Kirish
            </button>
          </div>
        </div>
      </header>

      {/* =====================================================================
          SECTION 1: SPLIT HERO (Left: YuYu Shop Overview · Right: Login Card)
         ===================================================================== */}
      <main className="relative z-10">
        <section
          id="capabilities"
          className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-12 pt-8 pb-16 sm:pt-12 sm:pb-20 lg:pt-14 lg:pb-24 min-h-[calc(100vh-72px)] grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center"
        >
          {/* LEFT COLUMN: YuYu Shop Value Proposition & Frosted Capability Grid */}
          <div className="lg:col-span-7 space-y-8 order-2 lg:order-1">
            <div className="space-y-4 max-w-2xl">
              <p className="text-xs sm:text-sm font-medium text-sky-700 tracking-tight">
                1688 · Taobao · Pinduoduo · O&apos;zbekiston bo&apos;ylab tezkor kargo
              </p>
              <h1 className="font-display text-[2.25rem] sm:text-5xl xl:text-[3.4rem] font-bold leading-[1.08] tracking-tight text-slate-900 [text-wrap:balance]">
                Xitoy fabrikalaridan to&apos;g&apos;ridan-to&apos;g&apos;ri va hamyonbop xaridlar
              </h1>
              <p className="text-base sm:text-[17px] text-slate-600 leading-relaxed max-w-xl">
                yuyu.uz orqali Xitoyning eng yirik platformalaridan vositachisiz asl zavod narxlarida buyurtma bering, rasm orqali istalgan mahsulotni toping va O&apos;zbekiston bo&apos;ylab eshigingizgacha qabul qiling.
              </p>
            </div>

            {/* 4 Key Capabilities in Clean Light Frosted Glass Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
              <div className="rounded-2xl border border-white/90 bg-white/68 backdrop-blur-xl p-5 shadow-[0_18px_44px_-24px_rgba(15,41,74,0.14)]">
                <div className="w-9 h-9 rounded-xl bg-sky-50 border border-sky-100 text-[#0F294A] flex items-center justify-center mb-3.5">
                  <Globe size={18} />
                </div>
                <h2 className="font-display text-sm sm:text-[15px] font-bold text-slate-900">
                  1688, Taobao va Pinduoduo
                </h2>
                <p className="text-xs sm:text-[13px] text-slate-600 leading-relaxed mt-1.5">
                  Xitoyning yetakchi ulgurji va chakana bozorlaridan to&apos;g&apos;ridan-to&apos;g&apos;ri hamyonbop buyurtmalar.
                </p>
              </div>

              <div className="rounded-2xl border border-white/90 bg-white/68 backdrop-blur-xl p-5 shadow-[0_18px_44px_-24px_rgba(15,41,74,0.14)]">
                <div className="w-9 h-9 rounded-xl bg-sky-50 border border-sky-100 text-[#0F294A] flex items-center justify-center mb-3.5">
                  <Camera size={18} />
                </div>
                <h2 className="font-display text-sm sm:text-[15px] font-bold text-slate-900">
                  «Rasm tashla — topib beramiz»
                </h2>
                <p className="text-xs sm:text-[13px] text-slate-600 leading-relaxed mt-1.5">
                  Mahsulot suratini yuklang, aqlli qidiruv orqali eng arzon ishlab chiqaruvchi narxini topib beramiz.
                </p>
              </div>

              <div className="rounded-2xl border border-white/90 bg-white/68 backdrop-blur-xl p-5 shadow-[0_18px_44px_-24px_rgba(15,41,74,0.14)]">
                <div className="w-9 h-9 rounded-xl bg-sky-50 border border-sky-100 text-[#0F294A] flex items-center justify-center mb-3.5">
                  <Gavel size={18} />
                </div>
                <h2 className="font-display text-sm sm:text-[15px] font-bold text-slate-900">
                  Haftalik jonli auksionlar
                </h2>
                <p className="text-xs sm:text-[13px] text-slate-600 leading-relaxed mt-1.5">
                  Har hafta saralangan gadjet va brend mahsulotlarda jonli stavkalar bilan yutib olish imkoniyati.
                </p>
              </div>

              <div className="rounded-2xl border border-white/90 bg-white/68 backdrop-blur-xl p-5 shadow-[0_18px_44px_-24px_rgba(15,41,74,0.14)]">
                <div className="w-9 h-9 rounded-xl bg-sky-50 border border-sky-100 text-[#0F294A] flex items-center justify-center mb-3.5">
                  <Crown size={18} />
                </div>
                <h2 className="font-display text-sm sm:text-[15px] font-bold text-slate-900">
                  VIP darajalar va tezkor yetkazish
                </h2>
                <p className="text-xs sm:text-[13px] text-slate-600 leading-relaxed mt-1.5">
                  10% gacha VIP keshbek, 100% yuk sug&apos;urtasi va 7–15 kunda O&apos;zbekiston bo&apos;ylab yetkazib berish.
                </p>
              </div>
            </div>

            {/* Quiet Trust Line + Scroll Exploration Cue */}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-slate-200/80 max-w-2xl">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs font-medium text-slate-500">
                <span>7–15 kun yetkazib berish</span>
                <span aria-hidden="true">·</span>
                <span>100% yuk sug&apos;urtasi</span>
                <span aria-hidden="true">·</span>
                <span>14 viloyat qamrovi</span>
              </div>
              <button
                type="button"
                onClick={() => scrollToSection('how-it-works')}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0F294A] hover:text-sky-700 transition-colors whitespace-nowrap cursor-pointer"
              >
                <span>Ishlash bosqichlari</span>
                <ArrowDown size={14} />
              </button>
            </div>
          </div>

          {/* RIGHT COLUMN: Existing Login / Register / Admin Frosted Glass Card (100% Intact Logic) */}
          <div
            ref={loginSectionRef}
            id="auth-login-card"
            className="lg:col-span-5 w-full max-w-[460px] mx-auto lg:ml-auto lg:mr-0 space-y-4 order-1 lg:order-2"
          >
            {/* Segmented Mode Control (Kirish / Ro'yxatdan o'tish + hidden Admin when device authorized) */}
            <div
              className={`relative grid gap-1 p-1.5 rounded-2xl border border-white/90 bg-white/70 backdrop-blur-xl shadow-[0_14px_34px_-18px_rgba(15,41,74,0.16)] ${
                authorizedDevice ? 'grid-cols-3' : 'grid-cols-2'
              }`}
            >
              <button
                type="button"
                onClick={() => switchTab('login')}
                className={`relative z-10 py-2.5 px-3 rounded-xl text-sm font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                  authTab === 'login'
                    ? 'text-[#0F294A]'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {authTab === 'login' && (
                  <motion.span
                    layoutId="yuyu-auth-active-tab"
                    transition={{ type: 'spring', stiffness: 360, damping: 30 }}
                    className="absolute inset-0 -z-10 rounded-xl bg-white border border-slate-200/70 shadow-sm"
                  />
                )}
                Kirish
              </button>

              <button
                type="button"
                onClick={() => switchTab('register')}
                className={`relative z-10 py-2.5 px-3 rounded-xl text-sm font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                  authTab === 'register'
                    ? 'text-[#0F294A]'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {authTab === 'register' && (
                  <motion.span
                    layoutId="yuyu-auth-active-tab"
                    transition={{ type: 'spring', stiffness: 360, damping: 30 }}
                    className="absolute inset-0 -z-10 rounded-xl bg-white border border-slate-200/70 shadow-sm"
                  />
                )}
                Ro&apos;yxatdan o&apos;tish
              </button>

              {authorizedDevice && (
                <button
                  type="button"
                  onClick={() => switchTab('admin')}
                  className={`relative z-10 py-2.5 px-2.5 rounded-xl text-sm font-semibold transition-colors whitespace-nowrap inline-flex items-center justify-center gap-1.5 cursor-pointer ${
                    authTab === 'admin'
                      ? 'text-white'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  {authTab === 'admin' && (
                    <motion.span
                      layoutId="yuyu-auth-active-tab"
                      transition={{ type: 'spring', stiffness: 360, damping: 30 }}
                      className="absolute inset-0 -z-10 rounded-xl bg-[#0F294A] shadow-sm"
                    />
                  )}
                  <ShieldCheck size={14} />
                  <span>Admin</span>
                </button>
              )}
            </div>

            {/* 3D FLIP STAGE OR AUTHORIZED ADMIN PANEL */}
            <AnimatePresence mode="wait" initial={false}>
              {authTab === 'admin' && authorizedDevice ? (
                <motion.div
                  key="admin-crystal-card"
                  initial={{ opacity: 0, y: 12, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -12, scale: 0.98 }}
                  transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
                  className="relative rounded-[1.85rem] border border-white/95 bg-white/78 backdrop-blur-xl p-6 sm:p-8 shadow-[0_30px_76px_-26px_rgba(15,41,74,0.18),inset_0_1px_1px_rgba(255,255,255,0.95)] space-y-5"
                >
                  <div className="space-y-1.5">
                    <h2 className="font-display text-2xl font-bold tracking-tight text-slate-900">
                      Admin boshqaruvi
                    </h2>
                    <p className="text-xs text-slate-500">
                      Tasdiqlangan qurilma orqali xavfsiz kirish
                    </p>
                  </div>

                  <form onSubmit={handleAdminLogin} className="space-y-4">
                    <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-emerald-50/85 border border-emerald-200/80 text-xs text-emerald-700">
                      <Monitor size={15} className="shrink-0" />
                      <span className="truncate font-medium">
                        Tasdiqlangan qurilma: {authorizedDevice.label}
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-slate-700">
                        Administrator nomi
                      </label>
                      <input
                        type="text"
                        className="w-full rounded-2xl border border-slate-200/90 bg-white/80 backdrop-blur-md px-4 py-3 text-sm text-slate-900 outline-none focus:border-[#0F294A] transition-all"
                        placeholder="YUYU Admin"
                        value={adminUsername}
                        onChange={(e) => setAdminUsername(e.target.value)}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-slate-700">
                        Telefon raqami <span className="font-normal text-slate-400">(ixtiyoriy)</span>
                      </label>
                      <input
                        type="tel"
                        className="w-full rounded-2xl border border-slate-200/90 bg-white/80 backdrop-blur-md px-4 py-3 text-sm font-mono tabular-nums text-slate-900 outline-none focus:border-[#0F294A] transition-all"
                        placeholder="+998 90 123 45 67"
                        value={adminPhone}
                        onChange={(e) => setAdminPhone(e.target.value)}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-slate-700">
                        Maxfiy admin paroli
                      </label>
                      <div className="relative">
                        <input
                          type={showAdminPassword ? 'text' : 'password'}
                          autoFocus
                          className="w-full rounded-2xl border border-slate-200/90 bg-white/80 backdrop-blur-md px-4 py-3 pr-11 text-sm font-mono text-slate-900 outline-none focus:border-[#0F294A] transition-all"
                          placeholder="Parolni kiriting"
                          value={adminPassword}
                          onChange={(e) => {
                            setAdminPassword(e.target.value);
                            if (errorMsg) setErrorMsg('');
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => setShowAdminPassword((v) => !v)}
                          aria-label="Parolni ko'rsatish"
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                        >
                          {showAdminPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>

                    {errorMsg && (
                      <p className="text-xs font-medium text-red-600 bg-red-50/90 border border-red-200 rounded-xl px-3.5 py-2.5">
                        {errorMsg}
                      </p>
                    )}

                    <button
                      type="submit"
                      data-sound="welcome"
                      disabled={loading}
                      className="w-full py-3.5 px-6 bg-[#0F294A] hover:bg-[#173B6A] text-white font-semibold rounded-2xl flex items-center justify-center gap-2 transition-colors disabled:opacity-60 text-sm cursor-pointer shadow-lg shadow-[#0F294A]/20"
                    >
                      {loading ? <Loader2 className="animate-spin" size={18} /> : <ShieldCheck size={18} />}
                      <span>Admin sifatida kirish</span>
                    </button>
                  </form>
                </motion.div>
              ) : (
                <motion.div
                  key="client-3d-flip-stage"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.22 }}
                  className="auth-3d-perspective w-full"
                >
                  <motion.div
                    animate={{ rotateY: isRegisterFace ? 180 : 0 }}
                    transition={flipTransition}
                    style={{ transformStyle: 'preserve-3d' }}
                    className="relative w-full grid grid-cols-1"
                  >
                    {/* Mid-plane Frosted Crystal Core */}
                    <div
                      aria-hidden="true"
                      style={{ transform: 'translateZ(0px)' }}
                      className="col-start-1 row-start-1 rounded-[1.85rem] border border-white/80 bg-gradient-to-br from-white/50 via-sky-50/35 to-white/30 backdrop-blur-xl pointer-events-none"
                    />

                    {/* Specular Sheen on Flip */}
                    <div
                      aria-hidden="true"
                      style={{ transform: 'translateZ(8px)' }}
                      className="col-start-1 row-start-1 rounded-[1.85rem] overflow-hidden pointer-events-none"
                    >
                      <motion.div
                        key={isRegisterFace ? 'sheen-register' : 'sheen-login'}
                        initial={{ x: '-140%', opacity: 0 }}
                        animate={
                          prefersReducedMotion
                            ? { opacity: 0 }
                            : { x: '240%', opacity: [0, 0.5, 0] }
                        }
                        transition={{ duration: 0.72, ease: [0.16, 1, 0.3, 1] }}
                        className="w-1/2 h-full bg-gradient-to-r from-transparent via-white/80 to-transparent -skew-x-12"
                      />
                    </div>

                    {/* FRONT FACE (0°): KIRISH */}
                    <div
                      style={{
                        transform: 'rotateY(0deg) translateZ(6px)',
                        backfaceVisibility: 'visible'
                      }}
                      className={`col-start-1 row-start-1 relative rounded-[1.85rem] border border-white/95 bg-gradient-to-br from-white/82 via-white/74 to-sky-50/72 backdrop-blur-xl p-6 sm:p-8 shadow-[0_30px_76px_-26px_rgba(15,41,74,0.18),inset_0_1px_1px_rgba(255,255,255,0.95)] flex flex-col justify-between overflow-hidden ${
                        isRegisterFace ? 'pointer-events-none' : 'pointer-events-auto'
                      }`}
                    >
                      <div
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent"
                      />

                      <motion.div
                        animate={{
                          opacity: isRegisterFace ? 0 : 1,
                          filter: isRegisterFace ? 'blur(4px)' : 'blur(0px)'
                        }}
                        transition={{
                          duration: prefersReducedMotion ? 0.01 : 0.22,
                          delay: isRegisterFace ? 0 : 0.14
                        }}
                        className="relative z-10 space-y-6 my-auto"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1.5">
                            <h2 className="font-display text-2xl sm:text-[1.7rem] font-bold tracking-tight text-slate-900">
                              Xush kelibsiz
                            </h2>
                            <p className="text-sm text-slate-600 leading-relaxed">
                              Telefon raqamingizni kiriting — savatingiz va buyurtmalaringiz avtomatik tiklanadi.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => switchTab('register')}
                            title="Ro'yxatdan o'tishga aylantirish"
                            aria-label="Ro'yxatdan o'tish oynasiga aylantirish"
                            className="w-9 h-9 rounded-xl border border-slate-200/80 bg-white/80 text-slate-500 hover:text-[#0F294A] hover:bg-white flex items-center justify-center transition-colors shrink-0 cursor-pointer"
                          >
                            <RotateCw size={15} />
                          </button>
                        </div>

                        {/* 1-Click Quick Return Login Card for Recent Client */}
                        {recentClient && (
                          <div className="rounded-2xl border border-slate-200/85 bg-white/75 backdrop-blur-md p-3 flex items-center justify-between gap-3">
                            <button
                              type="button"
                              disabled={loading || isRegisterFace}
                              onClick={() => handleQuickClientLogin(recentClient)}
                              className="flex items-center gap-3 min-w-0 flex-1 text-left group cursor-pointer"
                            >
                              <div className="w-10 h-10 rounded-xl bg-[#0F294A]/10 text-[#0F294A] flex items-center justify-center font-display font-bold text-sm shrink-0">
                                {recentClient.username.charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <p className="text-[11px] text-slate-500">
                                  Oxirgi hisob bilan tez kirish
                                </p>
                                <p className="text-sm font-semibold text-slate-900 truncate group-hover:text-[#0F294A] transition-colors">
                                  {recentClient.username} ·{' '}
                                  <span className="font-mono tabular-nums">
                                    {formatFullUzPhone(recentClient.phoneNumber)}
                                  </span>
                                </p>
                              </div>
                            </button>
                            <button
                              type="button"
                              aria-label="Oxirgi hisobni yashirish"
                              onClick={() => {
                                writeRecentClient(null);
                                setRecentClient(null);
                              }}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors shrink-0 cursor-pointer"
                            >
                              <X size={15} />
                            </button>
                          </div>
                        )}

                        <form onSubmit={handleClientLogin} className="space-y-5">
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <label className="block text-xs font-semibold text-slate-700">
                                {t.phoneNumber}
                              </label>
                              <span className="text-[11px] font-mono tabular-nums text-slate-500">
                                {operatorName ? `${operatorName} · ` : ''}
                                {localDigits.length}/9
                              </span>
                            </div>
                            <div className={glassInputContainerClass(isPhoneComplete)}>
                              <span className="pl-4 pr-3 py-3.5 text-sm font-mono font-semibold text-slate-700 bg-slate-100/80 border-r border-slate-200/85 select-none">
                                +998
                              </span>
                              <input
                                ref={loginPhoneInputRef}
                                type="tel"
                                inputMode="numeric"
                                autoComplete="tel"
                                tabIndex={isRegisterFace ? -1 : 0}
                                className="flex-1 bg-transparent px-3.5 py-3.5 text-sm font-mono tabular-nums text-slate-900 outline-none placeholder:text-slate-400"
                                placeholder="90 123 45 67"
                                value={formattedPhone}
                                onChange={(e) => handlePhoneInputChange(e.target.value)}
                              />
                              {isPhoneComplete && (
                                <span className="pr-3.5 text-emerald-600">
                                  <CheckCircle2 size={17} />
                                </span>
                              )}
                            </div>
                          </div>

                          {errorMsg && !isRegisterFace && (
                            <div className="text-xs font-medium text-red-600 bg-red-50/90 border border-red-200 rounded-xl px-3.5 py-3 space-y-2">
                              <p>{errorMsg}</p>
                              {errorAction === 'switch_register' && (
                                <button
                                  type="button"
                                  onClick={() => switchTab('register')}
                                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0F294A] hover:underline cursor-pointer"
                                >
                                  <span>Shu raqam bilan ro&apos;yxatdan o&apos;tish</span>
                                  <ArrowRight size={13} />
                                </button>
                              )}
                            </div>
                          )}

                          <button
                            type="submit"
                            data-sound="welcome"
                            disabled={loading || isRegisterFace}
                            className="w-full py-3.5 px-6 bg-[#0F294A] hover:bg-[#173B6A] text-white font-semibold rounded-2xl flex items-center justify-center gap-2 transition-colors disabled:opacity-60 text-sm cursor-pointer shadow-lg shadow-[#0F294A]/20"
                          >
                            {loading ? (
                              <Loader2 className="animate-spin" size={18} />
                            ) : (
                              <ArrowRight size={18} />
                            )}
                            <span>Kabinetga kirish</span>
                          </button>

                          <p className="text-xs text-center text-slate-600 pt-1">
                            Hali hisobingiz yo&apos;qmi?{' '}
                            <button
                              type="button"
                              tabIndex={isRegisterFace ? -1 : 0}
                              onClick={() => switchTab('register')}
                              className="font-semibold text-[#0F294A] hover:underline cursor-pointer"
                            >
                              Ro&apos;yxatdan o&apos;tish
                            </button>
                          </p>
                        </form>
                      </motion.div>
                    </div>

                    {/* BACK FACE (180°): RO'YXATDAN O'TISH */}
                    <div
                      style={{
                        transform: 'rotateY(180deg) translateZ(6px)',
                        backfaceVisibility: 'visible'
                      }}
                      className={`col-start-1 row-start-1 relative rounded-[1.85rem] border border-white/95 bg-gradient-to-br from-white/82 via-white/74 to-sky-50/72 backdrop-blur-xl p-6 sm:p-8 shadow-[0_30px_76px_-26px_rgba(15,41,74,0.18),inset_0_1px_1px_rgba(255,255,255,0.95)] flex flex-col justify-between overflow-hidden ${
                        isRegisterFace ? 'pointer-events-auto' : 'pointer-events-none'
                      }`}
                    >
                      <div
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent"
                      />

                      <motion.div
                        animate={{
                          opacity: isRegisterFace ? 1 : 0,
                          filter: isRegisterFace ? 'blur(0px)' : 'blur(4px)'
                        }}
                        transition={{
                          duration: prefersReducedMotion ? 0.01 : 0.22,
                          delay: isRegisterFace ? 0.14 : 0
                        }}
                        className="relative z-10 space-y-5"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1.5">
                            <h2 className="font-display text-2xl sm:text-[1.7rem] font-bold tracking-tight text-slate-900">
                              Yangi hisob yaratish
                            </h2>
                            <p className="text-sm text-slate-600 leading-relaxed">
                              30 soniyada ro&apos;yxatdan o&apos;ting va ilk buyurtmangizni rasmiylashtiring.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => switchTab('login')}
                            title="Kirish oynasiga qaytarish"
                            aria-label="Kirish oynasiga aylantirish"
                            className="w-9 h-9 rounded-xl border border-slate-200/80 bg-white/80 text-slate-500 hover:text-[#0F294A] hover:bg-white flex items-center justify-center transition-colors shrink-0 cursor-pointer"
                          >
                            <RotateCw size={15} />
                          </button>
                        </div>

                        <form onSubmit={handleClientRegister} className="space-y-4">
                          <div className="space-y-1.5">
                            <label className="block text-xs font-semibold text-slate-700">
                              Ismingiz
                            </label>
                            <div className="relative">
                              <UserIcon
                                size={16}
                                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                              />
                              <input
                                type="text"
                                autoComplete="name"
                                tabIndex={isRegisterFace ? 0 : -1}
                                className="w-full rounded-2xl border border-slate-200/90 bg-white/80 backdrop-blur-md pl-10 pr-4 py-3 text-sm text-slate-900 outline-none focus:border-[#0F294A] focus:ring-2 focus:ring-[#0F294A]/12 transition-all placeholder:text-slate-400"
                                placeholder="Masalan: Jasur"
                                value={username}
                                onChange={(e) => {
                                  setUsername(e.target.value);
                                  if (errorMsg) setErrorMsg('');
                                }}
                              />
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <label className="block text-xs font-semibold text-slate-700">
                                {t.phoneNumber}
                              </label>
                              <span className="text-[11px] font-mono tabular-nums text-slate-500">
                                {operatorName ? `${operatorName} · ` : ''}
                                {localDigits.length}/9
                              </span>
                            </div>
                            <div className={glassInputContainerClass(isPhoneComplete)}>
                              <span className="pl-4 pr-3 py-3 text-sm font-mono font-semibold text-slate-700 bg-slate-100/80 border-r border-slate-200/85 select-none">
                                +998
                              </span>
                              <input
                                type="tel"
                                inputMode="numeric"
                                autoComplete="tel"
                                tabIndex={isRegisterFace ? 0 : -1}
                                className="flex-1 bg-transparent px-3.5 py-3 text-sm font-mono tabular-nums text-slate-900 outline-none placeholder:text-slate-400"
                                placeholder="90 123 45 67"
                                value={formattedPhone}
                                onChange={(e) => handlePhoneInputChange(e.target.value)}
                              />
                              {isPhoneComplete && (
                                <span className="pr-3.5 text-emerald-600">
                                  <CheckCircle2 size={17} />
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            <label className="block text-xs font-semibold text-slate-700">
                              Hudud <span className="font-normal text-slate-400">(ixtiyoriy)</span>
                            </label>
                            <div className="relative">
                              <MapPin
                                size={16}
                                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                              />
                              <select
                                value={city}
                                tabIndex={isRegisterFace ? 0 : -1}
                                onChange={(e) => setCity(e.target.value)}
                                className="w-full rounded-2xl border border-slate-200/90 bg-white/80 backdrop-blur-md pl-10 pr-4 py-3 text-sm text-slate-900 outline-none focus:border-[#0F294A] transition-all"
                              >
                                {UZ_REGIONS.map((region) => (
                                  <option key={region} value={region} className="bg-white text-slate-900">
                                    {region}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>

                          {errorMsg && isRegisterFace && (
                            <div className="text-xs font-medium text-red-600 bg-red-50/90 border border-red-200 rounded-xl px-3.5 py-3 space-y-2">
                              <p>{errorMsg}</p>
                              {errorAction === 'switch_login' && (
                                <button
                                  type="button"
                                  onClick={() => switchTab('login')}
                                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0F294A] hover:underline cursor-pointer"
                                >
                                  <span>Kirish bo&apos;limiga o&apos;tish</span>
                                  <ArrowRight size={13} />
                                </button>
                              )}
                            </div>
                          )}

                          <button
                            type="submit"
                            data-sound="welcome"
                            disabled={loading || !isRegisterFace}
                            className="w-full py-3.5 px-6 bg-[#0F294A] hover:bg-[#173B6A] text-white font-semibold rounded-2xl flex items-center justify-center gap-2 transition-colors disabled:opacity-60 text-sm cursor-pointer shadow-lg shadow-[#0F294A]/20"
                          >
                            {loading ? (
                              <Loader2 className="animate-spin" size={18} />
                            ) : (
                              <ArrowRight size={18} />
                            )}
                            <span>Hisob yaratish va kirish</span>
                          </button>

                          <p className="text-xs text-center text-slate-600">
                            Avval ro&apos;yxatdan o&apos;tganmisiz?{' '}
                            <button
                              type="button"
                              tabIndex={isRegisterFace ? 0 : -1}
                              onClick={() => switchTab('login')}
                              className="font-semibold text-[#0F294A] hover:underline cursor-pointer"
                            >
                              Kirish
                            </button>
                          </p>
                        </form>
                      </motion.div>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            <p className="text-xs text-slate-500 text-center">
              yuyu.uz · Barcha buyurtmalar va savat ma&apos;lumotlari xavfsiz saqlanadi
            </p>
          </div>
        </section>

        {/* =====================================================================
            SECTION 2: SCROLL-DRIVEN 4-STEP PARALLAX STORY OVER MORPHING 3D SCENE
           ===================================================================== */}
        <section
          id="how-it-works"
          className="max-w-6xl mx-auto px-5 sm:px-8 lg:px-12 py-16 sm:py-24 space-y-16 sm:space-y-24"
        >
          <div className="max-w-2xl mx-auto text-center space-y-3 rounded-[1.75rem] border border-white/85 bg-white/62 backdrop-blur-xl px-6 py-7 shadow-[0_18px_46px_-26px_rgba(15,41,74,0.12)]">
            <p className="text-xs font-semibold text-sky-700">
              Bosqichma-bosqich jarayon
            </p>
            <h2 className="font-display text-2xl sm:text-4xl font-bold tracking-tight text-slate-900 [text-wrap:balance]">
              Buyurtmadan eshigingizgacha — 4 oddiy qadam
            </h2>
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
              Sahifani pastga aylantirganingiz sari Xitoydan to&apos;g&apos;ridan-to&apos;g&apos;ri xarid qilish qanchalik qulay va shaffof ekanini ko&apos;ring.
            </p>
          </div>

          <div className="space-y-16 sm:space-y-24">
            {WORKFLOW_STEPS.map((step) => (
              <ScrollStepCard
                key={step.num}
                step={step}
                reducedMotion={prefersReducedMotion}
              />
            ))}
          </div>
        </section>

        {/* =====================================================================
            SECTION 3: BOTTOM RETURN-TO-LOGIN CTA CARD
           ===================================================================== */}
        <section
          id="back-to-login"
          className="max-w-4xl mx-auto px-5 sm:px-8 lg:px-12 pt-8 pb-20 sm:pb-28"
        >
          <div className="rounded-[2rem] border border-white/95 bg-white/74 backdrop-blur-xl p-8 sm:p-12 text-center shadow-[0_30px_80px_-28px_rgba(15,41,74,0.16),inset_0_1px_1px_rgba(255,255,255,0.95)] space-y-6">
            <div className="space-y-3 max-w-xl mx-auto">
              <p className="text-xs font-semibold text-sky-700">
                YuYu Shop · Xitoydan aqlli xarid platformasi
              </p>
              <h2 className="font-display text-2xl sm:text-4xl font-bold tracking-tight text-slate-900 [text-wrap:balance]">
                Ilk buyurtmangizni hoziroq boshlang
              </h2>
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                Telefon raqamingiz bilan bir necha soniyada kiring — katalog, «Rasm tashla» qidiruvi, jonli auksionlar va VIP keshbek sizni kutmoqda.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => scrollToLogin('login')}
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-[#0F294A] hover:bg-[#173B6A] text-white text-sm font-semibold transition-colors cursor-pointer shadow-lg shadow-[#0F294A]/20 whitespace-nowrap"
              >
                <ArrowUp size={16} />
                <span>Kirish oynasiga qaytish</span>
              </button>

              <button
                type="button"
                onClick={() => scrollToLogin('register')}
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl border border-slate-200/90 bg-white/85 hover:bg-white text-[#0F294A] text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap"
              >
                <span>Yangi hisob yaratish</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </section>

        {/* Quiet Minimalist Footer */}
        <footer className="border-t border-white/80 bg-white/55 backdrop-blur-md">
          <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-12 py-6 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500">
            <div className="flex items-center gap-2.5">
              <AbstractPearlEmblem />
              <span className="font-display font-semibold text-slate-800">YuYu Shop</span>
              <span aria-hidden="true">·</span>
              <span>yuyu.uz</span>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <span>1688 · Taobao · Pinduoduo</span>
              <span aria-hidden="true">·</span>
              <span>O&apos;zbekiston bo&apos;ylab yetkazib berish</span>
            </div>
          </div>
        </footer>
      </main>

      {/* =====================================================================
          HIDDEN SECRET DEVICE AUTHORIZATION MODAL (Ctrl+Shift+A / 5x Emblem / ?admin=1)
         ===================================================================== */}
      <AnimatePresence>
        {isUnlockModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[140] bg-slate-900/35 backdrop-blur-md flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-label="Admin qurilmasini faollashtirish"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 12 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="w-full max-w-md bg-white/92 backdrop-blur-2xl rounded-3xl border border-white shadow-2xl overflow-hidden text-slate-900"
            >
              <div className="px-6 py-4 border-b border-slate-200/70 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-[#0F294A]/10 text-[#0F294A] flex items-center justify-center">
                    <KeyRound size={18} />
                  </div>
                  <div>
                    <h3 className="font-display text-base font-bold text-slate-900">
                      Qurilmani tasdiqlash
                    </h3>
                    <p className="text-xs text-slate-500">
                      Faqat do&apos;kon egasi uchun maxfiy ruxsat
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsUnlockModalOpen(false)}
                  className="w-8 h-8 rounded-xl bg-slate-100 text-slate-500 hover:text-slate-900 flex items-center justify-center cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleAuthorizeThisDevice} className="p-6 space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    Ushbu kompyuter nomi
                  </label>
                  <input
                    type="text"
                    value={unlockLabel}
                    onChange={(e) => setUnlockLabel(e.target.value)}
                    placeholder="Masalan: Mening asosiy kompyuterim"
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-[#0F294A]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    Maxfiy boshqaruv paroli
                  </label>
                  <div className="relative">
                    <input
                      type={showUnlockPassword ? 'text' : 'password'}
                      autoFocus
                      value={unlockMasterPassword}
                      onChange={(e) => {
                        setUnlockMasterPassword(e.target.value);
                        if (unlockError) setUnlockError('');
                      }}
                      placeholder="Parolni kiriting"
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 pr-10 text-sm font-mono text-slate-900 outline-none focus:border-[#0F294A]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowUnlockPassword((v) => !v)}
                      aria-label="Parolni ko'rsatish"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showUnlockPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                {unlockError && (
                  <p className="text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded-xl px-3.5 py-2.5">
                    {unlockError}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={unlockLoading}
                  className="w-full py-3 px-4 rounded-xl bg-[#0F294A] hover:bg-[#173B6A] text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-60 cursor-pointer"
                >
                  {unlockLoading ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <ShieldCheck size={16} />
                  )}
                  <span>Shu qurilmada Admin Panelni yoqish</span>
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
