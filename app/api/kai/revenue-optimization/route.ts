import { NextResponse } from "next/server";
import { revenueOptimizationEngine } from "../../../lib/RevenueOptimizationEngine";
import { revenueAttributionBrain } from "../../../lib/RevenueAttributionBrain";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json({
      success: true,
      optimization: revenueOptimizationEngine.optimize(
        await revenueAttributionBrain.report(),
      ),
    });
  } catch (error) {
    console.error("Revenue optimization failed:", error);
    return NextResponse.json(
      {
        success: false,
        optimization: null,
        message: "KAI could not optimize revenue strategy.",
      },
      { status: 500 },
    );
  }
}
