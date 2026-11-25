import { NextResponse, type NextRequest } from "next/server";
import { detectThreatFromRequest, extractClientContext, isLoopbackIp } from "@/lib/securityRules";

/**
 * Next.js 16 Proxy — Layer 1 Edge/Perimeter Anti-Hack Shield.
 * Intercepts exploit probes, honeypot paths (/.env, /wp-admin, /.git, ...),
 * SQLi/NoSQLi/XSS payloads, and automated scanners before they reach any page or API,
 * forwarding them to /api/security/trap for permanent MongoDB IP banning + Telegram alert.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // Never intercept Next.js internal static chunks, images, or SEO metadata files
  if (
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/images/") ||
    pathname === "/favicon.ico" ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml" ||
    pathname === "/api/security/trap" ||
    pathname === "/api/health"
  ) {
    return NextResponse.next();
  }

  // Verified admin device requests pass Layer 1 and are verified strictly in Layer 2
  const hasAdminToken = Boolean((request.headers.get("x-admin-device-token") || "").trim());
  const ctx = extractClientContext(request);

  if (!hasAdminToken) {
    const threat = detectThreatFromRequest({
      pathname,
      search,
      userAgent: ctx.userAgent,
      strictScannerBlock: true,
      isLoopback: isLoopbackIp(ctx.ip),
    });

    if (threat.detected) {
      const trapUrl = request.nextUrl.clone();
      trapUrl.pathname = "/api/security/trap";
      trapUrl.search = "";

      const forwardHeaders = new Headers(request.headers);
      forwardHeaders.set("x-yuyu-orig-path", `${pathname}${search}`.slice(0, 260));
      forwardHeaders.set("x-yuyu-orig-method", request.method);
      forwardHeaders.set("x-yuyu-threat-type", encodeURIComponent(threat.attackType));
      forwardHeaders.set("x-yuyu-threat-reason", encodeURIComponent(threat.reason));
      forwardHeaders.set("x-yuyu-threat-severity", threat.severity);
      if (threat.payloadSnippet) {
        forwardHeaders.set(
          "x-yuyu-threat-payload",
          encodeURIComponent(threat.payloadSnippet.slice(0, 220))
        );
      }

      return NextResponse.rewrite(trapUrl, {
        request: { headers: forwardHeaders },
      });
    }
  }

  const response = NextResponse.next();
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("X-DNS-Prefetch-Control", "on");
  response.headers.set("X-Permitted-Cross-Domain-Policies", "none");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
