import { NextResponse } from "next/server";
import { autonomousGrowthPlanRepository } from "../../../lib/database/AutonomousGrowthPlanRepository";
import { growthPlanExecutionEngine } from "../../../lib/GrowthPlanExecutionEngine";
import { revenueOptimizationEngine } from "../../../lib/RevenueOptimizationEngine";
import { weeklyRecoveryBrain } from "../../../lib/WeeklyRecoveryBrain";
import { revenueAttributionBrain } from "../../../lib/RevenueAttributionBrain";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function assess() {
  const stored = await autonomousGrowthPlanRepository.latest();
  if (!stored) return null;
  const progress = await growthPlanExecutionEngine.progress(stored);
  return await weeklyRecoveryBrain.recover({
    plan: progress.plan,
    progress,
    optimization: revenueOptimizationEngine.optimize(
      await revenueAttributionBrain.report(),
    ),
  });
}

export async function GET() {
  try {
    return NextResponse.json({ success: true, recovery: await assess() });
  } catch (error) {
    console.error("Weekly recovery assessment failed:", error);
    return NextResponse.json(
      {
        success: false,
        recovery: null,
        message: "KAI could not assess the weekly recovery plan.",
      },
      { status: 500 },
    );
  }
}

export async function POST() {
  try {
    const recovery = await assess();
    if (!recovery)
      return NextResponse.json({
        success: true,
        recovery: null,
        message: "No active growth plan needs recovery.",
      });
    const plan = await autonomousGrowthPlanRepository.save(recovery.plan);
    return NextResponse.json({
      success: true,
      recovery: { ...recovery, plan },
      progress: await growthPlanExecutionEngine.progress(plan),
    });
  } catch (error) {
    console.error("Weekly recovery failed:", error);
    return NextResponse.json(
      {
        success: false,
        recovery: null,
        message: "KAI could not safely recover the weekly plan.",
      },
      { status: 500 },
    );
  }
}
