import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const appId = process.env.META_APP_ID?.trim();
  const redirectUri = process.env.META_REDIRECT_URI?.trim() || `${new URL(request.url).origin}/api/meta/callback`;
  if (!appId || !process.env.META_APP_SECRET?.trim()) {
    return NextResponse.json({ success: false, message: "Meta developer app credentials are not configured." }, { status: 503 });
  }
  const state = randomBytes(32).toString("hex");
  const version = process.env.META_GRAPH_VERSION?.trim() || "v23.0";
  const url = new URL(`https://www.facebook.com/${version}/dialog/oauth`);
  url.searchParams.set("client_id", appId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "pages_show_list,pages_read_engagement,pages_manage_posts,read_insights,instagram_basic,instagram_content_publish,instagram_manage_insights");
  const response = NextResponse.redirect(url);
  response.cookies.set("kwevora_meta_oauth_state", state, {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 600,
  });
  return response;
}
