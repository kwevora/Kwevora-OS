import { NextRequest, NextResponse } from "next/server";
import {
  platformPublishingControlCenter,
  type PlatformConnectionInput,
  type ControlledPlatform,
} from "../../../lib/PlatformPublishingControlCenter";
import { autonomousPublishingHandoffEngine } from "../../../lib/AutonomousPublishingHandoffEngine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function cookie(request: NextRequest, name: string): string {
  return request.cookies.get(name)?.value?.trim() ?? "";
}

function connections(request: NextRequest): Partial<Record<ControlledPlatform, PlatformConnectionInput>> {
  return {
    youtube: {
      accessToken: cookie(request, "kwevora_youtube_access_token"),
      refreshToken: cookie(request, "kwevora_youtube_refresh_token"),
      accountId: cookie(request, "kwevora_youtube_channel_id"),
      accountName: cookie(request, "kwevora_youtube_channel_name"),
    },
    tiktok: {
      accessToken: cookie(request, "kwevora_tiktok_access_token"),
      refreshToken: cookie(request, "kwevora_tiktok_refresh_token"),
      accountId: cookie(request, "kwevora_tiktok_open_id"),
      accountName: cookie(request, "kwevora_tiktok_display_name"),
      scopes: cookie(request, "kwevora_tiktok_scopes"),
    },
    instagram: {
      accessToken: cookie(request, "kwevora_meta_access_token"),
      accountId: cookie(request, "kwevora_instagram_business_id"),
      accountName: cookie(request, "kwevora_instagram_account_name"),
      scopes: cookie(request, "kwevora_meta_scopes"),
    },
    facebook: {
      accessToken: cookie(request, "kwevora_meta_access_token"),
      accountId: cookie(request, "kwevora_facebook_page_id"),
      accountName: cookie(request, "kwevora_facebook_page_name"),
      scopes: cookie(request, "kwevora_meta_scopes"),
    },
  };
}

export async function GET(request: NextRequest) {
  try {
    return NextResponse.json({
      success: true,
      controlCenter: platformPublishingControlCenter.report(connections(request)),
      publishingJobs: autonomousPublishingHandoffEngine.summary(),
    });
  } catch (error) {
    console.error("Platform control status failed:", error);
    return NextResponse.json(
      { success: false, message: "KAI could not load the platform publishing controls." },
      { status: 500 },
    );
  }
}
