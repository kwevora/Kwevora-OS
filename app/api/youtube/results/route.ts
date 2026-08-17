import {
  cookies,
} from "next/headers";

import {
  NextRequest,
  NextResponse,
} from "next/server";

export const runtime =
  "nodejs";

export const dynamic =
  "force-dynamic";

type GoogleTokenResponse = {
  access_token?: string;

  error?: string;

  error_description?: string;
};

type YouTubeVideoResponse = {
  items?: Array<{
    id?: string;

    snippet?: {
      title?: string;

      channelId?: string;

      channelTitle?: string;

      publishedAt?: string;
    };

    statistics?: {
      viewCount?: string;

      likeCount?: string;

      commentCount?: string;

      favoriteCount?: string;
    };
  }>;

  error?: {
    message?: string;
  };
};

type YouTubeAnalyticsResponse = {
  columnHeaders?: Array<{ name?: string; dataType?: string }>;
  rows?: Array<Array<string | number>>;
  errors?: Array<{ message?: string }>;
  error?: { message?: string };
};

function cleanString(
  value: unknown,
): string {
  return typeof value ===
    "string"
    ? value.trim()
    : "";
}

function cleanNumber(
  value: unknown,
): number {
  if (
    typeof value ===
    "number" &&
    Number.isFinite(
      value,
    )
  ) {
    return value;
  }

  if (
    typeof value ===
    "string"
  ) {
    const parsed =
      Number(
        value,
      );

    return Number.isFinite(
      parsed,
    )
      ? parsed
      : 0;
  }

  return 0;
}

async function refreshAccessToken(
  refreshToken: string,
): Promise<string> {
  const clientId =
    process.env
      .GOOGLE_CLIENT_ID
      ?.trim();

  const clientSecret =
    process.env
      .GOOGLE_CLIENT_SECRET
      ?.trim();

  if (
    !clientId ||
    !clientSecret
  ) {
    throw new Error(
      "Google OAuth credentials are missing from the environment file.",
    );
  }

  const response =
    await fetch(
      "https://oauth2.googleapis.com/token",
      {
        method:
          "POST",

        headers: {
          "Content-Type":
            "application/x-www-form-urlencoded",
        },

        body:
          new URLSearchParams({
            client_id:
              clientId,

            client_secret:
              clientSecret,

            refresh_token:
              refreshToken,

            grant_type:
              "refresh_token",
          }),

        cache:
          "no-store",
      },
    );

  const data =
    (
      await response.json()
    ) as GoogleTokenResponse;

  const accessToken =
    cleanString(
      data.access_token,
    );

  if (
    !response.ok ||
    !accessToken
  ) {
    throw new Error(
      data.error_description ||
      data.error ||
      "YouTube authorization expired. Reconnect YouTube in Settings.",
    );
  }

  return accessToken;
}

async function loadVideoResults(
  videoId: string,
  accessToken: string,
): Promise<YouTubeVideoResponse> {
  const url =
    new URL(
      "https://www.googleapis.com/youtube/v3/videos",
    );

  url.searchParams.set(
    "part",
    "snippet,statistics",
  );

  url.searchParams.set(
    "id",
    videoId,
  );

  const response =
    await fetch(
      url,
      {
        method:
          "GET",

        headers: {
          Authorization:
            `Bearer ${accessToken}`,
        },

        cache:
          "no-store",
      },
    );

  const data =
    (
      await response.json()
    ) as YouTubeVideoResponse;

  if (
    !response.ok
  ) {
    throw new Error(
      data.error?.message ||
      "YouTube could not return performance results.",
    );
  }

  return data;
}

function dateOnly(value: Date): string {
  return value.toISOString().slice(0, 10);
}

