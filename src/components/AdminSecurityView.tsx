'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ChevronLeft,
  ShieldAlert,
  ShieldCheck,
  ShieldOff,
  Ban,
  CheckCircle2,
  RefreshCw,
  Search,
  Send,
  Globe,
  Monitor,
  Clock,
  UserCheck,
  Users,
  Trash2,
  Plus,
  Loader2,
  Lock,
  AlertTriangle,
  Unlock,
  X
} from 'lucide-react';
import { User } from '../types';

interface SecurityEventItem {
  id: string;
  kind: 'attack' | 'blocked_hit' | 'admin_login' | 'user_login' | 'auth_failed' | 'visit';
  attackType?: string;
  severity: 'critical' | 'high' | 'medium' | 'info';
  ip: string;
  country: string;
  city: string;
  userAgent: string;
  deviceSummary: string;
  method: string;
  path: string;
  username?: string;
  phoneNumber?: string;
  detail: string;
  payloadSnippet?: string;
  blocked: boolean;
  createdAt: string;
  timestamp: number;
}

interface BlockedIpItem {
  ip: string;
  reason: string;
  attackType: string;
  source: 'auto' | 'admin';
  country: string;
  city: string;
  userAgent: string;
  lastPath: string;
  hits: number;
  blockedAt: string;
  lastSeenAt: string;
  permanent: true;
}

interface SecuritySettings {
  id: 'main';
  autoBlockEnabled: boolean;
  strictScannerBlock: boolean;
  telegramAlertsEnabled: boolean;
  whitelistIps: string[];
  updatedAt: string;
}

interface SecurityOverviewData {
  summary: {
    blockedIpsCount: number;
    attacks24h: number;
    visitsToday: number;
    totalAttacks: number;
    adminLogins24h: number;
  };
  attacks: SecurityEventItem[];
  visits: SecurityEventItem[];
  blockedIps: BlockedIpItem[];
  settings: SecuritySettings;
  currentIp: string;
  telegramConfigured: boolean;
}

type SecurityTab = 'attacks' | 'visits' | 'blocked';

function formatUzTime(iso: string): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('uz-UZ', {
      timeZone: 'Asia/Tashkent',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  } catch {
    return iso;
  }
}

