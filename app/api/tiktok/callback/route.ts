import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type TokenResponse = {
  access_token?: string; refresh_token?: string; open_id?: string; scope?: string;
  expires_in?: number; refresh_expires_in?: number; error?: string; error_description?: string;
};
type UserResponse = { data?: { user?: { open_id?: string; display_name?: string } }; error?: { message?: string } };

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code")?.trim() ?? "";
  const state = request.nextUrl.searchParams.get("state")?.trim() ?? "";
  const storedState = request.cookies.get("kwevora_tiktok_oauth_state")?.value ?? "";
  if (!code || !state || state !== storedState) {
    return NextResponse.json({ success: false, message: "TikTok authorization state validation failed." }, { status: 400 });
  }
  const clientKey = process.env.TIKTOK_CLIENT_KEY?.trim();
  const clientSecret = process.env.TIKTOK_CLIENT_SECRET?.trim();
  const redirectUri = process.env.TIKTOK_REDIRECT_URI?.trim() || `${request.nextUrl.origin}/api/tiktok/callback`;
  if (!clientKey || !clientSecret) return NextResponse.json({ success: false, message: "TikTok developer app credentials are missing." }, { status: 503 });

  const tokenResponse = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_key: clientKey, client_secret: clientSecret, code, grant_type: "authorization_code", redirect_uri: redirectUri }),
    cache: "no-store",
  });
  const tokens = await tokenResponse.json() as TokenResponse;
  if (!tokenResponse.ok || !tokens.access_token || !tokens.open_id) {
    return NextResponse.json({ success: false, message: tokens.error_description || tokens.error || "TikTok did not return usable authorization." }, { status: 502 });
  }
  const userResponse = await fetch("https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name", {
    headers: { Authorization: `Bearer ${tokens.access_token}` }, cache: "no-store",
  });
  const user = await userResponse.json() as UserResponse;
  const response = NextResponse.redirect(new URL("/video-studio?tiktok=connected", request.url));
  const options = { httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/" };
  response.cookies.set("kwevora_tiktok_access_token", tokens.access_token, { ...options, maxAge: Math.max(300, tokens.expires_in ?? 3600) });
  if (tokens.refresh_token) response.cookies.set("kwevora_tiktok_refresh_token", tokens.refresh_token, { ...options, maxAge: Math.max(3600, tokens.refresh_expires_in ?? 30 * 86400) });
  response.cookies.set("kwevora_tiktok_open_id", tokens.open_id, { ...options, maxAge: 30 * 86400 });
  response.cookies.set("kwevora_tiktok_display_name", user.data?.user?.display_name ?? "Connected TikTok Account", { ...options, maxAge: 30 * 86400 });
  response.cookies.set("kwevora_tiktok_scopes", tokens.scope ?? "", { ...options, maxAge: 30 * 86400 });
  response.cookies.delete("kwevora_tiktok_oauth_state");
  return response;
}
