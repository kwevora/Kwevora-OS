import type { VideoAudioTrack, VideoScene } from "../../remotion/types";

const INTERNAL_COPY = [/\bproduct\s*:/i, /\baudience\s*:/i, /\bcreative direction\s*:/i, /\bcreative approach\s*:/i, /show what the buyer receives/i, /make the product tangible/i, /avoid hype/i, /campaign approach/i, /before\/?after visualization/i, /content creator joyful/i];
const REJECTED_TEMPLATE_COPY = [/stop juggling your content/i, /scattered ideas kill consistency/i, /content shouldn't feel this hard/i, /one planner.*every campaign/i, /organizes it all/i, /plan.*schedule.*publish/i, /create with clarity/i, /get the planner/i];
const wordCount = (value?: string) => value?.trim().split(/\s+/).filter(Boolean).length ?? 0;

export function enforcePremiumVideoQuality(input: { scenes: VideoScene[]; music?: VideoAudioTrack; narrationDurationSeconds?: number }) {
  const failures: string[] = [];
  if (input.scenes.length < 4) failures.push("The campaign needs at least four directed scenes.");
  const productProofScenes = input.scenes.filter((scene) => scene.metadata?.productProof === true);
  const uniqueProductAssets = new Set(
    productProofScenes
      .map((scene) => String(scene.metadata?.productAssetUrl ?? "").trim())
      .filter(Boolean),
  );
  const requiredProductScenes = uniqueProductAssets.size <= 1
    ? 2
    : uniqueProductAssets.size <= 3
      ? 3
      : 5;
  if (productProofScenes.length < requiredProductScenes) {
    failures.push("The campaign does not contain enough truthful product proof for the available assets.");
  }
  input.scenes.forEach((scene, index) => {
    const isProductProof = scene.metadata?.productProof === true;
    if (isProductProof && !scene.videoUrl && !scene.imageUrl) failures.push(`Scene ${index + 1} has no uploaded product proof.`);
    const hasDesignedFacelessMotion =
      scene.metadata?.designedFacelessMotion === true &&
      typeof scene.metadata?.visualTreatment === "string" &&
      scene.metadata.visualTreatment.trim().length > 0;
    const hasDirectedFacelessMotion =
      Boolean(scene.videoUrl) || hasDesignedFacelessMotion;
    if (!isProductProof && !hasDirectedFacelessMotion) {
      failures.push(`Scene ${index + 1} has no directed faceless motion treatment.`);
    }
    if (!scene.voiceAudioUrl) failures.push(`Scene ${index + 1} has no Chatterbox narration.`);
    if (!isProductProof && scene.imageUrl) failures.push(`Scene ${index + 1} still contains a slideshow fallback.`);
    if (wordCount(scene.text) > 7) failures.push(`Scene ${index + 1} headline exceeds seven words.`);
    if (wordCount(scene.supportingText) > 14) failures.push(`Scene ${index + 1} supporting copy exceeds fourteen words.`);
    const visibleCopy = `${scene.text ?? ""} ${scene.supportingText ?? ""}`;
    if (INTERNAL_COPY.some((pattern) => pattern.test(visibleCopy))) failures.push(`Scene ${index + 1} exposes KAI's internal planning instructions.`);
    if (REJECTED_TEMPLATE_COPY.some((pattern) => pattern.test(visibleCopy))) failures.push(`Scene ${index + 1} reused rejected template copy.`);
    if (!scene.narration || wordCount(scene.narration) < 4) failures.push(`Scene ${index + 1} has no meaningful spoken story.`);
  });
  const stockScenes = input.scenes.filter((scene) => scene.metadata?.productProof !== true);
  const queries = stockScenes.map((scene) => String(scene.metadata?.footageQuery ?? "").trim()).filter(Boolean);
  if (queries.length !== stockScenes.length || new Set(queries).size !== stockScenes.length) failures.push("The visual plan repeats or omits context-footage searches.");
  const visibleScenes = input.scenes.filter((scene) => Boolean(scene.text?.trim()) || Boolean(scene.supportingText?.trim()));
  if (visibleScenes.length > 3) failures.push("The edit relies on too many text cards instead of spoken storytelling.");
  const averageSceneSeconds = input.scenes.reduce((total, scene) => total + scene.durationInFrames / 30, 0) / Math.max(1, input.scenes.length);
  if (averageSceneSeconds > 4.5) failures.push("The edit changes visuals too slowly for a short-form product ad.");
  const productShotPatterns = new Set(productProofScenes.map((scene) =>
    `${scene.cameraShot ?? ""}:${scene.cameraMovement ?? ""}:${String(scene.visual ?? "")}`.toLowerCase()
  ));
  if (productShotPatterns.size < Math.min(requiredProductScenes, 4)) failures.push("The product demonstration repeats the same treatment instead of using the available product media intentionally.");
  const narrationUrls = new Set(input.scenes.map((scene) => scene.voiceAudioUrl).filter(Boolean));
  if (narrationUrls.size !== 1) failures.push("The finished cut does not contain one continuous narration master.");
  if (!input.music?.url.includes("-kai-original.wav")) failures.push("The soundtrack was not created uniquely for this campaign.");
  const visualKeys = new Set(input.scenes.map((scene) =>
    scene.videoUrl ||
    (scene.imageUrl ? `${scene.imageUrl}:${scene.cameraShot}:${scene.cameraMovement}` : "") ||
    (scene.metadata?.designedFacelessMotion === true
      ? `designed:${String(scene.metadata?.visualTreatment ?? "")}:${scene.id}`
      : "")
  ).filter(Boolean));
  if (visualKeys.size < Math.min(4, input.scenes.length)) failures.push("The campaign does not contain enough visual variety.");
  const rawMediaUsage = new Map<string, number>();
  for (const scene of input.scenes) {
    const mediaUrl = scene.videoUrl || scene.imageUrl;
    if (!mediaUrl) continue;
    rawMediaUsage.set(mediaUrl, (rawMediaUsage.get(mediaUrl) ?? 0) + 1);
  }
  if ([...rawMediaUsage.values()].some((count) => count > 2)) {
    failures.push("One media asset is repeated through too much of the advertisement.");
  }
  const ctaScene = input.scenes.find(
    (scene) => scene.metadata?.scenePurpose === "call-to-action",
  );
  if (!ctaScene) {
    failures.push("The advertisement has no final call-to-action scene.");
  } else {
    if (!/\b(click|tap)\b.*\blink\b/i.test(`${ctaScene.text} ${ctaScene.narration}`)) {
      failures.push("The final scene does not tell the viewer to click the link.");
    }
    if (!String(ctaScene.metadata?.destination ?? "").startsWith("http")) {
      failures.push("The final scene does not contain the product destination.");
    }
    if ((ctaScene.hashtags ?? []).length < 3) {
      failures.push("The final scene needs at least three campaign hashtags.");
    }
  }
  if (input.narrationDurationSeconds) {
    const videoDurationSeconds = input.scenes.reduce((total, scene) => total + scene.durationInFrames / 30, 0);
    if (videoDurationSeconds < input.narrationDurationSeconds + 0.75) failures.push("The video ends before the narration is complete.");
  }
  if (failures.length > 0) throw new Error(`Premium quality gate stopped this render: ${failures.join(" ")}`);
}
