import type { VideoProductionPackage, VideoScene } from "../../remotion/types";

const FPS = 30;
const TOTAL_FRAMES = 30 * FPS;
const DEFAULT_HASHTAGS = [
  "#KWEVORA",
  "#ContentPlanner",
  "#ContentCreator",
  "#DigitalProduct",
  "#SocialMediaMarketing",
];

type TemplateInput = {
  videoId: string;
  productName: string;
  offerDescription: string;
  audience: string;
  destination: string;
  productAssetUrls: string[];
};

type SceneDefinition = {
  purpose: "hook" | "solution" | "demonstration" | "outcome" | "call-to-action";
  headline: string;
  narration: string;
  durationInFrames: number;
  assetIndex?: number;
  cameraShot: VideoScene["cameraShot"];
  cameraMovement: VideoScene["cameraMovement"];
  transition: VideoScene["transition"];
  visual: string;
};

const DEFINITIONS: SceneDefinition[] = [
  { purpose: "hook", headline: "Still planning in scattered notes?", narration: "Planning content in scattered notes?", durationInFrames: 75, cameraShot: "close-up", cameraMovement: "push-in", transition: "hard-cut", visual: "Fast-moving scattered content cards resolve into one organized system." },
  { purpose: "solution", headline: "One system. Every post.", narration: "Meet KWEVORA—one clear system for every post.", durationInFrames: 90, assetIndex: 0, cameraShot: "wide", cameraMovement: "slow-push-in", transition: "zoom-through", visual: "Reveal the real KWEVORA Content Planner product overview." },
  { purpose: "demonstration", headline: "", narration: "Set goals, audience, platforms, and notes together.", durationInFrames: 105, assetIndex: 1, cameraShot: "detail", cameraMovement: "pan-right", transition: "slide-left", visual: "Demonstrate the real planner dashboard and its organization controls." },
  { purpose: "demonstration", headline: "", narration: "See every post before deadlines sneak up.", durationInFrames: 105, assetIndex: 2, cameraShot: "detail", cameraMovement: "pan-left", transition: "slide-right", visual: "Demonstrate the real monthly calendar view." },
  { purpose: "demonstration", headline: "", narration: "Keep ideas, files, captions, and details together.", durationInFrames: 105, assetIndex: 3, cameraShot: "detail", cameraMovement: "slow-push-in", transition: "punch", visual: "Demonstrate the real content ideas database and its working fields." },
  { purpose: "demonstration", headline: "", narration: "Move content from idea to scheduled and published.", durationInFrames: 105, assetIndex: 1, cameraShot: "medium", cameraMovement: "pan-left", transition: "cross-dissolve", visual: "Show the real workflow tabs and publishing progression." },
  { purpose: "outcome", headline: "More creating. Less searching.", narration: "Spend less time searching. Create more.", durationInFrames: 90, assetIndex: 2, cameraShot: "wide", cameraMovement: "slow-pull-out", transition: "zoom", visual: "Return to the real calendar as the organized outcome." },
  { purpose: "call-to-action", headline: "Click the link to get it", narration: "Click the link to get the KWEVORA Content Planner.", durationInFrames: 225, assetIndex: 0, cameraShot: "wide", cameraMovement: "slow-push-in", transition: "fade", visual: "Hold on the real product while the Stan Store destination and hashtags remain readable." },
];

function isVideoAsset(url: string) {
  return /\.(mp4|webm|mov)(?:\?.*)?$/i.test(url);
}

function assertTemplateContract(input: TemplateInput) {
  if (input.productAssetUrls.length < 4) {
    throw new Error("The proven KWEVORA ad template requires the hero, dashboard, calendar, and ideas product images.");
  }
  if (!/^https?:\/\//i.test(input.destination)) {
    throw new Error("The proven ad template requires the public Stan Store product link.");
  }
  if (DEFINITIONS.reduce((total, scene) => total + scene.durationInFrames, 0) !== TOTAL_FRAMES) {
    throw new Error("The proven ad template must be exactly 30 seconds.");
  }
}

