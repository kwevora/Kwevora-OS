import { NextResponse } from "next/server";
import { customerAcquisitionEngine } from "../../../lib/CustomerAcquisitionEngine";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET() {
  return NextResponse.json({
    success: true,
    pipeline: await customerAcquisitionEngine.summary(),
  });
}
export async function POST(request: Request) {
  try {
    const b = (await request.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;
    if (b.action === "approve_followup" && typeof b.followupId === "string")
      await customerAcquisitionEngine.approve(b.followupId);
    else if (
      b.action === "dismiss_followup" &&
      typeof b.followupId === "string"
    )
      await customerAcquisitionEngine.dismiss(b.followupId);
    else
      return NextResponse.json(
        {
          success: false,
          message: "A valid customer-acquisition action is required.",
        },
        { status: 400 },
      );
    return NextResponse.json({
      success: true,
      pipeline: await customerAcquisitionEngine.summary(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "KAI could not update the customer pipeline.",
      },
      { status: 409 },
    );
  }
}
