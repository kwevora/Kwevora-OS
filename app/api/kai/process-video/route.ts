import { execFile } from "child_process";
import { promises as fs } from "fs";
import path from "path";
import { promisify } from "util";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const execFileAsync = promisify(execFile);

const ffmpegStatic = require("ffmpeg-static") as string | null;

type ProcessingStatus =
  | "needs_review"
  | "processing"
  | "ready_for_review"
  | "processing_failed";

type KaiIntelligenceReport = {
  coreMessage: string;
  contentGoal: string;
  targetAudience: string;
  audienceProblem: string;
  audienceDesire: string;
  primaryEmotion: string;
  emotionalJourney: string;
  strongestMoment: string;
  scrollStoppingReason: string;
  creatorVoice: string;
  recommendedAngle: string;
  reasoningSummary: string;
};

type ReviewItem = {
  id: string;
  createdAt: string;
  updatedAt?: string;
  status: ProcessingStatus;
  processingStatus?: ProcessingStatus;
  processingError?: string;
  idea: string;
  hook: string;
  title: string;
  script: string;
  transcript?: string;
  caption: string;
  hashtags: string[];
  thumbnailIdea?: string;
  callToAction?: string;
  platformRecommendation?: string;
  publishingRecommendation?: string;
  intelligenceReport?: KaiIntelligenceReport;
  media?: {
    source: "recording" | "upload";
    fileName: string;
    storedFileName: string;
    mimeType: string;
    size: number;
    filePath: string;
  };
};

type ProcessVideoRequest = {
  id?: string;
};

type KaiContentAnalysis = {
  intelligenceReport: KaiIntelligenceReport;
  title: string;
  hook: string;
  caption: string;
  hashtags: string[];
  thumbnailIdea: string;
  callToAction: string;
  platformRecommendation: string;
  publishingRecommendation: string;
};

const dataFolder = path.join(
  process.cwd(),
  "data"
);

const uploadsFolder = path.join(
  dataFolder,
  "video-uploads"
);

const temporaryAudioFolder = path.join(
  dataFolder,
  "temporary-audio"
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

async function saveReviewQueue(
  items: ReviewItem[]
) {
  await fs.mkdir(
    dataFolder,
    {
      recursive: true,
    }
  );

  await fs.writeFile(
    reviewFile,
    JSON.stringify(
      items,
      null,
      2
    ),
    "utf8"
  );
}

async function extractAudioForTranscription(
  absoluteVideoPath: string
): Promise<string> {
  if (!ffmpegStatic) {
    throw new Error(
      "KWEVORA's FFmpeg media engine is unavailable."
    );
  }

  await fs.mkdir(
    temporaryAudioFolder,
    {
      recursive: true,
    }
  );

  const temporaryAudioPath =
    path.join(
      temporaryAudioFolder,
      `${Date.now()}-${crypto.randomUUID()}.m4a`
    );

  try {
    await execFileAsync(
      ffmpegStatic,
      [
        "-y",

        "-i",
        absoluteVideoPath,

        /*
         * Do not create another video.
         * We only need the audio track for KAI.
         */
        "-vn",

        /*
         * AAC inside M4A is compact,
         * widely supported, and accepted
         * by the transcription endpoint.
         */
        "-c:a",
        "aac",

        "-b:a",
        "128k",

        "-ar",
        "48000",

        "-ac",
        "1",

        temporaryAudioPath,
      ],
      {
        windowsHide: true,
        maxBuffer:
          20 * 1024 * 1024,
      }
    );

    const audioStats =
      await fs.stat(
        temporaryAudioPath
      );

    if (
      !audioStats.isFile() ||
      audioStats.size === 0
    ) {
      throw new Error(
        "KWEVORA could not create usable audio from this video."
      );
    }

    console.log(
      "KWEVORA AUDIO EXTRACTION COMPLETE",
      {
        source:
          absoluteVideoPath,
        temporaryAudioPath,
        size:
          audioStats.size,
      }
    );

    return temporaryAudioPath;
  } catch (error) {
    await fs
      .unlink(
        temporaryAudioPath
      )
      .catch(() => {});

    console.error(
      "KWEVORA audio extraction failed:",
      error
    );

    throw new Error(
      error instanceof Error
        ? `KWEVORA could not extract the video's audio: ${error.message}`
        : "KWEVORA could not extract the video's audio."
    );
  }
}

async function transcribeAudio(
  absoluteAudioPath: string,
  apiKey: string
): Promise<string> {
  const fileBuffer =
    await fs.readFile(
      absoluteAudioPath
    );

  const formData =
    new FormData();

  formData.append(
    "file",
    new Blob(
      [fileBuffer],
      {
        type: "audio/mp4",
      }
    ),
    "kwevora-audio.m4a"
  );

  formData.append(
    "model",
    process.env
      .KAI_TRANSCRIPTION_MODEL ||
      "gpt-4o-mini-transcribe"
  );

  formData.append(
    "response_format",
    "json"
  );

  const response =
    await fetch(
      "https://api.openai.com/v1/audio/transcriptions",
      {
        method: "POST",

        headers: {
          Authorization:
            `Bearer ${apiKey}`,
        },

        body:
          formData,
      }
    );

  const data =
    await response.json();

  if (!response.ok) {
    throw new Error(
      data?.error?.message ||
        "KAI could not transcribe the video's audio."
    );
  }

  const transcript =
    typeof data.text ===
      "string"
      ? data.text.trim()
      : "";

  if (!transcript) {
    throw new Error(
      "The transcription service returned an empty transcript."
    );
  }

  return transcript;
}

async function transcribeVideo(
  absoluteFilePath: string,
  apiKey: string
): Promise<string> {
  /*
   * Always extract a clean M4A audio track first.
   *
   * This means MOV, MP4, WebM, and other video
   * containers can all enter the same reliable
   * transcription pipeline.
   *
   * The original video remains untouched.
   */
  const temporaryAudioPath =
    await extractAudioForTranscription(
      absoluteFilePath
    );

  try {
    return await transcribeAudio(
      temporaryAudioPath,
      apiKey
    );
  } finally {
    /*
     * The audio is temporary.
     * Remove it whether transcription succeeds
     * or fails.
     */
    await fs
      .unlink(
        temporaryAudioPath
      )
      .catch(
        (cleanupError) => {
          console.warn(
            "KWEVORA could not remove temporary audio:",
            cleanupError
          );
        }
      );
  }
}

function cleanText(
  value: unknown
): string {
  return typeof value ===
    "string"
    ? value.trim()
    : "";
}

function cleanHashtags(
  value: unknown
): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((tag) => {
      if (
        typeof tag !==
        "string"
      ) {
        return "";
      }

      const cleaned =
        tag.trim();

      if (!cleaned) {
        return "";
      }

      return cleaned.startsWith(
        "#"
      )
        ? cleaned.replace(
            /\s+/g,
            ""
          )
        : `#${cleaned.replace(
            /\s+/g,
            ""
          )}`;
    })
    .filter(Boolean)
    .slice(0, 8);
}

