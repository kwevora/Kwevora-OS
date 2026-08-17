import { NextResponse } from "next/server";
import { autonomousVideoQueueEngine } from "../../../lib/AutonomousVideoQueueEngine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET() {
  try {
    return NextResponse.json({
      success: true,
      queue: await autonomousVideoQueueEngine.summary(),
    });
  } catch (error) {
    console.error("Video queue load failed:", error);
    return NextResponse.json(
      {
        success: false,
        queue: null,
        message: "KAI could not load video production.",
      },
      { status: 500 },
    );
  }
}

export async function POST() {
  try {
    const job = await autonomousVideoQueueEngine.processNext();
    return NextResponse.json({
      success: true,
      job,
      queue: await autonomousVideoQueueEngine.summary(),
      message: job
        ? "KAI processed the next authorized video job."
        : "No authorized video job is ready.",
    });
  } catch (error) {
    console.error("Video queue processing failed:", error);
    return NextResponse.json(
      {
        success: false,
        job: null,
        message: "KAI could not process the video queue.",
      },
      { status: 500 },
    );
  }
}
