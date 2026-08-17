import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { VideoScene } from "../../remotion/types";
import { generateOpenArtVideo } from "./OpenArtMcpVideoService";

type PexelsFile = { id: number; file_type: string; width: number; height: number; link: string };
type PexelsVideo = { id: number; url: string; user?: { name?: string; url?: string }; video_files?: PexelsFile[] };
type PexelsResponse = { videos?: PexelsVideo[] };
type PixabayRendition = { url: string; width: number; height: number; size: number };
type PixabayVideo = {
  id: number;
  pageURL: string;
  user?: string;
  user_id?: number;
  videos?: Record<string, PixabayRendition>;
};
type PixabayResponse = { hits?: PixabayVideo[] };
type MotionCandidate = {
  key: string;
  provider: "Pexels" | "Pixabay";
  sourceId: number;
  sourceUrl: string;
  creator: string;
  creatorUrl?: string;
  downloadUrl: string;
};

export class MotionFootageConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MotionFootageConfigurationError";
  }
}

const safeName = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9-_]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");

function validKey(value: string | undefined, minimumLength = 12) {
  const key = value?.trim();
  return key && key.length >= minimumLength && !/^\*+$/.test(key) ? key : undefined;
}

function cleanQuery(scene: VideoScene, productName: string) {
  const raw = [...(scene.bRollKeywords ?? []), scene.visual, scene.visualPrompt, productName]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ");
  const blocked = new Set([
    "kwevora", "product", "audience", "creative", "direction", "scene",
    "show", "video", "vertical", "cinematic", "footage", "portrait",
  ]);
  const words = raw.split(/\s+/).filter((word) => word.length > 2 && !blocked.has(word));
  return [...new Set(words)].slice(0, 10).join(" ");
}

function choosePexelsFile(video: PexelsVideo) {
  return (video.video_files ?? [])
    .filter((file) => file.file_type === "video/mp4" && file.height > file.width && file.height >= 960)
    .sort(
      (a, b) =>
        Math.abs(a.height - 1920) + Math.abs(a.width - 1080) -
        (Math.abs(b.height - 1920) + Math.abs(b.width - 1080)),
    )[0];
}

async function searchPexels(query: string, used: Set<string>): Promise<MotionCandidate | undefined> {
  const key = validKey(process.env.PEXELS_API_KEY, 20);
  if (!key) return undefined;
  const url = new URL("https://api.pexels.com/v1/videos/search");
  url.searchParams.set("query", query);
  url.searchParams.set("orientation", "portrait");
  url.searchParams.set("size", "medium");
  url.searchParams.set("per_page", "30");
  const response = await fetch(url, { headers: { Authorization: key } });
  if (response.status === 401 || response.status === 403) {
    throw new MotionFootageConfigurationError("Pexels rejected its saved API key.");
  }
  if (!response.ok) throw new Error(`Pexels search temporarily failed (${response.status}).`);
  const result = (await response.json()) as PexelsResponse;
  for (const video of result.videos ?? []) {
    const file = choosePexelsFile(video);
    const candidateKey = `pexels:${video.id}`;
    if (!file || used.has(candidateKey)) continue;
    return {
      key: candidateKey,
      provider: "Pexels",
      sourceId: video.id,
      sourceUrl: video.url,
      creator: video.user?.name ?? "Pexels contributor",
      creatorUrl: video.user?.url,
      downloadUrl: file.link,
    };
  }
  return undefined;
}

function choosePixabayRendition(video: PixabayVideo) {
  return Object.values(video.videos ?? {})
    .filter((file) => Boolean(file.url) && file.height > file.width && file.height >= 720)
    .sort(
      (a, b) =>
        Math.abs(a.height - 1920) + Math.abs(a.width - 1080) -
        (Math.abs(b.height - 1920) + Math.abs(b.width - 1080)),
    )[0];
}

