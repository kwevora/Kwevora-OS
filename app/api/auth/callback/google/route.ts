import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type GoogleTokenResponse = {
  access_token?: string;
  expires_in?: number;
  refresh_token?: string;
  error?: string;
  error_description?: string;
};

type YouTubeChannelResponse = {
  items?: Array<{ id?: string; snippet?: { title?: string } }>;
  error?: { message?: string };
};

function settingsRedirect(
  request: NextRequest,
  status: "connected" | "error",
  reason?: string,
) {
  const url = new URL("/settings", request.url);
  url.searchParams.set("youtube", status);
  if (reason) url.searchParams.set("reason", reason.slice(0, 180));
  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return settingsRedirect(
      request,
      "error",
      "Google credentials are missing in Cloudflare.",
    );
  }

  const code = request.nextUrl.searchParams.get("code");
  const oauthError = request.nextUrl.searchParams.get("error");
  const returnedState = request.nextUrl.searchParams.get("state");
  const storedState = request.cookies.get("kwevora-youtube-oauth-state")?.value;

  if (oauthError) return settingsRedirect(request, "error", oauthError);
  if (!returnedState || returnedState !== storedState) {
    return settingsRedirect(
      request,
      "error",
      "OAuth state validation failed. Please try once more.",
    );
  }
  if (!code) {
    return settingsRedirect(
      request,
      "error",
      "Google did not return an authorization code.",
    );
  }

  const redirectUri =
    process.env.GOOGLE_REDIRECT_URI ||
    `${request.nextUrl.origin}/api/auth/callback/google`;

  try {
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
      }),
    });

    const tokens = (await tokenResponse.json()) as GoogleTokenResponse;
    if (!tokenResponse.ok || !tokens.access_token) {
      throw new Error(
        tokens.error_description || tokens.error || "Google token exchange failed.",
      );
    }

    const channelResponse = await fetch(
      "https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true",
      { headers: { Authorization: `Bearer ${tokens.access_token}` } },
    );
    const channelData = (await channelResponse.json()) as YouTubeChannelResponse;
    if (!channelResponse.ok) {
      throw new Error(
        channelData.error?.message || "YouTube channel lookup failed.",
      );
    }

    const channel = channelData.items?.[0];
    if (!channel?.id) {
      throw new Error("No YouTube channel was found for this Google account.");
    }

    const response = settingsRedirect(request, "connected");
    const cookieOptions = {
      httpOnly: true,
      secure: true,
      sameSite: "lax" as const,
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    };

    response.cookies.set("kwevora_youtube_channel_id", channel.id, cookieOptions);
    response.cookies.set(
      "kwevora_youtube_channel_name",
      channel.snippet?.title || "Connected YouTube Channel",
      cookieOptions,
    );
    response.cookies.set("kwevora_youtube_access_token", tokens.access_token, {
      ...cookieOptions,
      maxAge: Math.max(300, tokens.expires_in || 3600),
    });
    if (tokens.refresh_token) {
      response.cookies.set(
        "kwevora_youtube_refresh_token",
        tokens.refresh_token,
        cookieOptions,
      );
    }
    response.cookies.delete("kwevora-youtube-oauth-state");
    return response;
  } catch (error) {
    const reason =
      error instanceof Error ? error.message : "YouTube authorization failed.";
    console.error("YouTube OAuth callback failed:", reason);
    return settingsRedirect(request, "error", reason);
  }
}
