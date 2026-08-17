import { NextResponse } from "next/server";

import {
  morningLearningReportEngine,
} from "@/app/lib/MorningLearningReport";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const report =
      await morningLearningReportEngine.build();

    return NextResponse.json({
      success: true,
      report,
    });
  } catch (error) {
    console.error(
      "Morning learning report failed:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        report: null,
        message:
          "KAI could not load the morning learning report.",
      },
      {
        status: 500,
      },
    );
  }
}
