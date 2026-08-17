import type { VideoAudioTrack, VideoScene } from "../../remotion/types";

const INTERNAL_COPY = [/\bproduct\s*:/i, /\baudience\s*:/i, /\bcreative direction\s*:/i, /\bcreative approach\s*:/i, /show what the buyer receives/i, /make the product tangible/i, /avoid hype/i, /campaign approach/i];
const REJECTED_TEMPLATE_COPY = [/stop juggling your content/i, /scattered ideas kill consistency/i, /content shouldn't feel this hard/i, /one planner.*every campaign/i, /organizes it all/i, /plan.*schedule.*publish/i, /create with clarity/i, /get the planner/i];
const wordCount = (value?: string) => value?.trim().split(/\s+/).filter(Boolean).length ?? 0;

export function enforcePremiumVideoQuality(input: { scenes: VideoScene[]; music?: VideoAudioTrack }) {
  const failures: string[] = [];
  if (input.scenes.length < 4) failures.push("The campaign needs at least four directed scenes.");
  const productProofScenes = input.scenes.filter((scene) => scene.metadata?.productProof === true);
  if (productProofScenes.length < 3) failures.push("The campaign must show the real product in at least three scenes.");
  input.scenes.forEach((scene, index) => {
    const isProductProof = scene.metadata?.productProof === true;
    if (isProductProof && !scene.videoUrl && !scene.imageUrl) failures.push(`Scene ${index + 1} has no uploaded product proof.`);
    if (!isProductProof && !scene.videoUrl) failures.push(`Scene ${index + 1} has no genuine motion footage.`);
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
  const narrationUrls = new Set(input.scenes.map((scene) => scene.voiceAudioUrl).filter(Boolean));
  if (narrationUrls.size !== 1) failures.push("The finished cut does not contain one continuous narration master.");
  if (!input.music?.url.includes("-kai-original.wav")) failures.push("The soundtrack was not created uniquely for this campaign.");
  if (failures.length > 0) throw new Error(`Premium quality gate stopped this render: ${failures.join(" ")}`);
}
