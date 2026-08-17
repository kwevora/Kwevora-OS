import { NextResponse } from "next/server";
import { stanStoreIntegrationEngine, importNormalizedStanRows } from "../../../lib/StanStoreIntegrationEngine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ success: true, stan: await stanStoreIntegrationEngine.summary() });
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({})) as Record<string, unknown>;
    if (body.action === "configure") await stanStoreIntegrationEngine.configure(body);
    else if (body.action === "import_rows" && Array.isArray(body.rows)) await importNormalizedStanRows(body.rows as Record<string, unknown>[]);
    else if (body.action === "request_refund") await stanStoreIntegrationEngine.requestRefund(body);
    else if (body.action === "approve_refund_exception" && typeof body.reviewId === "string") await stanStoreIntegrationEngine.decideRefund(body.reviewId, true, String(body.note ?? ""));
    else if (body.action === "deny_refund" && typeof body.reviewId === "string") await stanStoreIntegrationEngine.decideRefund(body.reviewId, false, String(body.note ?? ""));
    else return NextResponse.json({ success: false, message: "A valid Stan Store action is required." }, { status: 400 });
    return NextResponse.json({ success: true, stan: await stanStoreIntegrationEngine.summary() });
  } catch (error) {
    return NextResponse.json({ success: false, message: error instanceof Error ? error.message : "KAI could not update Stan Store operations." }, { status: 409 });
  }
}