export function buildProvenProductAdTemplate(input: TemplateInput): VideoProductionPackage {
  assertTemplateContract(input);

  const scenes = DEFINITIONS.map((definition, index): VideoScene => {
    const productAssetUrl = definition.assetIndex === undefined ? undefined : input.productAssetUrls[definition.assetIndex];
    const productProof = Boolean(productAssetUrl);
    const productAssetIsVideo = productAssetUrl ? isVideoAsset(productAssetUrl) : false;
    const designedHook = index === 0;

    return {
      id: `${input.videoId}-template-scene-${index + 1}`,
      text: definition.headline,
      supportingText: "",
      narration: definition.narration,
      durationInFrames: definition.durationInFrames,
      backgroundColor: "#05070B",
      visual: definition.visual,
      visualPrompt: definition.visual,
      imagePrompt: definition.visual,
      imageUrl: productProof && !productAssetIsVideo ? productAssetUrl : undefined,
      videoUrl: productProof && productAssetIsVideo ? productAssetUrl : undefined,
      cameraShot: definition.cameraShot,
      cameraMovement: definition.cameraMovement,
      transition: definition.transition,
      emotion: index === 0 ? "urgent" : index === DEFINITIONS.length - 1 ? "confident" : "clear",
      lighting: "premium high-contrast product commercial",
      colorMood: "KWEVORA midnight blue and electric cyan",
      backgroundStyle: "cinematic product interface",
      textPosition: definition.purpose === "call-to-action" ? "center" : "top",
      thumbnailTitle: "Plan Every Post",
      thumbnailPrompt: "The real KWEVORA Content Planner interface in a premium vertical product advertisement.",
      musicMood: "confident",
      soundEffects: index === 0 ? ["impact", "card-whoosh"] : ["interface-whoosh"],
      cta: "Click the link to get the KWEVORA Content Planner.",
      hashtags: DEFAULT_HASHTAGS,
      confidence: 100,
      audience: input.audience,
      objective: `Demonstrate ${input.productName} with truthful product proof and send qualified viewers to the Stan Store.`,
      reasoning: "Proven product-demonstration template; visual order and timing are locked.",
      metadata: {
        templateId: "kwevora-planner-proof-v1",
        templateLocked: true,
        scenePurpose: definition.purpose,
        visualSource: productProof ? "product" : "designed-faceless-motion",
        productProof,
        productAssetUrl,
        productAssetIndex: definition.assetIndex,
        designedFacelessMotion: designedHook,
        visualTreatment: designedHook ? "scattered-content-cards" : undefined,
        motionProvider: designedHook ? "KAI Remotion template" : "truthful product asset",
        motionGenerated: designedHook,
        footageQuery: `locked-template-${index + 1}-${definition.purpose}`,
        destination: input.destination,
        narrationEndBufferSeconds: 2,
      },
    };
  });

  return {
    title: `${input.productName} — Product Demonstration`,
    hook: DEFINITIONS[0].narration,
    thumbnailTitle: "Plan Every Post",
    thumbnailPrompt: "The real KWEVORA Content Planner interface in a premium vertical product advertisement.",
    caption: `Plan, organize, and track every post in one clear system. Get ${input.productName} here: ${input.destination}`,
    hashtags: DEFAULT_HASHTAGS,
    cta: "Click the link to get the KWEVORA Content Planner.",
    audience: input.audience,
    objective: `Sell ${input.productName} with a truthful, product-led demonstration.`,
    reasoning: `A deterministic product-proof template replaces generative retries and stock-footage dependency. ${input.offerDescription}`,
    confidence: 100,
    estimatedLengthSeconds: 30,
    recommendedPlatforms: ["TikTok", "Instagram Reels", "YouTube Shorts"],
    musicMood: "confident",
    scenes,
  };
}

export function validateProvenProductAdTemplate(productionPackage: VideoProductionPackage, narrationDurationSeconds?: number) {
  const failures: string[] = [];
  const totalFrames = productionPackage.scenes.reduce((total, scene) => total + scene.durationInFrames, 0);
  const productAssets = new Set(productionPackage.scenes.filter((scene) => scene.metadata?.productProof === true).map((scene) => String(scene.metadata?.productAssetUrl ?? "")).filter(Boolean));
  const finalScene = productionPackage.scenes.at(-1);

  if (productionPackage.scenes.length !== 8) failures.push("The ad must contain exactly eight template scenes.");
  if (totalFrames !== TOTAL_FRAMES) failures.push("The ad must be exactly 30 seconds.");
  if (productAssets.size < 4) failures.push("All four real planner assets must appear in the ad.");
  if (productionPackage.scenes.filter((scene) => scene.metadata?.productProof === true).length < 7) failures.push("Seven of eight scenes must visibly demonstrate the real product.");
  if (finalScene?.metadata?.scenePurpose !== "call-to-action") failures.push("The final scene must be the Stan Store CTA.");
  if (!/^https?:\/\//i.test(String(finalScene?.metadata?.destination ?? ""))) failures.push("The CTA must include the Stan Store URL.");
  if (!/click the link/i.test(`${finalScene?.text ?? ""} ${finalScene?.narration ?? ""}`)) failures.push("The CTA must tell the viewer to click the link.");
  if ((finalScene?.hashtags ?? []).length < 3) failures.push("The CTA must include campaign hashtags.");
  if (narrationDurationSeconds && narrationDurationSeconds > 28) failures.push("Narration must finish at least two seconds before the video ends.");
  if (failures.length) throw new Error(`Proven ad template validation failed: ${failures.join(" ")}`);
}
