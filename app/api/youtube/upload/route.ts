import { createReadStream, promises as fs } from "fs";
import path from "path";
import { Readable } from "stream";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type UploadRequestBody = {
  title?: unknown;
  description?: unknown;
  tags?: unknown;
  videoPath?: unknown;
  storedFileName?: unknown;
  mimeType?: unknown;
  privacyStatus?: unknown;
};

type GoogleTokenResponse = {
  access_token?: string;
  expires_in?: number;
  scope?: string;
  token_type?: string;
  error?: string;
  error_description?: string;
};

type YouTubeUploadResponse = {
  id?: string;
  snippet?: {
    title?: string;
    description?: string;
    channelId?: string;
    channelTitle?: string;
    publishedAt?: string;
  };
  status?: {
    uploadStatus?: string;
    privacyStatus?: string;
  };
  error?: {
    code?: number;
    message?: string;
    errors?: Array<{
      message?: string;
      reason?: string;
    }>;
  };
};

type PrivacyStatus = "private" | "unlisted" | "public";

const dataFolder = path.join(process.cwd(), "data");
const uploadsFolder = path.join(
  dataFolder,
  "video-uploads"
);

function cleanString(value: unknown): string {
  return typeof value === "string"
    ? value.trim()
    : "";
}

function cleanTags(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(
      (tag): tag is string =>
        typeof tag === "string"
    )
    .map((tag) =>
      tag
        .trim()
        .replace(/^#/, "")
    )
    .filter(Boolean)
    .slice(0, 30);
}

function cleanPrivacyStatus(
  value: unknown
): PrivacyStatus {
  if (
    value === "public" ||
    value === "unlisted" ||
    value === "private"
  ) {
    return value;
  }

  /*
   * New uploads default to private so KWEVORA does not
   * accidentally publish a video before the owner reviews it.
   */
  return "private";
}

function detectMimeType(
  fileName: string,
  suppliedMimeType: string
): string {
  if (suppliedMimeType.startsWith("video/")) {
    return suppliedMimeType;
  }

  const extension = path
    .extname(fileName)
    .toLowerCase();

  const mimeTypes: Record<string, string> = {
    ".mp4": "video/mp4",
    ".mov": "video/quicktime",
    ".m4v": "video/x-m4v",
    ".webm": "video/webm",
    ".avi": "video/x-msvideo",
    ".mpeg": "video/mpeg",
    ".mpg": "video/mpeg",
    ".wmv": "video/x-ms-wmv",
    ".3gp": "video/3gpp",
  };

  return (
    mimeTypes[extension] ||
    "application/octet-stream"
  );
}

function resolveVideoFile(
  videoPath: string,
  storedFileName: string
): string | null {
  /*
   * Only the filename is accepted from the request.
   * This prevents callers from requesting files elsewhere
   * on the computer through paths such as ../../secret-file.
   */
  const requestedFileName = path.basename(
    storedFileName ||
      videoPath.replace(/\\/g, "/")
  );

  if (!requestedFileName) {
    return null;
  }

  const resolvedUploadsFolder =
    path.resolve(uploadsFolder);

  const resolvedFilePath = path.resolve(
    uploadsFolder,
    requestedFileName
  );

  const requiredPrefix =
    resolvedUploadsFolder + path.sep;

  if (
    !resolvedFilePath.startsWith(requiredPrefix)
  ) {
    return null;
  }

  return resolvedFilePath;
}

async function readResponseJson<T>(
  response: Response
): Promise<T | null> {
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

function getGoogleErrorMessage(
  data: YouTubeUploadResponse | GoogleTokenResponse | null,
  fallback: string
): string {
  if (!data) {
    return fallback;
  }

  if (
    "error_description" in data &&
    typeof data.error_description === "string"
  ) {
    return data.error_description;
  }

  if (
    "error" in data &&
    typeof data.error === "string"
  ) {
    return data.error;
  }

  if (
    "error" in data &&
    data.error &&
    typeof data.error === "object"
  ) {
    const mainMessage = data.error.message;

    if (mainMessage) {
      return mainMessage;
    }

    const firstError =
      data.error.errors?.[0];

    if (firstError?.message) {
      return firstError.message;
    }

    if (firstError?.reason) {
      return firstError.reason;
    }
  }

  return fallback;
}

async function refreshAccessToken(
  refreshToken: string
): Promise<string> {
  const clientId =
    process.env.GOOGLE_CLIENT_ID?.trim();

  const clientSecret =
    process.env.GOOGLE_CLIENT_SECRET?.trim();

  if (!clientId || !clientSecret) {
    throw new Error(
      "Google OAuth credentials are missing from the environment file."
    );
  }

  const tokenResponse = await fetch(
    "https://oauth2.googleapis.com/token",
    {
      method: "POST",
      headers: {
        "Content-Type":
          "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
      cache: "no-store",
    }
  );

  const tokenData =
    await readResponseJson<GoogleTokenResponse>(
      tokenResponse
    );

  const accessToken =
    tokenData?.access_token?.trim();

  if (!tokenResponse.ok || !accessToken) {
    throw new Error(
      getGoogleErrorMessage(
        tokenData,
        "YouTube authorization expired. Reconnect YouTube in Settings."
      )
    );
  }

  return accessToken;
}

async function startResumableUpload({
  accessToken,
  title,
  description,
  tags,
  privacyStatus,
  fileSize,
  mimeType,
}: {
  accessToken: string;
  title: string;
  description: string;
  tags: string[];
  privacyStatus: PrivacyStatus;
  fileSize: number;
  mimeType: string;
}): Promise<string> {
  const metadata = {
    snippet: {
      title,
      description,
      tags,
      categoryId: "22",
    },
    status: {
      privacyStatus,
      embeddable: true,
      license: "youtube",
      selfDeclaredMadeForKids: false,
    },
  };

  const metadataText = JSON.stringify(metadata);

  const sessionResponse = await fetch(
    "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type":
          "application/json; charset=UTF-8",
        "Content-Length": String(
          Buffer.byteLength(metadataText)
        ),
        "X-Upload-Content-Length":
          String(fileSize),
        "X-Upload-Content-Type": mimeType,
      },
      body: metadataText,
      cache: "no-store",
    }
  );

  if (!sessionResponse.ok) {
    const errorData =
      await readResponseJson<YouTubeUploadResponse>(
        sessionResponse
      );

    throw new Error(
      getGoogleErrorMessage(
        errorData,
        "YouTube could not start the video upload."
      )
    );
  }

  const uploadUrl =
    sessionResponse.headers.get("location");

  if (!uploadUrl) {
    throw new Error(
      "YouTube did not return an upload session address."
    );
  }

  return uploadUrl;
}

async function uploadVideoFile({
  uploadUrl,
  accessToken,
  absoluteFilePath,
  fileSize,
  mimeType,
}: {
  uploadUrl: string;
  accessToken: string;
  absoluteFilePath: string;
  fileSize: number;
  mimeType: string;
}): Promise<YouTubeUploadResponse> {
  const nodeStream =
    createReadStream(absoluteFilePath);

  const webStream =
    Readable.toWeb(nodeStream);

  const uploadOptions: RequestInit & {
    duplex: "half";
  } = {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": mimeType,
      "Content-Length": String(fileSize),
    },
    body: webStream as unknown as BodyInit,
    duplex: "half",
    cache: "no-store",
  };

  const uploadResponse = await fetch(
    uploadUrl,
    uploadOptions
  );

  const uploadData =
    await readResponseJson<YouTubeUploadResponse>(
      uploadResponse
    );

  if (!uploadResponse.ok || !uploadData?.id) {
    throw new Error(
      getGoogleErrorMessage(
        uploadData,
        "YouTube could not complete the video upload."
      )
    );
  }

  return uploadData;
}

