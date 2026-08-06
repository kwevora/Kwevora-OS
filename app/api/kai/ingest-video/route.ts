import { promises as fs } from "fs";
import path from "path";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
  };
};

const dataFolder = path.join(process.cwd(), "data");
const uploadsFolder = path.join(dataFolder, "video-uploads");
const reviewFile = path.join(dataFolder, "review-queue.json");

async function readReviewQueue(): Promise<ReviewItem[]> {
  try {
    const contents = await fs.readFile(reviewFile, "utf8");
    const parsed = JSON.parse(contents);

    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function cleanFileName(fileName: string) {
  return fileName
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-");
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();

    const video = formData.get("video");
    const sourceValue = formData.get("source");
    const titleValue = formData.get("title");
    const notesValue = formData.get("notes");

    if (!(video instanceof File)) {
      return NextResponse.json(
        {
          success: false,
          message: "No video file was received.",
        },
        { status: 400 }
      );
    }

    if (!video.type.startsWith("video/")) {
      return NextResponse.json(
        {
          success: false,
          message: "The uploaded file is not a supported video.",
        },
        { status: 400 }
      );
    }

    const source =
      sourceValue === "upload" ? "upload" : "recording";

    const title =
      typeof titleValue === "string" && titleValue.trim()
        ? titleValue.trim()
        : source === "recording"
          ? "New KWEVORA Recording"
          : "Uploaded Video";

    const notes =
      typeof notesValue === "string" ? notesValue.trim() : "";

    await fs.mkdir(uploadsFolder, { recursive: true });
    await fs.mkdir(dataFolder, { recursive: true });

    const originalFileName = cleanFileName(
      video.name || `kwevora-video-${Date.now()}.webm`
    );

    const storedFileName = `${Date.now()}-${crypto.randomUUID()}-${originalFileName}`;
    const absoluteFilePath = path.join(
      uploadsFolder,
      storedFileName
    );

    const fileBuffer = Buffer.from(await video.arrayBuffer());

    await fs.writeFile(absoluteFilePath, fileBuffer);

    const reviewItem: ReviewItem = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      status: "needs_review",
      idea:
        source === "recording"
          ? "Recorded inside KWEVORA and sent to KAI."
          : "Uploaded to KWEVORA and sent to KAI.",
      hook: notes || "KAI needs to prepare this video for publishing.",
      title,
      script:
        notes ||
        "Original video received. Transcription and editing instructions have not been generated yet.",
      caption:
        "KAI is preparing this video for review and publishing.",
      hashtags: ["#KWEVORA"],
      media: {
        source,
        fileName: originalFileName,
        storedFileName,
        mimeType: video.type || "video/webm",
        size: video.size,
        filePath: `/data/video-uploads/${storedFileName}`,
      },
    };

    const reviewQueue = await readReviewQueue();
    reviewQueue.unshift(reviewItem);

    await fs.writeFile(
      reviewFile,
      JSON.stringify(reviewQueue, null, 2),
      "utf8"
    );

    return NextResponse.json({
      success: true,
      message:
        "Video saved and added to the Review Queue.",
      item: reviewItem,
    });
  } catch (error) {
    console.error("Video ingest failed:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          "KWEVORA could not save this video.",
      },
      { status: 500 }
    );
  }
}