async function searchPixabay(query: string, used: Set<string>): Promise<MotionCandidate | undefined> {
  const key = validKey(process.env.PIXABAY_API_KEY);
  if (!key) return undefined;
  const url = new URL("https://pixabay.com/api/videos/");
  url.searchParams.set("key", key);
  url.searchParams.set("q", query.slice(0, 100));
  url.searchParams.set("video_type", "film");
  url.searchParams.set("safesearch", "true");
  url.searchParams.set("editors_choice", "true");
  url.searchParams.set("per_page", "50");
  const response = await fetch(url);
  if (response.status === 400 || response.status === 401 || response.status === 403) {
    throw new MotionFootageConfigurationError("Pixabay rejected its saved API key.");
  }
  if (!response.ok) throw new Error(`Pixabay search temporarily failed (${response.status}).`);
  const result = (await response.json()) as PixabayResponse;
  for (const video of result.hits ?? []) {
    const file = choosePixabayRendition(video);
    const candidateKey = `pixabay:${video.id}`;
    if (!file || used.has(candidateKey)) continue;
    return {
      key: candidateKey,
      provider: "Pixabay",
      sourceId: video.id,
      sourceUrl: video.pageURL,
      creator: video.user ?? "Pixabay contributor",
      creatorUrl: video.user && video.user_id
        ? `https://pixabay.com/users/${video.user}-${video.user_id}/`
        : undefined,
      downloadUrl: file.url,
    };
  }
  return undefined;
}

