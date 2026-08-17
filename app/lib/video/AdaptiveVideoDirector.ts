import type { AdaptiveCreationPlan } from "../AdaptiveContentCreationBrain";
import type {
  AdaptiveVideoDirection,
  VideoProductionPackage,
  VideoScene,
} from "../../remotion/types";
import { videoPerformanceIntelligence } from "../VideoPerformanceIntelligence";
import type { VideoExperimentDirective } from "../VideoExperimentPlanner";
import type { CreativeWinnerDirective } from "../CreativeWinnerSystem";
import type { CreativePortfolioDirective } from "../CreativePortfolioManager";

type PlatformProfile = {
  aspectRatio: "9:16";
  pace: "rapid" | "balanced" | "deliberate";
  textDensity: "minimal" | "moderate";
  secondsPerScene: number;
  transition: VideoScene["transition"];
  cameraMovement: VideoScene["cameraMovement"];
  voiceRate: number;
  musicEnergy: "low" | "medium" | "high";
};

function profile(platform: string): PlatformProfile {
  const value = platform.toLowerCase();
  if (value.includes("tiktok"))
    return {
      aspectRatio: "9:16",
      pace: "rapid",
      textDensity: "minimal",
      secondsPerScene: 2.6,
      transition: "hard-cut",
      cameraMovement: "push-in",
      voiceRate: 1.08,
      musicEnergy: "high",
    };
  if (value.includes("instagram"))
    return {
      aspectRatio: "9:16",
      pace: "rapid",
      textDensity: "minimal",
      secondsPerScene: 3,
      transition: "zoom-through",
      cameraMovement: "tracking",
      voiceRate: 1.04,
      musicEnergy: "high",
    };
  if (value.includes("facebook"))
    return {
      aspectRatio: "9:16",
      pace: "balanced",
      textDensity: "moderate",
      secondsPerScene: 3.8,
      transition: "cross-dissolve",
      cameraMovement: "slow-push-in",
      voiceRate: 0.98,
      musicEnergy: "medium",
    };
  return {
    aspectRatio: "9:16",
    pace: "balanced",
    textDensity: "moderate",
    secondsPerScene: 3.5,
    transition: "hard-cut",
    cameraMovement: "slow-push-in",
    voiceRate: 1,
    musicEnergy: "medium",
  };
}

function shorten(value: string, words: number): string {
  const parts = value.trim().split(/\s+/);
  return parts.length <= words
    ? value.trim()
    : `${parts.slice(0, words).join(" ")}…`;
}

function visualStyle(
  scene: VideoScene,
  index: number,
  platform: string,
): Pick<
  VideoScene,
  "cameraShot" | "cameraMovement" | "transition" | "textPosition"
> {
  const shots: NonNullable<VideoScene["cameraShot"]>[] = [
    "close-up",
    "wide",
    "detail",
    "medium",
    "low-angle",
  ];
  const positions: NonNullable<VideoScene["textPosition"]>[] = [
    "center",
    "top",
    "lower-third",
    "center",
    "bottom",
  ];
  const selected = (index + platform.length) % shots.length;
  return {
    cameraShot: shots[selected],
    cameraMovement: scene.cameraMovement,
    transition: scene.transition,
    textPosition: positions[selected],
  };
}

