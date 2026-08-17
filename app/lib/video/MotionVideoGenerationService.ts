import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { VideoScene } from "../../remotion/types";

type PexelsFile = { id: number; quality: string; file_type: string; width: number; height: number; link: string };
type PexelsVideo = { id: number; url: string; user?: { name?: string; url?: string }; video_files?: PexelsFile[] };
type PexelsResponse = { videos?: PexelsVideo[] };

export class MotionFootageConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MotionFootageConfigurationError";
  }
}

const safeName = (value: string) => value.toLowerCase().replace(/[^a-z0-9-_]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");

function getApiKey() {
  const key = process.env.PEXELS_API_KEY?.trim();
  if (!key || key.length < 20 || /^\*+$/.test(key)) {
    throw new MotionFootageConfigurationError(
      "The free footage connection is missing or invalid.",
    );
  }
  return key;
}

function cleanQuery(scene: VideoScene, productName: string) {
  const raw = [...(scene.bRollKeywords ?? []), scene.visual, scene.visualPrompt, productName]
    .filter(Boolean).join(" ").toLowerCase().replace(/[^a-z0-9\s-]/g, " ");
  const blocked = new Set(["kwevora", "product", "audience", "creative", "direction", "scene", "show", "video", "vertical", "cinematic", "footage", "portrait"]);
  const words = raw.split(/\s+/).filter((word) => word.length > 2 && !blocked.has(word));
  return [...new Set(words)].slice(0, 10).join(" ");
}

async function searchVideos(query: string) {
  const url = new URL("https://api.pexels.com/videos/search");
  url.searchParams.set("query", query);
  url.searchParams.set("orientation", "portrait");
  url.searchParams.set("size", "medium");
  url.searchParams.set("per_page", "20");
  const response = await fetch(url, { headers: { Authorization: getApiKey() } });
  if (response.status === 401 || response.status === 403) {
    throw new MotionFootageConfigurationError(
      "The free footage connection rejected its saved API key.",
    );
  }
  if (!response.ok) {
    throw new Error(`Free footage search temporarily failed (${response.status}).`);
  }
  return (await response.json()) as PexelsResponse;
}

function chooseFile(video: PexelsVideo) {
  return (video.video_files ?? [])
    .filter((file) => file.file_type === "video/mp4" && file.height > file.width && file.height >= 960)
    .sort((a, b) => Math.abs(a.height - 1920) + Math.abs(a.width - 1080) - (Math.abs(b.height - 1920) + Math.abs(b.width - 1080)))[0];
}

async function downloadVideo(url: string) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Footage download returned ${response.status}.`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length < 100_000) throw new Error("Pexels returned an incomplete clip.");
  return bytes;
}

export async function generateMotionScenes(input: { videoId: string; productName: string; audience: string; creativeApproach: string; scenes: VideoScene[]; logger?: (message: string) => void }) {
  const folder = safeName(input.videoId);
  const outputDir = path.join(process.cwd(), "public", "generated", folder);
  await mkdir(outputDir, { recursive: true });
  const usedVideoIds = new Set<number>();
  const completed: VideoScene[] = [];
  let generated = 0;

  for (let index = 0; index < input.scenes.length; index += 1) {
    const scene = input.scenes[index];
    if (scene.metadata?.presenterGenerated === true && scene.videoUrl) {
      input.logger?.(`Using KAI's generated presenter for scene ${index + 1}/${input.scenes.length}.`);
      completed.push(scene);
      generated += 1;
      continue;
    }
    if (scene.metadata?.productProof === true) {
      input.logger?.(`Using the uploaded product itself for scene ${index + 1}/${input.scenes.length}.`);
      completed.push(scene);
      continue;
    }
    const primaryQuery = cleanQuery(scene, input.productName);
    const fallbackQuery = [...(scene.bRollKeywords ?? [])]
      .join(" ")
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, " ")
      .split(/\s+/)
      .filter((word) => word.length > 2)
      .slice(0, 6)
      .join(" ");
    const queries = [...new Set([primaryQuery, fallbackQuery, "small business creator working"])]
      .filter(Boolean);
    input.logger?.(`Finding fresh vertical footage for scene ${index + 1}/${input.scenes.length}: ${primaryQuery}.`);
    let selected: PexelsVideo | undefined;
    let selectedQuery = primaryQuery;
    for (const query of queries) {
      const result = await searchVideos(query);
      selected = (result.videos ?? []).find(
        (video) => !usedVideoIds.has(video.id) && Boolean(chooseFile(video)),
      );
      if (selected) {
        selectedQuery = query;
        break;
      }
    }
    if (!selected) throw new Error(`No suitable free portrait footage was found for scene ${index + 1}.`);
    const file = chooseFile(selected);
    if (!file) throw new Error(`Scene ${index + 1} had no usable portrait MP4.`);
    usedVideoIds.add(selected.id);
    const fileName = `${safeName(scene.id)}-pexels-${selected.id}.mp4`;
    await writeFile(path.join(outputDir, fileName), await downloadVideo(file.link));
    completed.push({
      ...scene,
      imageUrl: undefined,
      videoUrl: `/generated/${folder}/${fileName}`,
      metadata: {
        ...scene.metadata,
        motionProvider: "Pexels",
        motionGenerated: false,
        motionSelectedByKai: true,
        pexelsVideoId: selected.id,
        pexelsVideoUrl: selected.url,
        pexelsCreator: selected.user?.name ?? "Pexels contributor",
        pexelsCreatorUrl: selected.user?.url,
        footageQuery: selectedQuery,
        stillFallbackAllowed: false,
      },
    });
    generated += 1;
  }
  return { scenes: completed, generated, failures: [] as string[] };
}
