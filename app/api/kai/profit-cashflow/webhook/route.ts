import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { profitCashFlowController } from "../../../../lib/ProfitCashFlowController";
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
          message: "Financial webhook verification is not configured.",
        },
        { status: 503 },
      );
    const raw = await request.text(),
      signature = request.headers.get("x-kwevora-signature") ?? "";
    if (!signature || !valid(raw, signature, secret))
      return NextResponse.json(
        { success: false, message: "Invalid financial webhook signature." },
        { status: 401 },
      );
    const body = JSON.parse(raw) as Record<string, unknown>,
      type = String(body.eventType ?? "");
    if (type.startsWith("payout."))
      await profitCashFlowController.recordPayout({
        ...body,
        status: type.split(".")[1],
      });
    else if (type === "fee.charged")
      await profitCashFlowController.addExpense({
        ...body,
        category: body.category ?? "transaction_fee",
      });
    else
      throw new Error(
        "Supported events are payout.pending, payout.paid, payout.failed, and fee.charged.",
      );
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error ? error.message : "Financial event failed.",
      },
      { status: 400 },
    );
  }
}
