import { execFile } from "child_process";
import { promises as fs } from "fs";
import path from "path";
import { promisify } from "util";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const execFileAsync = promisify(execFile);

/*
 * ffprobe-static is a CommonJS package.
 * Using require here lets KWEVORA use the binary path
 * without needing a separate Windows FFmpeg installation.
 */
const ffprobeStatic = require("ffprobe-static") as {
  path: string;
};

type VideoOrientation =
  | "portrait"
  | "landscape"
  | "square"
  | "unknown";

type VideoQuality = {
  width: number | null;
  height: number | null;
  resolution: string | null;
  quality: string;
  orientation: VideoOrientation;

  durationSeconds: number | null;
  frameRate: number | null;

  codec: string | null;
  videoCodec: string | null;
  audioCodec: string | null;

  rotation: number | null;
  bitRate: number | null;

  inspected: boolean;
  inspectionMethod: "ffprobe" | "unavailable";
};

type ReviewItem = {
  id: string;
  createdAt: string;
  status: "needs_review";
  idea: string;
  hook: string;
  title: string;
  script: string;
  caption: string;
  hashtags: string[];

  media?: {
    source: "recording" | "upload";
    fileName: string;
    storedFileName: string;
    mimeType: string;
    size: number;
    filePath: string;
    quality: VideoQuality;
  };
};

type FfprobeStream = {
  codec_type?: string;
  codec_name?: string;
  width?: number;
  height?: number;

  avg_frame_rate?: string;
  r_frame_rate?: string;

  bit_rate?: string;

  tags?: {
    rotate?: string;
  };

  side_data_list?: Array<{
    rotation?: number;
  }>;
};

type FfprobeResult = {
  streams?: FfprobeStream[];

  format?: {
    duration?: string;
    bit_rate?: string;
  };
};

const dataFolder = path.join(
  process.cwd(),
  "data"
);

const uploadsFolder = path.join(
  dataFolder,
  "video-uploads"
);

const reviewFile = path.join(
  dataFolder,
  "review-queue.json"
);

async function readReviewQueue(): Promise<ReviewItem[]> {
  try {
    const contents = await fs.readFile(
      reviewFile,
      "utf8"
    );

    const parsed = JSON.parse(contents);

    return Array.isArray(parsed)
      ? parsed
      : [];
  } catch {
    return [];
  }
}

function cleanFileName(
  fileName: string
) {
  return fileName
    .replace(
      /[^a-zA-Z0-9._-]/g,
      "-"
    )
    .replace(/-+/g, "-");
}

function parseNumber(
  value: unknown
): number | null {
  if (
    typeof value === "number" &&
    Number.isFinite(value)
  ) {
    return value;
  }

  if (
    typeof value !== "string" ||
    !value.trim()
  ) {
    return null;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed)
    ? parsed
    : null;
}

function parseFrameRate(
  value: string | undefined
): number | null {
  if (!value) {
    return null;
  }

  if (value.includes("/")) {
    const [numeratorValue, denominatorValue] =
      value.split("/");

    const numerator =
      Number(numeratorValue);

    const denominator =
      Number(denominatorValue);

    if (
      !Number.isFinite(numerator) ||
      !Number.isFinite(denominator) ||
      denominator === 0
    ) {
      return null;
    }

    return Number(
      (
        numerator /
        denominator
      ).toFixed(2)
    );
  }

  const parsed = Number(value);

  return Number.isFinite(parsed)
    ? Number(parsed.toFixed(2))
    : null;
}

function normalizeRotation(
  rotation: number | null
): number | null {
  if (rotation === null) {
    return null;
  }

  let normalized =
    rotation % 360;

  if (normalized < 0) {
    normalized += 360;
  }

  return normalized;
}

function getRotation(
  stream: FfprobeStream
): number | null {
  const sideDataRotation =
    stream.side_data_list?.find(
      (entry) =>
        typeof entry.rotation ===
        "number"
    )?.rotation;

  if (
    typeof sideDataRotation ===
    "number"
  ) {
    return normalizeRotation(
      sideDataRotation
    );
  }

  const tagRotation =
    parseNumber(
      stream.tags?.rotate
    );

  return normalizeRotation(
    tagRotation
  );
}

function getDisplayDimensions(
  width: number | null,
  height: number | null,
  rotation: number | null
) {
  if (!width || !height) {
    return {
      width,
      height,
    };
  }

  if (
    rotation === 90 ||
    rotation === 270
  ) {
    return {
      width: height,
      height: width,
    };
  }

  return {
    width,
    height,
  };
}

function getOrientation(
  width: number | null,
  height: number | null
): VideoOrientation {
  if (!width || !height) {
    return "unknown";
  }

  if (width === height) {
    return "square";
  }

  return width > height
    ? "landscape"
    : "portrait";
}

