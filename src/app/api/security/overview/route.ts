import { NextRequest, NextResponse } from "next/server";
import { verifyNextAdminDevice } from "@/lib/adminAuth";
import { extractClientContext, getSecurityOverview } from "@/lib/securityEngine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const adminDevice = await verifyNextAdminDevice(request);
    if (!adminDevice) {
      return NextResponse.json(
        { error: "Xavfsizlik markazini ko'rish uchun admin ruxsati talab qilinadi" },
        { status: 403 }
      );
    }

    const ctx = extractClientContext(request);
    const overview = await getSecurityOverview(ctx.ip);

    return NextResponse.json({
      success: true,
      ...overview,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Xavfsizlik ma'lumotlarini yuklashda xatolik yuz berdi" },
      { status: 500 }
    );
  }
}
