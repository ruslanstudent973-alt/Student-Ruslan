'use client';

import React, { useEffect } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[YUYU Shop Global Error]', error?.message || 'Unexpected root error');
  }, [error]);

  return (
    <html lang="uz">
      <body className="min-h-screen flex items-center justify-center p-6 bg-[#F8FAFC] text-slate-900 dark:bg-[#070D1B] dark:text-slate-100 antialiased">
        <div className="w-full max-w-md rounded-3xl border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl p-8 sm:p-10 text-center space-y-6 shadow-xl">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <AlertTriangle size={24} />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight">
              Kutilmagan xatolik yuz berdi
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Ilovani qayta yuklash orqali muammoni bartaraf etishingiz mumkin.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => reset()}
              className="w-full sm:w-auto min-h-[44px] inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#0F294A] hover:bg-[#163A66] text-white text-sm font-semibold transition-colors whitespace-nowrap shrink-0"
            >
              <RefreshCw size={16} />
              <span>Qayta urinish</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (typeof window !== 'undefined') {
                  window.location.href = '/';
                }
              }}
              className="w-full sm:w-auto min-h-[44px] inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm font-semibold transition-colors whitespace-nowrap shrink-0"
            >
              <Home size={16} />
              <span>Asosiy sahifa</span>
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
