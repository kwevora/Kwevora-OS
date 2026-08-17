import { NextResponse } from "next/server";
import { autonomousGrowthPlanner } from "../../../lib/AutonomousGrowthPlanner";
import { autonomousGrowthPlanRepository } from "../../../lib/database/AutonomousGrowthPlanRepository";
import { revenueOptimizationEngine } from "../../../lib/RevenueOptimizationEngine";
import { growthPlanExecutionEngine } from "../../../lib/GrowthPlanExecutionEngine";
import { revenueAttributionBrain } from "../../../lib/RevenueAttributionBrain";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const stored = await autonomousGrowthPlanRepository.latest();
    return NextResponse.json({
      success: true,
      plan: stored,
      progress: stored
        ? await growthPlanExecutionEngine.progress(stored)
        : null,
    });
  } catch (error) {
    console.error("Growth plan load failed:", error);
    return NextResponse.json(
      {
        success: false,
        plan: null,
        message: "KAI could not load the growth plan.",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      postsPerWeek?: unknown;
    };
    const postsPerWeek =
      typeof body.postsPerWeek === "number" &&
      Number.isFinite(body.postsPerWeek)
        ? body.postsPerWeek
        : undefined;
    const plan = await autonomousGrowthPlanRepository.save(
      autonomousGrowthPlanner.plan(
        revenueOptimizationEngine.optimize(
          await revenueAttributionBrain.report(),
        ),
        {
          postsPerWeek,
          fallback: {
            product: "KWEVORA Content Planner",
            offer: "KWEVORA Content Planner",
            platform: "TikTok",
          },
        },
      ),
    );
    return NextResponse.json({
      success: true,
      plan,
      progress: await growthPlanExecutionEngine.progress(plan),
    });
  } catch (error) {
    console.error("Growth plan creation failed:", error);
    return NextResponse.json(
      {
        success: false,
        plan: null,
        message: "KAI could not prepare the growth plan.",
      },
      { status: 500 },
    );
  }
}