async function loadWatchResults({
  videoId,
  publishedAt,
  accessToken,
}: {
  videoId: string;
  publishedAt: string;
  accessToken: string;
}): Promise<Record<string, number> | null> {
  const end = new Date();
  const fallbackStart = new Date(end);
  fallbackStart.setUTCDate(fallbackStart.getUTCDate() - 28);
  const parsedPublished = new Date(publishedAt);
  const start = Number.isFinite(parsedPublished.getTime()) ? parsedPublished : fallbackStart;
  const url = new URL("https://youtubeanalytics.googleapis.com/v2/reports");
  url.searchParams.set("ids", "channel==MINE");
  url.searchParams.set("startDate", dateOnly(start));
  url.searchParams.set("endDate", dateOnly(end));
  url.searchParams.set(
    "metrics",
    "estimatedMinutesWatched,averageViewDuration,averageViewPercentage,shares",
  );
  url.searchParams.set("filters", `video==${videoId}`);

  const response = await fetch(url, {
    method: "GET",
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  const data = (await response.json()) as YouTubeAnalyticsResponse;
  if (!response.ok || !data.rows?.[0] || !data.columnHeaders) return null;
  return Object.fromEntries(data.columnHeaders.map((header, index) => [
    cleanString(header.name),
    cleanNumber(data.rows?.[0]?.[index]),
  ]));
}

export async function GET(
  request:
    NextRequest,
) {
  try {
    const videoId =
      cleanString(
        request.nextUrl
          .searchParams
          .get(
            "videoId",
          ),
      );

    if (
      !videoId
    ) {
      return NextResponse.json(
        {
          success:
            false,

          message:
            "A YouTube video ID is required.",
        },
        {
          status:
            400,
        },
      );
    }

    const cookieStore =
      await cookies();

    const existingAccessToken =
      cookieStore
        .get(
          "kwevora_youtube_access_token",
        )
        ?.value
        .trim() ||
      "";

    const refreshToken =
      cookieStore
        .get(
          "kwevora_youtube_refresh_token",
        )
        ?.value
        .trim() ||
      "";

    if (
      !existingAccessToken &&
      !refreshToken
    ) {
      return NextResponse.json(
        {
          success:
            false,

          message:
            "YouTube is not connected. Connect it in Settings first.",

          reconnectRequired:
            true,
        },
        {
          status:
            401,
        },
      );
    }

    let accessToken =
      existingAccessToken;

    let refreshedAccessToken =
      false;

    if (
      refreshToken
    ) {
      accessToken =
        await refreshAccessToken(
          refreshToken,
        );

      refreshedAccessToken =
        true;
    }

    if (
      !accessToken
    ) {
      return NextResponse.json(
        {
          success:
            false,

          message:
            "YouTube authorization is missing. Reconnect YouTube in Settings.",

          reconnectRequired:
            true,
        },
        {
          status:
            401,
        },
      );
    }

    const youtubeData =
      await loadVideoResults(
        videoId,
        accessToken,
      );

    const video =
      youtubeData.items?.[0];

    if (
      !video
    ) {
      return NextResponse.json(
        {
          success:
            false,

          message:
            "YouTube could not find that video.",
        },
        {
          status:
            404,
        },
      );
    }

    const views =
      cleanNumber(
        video.statistics
          ?.viewCount,
      );

    const likes =
      cleanNumber(
        video.statistics
          ?.likeCount,
      );

    const comments =
      cleanNumber(
        video.statistics
          ?.commentCount,
      );

    const engagement =
      likes +
      comments;

    const engagementRate =
      views > 0
        ? Number(
            (
              (
                engagement /
                views
              ) *
              100
            ).toFixed(
              2,
            ),
          )
        : 0;

    const watchResults = await loadWatchResults({
      videoId: video.id || videoId,
      publishedAt: video.snippet?.publishedAt || "",
      accessToken,
    }).catch(() => null);

    const verifiedMetrics = {
      views,
      watchTimeMinutes: watchResults?.estimatedMinutesWatched ?? null,
      averageViewDurationSeconds: watchResults?.averageViewDuration ?? null,
      averageViewPercentage: watchResults?.averageViewPercentage ?? null,
      likes,
      comments,
      shares: watchResults?.shares ?? null,
      engagementRate,
    };

    const response =
      NextResponse.json({
        success:
          true,

        collectedAt:
          new Date()
            .toISOString(),

        platform:
          "youtube",

        video: {
          id:
            video.id ||
            videoId,

          title:
            video.snippet
              ?.title ||
            "",

          channelId:
            video.snippet
              ?.channelId ||
            "",

          channelName:
            video.snippet
              ?.channelTitle ||
            "",

          publishedAt:
            video.snippet
              ?.publishedAt ||
            "",
        },

        metrics: {
          views,

          likes,

          comments,

          engagement,

          engagementRate,

          watchTimeMinutes:
            verifiedMetrics.watchTimeMinutes,

          averageViewDurationSeconds:
            verifiedMetrics.averageViewDurationSeconds,

          averageViewPercentage:
            verifiedMetrics.averageViewPercentage,

          shares:
            verifiedMetrics.shares,
        },

        verifiedMetrics,

        missingMetrics:
          Object.entries(verifiedMetrics)
            .filter(([, value]) => value === null)
            .map(([name]) => name),

        outcomeMetrics: [
          {
            name:
              "YouTube Views",

            actual:
              views,

            higherIsBetter:
              true,
          },

          {
            name:
              "YouTube Likes",

            actual:
              likes,

            higherIsBetter:
              true,
          },

          {
            name:
              "YouTube Comments",

            actual:
              comments,

            higherIsBetter:
              true,
          },

          {
            name:
              "YouTube Engagement Rate",

            actual:
              engagementRate,

            higherIsBetter:
              true,
          },

          ...(verifiedMetrics.watchTimeMinutes === null ? [] : [{
            name: "YouTube Watch Time Minutes",
            actual: verifiedMetrics.watchTimeMinutes,
            higherIsBetter: true,
          }]),

          ...(verifiedMetrics.averageViewDurationSeconds === null ? [] : [{
            name: "YouTube Average View Duration Seconds",
            actual: verifiedMetrics.averageViewDurationSeconds,
            higherIsBetter: true,
          }]),

          ...(verifiedMetrics.averageViewPercentage === null ? [] : [{
            name: "YouTube Average View Percentage",
            actual: verifiedMetrics.averageViewPercentage,
            higherIsBetter: true,
          }]),

          ...(verifiedMetrics.shares === null ? [] : [{
            name: "YouTube Shares",
            actual: verifiedMetrics.shares,
            higherIsBetter: true,
          }]),
        ],
      });

    if (
      refreshedAccessToken
    ) {
      response.cookies.set(
        "kwevora_youtube_access_token",
        accessToken,
        {
          httpOnly:
            true,

          sameSite:
            "lax",

          secure:
            process.env
              .NODE_ENV ===
            "production",

          path:
            "/",

          maxAge:
            55 * 60,
        },
      );
    }

    return response;
  } catch (
    error
  ) {
    console.error(
      "YouTube results collection failed:",
      error,
    );

    return NextResponse.json(
      {
        success:
          false,

        message:
          error instanceof
          Error
            ? error.message
            : "KWEVORA could not collect YouTube results.",
      },
      {
        status:
          500,
      },
    );
  }
}
