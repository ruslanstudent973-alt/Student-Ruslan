import React, { useState, useEffect, useCallback } from 'react';
import {
  ChevronLeft,
  ShieldCheck,
  Monitor,
  Smartphone,
  Link2,
  Copy,
  Check,
  Trash2,
  Plus,
  KeyRound,
  RefreshCw,
  Clock,
  AlertTriangle,
  Eye,
  EyeOff,
  Loader2,
  XCircle
} from 'lucide-react';
import { AdminDevice, AdminInvite, User } from '../types';
import {
  getSuggestedDeviceLabel,
  readStoredAdminDeviceToken,
  writeStoredAdminDeviceToken
} from '../utils/authHelpers';
import { motion } from 'framer-motion';
import { useAdminAccess } from './AdminOnlyGuard';
import { StaggerGrid, StaggerItem } from './GlassMotionPrimitives';

function formatShortDate(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('uz-UZ', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export const AdminAccessView: React.FC<{
  adminUser: User;
  onBack: () => void;
  notify: (msg: string, type?: 'success' | 'error' | 'info') => void;
  safeFetchJSON: (url: string, options?: RequestInit) => Promise<any>;
}> = ({ adminUser, onBack, notify, safeFetchJSON }) => {
  const { revalidateDevice, revokeLocalAccess } = useAdminAccess();
  const [devices, setDevices] = useState<AdminDevice[]>([]);
  const [invites, setInvites] = useState<AdminInvite[]>([]);
  const [currentDeviceId, setCurrentDeviceId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Invite creation state
  const [inviteLabel, setInviteLabel] = useState('');
  const [inviteHours, setInviteHours] = useState<number>(24);
  const [creatingInvite, setCreatingInvite] = useState(false);
  const [newlyCreatedLink, setNewlyCreatedLink] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Revoke confirmation & current device binding
  const [confirmRevokeId, setConfirmRevokeId] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [bindingCurrent, setBindingCurrent] = useState(false);

  // Change password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const loadOverview = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      else setRefreshing(true);
      try {
        const deviceToken = readStoredAdminDeviceToken();
        const params = new URLSearchParams({
          adminId: adminUser.telegramId
        });
        if (deviceToken) params.set('deviceToken', deviceToken);
        const data = await safeFetchJSON(`/api/admin-access/overview?${params.toString()}`);
        if (data?.success) {
          setDevices(Array.isArray(data.devices) ? data.devices : []);
          setInvites(Array.isArray(data.invites) ? data.invites : []);
          setCurrentDeviceId(data.currentDeviceId || null);
        }
      } catch (err: any) {
        notify(err?.message || "Ruxsatlar ma'lumotini yuklab bo'lmadi", 'error');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [adminUser.telegramId, notify, safeFetchJSON]
  );

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  const buildInviteUrl = (code: string) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    return `${origin}/?admin_invite=${encodeURIComponent(code)}`;
  };

  const handleCopy = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      notify('Taklif havolasi nusxalandi', 'success');
      setTimeout(() => setCopiedKey(null), 2200);
    } catch {
      notify("Nusxalab bo'lmadi", 'error');
    }
  };

  const handleCreateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingInvite(true);
    try {
      const res = await safeFetchJSON('/api/admin-access/invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminId: adminUser.telegramId,
          label: inviteLabel.trim() || 'Ruxsat berilgan menejer',
          expiresHours: inviteHours
        })
      });
      if (res?.invite) {
        setInvites((prev) => [res.invite, ...prev]);
        const link = buildInviteUrl(res.invite.code);
        setNewlyCreatedLink(link);
        setInviteLabel('');
        notify('Bir martalik taklif havolasi yaratildi', 'success');
      }
    } catch (err: any) {
      notify(err?.message || 'Havola yaratishda xatolik', 'error');
    } finally {
      setCreatingInvite(false);
    }
  };

  const handleRevokeInvite = async (inviteId: string) => {
    try {
      await safeFetchJSON(
        `/api/admin-access/invites/${encodeURIComponent(inviteId)}?adminId=${encodeURIComponent(adminUser.telegramId)}`,
        { method: 'DELETE' }
      );
      setInvites((prev) => prev.map((inv) => (inv.id === inviteId ? { ...inv, revoked: true } : inv)));
      notify('Taklif havolasi bekor qilindi', 'info');
    } catch (err: any) {
      notify(err?.message || 'Havolani bekor qilishda xatolik', 'error');
    }
  };

  const handleBindCurrentComputer = async () => {
    setBindingCurrent(true);
    try {
      const res = await safeFetchJSON('/api/admin-access/bind-current', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminId: adminUser.telegramId,
          label: getSuggestedDeviceLabel()
        })
      });
      if (res?.deviceToken && res?.device) {
        writeStoredAdminDeviceToken(res.deviceToken);
        setCurrentDeviceId(res.device.id);
        setDevices((prev) => [res.device, ...prev]);
        await revalidateDevice();
        notify("Ushbu kompyuter ishonchli admin qurilmasi sifatida biriktirildi!", 'success');
      }
    } catch (err: any) {
      notify(err?.message || "Kompyuterni biriktirishda xatolik", 'error');
    } finally {
      setBindingCurrent(false);
    }
  };

  const handleRevokeDevice = async (device: AdminDevice) => {
    setRevokingId(device.id);
    try {
      await safeFetchJSON(
        `/api/admin-access/devices/${encodeURIComponent(device.id)}?adminId=${encodeURIComponent(adminUser.telegramId)}`,
        { method: 'DELETE' }
      );
      if (device.id === currentDeviceId) {
        revokeLocalAccess();
        setCurrentDeviceId(null);
        notify("Joriy qurilma ruxsati bekor qilindi", 'info');
        onBack();
        return;
      }
      setDevices((prev) =>
        prev.map((d) => (d.id === device.id ? { ...d, revokedAt: new Date().toISOString() } : d))
      );
      setConfirmRevokeId(null);
      notify(`"${device.label}" qurilmasining admin ruxsati o'chirildi`, 'info');
    } catch (err: any) {
      notify(err?.message || "Ruxsatni o'chirishda xatolik", 'error');
    } finally {
      setRevokingId(null);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.trim().length < 4) {
      notify("Yangi parol kamida 4 ta belgidan iborat bo'lishi kerak", 'error');
      return;
    }
    setSavingPassword(true);
    try {
      await safeFetchJSON('/api/admin-access/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminId: adminUser.telegramId,
          currentPassword: currentPassword.trim(),
          newPassword: newPassword.trim()
        })
      });
      setCurrentPassword('');
      setNewPassword('');
      notify('Admin kirish paroli yangilandi', 'success');
    } catch (err: any) {
      notify(err?.message || 'Parolni yangilashda xatolik', 'error');
    } finally {
      setSavingPassword(false);
    }
  };

  const activeDevices = devices.filter((d) => !d.revokedAt);
  const revokedDevices = devices.filter((d) => Boolean(d.revokedAt));
  const activeInvitesCount = invites.filter(
    (inv) => !inv.revoked && !inv.usedAt && new Date(inv.expiresAt).getTime() > Date.now()
  ).length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-slate-200/70 dark:border-slate-800/70">
        <div className="flex items-center gap-3.5">
          <motion.button
            type="button"
            whileHover={{ x: -2 }}
            whileTap={{ scale: 0.94 }}
            onClick={onBack}
            className="p-2.5 yuyu-glass-subtle rounded-xl hover:bg-white/85 dark:hover:bg-slate-800/80 transition-colors"
          >
            <ChevronLeft size={18} />
          </motion.button>
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
              Admin ruxsatlari va qurilmalar
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Admin Panel faqat ro'yxatdagi tasdiqlangan kompyuter va qurilmalarda ko'rinadi
            </p>
          </div>
        </div>

        <motion.button
          type="button"
          whileHover={{ y: -1, scale: 1.02 }}
          whileTap={{ scale: 0.96 }}
          onClick={() => loadOverview(true)}
          disabled={refreshing}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl yuyu-glass-subtle text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-white/90 dark:hover:bg-slate-800 transition-colors whitespace-nowrap"
        >
          <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
          <span>Yangilash</span>
        </motion.button>
      </div>

      {/* Quick Summary Strip */}
      <StaggerGrid className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StaggerItem>
          <motion.div whileHover={{ y: -2 }} className="yuyu-glass p-5 rounded-3xl space-y-1">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Faol ruxsatli qurilmalar</p>
            <p className="font-display text-2xl font-bold tabular-nums text-slate-900 dark:text-white">
              {activeDevices.length} ta
            </p>
          </motion.div>
        </StaggerItem>
        <StaggerItem>
          <motion.div whileHover={{ y: -2 }} className="yuyu-glass p-5 rounded-3xl space-y-1">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Faol taklif havolalari</p>
            <p className="font-display text-2xl font-bold tabular-nums text-slate-900 dark:text-white">
              {activeInvitesCount} ta
            </p>
          </motion.div>
        </StaggerItem>
        <StaggerItem>
          <motion.div whileHover={{ y: -2 }} className="yuyu-glass p-5 rounded-3xl space-y-1">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">O'zingizning kompyuter usuli</p>
            <p className="text-sm font-semibold text-[#0F294A] dark:text-blue-400">
              Ctrl + Shift + A · Logo 5x · /?admin=1
            </p>
          </motion.div>
        </StaggerItem>
      </StaggerGrid>

      {!loading && !currentDeviceId && (
        <div className="yuyu-glass border-blue-300/70 dark:border-blue-800/60 rounded-3xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <Monitor size={20} className="text-[#0F294A] dark:text-blue-400 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                Ushbu kompyuter hali ruxsatlar ro'yxatiga biriktirilmagan
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Kabinetdan chiqqaningizda kirish sahifasida "Admin" bo'limi ko'rinib turishi uchun hozirgi kompyuteringizni 1 bosishda biriktiring.
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={bindingCurrent}
            onClick={handleBindCurrentComputer}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#0F294A] hover:bg-[#163A66] dark:bg-blue-600 dark:hover:bg-blue-500 text-white text-xs font-semibold transition-colors whitespace-nowrap shrink-0 disabled:opacity-60"
          >
            {bindingCurrent ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
            <span>Ushbu kompyuterni biriktirish</span>
          </button>
        </div>
      )}

      {loading ? (
        <div className="py-16 flex flex-col items-center justify-center gap-3 text-slate-500 dark:text-slate-400">
          <Loader2 size={28} className="animate-spin" />
          <p className="text-sm">Ruxsatlar ro'yxati yuklanmoqda...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left 7 Columns: Authorized Devices List */}
          <div className="lg:col-span-7 space-y-6">
            <section className="yuyu-glass rounded-3xl p-6 space-y-5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <ShieldCheck size={20} className="text-emerald-600 dark:text-emerald-400" />
                  <div>
                    <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                      Tasdiqlangan qurilmalar
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Faqat shu qurilmalarning kirish sahifasida "Admin Panel" ko'rinadi
                    </p>
                  </div>
                </div>
              </div>

              {activeDevices.length === 0 ? (
                <div className="py-10 px-4 text-center rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-dashed border-slate-200 dark:border-slate-800 space-y-2">
                  <Monitor size={26} className="mx-auto text-slate-400" />
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Hozircha tasdiqlangan qurilma yo'q
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                    Kirish sahifasida <span className="font-mono">Ctrl + Shift + A</span> bosib yoki taklif havolasi yaratib qurilmani bog'lang.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {activeDevices.map((dev) => {
                    const isMobile = /Android|iPhone|iPad/i.test(dev.userAgentSummary || '');
                    const isThisDevice = dev.id === currentDeviceId;
                    return (
                      <div key={dev.id} className="py-4 first:pt-1 last:pb-1 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-start gap-3.5 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-[#0F294A] dark:text-blue-400 flex items-center justify-center shrink-0">
                            {isMobile ? <Smartphone size={19} /> : <Monitor size={19} />}
                          </div>
                          <div className="min-w-0 space-y-1">
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                              <span className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                                {dev.label}
                              </span>
                              {isThisDevice && (
                                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                                  · Joriy qurilma
                                </span>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500 dark:text-slate-400">
                              <span>{dev.userAgentSummary || 'Brauzer'}</span>
                              <span aria-hidden="true">·</span>
                              <span>{dev.role === 'owner' ? 'Asosiy egasi' : 'Taklif orqali'}</span>
                            </div>
                            <div className="flex flex-wrap items-center gap-x-3 text-[11px] font-mono tabular-nums text-slate-400 dark:text-slate-500">
                              <span>Ulangan: {formatShortDate(dev.createdAt)}</span>
                              <span>Oxirgi faollik: {formatShortDate(dev.lastUsedAt)}</span>
                            </div>
                          </div>
                        </div>

                        <div className="shrink-0 flex items-center gap-2">
                          {confirmRevokeId === dev.id ? (
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                disabled={revokingId === dev.id}
                                onClick={() => handleRevokeDevice(dev)}
                                className="px-3 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold transition-colors whitespace-nowrap"
                              >
                                {revokingId === dev.id ? "O'chirilmoqda..." : "Ha, o'chirish"}
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmRevokeId(null)}
                                className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-800"
                              >
                                Bekor
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmRevokeId(dev.id)}
                              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 text-xs font-semibold transition-colors whitespace-nowrap"
                            >
                              <Trash2 size={14} />
                              <span>Ruxsatni o'chirish</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {revokedDevices.length > 0 && (
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2.5">
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    Bekor qilingan qurilmalar ({revokedDevices.length})
                  </p>
                  <div className="space-y-2">
                    {revokedDevices.slice(0, 5).map((dev) => (
                      <div
                        key={dev.id}
                        className="flex items-center justify-between gap-3 text-xs text-slate-400 dark:text-slate-500 py-1.5"
                      >
                        <span className="truncate">
                          {dev.label} · {dev.userAgentSummary}
                        </span>
                        <span className="font-mono tabular-nums shrink-0">
                          O'chirilgan: {formatShortDate(dev.revokedAt)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>

            {/* Invite Links History */}
            <section className="yuyu-glass rounded-3xl p-6 space-y-4">
              <div className="flex items-center gap-2.5">
                <Link2 size={19} className="text-[#0F294A] dark:text-blue-400" />
                <div>
                  <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                    Taklif havolalari tarixi
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Har bir havola faqat bitta qurilmada va bir marta ishlaydi
                  </p>
                </div>
              </div>

              {invites.length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400 py-4">
                  Hali bir martalik taklif havolasi yaratilmagan.
                </p>
              ) : (
                <div className="divide-y divide-slate-200/60 dark:divide-slate-800/70">
                  {invites.slice(0, 12).map((inv) => {
                    const isExpired = new Date(inv.expiresAt).getTime() <= Date.now();
                    const isActive = !inv.revoked && !inv.usedAt && !isExpired;
                    const statusLabel = inv.revoked
                      ? 'Bekor qilingan'
                      : inv.usedAt
                      ? 'Ishlatilgan'
                      : isExpired
                      ? 'Muddati tugagan'
                      : 'Faol (ishlatilmagan)';
                    const statusColor = isActive
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : inv.usedAt
                      ? 'text-blue-600 dark:text-blue-400'
                      : 'text-slate-400 dark:text-slate-500';
                    const url = buildInviteUrl(inv.code);

                    return (
                      <div key={inv.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="min-w-0 space-y-0.5">
                          <div className="flex flex-wrap items-center gap-x-2 text-sm font-semibold text-slate-900 dark:text-white">
                            <span>{inv.label}</span>
                            <span className={`text-xs font-medium ${statusColor}`}>· {statusLabel}</span>
                          </div>
                          <div className="flex flex-wrap items-center gap-x-3 text-[11px] font-mono tabular-nums text-slate-400 dark:text-slate-500">
                            <span>Yaratilgan: {formatShortDate(inv.createdAt)}</span>
                            <span>Muddati: {formatShortDate(inv.expiresAt)}</span>
                          </div>
                        </div>

                        {isActive && (
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleCopy(url, inv.id)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl yuyu-glass-subtle text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-white/90 dark:hover:bg-slate-800 whitespace-nowrap"
                            >
                              {copiedKey === inv.id ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                              <span>{copiedKey === inv.id ? 'Nusxalandi' : 'Nusxalash'}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRevokeInvite(inv.id)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 whitespace-nowrap"
                            >
                              <XCircle size={14} />
                              <span>Bekor</span>
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>

          {/* Right 5 Columns: Generate Invite + Update Password */}
          <div className="lg:col-span-5 space-y-6">
            {/* Generate One-Time Invite */}
            <section className="yuyu-glass rounded-3xl p-6 space-y-5">
              <div className="space-y-1">
                <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                  Boshqa odamga ruxsat berish
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Bir martalik maxfiy havola yarating va uni faqat ishonchli xodimga yuboring. Havola ochilishi bilan o'sha kompyuterda "Admin Panel" ko'rinadi.
                </p>
              </div>

              <form onSubmit={handleCreateInvite} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Xodim yoki qurilma nomi
                  </label>
                  <input
                    type="text"
                    value={inviteLabel}
                    onChange={(e) => setInviteLabel(e.target.value)}
                    placeholder="Masalan: Menejer Aziz noutbuki"
                    className="w-full yuyu-glass-input rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white outline-none focus:border-[#0F294A] dark:focus:border-blue-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Havola amal qilish muddati
                  </label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[
                      { hours: 1, label: '1 soat' },
                      { hours: 24, label: '24 soat' },
                      { hours: 72, label: '3 kun' },
                      { hours: 168, label: '7 kun' }
                    ].map((opt) => (
                      <button
                        key={opt.hours}
                        type="button"
                        onClick={() => setInviteHours(opt.hours)}
                        className={`py-2 px-2 rounded-xl text-xs font-semibold border transition-colors whitespace-nowrap ${
                          inviteHours === opt.hours
                            ? 'bg-[#0F294A] dark:bg-blue-600 text-white border-[#0F294A] dark:border-blue-600'
                            : 'yuyu-glass-subtle text-slate-600 dark:text-slate-300 hover:bg-white/90 dark:hover:bg-slate-800'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <motion.button
                  type="submit"
                  whileHover={{ y: -1, scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  disabled={creatingInvite}
                  className="w-full py-3 px-4 rounded-xl bg-[#0F294A] hover:bg-[#163A66] dark:bg-blue-600 dark:hover:bg-blue-500 text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-60 shadow-md shadow-blue-950/15"
                >
                  {creatingInvite ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                  <span>Bir martalik havola yaratish</span>
                </motion.button>
              </form>

              {newlyCreatedLink && (
                <div className="p-4 rounded-2xl bg-emerald-50/85 dark:bg-emerald-950/35 border border-emerald-200 dark:border-emerald-800/60 space-y-2.5">
                  <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                    <Clock size={14} />
                    <span>Yangi taklif havolasi tayyor (faqat 1 marta ishlaydi)</span>
                  </div>
                  <div className="bg-white/90 dark:bg-slate-900 border border-emerald-200 dark:border-emerald-900 rounded-lg px-3 py-2 text-xs font-mono text-slate-700 dark:text-slate-200 break-all select-all">
                    {newlyCreatedLink}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy(newlyCreatedLink, 'new')}
                    className="w-full py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    {copiedKey === 'new' ? <Check size={14} /> : <Copy size={14} />}
                    <span>{copiedKey === 'new' ? 'Nusxalandi!' : 'Havolani nusxalash'}</span>
                  </button>
                </div>
              )}
            </section>

            {/* Change Admin Password */}
            <section className="yuyu-glass rounded-3xl p-6 space-y-4">
              <div className="flex items-center gap-2.5">
                <KeyRound size={19} className="text-amber-600 dark:text-amber-400" />
                <div>
                  <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                    Maxfiy admin paroli
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Yangi qurilmani bog'lash va Admin Panelga kirish uchun parol
                  </p>
                </div>
              </div>

              <form onSubmit={handleChangePassword} className="space-y-3.5">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Joriy parol
                  </label>
                  <div className="relative">
                    <input
                      type={showPasswords ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Joriy parolni kiriting"
                      required
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 pr-10 text-sm font-mono text-slate-900 dark:text-white outline-none focus:border-[#0F294A]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswords((v) => !v)}
                      aria-label="Parolni ko'rsatish"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      {showPasswords ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Yangi parol
                  </label>
                  <input
                    type={showPasswords ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Kamida 4 ta belgi"
                    required
                    minLength={4}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm font-mono text-slate-900 dark:text-white outline-none focus:border-[#0F294A]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={savingPassword}
                  className="w-full py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 text-xs font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
                >
                  {savingPassword ? <Loader2 size={15} className="animate-spin" /> : <KeyRound size={15} />}
                  <span>Parolni yangilash</span>
                </button>
              </form>

              <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/25 border border-amber-200/80 dark:border-amber-900/50 text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                <AlertTriangle size={15} className="shrink-0 mt-0.5" />
                <span>
                  O'zingizning yangi kompyuteringizda Admin Panelni ochish uchun kirish sahifasida{' '}
                  <strong className="font-mono">Ctrl + Shift + A</strong> bosing yoki YUYU logotipini 5 marta tez bosing.
                </span>
              </div>
            </section>
          </div>
        </div>
      )}
    </div>
  );
};
