import type { NextRequest } from "next/server";
import expressApp from "@/server/expressApp";
import { runExpressHandler } from "@/lib/expressBridge";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function handleApiRequest(request: NextRequest) {
  return runExpressHandler(expressApp, request);
}

export const GET = handleApiRequest;
export const POST = handleApiRequest;
export const PUT = handleApiRequest;
export const PATCH = handleApiRequest;
export const DELETE = handleApiRequest;
export const OPTIONS = handleApiRequest;
export const HEAD = handleApiRequest;