function getQualityLabel(
  width: number | null,
  height: number | null
): string {
  if (!width || !height) {
    return "Unknown";
  }

  const longEdge =
    Math.max(width, height);

  const shortEdge =
    Math.min(width, height);

  if (
    longEdge >= 7680 ||
    shortEdge >= 4320
  ) {
    return "8K";
  }

  if (
    longEdge >= 3840 ||
    shortEdge >= 2160
  ) {
    return "4K";
  }

  if (
    longEdge >= 2560 ||
    shortEdge >= 1440
  ) {
    return "1440p";
  }

  if (
    longEdge >= 1920 ||
    shortEdge >= 1080
  ) {
    return "1080p";
  }

  if (
    longEdge >= 1280 ||
    shortEdge >= 720
  ) {
    return "720p";
  }

  if (
    longEdge >= 854 ||
    shortEdge >= 480
  ) {
    return "480p";
  }

  return `${shortEdge}p`;
}

function getFallbackQuality(): VideoQuality {
  return {
    width: null,
    height: null,
    resolution: null,
    quality: "Unknown",
    orientation: "unknown",

    durationSeconds: null,
    frameRate: null,

    codec: null,
    videoCodec: null,
    audioCodec: null,

    rotation: null,
    bitRate: null,

    inspected: false,
    inspectionMethod:
      "unavailable",
  };
}

async function inspectVideo(
  absoluteFilePath: string
): Promise<VideoQuality> {
  const fallback =
    getFallbackQuality();

  try {
    if (
      !ffprobeStatic?.path
    ) {
      console.warn(
        "KWEVORA ffprobe binary path is unavailable."
      );

      return fallback;
    }

    const {
      stdout,
    } = await execFileAsync(
      ffprobeStatic.path,
      [
        "-v",
        "error",

        "-show_streams",
        "-show_format",

        "-print_format",
        "json",

        absoluteFilePath,
      ],
      {
        windowsHide: true,

        /*
         * Give ffprobe enough buffer for
         * metadata-heavy phone videos.
         */
        maxBuffer:
          10 * 1024 * 1024,
      }
    );

    const result =
      JSON.parse(
        stdout
      ) as FfprobeResult;

    const streams =
      Array.isArray(
        result.streams
      )
        ? result.streams
        : [];

    const videoStream =
      streams.find(
        (stream) =>
          stream.codec_type ===
          "video"
      );

    const audioStream =
      streams.find(
        (stream) =>
          stream.codec_type ===
          "audio"
      );

    if (!videoStream) {
      console.warn(
        "KWEVORA ffprobe found no video stream."
      );

      return fallback;
    }

    const rawWidth =
      parseNumber(
        videoStream.width
      );

    const rawHeight =
      parseNumber(
        videoStream.height
      );

    const rotation =
      getRotation(
        videoStream
      );

    const displayDimensions =
      getDisplayDimensions(
        rawWidth,
        rawHeight,
        rotation
      );

    const width =
      displayDimensions.width;

    const height =
      displayDimensions.height;

    const frameRate =
      parseFrameRate(
        videoStream.avg_frame_rate ||
          videoStream.r_frame_rate
      );

    const durationSeconds =
      parseNumber(
        result.format?.duration
      );

    const videoCodec =
      typeof videoStream.codec_name ===
      "string"
        ? videoStream.codec_name
        : null;

    const audioCodec =
      typeof audioStream?.codec_name ===
      "string"
        ? audioStream.codec_name
        : null;

    const streamBitRate =
      parseNumber(
        videoStream.bit_rate
      );

    const formatBitRate =
      parseNumber(
        result.format?.bit_rate
      );

    const bitRate =
      streamBitRate ??
      formatBitRate;

    return {
      width,
      height,

      resolution:
        width && height
          ? `${width}x${height}`
          : null,

      quality:
        getQualityLabel(
          width,
          height
        ),

      orientation:
        getOrientation(
          width,
          height
        ),

      durationSeconds:
        durationSeconds !== null
          ? Number(
              durationSeconds.toFixed(
                2
              )
            )
          : null,

      frameRate,

      /*
       * Keep "codec" for compatibility
       * with the Upload Video UI we
       * already built.
       */
      codec:
        videoCodec,

      videoCodec,
      audioCodec,

      rotation,

      bitRate,

      inspected:
        Boolean(
          width ||
            height ||
            durationSeconds !== null ||
            frameRate !== null ||
            videoCodec
        ),

      inspectionMethod:
        "ffprobe",
    };
  } catch (error) {
    console.warn(
      "KWEVORA ffprobe inspection failed:",
      error
    );

    return fallback;
  }
}

