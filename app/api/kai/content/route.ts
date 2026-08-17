import { NextResponse } from "next/server";
import { defaultMemory } from "../../../lib/kaiMemory";
import { crossPlatformLearningBrain } from "../../../lib/CrossPlatformLearningBrain";

import type {
  VideoCameraMovement,
  VideoCameraShot,
  VideoProductionPackage,
  VideoScene,
  VideoSceneTransition,
  VideoTextPosition,
} from "../../../remotion/types";

type ContentFormat = "faceless_video" | "record_yourself" | "upload_video";

type LegacyVideoPlan = {
  openingText: string;
  scenes: string[];
  endingText: string;
  estimatedLengthSeconds: number;
};

type ContentIdea = {
  title: string;
  hook: string;
  caption: string;
  hashtags: string[];
  thumbnailIdea: string;
  callToAction: string;
  reason: string;
  audience: string;
  objective: string;
  confidence: number;
  format: ContentFormat;
  recommendedPlatforms: string[];

  videoPlan: LegacyVideoPlan;

  productionPackage: VideoProductionPackage;
};

const CAMERA_SHOTS: VideoCameraShot[] = [
  "extreme-wide",
  "wide",
  "medium",
  "close-up",
  "extreme-close-up",
  "over-the-shoulder",
  "top-down",
  "low-angle",
  "high-angle",
  "establishing",
  "detail",
];

const CAMERA_MOVEMENTS: VideoCameraMovement[] = [
  "static",
  "slow-push-in",
  "slow-pull-out",
  "push-in",
  "pull-out",
  "zoom-in",
  "zoom-out",
  "pan-left",
  "pan-right",
  "tilt-up",
  "tilt-down",
  "handheld",
  "tracking",
  "shake",
];

const SCENE_TRANSITIONS: VideoSceneTransition[] = [
  "fade",
  "cross-dissolve",
  "hard-cut",
  "cut",
  "blur",
  "flash",
  "slide-left",
  "slide-right",
  "zoom",
  "zoom-through",
  "punch",
  "none",
];

const TEXT_POSITIONS: VideoTextPosition[] = [
  "top",
  "center",
  "bottom",
  "left",
  "right",
  "upper",
  "lower-third",
];

function extractText(data: unknown): string {
  if (!data || typeof data !== "object") {
    return "";
  }

  const responseData = data as {
    output_text?: unknown;
    output?: Array<{
      content?: Array<{
        text?: unknown;
      }>;
    }>;
  };

  if (typeof responseData.output_text === "string") {
    return responseData.output_text;
  }

  for (const item of responseData.output ?? []) {
    for (const part of item.content ?? []) {
      if (typeof part.text === "string") {
        return part.text;
      }
    }
  }

  return "";
}

function extractJson(text: string): unknown {
  const cleaned = text
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();

  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");

  if (firstBrace === -1 || lastBrace === -1) {
    throw new Error("No JSON object was found in the AI response.");
  }

  return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1));
}

function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) && value.every((item) => typeof item === "string")
  );
}

function isNumberBetween(
  value: unknown,
  minimum: number,
  maximum: number,
): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= minimum &&
    value <= maximum
  );
}

function isCameraShot(value: unknown): value is VideoCameraShot {
  return (
    typeof value === "string" && CAMERA_SHOTS.includes(value as VideoCameraShot)
  );
}

function isCameraMovement(value: unknown): value is VideoCameraMovement {
  return (
    typeof value === "string" &&
    CAMERA_MOVEMENTS.includes(value as VideoCameraMovement)
  );
}

function isSceneTransition(value: unknown): value is VideoSceneTransition {
  return (
    typeof value === "string" &&
    SCENE_TRANSITIONS.includes(value as VideoSceneTransition)
  );
}

function isTextPosition(value: unknown): value is VideoTextPosition {
  return (
    typeof value === "string" &&
    TEXT_POSITIONS.includes(value as VideoTextPosition)
  );
}

