import { NextResponse } from "next/server";
import { performanceCommandCenter } from "../../../lib/PerformanceCommandCenter";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json({
      success: true,
      report: await performanceCommandCenter.build(),
    });
  } catch (error) {
    console.error("Performance Command Center failed:", error);
    return NextResponse.json(
      {
        success: false,
        report: null,
        message: "KAI could not load the Performance Command Center.",
      },
      { status: 500 },
    );
  }
}
