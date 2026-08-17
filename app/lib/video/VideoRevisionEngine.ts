import type { VideoProductionPackage, VideoScene } from "../../remotion/types";

export type VideoRevisionTarget =
  | "scene"
  | "captions"
  | "voice"
  | "music"
  | "pacing"
  | "platform";

export type PreparedVideoRevision = {
  productionPackage: VideoProductionPackage;
  target: VideoRevisionTarget;
  sceneIndex: number | null;
  instruction: string;
  changes: string[];
  regenerateImage: boolean;
  regenerateVoice: boolean;
};

function words(value: string, limit: number): string {
  const parts = value.trim().split(/\s+/);
  return parts.length <= limit
    ? value.trim()
    : `${parts.slice(0, limit).join(" ")}…`;
}

function paceMultiplier(instruction: string): number {
  const value = instruction.toLowerCase();
  if (
    value.includes("slower") ||
    value.includes("more time") ||
    value.includes("longer")
  )
    return 1.2;
  if (
    value.includes("faster") ||
    value.includes("quicker") ||
    value.includes("shorter")
  )
    return 0.82;
  return 0.92;
}

function platformSettings(platform: string) {
  const value = platform.toLowerCase();
  if (value.includes("tiktok"))
    return {
      seconds: 2.6,
      words: 10,
      movement: "push-in" as const,
      transition: "hard-cut" as const,
    };
  if (value.includes("instagram"))
    return {
      seconds: 3,
      words: 11,
      movement: "tracking" as const,
      transition: "zoom-through" as const,
    };
  if (value.includes("facebook"))
    return {
      seconds: 3.8,
      words: 16,
      movement: "slow-push-in" as const,
      transition: "cross-dissolve" as const,
    };
  return {
    seconds: 3.5,
    words: 14,
    movement: "slow-push-in" as const,
    transition: "hard-cut" as const,
  };
}

function updateScene(scene: VideoScene, instruction: string): VideoScene {
  return {
    ...scene,
    visualPrompt: `${scene.visualPrompt ?? scene.imagePrompt ?? scene.visual ?? "Cinematic scene"}. Owner revision: ${instruction}`,
    imagePrompt: `${scene.imagePrompt ?? scene.visualPrompt ?? scene.visual ?? "Cinematic scene"}. Owner revision: ${instruction}`,
    metadata: { ...scene.metadata, ownerRevision: instruction },
  };
}

