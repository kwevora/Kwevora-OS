import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type GraphError = { message?: string };
function clean(value: unknown): string { return typeof value === "string" ? value.trim() : ""; }
function version(): string { return process.env.META_GRAPH_VERSION?.trim() || "v23.0"; }
function number(value: unknown): number { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : 0; }

export async function GET(request: NextRequest) {
  const mediaId = clean(request.nextUrl.searchParams.get("mediaId"));
  const accessToken = request.cookies.get("kwevora_meta_access_token")?.value?.trim() ?? "";
  if (!mediaId) return NextResponse.json({ success: false, message: "An Instagram media ID is required." }, { status: 400 });
  if (!accessToken) return NextResponse.json({ success: false, message: "Reconnect Instagram to collect verified performance." }, { status: 401 });

  const mediaUrl = new URL(`https://graph.facebook.com/${version()}/${mediaId}`);
  mediaUrl.searchParams.set("fields", "id,permalink,timestamp,like_count,comments_count");
  mediaUrl.searchParams.set("access_token", accessToken);
  const mediaResponse = await fetch(mediaUrl, { cache: "no-store" });
  const media = await mediaResponse.json() as { id?: string; permalink?: string; timestamp?: string; like_count?: number; comments_count?: number; error?: GraphError };
  if (!mediaResponse.ok || media.error || !media.id) {
    return NextResponse.json({ success: false, message: media.error?.message || "Meta did not return the Instagram Reel." }, { status: mediaResponse.status || 502 });
  }

  const insightsUrl = new URL(`https://graph.facebook.com/${version()}/${mediaId}/insights`);
  insightsUrl.searchParams.set("metric", "views,reach,saved,shares,total_interactions");
  insightsUrl.searchParams.set("access_token", accessToken);
  const insightsResponse = await fetch(insightsUrl, { cache: "no-store" });
  const insights = await insightsResponse.json() as { data?: Array<{ name?: string; values?: Array<{ value?: number }>; value?: number }>; error?: GraphError };
  if (!insightsResponse.ok || insights.error) {
    return NextResponse.json({ success: false, message: insights.error?.message || "Meta did not return verified Instagram insights." }, { status: insightsResponse.status || 502 });
  }
  const values = Object.fromEntries((insights.data ?? []).map((metric) => [clean(metric.name), number(metric.value ?? metric.values?.[0]?.value)]));
  const views = number(values.views);
  const likes = number(media.like_count);
  const comments = number(media.comments_count);
  const shares = number(values.shares);
  return NextResponse.json({
    success: true,
    platform: "instagram",
    collectedAt: new Date().toISOString(),
    media: { id: media.id, url: clean(media.permalink), timestamp: clean(media.timestamp) },
    verifiedMetrics: {
      views, likes, comments, shares,
      engagementRate: views > 0 ? ((likes + comments + shares) / views) * 100 : 0,
    },
    instagramMetrics: { reach: number(values.reach), saved: number(values.saved), totalInteractions: number(values.total_interactions) },
  });
}
