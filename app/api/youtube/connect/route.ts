import { randomBytes } from "crypto";
import { google } from "googleapis";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const YOUTUBE_SCOPES = [
  "https://www.googleapis.com/auth/youtube.upload",
  "https://www.googleapis.com/auth/youtube.readonly",
  "https://www.googleapis.com/auth/yt-analytics.readonly",
];

export async function GET(request: Request) {
  try {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Google credentials are missing from .env.local.",
        },
        { status: 500 }
      );
    }

    const requestUrl = new URL(request.url);

    const redirectUri =
      process.env.GOOGLE_REDIRECT_URI ||
      `${requestUrl.origin}/api/auth/callback/google`;

    const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUri
    );

    const state = randomBytes(32).toString("hex");

    const authorizationUrl = oauth2Client.generateAuthUrl({
      access_type: "offline",
      prompt: "consent",
      include_granted_scopes: true,
      scope: YOUTUBE_SCOPES,
      state,
    });

    const response = NextResponse.redirect(authorizationUrl);

    response.cookies.set("kwevora-youtube-oauth-state", state, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 10,
    });

    return response;
  } catch (error) {
    console.error("YouTube connection could not begin:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          "KWEVORA could not begin the YouTube connection.",
      },
      { status: 500 }
    );
  }
}
