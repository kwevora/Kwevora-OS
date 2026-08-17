import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type GraphError = { message?: string };
function clean(value: unknown): string { return typeof value === "string" ? value.trim() : ""; }
function version(): string { return process.env.META_GRAPH_VERSION?.trim() || "v23.0"; }
function number(value: unknown): number { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : 0; }

export async function GET(request: NextRequest) {
  const videoId = clean(request.nextUrl.searchParams.get("videoId"));
  const accessToken = request.cookies.get("kwevora_meta_access_token")?.value?.trim() ?? "";
  if (!videoId) return NextResponse.json({ success: false, message: "A Facebook Reel video ID is required." }, { status: 400 });
  if (!accessToken) return NextResponse.json({ success: false, message: "Reconnect Facebook to collect verified performance." }, { status: 401 });

  const detailsUrl = new URL(`https://graph.facebook.com/${version()}/${videoId}`);
  detailsUrl.searchParams.set("fields", "id,permalink_url,created_time");
  detailsUrl.searchParams.set("access_token", accessToken);
  const detailsResponse = await fetch(detailsUrl, { cache: "no-store" });
  const details = await detailsResponse.json() as { id?: string; permalink_url?: string; created_time?: string; error?: GraphError };
  if (!detailsResponse.ok || details.error || !details.id) {
    return NextResponse.json({ success: false, message: details.error?.message || "Meta did not return the Facebook Reel." }, { status: detailsResponse.status || 502 });
  }

  const insightsUrl = new URL(`https://graph.facebook.com/${version()}/${videoId}/video_insights`);
  insightsUrl.searchParams.set("metric", "total_video_views,total_video_stories_by_action_type,total_video_reactions_by_type_total");
  insightsUrl.searchParams.set("access_token", accessToken);
  const insightsResponse = await fetch(insightsUrl, { cache: "no-store" });
  const insights = await insightsResponse.json() as { data?: Array<{ name?: string; values?: Array<{ value?: unknown }> }>; error?: GraphError };
  if (!insightsResponse.ok || insights.error) {
    return NextResponse.json({ success: false, message: insights.error?.message || "Meta did not return verified Facebook Reel insights." }, { status: insightsResponse.status || 502 });
  }
  const metrics = Object.fromEntries((insights.data ?? []).map((metric) => [clean(metric.name), metric.values?.[0]?.value]));
  const actions = (metrics.total_video_stories_by_action_type ?? {}) as Record<string, unknown>;
  const reactions = (metrics.total_video_reactions_by_type_total ?? {}) as Record<string, unknown>;
  const views = number(metrics.total_video_views);
  const likes = Object.values(reactions).reduce<number>((sum, value) => sum + number(value), 0);
  const comments = number(actions.comment);
  const shares = number(actions.share);
  return NextResponse.json({
    success: true,
    platform: "facebook",
    collectedAt: new Date().toISOString(),
    video: { id: details.id, url: clean(details.permalink_url), createdTime: clean(details.created_time) },
    verifiedMetrics: { views, likes, comments, shares, engagementRate: views > 0 ? ((likes + comments + shares) / views) * 100 : 0 },
  });
}
