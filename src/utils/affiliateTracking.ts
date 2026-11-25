const LS_KEY = 'yuyu_affiliate_ref_v1';
const COOKIE_KEY = 'yuyu_ref';
const SESSION_CLICK_PREFIX = 'yuyu_aff_clicked_';
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const THIRTY_DAYS_SEC = 30 * 24 * 60 * 60;

export function sanitizeRefCode(raw: string | null | undefined): string {
  return String(raw || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, '')
    .slice(0, 20);
}

function readCookie(name: string): string | null {
  try {
    const match = document.cookie
      .split('; ')
      .find((row) => row.startsWith(`${name}=`));
    if (!match) return null;
    return decodeURIComponent(match.split('=').slice(1).join('='));
  } catch {
    return null;
  }
}

export function storeAffiliateRef(code: string): void {
  const clean = sanitizeRefCode(code);
  if (clean.length < 3) return;
  const payload = {
    code: clean,
    savedAt: Date.now(),
    expiresAt: Date.now() + THIRTY_DAYS_MS
  };
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(payload));
  } catch {}
  try {
    document.cookie = `${COOKIE_KEY}=${encodeURIComponent(clean)}; max-age=${THIRTY_DAYS_SEC}; path=/; SameSite=Lax`;
  } catch {}
}

export function getStoredAffiliateRef(): string | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.code && typeof parsed.expiresAt === 'number') {
        if (parsed.expiresAt > Date.now()) {
          const clean = sanitizeRefCode(parsed.code);
          if (clean.length >= 3) return clean;
        } else {
          localStorage.removeItem(LS_KEY);
        }
      }
    }
  } catch {}

  const cookieVal = readCookie(COOKIE_KEY);
  const cleanCookie = sanitizeRefCode(cookieVal);
  if (cleanCookie.length >= 3) {
    return cleanCookie;
  }
  return null;
}

/**
 * Captures ?ref=CODE from the current URL (last-click attribution, 30 days)
 * and records at most 1 click per session per refCode via /api/affiliate/click.
 */
export function captureAffiliateRefFromUrl(): string | null {
  try {
    const params = new URLSearchParams(window.location.search);
    const rawRef = params.get('ref');
    const clean = sanitizeRefCode(rawRef);
    if (clean.length < 3) return null;

    storeAffiliateRef(clean);

    const sessionKey = `${SESSION_CLICK_PREFIX}${clean}`;
    let alreadyClicked = false;
    try {
      alreadyClicked = sessionStorage.getItem(sessionKey) === '1';
      if (!alreadyClicked) {
        sessionStorage.setItem(sessionKey, '1');
      }
    } catch {}

    if (!alreadyClicked) {
      fetch('/api/affiliate/click', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refCode: clean })
      }).catch(() => {});
    }

    return clean;
  } catch {
    return null;
  }
}

export function extractDeepLinkProductId(pathname: string): string | null {
  const match = String(pathname || '').match(/^\/product\/([^/?#]+)/i);
  if (!match || !match[1]) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}
