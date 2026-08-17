import { NextRequest, NextResponse } from "next/server";
import { instagramPublishingExecutor } from "../../../lib/publishing/InstagramPublishingExecutor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

function clean(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({})) as Record<string, unknown>;
    const accessToken = request.cookies.get("kwevora_meta_access_token")?.value?.trim() ?? "";
    const igUserId = request.cookies.get("kwevora_instagram_business_id")?.value?.trim() ?? "";
    if (!accessToken || !igUserId) {
      return NextResponse.json({ success: false, executed: false, message: "Connect an Instagram professional account before KAI publishes a Reel." }, { status: 401 });
    }
    const containerId = clean(body.containerId);
    if (body.action === "status") {
      if (!containerId) return NextResponse.json({ success: false, message: "An Instagram Reel container ID is required." }, { status: 400 });
      const status = await instagramPublishingExecutor.status(containerId, accessToken);
      if (["ERROR", "EXPIRED"].includes(status.statusCode)) {
        return NextResponse.json({ success: false, executed: false, containerId, status, message: status.status || `Instagram processing ended with ${status.statusCode}.` }, { status: 409 });
      }
      const media = status.statusCode === "FINISHED"
        ? await instagramPublishingExecutor.publish(igUserId, containerId, accessToken)
        : null;
      return NextResponse.json({
        success: true,
        executed: Boolean(media),
        containerId,
        status,
        media,
        message: media ? "Meta confirmed and published the Instagram Reel." : `Instagram reports ${status.statusCode || "IN_PROGRESS"}.`,
      });
    }

    const filePath = clean(body.filePath);
    const caption = clean(body.caption);
    if (!filePath || !caption) return NextResponse.json({ success: false, message: "An approved video file and caption are required." }, { status: 400 });
    const container = await instagramPublishingExecutor.createContainer({ igUserId, accessToken, caption });
    await instagramPublishingExecutor.upload({ uploadUri: container.uploadUri, accessToken, filePath });
    const status = await instagramPublishingExecutor.status(container.id, accessToken);
    if (["ERROR", "EXPIRED"].includes(status.statusCode)) throw new Error(status.status || `Instagram processing ended with ${status.statusCode}.`);
    const media = status.statusCode === "FINISHED"
      ? await instagramPublishingExecutor.publish(igUserId, container.id, accessToken)
      : null;
    return NextResponse.json({
      success: true,
      executed: Boolean(media),
      containerId: container.id,
      status,
      media,
      message: media ? "Meta confirmed and published the Instagram Reel." : "Meta accepted the real Reel upload and is processing it.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Instagram Reel publishing failed.";
    return NextResponse.json({ success: false, executed: false, message }, { status: 502 });
  }
}
