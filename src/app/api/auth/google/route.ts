import { NextRequest, NextResponse } from "next/server";
import connectToDatabase, { isMongoConfigured } from "@/lib/mongodb";
import { verifyNextAdminDevice } from "@/lib/adminAuth";
import {
  enforceApiSecurity,
  recordAuthorizedLogin,
  recordFailedAuthAttempt,
} from "@/lib/securityEngine";
import { extractClientContext } from "@/lib/securityRules";
import UserModel from "@/models/User";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface GoogleTokenInfo {
  sub?: string;
  aud?: string;
  iss?: string;
  email?: string;
  email_verified?: string | boolean;
  name?: string;
  given_name?: string;
  picture?: string;
  exp?: string;
  error_description?: string;
}

const VALID_ISSUERS = new Set([
  "accounts.google.com",
  "https://accounts.google.com",
]);

function isSafeHttpsUrl(raw: unknown): raw is string {
  if (typeof raw !== "string") return false;
  const trimmed = raw.trim();
  if (!trimmed || trimmed.length > 1500) return false;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function serializeUser(doc: any) {
  if (!doc) return null;
  const { _id, __v, password, ...rest } = doc;
  return {
    ...rest,
    vipTier:
      rest.vipTier === "SILVER" || rest.vipTier === "GOLD" || rest.vipTier === "DIAMOND"
        ? rest.vipTier
        : "NONE",
    totalSpent: Number(rest.totalSpent) || 0,
    cashbackBalance: Number(rest.cashbackBalance) || 0,
    referralBalance: Number(rest.referralBalance) || 0,
    invitedCount: Number(rest.invitedCount) || 0,
    isSubscribedVip: Boolean(rest.isSubscribedVip),
    vipExpiresAt: rest.vipExpiresAt || null,
    isAdmin: Boolean(rest.isAdmin),
  };
}

export async function POST(request: NextRequest) {
  const blocked = await enforceApiSecurity(request);
  if (blocked) return blocked;

  const clientCtx = extractClientContext(request);

  try {
    const expectedClientId = (
      process.env.GOOGLE_CLIENT_ID ||
      process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
      ""
    ).trim();

    if (!expectedClientId) {
      return NextResponse.json(
        {
          error:
            "Google orqali kirish hozircha sozlanmagan (GOOGLE_CLIENT_ID topilmadi).",
        },
        { status: 503 }
      );
    }

    if (!isMongoConfigured()) {
      return NextResponse.json(
        { error: "MONGODB_URI muhit o'zgaruvchisi sozlanmagan" },
        { status: 503 }
      );
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json(
        { error: "Noto'g'ri JSON so'rov tanasi" },
        { status: 400 }
      );
    }

    const credential =
      typeof body.credential === "string" ? body.credential.trim() : "";
    if (!credential || credential.length < 40 || credential.length > 6000) {
      return NextResponse.json(
        { error: "Google credential tokeni noto'g'ri yoki bo'sh" },
        { status: 400 }
      );
    }

    // Verify Google ID token using Google's official tokeninfo endpoint
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    let tokenInfo: GoogleTokenInfo | null = null;
    try {
      const verifyUrl = `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(
        credential
      )}`;
      const res = await fetch(verifyUrl, {
        method: "GET",
        headers: { Accept: "application/json" },
        cache: "no-store",
        signal: controller.signal,
      });

      if (!res.ok) {
        return NextResponse.json(
          { error: "Google tokeni haqiqiy emas yoki muddati tugagan" },
          { status: 401 }
        );
      }
      tokenInfo = (await res.json().catch(() => null)) as GoogleTokenInfo | null;
    } catch {
      return NextResponse.json(
        { error: "Google tekshiruv serveriga ulanib bo'lmadi. Qayta urinib ko'ring." },
        { status: 502 }
      );
    } finally {
      clearTimeout(timeout);
    }

    if (!tokenInfo || typeof tokenInfo !== "object") {
      return NextResponse.json(
        { error: "Google javobi noto'g'ri formatda" },
        { status: 401 }
      );
    }

    // Strict audience, issuer, expiry, subject, and verified-email checks
    const tokenAud = String(tokenInfo.aud || "").trim();
    if (tokenAud !== expectedClientId) {
      return NextResponse.json(
        { error: "Google ilova identifikatori (aud) mos kelmadi" },
        { status: 401 }
      );
    }

    if (tokenInfo.iss && !VALID_ISSUERS.has(String(tokenInfo.iss).trim())) {
      return NextResponse.json(
        { error: "Google token manbasi (iss) yaroqsiz" },
        { status: 401 }
      );
    }

    const expSec = Number(tokenInfo.exp || 0);
    if (Number.isFinite(expSec) && expSec > 0 && expSec * 1000 < Date.now()) {
      return NextResponse.json(
        { error: "Google sessiya muddati tugagan. Qayta urinib ko'ring." },
        { status: 401 }
      );
    }

    const googleId = String(tokenInfo.sub || "").trim();
    const email = String(tokenInfo.email || "").trim().toLowerCase();
    const emailVerified =
      tokenInfo.email_verified === true || tokenInfo.email_verified === "true";

    if (!googleId || !email || !emailVerified) {
      return NextResponse.json(
        { error: "Tasdiqlangan Google elektron pochtasi talab qilinadi" },
        { status: 401 }
      );
    }

    const displayName =
      String(tokenInfo.name || tokenInfo.given_name || email.split("@")[0] || "Foydalanuvchi")
        .trim()
        .slice(0, 100);
    const pictureUrl = isSafeHttpsUrl(tokenInfo.picture) ? tokenInfo.picture.trim() : "";

    await connectToDatabase();

    // Find existing account by googleId or email
    let userDoc = await UserModel.findOne({
      $or: [{ googleId }, { email }],
    }).lean();

    let isNewUser = false;

    if (userDoc) {
      if (userDoc.isAdmin) {
        const adminDev = await verifyNextAdminDevice(request);
        if (!adminDev) {
          await recordFailedAuthAttempt({
            ctx: clientCtx,
            path: "/api/auth/google",
            username: userDoc.username,
            phoneNumber: userDoc.phoneNumber || email,
            reason: "Ruxsat berilmagan qurilmadan Google orqali admin hisobiga kirish urinishi",
            isAdminRoute: true,
          });
          return NextResponse.json(
            {
              error:
                "Bu admin hisobiga faqat ruxsat berilgan qurilmadan Admin Panel orqali kirish mumkin",
              code: "ADMIN_DEVICE_REQUIRED",
            },
            { status: 403 }
          );
        }
      }

      const patch: Record<string, unknown> = {};
      if (!userDoc.googleId) patch.googleId = googleId;
      if (!userDoc.email) patch.email = email;
      if (!userDoc.avatar && pictureUrl) patch.avatar = pictureUrl;

      if (Object.keys(patch).length > 0) {
        userDoc = await UserModel.findOneAndUpdate(
          { _id: (userDoc as any)._id },
          { $set: patch },
          { new: true }
        ).lean();
      }
    } else {
      isNewUser = true;
      const newUserPayload = {
        username: displayName,
        telegramId: `google_${googleId}`,
        googleId,
        email,
        isAdmin: false,
        avatar: pictureUrl,
        bio: "YUYU Shop xaridori",
        referralBalance: 0,
        invitedCount: 0,
        vipTier: "NONE" as const,
        totalSpent: 0,
        cashbackBalance: 0,
        isSubscribedVip: false,
        vipExpiresAt: null,
        createdAt: Date.now(),
      };

      const created = await UserModel.create(newUserPayload);
      userDoc = created.toObject();
    }

    const safeUser = serializeUser(userDoc);

    void recordAuthorizedLogin({
      ctx: clientCtx,
      path: "/api/auth/google",
      username: safeUser.username || displayName,
      phoneNumber: safeUser.phoneNumber || email,
      isAdmin: Boolean(safeUser.isAdmin),
    });

    return NextResponse.json({
      success: true,
      isNewUser,
      user: safeUser,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Google orqali kirishda xatolik yuz berdi" },
      { status: 500 }
    );
  }
}
