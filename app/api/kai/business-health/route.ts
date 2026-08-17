import { NextResponse } from "next/server";
import { businessHealthExecutiveEngine } from "../../../lib/BusinessHealthExecutiveEngine";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET() {
  return NextResponse.json({
    success: true,
    executive: await businessHealthExecutiveEngine.summary(),
  });
}
export async function POST(request: Request) {
  try {
    const b = (await request.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;
    if (b.action === "approve_priority")
      await businessHealthExecutiveEngine.approve();
    else if (b.action === "pause_priority")
      await businessHealthExecutiveEngine.pause();
    else if (b.action !== "refresh")
      return NextResponse.json(
        { success: false, message: "A valid executive action is required." },
        { status: 400 },
      );
    return NextResponse.json({
      success: true,
      executive: await businessHealthExecutiveEngine.summary(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "KAI could not update business health.",
      },
      { status: 409 },
    );
  }
}
