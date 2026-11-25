'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Check, Copy, Clock, MapPin } from 'lucide-react';
import type { Order } from '../types';
import {
  CARGO_STAGES,
  type CargoStage,
  formatCargoTimestamp,
  normalizeCargoStage,
} from '../lib/cargoStages';

interface LiveCargoTrackerProps {
  order: Order;
  compact?: boolean;
}

const STAGE_PROGRESS_PCT: Record<CargoStage, number> = {
  1: 0,
  2: 33.3333,
  3: 66.6667,
  4: 100,
};

const BlueCargoTruckSvg: React.FC<{
  isDriving: boolean;
  isInTransit: boolean;
  reducedMotion: boolean;
}> = ({ isDriving, isInTransit, reducedMotion }) => {
  const shouldSpin = !reducedMotion && (isDriving || isInTransit);
  const wheelDuration = isDriving ? 0.36 : 1.35;
  const bounceDuration = isDriving ? 0.34 : 1.15;

  return (
    <svg
      width="68"
      height="38"
      viewBox="0 0 76 42"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="overflow-visible select-none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="yuyuTruckBodyGrad" x1="8" y1="6" x2="54" y2="30" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#3B82F6" />
          <stop offset="55%" stopColor="#2563EB" />
          <stop offset="100%" stopColor="#1D4ED8" />
        </linearGradient>
        <linearGradient id="yuyuTruckCabGrad" x1="48" y1="12" x2="70" y2="30" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#2563EB" />
          <stop offset="100%" stopColor="#1E40AF" />
        </linearGradient>
        <linearGradient id="yuyuWindshieldGrad" x1="53" y1="15" x2="66" y2="23" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#EFF6FF" />
          <stop offset="100%" stopColor="#93C5FD" />
        </linearGradient>
      </defs>

      {/* Soft road shadow under truck */}
      <ellipse cx="39" cy="39.5" rx="28" ry="2.4" fill="#2563EB" fillOpacity="0.14" />

      {/* Speed slipstream trails visible when accelerating to a new stage */}
      {!reducedMotion && (
        <motion.g
          initial={{ opacity: 0 }}
          animate={{ opacity: isDriving ? [0.25, 0.9, 0.25] : 0 }}
          transition={{
            duration: 0.45,
            repeat: isDriving ? Infinity : 0,
            ease: 'easeInOut',
          }}
        >
          <line x1="-10" y1="13" x2="3" y2="13" stroke="#60A5FA" strokeWidth="1.8" strokeLinecap="round" />
          <line x1="-6" y1="19" x2="4" y2="19" stroke="#93C5FD" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="-12" y1="25" x2="2" y2="25" stroke="#BFDBFE" strokeWidth="1.5" strokeLinecap="round" />
        </motion.g>
      )}

      {/* Truck chassis & cab with gentle engine bounce */}
      <motion.g
        animate={
          shouldSpin
            ? {
                y: isDriving ? [0, -1.7, 0.2, -1.1, 0] : [0, -0.8, 0],
              }
            : { y: 0 }
        }
        transition={{
          duration: bounceDuration,
          repeat: shouldSpin ? Infinity : 0,
          ease: 'easeInOut',
        }}
      >
        {/* Main cargo container */}
        <rect
          x="8"
          y="7"
          width="39"
          height="23"
          rx="4"
          fill="url(#yuyuTruckBodyGrad)"
        />
        {/* Top specular highlight on cargo container */}
        <path
          d="M12 9.2H43"
          stroke="#93C5FD"
          strokeOpacity="0.7"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
        {/* Subtle vertical container ribs */}
        <line x1="18" y1="12" x2="18" y2="26" stroke="#FFFFFF" strokeOpacity="0.22" strokeWidth="1.3" strokeLinecap="round" />
        <line x1="27" y1="12" x2="27" y2="26" stroke="#FFFFFF" strokeOpacity="0.22" strokeWidth="1.3" strokeLinecap="round" />
        <line x1="36" y1="12" x2="36" y2="26" stroke="#FFFFFF" strokeOpacity="0.22" strokeWidth="1.3" strokeLinecap="round" />
        {/* Crisp white aerodynamic stripe */}
        <rect x="11" y="23.5" width="33" height="2.2" rx="1.1" fill="#FFFFFF" fillOpacity="0.88" />

        {/* Cab body */}
        <path
          d="M47 13.5C47 12.1193 48.1193 11 49.5 11H58.8C60.2 11 61.48 11.78 62.13 13.02L67.1 22.3C67.55 23.14 67.8 24.08 67.8 25.04V28.5C67.8 29.8807 66.6807 31 65.3 31H47V13.5Z"
          fill="url(#yuyuTruckCabGrad)"
        />

        {/* Cab windshield */}
        <path
          d="M51 14.5H58.2C59.1 14.5 59.93 14.99 60.35 15.79L63.5 21.8H51V14.5Z"
          fill="url(#yuyuWindshieldGrad)"
        />
        {/* Windshield reflection */}
        <line x1="53.5" y1="16.2" x2="56.5" y2="20.4" stroke="#FFFFFF" strokeOpacity="0.85" strokeWidth="1.2" strokeLinecap="round" />

        {/* Headlight & bumper */}
        <rect x="65.6" y="24.2" width="3" height="3.2" rx="1" fill="#FEF08A" />
        <rect x="6.5" y="28.5" width="62.5" height="3.2" rx="1.6" fill="#1E3A8A" />
      </motion.g>

      {/* Rear wheel */}
      <g transform="translate(21, 33.5)">
        <circle r="5.6" fill="#0F172A" />
        <circle r="3.4" fill="#FFFFFF" />
        <motion.g
          animate={shouldSpin ? { rotate: 360 } : { rotate: 0 }}
          transition={{
            duration: wheelDuration,
            repeat: shouldSpin ? Infinity : 0,
            ease: 'linear',
          }}
        >
          <line x1="-2.5" y1="0" x2="2.5" y2="0" stroke="#2563EB" strokeWidth="1.3" strokeLinecap="round" />
          <line x1="0" y1="-2.5" x2="0" y2="2.5" stroke="#2563EB" strokeWidth="1.3" strokeLinecap="round" />
          <circle r="1.2" fill="#1D4ED8" />
        </motion.g>
      </g>

      {/* Front wheel */}
      <g transform="translate(57, 33.5)">
        <circle r="5.6" fill="#0F172A" />
        <circle r="3.4" fill="#FFFFFF" />
        <motion.g
          animate={shouldSpin ? { rotate: 360 } : { rotate: 0 }}
          transition={{
            duration: wheelDuration,
            repeat: shouldSpin ? Infinity : 0,
            ease: 'linear',
          }}
        >
          <line x1="-2.5" y1="0" x2="2.5" y2="0" stroke="#2563EB" strokeWidth="1.3" strokeLinecap="round" />
          <line x1="0" y1="-2.5" x2="0" y2="2.5" stroke="#2563EB" strokeWidth="1.3" strokeLinecap="round" />
          <circle r="1.2" fill="#1D4ED8" />
        </motion.g>
      </g>
    </svg>
  );
};

