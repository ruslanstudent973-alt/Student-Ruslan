import type { NextRequest } from "next/server";

export type SecuritySeverity = "critical" | "high" | "medium" | "info";

export interface ClientRequestContext {
  ip: string;
  country: string;
  city: string;
  userAgent: string;
  deviceSummary: string;
  isGoogleCrawler: boolean;
}

export interface ThreatDetectionResult {
  detected: boolean;
  attackType: string;
  severity: SecuritySeverity;
  reason: string;
  payloadSnippet?: string;
}

// Honeypot & exploit trap paths frequently probed by hackers and bots
const HONEYPOT_PATTERNS: RegExp[] = [
  /^\/\.env(?:\.|$)/i,
  /^\/\.git(?:\/|$)/i,
  /^\/\.aws(?:\/|$)/i,
  /^\/\.ssh(?:\/|$)/i,
  /^\/\.htaccess/i,
  /^\/\.htpasswd/i,
  /^\/\.ds_store/i,
  /^\/wp-admin(?:\/|$)/i,
  /^\/wp-login\.php/i,
  /^\/wp-content(?:\/|$)/i,
  /^\/wp-includes(?:\/|$)/i,
  /^\/xmlrpc\.php/i,
  /^\/phpmyadmin(?:\/|$)/i,
  /^\/pma(?:\/|$)/i,
  /^\/mysql(?:\/|$)/i,
  /^\/adminer(?:\.php|\/|$)/i,
  /^\/config\.php/i,
  /^\/configuration\.php/i,
  /^\/eval-stdin\.php/i,
  /^\/vendor\/phpunit/i,
  /^\/cgi-bin(?:\/|$)/i,
  /^\/actuator(?:\/|$)/i,
  /^\/server-status/i,
  /^\/telescope(?:\/|$)/i,
  /^\/etc\/passwd/i,
  /^\/proc\/self/i,
  /^\/(backup|dump|db|database|site)\.(sql|zip|tar|gz|bak)$/i,
  /^\/(shell|cmd|c99|r57|webshell|admin|login|install|setup)\.php$/i,
  /^\/debug\/vars/i,
  /^\/graphql\/console/i,
  /^\/api\/\.env/i,
];

// Malicious / automated vulnerability scanners & aggressive scrapers
const SCANNER_UA_PATTERNS: RegExp[] = [
  /sqlmap/i,
  /nikto/i,
  /nmap/i,
  /masscan/i,
  /zgrab/i,
  /zmap/i,
  /gobuster/i,
  /dirbuster/i,
  /dirsearch/i,
  /feroxbuster/i,
  /wfuzz/i,
  /\bffuf\b/i,
  /nuclei/i,
  /acunetix/i,
  /nessus/i,
  /burpsuite/i,
  /openvas/i,
  /wpscan/i,
  /hydra/i,
  /medusa/i,
  /havij/i,
  /arachni/i,
  /metasploit/i,
  /netsparker/i,
  /appscan/i,
  /qualys/i,
  /censys/i,
  /shodan/i,
  /scrapy/i,
  /python-requests/i,
  /python-urllib/i,
  /aiohttp/i,
  /go-http-client/i,
  /libwww-perl/i,
  /\bwget\b/i,
  /ahrefsbot/i,
  /semrushbot/i,
  /mj12bot/i,
  /dotbot/i,
  /blexbot/i,
  /bytespider/i,
  /petalbot/i,
  /gptbot/i,
  /ccbot/i,
  /claudebot/i,
  /headlesschrome/i,
  /phantomjs/i,
  /selenium/i,
  /playwright/i,
  /puppeteer/i,
  /subfinder/i,
  /\bhttpx\b/i,
];

// Official Google search indexing bots (allowed ONLY on clean public storefront pages)
const GOOGLE_CRAWLER_PATTERN =
  /googlebot|google-inspectiontool|adsbot-google|mediapartners-google|googleother/i;

