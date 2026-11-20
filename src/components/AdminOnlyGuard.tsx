import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { ShieldAlert, ArrowLeft, Loader2, KeyRound, ShieldCheck, Eye, EyeOff, X } from 'lucide-react';
import { AdminDevice, User, View } from '../types';
import {
  getSuggestedDeviceLabel,
  readStoredAdminDeviceToken,
  writeStoredAdminDeviceToken
} from '../utils/authHelpers';

export type AdminPermission = 'admin_only';

export const ADMIN_ONLY_VIEWS: ReadonlySet<View> = new Set<View>([
  'admin',
  'stats',
  'manage_orders',
  'manage_banners',
  'manage_products',
  'user_search',
  'admin-users',
  'admin_add_product',
  'admin-partnerships',
  'admin-support',
  'admin_vip',
  'admin_custom_requests',
  'admin_access'
]);

interface AdminAccessContextValue {
  permission: AdminPermission;
  isAdminAuthorized: boolean;
  hasLocalAdminToken: boolean;
  authorizedDevice: AdminDevice | null;
  checkingAccess: boolean;
  revalidateDevice: () => Promise<boolean>;
  revokeLocalAccess: () => void;
  openDeviceUnlockModal: () => void;
}

const AdminAccessContext = createContext<AdminAccessContextValue>({
  permission: 'admin_only',
  isAdminAuthorized: false,
  hasLocalAdminToken: false,
  authorizedDevice: null,
  checkingAccess: false,
  revalidateDevice: async () => false,
  revokeLocalAccess: () => {},
  openDeviceUnlockModal: () => {}
});

export function useAdminAccess(): AdminAccessContextValue {
  return useContext(AdminAccessContext);
}

