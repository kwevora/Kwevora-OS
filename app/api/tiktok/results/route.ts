import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function clean(value: unknown): string { return typeof value === "string" ? value.trim() : ""; }

export async function GET(request: NextRequest) {
  const videoId = clean(request.nextUrl.searchParams.get("videoId"));
  const accessToken = request.cookies.get("kwevora_tiktok_access_token")?.value?.trim() ?? "";
  if (!videoId) return NextResponse.json({ success: false, message: "A TikTok video ID is required." }, { status: 400 });
  if (!accessToken) return NextResponse.json({ success: false, message: "Reconnect TikTok to collect verified performance." }, { status: 401 });
  const url = new URL("https://open.tiktokapis.com/v2/video/query/");
  url.searchParams.set("fields", "id,share_url,title,view_count,like_count,comment_count,share_count");
  const response = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ filters: { video_ids: [videoId] } }),
    cache: "no-store",
  });
  const data = await response.json() as {
    data?: { videos?: Array<{ id?: string; share_url?: string; title?: string; view_count?: number; like_count?: number; comment_count?: number; share_count?: number }> };
    error?: { code?: string; message?: string };
  };
  const video = data.data?.videos?.[0];
  if (!response.ok || (data.error?.code && data.error.code !== "ok") || !video) {
    return NextResponse.json({ success: false, message: data.error?.message || "TikTok did not return verified video results." }, { status: response.ok ? 404 : response.status });
  }
  const views = Number(video.view_count) || 0;
  const likes = Number(video.like_count) || 0;
  const comments = Number(video.comment_count) || 0;
  const shares = Number(video.share_count) || 0;
  return NextResponse.json({
    success: true,
    platform: "tiktok",
    collectedAt: new Date().toISOString(),
    video: { id: String(video.id ?? videoId), url: clean(video.share_url), title: clean(video.title) },
    verifiedMetrics: { views, likes, comments, shares, engagementRate: views > 0 ? ((likes + comments + shares) / views) * 100 : 0 },
  });
}
