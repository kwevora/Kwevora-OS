import { promises as fs } from "node:fs";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { prepareVideoRevision, type VideoRevisionTarget } from "../../../lib/video/VideoRevisionEngine";
import { generateImagesInQueue } from "../../../lib/video/ImageGenerationQueue";
import { generatePlannedVoice } from "../../../lib/video/VoiceGenerationService";
import { renderProductionVideo } from "../../../lib/video/RenderManager";
import type { VideoProductionPackage } from "../../../remotion/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const reviewFile = path.join(process.cwd(), "data", "review-queue.json");
const targets = new Set<VideoRevisionTarget>(["scene", "captions", "voice", "music", "pacing", "platform"]);
type Item = Record<string, unknown> & {
  id: string;
  media?: Record<string, unknown>;
  videoProduction?: Record<string, unknown> & {
    videoId?: string;
    currentVersion?: number;
    productionPackage?: VideoProductionPackage;
    versions?: Array<Record<string, unknown>>;
  };
  platformApprovals?: Record<string, unknown>;
};

function platformKey(value: string): string {
  const lower = value.toLowerCase();
  if (lower.includes("youtube")) return "youtube";
  if (lower.includes("tiktok")) return "tiktok";
  if (lower.includes("instagram")) return "instagram";
  if (lower.includes("facebook")) return "facebook";
  return lower.trim();
}

async function queue(): Promise<Item[]> {
  try { const value = JSON.parse(await fs.readFile(reviewFile, "utf8")); return Array.isArray(value) ? value : []; }
  catch { return []; }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as Record<string, unknown>;
    const id = typeof body.id === "string" ? body.id.trim() : "";
    const target = typeof body.target === "string" && targets.has(body.target as VideoRevisionTarget) ? body.target as VideoRevisionTarget : null;
    const instruction = typeof body.instruction === "string" ? body.instruction.trim() : "";
    if (!id || !target || !instruction) return NextResponse.json({ success: false, message: "Choose what to change and tell KAI what you want." }, { status: 400 });
    const items = await queue();
    const index = items.findIndex((item) => item.id === id);
    if (index < 0) return NextResponse.json({ success: false, message: "Review item not found." }, { status: 404 });
    const item = items[index];
    const source = item.videoProduction?.productionPackage;
    if (!source) return NextResponse.json({ success: false, message: "The finished video's production package is unavailable." }, { status: 409 });
    const nextVersion = (item.videoProduction?.currentVersion ?? 1) + 1;
    const videoId = `${item.videoProduction?.videoId ?? id}-v${nextVersion}`;
    const prepared = prepareVideoRevision({
      productionPackage: source,
      target,
      instruction,
      sceneIndex: typeof body.sceneIndex === "number" ? body.sceneIndex : undefined,
      platform: typeof body.platform === "string" ? body.platform : undefined,
    });
    let productionPackage = prepared.productionPackage;
    if (prepared.regenerateImage && prepared.sceneIndex !== null) {
      const scene = productionPackage.scenes[prepared.sceneIndex];
      const [image] = await generateImagesInQueue([{ videoId, sceneId: scene.id, prompt: scene.imagePrompt ?? scene.visualPrompt ?? instruction }], { delayBetweenImagesMs: 0 });
      productionPackage = { ...productionPackage, scenes: productionPackage.scenes.map((value, sceneIndex) => sceneIndex === prepared.sceneIndex ? { ...value, imageUrl: image.imageUrl } : value) };
    }
    if (prepared.regenerateVoice && productionPackage.voice) {
      const generated = await generatePlannedVoice({ videoId, voiceDirection: productionPackage.voice });
      if (!generated.success || !generated.audioUrl) throw new Error(generated.message);
      productionPackage = {
        ...productionPackage,
        voice: generated.voice,
        scenes: productionPackage.scenes.map((scene) => ({ ...scene, voiceAudioUrl: generated.audioUrl })),
      };
    }
    const render = await renderProductionVideo({ videoId, title: productionPackage.title, brand: "KWEVORA", scenes: productionPackage.scenes, musicMood: productionPackage.musicMood, music: productionPackage.music });
    let size = 0;
    try { size = (await fs.stat(render.outputLocation)).size; } catch { /* URL-backed output */ }
    const version = {
      version: nextVersion, videoId, videoUrl: render.videoUrl, outputLocation: render.outputLocation,
      createdAt: new Date().toISOString(), changeType: target, request: instruction,
      changes: prepared.changes,
      platform: productionPackage.recommendedPlatforms[0] ?? "Primary platform",
      videoDirection: productionPackage.videoDirection,
      editingProfile: {
        pacing: productionPackage.videoDirection?.pace ?? "unknown",
        textDensity: productionPackage.videoDirection?.textDensity ?? "unknown",
        voiceRate: productionPackage.voice?.voice.speakingRate ?? null,
        voiceStyle: productionPackage.voice?.voice.style ?? "unknown",
        musicMood: productionPackage.musicMood ?? "unknown",
        musicVolume: productionPackage.music?.volume ?? null,
        openingStyle: productionPackage.scenes[0]?.cameraShot ?? "unknown",
        visualSequence: productionPackage.scenes.map((scene) => scene.cameraShot ?? "unknown").join(" → "),
        experiment: productionPackage.videoDirection?.experiment,
        creativeWinner: productionPackage.videoDirection?.creativeWinner,
        creativePortfolio: productionPackage.videoDirection?.creativePortfolio,
      },
    };
    const retainedApprovals = { ...(item.platformApprovals ?? {}) };
    if (target === "platform") delete retainedApprovals[platformKey(productionPackage.recommendedPlatforms[0] ?? "")];
    items[index] = {
      ...item,
      platformApprovals: retainedApprovals,
      media: {
        source: "generated", fileName: path.basename(render.outputLocation), storedFileName: path.basename(render.outputLocation),
        mimeType: "video/mp4", size, filePath: render.outputLocation, videoUrl: render.videoUrl,
      },
      videoDirectionFeedback: instruction,
      videoProduction: {
        ...item.videoProduction,
        videoId, videoUrl: render.videoUrl, currentVersion: nextVersion,
        approvedVersion: undefined,
        productionPackage,
        versions: [...(item.videoProduction?.versions ?? []), version],
        whyKaiDirectedItThisWay: `${productionPackage.videoDirection?.whyKaiDirectedItThisWay ?? "KAI preserved the approved direction."} ${prepared.changes.join(" ")}`,
        reviewRequired: true,
      },
    };
    await fs.mkdir(path.dirname(reviewFile), { recursive: true });
    await fs.writeFile(reviewFile, JSON.stringify(items, null, 2), "utf8");
    return NextResponse.json({ success: true, item: items[index], version, message: `Version ${nextVersion} is ready. KAI changed only ${target} and kept it in review.` });
  } catch (error) {
    return NextResponse.json({ success: false, message: error instanceof Error ? error.message : "KAI could not revise the video." }, { status: 500 });
  }
}