export const AdminAccessProvider: React.FC<{
  currentUser: User | null;
  safeFetchJSON: (url: string, options?: RequestInit) => Promise<any>;
  notify: (msg: string, type?: 'success' | 'error' | 'info') => void;
  children: React.ReactNode;
}> = ({ currentUser, safeFetchJSON, notify, children }) => {
  const [authorizedDevice, setAuthorizedDevice] = useState<AdminDevice | null>(null);
  const [hasLocalAdminToken, setHasLocalAdminToken] = useState<boolean>(() =>
    Boolean(readStoredAdminDeviceToken())
  );
  const [checkingAccess, setCheckingAccess] = useState<boolean>(() =>
    Boolean(readStoredAdminDeviceToken())
  );

  // Hidden owner device unlock modal (Ctrl + Shift + A or /?admin=1 while signed in)
  const [isUnlockOpen, setIsUnlockOpen] = useState(false);
  const [unlockLabel, setUnlockLabel] = useState(() => getSuggestedDeviceLabel());
  const [unlockPassword, setUnlockPassword] = useState('');
  const [showUnlockPassword, setShowUnlockPassword] = useState(false);
  const [unlockLoading, setUnlockLoading] = useState(false);
  const [unlockError, setUnlockError] = useState('');

  const revokeLocalAccess = useCallback(() => {
    writeStoredAdminDeviceToken('');
    setHasLocalAdminToken(false);
    setAuthorizedDevice(null);
  }, []);

  const revalidateDevice = useCallback(
    async (silent = false): Promise<boolean> => {
      const token = readStoredAdminDeviceToken();
      setHasLocalAdminToken(Boolean(token));
      if (!token) {
        setAuthorizedDevice(null);
        setCheckingAccess(false);
        return false;
      }

      if (!silent) {
        setCheckingAccess(true);
      }
      try {
        const res = await safeFetchJSON('/api/admin-access/verify-device', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ deviceToken: token })
        });
        if (res?.authorized && res?.device) {
          setAuthorizedDevice(res.device);
          setHasLocalAdminToken(true);
          return true;
        }
        // Token is invalid or revoked by owner — strip immediately
        writeStoredAdminDeviceToken('');
        setHasLocalAdminToken(false);
        setAuthorizedDevice(null);
        return false;
      } catch {
        // Do not falsely grant admin on verification error if not already verified
        return false;
      } finally {
        if (!silent) {
          setCheckingAccess(false);
        }
      }
    },
    [safeFetchJSON]
  );

  // Verify on mount, whenever user changes, and silently every 60s to enforce remote revocations without unmounting active forms
  useEffect(() => {
    revalidateDevice(false);
    const interval = window.setInterval(() => {
      if (readStoredAdminDeviceToken()) {
        revalidateDevice(true);
      }
    }, 60000);
    return () => window.clearInterval(interval);
  }, [currentUser?.telegramId, revalidateDevice]);

  // Keep multiple browser tabs synchronized if token is added or removed in localStorage
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'yuyu_admin_device_token' || e.key === 'admin_token' || e.key === null) {
        revalidateDevice(true);
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [revalidateDevice]);

  // Secret owner shortcut (Ctrl+Shift+A / Cmd+Shift+A) while already logged in
  useEffect(() => {
    if (!currentUser) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        if (!authorizedDevice) {
          setUnlockError('');
          setUnlockPassword('');
          setIsUnlockOpen(true);
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [currentUser, authorizedDevice]);

  const openDeviceUnlockModal = useCallback(() => {
    setUnlockError('');
    setUnlockPassword('');
    setIsUnlockOpen(true);
  }, []);

  const handleAuthorizeCurrentDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!unlockPassword.trim()) {
      setUnlockError('Maxfiy parolni kiriting.');
      return;
    }
    setUnlockError('');
    setUnlockLoading(true);
    try {
      const res = await safeFetchJSON('/api/admin-access/authorize-device', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          masterPassword: unlockPassword.trim(),
          label: unlockLabel.trim() || getSuggestedDeviceLabel()
        })
      });
      if (res?.deviceToken && res?.device) {
        writeStoredAdminDeviceToken(res.deviceToken);
        setHasLocalAdminToken(true);
        setAuthorizedDevice(res.device);
        setUnlockPassword('');
        setIsUnlockOpen(false);
        notify("Ushbu qurilmada Admin Panel ruxsati faollashtirildi!", 'success');
      }
    } catch (err: any) {
      setUnlockError(err?.message || "Maxfiy parol noto'g'ri");
    } finally {
      setUnlockLoading(false);
    }
  };

  // Strict admin_only condition: user must be Admin AND current device must hold a valid verified token
  const isAdminAuthorized = Boolean(
    currentUser?.isAdmin && hasLocalAdminToken && authorizedDevice && !authorizedDevice.revokedAt
  );

  return (
    <AdminAccessContext.Provider
      value={{
        permission: 'admin_only',
        isAdminAuthorized,
        hasLocalAdminToken,
        authorizedDevice,
        checkingAccess,
        revalidateDevice,
        revokeLocalAccess,
        openDeviceUnlockModal
      }}
    >
      {children}

      {isUnlockOpen && (
        <div
          className="fixed inset-0 z-[150] bg-black/65 backdrop-blur-md flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Admin qurilmasini tasdiqlash"
        >
          <div className="w-full max-w-md bg-white dark:bg-[#111827] rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#0F294A]/10 dark:bg-blue-500/15 text-[#0F294A] dark:text-blue-400 flex items-center justify-center">
                  <KeyRound size={18} />
                </div>
                <div>
                  <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
                    Admin qurilmasini tasdiqlash
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Faqat egasi ruxsat bergan qurilmalar uchun
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsUnlockOpen(false)}
                className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center justify-center"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleAuthorizeCurrentDevice} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Qurilma nomi
                </label>
                <input
                  type="text"
                  value={unlockLabel}
                  onChange={(e) => setUnlockLabel(e.target.value)}
                  placeholder="Masalan: Mening asosiy kompyuterim"
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white outline-none focus:border-[#0F294A]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Maxfiy admin paroli
                </label>
                <div className="relative">
                  <input
                    type={showUnlockPassword ? 'text' : 'password'}
                    autoFocus
                    value={unlockPassword}
                    onChange={(e) => {
                      setUnlockPassword(e.target.value);
                      if (unlockError) setUnlockError('');
                    }}
                    placeholder="Parolni kiriting"
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 pr-10 text-sm font-mono text-slate-900 dark:text-white outline-none focus:border-[#0F294A]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowUnlockPassword((v) => !v)}
                    aria-label="Parolni ko'rsatish"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
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
                className="w-full py-3 px-4 rounded-xl bg-[#0F294A] hover:bg-[#163A66] dark:bg-blue-600 dark:hover:bg-blue-500 text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
              >
                {unlockLoading ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
                <span>Ruxsatni faollashtirish</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </AdminAccessContext.Provider>
  );
};

interface WithAdminOnlyOptions {
  permission?: AdminPermission;
  silent?: boolean;
}

interface AdminGuardInjectedProps {
  onUnauthorizedBack?: () => void;
}

/**
 * Higher-Order Component (HOC) enforcing 'admin_only' permission.
 * Verifies both user.isAdmin AND a valid server-verified localStorage admin device token.
 */
export function withAdminOnly<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  options: WithAdminOnlyOptions = { permission: 'admin_only', silent: false }
): React.FC<P & AdminGuardInjectedProps> {
  const GuardedComponent: React.FC<P & AdminGuardInjectedProps> = (props) => {
    const { isAdminAuthorized, checkingAccess, hasLocalAdminToken } = useAdminAccess();
    const { onUnauthorizedBack, ...restProps } = props;

    if (checkingAccess && hasLocalAdminToken) {
      return (
        <div className="py-24 flex flex-col items-center justify-center gap-3 text-slate-500 dark:text-slate-400">
          <Loader2 size={26} className="animate-spin" />
          <p className="text-sm font-medium">Qurilma ruxsati tekshirilmoqda...</p>
        </div>
      );
    }

    if (!isAdminAuthorized) {
      if (options.silent) {
        return null;
      }
      const fallbackAction =
        onUnauthorizedBack ||
        (typeof (restProps as any).onBack === 'function' ? (restProps as any).onBack : undefined);

      return (
        <div className="max-w-lg mx-auto my-16 bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-3xl p-8 text-center space-y-5">
          <div className="w-14 h-14 rounded-2xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 mx-auto flex items-center justify-center">
            <ShieldAlert size={28} />
          </div>
          <div className="space-y-1.5">
            <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white">
              Ruxsat etilmagan qurilma
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              Ushbu bo'lim faqat maxsus ruxsat berilgan qurilmalar uchun ochiq.
            </p>
          </div>
          {fallbackAction && (
            <button
              type="button"
              onClick={fallbackAction}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0F294A] hover:bg-[#163A66] dark:bg-blue-600 dark:hover:bg-blue-500 text-white text-sm font-semibold transition-colors"
            >
              <ArrowLeft size={16} />
              <span>Kabinetga qaytish</span>
            </button>
          )}
        </div>
      );
    }

    return <WrappedComponent {...(restProps as P)} />;
  };

  GuardedComponent.displayName = `withAdminOnly(${
    WrappedComponent.displayName || WrappedComponent.name || 'Component'
  })`;

  return GuardedComponent;
}

/**
 * Declarative inline gate using the same 'admin_only' device verification.
 * Renders null on unauthorized devices so admin menus never appear at all.
 */
export const AdminOnlyGate: React.FC<{
  permission?: AdminPermission;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}> = ({ fallback = null, children }) => {
  const { isAdminAuthorized } = useAdminAccess();
  if (!isAdminAuthorized) return <>{fallback}</>;
  return <>{children}</>;
};
