import { NextRequest, NextResponse } from "next/server";
import { tiktokPublishingExecutor } from "../../../lib/publishing/TikTokPublishingExecutor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

type TokenResponse = { access_token?: string; refresh_token?: string; expires_in?: number; refresh_expires_in?: number; error?: string; error_description?: string };

function clean(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

async function accessToken(request: NextRequest): Promise<{ access: string; refreshed?: TokenResponse }> {
  const refresh = request.cookies.get("kwevora_tiktok_refresh_token")?.value?.trim() ?? "";
  const current = request.cookies.get("kwevora_tiktok_access_token")?.value?.trim() ?? "";
  if (!refresh) {
    if (!current) throw new Error("Connect TikTok before KAI publishes an approved video.");
    return { access: current };
  }
  const clientKey = process.env.TIKTOK_CLIENT_KEY?.trim() ?? "";
  const clientSecret = process.env.TIKTOK_CLIENT_SECRET?.trim() ?? "";
  if (!clientKey || !clientSecret) throw new Error("TikTok developer app credentials are missing.");
  const response = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_key: clientKey, client_secret: clientSecret, grant_type: "refresh_token", refresh_token: refresh }),
    cache: "no-store",
  });
  const tokens = await response.json() as TokenResponse;
  if (!response.ok || !tokens.access_token) {
    if (current) return { access: current };
    throw new Error(tokens.error_description || tokens.error || "TikTok authorization expired. Reconnect TikTok.");
  }
  return { access: tokens.access_token, refreshed: tokens };
}

function withTokens(response: NextResponse, tokens?: TokenResponse): NextResponse {
  if (!tokens?.access_token) return response;
  const options = { httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/" };
  response.cookies.set("kwevora_tiktok_access_token", tokens.access_token, { ...options, maxAge: Math.max(300, tokens.expires_in ?? 3600) });
  if (tokens.refresh_token) response.cookies.set("kwevora_tiktok_refresh_token", tokens.refresh_token, { ...options, maxAge: Math.max(3600, tokens.refresh_expires_in ?? 30 * 86400) });
  return response;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({})) as Record<string, unknown>;
    const token = await accessToken(request);
    const publishId = clean(body.publishId);
    if (body.action === "status") {
      if (!publishId) return NextResponse.json({ success: false, message: "A TikTok publish ID is required." }, { status: 400 });
      const status = await tiktokPublishingExecutor.status(token.access, publishId);
      return withTokens(NextResponse.json({ success: true, publishId, status }), token.refreshed);
    }
    const filePath = clean(body.filePath);
    const caption = clean(body.caption);
    if (!filePath || !caption) return NextResponse.json({ success: false, message: "An approved video file and caption are required." }, { status: 400 });
    const result = await tiktokPublishingExecutor.publish({
      accessToken: token.access,
      filePath,
      mimeType: clean(body.mimeType),
      caption,
    });
    return withTokens(NextResponse.json({
      success: true,
      executed: true,
      result,
      message: result.status.status === "PUBLISH_COMPLETE"
        ? `TikTok confirmed the post (${result.privacyLevel}).`
        : `TikTok accepted the real video and is processing publish ID ${result.publishId}.`,
    }), token.refreshed);
  } catch (error) {
    const message = error instanceof Error ? error.message : "TikTok publishing failed.";
    return NextResponse.json({ success: false, executed: false, message }, { status: 502 });
  }
}