export async function directAdaptiveVideo(input: {
  productionPackage: VideoProductionPackage;
  adaptiveCreation?: AdaptiveCreationPlan;
  videoExperiment?: VideoExperimentDirective;
  creativeWinner?: CreativeWinnerDirective;
  creativePortfolio?: CreativePortfolioDirective;
}): Promise<VideoProductionPackage> {
  const original = input.productionPackage;
  const adaptive = input.adaptiveCreation;
  const platform =
    input.videoExperiment?.destinationPlatform ??
    adaptive?.primaryPlatform ??
    original.recommendedPlatforms[0] ??
    "YouTube Shorts";
  const learned = await videoPerformanceIntelligence.playbook();
  const applicable = learned.provenPatterns.filter(
    (item) =>
      item.platform === "all" ||
      item.platform.toLowerCase() === platform.toLowerCase(),
  );
  const settings = { ...profile(platform) };
  const experiment = input.videoExperiment;
  const creativeWinner = input.creativeWinner;
  const winnerValue = (variable: string) =>
    (creativeWinner?.directions as Record<string, string> | undefined)?.[
      variable
    ];
  const expansionValue = (variable: string) =>
    experiment?.kind === "cross_platform_expansion" &&
    experiment.arm === "challenger"
      ? (experiment.sourceDirections as Record<string, string> | undefined)?.[
          variable
        ]
      : undefined;
  const learnedPacing = applicable.find((item) => item.dimension === "pacing");
  const learnedCaptions = applicable.find(
    (item) => item.dimension === "caption_style",
  );
  const learnedVoiceRate = applicable.find(
    (item) => item.dimension === "voice_rate",
  );
  const learnedMusicVolume = applicable.find(
    (item) => item.dimension === "music_volume",
  );
  const learnedOpening = applicable.find(
    (item) => item.dimension === "opening_style",
  );
  if (
    learnedPacing?.value === "rapid" ||
    learnedPacing?.value === "balanced" ||
    learnedPacing?.value === "deliberate"
  ) {
    settings.pace = learnedPacing.value;
    settings.secondsPerScene =
      learnedPacing.value === "rapid"
        ? 2.6
        : learnedPacing.value === "deliberate"
          ? 4.5
          : 3.5;
  }
  if (
    learnedCaptions?.value === "minimal" ||
    learnedCaptions?.value === "moderate"
  )
    settings.textDensity = learnedCaptions.value;
  const learnedRate = Number(learnedVoiceRate?.value);
  if (Number.isFinite(learnedRate) && learnedRate >= 0.8 && learnedRate <= 1.2)
    settings.voiceRate = learnedRate;
  const learnedVolume = Number(learnedMusicVolume?.value);
  let musicVolume =
    Number.isFinite(learnedVolume) &&
    learnedVolume >= 0.1 &&
    learnedVolume <= 0.3
      ? learnedVolume
      : settings.musicEnergy === "high"
        ? 0.23
        : settings.musicEnergy === "low"
          ? 0.18
          : 0.21;
  const variant = adaptive?.platformVariants.find(
    (item) => item.platform.toLowerCase() === platform.toLowerCase(),
  );
  const challenger = adaptive?.mode === "controlled_challenger";
  const changedVariable: AdaptiveVideoDirection["changedVariable"] = challenger
    ? adaptive.changedVariable === "duration"
      ? "pacing"
      : adaptive.changedVariable === "hook_style"
        ? "opening_scene"
        : adaptive.changedVariable === "cta_style"
          ? "ending_scene"
          : "visual_sequence"
    : null;

  const scenes = original.scenes.map((scene, index) => {
    const style = visualStyle(scene, index, platform);
    const isOpening = index === 0;
    const isEnding = index === original.scenes.length - 1;
    const targetSeconds = isOpening
      ? Math.min(2.2, settings.secondsPerScene)
      : isEnding
        ? settings.secondsPerScene + 0.8
        : settings.secondsPerScene;
    const maxWords =
      settings.textDensity === "minimal"
        ? isOpening
          ? 8
          : 12
        : isOpening
          ? 12
          : 18;
    return {
      ...scene,
      text: shorten(
        isOpening && variant?.hook ? variant.hook : scene.text,
        maxWords,
      ),
      supportingText: scene.supportingText
        ? shorten(scene.supportingText, maxWords + 5)
        : undefined,
      durationInFrames: Math.max(45, Math.round(targetSeconds * 30)),
      cameraShot: style.cameraShot,
      cameraMovement:
        challenger && changedVariable !== "visual_sequence"
          ? scene.cameraMovement
          : settings.cameraMovement,
      transition:
        challenger && changedVariable !== "pacing"
          ? scene.transition
          : settings.transition,
      textPosition: style.textPosition,
      metadata: {
        ...scene.metadata,
        adaptiveVideo: {
          platform,
          sceneRole: isOpening ? "hook" : isEnding ? "cta" : "proof",
          pace: settings.pace,
          textDensity: settings.textDensity,
          winnerProtected: adaptive?.winnerProtected ?? false,
          controlledChange: changedVariable,
        },
      },
    };
  });
  if (learnedOpening && scenes[0]) {
    const allowed: NonNullable<VideoScene["cameraShot"]>[] = [
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
    if (
      allowed.includes(
        learnedOpening.value as NonNullable<VideoScene["cameraShot"]>,
      )
    )
      scenes[0].cameraShot = learnedOpening.value as NonNullable<
        VideoScene["cameraShot"]
      >;
  }
  const applyDirections = (directions: Record<string, string>) => {
    for (const [variable, value] of Object.entries(directions)) {
      if (
        variable === "pacing" &&
        ["rapid", "balanced", "deliberate"].includes(value)
      ) {
        settings.pace = value as PlatformProfile["pace"];
        const seconds =
          value === "rapid" ? 2.6 : value === "deliberate" ? 4.5 : 3.5;
        scenes.forEach((scene, index) => {
          scene.durationInFrames = Math.max(
            45,
            Math.round((index === 0 ? Math.min(2.2, seconds) : seconds) * 30),
          );
        });
      } else if (
        variable === "caption_style" &&
        ["minimal", "moderate"].includes(value)
      ) {
        settings.textDensity = value as PlatformProfile["textDensity"];
        scenes.forEach((scene, index) => {
          scene.text = shorten(
            scene.text,
            value === "minimal"
              ? index === 0
                ? 8
                : 12
              : index === 0
                ? 12
                : 18,
          );
        });
      } else if (variable === "voice_rate" && Number.isFinite(Number(value)))
        settings.voiceRate = Number(value);
      else if (variable === "music_volume" && Number.isFinite(Number(value)))
        musicVolume = Number(value);
      else if (variable === "opening_style" && scenes[0])
        scenes[0].cameraShot = value as VideoScene["cameraShot"];
      else if (variable === "visual_sequence") scenes.reverse();
    }
  };
  if (creativeWinner)
    applyDirections(creativeWinner.directions as Record<string, string>);
  if (
    experiment?.kind === "cross_platform_expansion" &&
    experiment.arm === "challenger" &&
    experiment.sourceDirections
  )
    applyDirections(experiment.sourceDirections as Record<string, string>);
  if (experiment) {
    const value = experiment.value;
    if (
      experiment.variable === "pacing" &&
      ["rapid", "balanced", "deliberate"].includes(value)
    ) {
      settings.pace = value as PlatformProfile["pace"];
      const seconds =
        value === "rapid" ? 2.6 : value === "deliberate" ? 4.5 : 3.5;
      scenes.forEach((scene, index) => {
        scene.durationInFrames = Math.max(
          45,
          Math.round((index === 0 ? Math.min(2.2, seconds) : seconds) * 30),
        );
      });
    } else if (
      experiment.variable === "caption_style" &&
      ["minimal", "moderate"].includes(value)
    ) {
      settings.textDensity = value as PlatformProfile["textDensity"];
      scenes.forEach((scene, index) => {
        scene.text = shorten(
          scene.text,
          value === "minimal" ? (index === 0 ? 8 : 12) : index === 0 ? 12 : 18,
        );
      });
    } else if (
      experiment.variable === "voice_rate" &&
      Number.isFinite(Number(value))
    )
      settings.voiceRate = Number(value);
    else if (
      experiment.variable === "music_volume" &&
      Number.isFinite(Number(value))
    )
      musicVolume = Number(value);
    else if (experiment.variable === "opening_style" && scenes[0])
      scenes[0].cameraShot = value as VideoScene["cameraShot"];
    else if (experiment.variable === "visual_sequence") scenes.reverse();
  }

  const direction: AdaptiveVideoDirection = {
    mode: adaptive?.mode ?? "learning",
    platform,
    aspectRatio: settings.aspectRatio,
    pace: settings.pace,
    textDensity: settings.textDensity,
    voiceRate: settings.voiceRate,
    musicEnergy: settings.musicEnergy,
    changedVariable,
    winnerProtected: adaptive?.winnerProtected ?? false,
    evidence: [
      ...(adaptive?.decisions
        .filter((item) => item.action === "applied" || item.action === "tested")
        .map(
          (item) =>
            `${item.dimension}: ${item.value} (${item.evidenceCount} verified results)`,
        ) ?? []),
      ...applicable
        .slice(0, 6)
        .map(
          (item) =>
            `video ${item.dimension}: ${item.value} (${item.evidenceCount} verified publications)`,
        ),
    ],
    whyKaiDirectedItThisWay: `${
      adaptive
        ? `${adaptive.whyKaiCreatedThis} KAI directed a ${settings.pace} ${platform} cut with ${settings.textDensity} on-screen text and protected every winning video choice outside ${changedVariable ?? "the proven direction"}.${applicable.length ? ` ${applicable.length} editing choice${applicable.length === 1 ? "" : "s"} came from repeated verified video results.` : " Video-editing choices remain in learning until three verified publications agree."}`
        : `KAI used a safe ${platform} production profile while verified video-direction evidence is still being collected.`
    }${creativeWinner ? ` KAI reused the verified ${creativeWinner.variable.replaceAll("_", " ")} winner (${creativeWinner.value}) because the product, audience, platform, format, hook, offer, and CTA matched.` : ""}${experiment ? ` The approved experiment then changed only ${experiment.variable.replaceAll("_", " ")} for its ${experiment.arm} arm.` : ""}`,
    experiment: experiment
      ? {
          id: experiment.experimentId,
          arm: experiment.arm,
          variable: experiment.variable,
          value: experiment.value,
          directions: {
            ...(experiment.sourceDirections as
              | Record<string, string>
              | undefined),
            [experiment.variable]: experiment.value,
          },
          hypothesis: experiment.hypothesis,
          matchedConditions: experiment.matchedConditions,
          kind: experiment.kind,
          sourceWinnerId: experiment.sourceWinnerId,
          sourcePlatform: experiment.sourcePlatform,
          destinationPlatform: experiment.destinationPlatform,
          sourceDirections: experiment.sourceDirections as
            | Record<string, string>
            | undefined,
        }
      : undefined,
    creativeWinner: creativeWinner
      ? {
          id: creativeWinner.winnerId,
          sourceExperimentId: creativeWinner.sourceExperimentId,
          variable: creativeWinner.variable,
          value: creativeWinner.value,
          directions: creativeWinner.directions as Record<string, string>,
          explanation: creativeWinner.explanation,
          context: creativeWinner.context,
        }
      : undefined,
    creativePortfolio: input.creativePortfolio
      ? {
          planId: input.creativePortfolio.portfolioPlanId,
          slotId: input.creativePortfolio.slotId,
          role: input.creativePortfolio.role,
          winnerId: input.creativePortfolio.winnerId,
          winnerScore: input.creativePortfolio.winnerScore,
          reason: input.creativePortfolio.reason,
        }
      : undefined,
  };

  return {
    ...original,
    hook: variant?.hook ?? original.hook,
    caption: variant?.caption ?? original.caption,
    cta: variant?.callToAction ?? original.cta,
    scenes,
    voice: original.voice
      ? {
          ...original.voice,
          voice: {
            ...original.voice.voice,
            speakingRate: settings.voiceRate,
            ...(winnerValue("voice_style") &&
            [
              "professional",
              "conversational",
              "confident",
              "calm",
              "energetic",
              "friendly",
              "motivational",
              "urgent",
            ].includes(winnerValue("voice_style")!)
              ? {
                  style: winnerValue(
                    "voice_style",
                  ) as typeof original.voice.voice.style,
                }
              : {}),
            ...(expansionValue("voice_style") &&
            [
              "professional",
              "conversational",
              "confident",
              "calm",
              "energetic",
              "friendly",
              "motivational",
              "urgent",
            ].includes(expansionValue("voice_style")!)
              ? {
                  style: expansionValue(
                    "voice_style",
                  ) as typeof original.voice.voice.style,
                }
              : {}),
            ...(experiment?.variable === "voice_style" &&
            [
              "professional",
              "conversational",
              "confident",
              "calm",
              "energetic",
              "friendly",
              "motivational",
              "urgent",
            ].includes(experiment.value)
              ? { style: experiment.value as typeof original.voice.voice.style }
              : {}),
          },
        }
      : original.voice,
    musicMood:
      experiment?.variable === "music_mood"
        ? experiment.value
        : (expansionValue("music_mood") ??
          winnerValue("music_mood") ??
          original.musicMood),
    music: original.music
      ? { ...original.music, volume: musicVolume }
      : original.music,
    estimatedLengthSeconds: Math.round(
      scenes.reduce((total, scene) => total + scene.durationInFrames / 30, 0),
    ),
    videoDirection: direction,
  };
}
