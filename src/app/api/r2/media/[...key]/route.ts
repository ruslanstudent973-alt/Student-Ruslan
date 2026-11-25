import { NextRequest, NextResponse } from "next/server";
import { verifyNextAdminDevice } from "@/lib/adminAuth";
import {
  deleteFromR2,
  getObjectFromR2,
  isR2Configured,
  validateR2Key,
} from "@/lib/r2";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ key: string[] }> }
) {
  try {
    if (!isR2Configured()) {
      return NextResponse.json(
        { error: "Cloudflare R2 sozlanmagan" },
        { status: 503 }
      );
    }

    const { key: keySegments } = await context.params;
    const key = validateR2Key(Array.isArray(keySegments) ? keySegments.join("/") : "");
    if (!key) {
      return NextResponse.json({ error: "Noto'g'ri fayl kaliti" }, { status: 400 });
    }

    const object = await getObjectFromR2(key);
    if (!object.Body) {
      return NextResponse.json({ error: "Fayl topilmadi" }, { status: 404 });
    }

    const bytes = await object.Body.transformToByteArray();
    const headers = new Headers();
    headers.set("Content-Type", object.ContentType || "application/octet-stream");
    headers.set("Cache-Control", "public, max-age=31536000, immutable");
    headers.set("X-Content-Type-Options", "nosniff");
    if (object.ETag) headers.set("ETag", object.ETag);

    return new NextResponse(new Uint8Array(bytes), {
      status: 200,
      headers,
    });
  } catch (err: any) {
    const code = err?.$metadata?.httpStatusCode;
    if (code === 404 || err?.name === "NoSuchKey") {
      return NextResponse.json({ error: "Fayl topilmadi" }, { status: 404 });
    }
    return NextResponse.json(
      { error: err?.message || "Faylni o'qishda xatolik" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ key: string[] }> }
) {
  try {
    const adminDevice = await verifyNextAdminDevice(request);
    if (!adminDevice) {
      return NextResponse.json(
        { error: "Faylni o'chirish uchun admin ruxsati talab qilinadi" },
        { status: 403 }
      );
    }

    if (!isR2Configured()) {
      return NextResponse.json(
        { error: "Cloudflare R2 sozlanmagan" },
        { status: 503 }
      );
    }

    const { key: keySegments } = await context.params;
    const key = validateR2Key(Array.isArray(keySegments) ? keySegments.join("/") : "");
    if (!key) {
      return NextResponse.json({ error: "Noto'g'ri fayl kaliti" }, { status: 400 });
    }

    await deleteFromR2(key);
    return NextResponse.json({ success: true, deletedKey: key });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Faylni o'chirishda xatolik" },
      { status: 500 }
    );
  }
}