export function prepareVideoRevision(input: {
  productionPackage: VideoProductionPackage;
  target: VideoRevisionTarget;
  instruction: string;
  sceneIndex?: number;
  platform?: string;
}): PreparedVideoRevision {
  const instruction = input.instruction.trim();
  if (!instruction) throw new Error("Tell KAI what you want changed.");
  const original = input.productionPackage;
  let scenes: VideoScene[] = original.scenes.map((scene) => ({
    ...scene,
    metadata: { ...scene.metadata },
  }));
  let music = original.music ? { ...original.music } : undefined;
  let voice = original.voice
    ? { ...original.voice, voice: { ...original.voice.voice } }
    : undefined;
  let recommendedPlatforms = [...original.recommendedPlatforms];
  let caption = original.caption;
  let videoDirection = original.videoDirection
    ? {
        ...original.videoDirection,
        evidence: [...original.videoDirection.evidence],
      }
    : undefined;
  const affectedVariables: Record<VideoRevisionTarget, string[]> = {
    scene: ["opening_style", "visual_sequence", "platform_native_cut"],
    captions: ["caption_style", "platform_native_cut"],
    voice: ["voice_style", "voice_rate", "platform_native_cut"],
    music: ["music_mood", "music_volume", "platform_native_cut"],
    pacing: ["pacing", "platform_native_cut"],
    platform: [
      "pacing",
      "opening_style",
      "caption_style",
      "visual_sequence",
      "platform_native_cut",
    ],
  };
  if (
    videoDirection?.creativeWinner &&
    affectedVariables[input.target].some(
      (variable) => variable in videoDirection.creativeWinner!.directions,
    )
  )
    videoDirection.creativeWinner = undefined;
  if (
    videoDirection?.experiment &&
    affectedVariables[input.target].includes(videoDirection.experiment.variable)
  )
    videoDirection.experiment = undefined;
  const changes: string[] = [];
  let regenerateImage = false;
  let regenerateVoice = false;
  let sceneIndex: number | null = null;

  if (input.target === "scene") {
    sceneIndex = Math.max(
      0,
      Math.min(scenes.length - 1, Math.floor(input.sceneIndex ?? 0)),
    );
    scenes[sceneIndex] = updateScene(scenes[sceneIndex], instruction);
    regenerateImage = true;
    changes.push(
      `Regenerated scene ${sceneIndex + 1} from the owner's visual instruction.`,
    );
  }
  if (input.target === "captions") {
    const shorter = /short|less|simpl|clean/i.test(instruction);
    scenes = scenes.map((scene) => ({
      ...scene,
      text: shorter ? words(scene.text, 8) : scene.text,
      supportingText:
        shorter && scene.supportingText
          ? words(scene.supportingText, 12)
          : scene.supportingText,
      metadata: { ...scene.metadata, captionRevision: instruction },
    }));
    caption = shorter ? words(caption, 35) : caption;
    if (videoDirection)
      videoDirection.textDensity = shorter ? "minimal" : "moderate";
    changes.push(
      "Updated on-screen captions without regenerating unrelated visual assets.",
    );
  }
  if (input.target === "pacing") {
    const multiplier = paceMultiplier(instruction);
    scenes = scenes.map((scene) => ({
      ...scene,
      durationInFrames: Math.max(
        36,
        Math.round(scene.durationInFrames * multiplier),
      ),
    }));
    if (videoDirection)
      videoDirection.pace =
        multiplier < 0.9
          ? "rapid"
          : multiplier > 1.1
            ? "deliberate"
            : "balanced";
    changes.push(
      `Adjusted scene timing by ${Math.round((multiplier - 1) * 100)}% while preserving visuals, voice, and music choices.`,
    );
  }
  if (input.target === "music") {
    const quieter = /quiet|lower|softer|less/i.test(instruction);
    const louder = /loud|higher|stronger|more/i.test(instruction);
    music = music
      ? { ...music, volume: quieter ? 0.14 : louder ? 0.27 : 0.2 }
      : music;
    changes.push(
      "Changed the music mix without rebuilding scenes or narration.",
    );
  }
  if (input.target === "voice") {
    if (!voice)
      throw new Error(
        "This video does not have a generated voice direction to revise.",
      );
    const slower = /slow|calm/i.test(instruction);
    const faster = /fast|energy|urgent/i.test(instruction);
    voice.voice.speakingRate = slower
      ? 0.9
      : faster
        ? 1.1
        : voice.voice.speakingRate;
    voice.reason = `${voice.reason} Owner revision: ${instruction}`;
    voice.generationPrompt = `${voice.generationPrompt} Owner revision: ${instruction}`;
    regenerateVoice = true;
    changes.push(
      "Regenerated narration from the existing approved script with revised delivery direction.",
    );
  }
  if (input.target === "platform") {
    const platform = input.platform?.trim() || instruction;
    const settings = platformSettings(platform);
    scenes = scenes.map((scene, index) => ({
      ...scene,
      text: words(
        scene.text,
        index === 0 ? Math.min(8, settings.words) : settings.words,
      ),
      durationInFrames: Math.max(45, Math.round(settings.seconds * 30)),
      cameraMovement: settings.movement,
      transition: settings.transition,
      metadata: { ...scene.metadata, platformRevision: platform },
    }));
    recommendedPlatforms = [
      platform,
      ...recommendedPlatforms.filter(
        (item) => item.toLowerCase() !== platform.toLowerCase(),
      ),
    ];
    if (videoDirection) {
      videoDirection.platform = platform;
      videoDirection.pace = settings.seconds <= 3 ? "rapid" : "balanced";
      videoDirection.textDensity =
        settings.words <= 11 ? "minimal" : "moderate";
    }
    changes.push(
      `Created a dedicated ${platform} cut while preserving the content strategy.`,
    );
  }

  const productionPackage: VideoProductionPackage = {
    ...original,
    caption,
    scenes,
    music,
    voice,
    recommendedPlatforms,
    videoDirection,
    estimatedLengthSeconds: Math.round(
      scenes.reduce((sum, scene) => sum + scene.durationInFrames / 30, 0),
    ),
    reasoning: `${original.reasoning} Revision: ${changes.join(" ")}`,
  };
  return {
    productionPackage,
    target: input.target,
    sceneIndex,
    instruction,
    changes,
    regenerateImage,
    regenerateVoice,
  };
}
