import crypto from "node:crypto";
import type { NextRequest } from "next/server";
import { getDb, isMongoConfigured } from "./mongodb";

export function hashAdminDeviceToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * Verifies the `x-admin-device-token` header against MongoDB `adminDevices`.
 * Returns the active device document if authorized, otherwise null.
 */
export async function verifyNextAdminDevice(request: NextRequest) {
  if (!isMongoConfigured()) return null;
  const rawToken = (request.headers.get("x-admin-device-token") || "").trim();
  if (!rawToken) return null;

  const db = await getDb();
  const tokenHash = hashAdminDeviceToken(rawToken);
  const device = await db.collection("adminDevices").findOne({
    tokenHash,
    revokedAt: null,
  });
  return device || null;
}
