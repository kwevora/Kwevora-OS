import { NextRequest, NextResponse } from "next/server";
import { facebookPublishingExecutor } from "../../../lib/publishing/FacebookPublishingExecutor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

function clean(value: unknown): string { return typeof value === "string" ? value.trim() : ""; }

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({})) as Record<string, unknown>;
    const accessToken = request.cookies.get("kwevora_meta_access_token")?.value?.trim() ?? "";
    const pageId = request.cookies.get("kwevora_facebook_page_id")?.value?.trim() ?? "";
    if (!accessToken || !pageId) {
      return NextResponse.json({ success: false, executed: false, message: "Connect a Facebook Page before KAI publishes a Reel." }, { status: 401 });
    }
    const videoId = clean(body.videoId);
    if (body.action === "status") {
      if (!videoId) return NextResponse.json({ success: false, message: "A Facebook Reel video ID is required." }, { status: 400 });
      const status = await facebookPublishingExecutor.status(videoId, accessToken);
      if (status.failed) return NextResponse.json({ success: false, executed: false, videoId, status, message: status.message || "Facebook Reel processing failed." }, { status: 409 });
      const reel = status.complete ? await facebookPublishingExecutor.details(videoId, accessToken) : null;
      return NextResponse.json({
        success: true,
        executed: Boolean(reel),
        videoId,
        status,
        reel,
        message: reel ? "Meta confirmed the published Facebook Reel." : `Facebook reports ${status.videoStatus || status.processing || "processing"}.`,
      });
    }

    const filePath = clean(body.filePath);
    const description = clean(body.description);
    if (!filePath || !description) return NextResponse.json({ success: false, message: "An approved video file and description are required." }, { status: 400 });
    const session = await facebookPublishingExecutor.start(pageId, accessToken);
    await facebookPublishingExecutor.upload(session.uploadUrl, accessToken, filePath);
    await facebookPublishingExecutor.finish({
      pageId,
      videoId: session.videoId,
      accessToken,
      title: clean(body.title),
      description,
    });
    const status = await facebookPublishingExecutor.status(session.videoId, accessToken);
    if (status.failed) throw new Error(status.message || "Facebook Reel processing failed.");
    const reel = status.complete ? await facebookPublishingExecutor.details(session.videoId, accessToken) : null;
    return NextResponse.json({
      success: true,
      executed: Boolean(reel),
      videoId: session.videoId,
      status,
      reel,
      message: reel ? "Meta confirmed the published Facebook Reel." : "Meta accepted the real Facebook Reel and is processing it.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Facebook Reel publishing failed.";
    return NextResponse.json({ success: false, executed: false, message }, { status: 502 });
  }
}