function isVideoScene(value: unknown): value is VideoScene {
  if (!value || typeof value !== "object") {
    return false;
  }

  const scene = value as Partial<VideoScene>;

  return (
    typeof scene.id === "string" &&
    scene.id.trim().length > 0 &&
    typeof scene.text === "string" &&
    scene.text.trim().length > 0 &&
    typeof scene.durationInFrames === "number" &&
    Number.isInteger(scene.durationInFrames) &&
    scene.durationInFrames >= 30 &&
    scene.durationInFrames <= 450 &&
    (scene.supportingText === undefined ||
      typeof scene.supportingText === "string") &&
    (scene.narration === undefined || typeof scene.narration === "string") &&
    (scene.backgroundColor === undefined ||
      typeof scene.backgroundColor === "string") &&
    (scene.visual === undefined || typeof scene.visual === "string") &&
    (scene.visualPrompt === undefined ||
      typeof scene.visualPrompt === "string") &&
    (scene.imagePrompt === undefined ||
      typeof scene.imagePrompt === "string") &&
    (scene.bRollKeywords === undefined || isStringArray(scene.bRollKeywords)) &&
    (scene.imageUrl === undefined || typeof scene.imageUrl === "string") &&
    (scene.videoUrl === undefined || typeof scene.videoUrl === "string") &&
    (scene.cameraShot === undefined || isCameraShot(scene.cameraShot)) &&
    (scene.cameraMovement === undefined ||
      isCameraMovement(scene.cameraMovement)) &&
    (scene.transition === undefined || isSceneTransition(scene.transition)) &&
    (scene.emotion === undefined || typeof scene.emotion === "string") &&
    (scene.lighting === undefined || typeof scene.lighting === "string") &&
    (scene.colorMood === undefined || typeof scene.colorMood === "string") &&
    (scene.backgroundStyle === undefined ||
      typeof scene.backgroundStyle === "string") &&
    (scene.textPosition === undefined || isTextPosition(scene.textPosition)) &&
    (scene.thumbnailPrompt === undefined ||
      typeof scene.thumbnailPrompt === "string") &&
    (scene.thumbnailTitle === undefined ||
      typeof scene.thumbnailTitle === "string") &&
    (scene.musicMood === undefined || typeof scene.musicMood === "string") &&
    (scene.soundEffects === undefined || isStringArray(scene.soundEffects)) &&
    (scene.cta === undefined || typeof scene.cta === "string") &&
    (scene.hashtags === undefined || isStringArray(scene.hashtags)) &&
    (scene.confidence === undefined ||
      isNumberBetween(scene.confidence, 0, 100)) &&
    (scene.audience === undefined || typeof scene.audience === "string") &&
    (scene.objective === undefined || typeof scene.objective === "string") &&
    (scene.reasoning === undefined || typeof scene.reasoning === "string")
  );
}

function isVideoProductionPackage(
  value: unknown,
): value is VideoProductionPackage {
  if (!value || typeof value !== "object") {
    return false;
  }

  const productionPackage = value as Partial<VideoProductionPackage>;

  return (
    typeof productionPackage.title === "string" &&
    productionPackage.title.trim().length > 0 &&
    typeof productionPackage.hook === "string" &&
    productionPackage.hook.trim().length > 0 &&
    typeof productionPackage.thumbnailTitle === "string" &&
    productionPackage.thumbnailTitle.trim().length > 0 &&
    typeof productionPackage.thumbnailPrompt === "string" &&
    productionPackage.thumbnailPrompt.trim().length > 0 &&
    typeof productionPackage.caption === "string" &&
    productionPackage.caption.trim().length > 0 &&
    isStringArray(productionPackage.hashtags) &&
    productionPackage.hashtags.length >= 5 &&
    productionPackage.hashtags.length <= 8 &&
    typeof productionPackage.cta === "string" &&
    productionPackage.cta.trim().length > 0 &&
    typeof productionPackage.audience === "string" &&
    productionPackage.audience.trim().length > 0 &&
    typeof productionPackage.objective === "string" &&
    productionPackage.objective.trim().length > 0 &&
    typeof productionPackage.reasoning === "string" &&
    productionPackage.reasoning.trim().length > 0 &&
    isNumberBetween(productionPackage.confidence, 0, 100) &&
    isNumberBetween(productionPackage.estimatedLengthSeconds, 15, 45) &&
    isStringArray(productionPackage.recommendedPlatforms) &&
    productionPackage.recommendedPlatforms.length > 0 &&
    Array.isArray(productionPackage.scenes) &&
    productionPackage.scenes.length >= 4 &&
    productionPackage.scenes.length <= 7 &&
    productionPackage.scenes.every(isVideoScene)
  );
}