async function downloadVideo(url: string, provider: string) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${provider} footage download returned ${response.status}.`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length < 100_000) throw new Error(`${provider} returned an incomplete clip.`);
  return bytes;
}

function designedFallback(scene: VideoScene, index: number): VideoScene {
  const treatments = [
    "scattered-content-cards",
    "deadline-pressure",
    "idea-overload",
    "workflow-build",
    "calendar-organization",
    "publishing-momentum",
    "outcome-proof",
    "link-conversion",
  ] as const;
  const visualTreatment = treatments[index % treatments.length];
  return {
    ...scene,
    imageUrl: undefined,
    videoUrl: undefined,
    metadata: {
      ...scene.metadata,
      visualSource: "designed-faceless-motion",
      visualTreatment,
      designedFacelessMotion: true,
      productProof: false,
      motionProvider: "KAI Remotion faceless ad system",
      motionGenerated: true,
      motionSelectedByKai: true,
      footageQuery: `designed faceless motion ${visualTreatment} ${index + 1}`,
    },
  };
}

export async function generateMotionScenes(input: {
  videoId: string;
  productName: string;
  audience: string;
  creativeApproach: string;
  productAssetUrls?: string[];
  openArtAccessToken?: string;
  scenes: VideoScene[];
  logger?: (message: string) => void;
}) {
  const folder = safeName(input.videoId);
  const outputDir = path.join(process.cwd(), "public", "generated", folder);
  await mkdir(outputDir, { recursive: true });
  const usedCandidates = new Set<string>();
  const completed: VideoScene[] = [];
  const failures: string[] = [];
  let generated = 0;
  let openArtAttempts = 0;

  for (let index = 0; index < input.scenes.length; index += 1) {
    const scene = input.scenes[index];
    if (scene.metadata?.presenterGenerated === true && scene.videoUrl) {
      completed.push(scene);
      generated += 1;
      continue;
    }
    if (scene.metadata?.productProof === true) {
      completed.push(scene);
      continue;
    }

    if (input.openArtAccessToken && openArtAttempts < 3) {
      openArtAttempts += 1;
      const openArtPrompt = [
        "Create one polished five-second vertical 9:16 commercial shot.",
        `Scene purpose: ${scene.visual || scene.visualPrompt || scene.text || "human product-use moment"}.`,
        `Spoken story context: ${scene.narration || scene.text || ""}.`,
        `Product: ${input.productName}. Audience: ${input.audience}. Campaign approach: ${input.creativeApproach}.`,
        "Use realistic adult human context, believable natural movement, cinematic lighting, clear subject action, and premium TikTok-ad pacing.",
        "Do not generate titles, captions, logos, watermarks, interface text, deformed hands, duplicated people, or a talking-head presenter.",
        "The shot must feel like genuine live-action footage and end on a clean frame suitable for a fast transition.",
      ].join(" ");

      input.logger?.(
        `OpenArt is generating premium motion for scene ${index + 1}/${input.scenes.length}.`,
      );
      const openArt = await generateOpenArtVideo({
        accessToken: input.openArtAccessToken,
        prompt: openArtPrompt,
        productAssetUrl: input.productAssetUrls?.find((url) => /^https?:\\/\\//i.test(url)),
      });

      if (openArt.success) {
        try {
          const fileName = `${safeName(scene.id)}-openart-${openArtAttempts}.mp4`;
          await writeFile(
            path.join(outputDir, fileName),
            await downloadVideo(openArt.videoUrl, "OpenArt"),
          );
          completed.push({
            ...scene,
            imageUrl: undefined,
            videoUrl: `/generated/${folder}/${fileName}`,
            metadata: {
              ...scene.metadata,
              visualSource: "openart-generated-video",
              productProof: false,
              motionProvider: "OpenArt",
              motionGenerated: true,
              motionSelectedByKai: true,
              openArtTool: openArt.toolName,
              openArtModel: openArt.model,
              footageQuery: openArtPrompt,
              stillFallbackAllowed: false,
            },
          });
          generated += 1;
          continue;
        } catch (error) {
          const reason = error instanceof Error ? error.message : "OpenArt footage download failed.";
          failures.push(`Scene ${index + 1}: ${reason}`);
          input.logger?.(`OpenArt clip could not be downloaded for scene ${index + 1}; KAI is trying free footage next.`);
        }
      } else {
        failures.push(`Scene ${index + 1}: ${openArt.message}`);
        input.logger?.(`OpenArt could not complete scene ${index + 1}; KAI is trying free footage next.`);
      }
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

    let selected: MotionCandidate | undefined;
    let selectedQuery = primaryQuery;
    const providerErrors: string[] = [];
    for (const query of queries) {
      for (const search of [searchPexels, searchPixabay]) {
        try {
          selected = await search(query, usedCandidates);
        } catch (error) {
          providerErrors.push(error instanceof Error ? error.message : "Footage provider failed.");
        }
        if (selected) {
          selectedQuery = query;
          break;
        }
      }
      if (selected) break;
    }

    if (!selected) {
      const reason = providerErrors.length > 0
        ? [...new Set(providerErrors)].join(" ")
        : "No suitable portrait clip was returned.";
      failures.push(`Scene ${index + 1}: ${reason}`);
      input.logger?.(`Using KAI's designed faceless motion for scene ${index + 1}; ${reason}`);
      completed.push(designedFallback(scene, index));
      continue;
    }

    try {
      usedCandidates.add(selected.key);
      const fileName = `${safeName(scene.id)}-${selected.provider.toLowerCase()}-${selected.sourceId}.mp4`;
      await writeFile(
        path.join(outputDir, fileName),
        await downloadVideo(selected.downloadUrl, selected.provider),
      );
      completed.push({
        ...scene,
        imageUrl: undefined,
        videoUrl: `/generated/${folder}/${fileName}`,
        metadata: {
          ...scene.metadata,
          motionProvider: selected.provider,
          motionGenerated: false,
          motionSelectedByKai: true,
          footageSourceId: selected.sourceId,
          footageSourceUrl: selected.sourceUrl,
          footageCreator: selected.creator,
          footageCreatorUrl: selected.creatorUrl,
          footageQuery: selectedQuery,
          stillFallbackAllowed: false,
        },
      });
      generated += 1;
    } catch (error) {
      const reason = error instanceof Error ? error.message : "Footage download failed.";
      failures.push(`Scene ${index + 1}: ${reason}`);
      input.logger?.(`Using KAI's designed faceless motion for scene ${index + 1}; ${reason}`);
      completed.push(designedFallback(scene, index));
    }
  }

  if (
    generated === 0 &&
    !validKey(process.env.PEXELS_API_KEY, 20) &&
    !validKey(process.env.PIXABAY_API_KEY)
  ) {
    failures.push("No stock-footage API is configured; KAI used designed faceless motion.");
  }

  return { scenes: completed, generated, failures };
}