function cleanIntelligenceReport(
  report: KaiIntelligenceReport
): KaiIntelligenceReport {
  return {
    coreMessage:
      cleanText(
        report.coreMessage
      ),

    contentGoal:
      cleanText(
        report.contentGoal
      ),

    targetAudience:
      cleanText(
        report.targetAudience
      ),

    audienceProblem:
      cleanText(
        report.audienceProblem
      ),

    audienceDesire:
      cleanText(
        report.audienceDesire
      ),

    primaryEmotion:
      cleanText(
        report.primaryEmotion
      ),

    emotionalJourney:
      cleanText(
        report.emotionalJourney
      ),

    strongestMoment:
      cleanText(
        report.strongestMoment
      ),

    scrollStoppingReason:
      cleanText(
        report.scrollStoppingReason
      ),

    creatorVoice:
      cleanText(
        report.creatorVoice
      ),

    recommendedAngle:
      cleanText(
        report.recommendedAngle
      ),

    reasoningSummary:
      cleanText(
        report.reasoningSummary
      ),
  };
}

async function analyzeTranscript(
  transcript: string,
  apiKey: string
): Promise<KaiContentAnalysis> {
  const response =
    await fetch(
      "https://api.openai.com/v1/responses",
      {
        method: "POST",

        headers: {
          Authorization:
            `Bearer ${apiKey}`,

          "Content-Type":
            "application/json",
        },

        body:
          JSON.stringify({
            model:
              process.env
                .KAI_TEXT_MODEL ||
              "gpt-4o-mini",

            instructions: [
              "You are KAI, the intelligent content operating assistant inside KWEVORA OS.",
              "Your job is not to fill in generic content fields.",
              "Your job is to understand what the creator is truly communicating, determine why it matters, and turn it into an honest and compelling short-form content package.",
              "Think like a skilled content strategist who protects the creator's meaning, personality, credibility, and natural speaking voice.",
              "First analyze the transcript and build the intelligence report.",
              "Use that intelligence report as the reasoning foundation for every piece of generated content.",
              "Identify the creator's real core message, even when the transcript is unorganized, repetitive, casual, or incomplete.",
              "Determine the most likely audience based only on evidence found in the transcript.",
              "Identify the audience's likely problem and the result, feeling, answer, or change they desire.",
              "Identify the primary emotion already present in the message.",
              "Describe the emotional journey the audience should experience from the opening hook through the ending.",
              "Find the strongest truthful moment, sentence, realization, conflict, contrast, lesson, or story inside the transcript.",
              "Explain what could make the right viewer stop scrolling without using misleading clickbait.",
              "Describe the creator's voice using plain language so the finished content continues to sound like that person.",
              "Choose the strongest honest content angle rather than trying to include every point from the transcript.",
              "The reasoning summary should briefly explain why the recommended angle is the best opportunity.",
              "After reasoning, create one focused short-form content package.",
              "The title must be clear, specific, interesting, and truthful.",
              "The hook must sound natural when spoken or displayed on screen and should create immediate relevance, curiosity, emotion, tension, or recognition.",
              "Do not begin the hook with weak phrases such as 'Hey guys,' 'In this video,' or 'Today I want to talk about.'",
              "The caption must expand the message instead of merely repeating the hook.",
              "Use short paragraphs that are easy to read on a phone.",
              "The caption should preserve the creator's meaning and avoid exaggerated promises.",
              "The call to action must feel like the natural next step for this specific message.",
              "Do not automatically tell people to buy something unless the transcript clearly supports that action.",
              "Use three to eight useful hashtags that fit the actual subject and intended audience.",
              "Avoid stuffing the hashtag list with broad or unrelated trending tags.",
              "The thumbnail idea must include concise visible text and a simple visual direction.",
              "Recommend the platform where this specific message is most likely to connect and briefly explain why.",
              "Give a practical publishing recommendation covering format, pacing, opening, editing, or presentation.",
              "Use plain, confident, conversational language.",
              "Do not use corporate jargon.",
              "Do not invent names, experiences, statistics, products, promises, results, or facts that are not present in the transcript.",
              "Do not diagnose the creator or audience.",
              "Do not change the creator's position just to make the content more dramatic.",
              "If the transcript contains little information, use the strongest truthful idea available instead of making up missing context.",
              "Return only the required structured data.",
            ].join(" "),

            input: [
              {
                role: "user",

                content: [
                  {
                    type:
                      "input_text",

                    text: [
                      "Study the following video transcript.",
                      "Reason through its meaning before writing the content package.",
                      "",
                      "VIDEO TRANSCRIPT:",
                      transcript,
                    ].join(
                      "\n"
                    ),
                  },
                ],
              },
            ],

            text: {
              format: {
                type:
                  "json_schema",

                name:
                  "kwevora_video_intelligence_package",

                strict:
                  true,

                schema: {
                  type:
                    "object",

                  additionalProperties:
                    false,

                  properties: {
                    intelligenceReport:
                      {
                        type:
                          "object",

                        additionalProperties:
                          false,

                        properties:
                          {
                            coreMessage:
                              {
                                type:
                                  "string",

                                description:
                                  "The single most important message the creator is truly communicating.",
                              },

                            contentGoal:
                              {
                                type:
                                  "string",

                                description:
                                  "The most likely purpose of the video based on the transcript.",
                              },

                            targetAudience:
                              {
                                type:
                                  "string",

                                description:
                                  "A specific plain-language description of the person most likely to connect with this message.",
                              },

                            audienceProblem:
                              {
                                type:
                                  "string",

                                description:
                                  "The problem, struggle, question, or frustration affecting the target audience.",
                              },

                            audienceDesire:
                              {
                                type:
                                  "string",

                                description:
                                  "What the audience wants to understand, feel, change, achieve, or receive.",
                              },

                            primaryEmotion:
                              {
                                type:
                                  "string",

                                description:
                                  "The strongest emotion already present in the creator's message.",
                              },

                            emotionalJourney:
                              {
                                type:
                                  "string",

                                description:
                                  "How the audience should feel at the beginning, middle, and end.",
                              },

                            strongestMoment:
                              {
                                type:
                                  "string",

                                description:
                                  "The strongest truthful realization, contrast, lesson, line, conflict, or story within the transcript.",
                              },

                            scrollStoppingReason:
                              {
                                type:
                                  "string",

                                description:
                                  "Why the right viewer would stop and pay attention to this message.",
                              },

                            creatorVoice:
                              {
                                type:
                                  "string",

                                description:
                                  "A plain-language description of how the creator naturally communicates.",
                              },

                            recommendedAngle:
                              {
                                type:
                                  "string",

                                description:
                                  "The strongest focused and truthful angle for presenting this content.",
                              },

                            reasoningSummary:
                              {
                                type:
                                  "string",

                                description:
                                  "A brief explanation of why this audience, emotion, and angle form the strongest content opportunity.",
                              },
                          },

                        required: [
                          "coreMessage",
                          "contentGoal",
                          "targetAudience",
                          "audienceProblem",
                          "audienceDesire",
                          "primaryEmotion",
                          "emotionalJourney",
                          "strongestMoment",
                          "scrollStoppingReason",
                          "creatorVoice",
                          "recommendedAngle",
                          "reasoningSummary",
                        ],
                      },

                    title: {
                      type:
                        "string",

                      description:
                        "A clear, interesting, specific, and truthful title.",
                    },

                    hook: {
                      type:
                        "string",

                      description:
                        "A natural scroll-stopping opening grounded in the transcript.",
                    },

                    caption: {
                      type:
                        "string",

                      description:
                        "A useful mobile-friendly caption that expands the message and preserves the creator's voice.",
                    },

                    hashtags: {
                      type:
                        "array",

                      description:
                        "Three to eight focused hashtags relevant to the message and audience.",

                      items: {
                        type:
                          "string",
                      },

                      minItems: 3,
                      maxItems: 8,
                    },

                    thumbnailIdea:
                      {
                        type:
                          "string",

                        description:
                          "Short thumbnail text plus a simple visual direction.",
                      },

                    callToAction:
                      {
                        type:
                          "string",

                        description:
                          "A natural next step that fits the message and content goal.",
                      },

                    platformRecommendation:
                      {
                        type:
                          "string",

                        description:
                          "The strongest platform for this content and a brief reason.",
                      },

                    publishingRecommendation:
                      {
                        type:
                          "string",

                        description:
                          "A practical recommendation for format, pacing, editing, opening, or presentation.",
                      },
                  },

                  required: [
                    "intelligenceReport",
                    "title",
                    "hook",
                    "caption",
                    "hashtags",
                    "thumbnailIdea",
                    "callToAction",
                    "platformRecommendation",
                    "publishingRecommendation",
                  ],
                },
              },
            },
          }),
      }
    );

  const data =
    await response.json();

  if (!response.ok) {
    throw new Error(
      data?.error?.message ||
        "KAI could not analyze the transcript."
    );
  }

  const outputText =
    typeof data.output_text ===
      "string" &&
    data.output_text.trim()
      ? data.output_text.trim()
      : Array.isArray(
            data.output
          )
        ? data.output
            .flatMap(
              (item: any) =>
                Array.isArray(
                  item?.content
                )
                  ? item.content
                  : []
            )
            .map(
              (
                content: any
              ) =>
                typeof content?.text ===
                "string"
                  ? content.text.trim()
                  : ""
            )
            .find(
              (text: string) =>
                text.length >
                0
            ) || ""
        : "";

  if (!outputText) {
    throw new Error(
      "KAI returned no content analysis."
    );
  }

  let analysis:
    KaiContentAnalysis;

  try {
    analysis =
      JSON.parse(
        outputText
      ) as KaiContentAnalysis;
  } catch {
    throw new Error(
      "KAI returned content that could not be read."
    );
  }

  if (
    !analysis.intelligenceReport
  ) {
    throw new Error(
      "KAI returned no intelligence report."
    );
  }

  return {
    intelligenceReport:
      cleanIntelligenceReport(
        analysis.intelligenceReport
      ),

    title:
      cleanText(
        analysis.title
      ),

    hook:
      cleanText(
        analysis.hook
      ),

    caption:
      cleanText(
        analysis.caption
      ),

    hashtags:
      cleanHashtags(
        analysis.hashtags
      ),

    thumbnailIdea:
      cleanText(
        analysis.thumbnailIdea
      ),

    callToAction:
      cleanText(
        analysis.callToAction
      ),

    platformRecommendation:
      cleanText(
        analysis.platformRecommendation
      ),

    publishingRecommendation:
      cleanText(
        analysis.publishingRecommendation
      ),
  };
}

