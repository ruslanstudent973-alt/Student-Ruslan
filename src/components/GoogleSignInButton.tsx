'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import type { User } from '../types';

declare global {
  interface Window {
    google?: {
      accounts?: {
        id?: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential?: string }) => void;
            auto_select?: boolean;
            cancel_on_tap_outside?: boolean;
            ux_mode?: 'popup' | 'redirect';
            context?: 'signin' | 'signup' | 'use';
          }) => void;
          renderButton: (
            parent: HTMLElement,
            options: {
              theme?: 'outline' | 'filled_blue' | 'filled_black';
              size?: 'large' | 'medium' | 'small';
              type?: 'standard' | 'icon';
              shape?: 'rectangular' | 'pill' | 'circle' | 'square';
              text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
              width?: number;
              locale?: string;
            }
          ) => void;
          prompt: (
            momentListener?: (notification: {
              isNotDisplayed?: () => boolean;
              isSkippedMoment?: () => boolean;
            }) => void
          ) => void;
        };
      };
    };
  }
}

const GSI_SCRIPT_ID = 'yuyu-google-gsi-script';
const GSI_SCRIPT_SRC = 'https://accounts.google.com/gsi/client';

interface GoogleSignInButtonProps {
  disabled?: boolean;
  onSuccess: (user: User, isNewUser?: boolean) => void;
  onError: (message: string) => void;
  safeFetchJSON: (url: string, options?: RequestInit) => Promise<any>;
  mode?: 'login' | 'register';
}

export const GoogleSignInButton: React.FC<GoogleSignInButtonProps> = ({
  disabled = false,
  onSuccess,
  onError,
  safeFetchJSON,
  mode = 'login',
}) => {
  const [loading, setLoading] = useState(false);
  const [gsiReady, setGsiReady] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);

  const clientId = (process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '').trim();

  const onSuccessRef = useRef(onSuccess);
  const onErrorRef = useRef(onError);
  const safeFetchRef = useRef(safeFetchJSON);

  useEffect(() => {
    onSuccessRef.current = onSuccess;
    onErrorRef.current = onError;
    safeFetchRef.current = safeFetchJSON;
  }, [onSuccess, onError, safeFetchJSON]);

  const handleCredentialCallback = async (response: { credential?: string }) => {
    const credential = response?.credential;
    if (!credential) {
      onErrorRef.current("Google hisobini tanlash bekor qilindi.");
      return;
    }

    setLoading(true);
    try {
      const res = await safeFetchRef.current('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential }),
      });

      if (res?.success && res?.user) {
        onSuccessRef.current(res.user as User, Boolean(res.isNewUser));
      } else {
        onErrorRef.current(res?.error || "Google orqali kirishda xatolik yuz berdi.");
      }
    } catch (err: any) {
      onErrorRef.current(err?.message || "Google orqali kirishda xatolik yuz berdi.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!clientId || typeof window === 'undefined') return;

    let cancelled = false;

    const initGsi = () => {
      if (cancelled || !window.google?.accounts?.id || !overlayRef.current) return;
      try {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: (resp) => {
            void handleCredentialCallback(resp);
          },
          auto_select: false,
          cancel_on_tap_outside: true,
          ux_mode: 'popup',
          context: mode === 'register' ? 'signup' : 'signin',
        });

        overlayRef.current.innerHTML = '';
        const targetWidth = Math.max(
          260,
          Math.min(440, Math.round(containerRef.current?.offsetWidth || 360))
        );
        window.google.accounts.id.renderButton(overlayRef.current, {
          theme: 'outline',
          size: 'large',
          type: 'standard',
          shape: 'rectangular',
          text: 'continue_with',
          width: targetWidth,
          locale: 'uz',
        });
        setGsiReady(true);
      } catch {
        setGsiReady(false);
      }
    };

    if (window.google?.accounts?.id) {
      initGsi();
      return () => {
        cancelled = true;
      };
    }

    let script = document.getElementById(GSI_SCRIPT_ID) as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement('script');
      script.id = GSI_SCRIPT_ID;
      script.src = GSI_SCRIPT_SRC;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }

    const onLoad = () => initGsi();
    script.addEventListener('load', onLoad);

    const poll = window.setInterval(() => {
      if (window.google?.accounts?.id) {
        window.clearInterval(poll);
        initGsi();
      }
    }, 250);

    return () => {
      cancelled = true;
      script?.removeEventListener('load', onLoad);
      window.clearInterval(poll);
    };
  }, [clientId, mode]);

  const handleFallbackClick = () => {
    if (disabled || loading) return;

    if (!clientId) {
      onError(
        "Google orqali kirish hali sozlanmagan. Vercel Environment Variables bo'limiga NEXT_PUBLIC_GOOGLE_CLIENT_ID va GOOGLE_CLIENT_ID ni kiriting."
      );
      return;
    }

    if (window.google?.accounts?.id) {
      window.google.accounts.id.prompt((notification) => {
        if (notification.isNotDisplayed?.() || notification.isSkippedMoment?.()) {
          onError("Google oynasi ochilmadi. Brauzerda popup ruxsatini tekshirib qayta bosing.");
        }
      });
    } else {
      onError("Google xizmati yuklanmoqda, bir necha soniyadan so'ng qayta bosing.");
    }
  };

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Crisp white Google Sign-In button with official 4-color Google "G" mark */}
      <button
        type="button"
        disabled={disabled || loading}
        onClick={handleFallbackClick}
        className="w-full h-12 px-5 bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-800 font-semibold text-sm rounded-2xl border border-slate-200 shadow-sm hover:shadow transition-all flex items-center justify-center gap-3 cursor-pointer disabled:opacity-60"
      >
        {loading ? (
          <Loader2 size={18} className="animate-spin text-[#2563EB]" />
        ) : (
          <svg
            width="19"
            height="19"
            viewBox="0 0 24 24"
            aria-hidden="true"
            className="shrink-0"
          >
            <path
              fill="#4285F4"
              d="M23.745 12.27c0-.79-.07-1.54-.19-2.27h-11.3v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"
            />
            <path
              fill="#34A853"
              d="M12.255 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96h-3.98v3.09C3.515 21.3 7.565 24 12.255 24z"
            />
            <path
              fill="#FBBC05"
              d="M5.525 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62h-3.98a11.86 11.86 0 000 10.76l3.98-3.09z"
            />
            <path
              fill="#EA4335"
              d="M12.255 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C18.205 1.19 15.495 0 12.255 0c-4.69 0-8.74 2.7-10.71 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"
            />
          </svg>
        )}
        <span>{loading ? 'Google bilan kirilmoqda...' : 'Google orqali davom etish'}</span>
      </button>

      {/* Transparent official Google Identity Services click overlay for guaranteed 1-click popup chooser */}
      {clientId && !disabled && !loading && (
        <div
          ref={overlayRef}
          aria-hidden="true"
          className={`absolute inset-0 z-10 flex items-center justify-center overflow-hidden rounded-2xl transition-opacity ${
            gsiReady ? 'opacity-[0.001] cursor-pointer' : 'pointer-events-none opacity-0'
          }`}
        />
      )}
    </div>
  );
};
