import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type TokenResponse = { access_token?: string; expires_in?: number; error?: { message?: string } };
type AccountsResponse = {
  data?: Array<{ id?: string; name?: string; access_token?: string; instagram_business_account?: { id?: string; username?: string } }>;
  error?: { message?: string };
};
type PermissionsResponse = { data?: Array<{ permission?: string; status?: string }>; error?: { message?: string } };

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code")?.trim() ?? "";
  const state = request.nextUrl.searchParams.get("state")?.trim() ?? "";
  const storedState = request.cookies.get("kwevora_meta_oauth_state")?.value ?? "";
  if (!code || !state || state !== storedState) {
    return NextResponse.json({ success: false, message: "Meta authorization state validation failed." }, { status: 400 });
  }
  const appId = process.env.META_APP_ID?.trim();
  const appSecret = process.env.META_APP_SECRET?.trim();
  const redirectUri = process.env.META_REDIRECT_URI?.trim() || `${request.nextUrl.origin}/api/meta/callback`;
  const version = process.env.META_GRAPH_VERSION?.trim() || "v23.0";
  if (!appId || !appSecret) return NextResponse.json({ success: false, message: "Meta developer app credentials are missing." }, { status: 503 });

  const tokenUrl = new URL(`https://graph.facebook.com/${version}/oauth/access_token`);
  tokenUrl.searchParams.set("client_id", appId);
  tokenUrl.searchParams.set("client_secret", appSecret);
  tokenUrl.searchParams.set("redirect_uri", redirectUri);
  tokenUrl.searchParams.set("code", code);
  const tokenResponse = await fetch(tokenUrl, { cache: "no-store" });
  const token = await tokenResponse.json() as TokenResponse;
  if (!tokenResponse.ok || !token.access_token) {
    return NextResponse.json({ success: false, message: token.error?.message || "Meta did not return usable authorization." }, { status: 502 });
  }
  const longLivedUrl = new URL(`https://graph.facebook.com/${version}/oauth/access_token`);
  longLivedUrl.searchParams.set("grant_type", "fb_exchange_token");
  longLivedUrl.searchParams.set("client_id", appId);
  longLivedUrl.searchParams.set("client_secret", appSecret);
  longLivedUrl.searchParams.set("fb_exchange_token", token.access_token);
  const longLivedResponse = await fetch(longLivedUrl, { cache: "no-store" });
  const longLived = await longLivedResponse.json() as TokenResponse;
  const userToken = longLivedResponse.ok && longLived.access_token ? longLived.access_token : token.access_token;
  const accountsUrl = new URL(`https://graph.facebook.com/${version}/me/accounts`);
  accountsUrl.searchParams.set("fields", "id,name,access_token,instagram_business_account{id,username}");
  accountsUrl.searchParams.set("access_token", userToken);
  const accountsResponse = await fetch(accountsUrl, { cache: "no-store" });
  const accounts = await accountsResponse.json() as AccountsResponse;
  if (!accountsResponse.ok || !accounts.data?.length) {
    return NextResponse.json({ success: false, message: accounts.error?.message || "No authorized Facebook Page was returned." }, { status: 409 });
  }
  if (accounts.data.length > 1) {
    return NextResponse.json({ success: false, message: "More than one Facebook Page is available. KWEVORA needs an account-selection step before saving a connection." }, { status: 409 });
  }
  const account = accounts.data[0];
  const pageToken = account.access_token || userToken;
  const permissionsUrl = new URL(`https://graph.facebook.com/${version}/me/permissions`);
  permissionsUrl.searchParams.set("access_token", userToken);
  const permissionsResponse = await fetch(permissionsUrl, { cache: "no-store" });
  const permissions = await permissionsResponse.json() as PermissionsResponse;
  const grantedScopes = permissions.data
    ?.filter((item) => item.status === "granted" && item.permission)
    .map((item) => item.permission as string)
    .join(",") ?? "";
  const response = NextResponse.redirect(new URL("/video-studio?meta=connected", request.url));
  const options = { httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/", maxAge: Math.max(3600, longLived.expires_in ?? token.expires_in ?? 60 * 86400) };
  response.cookies.set("kwevora_meta_access_token", pageToken, options);
  response.cookies.set("kwevora_facebook_page_id", account.id ?? "", options);
  response.cookies.set("kwevora_facebook_page_name", account.name ?? "Connected Facebook Page", options);
  if (account.instagram_business_account?.id) {
    response.cookies.set("kwevora_instagram_business_id", account.instagram_business_account.id, options);
    response.cookies.set("kwevora_instagram_account_name", account.instagram_business_account.username ?? "Connected Instagram Account", options);
  }
  response.cookies.set("kwevora_meta_scopes", grantedScopes, options);
  response.cookies.delete("kwevora_meta_oauth_state");
  return response;
}
