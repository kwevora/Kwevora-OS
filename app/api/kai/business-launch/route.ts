import { NextRequest, NextResponse } from "next/server";
import { verifiedBusinessLaunchEngine } from "../../../lib/VerifiedBusinessLaunchEngine";
import type {
  ControlledPlatform,
  PlatformConnectionInput,
} from "../../../lib/PlatformPublishingControlCenter";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
function cookie(r: NextRequest, n: string) {
  return r.cookies.get(n)?.value?.trim() ?? "";
}
function connections(
  r: NextRequest,
): Partial<Record<ControlledPlatform, PlatformConnectionInput>> {
  return {
    youtube: {
      accessToken: cookie(r, "kwevora_youtube_access_token"),
      refreshToken: cookie(r, "kwevora_youtube_refresh_token"),
      accountId: cookie(r, "kwevora_youtube_channel_id"),
      accountName: cookie(r, "kwevora_youtube_channel_name"),
    },
    tiktok: {
      accessToken: cookie(r, "kwevora_tiktok_access_token"),
      refreshToken: cookie(r, "kwevora_tiktok_refresh_token"),
      accountId: cookie(r, "kwevora_tiktok_open_id"),
      accountName: cookie(r, "kwevora_tiktok_display_name"),
      scopes: cookie(r, "kwevora_tiktok_scopes"),
    },
    instagram: {
      accessToken: cookie(r, "kwevora_meta_access_token"),
      accountId: cookie(r, "kwevora_instagram_business_id"),
      accountName: cookie(r, "kwevora_instagram_account_name"),
      scopes: cookie(r, "kwevora_meta_scopes"),
    },
    facebook: {
      accessToken: cookie(r, "kwevora_meta_access_token"),
      accountId: cookie(r, "kwevora_facebook_page_id"),
      accountName: cookie(r, "kwevora_facebook_page_name"),
      scopes: cookie(r, "kwevora_meta_scopes"),
    },
  };
}
export async function GET(request: NextRequest) {
  try {
    return NextResponse.json({
      success: true,
      ...(await verifiedBusinessLaunchEngine.summary(connections(request))),
    });
  } catch (error) {
    console.error("Business launch status failed:", error);
    return NextResponse.json(
      {
        success: false,
        message: "KAI could not load the verified business launch.",
      },
      { status: 500 },
    );
  }
}
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;
    if (body.action === "configure")
      await verifiedBusinessLaunchEngine.configure(body);
    else if (body.action === "approve")
      await verifiedBusinessLaunchEngine.approve(connections(request));
    else if (body.action === "pause")
      await verifiedBusinessLaunchEngine.setPaused(true);
    else if (body.action === "resume")
      await verifiedBusinessLaunchEngine.setPaused(false);
    else
      return NextResponse.json(
        { success: false, message: "A valid launch action is required." },
        { status: 400 },
      );
    return NextResponse.json({
      success: true,
      ...(await verifiedBusinessLaunchEngine.summary(connections(request))),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "KAI could not update the verified business launch.",
      },
      { status: 409 },
    );
  }
}
