export const ADMIN_DEVICE_TOKEN_KEY = 'yuyu_admin_device_token';
export const RECENT_CLIENT_KEY = 'yuyu_recent_client';

export const UZ_REGIONS = [
  'Toshkent shahri',
  'Toshkent viloyati',
  'Samarqand',
  'Buxoro',
  'Andijon',
  "Farg'ona",
  'Namangan',
  'Qashqadaryo',
  'Surxondaryo',
  'Xorazm',
  'Navoiy',
  'Jizzax',
  'Sirdaryo',
  "Qoraqalpog'iston"
];

/**
 * Extracts up to 9 local Uzbekistan subscriber digits from any user input.
 * Accepts formats like "+998 90 123 45 67", "998901234567", "901234567", etc.
 */
export function extractLocalUzDigits(input: string): string {
  let digits = (input || '').replace(/\D/g, '');
  if (digits.startsWith('998')) {
    digits = digits.slice(3);
  }
  return digits.slice(0, 9);
}

/**
 * Formats local Uzbekistan digits into spaced display format: "90 123 45 67"
 */
export function formatLocalUzDigits(localDigits: string): string {
  const d = localDigits.replace(/\D/g, '').slice(0, 9);
  const p1 = d.slice(0, 2);
  const p2 = d.slice(2, 5);
  const p3 = d.slice(5, 7);
  const p4 = d.slice(7, 9);
  return [p1, p2, p3, p4].filter(Boolean).join(' ');
}

/**
 * Formats any phone string into "+998 90 123 45 67"
 */
export function formatFullUzPhone(input: string): string {
  const local = extractLocalUzDigits(input);
  if (!local) return '+998';
  return `+998 ${formatLocalUzDigits(local)}`;
}

/**
 * Normalizes a valid 9-digit local input into "+998901234567" for consistent DB keys.
 */
export function toNormalizedUzPhone(input: string): string {
  const local = extractLocalUzDigits(input);
  if (local.length === 9) {
    return `+998${local}`;
  }
  return (input || '').trim();
}

/**
 * Detects major Uzbekistan mobile operators from the 2-digit prefix.
 */
export function getUzOperatorName(localDigits: string): string | null {
  if (localDigits.length < 2) return null;
  const code = localDigits.slice(0, 2);
  if (code === '90' || code === '91') return 'Beeline';
  if (code === '93' || code === '94' || code === '50') return 'Ucell';
  if (code === '95' || code === '99' || code === '77') return 'Uzmobile';
  if (code === '97' || code === '88') return 'Mobiuz';
  if (code === '33') return 'Humans';
  if (code === '98') return 'Perfectum';
  if (code === '71' || code === '70') return 'Shahar raqami';
  return null;
}

export function getSuggestedDeviceLabel(): string {
  if (typeof navigator === 'undefined') return 'Mening kompyuterim';
  const ua = navigator.userAgent || '';
  let os = 'Kompyuter';
  if (/Windows/i.test(ua)) os = 'Windows kompyuter';
  else if (/Macintosh|Mac OS/i.test(ua)) os = 'Mac kompyuter';
  else if (/iPhone/i.test(ua)) os = 'iPhone';
  else if (/iPad/i.test(ua)) os = 'iPad';
  else if (/Android/i.test(ua)) os = 'Android qurilma';
  else if (/Linux/i.test(ua)) os = 'Linux kompyuter';

  let browser = '';
  if (/Edg\//i.test(ua)) browser = 'Edge';
  else if (/OPR\/|Opera/i.test(ua)) browser = 'Opera';
  else if (/Chrome\//i.test(ua)) browser = 'Chrome';
  else if (/Safari\//i.test(ua)) browser = 'Safari';
  else if (/Firefox\//i.test(ua)) browser = 'Firefox';

  return browser ? `${os} (${browser})` : os;
}

export const LEGACY_ADMIN_TOKEN_KEY = 'admin_token';

export function readStoredAdminDeviceToken(): string {
  try {
    return (
      localStorage.getItem(ADMIN_DEVICE_TOKEN_KEY) ||
      localStorage.getItem(LEGACY_ADMIN_TOKEN_KEY) ||
      ''
    ).trim();
  } catch {
    return '';
  }
}

export function writeStoredAdminDeviceToken(token: string) {
  try {
    if (token) {
      localStorage.setItem(ADMIN_DEVICE_TOKEN_KEY, token);
    } else {
      localStorage.removeItem(ADMIN_DEVICE_TOKEN_KEY);
      localStorage.removeItem(LEGACY_ADMIN_TOKEN_KEY);
    }
  } catch {}
}

export interface RecentClientProfile {
  username: string;
  phoneNumber: string;
}

export function readRecentClient(): RecentClientProfile | null {
  try {
    const raw = localStorage.getItem(RECENT_CLIENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.phoneNumber && parsed?.username) {
      return { username: String(parsed.username), phoneNumber: String(parsed.phoneNumber) };
    }
    return null;
  } catch {
    return null;
  }
}

export function writeRecentClient(profile: RecentClientProfile | null) {
  try {
    if (profile) {
      localStorage.setItem(RECENT_CLIENT_KEY, JSON.stringify(profile));
    } else {
      localStorage.removeItem(RECENT_CLIENT_KEY);
    }
  } catch {}
}
