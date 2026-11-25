import React, { useState, useEffect, useRef } from 'react';
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useSpring,
  useTransform,
  useReducedMotion
} from 'framer-motion';
import {
  X,
  ShieldCheck,
  Loader2,
  ArrowRight,
  CheckCircle2,
  Volume2,
  VolumeX,
  User as UserIcon,
  MapPin,
  Eye,
  EyeOff,
  KeyRound,
  Monitor,
  Sun,
  Moon,
  RotateCw
} from 'lucide-react';
import { soundEngine } from '../utils/soundEngine';
import { User, AdminDevice } from '../types';
import { YuyuMonogram, SafeImage, YUYU_AUTH_IMAGE } from './YuyuPrimitives';
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

export const AuthView: React.FC<AuthViewProps> = ({
  t,
  onAuthSuccess,
  playSound,
  soundEnabled,
  onToggleSound,
  theme = 'dark',
  onToggleTheme,
  notify,
  safeFetchJSON
}) => {
  const prefersReducedMotion = useReducedMotion();

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

  useEffect(() => {
    setUnlockLabel(getSuggestedDeviceLabel());
    setRecentClient(readRecentClient());
  }, []);

  // Secret 5-tap logo counter
  const logoClickTimesRef = useRef<number[]>([]);

  // Interactive 3D Parallax Scene Motion Values (backdrop only — auth card stays steady while typing)
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const smoothX = useSpring(pointerX, { stiffness: 75, damping: 24, mass: 0.8 });
  const smoothY = useSpring(pointerY, { stiffness: 75, damping: 24, mass: 0.8 });

  const farOrbX = useTransform(smoothX, [-1, 1], [34, -34]);
  const farOrbY = useTransform(smoothY, [-1, 1], [24, -24]);
  const nearOrbX = useTransform(smoothX, [-1, 1], [-42, 42]);
  const nearOrbY = useTransform(smoothY, [-1, 1], [-30, 30]);
  const planeOneX = useTransform(smoothX, [-1, 1], [-22, 22]);
  const planeOneY = useTransform(smoothY, [-1, 1], [-16, 16]);
  const planeTwoX = useTransform(smoothX, [-1, 1], [26, -26]);
  const planeTwoY = useTransform(smoothY, [-1, 1], [18, -18]);
  const gridShiftX = useTransform(smoothX, [-1, 1], [-18, 18]);
  const showcaseShiftX = useTransform(smoothX, [-1, 1], [-8, 8]);
  const showcaseShiftY = useTransform(smoothY, [-1, 1], [-6, 6]);

  const handleStagePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (prefersReducedMotion) return;
    const rect = e.currentTarget.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const ny = ((e.clientY - rect.top) / rect.height) * 2 - 1;
    pointerX.set(nx);
    pointerY.set(ny);
  };

  const handleStagePointerLeave = () => {
    pointerX.set(0);
    pointerY.set(0);
  };

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

  // Secret 5 rapid clicks on YUYU brand mark
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
        ? 'bg-white/75 dark:bg-slate-950/60 border-emerald-500/70 focus-within:ring-2 focus-within:ring-emerald-500/20'
        : 'bg-white/65 dark:bg-slate-950/50 border-slate-300/70 dark:border-white/12 focus-within:border-[#0F294A] dark:focus-within:border-sky-400/70 focus-within:ring-2 focus-within:ring-[#0F294A]/15 dark:focus-within:ring-sky-400/20'
    }`;

  return (
    <div
      onPointerMove={handleStagePointerMove}
      onPointerLeave={handleStagePointerLeave}
      className="relative min-h-screen w-full overflow-hidden bg-gradient-to-br from-[#EDF3FA] via-[#F7FAFE] to-[#DFEAF6] dark:from-[#040914] dark:via-[#081224] dark:to-[#040812] text-slate-900 dark:text-slate-100 transition-colors duration-300"
    >
      {/* =====================================================================
          INTERACTIVE 3D DEPTH & PARALLAX STAGE (Adaptive Light / Dark Crystal)
         ===================================================================== */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 overflow-hidden">
        {/* Layer 1: Architectural 3D Perspective Floor Grid */}
        <div className="auth-stage-perspective absolute inset-x-0 bottom-[-14%] h-[58vh] flex items-end justify-center opacity-70 dark:opacity-55">
          <motion.div
            style={{ x: prefersReducedMotion ? 0 : gridShiftX }}
            className="auth-perspective-floor w-[170vw] h-[75vh] bg-[linear-gradient(to_right,rgba(15,41,74,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(15,41,74,0.08)_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,rgba(148,187,255,0.09)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,187,255,0.09)_1px,transparent_1px)] bg-[size:56px_56px]"
          />
        </div>

        {/* Layer 2: Multi-Depth Parallax Ambient Light Volumes */}
        <motion.div
          style={{
            x: prefersReducedMotion ? 0 : farOrbX,
            y: prefersReducedMotion ? 0 : farOrbY
          }}
          className="absolute -top-32 -left-24 w-[36rem] h-[36rem] rounded-full bg-sky-300/35 dark:bg-blue-600/20 blur-[110px]"
        />
        <motion.div
          style={{
            x: prefersReducedMotion ? 0 : nearOrbX,
            y: prefersReducedMotion ? 0 : nearOrbY
          }}
          className="absolute -bottom-36 -right-24 w-[40rem] h-[40rem] rounded-full bg-[#0F294A]/15 dark:bg-indigo-500/20 blur-[120px]"
        />
        <motion.div
          style={{
            x: prefersReducedMotion ? 0 : planeOneX,
            y: prefersReducedMotion ? 0 : planeOneY
          }}
          className="absolute top-[22%] right-[14%] w-[22rem] h-[22rem] rounded-full bg-white/70 dark:bg-sky-400/10 blur-[90px]"
        />

        {/* Layer 3: Sculptural Floating Crystal Depth Planes (Parallax Architectural Slabs) */}
        <motion.div
          style={{
            x: prefersReducedMotion ? 0 : planeOneX,
            y: prefersReducedMotion ? 0 : planeOneY
          }}
          className="hidden lg:block absolute top-[12%] left-[44%] w-52 h-52 rounded-[2rem] border border-white/60 dark:border-white/10 bg-white/25 dark:bg-white/[0.03] backdrop-blur-md rotate-12 shadow-[0_24px_60px_-20px_rgba(15,41,74,0.12)] dark:shadow-[0_24px_60px_-20px_rgba(0,0,0,0.6)]"
        />
        <motion.div
          style={{
            x: prefersReducedMotion ? 0 : planeTwoX,
            y: prefersReducedMotion ? 0 : planeTwoY
          }}
          className="hidden lg:block absolute bottom-[12%] right-[5%] w-64 h-40 rounded-[2rem] border border-white/55 dark:border-white/10 bg-white/20 dark:bg-sky-300/[0.03] backdrop-blur-md -rotate-6 shadow-[0_24px_60px_-20px_rgba(15,41,74,0.10)] dark:shadow-[0_24px_60px_-20px_rgba(0,0,0,0.55)]"
        />
        <motion.div
          style={{
            x: prefersReducedMotion ? 0 : farOrbX,
            y: prefersReducedMotion ? 0 : planeTwoY
          }}
          className="hidden md:block absolute top-[62%] left-[3%] w-40 h-40 rounded-3xl border border-white/50 dark:border-white/8 bg-white/15 dark:bg-white/[0.02] backdrop-blur-sm rotate-[22deg]"
        />
      </div>

      {/* =====================================================================
          TOP BAR (Brand + Adaptive Theme & Sound Controls)
         ===================================================================== */}
      <header className="relative z-20 max-w-7xl mx-auto px-5 sm:px-8 lg:px-12 pt-5 sm:pt-7 flex items-center justify-between gap-4">
        <div
          onClick={handleBrandLogoClick}
          className="flex items-center gap-3 select-none cursor-default shrink-0"
        >
          <YuyuMonogram size={38} inverted={theme === 'dark'} />
          <span className="font-display text-lg sm:text-xl font-bold tracking-tight text-[#0F294A] dark:text-white whitespace-nowrap">
            YUYU Shop
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {onToggleTheme && (
            <button
              type="button"
              onClick={onToggleTheme}
              aria-label={theme === 'dark' ? "Yorug' rejimga o'tish" : "Tungi rejimga o'tish"}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-white/70 dark:border-white/12 bg-white/60 dark:bg-slate-900/55 backdrop-blur-xl text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-white/85 dark:hover:bg-slate-800/75 transition-colors whitespace-nowrap shrink-0 cursor-pointer shadow-sm"
            >
              {theme === 'dark' ? <Sun size={14} className="text-amber-300" /> : <Moon size={14} className="text-[#0F294A]" />}
              <span className="hidden sm:inline">{theme === 'dark' ? "Yorug'" : 'Tungi'}</span>
            </button>
          )}
          <button
            type="button"
            data-sound-toggle="true"
            onClick={onToggleSound}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-white/70 dark:border-white/12 bg-white/60 dark:bg-slate-900/55 backdrop-blur-xl text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-white/85 dark:hover:bg-slate-800/75 transition-colors whitespace-nowrap shrink-0 cursor-pointer shadow-sm"
          >
            {soundEnabled ? <Volume2 size={14} /> : <VolumeX size={14} className="text-slate-400" />}
            <span className="hidden sm:inline">{soundEnabled ? 'Ovoz yoqilgan' : "Ovoz o'chirilgan"}</span>
          </button>
        </div>
      </header>

      {/* =====================================================================
          MAIN 2-COLUMN SPATIAL LAYOUT
         ===================================================================== */}
      <main className="relative z-10 max-w-7xl mx-auto px-5 sm:px-8 lg:px-12 py-8 sm:py-10 lg:py-12 min-h-[calc(100vh-84px)] grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
        {/* LEFT COLUMN: Editorial Brand Showcase with Subtle Depth Parallax */}
        <section className="lg:col-span-6 space-y-7 order-2 lg:order-1">
          <div className="space-y-4 max-w-xl">
            <p className="text-xs font-medium tracking-wide text-[#0F294A]/75 dark:text-sky-300/85">
              1688 · Taobao · Pinduoduo to'g'ridan-to'g'ri logistika
            </p>
            <h1 className="font-display text-3xl sm:text-4xl xl:text-[2.85rem] font-bold leading-[1.12] tracking-tight text-slate-900 dark:text-white [text-wrap:balance]">
              Xitoydan saralangan mahsulotlarni qulay va tez xarid qiling
            </h1>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300/90 leading-relaxed max-w-lg">
              Shaffof kargo hisob-kitobi, buyurtmalarni real vaqtda kuzatish va har bir xariddan VIP keshbek yagona platformada.
            </p>
          </div>

          {/* Framed Crystal Showcase Image with Parallax Back-Plate */}
          <div className="relative max-w-lg">
            {/* Rear translucent crystal depth plate */}
            <motion.div
              aria-hidden="true"
              style={{
                x: prefersReducedMotion ? 0 : showcaseShiftX,
                y: prefersReducedMotion ? 0 : showcaseShiftY
              }}
              className="absolute -inset-3 rounded-[1.85rem] border border-white/65 dark:border-white/10 bg-white/35 dark:bg-white/[0.04] backdrop-blur-xl -z-10"
            />
            <div className="relative rounded-[1.4rem] overflow-hidden border border-white/80 dark:border-white/15 bg-white/50 dark:bg-slate-900/50 shadow-[0_24px_60px_-24px_rgba(15,41,74,0.28)] dark:shadow-[0_28px_70px_-20px_rgba(0,0,0,0.7)] aspect-[16/10]">
              <SafeImage
                src={YUYU_AUTH_IMAGE}
                alt="YUYU Shop saralangan mahsulotlar to'plami"
                fallbackLabel="YUYU Shop"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/80 via-slate-950/35 to-transparent px-5 py-4 flex items-center justify-between gap-4 text-xs text-white/90">
                <span className="font-medium">To'g'ridan-to'g'ri zavod narxlari</span>
                <span className="font-mono tabular-nums text-white/80">UZS · 7–15 kun</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-500 dark:text-slate-400 border-t border-slate-300/60 dark:border-white/10 pt-5 max-w-lg">
            <span>7–15 kunlik yetkazib berish</span>
            <span aria-hidden="true">·</span>
            <span>100% yuk sug'urtasi</span>
            <span aria-hidden="true">·</span>
            <span>10% gacha VIP keshbek</span>
          </div>
        </section>

        {/* RIGHT COLUMN: Centerpiece 180° 3D Glassmorphic Flip Card */}
        <section className="lg:col-span-6 w-full max-w-[460px] mx-auto lg:ml-auto lg:mr-0 space-y-5 order-1 lg:order-2">
          {/* Segmented Mode Control (Triggers 180° 3D Flip between Kirish & Ro'yxatdan o'tish) */}
          <div
            className={`relative grid gap-1 p-1.5 rounded-2xl border border-white/75 dark:border-white/12 bg-white/55 dark:bg-slate-900/55 backdrop-blur-2xl shadow-[0_12px_32px_-16px_rgba(15,41,74,0.18)] dark:shadow-[0_14px_36px_-14px_rgba(0,0,0,0.65)] ${
              authorizedDevice ? 'grid-cols-3' : 'grid-cols-2'
            }`}
          >
            <button
              type="button"
              onClick={() => switchTab('login')}
              className={`relative z-10 py-2.5 px-3 rounded-xl text-sm font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                authTab === 'login'
                  ? 'text-[#0F294A] dark:text-white'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {authTab === 'login' && (
                <motion.span
                  layoutId="yuyu-auth-active-tab"
                  transition={{ type: 'spring', stiffness: 360, damping: 30 }}
                  className="absolute inset-0 -z-10 rounded-xl bg-white/95 dark:bg-white/14 border border-white/90 dark:border-white/18 shadow-sm"
                />
              )}
              Kirish
            </button>

            <button
              type="button"
              onClick={() => switchTab('register')}
              className={`relative z-10 py-2.5 px-3 rounded-xl text-sm font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                authTab === 'register'
                  ? 'text-[#0F294A] dark:text-white'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {authTab === 'register' && (
                <motion.span
                  layoutId="yuyu-auth-active-tab"
                  transition={{ type: 'spring', stiffness: 360, damping: 30 }}
                  className="absolute inset-0 -z-10 rounded-xl bg-white/95 dark:bg-white/14 border border-white/90 dark:border-white/18 shadow-sm"
                />
              )}
              Ro'yxatdan o'tish
            </button>

            {authorizedDevice && (
              <button
                type="button"
                onClick={() => switchTab('admin')}
                className={`relative z-10 py-2.5 px-2.5 rounded-xl text-sm font-semibold transition-colors whitespace-nowrap inline-flex items-center justify-center gap-1.5 cursor-pointer ${
                  authTab === 'admin'
                    ? 'text-white'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {authTab === 'admin' && (
                  <motion.span
                    layoutId="yuyu-auth-active-tab"
                    transition={{ type: 'spring', stiffness: 360, damping: 30 }}
                    className="absolute inset-0 -z-10 rounded-xl bg-[#0F294A] dark:bg-blue-600 shadow-sm"
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
                className="relative rounded-[1.75rem] border border-white/80 dark:border-white/15 bg-white/68 dark:bg-slate-900/52 backdrop-blur-2xl p-6 sm:p-8 shadow-[0_28px_70px_-24px_rgba(15,41,74,0.25),inset_0_1px_1px_rgba(255,255,255,0.85)] dark:shadow-[0_32px_80px_-24px_rgba(0,0,0,0.78),inset_0_1px_1px_rgba(255,255,255,0.16)] space-y-5"
              >
                <div className="space-y-1.5">
                  <h2 className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                    Admin boshqaruvi
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Tasdiqlangan qurilma orqali xavfsiz kirish
                  </p>
                </div>

                <form onSubmit={handleAdminLogin} className="space-y-4">
                  <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-emerald-50/75 dark:bg-emerald-950/35 border border-emerald-200/80 dark:border-emerald-800/50 text-xs text-emerald-700 dark:text-emerald-300">
                    <Monitor size={15} className="shrink-0" />
                    <span className="truncate font-medium">
                      Tasdiqlangan qurilma: {authorizedDevice.label}
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Administrator nomi
                    </label>
                    <input
                      type="text"
                      className="w-full rounded-2xl border border-slate-300/70 dark:border-white/12 bg-white/65 dark:bg-slate-950/50 backdrop-blur-md px-4 py-3 text-sm text-slate-900 dark:text-white outline-none focus:border-[#0F294A] dark:focus:border-sky-400/70 transition-all"
                      placeholder="YUYU Admin"
                      value={adminUsername}
                      onChange={(e) => setAdminUsername(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Telefon raqami <span className="font-normal text-slate-400">(ixtiyoriy)</span>
                    </label>
                    <input
                      type="tel"
                      className="w-full rounded-2xl border border-slate-300/70 dark:border-white/12 bg-white/65 dark:bg-slate-950/50 backdrop-blur-md px-4 py-3 text-sm font-mono tabular-nums text-slate-900 dark:text-white outline-none focus:border-[#0F294A] dark:focus:border-sky-400/70 transition-all"
                      placeholder="+998 90 123 45 67"
                      value={adminPhone}
                      onChange={(e) => setAdminPhone(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Maxfiy admin paroli
                    </label>
                    <div className="relative">
                      <input
                        type={showAdminPassword ? 'text' : 'password'}
                        autoFocus
                        className="w-full rounded-2xl border border-slate-300/70 dark:border-white/12 bg-white/65 dark:bg-slate-950/50 backdrop-blur-md px-4 py-3 pr-11 text-sm font-mono text-slate-900 dark:text-white outline-none focus:border-[#0F294A] dark:focus:border-sky-400/70 transition-all"
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
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                      >
                        {showAdminPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  {errorMsg && (
                    <p className="text-xs font-medium text-red-600 dark:text-red-400 bg-red-50/90 dark:bg-red-950/45 border border-red-200 dark:border-red-900/50 rounded-xl px-3.5 py-2.5">
                      {errorMsg}
                    </p>
                  )}

                  <button
                    type="submit"
                    data-sound="welcome"
                    disabled={loading}
                    className="w-full py-3.5 px-6 bg-[#0F294A] hover:bg-[#163A66] dark:bg-blue-600 dark:hover:bg-blue-500 text-white font-semibold rounded-2xl flex items-center justify-center gap-2 transition-colors disabled:opacity-60 text-sm cursor-pointer shadow-lg shadow-[#0F294A]/20 dark:shadow-blue-600/25"
                  >
                    {loading ? <Loader2 className="animate-spin" size={18} /> : <ShieldCheck size={18} />}
                    <span>Admin sifatida kirish</span>
                  </button>
                </form>
              </motion.div>
            ) : (
              /* ==============================================================
                 TRUE 180° 3D CRYSTAL FLIP CONTAINER (Kirish <-> Ro'yxatdan o'tish)
                 Both faces retain translucent glassmorphism so the back face
                 glows and remains visibly glassy throughout rotation.
                 ============================================================== */
              <motion.div
                key="client-3d-flip-stage"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.22 }}
                className="auth-3d-perspective w-full"
              >
                <motion.div
                  animate={{
                    rotateY: isRegisterFace ? 180 : 0
                  }}
                  transition={flipTransition}
                  style={{ transformStyle: 'preserve-3d' }}
                  className="relative w-full grid grid-cols-1"
                >
                  {/* Mid-plane Crystal Slab Thickness Core (visible as glass depth during mid-flip) */}
                  <div
                    aria-hidden="true"
                    style={{ transform: 'translateZ(0px)' }}
                    className="col-start-1 row-start-1 rounded-[1.75rem] border border-white/55 dark:border-sky-300/18 bg-gradient-to-br from-white/35 via-sky-100/15 to-white/10 dark:from-sky-400/10 dark:via-slate-900/35 dark:to-indigo-400/12 backdrop-blur-xl pointer-events-none"
                  />

                  {/* Dynamic Specular Light Sweep clipped inside the crystal face on flip */}
                  <div
                    aria-hidden="true"
                    style={{ transform: 'translateZ(8px)' }}
                    className="col-start-1 row-start-1 rounded-[1.75rem] overflow-hidden pointer-events-none"
                  >
                    <motion.div
                      key={isRegisterFace ? 'sheen-register' : 'sheen-login'}
                      initial={{ x: '-140%', opacity: 0 }}
                      animate={
                        prefersReducedMotion
                          ? { opacity: 0 }
                          : { x: '240%', opacity: [0, 0.55, 0] }
                      }
                      transition={{ duration: 0.72, ease: [0.16, 1, 0.3, 1] }}
                      className="w-1/2 h-full bg-gradient-to-r from-transparent via-white/60 dark:via-sky-200/20 to-transparent -skew-x-12"
                    />
                  </div>

                  {/* ----------------------------------------------------------
                      FRONT FACE (0°): KIRISH (LOGIN)
                      backfaceVisibility is intentionally 'visible' on the
                      translucent crystal shell so the glass back stays visible
                      during rotation, while inner text cross-fades cleanly at 90°.
                     ---------------------------------------------------------- */}
                  <div
                    style={{
                      transform: 'rotateY(0deg) translateZ(6px)',
                      backfaceVisibility: 'visible'
                    }}
                    className={`col-start-1 row-start-1 relative rounded-[1.75rem] border border-white/80 dark:border-white/16 bg-gradient-to-br from-white/75 via-white/60 to-sky-50/55 dark:from-slate-900/62 dark:via-slate-900/48 dark:to-slate-950/60 backdrop-blur-2xl p-6 sm:p-8 shadow-[0_30px_70px_-24px_rgba(15,41,74,0.26),inset_0_1px_1px_rgba(255,255,255,0.9)] dark:shadow-[0_32px_80px_-22px_rgba(0,0,0,0.78),inset_0_1px_1px_rgba(255,255,255,0.18)] flex flex-col justify-between overflow-hidden ${
                      isRegisterFace ? 'pointer-events-none' : 'pointer-events-auto'
                    }`}
                  >
                    {/* Subtle diagonal crystal specular reflection */}
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute -top-24 -right-24 w-64 h-64 rounded-full bg-white/50 dark:bg-sky-400/10 blur-3xl"
                    />
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/95 dark:via-white/35 to-transparent"
                    />

                    {/* Translucent rear-glass texture faintly visible when viewed from behind */}
                    <motion.div
                      aria-hidden="true"
                      animate={{ opacity: isRegisterFace ? 0.22 : 0 }}
                      transition={{ duration: 0.28 }}
                      className="pointer-events-none absolute inset-5 rounded-2xl border border-dashed border-[#0F294A]/15 dark:border-sky-300/15"
                    />

                    {/* Front Form Content (fades smoothly around 90° midpoint so never mirrored) */}
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
                          <h2 className="font-display text-2xl sm:text-[1.7rem] font-bold tracking-tight text-slate-900 dark:text-white">
                            Xush kelibsiz
                          </h2>
                          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                            Telefon raqamingizni kiriting — savatingiz va buyurtmalaringiz avtomatik tiklanadi.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => switchTab('register')}
                          title="Ro'yxatdan o'tishga aylantirish"
                          aria-label="Ro'yxatdan o'tish oynasiga aylantirish"
                          className="w-9 h-9 rounded-xl border border-slate-300/60 dark:border-white/12 bg-white/60 dark:bg-white/[0.06] text-slate-500 dark:text-slate-300 hover:text-[#0F294A] dark:hover:text-white hover:bg-white/90 dark:hover:bg-white/12 flex items-center justify-center transition-colors shrink-0 cursor-pointer"
                        >
                          <RotateCw size={15} />
                        </button>
                      </div>

                      {/* 1-Click Quick Return Login Card for Recent Client */}
                      {recentClient && (
                        <div className="rounded-2xl border border-slate-200/80 dark:border-white/12 bg-white/60 dark:bg-white/[0.04] backdrop-blur-md p-3 flex items-center justify-between gap-3">
                          <button
                            type="button"
                            disabled={loading || isRegisterFace}
                            onClick={() => handleQuickClientLogin(recentClient)}
                            className="flex items-center gap-3 min-w-0 flex-1 text-left group cursor-pointer"
                          >
                            <div className="w-10 h-10 rounded-xl bg-[#0F294A]/10 dark:bg-sky-400/15 text-[#0F294A] dark:text-sky-300 flex items-center justify-center font-display font-bold text-sm shrink-0">
                              {recentClient.username.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                Oxirgi hisob bilan tez kirish
                              </p>
                              <p className="text-sm font-semibold text-slate-900 dark:text-white truncate group-hover:text-[#0F294A] dark:group-hover:text-sky-300 transition-colors">
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
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-white/10 transition-colors shrink-0 cursor-pointer"
                          >
                            <X size={15} />
                          </button>
                        </div>
                      )}

                      <form onSubmit={handleClientLogin} className="space-y-5">
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                              {t.phoneNumber}
                            </label>
                            <span className="text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400">
                              {operatorName ? `${operatorName} · ` : ''}
                              {localDigits.length}/9
                            </span>
                          </div>
                          <div className={glassInputContainerClass(isPhoneComplete)}>
                            <span className="pl-4 pr-3 py-3.5 text-sm font-mono font-semibold text-slate-700 dark:text-slate-200 bg-slate-100/70 dark:bg-white/[0.06] border-r border-slate-200/80 dark:border-white/10 select-none">
                              +998
                            </span>
                            <input
                              type="tel"
                              inputMode="numeric"
                              autoComplete="tel"
                              tabIndex={isRegisterFace ? -1 : 0}
                              className="flex-1 bg-transparent px-3.5 py-3.5 text-sm font-mono tabular-nums text-slate-900 dark:text-white outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500"
                              placeholder="90 123 45 67"
                              value={formattedPhone}
                              onChange={(e) => handlePhoneInputChange(e.target.value)}
                            />
                            {isPhoneComplete && (
                              <span className="pr-3.5 text-emerald-500">
                                <CheckCircle2 size={17} />
                              </span>
                            )}
                          </div>
                        </div>

                        {errorMsg && !isRegisterFace && (
                          <div className="text-xs font-medium text-red-600 dark:text-red-400 bg-red-50/90 dark:bg-red-950/45 border border-red-200 dark:border-red-900/50 rounded-xl px-3.5 py-3 space-y-2">
                            <p>{errorMsg}</p>
                            {errorAction === 'switch_register' && (
                              <button
                                type="button"
                                onClick={() => switchTab('register')}
                                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0F294A] dark:text-sky-400 hover:underline cursor-pointer"
                              >
                                <span>Shu raqam bilan ro'yxatdan o'tish</span>
                                <ArrowRight size={13} />
                              </button>
                            )}
                          </div>
                        )}

                        <button
                          type="submit"
                          data-sound="welcome"
                          disabled={loading || isRegisterFace}
                          className="w-full py-3.5 px-6 bg-[#0F294A] hover:bg-[#163A66] dark:bg-blue-600 dark:hover:bg-blue-500 text-white font-semibold rounded-2xl flex items-center justify-center gap-2 transition-colors disabled:opacity-60 text-sm cursor-pointer shadow-lg shadow-[#0F294A]/20 dark:shadow-blue-600/25"
                        >
                          {loading ? (
                            <Loader2 className="animate-spin" size={18} />
                          ) : (
                            <ArrowRight size={18} />
                          )}
                          <span>Kabinetga kirish</span>
                        </button>

                        <p className="text-xs text-center text-slate-600 dark:text-slate-400 pt-1">
                          Hali hisobingiz yo'qmi?{' '}
                          <button
                            type="button"
                            tabIndex={isRegisterFace ? -1 : 0}
                            onClick={() => switchTab('register')}
                            className="font-semibold text-[#0F294A] dark:text-sky-400 hover:underline cursor-pointer"
                          >
                            Ro'yxatdan o'tish
                          </button>
                        </p>
                      </form>
                    </motion.div>
                  </div>

                  {/* ----------------------------------------------------------
                      BACK FACE (180°): RO'YXATDAN O'TISH (REGISTRATION)
                      Rotated 180° around Y with matching frosted crystal glass
                      substrate visible during rotation.
                     ---------------------------------------------------------- */}
                  <div
                    style={{
                      transform: 'rotateY(180deg) translateZ(6px)',
                      backfaceVisibility: 'visible'
                    }}
                    className={`col-start-1 row-start-1 relative rounded-[1.75rem] border border-white/80 dark:border-white/16 bg-gradient-to-br from-white/75 via-white/60 to-indigo-50/50 dark:from-slate-900/62 dark:via-slate-900/48 dark:to-indigo-950/55 backdrop-blur-2xl p-6 sm:p-8 shadow-[0_30px_70px_-24px_rgba(15,41,74,0.26),inset_0_1px_1px_rgba(255,255,255,0.9)] dark:shadow-[0_32px_80px_-22px_rgba(0,0,0,0.78),inset_0_1px_1px_rgba(255,255,255,0.18)] flex flex-col justify-between overflow-hidden ${
                      isRegisterFace ? 'pointer-events-auto' : 'pointer-events-none'
                    }`}
                  >
                    {/* Subtle diagonal crystal specular reflection */}
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute -top-24 -left-24 w-64 h-64 rounded-full bg-white/50 dark:bg-indigo-400/12 blur-3xl"
                    />
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/95 dark:via-white/35 to-transparent"
                    />

                    {/* Translucent rear-glass texture faintly visible when viewed from front */}
                    <motion.div
                      aria-hidden="true"
                      animate={{ opacity: isRegisterFace ? 0 : 0.22 }}
                      transition={{ duration: 0.28 }}
                      className="pointer-events-none absolute inset-5 rounded-2xl border border-dashed border-[#0F294A]/15 dark:border-indigo-300/15"
                    />

                    {/* Back Form Content (fades smoothly around 90° midpoint so never mirrored) */}
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
                          <h2 className="font-display text-2xl sm:text-[1.7rem] font-bold tracking-tight text-slate-900 dark:text-white">
                            Yangi hisob yaratish
                          </h2>
                          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                            30 soniyada ro'yxatdan o'ting va ilk buyurtmangizni rasmiylashtiring.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => switchTab('login')}
                          title="Kirish oynasiga qaytarish"
                          aria-label="Kirish oynasiga aylantirish"
                          className="w-9 h-9 rounded-xl border border-slate-300/60 dark:border-white/12 bg-white/60 dark:bg-white/[0.06] text-slate-500 dark:text-slate-300 hover:text-[#0F294A] dark:hover:text-white hover:bg-white/90 dark:hover:bg-white/12 flex items-center justify-center transition-colors shrink-0 cursor-pointer"
                        >
                          <RotateCw size={15} />
                        </button>
                      </div>

                      <form onSubmit={handleClientRegister} className="space-y-4">
                        <div className="space-y-1.5">
                          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
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
                              className="w-full rounded-2xl border border-slate-300/70 dark:border-white/12 bg-white/65 dark:bg-slate-950/50 backdrop-blur-md pl-10 pr-4 py-3 text-sm text-slate-900 dark:text-white outline-none focus:border-[#0F294A] dark:focus:border-sky-400/70 focus:ring-2 focus:ring-[#0F294A]/15 dark:focus:ring-sky-400/20 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500"
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
                            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                              {t.phoneNumber}
                            </label>
                            <span className="text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400">
                              {operatorName ? `${operatorName} · ` : ''}
                              {localDigits.length}/9
                            </span>
                          </div>
                          <div className={glassInputContainerClass(isPhoneComplete)}>
                            <span className="pl-4 pr-3 py-3 text-sm font-mono font-semibold text-slate-700 dark:text-slate-200 bg-slate-100/70 dark:bg-white/[0.06] border-r border-slate-200/80 dark:border-white/10 select-none">
                              +998
                            </span>
                            <input
                              type="tel"
                              inputMode="numeric"
                              autoComplete="tel"
                              tabIndex={isRegisterFace ? 0 : -1}
                              className="flex-1 bg-transparent px-3.5 py-3 text-sm font-mono tabular-nums text-slate-900 dark:text-white outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500"
                              placeholder="90 123 45 67"
                              value={formattedPhone}
                              onChange={(e) => handlePhoneInputChange(e.target.value)}
                            />
                            {isPhoneComplete && (
                              <span className="pr-3.5 text-emerald-500">
                                <CheckCircle2 size={17} />
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
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
                              className="w-full rounded-2xl border border-slate-300/70 dark:border-white/12 bg-white/65 dark:bg-slate-950/60 backdrop-blur-md pl-10 pr-4 py-3 text-sm text-slate-900 dark:text-white outline-none focus:border-[#0F294A] dark:focus:border-sky-400/70 transition-all"
                            >
                              {UZ_REGIONS.map((region) => (
                                <option
                                  key={region}
                                  value={region}
                                  className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                                >
                                  {region}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {errorMsg && isRegisterFace && (
                          <div className="text-xs font-medium text-red-600 dark:text-red-400 bg-red-50/90 dark:bg-red-950/45 border border-red-200 dark:border-red-900/50 rounded-xl px-3.5 py-3 space-y-2">
                            <p>{errorMsg}</p>
                            {errorAction === 'switch_login' && (
                              <button
                                type="button"
                                onClick={() => switchTab('login')}
                                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0F294A] dark:text-sky-400 hover:underline cursor-pointer"
                              >
                                <span>Kirish bo'limiga o'tish</span>
                                <ArrowRight size={13} />
                              </button>
                            )}
                          </div>
                        )}

                        <button
                          type="submit"
                          data-sound="welcome"
                          disabled={loading || !isRegisterFace}
                          className="w-full py-3.5 px-6 bg-[#0F294A] hover:bg-[#163A66] dark:bg-blue-600 dark:hover:bg-blue-500 text-white font-semibold rounded-2xl flex items-center justify-center gap-2 transition-colors disabled:opacity-60 text-sm cursor-pointer shadow-lg shadow-[#0F294A]/20 dark:shadow-blue-600/25"
                        >
                          {loading ? (
                            <Loader2 className="animate-spin" size={18} />
                          ) : (
                            <ArrowRight size={18} />
                          )}
                          <span>Hisob yaratish va kirish</span>
                        </button>

                        <p className="text-xs text-center text-slate-600 dark:text-slate-400">
                          Avval ro'yxatdan o'tganmisiz?{' '}
                          <button
                            type="button"
                            tabIndex={isRegisterFace ? 0 : -1}
                            onClick={() => switchTab('login')}
                            className="font-semibold text-[#0F294A] dark:text-sky-400 hover:underline cursor-pointer"
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

          <p className="text-xs text-slate-500 dark:text-slate-400/80 text-center">
            YUYU Shop · Barcha buyurtmalar va savat ma'lumotlari xavfsiz saqlanadi
          </p>
        </section>
      </main>

      {/* =====================================================================
          HIDDEN SECRET DEVICE AUTHORIZATION MODAL (Ctrl+Shift+A / 5x Logo / ?admin=1)
         ===================================================================== */}
      <AnimatePresence>
        {isUnlockModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[140] bg-slate-950/65 backdrop-blur-md flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-label="Admin qurilmasini faollashtirish"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 12 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="w-full max-w-md bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl rounded-3xl border border-white/80 dark:border-white/15 shadow-2xl overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-slate-200/70 dark:border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-[#0F294A]/10 dark:bg-blue-500/15 text-[#0F294A] dark:text-blue-400 flex items-center justify-center">
                    <KeyRound size={18} />
                  </div>
                  <div>
                    <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
                      Qurilmani tasdiqlash
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Faqat do'kon egasi uchun maxfiy ruxsat
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsUnlockModalOpen(false)}
                  className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center justify-center cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleAuthorizeThisDevice} className="p-6 space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Ushbu kompyuter nomi
                  </label>
                  <input
                    type="text"
                    value={unlockLabel}
                    onChange={(e) => setUnlockLabel(e.target.value)}
                    placeholder="Masalan: Mening asosiy kompyuterim"
                    className="w-full bg-white/75 dark:bg-slate-950/60 border border-slate-200 dark:border-white/12 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white outline-none focus:border-[#0F294A] dark:focus:border-sky-400"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
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
                      className="w-full bg-white/75 dark:bg-slate-950/60 border border-slate-200 dark:border-white/12 rounded-xl px-4 py-2.5 pr-10 text-sm font-mono text-slate-900 dark:text-white outline-none focus:border-[#0F294A] dark:focus:border-sky-400"
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
                  <p className="text-xs font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-xl px-3.5 py-2.5">
                    {unlockError}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={unlockLoading}
                  className="w-full py-3 px-4 rounded-xl bg-[#0F294A] hover:bg-[#163A66] dark:bg-blue-600 dark:hover:bg-blue-500 text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-60 cursor-pointer"
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