export async function POST(
  request: Request
) {
  let requestedId = "";

  try {
    const body =
      (await request.json()) as ProcessVideoRequest;

    requestedId =
      typeof body.id ===
      "string"
        ? body.id.trim()
        : "";

    if (!requestedId) {
      return NextResponse.json(
        {
          success: false,

          message:
            "A Review Queue item ID is required.",
        },
        {
          status: 400,
        }
      );
    }

    const apiKey =
      process.env
        .OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,

          message:
            "OPENAI_API_KEY is missing from the KWEVORA environment.",
        },
        {
          status: 500,
        }
      );
    }

    const reviewQueue =
      await readReviewQueue();

    const itemIndex =
      reviewQueue.findIndex(
        (item) =>
          item.id ===
          requestedId
      );

    if (itemIndex === -1) {
      return NextResponse.json(
        {
          success: false,

          message:
            "The Review Queue item was not found.",
        },
        {
          status: 404,
        }
      );
    }

    const currentItem =
      reviewQueue[
        itemIndex
      ];

    if (
      !currentItem.media
        ?.storedFileName
    ) {
      return NextResponse.json(
        {
          success: false,

          message:
            "This Review Queue item does not contain a video file.",
        },
        {
          status: 400,
        }
      );
    }

    reviewQueue[
      itemIndex
    ] = {
      ...currentItem,

      status:
        "processing",

      processingStatus:
        "processing",

      processingError:
        "",

      updatedAt:
        new Date().toISOString(),
    };

    await saveReviewQueue(
      reviewQueue
    );

    const absoluteFilePath =
      path.join(
        uploadsFolder,
        currentItem.media
          .storedFileName
      );

    try {
      await fs.access(
        absoluteFilePath
      );
    } catch {
      throw new Error(
        "The saved video file could not be found."
      );
    }

    /*
     * 1. Extract temporary M4A audio.
     * 2. Transcribe the audio.
     * 3. Temporary audio is deleted automatically.
     */
    const transcript =
      await transcribeVideo(
        absoluteFilePath,
        apiKey
      );

    /*
     * KAI now reasons over what was actually said.
     */
    const analysis =
      await analyzeTranscript(
        transcript,
        apiKey
      );

    const latestQueue =
      await readReviewQueue();

    const latestIndex =
      latestQueue.findIndex(
        (item) =>
          item.id ===
          requestedId
      );

    if (
      latestIndex === -1
    ) {
      throw new Error(
        "The Review Queue item disappeared during processing."
      );
    }

    const processedItem:
      ReviewItem = {
      ...latestQueue[
        latestIndex
      ],

      status:
        "ready_for_review",

      processingStatus:
        "ready_for_review",

      processingError:
        "",

      updatedAt:
        new Date().toISOString(),

      transcript,

      script:
        transcript,

      title:
        analysis.title ||
        latestQueue[
          latestIndex
        ].title,

      hook:
        analysis.hook ||
        latestQueue[
          latestIndex
        ].hook,

      caption:
        analysis.caption ||
        latestQueue[
          latestIndex
        ].caption,

      hashtags:
        analysis.hashtags
          .length > 0
          ? analysis.hashtags
          : ["#KWEVORA"],

      thumbnailIdea:
        analysis.thumbnailIdea,

      callToAction:
        analysis.callToAction,

      platformRecommendation:
        analysis.platformRecommendation,

      publishingRecommendation:
        analysis.publishingRecommendation,

      intelligenceReport:
        analysis.intelligenceReport,

      idea:
        analysis
          .intelligenceReport
          .recommendedAngle ||
        analysis
          .intelligenceReport
          .coreMessage ||
        "KAI transcribed, understood, and prepared this video for publishing.",
    };

    latestQueue[
      latestIndex
    ] =
      processedItem;

    await saveReviewQueue(
      latestQueue
    );

    return NextResponse.json({
      success: true,

      message:
        "KAI finished understanding and preparing the video.",

      item:
        processedItem,
    });
  } catch (error) {
    console.error(
      "KAI video processing failed:",
      error
    );

    if (requestedId) {
      try {
        const reviewQueue =
          await readReviewQueue();

        const itemIndex =
          reviewQueue.findIndex(
            (item) =>
              item.id ===
              requestedId
          );

        if (
          itemIndex !== -1
        ) {
          reviewQueue[
            itemIndex
          ] = {
            ...reviewQueue[
              itemIndex
            ],

            status:
              "processing_failed",

            processingStatus:
              "processing_failed",

            processingError:
              error instanceof
              Error
                ? error.message
                : "Video processing failed.",

            updatedAt:
              new Date().toISOString(),
          };

          await saveReviewQueue(
            reviewQueue
          );
        }
      } catch (
        saveError
      ) {
        console.error(
          "KAI could not save the processing failure:",
          saveError
        );
      }
    }

    return NextResponse.json(
      {
        success: false,

        message:
          error instanceof
          Error
            ? error.message
            : "KAI could not process this video.",
      },
      {
        status: 500,
      }
    );
  }
}