import { NextResponse } from "next/server";
import { autonomousGrowthPlanRepository } from "../../../lib/database/AutonomousGrowthPlanRepository";
import { weeklyLearningLoop } from "../../../lib/WeeklyLearningLoop";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const plan = await autonomousGrowthPlanRepository.latest();
    return NextResponse.json({
      success: true,
      review: plan ? await weeklyLearningLoop.summary(plan) : null,
    });
  } catch (error) {
    console.error("Weekly learning failed:", error);
    return NextResponse.json(
      {
        success: false,
        review: null,
        message: "KAI could not reconcile the weekly learning record.",
      },
      { status: 500 },
    );
  }
}
export async function POST() {
  return GET();
}
