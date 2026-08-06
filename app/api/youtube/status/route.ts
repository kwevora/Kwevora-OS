import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const accessToken = request.cookies.get(
    "kwevora_youtube_access_token"
  )?.value;

  const refreshToken = request.cookies.get(
    "kwevora_youtube_refresh_token"
  )?.value;

  const channelId = request.cookies.get(
    "kwevora_youtube_channel_id"
  )?.value;

  const channelName = request.cookies.get(
    "kwevora_youtube_channel_name"
  )?.value;

  const hasAccessToken = Boolean(accessToken);
  const hasRefreshToken = Boolean(refreshToken);

  const connected =
    (hasAccessToken || hasRefreshToken) &&
    Boolean(channelId) &&
    Boolean(channelName);

  return NextResponse.json({
    success: true,
    connected,
    authenticated: hasAccessToken,
    refreshAvailable: hasRefreshToken,
    channelId: channelId ?? "",
    channelName: channelName ?? "",
  });
}