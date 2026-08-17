import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { customerRetentionEngine } from "../../../../lib/CustomerRetentionEngine";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
function valid(raw: string, provided: string, secret: string) {
  const a = Buffer.from(createHmac("sha256", secret).update(raw).digest("hex")),
    b = Buffer.from(provided.replace(/^sha256=/, ""));
  return a.length === b.length && timingSafeEqual(a, b);
}
export async function POST(request: Request) {
  try {
    const secret = process.env.COMMERCE_WEBHOOK_SECRET;
    if (!secret)
      return NextResponse.json(
        {
          success: false,
          message: "Customer-retention webhook verification is not configured.",
        },
        { status: 503 },
      );
    const raw = await request.text(),
      signature = request.headers.get("x-kwevora-signature") ?? "";
    if (!signature || !valid(raw, signature, secret))
      return NextResponse.json(
        {
          success: false,
          message: "Invalid customer-retention webhook signature.",
        },
        { status: 401 },
      );
    const result = await customerRetentionEngine.ingest(
      JSON.parse(raw) as Record<string, unknown>,
    );
    return NextResponse.json({ success: true, duplicate: result.duplicate });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "KAI could not process the lifecycle event.",
      },
      { status: 400 },
    );
  }
}