export async function POST(request: Request) {
  try {
    const body =
      (await request.json()) as UploadRequestBody;

    const title = cleanString(body.title);
    const description = cleanString(
      body.description
    );
    const tags = cleanTags(body.tags);
    const videoPath = cleanString(
      body.videoPath
    );
    const storedFileName = cleanString(
      body.storedFileName
    );
    const suppliedMimeType = cleanString(
      body.mimeType
    );
    const privacyStatus =
      cleanPrivacyStatus(body.privacyStatus);

    if (!title) {
      return NextResponse.json(
        {
          success: false,
          message:
            "A video title is required.",
        },
        { status: 400 }
      );
    }

    if (!description) {
      return NextResponse.json(
        {
          success: false,
          message:
            "A video description is required.",
        },
        { status: 400 }
      );
    }

    if (!videoPath && !storedFileName) {
      return NextResponse.json(
        {
          success: false,
          message:
            "This publishing item does not have a saved video file.",
        },
        { status: 400 }
      );
    }

    const absoluteFilePath =
      resolveVideoFile(
        videoPath,
        storedFileName
      );

    if (!absoluteFilePath) {
      return NextResponse.json(
        {
          success: false,
          message:
            "The saved video path is not valid.",
        },
        { status: 400 }
      );
    }

    let fileStats;

    try {
      fileStats = await fs.stat(
        absoluteFilePath
      );
    } catch {
      return NextResponse.json(
        {
          success: false,
          message:
            "KWEVORA could not find the saved video file.",
        },
        { status: 404 }
      );
    }

    if (!fileStats.isFile()) {
      return NextResponse.json(
        {
          success: false,
          message:
            "The selected video is not a valid file.",
        },
        { status: 400 }
      );
    }

    if (fileStats.size <= 0) {
      return NextResponse.json(
        {
          success: false,
          message:
            "The selected video file is empty.",
        },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();

    const existingAccessToken =
      cookieStore
        .get(
          "kwevora_youtube_access_token"
        )
        ?.value.trim() || "";

    const refreshToken =
      cookieStore
        .get(
          "kwevora_youtube_refresh_token"
        )
        ?.value.trim() || "";

    if (
      !existingAccessToken &&
      !refreshToken
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "YouTube is not connected. Connect it in Settings first.",
          reconnectRequired: true,
        },
        { status: 401 }
      );
    }

    let accessToken =
      existingAccessToken;

    let refreshedAccessToken = false;

    /*
     * Prefer a newly refreshed token whenever a refresh
     * token exists. This prevents an upload from failing
     * halfway through because an old access token expired.
     */
    if (refreshToken) {
      try {
        accessToken =
          await refreshAccessToken(
            refreshToken
          );

        refreshedAccessToken = true;
      } catch (error) {
        console.error(
          "YouTube token refresh failed:",
          error
        );

        return NextResponse.json(
          {
            success: false,
            message:
              error instanceof Error
                ? error.message
                : "YouTube authorization expired. Reconnect YouTube in Settings.",
            reconnectRequired: true,
          },
          { status: 401 }
        );
      }
    }

    if (!accessToken) {
      return NextResponse.json(
        {
          success: false,
          message:
            "YouTube authorization is missing. Reconnect YouTube in Settings.",
          reconnectRequired: true,
        },
        { status: 401 }
      );
    }

    const fileName =
      path.basename(absoluteFilePath);

    const mimeType = detectMimeType(
      fileName,
      suppliedMimeType
    );

    const safeTitle = title.slice(0, 100);
    const safeDescription =
      description.slice(0, 5000);

    const uploadUrl =
      await startResumableUpload({
        accessToken,
        title: safeTitle,
        description: safeDescription,
        tags,
        privacyStatus,
        fileSize: fileStats.size,
        mimeType,
      });

    const uploadedVideo =
      await uploadVideoFile({
        uploadUrl,
        accessToken,
        absoluteFilePath,
        fileSize: fileStats.size,
        mimeType,
      });

    const videoId =
      uploadedVideo.id as string;

    const videoUrl =
      `https://www.youtube.com/watch?v=${videoId}`;

    const response = NextResponse.json({
      success: true,
      message:
        privacyStatus === "public"
          ? "Video published successfully on YouTube."
          : privacyStatus === "unlisted"
            ? "Video uploaded to YouTube as unlisted."
            : "Video uploaded to YouTube as private.",
      publishStatus: "published",
      platform: "youtube",
      video: {
        id: videoId,
        url: videoUrl,
        title:
          uploadedVideo.snippet?.title ||
          safeTitle,
        channelId:
          uploadedVideo.snippet
            ?.channelId || "",
        channelTitle:
          uploadedVideo.snippet
            ?.channelTitle || "",
        privacyStatus:
          uploadedVideo.status
            ?.privacyStatus ||
          privacyStatus,
        uploadStatus:
          uploadedVideo.status
            ?.uploadStatus ||
          "uploaded",
      },
    });

    if (refreshedAccessToken) {
      response.cookies.set(
        "kwevora_youtube_access_token",
        accessToken,
        {
          httpOnly: true,
          sameSite: "lax",
          secure:
            process.env.NODE_ENV ===
            "production",
          path: "/",
          maxAge: 55 * 60,
        }
      );
    }

    return response;
  } catch (error) {
    console.error(
      "YouTube upload error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "KWEVORA could not upload the video to YouTube.",
      },
      { status: 500 }
    );
  }
}