// SQLi, NoSQLi, XSS, and Path Traversal payload patterns
const INJECTION_PATTERNS: Array<{ type: string; regex: RegExp; severity: SecuritySeverity }> = [
  {
    type: "SQL Inyeksiya",
    regex:
      /(\bunion\b[\s+%]+(?:all[\s+%]+)?\bselect\b|\binformation_schema\b|\bsleep\s*\(\s*\d+|\bbenchmark\s*\(|\bwaitfor\s+delay\b|(?:'|%27)\s*(?:or|and)\s*(?:'|%27)?\d+(?:'|%27)?\s*=\s*(?:'|%27)?\d+)/i,
    severity: "critical",
  },
  {
    type: "NoSQL Inyeksiya",
    regex: /(\$where|\$ne\b|\$gt\b|\$gte\b|\$lt\b|\$lte\b|\$regex\b|\$expr\b|\$function\b)/i,
    severity: "critical",
  },
  {
    type: "XSS Skript Urinishi",
    regex:
      /(<\s*script\b|%3c\s*script|javascript\s*:|on(?:error|load|click|mouseover|focus)\s*=|<\s*iframe\b|<\s*svg\b[^>]*on)/i,
    severity: "critical",
  },
  {
    type: "Fayl Tizimiga Chiqish (Path Traversal)",
    regex: /(\.\.\/|\.\.\\|%2e%2e%2f|%2e%2e\/|\.\.%2f|%252e%252e|\/etc\/passwd|c:\\windows\\)/i,
    severity: "critical",
  },
  {
    type: "Buyruq Inyeksiyasi (RCE)",
    regex: /(;\s*(?:cat|ls|whoami|id|wget|curl|sh|bash)\b|\|\s*(?:sh|bash|nc)\b|\$\(\s*(?:curl|wget|id|whoami))/i,
    severity: "critical",
  },
];

export function normalizeIp(raw?: string | null): string {
  if (!raw) return "unknown";
  let ip = String(raw).split(",")[0].trim();
  if (ip.startsWith("::ffff:")) {
    ip = ip.slice(7);
  }
  if (/^\d{1,3}(\.\d{1,3}){3}:\d+$/.test(ip)) {
    ip = ip.split(":")[0];
  }
  return ip.slice(0, 64) || "unknown";
}

export function isValidIpInput(raw: string): boolean {
  const ip = normalizeIp(raw);
  if (!ip || ip === "unknown") return false;
  const ipv4 =
    /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;
  const ipv6 = /^[0-9a-fA-F:]{2,45}$/;
  return ipv4.test(ip) || (ip.includes(":") && ipv6.test(ip));
}

export function isLoopbackIp(ip: string): boolean {
  const n = normalizeIp(ip);
  return n === "127.0.0.1" || n === "::1" || n === "localhost" || n === "unknown";
}

export function parseDeviceSummary(ua: string): string {
  const s = ua || "";
  if (!s) return "Noma'lum mijoz";
  if (GOOGLE_CRAWLER_PATTERN.test(s)) return "Google Qidiruv Boti";
  if (SCANNER_UA_PATTERNS.some((r) => r.test(s))) {
    return `Avtomatik Skaner (${s.slice(0, 32)})`;
  }

  let browser = "Brauzer";
  if (/Telegram/i.test(s)) browser = "Telegram WebView";
  else if (/Edg\//i.test(s)) browser = "Edge";
  else if (/OPR\/|Opera/i.test(s)) browser = "Opera";
  else if (/YaBrowser/i.test(s)) browser = "Yandex";
  else if (/SamsungBrowser/i.test(s)) browser = "Samsung Internet";
  else if (/Chrome\//i.test(s)) browser = "Chrome";
  else if (/Firefox\//i.test(s)) browser = "Firefox";
  else if (/Safari\//i.test(s)) browser = "Safari";
  else if (/curl\//i.test(s)) browser = "cURL";

  let os = "Qurilma";
  if (/iPhone/i.test(s)) os = "iPhone";
  else if (/iPad/i.test(s)) os = "iPad";
  else if (/Android/i.test(s)) os = "Android";
  else if (/Windows/i.test(s)) os = "Windows";
  else if (/Mac OS X|Macintosh/i.test(s)) os = "macOS";
  else if (/Linux/i.test(s)) os = "Linux";

  return `${browser} · ${os}`;
}

export function extractClientContextFromHeaders(
  getHeader: (name: string) => string | null | undefined
): ClientRequestContext {
  const rawIp =
    getHeader("cf-connecting-ip") ||
    getHeader("x-vercel-forwarded-for") ||
    getHeader("x-forwarded-for") ||
    getHeader("x-real-ip") ||
    "";
  const ip = normalizeIp(rawIp);
  const country = (
    getHeader("x-vercel-ip-country") ||
    getHeader("cf-ipcountry") ||
    ""
  )
    .trim()
    .slice(0, 48);

  let city = (getHeader("x-vercel-ip-city") || "").trim();
  try {
    city = decodeURIComponent(city);
  } catch {}
  city = city.slice(0, 64);

  const userAgent = (getHeader("user-agent") || "").trim().slice(0, 300);
  return {
    ip,
    country: country || (isLoopbackIp(ip) ? "Local" : "Noma'lum"),
    city: city || (isLoopbackIp(ip) ? "Server" : ""),
    userAgent,
    deviceSummary: parseDeviceSummary(userAgent),
    isGoogleCrawler: GOOGLE_CRAWLER_PATTERN.test(userAgent),
  };
}

export function extractClientContext(request: NextRequest): ClientRequestContext {
  return extractClientContextFromHeaders((name) => request.headers.get(name));
}

export function isPublicGoogleSafePath(pathname: string): boolean {
  return (
    pathname === "/" ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml" ||
    pathname.startsWith("/product/") ||
    pathname.startsWith("/catalog")
  );
}

/**
 * Pure, synchronous, zero-Node-dependency threat inspection (safe for Edge Proxy and Node API routes).
 */
export function detectThreatFromRequest(params: {
  pathname: string;
  search?: string;
  userAgent?: string;
  bodyText?: string;
  strictScannerBlock?: boolean;
  isLoopback?: boolean;
}): ThreatDetectionResult {
  const pathname = params.pathname || "/";
  let decodedPath = pathname;
  let decodedSearch = params.search || "";
  try {
    decodedPath = decodeURIComponent(pathname);
  } catch {}
  try {
    decodedSearch = decodeURIComponent(decodedSearch);
  } catch {}

  const ua = (params.userAgent || "").trim();
  const isGoogle = GOOGLE_CRAWLER_PATTERN.test(ua);

  // 1. Honeypot & exploit trap paths (ALWAYS critical, even if claiming to be Googlebot)
  for (const rx of HONEYPOT_PATTERNS) {
    if (rx.test(decodedPath) || rx.test(pathname)) {
      return {
        detected: true,
        attackType: isGoogle ? "Soxta Googlebot Tuzog'i" : "Maxfiy Fayl / Eksploit Qidiruvi",
        severity: "critical",
        reason: `Taqiqlangan tuzoq yo'liga murojaat: ${pathname.slice(0, 120)}`,
        payloadSnippet: `${pathname}${params.search || ""}`.slice(0, 220),
      };
    }
  }

  // 2. SQLi / NoSQLi / XSS / Path Traversal / RCE inspection in URL & query
  const inspectTarget = `${decodedPath} ${decodedSearch}`;
  for (const rule of INJECTION_PATTERNS) {
    if (rule.regex.test(inspectTarget)) {
      return {
        detected: true,
        attackType: rule.type,
        severity: rule.severity,
        reason: `So'rov manzilida zararli kod imzosi aniqlandi (${rule.type})`,
        payloadSnippet: inspectTarget.trim().slice(0, 220),
      };
    }
  }

  // Optional body inspection (skip huge binary/data-URI payloads)
  if (params.bodyText && params.bodyText.length > 0 && params.bodyText.length < 32_000) {
    for (const rule of INJECTION_PATTERNS) {
      if (rule.regex.test(params.bodyText)) {
        return {
          detected: true,
          attackType: rule.type,
          severity: rule.severity,
          reason: `So'rov tarkibida zararli payload aniqlandi (${rule.type})`,
          payloadSnippet: params.bodyText.slice(0, 220),
        };
      }
    }
  }

  // 3. Googlebot probing private/admin API routes is treated as spoofed attacker
  if (isGoogle && (pathname.startsWith("/api/admin") || pathname.startsWith("/api/security"))) {
    return {
      detected: true,
      attackType: "Soxta Googlebot (Admin Skaneri)",
      severity: "critical",
      reason: `Googlebot niqobi ostida yopiq marshrutga murojaat: ${pathname}`,
      payloadSnippet: ua.slice(0, 180),
    };
  }

  // 4. Automated vulnerability scanners & aggressive bots
  if (params.strictScannerBlock !== false) {
    for (const rx of SCANNER_UA_PATTERNS) {
      if (rx.test(ua)) {
        return {
          detected: true,
          attackType: "Avtomatik Skaner / Bot",
          severity: "high",
          reason: `Taqiqlangan skaner yoki avtomatik bot aniqlandi`,
          payloadSnippet: ua.slice(0, 200),
        };
      }
    }
    // Block suspicious empty/scripted UA on non-loopback non-public API routes
    if (
      !params.isLoopback &&
      !isGoogle &&
      (!ua || /^curl\//i.test(ua)) &&
      pathname.startsWith("/api/") &&
      pathname !== "/api/health" &&
      pathname !== "/api/security/trap"
    ) {
      return {
        detected: true,
        attackType: "Skript / CLI Avtomatik So'rov",
        severity: "high",
        reason: `Brauzersiz avtomatik API skanerlash aniqlandi (${ua || "bo'sh User-Agent"})`,
        payloadSnippet: `${pathname} · UA: ${ua || "none"}`.slice(0, 200),
      };
    }
  }

  return {
    detected: false,
    attackType: "",
    severity: "info",
    reason: "",
  };
}
