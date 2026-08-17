import { NextRequest, NextResponse } from "next/server";
import { inspectProduct } from "../../../lib/ProductIntelligenceEngine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({})) as { sourceUrl?: unknown };
    const sourceUrl = typeof body.sourceUrl === "string" ? body.sourceUrl.trim() : "";
    const product = await inspectProduct(sourceUrl);
    return NextResponse.json({ success: true, product });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "KAI could not inspect the product." },
      { status: 400 },
    );
  }
}
