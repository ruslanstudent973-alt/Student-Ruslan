'use client';

import React, { useEffect } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { YuyuMonogram } from '@/components/YuyuPrimitives';

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[YUYU Shop Error Boundary]', error?.message || 'Unexpected error');
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#F8FAFC] dark:bg-[#070D1B]">
      <div className="yuyu-glass-strong w-full max-w-md rounded-3xl border p-8 sm:p-10 text-center space-y-6">
        <div className="flex flex-col items-center gap-3">
          <YuyuMonogram size={46} />
          <div className="w-12 h-12 rounded-2xl bg-amber-500/12 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <AlertTriangle size={24} />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Sahifani yuklashda xatolik yuz berdi
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            Vaqtinchalik nosozlik tufayli sahifa to‘liq ochilmadi. Qayta urinib ko‘ring yoki asosiy sahifaga qayting.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => reset()}
            className="w-full sm:w-auto min-h-[44px] inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#0F294A] hover:bg-[#163A66] dark:bg-blue-600 dark:hover:bg-blue-500 text-white text-sm font-semibold transition-colors whitespace-nowrap shrink-0"
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
            className="w-full sm:w-auto min-h-[44px] inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl yuyu-glass-subtle border text-slate-700 dark:text-slate-200 hover:bg-white/80 dark:hover:bg-slate-800 text-sm font-semibold transition-colors whitespace-nowrap shrink-0"
          >
            <Home size={16} />
            <span>Asosiy sahifaga qaytish</span>
          </button>
        </div>
      </div>
    </div>
  );
}
