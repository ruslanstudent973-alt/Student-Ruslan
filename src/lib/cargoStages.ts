export type CargoStage = 1 | 2 | 3 | 4;

export interface OrderStatusTimestamps {
  step1?: string | Date | null;
  step2?: string | Date | null;
  step3?: string | Date | null;
  step4?: string | Date | null;
}

export interface CargoStageMeta {
  step: CargoStage;
  label: string;
  shortLabel: string;
  location: string;
}

export const CARGO_STAGES: readonly CargoStageMeta[] = [
  {
    step: 1,
    label: "Xitoy omborida qabul qilindi",
    shortLabel: "Xitoy ombori",
    location: "Yiwu / Guanchjou",
  },
  {
    step: 2,
    label: "Bojxona / Yo'lda",
    shortLabel: "Bojxona / Yo'lda",
    location: "Xitoy → O'zbekiston",
  },
  {
    step: 3,
    label: "Toshkentga yetib keldi",
    shortLabel: "Toshkent ombori",
    location: "Toshkent",
  },
  {
    step: 4,
    label: "Pochta (BTS / Fargo / Kuryer) ga topshirildi",
    shortLabel: "Pochta / Kuryer",
    location: "Mijozga yetkazish",
  },
] as const;

export function getCargoStageMeta(step: number): CargoStageMeta {
  const clamped = normalizeCargoStage(step);
  return CARGO_STAGES[clamped - 1];
}

export function normalizeCargoStage(
  rawCargoStatus: unknown,
  legacyOrderStatus?: string
): CargoStage {
  const parsed = Number(rawCargoStatus);
  if (parsed === 1 || parsed === 2 || parsed === 3 || parsed === 4) {
    return parsed;
  }

  switch (legacyOrderStatus) {
    case "delivered":
      return 4;
    case "shipped":
      return 2;
    case "paid":
    case "pending":
    case "verifying":
    default:
      return 1;
  }
}

export function toIsoStringOrNull(value: unknown): string | null {
  if (!value) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString();
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }
  if (typeof value === "string" && value.trim()) {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }
  return null;
}

export function formatCargoTimestamp(value?: string | number | Date | null): string {
  const iso = toIsoStringOrNull(value);
  if (!iso) return "";
  const date = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  // Deterministic UTC+5 (Tashkent) formatting so SSR and client never mismatch
  const tashkentMs = date.getTime() + 5 * 60 * 60 * 1000;
  const local = new Date(tashkentMs);
  const day = pad(local.getUTCDate());
  const month = pad(local.getUTCMonth() + 1);
  const year = local.getUTCFullYear();
  const hours = pad(local.getUTCHours());
  const minutes = pad(local.getUTCMinutes());
  return `${day}.${month}.${year} · ${hours}:${minutes}`;
}
