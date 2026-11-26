import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getDb, isMongoConfigured } from "@/lib/mongodb";
import { verifyNextAdminDevice } from "@/lib/adminAuth";
import { enforceApiSecurity } from "@/lib/securityEngine";
import { sendWebPushToUsers } from "@/lib/webPush";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TEN_MINUTES_MS = 10 * 60 * 1000;
const AUCTION_ID_PATTERN = /^[a-zA-Z0-9_-]{1,80}$/;

function isAuthorizedCron(request: NextRequest): boolean {
  const expected = (process.env.CRON_SECRET || "").trim();
  if (!expected) return false;
  const auth = (request.headers.get("authorization") || "").trim();
  if (!auth.startsWith("Bearer ")) return false;
  const token = auth.slice(7).trim();
  if (token.length !== expected.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expected));
  } catch {
    return false;
  }
}

async function runEndingAuctionNotifications(
  request: NextRequest,
  specificAuctionId?: string
) {
  const blocked = await enforceApiSecurity(request);
  if (blocked) return blocked;

  try {
    const isCron = isAuthorizedCron(request);
    const adminDevice = isCron ? { id: "cron" } : await verifyNextAdminDevice(request);
    if (!adminDevice) {
      return NextResponse.json(
        { error: "Auksion ogohlantirishini ishga tushirish uchun admin yoki cron ruxsati talab qilinadi" },
        { status: 403 }
      );
    }

    if (!isMongoConfigured()) {
      return NextResponse.json(
        { error: "MONGODB_URI muhit o'zgaruvchisi sozlanmagan" },
        { status: 503 }
      );
    }

    const db = await getDb();
    const nowMs = Date.now();
    const nowIso = new Date(nowMs).toISOString();
    const tenMinLaterIso = new Date(nowMs + TEN_MINUTES_MS).toISOString();

    const query: Record<string, unknown> = {
      status: "LIVE",
      endsAt: { $gt: nowIso, $lte: tenMinLaterIso },
      ending10mNotifiedAt: { $exists: false },
    };

    if (specificAuctionId) {
      if (!AUCTION_ID_PATTERN.test(specificAuctionId)) {
        return NextResponse.json(
          { error: "Noto'g'ri auksion identifikatori" },
          { status: 400 }
        );
      }
      query.id = specificAuctionId;
      delete query.endsAt;
      delete query.ending10mNotifiedAt;
    }

    const candidates = await db.collection("auctions").find(query).toArray();
    const results: Array<{
      auctionId: string;
      title: string;
      participants: number;
      sent: number;
      failed: number;
    }> = [];

    for (const auction of candidates) {
      const auctionId = String(auction.id || "");
      if (!auctionId) continue;

      // Atomically claim the 10-minute alert flag so concurrent cron calls never double-notify
      if (!specificAuctionId) {
        const claimed = await db.collection("auctions").findOneAndUpdate(
          { id: auctionId, ending10mNotifiedAt: { $exists: false } },
          { $set: { ending10mNotifiedAt: nowIso } },
          { returnDocument: "after" }
        );
        if (!claimed) continue;
      } else {
        await db.collection("auctions").updateOne(
          { id: auctionId },
          { $set: { ending10mNotifiedAt: nowIso } }
        );
      }

      const bidDocs = await db
        .collection("bids")
        .find({ auctionId }, { projection: { userId: 1 } })
        .toArray();

      const participantIds = new Set<string>();
      for (const b of bidDocs) {
        if (typeof b?.userId === "string" && b.userId.trim()) {
          participantIds.add(b.userId.trim());
        }
      }
      if (typeof auction.highestBidderId === "string" && auction.highestBidderId.trim()) {
        participantIds.add(auction.highestBidderId.trim());
      }
      if (typeof auction.sellerId === "string" && auction.sellerId.trim()) {
        participantIds.add(auction.sellerId.trim());
      }

      const idsArray = Array.from(participantIds);
      const titleText = String(auction.title || "Jonli Auksion");

      const pushRes = await sendWebPushToUsers(idsArray, {
        title: "⏳ Auksion yakunlanmoqda!",
        body: `⏳ Auksion tugashiga 10 daqiqa qoldi! Oxirgi stavkani boy bermang — ${titleText}`,
        url: "/?view=live_auction",
        tag: `yuyu-auction-ending-${auctionId}`,
      });

      results.push({
        auctionId,
        title: titleText,
        participants: idsArray.length,
        sent: pushRes.sent,
        failed: pushRes.failed,
      });
    }

    return NextResponse.json({
      success: true,
      checkedAt: nowIso,
      notifiedAuctions: results.length,
      results,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Auksion bildirishnomalarini yuborishda xatolik" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const auctionId = (searchParams.get("auctionId") || "").trim() || undefined;
  return runEndingAuctionNotifications(request, auctionId);
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const auctionId =
    body && typeof body.auctionId === "string" && body.auctionId.trim()
      ? body.auctionId.trim()
      : undefined;
  return runEndingAuctionNotifications(request, auctionId);
}
