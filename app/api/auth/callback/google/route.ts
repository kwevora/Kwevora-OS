import { google } from "googleapis";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return NextResponse.json(
      {
        success: false,
        message: "Google credentials are missing from .env.local.",
      },
      { status: 500 }
    );
  }

  const code = request.nextUrl.searchParams.get("code");
  const oauthError = request.nextUrl.searchParams.get("error");
  const returnedState = request.nextUrl.searchParams.get("state");
  const storedState = request.cookies.get(
    "kwevora-youtube-oauth-state"
  )?.value;

  if (oauthError) {
    return NextResponse.redirect(
      new URL(
        `/video-studio?youtube=error&reason=${encodeURIComponent(
          oauthError
        )}`,
        request.url
      )
    );
  }

  if (!returnedState || returnedState !== storedState) {
    return NextResponse.json(
      {
        success: false,
        message: "OAuth state validation failed.",
      },
      { status: 400 }
    );
  }

  if (!code) {
    return NextResponse.json(
      {
        success: false,
        message: "Google did not return an authorization code.",
      },
      { status: 400 }
    );
  }

  const redirectUri =
    process.env.GOOGLE_REDIRECT_URI ||
    `${request.nextUrl.origin}/api/auth/callback/google`;

  const oauth2Client = new google.auth.OAuth2(
    clientId,
    clientSecret,
    redirectUri
  );

  try {
    const { tokens } = await oauth2Client.getToken(code);

    oauth2Client.setCredentials(tokens);

    const youtube = google.youtube({
      version: "v3",
      auth: oauth2Client,
    });

    const channelResponse = await youtube.channels.list({
      part: ["snippet"],
      mine: true,
    });

    const channel = channelResponse.data.items?.[0];

    const response = NextResponse.redirect(
      new URL("/video-studio?youtube=connected", request.url)
    );

    const secureCookie =
      process.env.NODE_ENV === "production";

    response.cookies.set(
      "kwevora_youtube_channel_id",
      channel?.id ?? "",
      {
        httpOnly: true,
        secure: secureCookie,
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 30,
      }
    );

    response.cookies.set(
      "kwevora_youtube_channel_name",
      channel?.snippet?.title ??
        "Connected YouTube Channel",
      {
        httpOnly: true,
        secure: secureCookie,
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 30,
      }
    );

    if (tokens.access_token) {
      response.cookies.set(
        "kwevora_youtube_access_token",
        tokens.access_token,
        {
          httpOnly: true,
          secure: secureCookie,
          sameSite: "lax",
          path: "/",
          maxAge: 60 * 60,
        }
      );
    }

    if (tokens.refresh_token) {
      response.cookies.set(
        "kwevora_youtube_refresh_token",
        tokens.refresh_token,
        {
          httpOnly: true,
          secure: secureCookie,
          sameSite: "lax",
          path: "/",
          maxAge: 60 * 60 * 24 * 30,
        }
      );
    }

    response.cookies.delete(
      "kwevora-youtube-oauth-state"
    );

    return response;
  } catch (error) {
    console.error("YouTube OAuth callback failed:", error);

    return NextResponse.redirect(
      new URL("/video-studio?youtube=error", request.url)
    );
  }
}