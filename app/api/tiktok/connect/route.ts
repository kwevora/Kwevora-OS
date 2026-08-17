import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const clientKey = process.env.TIKTOK_CLIENT_KEY?.trim();
  const redirectUri = process.env.TIKTOK_REDIRECT_URI?.trim() || `${new URL(request.url).origin}/api/tiktok/callback`;
  if (!clientKey || !process.env.TIKTOK_CLIENT_SECRET?.trim()) {
    return NextResponse.json(
      { success: false, message: "TikTok developer app credentials are not configured." },
      { status: 503 },
    );
  }
  const state = randomBytes(32).toString("hex");
  const url = new URL("https://www.tiktok.com/v2/auth/authorize/");
  url.searchParams.set("client_key", clientKey);
  url.searchParams.set("scope", "user.info.basic,video.publish,video.upload,video.list");
  url.searchParams.set("response_type", "code");
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("state", state);
  const response = NextResponse.redirect(url);
  response.cookies.set("kwevora_tiktok_oauth_state", state, {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 600,
  });
  return response;
}