export async function POST(
  request: Request
) {
  try {
    const formData =
      await request.formData();

    const video =
      formData.get("video");

    const sourceValue =
      formData.get("source");

    const titleValue =
      formData.get("title");

    const notesValue =
      formData.get("notes");

    if (
      !(video instanceof File)
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "No video file was received.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !video.type.startsWith(
        "video/"
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "The uploaded file is not a supported video.",
        },
        {
          status: 400,
        }
      );
    }

    const source:
      | "recording"
      | "upload" =
      sourceValue === "upload"
        ? "upload"
        : "recording";

    const title =
      typeof titleValue ===
        "string" &&
      titleValue.trim()
        ? titleValue.trim()
        : source ===
            "recording"
          ? "New KWEVORA Recording"
          : "Uploaded Video";

    const notes =
      typeof notesValue ===
      "string"
        ? notesValue.trim()
        : "";

    await fs.mkdir(
      uploadsFolder,
      {
        recursive: true,
      }
    );

    await fs.mkdir(
      dataFolder,
      {
        recursive: true,
      }
    );

    const originalFileName =
      cleanFileName(
        video.name ||
          `kwevora-video-${Date.now()}.webm`
      );

    const storedFileName =
      `${Date.now()}-${crypto.randomUUID()}-${originalFileName}`;

    const absoluteFilePath =
      path.join(
        uploadsFolder,
        storedFileName
      );

    /*
     * PRESERVE ORIGINAL QUALITY
     *
     * The exact bytes received from
     * the user's device are written
     * directly to disk.
     *
     * KWEVORA does NOT:
     *
     * - resize
     * - transcode
     * - recompress
     * - reduce resolution
     * - change frame rate
     *
     * Inspection happens afterward
     * against the saved original.
     */
    const fileBuffer =
      Buffer.from(
        await video.arrayBuffer()
      );

    await fs.writeFile(
      absoluteFilePath,
      fileBuffer
    );

    /*
     * Verify that the physical file
     * actually exists before creating
     * Review Queue metadata.
     */
    const savedFileStats =
      await fs.stat(
        absoluteFilePath
      );

    if (
      !savedFileStats.isFile() ||
      savedFileStats.size === 0
    ) {
      throw new Error(
        "The uploaded video was not saved correctly."
      );
    }

    /*
     * REAL MEDIA INSPECTION
     *
     * ffprobe reads the physical file.
     * It does not modify it.
     */
    const quality =
      await inspectVideo(
        absoluteFilePath
      );

    console.log(
      "KWEVORA VIDEO INSPECTION",
      {
        fileName:
          originalFileName,

        storedFileName,

        mimeType:
          video.type,

        receivedSize:
          video.size,

        storedSize:
          savedFileStats.size,

        quality,
      }
    );

    const reviewItem: ReviewItem =
      {
        id:
          crypto.randomUUID(),

        createdAt:
          new Date().toISOString(),

        status:
          "needs_review",

        idea:
          source ===
          "recording"
            ? "Recorded inside KWEVORA and sent to KAI."
            : "Uploaded to KWEVORA and sent to KAI.",

        hook:
          notes ||
          "KAI needs to prepare this video for publishing.",

        title,

        script:
          notes ||
          "Original video received. Transcription and editing instructions have not been generated yet.",

        caption:
          "KAI is preparing this video for review and publishing.",

        hashtags: [
          "#KWEVORA",
        ],

        media: {
          source,

          fileName:
            originalFileName,

          storedFileName,

          mimeType:
            video.type ||
            "video/webm",

          /*
           * Store the size of the
           * physical saved file.
           */
          size:
            savedFileStats.size,

          filePath:
            `/data/video-uploads/${storedFileName}`,

          quality,
        },
      };

    const reviewQueue =
      await readReviewQueue();

    reviewQueue.unshift(
      reviewItem
    );

    await fs.writeFile(
      reviewFile,
      JSON.stringify(
        reviewQueue,
        null,
        2
      ),
      "utf8"
    );

    let message =
      "Video saved at original quality and added to the Review Queue.";

    if (
      quality.inspected &&
      quality.resolution
    ) {
      const fpsText =
        quality.frameRate !== null
          ? ` at ${quality.frameRate} FPS`
          : "";

      message =
        `Video saved at original quality. ` +
        `KWEVORA detected ${quality.quality} ` +
        `(${quality.resolution}${fpsText}), ` +
        `${quality.orientation} video. ` +
        `Added to the Review Queue.`;
    } else if (
      quality.inspected
    ) {
      message =
        "Video saved at original quality. KWEVORA inspected the media successfully, but some display metadata was unavailable. Added to the Review Queue.";
    }

    return NextResponse.json({
      success: true,

      message,

      item:
        reviewItem,

      videoQuality:
        quality,
    });
  } catch (error) {
    console.error(
      "Video ingest failed:",
      error
    );

    return NextResponse.json(
      {
        success: false,

        message:
          error instanceof Error
            ? error.message
            : "KWEVORA could not save this video.",
      },
      {
        status: 500,
      }
    );
  }
}