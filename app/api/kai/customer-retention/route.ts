import { NextResponse } from "next/server";
import { customerRetentionEngine } from "../../../lib/CustomerRetentionEngine";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET() {
  return NextResponse.json({
    success: true,
    retention: await customerRetentionEngine.summary(),
  });
}
export async function POST(request: Request) {
  try {
    const b = (await request.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;
    if (b.action === "approve" && typeof b.actionId === "string")
      await customerRetentionEngine.approve(b.actionId);
    else if (b.action === "dismiss" && typeof b.actionId === "string")
      await customerRetentionEngine.dismiss(b.actionId);
    else if (b.action === "refresh") await customerRetentionEngine.refresh();
    else
      return NextResponse.json(
        { success: false, message: "A valid retention action is required." },
        { status: 400 },
      );
    return NextResponse.json({
      success: true,
      retention: await customerRetentionEngine.summary(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "KAI could not update customer retention.",
      },
      { status: 409 },
    );
  }
}