function isLegacyVideoPlan(value: unknown): value is LegacyVideoPlan {
  if (!value || typeof value !== "object") {
    return false;
  }

  const videoPlan = value as Partial<LegacyVideoPlan>;

  return (
    typeof videoPlan.openingText === "string" &&
    videoPlan.openingText.trim().length > 0 &&
    isStringArray(videoPlan.scenes) &&
    videoPlan.scenes.length >= 4 &&
    videoPlan.scenes.length <= 7 &&
    typeof videoPlan.endingText === "string" &&
    videoPlan.endingText.trim().length > 0 &&
    isNumberBetween(videoPlan.estimatedLengthSeconds, 15, 45)
  );
}

function isContentIdea(value: unknown): value is ContentIdea {
  if (!value || typeof value !== "object") {
    return false;
  }

  const idea = value as Partial<ContentIdea>;

  return (
    typeof idea.title === "string" &&
    idea.title.trim().length > 0 &&
    typeof idea.hook === "string" &&
    idea.hook.trim().length > 0 &&
    typeof idea.caption === "string" &&
    idea.caption.trim().length > 0 &&
    isStringArray(idea.hashtags) &&
    idea.hashtags.length >= 5 &&
    idea.hashtags.length <= 8 &&
    typeof idea.thumbnailIdea === "string" &&
    idea.thumbnailIdea.trim().length > 0 &&
    typeof idea.callToAction === "string" &&
    idea.callToAction.trim().length > 0 &&
    typeof idea.reason === "string" &&
    idea.reason.trim().length > 0 &&
    typeof idea.audience === "string" &&
    idea.audience.trim().length > 0 &&
    typeof idea.objective === "string" &&
    idea.objective.trim().length > 0 &&
    isNumberBetween(idea.confidence, 0, 100) &&
    (idea.format === "faceless_video" ||
      idea.format === "record_yourself" ||
      idea.format === "upload_video") &&
    isStringArray(idea.recommendedPlatforms) &&
    idea.recommendedPlatforms.length > 0 &&
    isLegacyVideoPlan(idea.videoPlan) &&
    isVideoProductionPackage(idea.productionPackage)
  );
}