export const LiveCargoTracker: React.FC<LiveCargoTrackerProps> = ({
  order,
  compact = false,
}) => {
  const prefersReducedMotion = Boolean(useReducedMotion());
  const currentStage: CargoStage = normalizeCargoStage(order.cargoStatus, order.status);
  const progressPct = STAGE_PROGRESS_PCT[currentStage];
  const trackingCode = (order.trackingCode || order.trackNumber || '').trim();
  const activeStageMeta = CARGO_STAGES[currentStage - 1];

  const [isDriving, setIsDriving] = useState(false);
  const [copied, setCopied] = useState(false);
  const prevStageRef = useRef<CargoStage>(currentStage);

  useEffect(() => {
    // Play an active driving burst on stage transition or initial transit render
    if (prevStageRef.current !== currentStage) {
      prevStageRef.current = currentStage;
      setIsDriving(true);
      const timer = window.setTimeout(() => setIsDriving(false), 1250);
      return () => window.clearTimeout(timer);
    }

    if (currentStage > 1) {
      setIsDriving(true);
      const timer = window.setTimeout(() => setIsDriving(false), 1100);
      return () => window.clearTimeout(timer);
    }
  }, [currentStage]);

  const handleCopyTracking = async () => {
    if (!trackingCode) return;
    try {
      await navigator.clipboard.writeText(trackingCode);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  const getStepTimestamp = (step: CargoStage): string => {
    const ts = order.statusTimestamps;
    const raw =
      step === 1
        ? ts?.step1 || order.timestamp
        : step === 2
        ? ts?.step2
        : step === 3
        ? ts?.step3
        : ts?.step4;
    return formatCargoTimestamp(raw);
  };

  return (
    <div
      className={`rounded-2xl bg-white/95 backdrop-blur-xl border border-slate-200/85 shadow-[0_12px_34px_rgba(37,99,235,0.08)] text-slate-900 ${
        compact ? 'p-4 space-y-4' : 'p-5 space-y-5'
      }`}
    >
      {/* Top header: route title + tracking code */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
        <div className="min-w-0 space-y-0.5">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <MapPin size={13} className="text-[#2563EB] shrink-0" />
            <span className="font-semibold text-slate-900">Jonli Kargo Kuzatuvi</span>
            <span aria-hidden="true">·</span>
            <span>Xitoy → O&apos;zbekiston</span>
          </div>
          <p className="text-xs font-medium text-[#2563EB] truncate">
            {activeStageMeta.step}/4 · {activeStageMeta.label}
          </p>
        </div>

        {trackingCode ? (
          <button
            type="button"
            onClick={handleCopyTracking}
            title="Trek-kodni nusxalash"
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-blue-50/80 hover:bg-blue-100/80 border border-blue-200/70 text-[#1D4ED8] text-xs font-mono tabular-nums font-semibold transition-colors whitespace-nowrap shrink-0"
          >
            <span>{trackingCode}</span>
            {copied ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
          </button>
        ) : (
          <span className="text-[11px] font-medium text-slate-400 whitespace-nowrap">
            Trek-kod tayinlanmoqda
          </span>
        )}
      </div>

      {/* Interactive animated road track + Blue Truck */}
      <div className="pt-8 pb-2 px-6 sm:px-8">
        <div className="relative h-5 flex items-center">
          {/* Base light gray track rail */}
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-2 rounded-full bg-slate-100 border border-slate-200/80 overflow-hidden">
            {/* Subtle dashed road markings */}
            <div
              className="w-full h-full opacity-40"
              style={{
                backgroundImage:
                  'repeating-linear-gradient(90deg, transparent 0px, transparent 10px, #CBD5E1 10px, #CBD5E1 18px)',
              }}
            />
          </div>

          {/* Animated blue progress trail */}
          <motion.div
            className="absolute left-0 top-1/2 -translate-y-1/2 h-2 rounded-full bg-gradient-to-r from-[#60A5FA] via-[#2563EB] to-[#1D4ED8] shadow-[0_2px_10px_rgba(37,99,235,0.35)]"
            initial={false}
            animate={{ width: `${progressPct}%` }}
            transition={{
              duration: prefersReducedMotion ? 0 : 1.05,
              ease: [0.22, 1, 0.36, 1],
            }}
          />

          {/* 4 checkpoint nodes positioned precisely on the track */}
          {CARGO_STAGES.map((stage) => {
            const pct = STAGE_PROGRESS_PCT[stage.step];
            const isCompleted = stage.step <= currentStage;
            const isCurrent = stage.step === currentStage;

            return (
              <div
                key={stage.step}
                style={{ left: `${pct}%` }}
                className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 z-10"
              >
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center transition-all duration-300 ${
                    isCurrent
                      ? 'bg-[#2563EB] text-white ring-4 ring-blue-100 shadow-sm shadow-blue-600/30'
                      : isCompleted
                      ? 'bg-[#2563EB] text-white'
                      : 'bg-white border-2 border-slate-200 text-slate-400'
                  }`}
                >
                  {isCompleted ? (
                    <Check size={11} strokeWidth={3} />
                  ) : (
                    <span className="text-[9px] font-bold tabular-nums">{stage.step}</span>
                  )}
                </div>
              </div>
            );
          })}

          {/* Animated Blue Truck riding smoothly above the active checkpoint */}
          <motion.div
            className="absolute -top-9 z-20 pointer-events-none"
            style={{ x: '-50%' }}
            initial={{ left: '0%' }}
            animate={{ left: `${progressPct}%` }}
            transition={{
              duration: prefersReducedMotion ? 0 : 1.05,
              ease: [0.22, 1, 0.36, 1],
            }}
          >
            <BlueCargoTruckSvg
              isDriving={isDriving}
              isInTransit={currentStage < 4}
              reducedMotion={prefersReducedMotion}
            />
          </motion.div>
        </div>
      </div>

      {/* 4 Stage labels & timestamps */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
        {CARGO_STAGES.map((stage) => {
          const isCompleted = stage.step <= currentStage;
          const isCurrent = stage.step === currentStage;
          const formattedTime = getStepTimestamp(stage.step);

          return (
            <div
              key={stage.step}
              className={`rounded-xl px-2.5 py-2 transition-colors ${
                isCurrent
                  ? 'bg-blue-50/75 border border-blue-200/70'
                  : isCompleted
                  ? 'bg-slate-50/80 border border-slate-100'
                  : 'bg-transparent border border-transparent'
              }`}
            >
              <div className="flex items-start gap-1.5">
                <span
                  className={`mt-0.5 w-4 h-4 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold ${
                    isCompleted
                      ? 'bg-[#2563EB] text-white'
                      : 'bg-slate-100 text-slate-400 border border-slate-200'
                  }`}
                >
                  {isCompleted ? <Check size={10} strokeWidth={3} /> : stage.step}
                </span>
                <div className="min-w-0 space-y-1">
                  <p
                    className={`text-[11px] leading-snug font-semibold ${
                      isCurrent
                        ? 'text-[#1D4ED8]'
                        : isCompleted
                        ? 'text-slate-800'
                        : 'text-slate-400'
                    }`}
                  >
                    {stage.label}
                  </p>
                  <p
                    className={`text-[10px] font-mono tabular-nums flex items-center gap-1 ${
                      isCompleted ? 'text-slate-500' : 'text-slate-400/80'
                    }`}
                  >
                    {isCompleted && formattedTime ? (
                      <>
                        <Clock size={10} className="text-[#2563EB] shrink-0" />
                        <span className="truncate">{formattedTime}</span>
                      </>
                    ) : (
                      <span>{isCompleted ? 'Tasdiqlangan' : 'Kutilmoqda'}</span>
                    )}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
