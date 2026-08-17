import { NextRequest, NextResponse } from "next/server";

import {
  publishingExecutionEngine,
  type PublishingExecutionItem,
} from "../../../lib/publishing/PublishingExecutionEngine";

import { autonomousContentCycleEngine } from "../../../lib/AutonomousContentCycleEngine";
import { growthPlanAuthorizationEngine } from "../../../lib/GrowthPlanAuthorizationEngine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PublishingQueueResponse = {
  success?: boolean;
  items?: PublishingExecutionItem[];
};

type YouTubeConnection = {
  connected: boolean;
  authenticated: boolean;
  refreshAvailable: boolean;
  channelId: string;
  channelName: string;
};

type YouTubeUploadResponse = {
  success?: boolean;
  message?: string;

  platform?: string;

  video?: {
    id?: string;
    url?: string;
    title?: string;
    channelId?: string;
    channelTitle?: string;
    privacyStatus?: string;
    uploadStatus?: string;
  };
};

type PublishingUpdateResponse = {
  success?: boolean;
  message?: string;
  item?: unknown;
};

function cleanString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function getBaseUrl(request: NextRequest): string {
  return request.nextUrl.origin;
}

async function loadPublishingQueue(
  request: NextRequest,
): Promise<PublishingExecutionItem[]> {
  const response = await fetch(`${getBaseUrl(request)}/api/publishing`, {
    method: "GET",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Could not load the Publishing Queue.");
  }

  const data = (await response.json()) as PublishingQueueResponse;

  return Array.isArray(data.items) ? data.items : [];
}

function loadYouTubeConnection(request: NextRequest): YouTubeConnection {
  const accessToken = request.cookies.get(
    "kwevora_youtube_access_token",
  )?.value;

  const refreshToken = request.cookies.get(
    "kwevora_youtube_refresh_token",
  )?.value;

  const channelId = request.cookies.get("kwevora_youtube_channel_id")?.value;

  const channelName = request.cookies.get(
    "kwevora_youtube_channel_name",
  )?.value;

  const hasAccessToken = Boolean(accessToken);

  const hasRefreshToken = Boolean(refreshToken);

  const connected =
    (hasAccessToken || hasRefreshToken) &&
    Boolean(channelId) &&
    Boolean(channelName);

  return {
    connected,

    authenticated: hasAccessToken,

    refreshAvailable: hasRefreshToken,

    channelId: channelId ?? "",

    channelName: channelName ?? "",
  };
}

function buildYouTubeDescription(item: PublishingExecutionItem): string {
  return [
    cleanString(item.caption),

    cleanString(item.callToAction),

    cleanString(item.destinationLink),

    Array.isArray(item.hashtags) ? item.hashtags.filter(Boolean).join(" ") : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

async function uploadToYouTube(
  request: NextRequest,
  item: PublishingExecutionItem,
): Promise<YouTubeUploadResponse> {
  if (!item.media) {
    throw new Error(
      "A finished video file is required before KAI can upload to YouTube.",
    );
  }

  const response = await fetch(`${getBaseUrl(request)}/api/youtube/upload`, {
    method: "POST",

    headers: {
      "Content-Type": "application/json",

      cookie: request.headers.get("cookie") ?? "",
    },

    body: JSON.stringify({
      title: item.title,

      description: buildYouTubeDescription(item),

      tags: Array.isArray(item.hashtags) ? item.hashtags : [],

      videoPath: item.media.filePath,

      storedFileName: item.media.storedFileName,

      mimeType: item.media.mimeType,

      /* Owner approval permits upload, but first delivery stays private. */
      privacyStatus: "private",
    }),

    cache: "no-store",
  });

  const data = (await response.json()) as YouTubeUploadResponse;

  if (!response.ok || !data.success) {
    throw new Error(
      data.message || "KWEVORA could not upload the video to YouTube.",
    );
  }

  if (!cleanString(data.video?.id)) {
    throw new Error(
      "YouTube accepted the upload, but KWEVORA did not receive a video ID.",
    );
  }

  return data;
}

async function markPublishingItemPublished({
  request,
  item,
  upload,
}: {
  request: NextRequest;
  item: PublishingExecutionItem;
  upload: YouTubeUploadResponse;
}): Promise<PublishingUpdateResponse> {
  const videoId = cleanString(upload.video?.id);

  const videoUrl =
    cleanString(upload.video?.url) ||
    `https://www.youtube.com/watch?v=${videoId}`;

  const response = await fetch(`${getBaseUrl(request)}/api/publishing`, {
    method: "POST",

    headers: {
      "Content-Type": "application/json",
    },

    body: JSON.stringify({
      action: "mark_published",

      id: item.id,

      publication: {
        platform: "youtube",

        externalId: videoId,

        url: videoUrl,

        publishedAt: new Date().toISOString(),

        channelId: cleanString(upload.video?.channelId),

        channelName: cleanString(upload.video?.channelTitle),

        privacyStatus: cleanString(upload.video?.privacyStatus) || "private",
      },
    }),

    cache: "no-store",
  });

  const data = (await response.json()) as PublishingUpdateResponse;

  if (!response.ok || !data.success) {
    throw new Error(
      data.message ||
        "The video reached YouTube, but KWEVORA could not save the publishing result.",
    );
  }

  return data;
}

export async function GET(request: NextRequest) {
  try {
    const publishingQueue = await loadPublishingQueue(request);

    const youtube = loadYouTubeConnection(request);

    const youtubeAuthorized = youtube.authenticated || youtube.refreshAvailable;

    const assessments = publishingQueue.map((item) =>
      publishingExecutionEngine.assess({
        platform: "youtube",

        item,

        connection: {
          platform: "youtube",

          connected: youtube.connected,

          authenticated: youtubeAuthorized,

          accountId: youtube.channelId,

          accountName: youtube.channelName,
        },
      }),
    );

    return NextResponse.json({
      success: true,

      youtube: {
        connected: youtube.connected,

        authenticated: youtubeAuthorized,

        accessTokenAvailable: youtube.authenticated,

        refreshAvailable: youtube.refreshAvailable,

        channelId: youtube.channelId,

        channelName: youtube.channelName,
      },

      total: assessments.length,

      ready: assessments.filter((item) => item.canExecute).length,

      waiting: assessments.filter((item) => !item.canExecute).length,

      assessments,
    });
  } catch (error) {
    console.error("Publishing execution assessment failed:", error);

    return NextResponse.json(
      {
        success: false,

        message: "KWEVORA could not evaluate the Publishing Queue.",
      },
      {
        status: 500,
      },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;

    const publishingItemId = cleanString(body.publishingItemId);

    const platform = cleanString(body.platform) || "youtube";

    if (!publishingItemId) {
      return NextResponse.json(
        {
          success: false,

          message: "publishingItemId is required.",
        },
        {
          status: 400,
        },
      );
    }

    const publishingQueue = await loadPublishingQueue(request);

    const item = publishingQueue.find((entry) => entry.id === publishingItemId);

    if (!item) {
      return NextResponse.json(
        {
          success: false,

          message: "Publishing item not found.",
        },
        {
          status: 404,
        },
      );
    }

    const authorization = await growthPlanAuthorizationEngine.decision(
      cleanString(item.executionPlanId),
      "publish",
    );
    if (!authorization.allowed) {
      return NextResponse.json({
        success: true,
        executed: false,
        authorization,
        message: authorization.reason,
      });
    }

    const youtube = loadYouTubeConnection(request);

    const normalizedPlatform = platform.toLowerCase();

    const isYouTube = normalizedPlatform === "youtube";

    const assessment = publishingExecutionEngine.assess({
      platform: normalizedPlatform,

      item,

      connection: {
        platform: normalizedPlatform,

        connected: isYouTube ? youtube.connected : false,

        authenticated: isYouTube
          ? youtube.authenticated || youtube.refreshAvailable
          : false,

        accountId: isYouTube ? youtube.channelId : "",

        accountName: isYouTube ? youtube.channelName : "",
      },
    });

    if (!assessment.canExecute) {
      if (assessment.executionPlanId) {
        await autonomousContentCycleEngine.blocked(
          assessment.executionPlanId,
          assessment.reason,
        );
      }

      return NextResponse.json({
        success: true,

        executed: false,

        assessment,

        message: assessment.nextAction,
      });
    }

    if (!isYouTube) {
      return NextResponse.json({
        success: true,

        executed: false,

        assessment,

        message: `KAI does not yet have a real ${platform} uploader.`,
      });
    }

    const upload = await uploadToYouTube(request, item);

    const publishingUpdate = await markPublishingItemPublished({
      request,

      item,

      upload,
    });

    await autonomousContentCycleEngine.published(assessment.executionPlanId, {
      platform: "youtube",
      externalId: cleanString(upload.video?.id),
      url: cleanString(upload.video?.url),
      publishedAt: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,

      executed: true,

      assessment,

      executionPlanId: assessment.executionPlanId,

      publishingItemId: item.id,

      platform: "youtube",

      video: upload.video,

      publishingItem: publishingUpdate.item,

      message:
        "KAI published the approved video to YouTube and saved the real publication record.",
    });
  } catch (error) {
    console.error("Publishing execution request failed:", error);

    return NextResponse.json(
      {
        success: false,

        executed: false,

        message:
          error instanceof Error
            ? error.message
            : "KWEVORA could not execute the publishing request.",
      },
      {
        status: 500,
      },
    );
  }
}