function normalizeIncomingMemory(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));

    const incomingMemory = normalizeIncomingMemory(body.memory);

    const memory = [...defaultMemory.items, ...incomingMemory];
    const verifiedPerformancePlaybook =
      await crossPlatformLearningBrain.promptContext();

    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          error: "Missing OPENAI_API_KEY.",
        },
        {
          status: 500,
        },
      );
    }

    const prompt = `
You are KAI, the AI Chief Operating Officer and creative director inside KWEVORA OS.

KWEVORA helps ordinary people build income through digital products,
affiliate marketing, useful content, and consistent daily action.

Your job is not to produce generic filler.

Your job is to study KAI's memory, understand Kent's business,
identify what his audience is struggling with, and prepare complete,
production-ready short-form video packages.

Every idea must be strong enough to move directly into KWEVORA
Video Studio without Kent needing to invent the creative direction.

KAI'S VOICE:
- Plainspoken
- Calm
- Confident
- Encouraging
- Direct
- Honest
- Never robotic
- Never full of business jargon
- Never make unrealistic income promises
- Never use fake urgency
- Never repeat the same idea with slightly different wording

KENT'S AUDIENCE:
People who feel stuck working long hours, falling behind financially,
missing time with family, or wanting to create another source of income
but do not know where to begin.

KENT'S CURRENT CONTENT STYLE:
- Short-form vertical videos
- Faceless videos are allowed
- Words on screen are allowed
- Voiceover is optional
- Content should feel honest and relatable
- Content may point viewers toward KWEVORA products, a free guide,
  a Stan Store, a landing page, or a link in the bio

KAI MEMORY:
The following information represents what KAI currently knows about
the owner, business, audience, products, preferences, content history,
and previous learning.

Use this memory as the main source of context.

Do not contradict high-confidence memory unless newer information
clearly replaces it.

${JSON.stringify(memory, null, 2)}

VERIFIED CROSS-PLATFORM PERFORMANCE PLAYBOOK:
${JSON.stringify(verifiedPerformancePlaybook, null, 2)}

PERFORMANCE LEARNING RULES:
- Apply only patterns listed under repeat.
- Avoid patterns listed under avoid unless the new idea has a clearly different reason.
- Never treat a learning pattern or a single result as proven.
- Preserve platform-specific lessons; a TikTok result does not automatically prove the same choice on YouTube.
- When changing a weak pattern, change one meaningful variable so KAI can learn what caused the next result.
- Do not copy an old hook word-for-word. Reuse the proven structure or style with a fresh idea.
- If verifiedPublications is zero, use current creative standards and do not claim performance evidence.

YOUR TASK:
Create exactly 3 strong and meaningfully different short-form content ideas.

Each idea must:
1. Address one clear audience problem or desire.
2. Start with a hook that earns attention immediately.
3. Give the viewer a useful thought, lesson, or next step.
4. Sound natural instead of overly polished.
5. Include a complete production package.
6. Include a clear but non-pushy call to action.
7. Recommend only platforms where the idea genuinely fits.
8. Explain why the idea is worth creating today.
9. Be specific enough to send directly into KWEVORA Video Studio.
10. Avoid unsupported facts, guarantees, and exaggerated claims.
11. Use KAI's memory to make the idea relevant to Kent.
12. Avoid repeating topics or angles found in recent content memory.
13. Include an honest confidence score from 0 to 100.
14. State the specific audience and business objective.
15. Make every scene visually distinct but stylistically consistent.

CONTENT BALANCE:
The 3 ideas must serve different purposes.

Idea 1:
Teach something useful or give one practical next step.

Idea 2:
Build trust through recognition, honesty, or a relatable story.

Idea 3:
Naturally connect an audience problem to a KWEVORA product,
free resource, Stan Store destination, or link in the bio.

HOOK RULES:
- Keep each hook concise.
- Lead with tension, curiosity, recognition, or a specific benefit.
- Do not begin every hook with "If you."
- Do not use "You won't believe."
- Do not use "This changes everything."
- Do not use vague motivational filler.
- Make the viewer immediately understand why the video matters.

CAPTION RULES:
- Write in Kent's down-to-earth voice.
- Use short paragraphs.
- Make the caption useful even without watching the video.
- End naturally with the call to action.
- Do not make the caption sound like a corporate advertisement.

HASHTAG RULES:
- Provide 5 to 8 relevant hashtags.
- Do not use spaces inside a hashtag.
- Avoid unrelated viral hashtags.
- Include #KWEVORA when appropriate.
- Use hashtags connected to the actual audience and topic.

THUMBNAIL RULES:
- thumbnailTitle must be short and readable.
- thumbnailPrompt must describe a vertical, high-contrast image.
- Make the central idea easy to understand.
- Avoid clickbait the video does not deliver.
- Do not include logos from unrelated companies.
- Do not request copyrighted characters or celebrity likenesses.

PRODUCTION PACKAGE RULES:
- Each productionPackage must contain 4 to 7 structured scenes.
- The entire video must last between 15 and 45 seconds.
- Assume 30 frames per second.
- Each durationInFrames must be between 30 and 450.
- Scene durations should add up closely to the estimated video length.
- Each scene needs a unique id such as "idea-1-scene-1".
- Keep main scene text short enough to read quickly.
- supportingText is optional but should add useful context.
- narration may be empty when the video works without voiceover.
- visual describes what appears on screen.
- visualPrompt gives a detailed cinematic generation instruction.
- imagePrompt gives a clean still-image generation instruction.
- bRollKeywords must contain useful stock-footage search terms.
- camera choices must fit the emotion and message.
- transitions should support pacing instead of feeling random.
- Keep the style consistent across scenes.
- Use vertical 9:16 framing.
- The final scene should reinforce the CTA.
- Do not put URLs directly on screen unless memory supplies one.
- Do not fill imageUrl or videoUrl. Those are added later by KWEVORA.

ALLOWED cameraShot VALUES:
- extreme-wide
- wide
- medium
- close-up
- extreme-close-up
- over-the-shoulder
- top-down
- low-angle
- high-angle
- establishing
- detail

ALLOWED cameraMovement VALUES:
- static
- slow-push-in
- slow-pull-out
- push-in
- pull-out
- zoom-in
- zoom-out
- pan-left
- pan-right
- tilt-up
- tilt-down
- handheld
- tracking
- shake

ALLOWED transition VALUES:
- fade
- cross-dissolve
- hard-cut
- cut
- blur
- flash
- slide-left
- slide-right
- zoom
- zoom-through
- punch
- none

ALLOWED textPosition VALUES:
- top
- center
- bottom
- left
- right
- upper
- lower-third

FORMAT RULES:
- Use faceless_video when the idea works with stock footage,
  text screens, screen recordings, or simple visual clips.
- Use record_yourself when Kent's personal experience, credibility,
  or emotional connection makes the idea stronger.
- Use upload_video only when the idea is designed around existing footage.

PLATFORM RULES:
- Recommend only platforms that genuinely fit the idea.
- Use exact platform names such as:
  TikTok
  Instagram Reels
  YouTube Shorts
  Facebook Reels
- Do not automatically recommend every platform for every idea.

BACKWARD-COMPATIBILITY RULE:
videoPlan is the simplified legacy version used by existing KWEVORA screens.

For each productionPackage scene, include one matching plain-language
instruction inside videoPlan.scenes.

videoPlan.openingText should match the opening idea.
videoPlan.endingText should match the final CTA.
videoPlan.estimatedLengthSeconds must match
productionPackage.estimatedLengthSeconds.

The top-level title, hook, caption, hashtags, callToAction, audience,
objective, confidence, reason, and recommendedPlatforms must match
the corresponding information inside productionPackage.

Return ONLY valid JSON using this exact structure:

{
  "ideas": [
    {
      "title": "A clear internal title for the content idea",
      "hook": "The opening line shown or spoken to the viewer",
      "caption": "The complete ready-to-post caption",
      "hashtags": [
        "#ExampleOne",
        "#ExampleTwo",
        "#ExampleThree",
        "#ExampleFour",
        "#ExampleFive"
      ],
      "thumbnailIdea": "A short thumbnail concept",
      "callToAction": "The action the viewer should take next",
      "reason": "Why KAI selected this idea for Kent today",
      "audience": "The specific person this content is meant to reach",
      "objective": "The single business result this video should support",
      "confidence": 87,
      "format": "faceless_video",
      "recommendedPlatforms": [
        "TikTok",
        "Instagram Reels",
        "YouTube Shorts"
      ],
      "videoPlan": {
        "openingText": "The first words displayed on screen",
        "scenes": [
          "Plain-language instruction for scene 1",
          "Plain-language instruction for scene 2",
          "Plain-language instruction for scene 3",
          "Plain-language instruction for scene 4"
        ],
        "endingText": "The final words and CTA displayed on screen",
        "estimatedLengthSeconds": 25
      },
      "productionPackage": {
        "title": "The same title used above",
        "hook": "The same hook used above",
        "thumbnailTitle": "Short thumbnail words",
        "thumbnailPrompt": "Detailed vertical thumbnail image prompt",
        "caption": "The same complete caption used above",
        "hashtags": [
          "#ExampleOne",
          "#ExampleTwo",
          "#ExampleThree",
          "#ExampleFour",
          "#ExampleFive"
        ],
        "cta": "The same call to action used above",
        "audience": "The same specific audience used above",
        "objective": "The same business objective used above",
        "reasoning": "The same strategic reason used above",
        "confidence": 87,
        "estimatedLengthSeconds": 25,
        "recommendedPlatforms": [
          "TikTok",
          "Instagram Reels",
          "YouTube Shorts"
        ],
        "scenes": [
          {
            "id": "idea-1-scene-1",
            "text": "Short main words shown on screen",
            "supportingText": "Optional supporting words",
            "narration": "",
            "durationInFrames": 150,
            "backgroundColor": "#111111",
            "visual": "A clear description of what viewers see",
            "visualPrompt": "A detailed cinematic vertical-video prompt",
            "imagePrompt": "A detailed vertical still-image prompt",
            "bRollKeywords": [
              "keyword one",
              "keyword two",
              "keyword three"
            ],
            "cameraShot": "close-up",
            "cameraMovement": "slow-push-in",
            "transition": "fade",
            "emotion": "recognition",
            "lighting": "soft natural window light",
            "colorMood": "muted and hopeful",
            "backgroundStyle": "cinematic realistic environment",
            "textPosition": "center",
            "thumbnailPrompt": "A thumbnail prompt connected to this idea",
            "thumbnailTitle": "Short thumbnail title",
            "musicMood": "quiet determined build",
            "soundEffects": [
              "soft impact"
            ],
            "cta": "The same call to action",
            "hashtags": [
              "#ExampleOne",
              "#ExampleTwo"
            ],
            "confidence": 87,
            "audience": "The same specific audience",
            "objective": "The same business objective",
            "reasoning": "Why this scene belongs here"
          }
        ]
      }
    }
  ]
}
`;

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        input: prompt,
        temperature: 0.8,
        text: {
          format: {
            type: "json_object",
          },
        },
      }),
    });

    const data: unknown = await response.json();

    if (!response.ok) {
      console.error("OpenAI request failed:", data);

      return NextResponse.json(
        {
          error: "KAI could not generate content right now.",
          details: data,
        },
        {
          status: response.status,
        },
      );
    }

    const text = extractText(data);

    if (!text) {
      return NextResponse.json(
        {
          error: "KAI received an empty response from the AI service.",
        },
        {
          status: 500,
        },
      );
    }

    const parsed = extractJson(text);

    if (!parsed || typeof parsed !== "object") {
      throw new Error("The AI response was not a valid object.");
    }

    const parsedIdeas = (parsed as { ideas?: unknown }).ideas;

    if (!Array.isArray(parsedIdeas)) {
      throw new Error("The AI response did not include an ideas array.");
    }

    const validIdeas = parsedIdeas
      .filter(isContentIdea)
      .filter(
        (idea) =>
          idea.videoPlan.estimatedLengthSeconds ===
            idea.productionPackage.estimatedLengthSeconds &&
          idea.productionPackage.scenes.length === idea.videoPlan.scenes.length,
      )
      .slice(0, 3);

    if (validIdeas.length !== 3) {
      throw new Error(
        `KAI expected 3 complete production-ready ideas but received ${validIdeas.length}.`,
      );
    }

    return NextResponse.json({
      success: true,
      ideas: validIdeas,
      productionPackages: validIdeas.map((idea) => idea.productionPackage),
      memoryItemsUsed: memory.length,
      generatedAt: new Date().toISOString(),
      source: "kai-production-content-brain-with-memory",
      release: "4.7.1A",
    });
  } catch (error) {
    console.error("KAI content route error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "KAI encountered an unexpected content-generation error.",
      },
      {
        status: 500,
      },
    );
  }
}