export const AdminSecurityView: React.FC<{
  adminUser: User;
  onBack: () => void;
  notify: (msg: string, type?: 'success' | 'error' | 'info') => void;
  safeFetchJSON: (url: string, options?: RequestInit) => Promise<any>;
  onAlertsCountChange?: (count: number) => void;
}> = ({ onBack, notify, safeFetchJSON, onAlertsCountChange }) => {
  const [data, setData] = useState<SecurityOverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<SecurityTab>('attacks');

  // Filters
  const [attackQuery, setAttackQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState<'all' | 'critical' | 'high' | 'medium'>('all');
  const [visitQuery, setVisitQuery] = useState('');
  const [visitKindFilter, setVisitKindFilter] = useState<'all' | 'admin_login' | 'user_login' | 'visit'>('all');

  // Actions
  const [manualIp, setManualIp] = useState('');
  const [manualReason, setManualReason] = useState('');
  const [whitelistIpInput, setWhitelistIpInput] = useState('');
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [confirmClearLogs, setConfirmClearLogs] = useState(false);

  const loadOverview = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      else setRefreshing(true);
      try {
        const res = await safeFetchJSON('/api/security/overview');
        if (res?.success) {
          setData(res);
          onAlertsCountChange?.(res.summary?.attacks24h || 0);
        }
      } catch (err: any) {
        notify(err?.message || "Xavfsizlik ma'lumotlarini yuklashda xatolik", 'error');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [safeFetchJSON, notify, onAlertsCountChange]
  );

  useEffect(() => {
    loadOverview(false);
    const interval = window.setInterval(() => loadOverview(true), 30_000);
    return () => window.clearInterval(interval);
  }, [loadOverview]);

  const blockedSet = useMemo(() => {
    return new Set((data?.blockedIps || []).map((b) => b.ip));
  }, [data?.blockedIps]);

  const whitelistSet = useMemo(() => {
    return new Set(data?.settings?.whitelistIps || []);
  }, [data?.settings?.whitelistIps]);

  const filteredAttacks = useMemo(() => {
    const list = data?.attacks || [];
    const q = attackQuery.trim().toLowerCase();
    return list.filter((item) => {
      if (severityFilter !== 'all' && item.severity !== severityFilter) return false;
      if (!q) return true;
      return (
        item.ip.toLowerCase().includes(q) ||
        (item.attackType || '').toLowerCase().includes(q) ||
        item.path.toLowerCase().includes(q) ||
        item.detail.toLowerCase().includes(q) ||
        item.country.toLowerCase().includes(q) ||
        item.deviceSummary.toLowerCase().includes(q) ||
        (item.payloadSnippet || '').toLowerCase().includes(q)
      );
    });
  }, [data?.attacks, attackQuery, severityFilter]);

  const filteredVisits = useMemo(() => {
    const list = data?.visits || [];
    const q = visitQuery.trim().toLowerCase();
    return list.filter((item) => {
      if (visitKindFilter !== 'all' && item.kind !== visitKindFilter) return false;
      if (!q) return true;
      return (
        item.ip.toLowerCase().includes(q) ||
        (item.username || '').toLowerCase().includes(q) ||
        (item.phoneNumber || '').toLowerCase().includes(q) ||
        item.path.toLowerCase().includes(q) ||
        item.country.toLowerCase().includes(q) ||
        item.deviceSummary.toLowerCase().includes(q)
      );
    });
  }, [data?.visits, visitQuery, visitKindFilter]);

  const handleToggleSetting = async (
    key: 'autoBlockEnabled' | 'strictScannerBlock' | 'telegramAlertsEnabled'
  ) => {
    if (!data) return;
    const nextVal = !data.settings[key];
    setBusyAction(`setting:${key}`);
    try {
      const res = await safeFetchJSON('/api/security/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: nextVal })
      });
      if (res?.settings) {
        setData((prev) => (prev ? { ...prev, settings: res.settings } : prev));
        notify('Xavfsizlik sozlamasi saqlandi', 'success');
      }
    } catch (err: any) {
      notify(err?.message || 'Sozlamani saqlashda xatolik', 'error');
    } finally {
      setBusyAction(null);
    }
  };

  const handleTestTelegram = async () => {
    setBusyAction('test_telegram');
    try {
      const res = await safeFetchJSON('/api/security/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test_telegram' })
      });
      if (res?.sent) {
        notify("Telegram botga sinov xabari muvaffaqiyatli yuborildi!", 'success');
      } else {
        notify(res?.reason || "Telegram xabari yuborilmadi", 'error');
      }
    } catch (err: any) {
      notify(err?.message || "Telegram xabarini yuborishda xatolik", 'error');
    } finally {
      setBusyAction(null);
    }
  };

  const handleBlockIp = async (ip: string, reason?: string) => {
    const cleanIp = ip.trim();
    if (!cleanIp) {
      notify('IP manzilini kiriting', 'error');
      return;
    }
    setBusyAction(`block:${cleanIp}`);
    try {
      await safeFetchJSON('/api/security/block', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ip: cleanIp,
          reason: reason?.trim() || "Administrator tomonidan doimiy bloklandi"
        })
      });
      notify(`${cleanIp} doimiy bloklandi`, 'success');
      setManualIp('');
      setManualReason('');
      await loadOverview(true);
    } catch (err: any) {
      notify(err?.message || 'IP bloklashda xatolik', 'error');
    } finally {
      setBusyAction(null);
    }
  };

  const handleUnblockIp = async (ip: string) => {
    setBusyAction(`unblock:${ip}`);
    try {
      await safeFetchJSON(`/api/security/block?ip=${encodeURIComponent(ip)}`, {
        method: 'DELETE'
      });
      notify(`${ip} blokdan chiqarildi`, 'success');
      await loadOverview(true);
    } catch (err: any) {
      notify(err?.message || 'Blokdan chiqarishda xatolik', 'error');
    } finally {
      setBusyAction(null);
    }
  };

  const handleWhitelistAction = async (
    action: 'add' | 'remove',
    opts: { ip?: string; useCurrentIp?: boolean }
  ) => {
    setBusyAction(`wl:${action}:${opts.ip || 'current'}`);
    try {
      const res = await safeFetchJSON('/api/security/whitelist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...opts })
      });
      if (res?.settings) {
        setData((prev) => (prev ? { ...prev, settings: res.settings } : prev));
        setWhitelistIpInput('');
        notify(
          action === 'add'
            ? `${res.ip} oq ro'yxatga qo'shildi (himoyalangan)`
            : `${res.ip} oq ro'yxatdan olib tashlandi`,
          'success'
        );
        await loadOverview(true);
      }
    } catch (err: any) {
      notify(err?.message || "Oq ro'yxatni yangilashda xatolik", 'error');
    } finally {
      setBusyAction(null);
    }
  };

  const handleClearLogs = async () => {
    setBusyAction('clear_logs');
    try {
      await safeFetchJSON('/api/security/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'clear_logs' })
      });
      setConfirmClearLogs(false);
      notify('Jurnal yozuvlari tozalandi (bloklangan IP ro‘yxati saqlandi)', 'success');
      await loadOverview(true);
    } catch (err: any) {
      notify(err?.message || 'Jurnalni tozalashda xatolik', 'error');
    } finally {
      setBusyAction(null);
    }
  };

  const renderSeverityLabel = (severity: SecurityEventItem['severity']) => {
    if (severity === 'critical') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300 border border-red-200/80 dark:border-red-900/60 whitespace-nowrap">
          <AlertTriangle size={11} />
          Jiddiy
        </span>
      );
    }
    if (severity === 'high') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200/80 dark:border-amber-900/60 whitespace-nowrap">
          <ShieldAlert size={11} />
          Yuqori
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700 whitespace-nowrap">
        O&apos;rta
      </span>
    );
  };

  const renderVisitKindLabel = (kind: SecurityEventItem['kind']) => {
    if (kind === 'admin_login') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-900/60 whitespace-nowrap">
          <Lock size={11} />
          Admin kirishi
        </span>
      );
    }
    if (kind === 'user_login') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-900/60 whitespace-nowrap">
          <UserCheck size={11} />
          Mijoz kirishi
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700 whitespace-nowrap">
        <Globe size={11} />
        Sayt tashrifi
      </span>
    );
  };

  if (loading && !data) {
    return (
      <div className="py-24 flex flex-col items-center justify-center gap-3 text-slate-500 dark:text-slate-400">
        <Loader2 size={28} className="animate-spin text-[#0F294A] dark:text-blue-400" />
        <p className="text-sm font-medium">Xavfsizlik markazi yuklanmoqda...</p>
      </div>
    );
  }

  const summary = data?.summary || {
    blockedIpsCount: 0,
    attacks24h: 0,
    visitsToday: 0,
    totalAttacks: 0,
    adminLogins24h: 0
  };
  const settings = data?.settings;
  const currentIp = data?.currentIp || 'unknown';
  const currentIpProtected = whitelistSet.has(currentIp) || currentIp === '127.0.0.1' || currentIp === '::1';

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-slate-200/70 dark:border-slate-800/70">
        <div className="flex items-center gap-3.5">
          <button
            type="button"
            onClick={onBack}
            className="p-2.5 yuyu-glass-subtle rounded-xl hover:bg-white/85 dark:hover:bg-slate-800/80 transition-colors"
            aria-label="Orqaga"
          >
            <ChevronLeft size={18} />
          </button>
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
              Xavfsizlik markazi
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Anti-Hack himoya tizimi, hujum urinishlari jurnali, saytga kirishlar va doimiy IP bloklash
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {!currentIpProtected && currentIp !== 'unknown' && (
            <button
              type="button"
              disabled={busyAction !== null}
              onClick={() => handleWhitelistAction('add', { useCurrentIp: true })}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold whitespace-nowrap transition-colors disabled:opacity-60"
            >
              <ShieldCheck size={14} />
              <span>Joriy IP&apos;ni himoyalash</span>
            </button>
          )}
          <button
            type="button"
            disabled={busyAction !== null}
            onClick={handleTestTelegram}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl yuyu-glass-subtle text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-white/90 dark:hover:bg-slate-800/80 whitespace-nowrap transition-colors disabled:opacity-60"
          >
            {busyAction === 'test_telegram' ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            <span>Telegram test</span>
          </button>
          <button
            type="button"
            disabled={refreshing}
            onClick={() => loadOverview(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#0F294A] hover:bg-[#163A66] dark:bg-blue-600 dark:hover:bg-blue-500 text-white text-xs font-semibold whitespace-nowrap transition-colors disabled:opacity-60"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            <span>Yangilash</span>
          </button>
        </div>
      </div>

      {/* 4 KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="yuyu-glass rounded-2xl p-5 flex items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Bloklangan IP&apos;lar
            </p>
            <p className="font-mono tabular-nums text-3xl font-bold text-slate-900 dark:text-white">
              {summary.blockedIpsCount}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Doimiy taqiqlangan manzillar
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
            <Ban size={20} />
          </div>
        </div>

        <div className="yuyu-glass rounded-2xl p-5 flex items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              24 soatlik hujumlar
            </p>
            <p className="font-mono tabular-nums text-3xl font-bold text-slate-900 dark:text-white">
              {summary.attacks24h}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Jami qayd etilgan: <span className="font-mono tabular-nums">{summary.totalAttacks}</span>
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <ShieldAlert size={20} />
          </div>
        </div>

        <div className="yuyu-glass rounded-2xl p-5 flex items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Bugungi kirishlar
            </p>
            <p className="font-mono tabular-nums text-3xl font-bold text-slate-900 dark:text-white">
              {summary.visitsToday}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Admin kirishlari (24s): <span className="font-mono tabular-nums">{summary.adminLogins24h}</span>
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-[#0F294A] dark:text-blue-400 flex items-center justify-center shrink-0">
            <Users size={20} />
          </div>
        </div>

        <div className="yuyu-glass rounded-2xl p-5 flex items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Himoya holati
            </p>
            <p className="font-display text-2xl font-bold text-emerald-700 dark:text-emerald-400">
              {settings?.autoBlockEnabled ? 'Yuqori (Faol)' : 'Kuzatuv rejimi'}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[180px]" title={currentIp}>
              Sizning IP: <span className="font-mono">{currentIp}</span>
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <ShieldCheck size={20} />
          </div>
        </div>
      </div>

      {/* Protection Controls Bar */}
      {settings && (
        <div className="yuyu-glass rounded-2xl p-4 sm:p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">
                Faol himoya siyosati va Google indeksatsiya xavfsizligi
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Rasmiy Google qidiruv boti ochiq do&apos;kon sahifalarida (robots.txt / sitemap.xml) erkin ishlaydi; zararli skanerlar va buzish urinishlari darhol to&apos;xtatiladi.
              </p>
            </div>
            <div className="text-xs font-semibold">
              {data?.telegramConfigured ? (
                <span className="inline-flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
                  <CheckCircle2 size={14} />
                  Telegram bot ulangan
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-amber-700 dark:text-amber-400">
                  <AlertTriangle size={14} />
                  Vercel&apos;da TELEGRAM_TOKEN va ADMIN_CHAT_ID kiriting
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t border-slate-200/60 dark:border-slate-800/60">
            <button
              type="button"
              disabled={busyAction !== null}
              onClick={() => handleToggleSetting('autoBlockEnabled')}
              className={`flex items-center justify-between gap-3 px-4 py-3 rounded-xl border text-left transition-colors ${
                settings.autoBlockEnabled
                  ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/60'
                  : 'bg-slate-50/70 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800'
              }`}
            >
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-white">
                  Avtomatik doimiy bloklash
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Hujumchi IP darhol bazaga bloklanadi
                </p>
              </div>
              <span
                className={`text-[11px] font-bold px-2.5 py-1 rounded-lg whitespace-nowrap ${
                  settings.autoBlockEnabled
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
                }`}
              >
                {settings.autoBlockEnabled ? 'Yoqilgan' : "O'chirilgan"}
              </span>
            </button>

            <button
              type="button"
              disabled={busyAction !== null}
              onClick={() => handleToggleSetting('strictScannerBlock')}
              className={`flex items-center justify-between gap-3 px-4 py-3 rounded-xl border text-left transition-colors ${
                settings.strictScannerBlock
                  ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/60'
                  : 'bg-slate-50/70 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800'
              }`}
            >
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-white">
                  Qattiq skaner filtri
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  SQLMap, Nikto, scraper botlarni to&apos;sish
                </p>
              </div>
              <span
                className={`text-[11px] font-bold px-2.5 py-1 rounded-lg whitespace-nowrap ${
                  settings.strictScannerBlock
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
                }`}
              >
                {settings.strictScannerBlock ? 'Qattiq' : 'Yumshoq'}
              </span>
            </button>

            <button
              type="button"
              disabled={busyAction !== null}
              onClick={() => handleToggleSetting('telegramAlertsEnabled')}
              className={`flex items-center justify-between gap-3 px-4 py-3 rounded-xl border text-left transition-colors ${
                settings.telegramAlertsEnabled
                  ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/60'
                  : 'bg-slate-50/70 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800'
              }`}
            >
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-white">
                  Telegram tezkor xabar
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Hujum va admin kirishida darhol ogohlantirish
                </p>
              </div>
              <span
                className={`text-[11px] font-bold px-2.5 py-1 rounded-lg whitespace-nowrap ${
                  settings.telegramAlertsEnabled
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
                }`}
              >
                {settings.telegramAlertsEnabled ? 'Yoqilgan' : "O'chirilgan"}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Segmented Navigation Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex items-center gap-1 p-1 rounded-xl yuyu-glass-subtle">
          <button
            type="button"
            onClick={() => setActiveTab('attacks')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
              activeTab === 'attacks'
                ? 'bg-[#0F294A] dark:bg-blue-600 text-white'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <ShieldAlert size={14} />
            <span>Hujum urinishlari</span>
            <span className="font-mono tabular-nums text-[11px] opacity-80">
              ({data?.attacks.length || 0})
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('visits')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
              activeTab === 'visits'
                ? 'bg-[#0F294A] dark:bg-blue-600 text-white'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Users size={14} />
            <span>Saytga kirishlar</span>
            <span className="font-mono tabular-nums text-[11px] opacity-80">
              ({data?.visits.length || 0})
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('blocked')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
              activeTab === 'blocked'
                ? 'bg-[#0F294A] dark:bg-blue-600 text-white'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Ban size={14} />
            <span>Bloklangan IP va Oq ro&apos;yxat</span>
            <span className="font-mono tabular-nums text-[11px] opacity-80">
              ({data?.blockedIps.length || 0})
            </span>
          </button>
        </div>

        {/* Clear logs action with safe inline confirmation */}
        <div>
          {!confirmClearLogs ? (
            <button
              type="button"
              onClick={() => setConfirmClearLogs(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-400 yuyu-glass-subtle whitespace-nowrap transition-colors"
            >
              <Trash2 size={14} />
              <span>Jurnalni tozalash</span>
            </button>
          ) : (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60">
              <span className="text-xs font-semibold text-red-700 dark:text-red-300">
                Jurnalni tozalaysizmi?
              </span>
              <button
                type="button"
                disabled={busyAction === 'clear_logs'}
                onClick={handleClearLogs}
                className="px-2.5 py-1 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold"
              >
                Ha
              </button>
              <button
                type="button"
                onClick={() => setConfirmClearLogs(false)}
                className="p-1 text-slate-500 hover:text-slate-800 dark:hover:text-white"
                aria-label="Bekor qilish"
              >
                <X size={14} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* TAB 1: ATTACK ATTEMPTS */}
      {activeTab === 'attacks' && (
        <div className="yuyu-glass rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-slate-200/70 dark:border-slate-800/70 flex flex-wrap items-center justify-between gap-3">
            <div className="relative flex-1 min-w-[220px] max-w-md">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={attackQuery}
                onChange={(e) => setAttackQuery(e.target.value)}
                placeholder="IP, hujum turi, manzil yoki skaner bo'yicha qidirish..."
                className="w-full yuyu-glass-input rounded-xl pl-9 pr-3.5 py-2 text-xs text-slate-900 dark:text-white outline-none focus:border-[#0F294A]"
              />
            </div>

            <div className="flex items-center gap-1.5">
              {(
                [
                  { id: 'all', label: 'Barchasi' },
                  { id: 'critical', label: 'Jiddiy' },
                  { id: 'high', label: 'Yuqori' },
                  { id: 'medium', label: "O'rta" }
                ] as const
              ).map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setSeverityFilter(f.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                    severityFilter === f.id
                      ? 'bg-[#0F294A] dark:bg-blue-600 text-white'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {filteredAttacks.length === 0 ? (
            <div className="p-12 text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center">
                <ShieldCheck size={24} />
              </div>
              <p className="font-display text-base font-bold text-slate-900 dark:text-white">
                Hujum urinishlari aniqlanmadi
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                Anti-Hack qalqoni faol ishlamoqda. Har qanday buzish, skanerlash yoki noto&apos;g&apos;ri admin kirish urinishi darhol bu yerda va Telegramda ko&apos;rsatiladi.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200/70 dark:border-slate-800/70 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    <th className="py-3 px-4">Vaqt</th>
                    <th className="py-3 px-4">IP va Joylashuv</th>
                    <th className="py-3 px-4">Hujum turi va tafsilot</th>
                    <th className="py-3 px-4">Manzil / Qurilma</th>
                    <th className="py-3 px-4 text-right">Boshqaruv</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/60 dark:divide-slate-800/60 text-xs">
                  {filteredAttacks.map((ev) => {
                    const isBlocked = blockedSet.has(ev.ip);
                    const isOwnOrLocal =
                      ev.ip === currentIp || ev.ip === '127.0.0.1' || ev.ip === '::1' || ev.ip === 'unknown';
                    return (
                      <tr key={ev.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/35">
                        <td className="py-3.5 px-4 whitespace-nowrap align-top">
                          <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-200 font-mono tabular-nums text-[11px]">
                            <Clock size={12} className="text-slate-400 shrink-0" />
                            <span>{formatUzTime(ev.createdAt)}</span>
                          </div>
                          <div className="mt-1.5">{renderSeverityLabel(ev.severity)}</div>
                        </td>
                        <td className="py-3.5 px-4 align-top">
                          <p className="font-mono font-bold text-slate-900 dark:text-white">
                            {ev.ip}
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                            {[ev.country, ev.city].filter(Boolean).join(', ') || "Noma'lum"}
                          </p>
                          {isBlocked && (
                            <span className="inline-flex items-center gap-1 mt-1 text-[11px] font-semibold text-red-600 dark:text-red-400">
                              <Ban size={11} />
                              Doimiy bloklangan
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 align-top max-w-md">
                          <p className="font-semibold text-slate-900 dark:text-white">
                            {ev.attackType || 'Shubhali urinish'}
                          </p>
                          <p className="text-slate-600 dark:text-slate-300 mt-0.5 break-words">
                            {ev.detail}
                          </p>
                          {ev.payloadSnippet && (
                            <code className="block mt-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-900/80 text-[11px] font-mono text-slate-700 dark:text-slate-300 break-all">
                              {ev.payloadSnippet}
                            </code>
                          )}
                        </td>
                        <td className="py-3.5 px-4 align-top max-w-[240px]">
                          <p className="font-mono text-[11px] text-slate-800 dark:text-slate-200 break-all">
                            <span className="font-bold">{ev.method}</span> {ev.path}
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1">
                            <Monitor size={11} className="shrink-0" />
                            <span className="truncate">{ev.deviceSummary}</span>
                          </p>
                        </td>
                        <td className="py-3.5 px-4 align-top text-right whitespace-nowrap">
                          {isBlocked ? (
                            <button
                              type="button"
                              disabled={busyAction !== null}
                              onClick={() => handleUnblockIp(ev.ip)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 text-[11px] font-semibold transition-colors"
                            >
                              <Unlock size={12} />
                              <span>Blokdan ochish</span>
                            </button>
                          ) : !isOwnOrLocal ? (
                            <button
                              type="button"
                              disabled={busyAction !== null}
                              onClick={() => handleBlockIp(ev.ip, ev.attackType || ev.detail)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 dark:bg-red-950/50 dark:hover:bg-red-900/50 text-red-700 dark:text-red-300 text-[11px] font-semibold transition-colors"
                            >
                              <Ban size={12} />
                              <span>Bloklash</span>
                            </button>
                          ) : (
                            <span className="text-[11px] text-slate-400">Himoyalangan</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: SITE VISITS & LOGINS */}
      {activeTab === 'visits' && (
        <div className="yuyu-glass rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-slate-200/70 dark:border-slate-800/70 flex flex-wrap items-center justify-between gap-3">
            <div className="relative flex-1 min-w-[220px] max-w-md">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={visitQuery}
                onChange={(e) => setVisitQuery(e.target.value)}
                placeholder="Ism, telefon, IP manzil, davlat yoki qurilma bo'yicha qidirish..."
                className="w-full yuyu-glass-input rounded-xl pl-9 pr-3.5 py-2 text-xs text-slate-900 dark:text-white outline-none focus:border-[#0F294A]"
              />
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {(
                [
                  { id: 'all', label: 'Barchasi' },
                  { id: 'admin_login', label: 'Admin kirishi' },
                  { id: 'user_login', label: 'Mijoz kirishi' },
                  { id: 'visit', label: 'Tashriflar' }
                ] as const
              ).map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setVisitKindFilter(f.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                    visitKindFilter === f.id
                      ? 'bg-[#0F294A] dark:bg-blue-600 text-white'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {filteredVisits.length === 0 ? (
            <div className="p-12 text-center space-y-2">
              <Users size={28} className="mx-auto text-slate-400" />
              <p className="font-display text-base font-bold text-slate-900 dark:text-white">
                Kirish yozuvlari hali yo&apos;q
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Saytga tashrif buyuruvchilar, mijozlar va admin kirishlari avtomatik ravishda shu jadvalga yoziladi.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200/70 dark:border-slate-800/70 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    <th className="py-3 px-4">Vaqt</th>
                    <th className="py-3 px-4">Foydalanuvchi</th>
                    <th className="py-3 px-4">IP va Joylashuv</th>
                    <th className="py-3 px-4">Qurilma / Sahifa</th>
                    <th className="py-3 px-4 text-right">Amal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/60 dark:divide-slate-800/60 text-xs">
                  {filteredVisits.map((ev) => {
                    const isBlocked = blockedSet.has(ev.ip);
                    const isSafeSelf =
                      ev.ip === currentIp ||
                      whitelistSet.has(ev.ip) ||
                      ev.ip === '127.0.0.1' ||
                      ev.ip === '::1' ||
                      ev.ip === 'unknown';
                    return (
                      <tr key={ev.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/35">
                        <td className="py-3.5 px-4 whitespace-nowrap align-top">
                          <div className="font-mono tabular-nums text-[11px] text-slate-700 dark:text-slate-200">
                            {formatUzTime(ev.createdAt)}
                          </div>
                          <div className="mt-1.5">{renderVisitKindLabel(ev.kind)}</div>
                        </td>
                        <td className="py-3.5 px-4 align-top">
                          <p className="font-semibold text-slate-900 dark:text-white">
                            {ev.username || 'Mehmon tashrifchi'}
                          </p>
                          {ev.phoneNumber && (
                            <p className="font-mono text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                              {ev.phoneNumber}
                            </p>
                          )}
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                            {ev.detail}
                          </p>
                        </td>
                        <td className="py-3.5 px-4 align-top">
                          <p className="font-mono font-semibold text-slate-900 dark:text-white">
                            {ev.ip}
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                            {[ev.country, ev.city].filter(Boolean).join(', ') || "Noma'lum"}
                          </p>
                        </td>
                        <td className="py-3.5 px-4 align-top">
                          <p className="text-slate-800 dark:text-slate-200 font-medium">
                            {ev.deviceSummary}
                          </p>
                          <p className="font-mono text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 break-all">
                            {ev.path}
                          </p>
                        </td>
                        <td className="py-3.5 px-4 align-top text-right whitespace-nowrap">
                          {isBlocked ? (
                            <button
                              type="button"
                              disabled={busyAction !== null}
                              onClick={() => handleUnblockIp(ev.ip)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 text-[11px] font-semibold"
                            >
                              <Unlock size={12} />
                              <span>Blokdan ochish</span>
                            </button>
                          ) : !isSafeSelf ? (
                            <button
                              type="button"
                              disabled={busyAction !== null}
                              onClick={() =>
                                handleBlockIp(ev.ip, `Shubhali tashrif (${ev.username || 'Mehmon'})`)
                              }
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-300 text-[11px] font-semibold"
                            >
                              <Ban size={12} />
                              <span>Bloklash</span>
                            </button>
                          ) : (
                            <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                              Himoyalangan
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: BLOCKED IPS & WHITELIST */}
      {activeTab === 'blocked' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left 8 cols: Manual Block Form + Blocked IP List */}
          <div className="lg:col-span-8 space-y-5">
            <div className="yuyu-glass rounded-2xl p-5 space-y-3.5">
              <div>
                <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
                  IP manzilni qo&apos;lda doimiy bloklash
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Bloklangan IP sayt API va barcha so&apos;rovlardan darhol 403 bilan uziladi.
                </p>
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleBlockIp(manualIp, manualReason);
                }}
                className="grid grid-cols-1 sm:grid-cols-12 gap-2.5"
              >
                <input
                  type="text"
                  value={manualIp}
                  onChange={(e) => setManualIp(e.target.value)}
                  placeholder="Masalan: 185.220.101.4"
                  className="sm:col-span-4 yuyu-glass-input rounded-xl px-3.5 py-2.5 text-xs font-mono text-slate-900 dark:text-white outline-none focus:border-[#0F294A]"
                />
                <input
                  type="text"
                  value={manualReason}
                  onChange={(e) => setManualReason(e.target.value)}
                  placeholder="Sabab (ixtiyoriy)"
                  className="sm:col-span-5 yuyu-glass-input rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white outline-none focus:border-[#0F294A]"
                />
                <button
                  type="submit"
                  disabled={busyAction !== null}
                  className="sm:col-span-3 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold whitespace-nowrap transition-colors disabled:opacity-60"
                >
                  <Ban size={14} />
                  <span>Bloklash</span>
                </button>
              </form>
            </div>

            <div className="yuyu-glass rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-200/70 dark:border-slate-800/70 flex items-center justify-between">
                <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
                  Doimiy bloklangan IP manzillar ({data?.blockedIps.length || 0})
                </h3>
              </div>

              {!data?.blockedIps.length ? (
                <div className="p-10 text-center space-y-1.5">
                  <ShieldOff size={24} className="mx-auto text-slate-400" />
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                    Bloklangan IP manzillar ro&apos;yxati bo&apos;sh
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Avtomatik aniqlangan yoki qo&apos;lda kiritilgan hujumchi IP manzillar shu yerda saqlanadi.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200/70 dark:border-slate-800/70 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        <th className="py-3 px-4">IP manzil</th>
                        <th className="py-3 px-4">Sabab / Tur</th>
                        <th className="py-3 px-4">Urinish</th>
                        <th className="py-3 px-4 text-right">Boshqaruv</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200/60 dark:divide-slate-800/60 text-xs">
                      {data.blockedIps.map((item) => (
                        <tr key={item.ip} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/35">
                          <td className="py-3.5 px-4 align-top">
                            <p className="font-mono font-bold text-red-700 dark:text-red-400">
                              {item.ip}
                            </p>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                              {[item.country, item.city].filter(Boolean).join(', ') || "Noma'lum"}
                            </p>
                            <p className="font-mono tabular-nums text-[10px] text-slate-400 mt-0.5">
                              {formatUzTime(item.blockedAt)}
                            </p>
                          </td>
                          <td className="py-3.5 px-4 align-top">
                            <p className="font-semibold text-slate-900 dark:text-white">
                              {item.attackType}
                            </p>
                            <p className="text-slate-600 dark:text-slate-300 mt-0.5 break-words">
                              {item.reason}
                            </p>
                            <p className="text-[10px] font-semibold text-slate-400 mt-1">
                              Manba: {item.source === 'admin' ? 'Administrator' : 'Avtomatik qalqon'}
                            </p>
                          </td>
                          <td className="py-3.5 px-4 align-top whitespace-nowrap font-mono tabular-nums font-bold text-slate-800 dark:text-slate-200">
                            {item.hits} marta
                          </td>
                          <td className="py-3.5 px-4 align-top text-right whitespace-nowrap">
                            <button
                              type="button"
                              disabled={busyAction !== null}
                              onClick={() => handleUnblockIp(item.ip)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 text-xs font-semibold"
                            >
                              <Unlock size={13} />
                              <span>Blokdan ochish</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Right 4 cols: Whitelist Management */}
          <div className="lg:col-span-4 yuyu-glass rounded-2xl p-5 space-y-4">
            <div>
              <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
                Oq ro&apos;yxat (Ishonchli IP)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Bu ro&apos;yxatdagi IP manzillar hech qachon avtomatik bloklanmaydi.
              </p>
            </div>

            {currentIp !== 'unknown' && !currentIpProtected && (
              <button
                type="button"
                disabled={busyAction !== null}
                onClick={() => handleWhitelistAction('add', { useCurrentIp: true })}
                className="w-full py-2.5 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
              >
                <ShieldCheck size={14} />
                <span>Joriy IP ({currentIp}) ni qo&apos;shish</span>
              </button>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!whitelistIpInput.trim()) return;
                handleWhitelistAction('add', { ip: whitelistIpInput.trim() });
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={whitelistIpInput}
                onChange={(e) => setWhitelistIpInput(e.target.value)}
                placeholder="IP manzil qo'shish..."
                className="flex-1 yuyu-glass-input rounded-xl px-3 py-2 text-xs font-mono text-slate-900 dark:text-white outline-none focus:border-[#0F294A]"
              />
              <button
                type="submit"
                disabled={busyAction !== null}
                className="p-2 rounded-xl bg-[#0F294A] hover:bg-[#163A66] dark:bg-blue-600 text-white"
                aria-label="Oq ro'yxatga qo'shish"
              >
                <Plus size={16} />
              </button>
            </form>

            <div className="space-y-2 pt-1">
              {!settings?.whitelistIps.length ? (
                <p className="text-xs text-slate-500 dark:text-slate-400 py-3 text-center">
                  Hozircha qo&apos;shimcha oq ro&apos;yxat IP yo&apos;q. Tasdiqlangan admin qurilmangiz avtomatik himoyalangan.
                </p>
              ) : (
                settings.whitelistIps.map((ip) => (
                  <div
                    key={ip}
                    className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/70 dark:border-emerald-900/50"
                  >
                    <span className="font-mono text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                      {ip}
                    </span>
                    <button
                      type="button"
                      disabled={busyAction !== null}
                      onClick={() => handleWhitelistAction('remove', { ip })}
                      className="text-slate-400 hover:text-red-600 dark:hover:text-red-400 p-1"
                      aria-label="Olib tashlash"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
