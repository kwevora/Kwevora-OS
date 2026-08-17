import { NextResponse } from "next/server";
import { profitCashFlowController } from "../../../lib/ProfitCashFlowController";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET() {
  return NextResponse.json({
    success: true,
    finance: await profitCashFlowController.summary(),
  });
}
export async function POST(request: Request) {
  try {
    const b = (await request.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;
    if (b.action === "configure") await profitCashFlowController.configure(b);
    else if (b.action === "add_expense")
      await profitCashFlowController.addExpense(b);
    else if (b.action === "record_payout")
      await profitCashFlowController.recordPayout(b);
    else if (b.action === "approve_budget")
      await profitCashFlowController.approveBudget(b.amount);
    else
      return NextResponse.json(
        { success: false, message: "A valid financial action is required." },
        { status: 400 },
      );
    return NextResponse.json({
      success: true,
      finance: await profitCashFlowController.summary(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "KAI could not update profit and cash flow.",
      },
      { status: 409 },
    );
  }
}
