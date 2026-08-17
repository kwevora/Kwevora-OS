import type {
  VideoAudioTrack,
  VideoScene,
} from "../../remotion/types";

export type MusicMood =
  | "cinematic-inspiring"
  | "emotional"
  | "motivational"
  | "suspenseful"
  | "uplifting"
  | "confident"
  | "calm"
  | "energetic";

export type MusicEnergy =
  | "low"
  | "medium"
  | "high";

export type MusicDirectionInput = {
  title: string;
  hook?: string;
  topic?: string;
  audience?: string;
  objective?: string;
  preferredMood?: string;
  scenes: VideoScene[];
};

export type MusicDirection = {
  mood: MusicMood;
  energy: MusicEnergy;
  reason: string;
  track: VideoAudioTrack;
};

type MusicTrackDefinition = {
  id: string;
  mood: MusicMood;
  energy: MusicEnergy;
  url: string;
  volume: number;
  fadeInSeconds: number;
  fadeOutSeconds: number;
};

// Only list files that actually ship with KWEVORA. Never pretend a mood has a
// unique soundtrack when the file does not exist.
const MUSIC_TRACKS: MusicTrackDefinition[] = [
  {
    id: "cinematic-rise-01",
    mood: "cinematic-inspiring",
    energy: "medium",
    url: "/music/sigmamusicart-football-football-music-551346.mp3",
    volume: 0.24,
    fadeInSeconds: 1.5,
    fadeOutSeconds: 2.5,
  },
  {
    id: "uplifting-future-01",
    mood: "uplifting",
    energy: "medium",
    url: "/music/sigmamusicart-football-football-music-551346.mp3",
    volume: 0.22,
    fadeInSeconds: 1.5,
    fadeOutSeconds: 2.5,
  },
];

function normalizeText(
  ...values: Array<string | undefined>
): string {
  return values
    .filter(
      (value): value is string =>
        typeof value === "string",
    )
    .join(" ")
    .trim()
    .toLowerCase();
}

function includesAny(
  text: string,
  phrases: string[],
): boolean {
  return phrases.some((phrase) =>
    text.includes(phrase),
  );
}

function determineMood(
  input: MusicDirectionInput,
): MusicMood {
  const explicitMood = input.preferredMood?.trim().toLowerCase();
  const knownMood = MUSIC_TRACKS.find((track) => track.mood === explicitMood)?.mood;
  if (knownMood) return knownMood;
  const sceneText = input.scenes
    .map((scene) =>
      [
        scene.text,
        scene.supportingText,
        scene.narration,
        scene.emotion,
        scene.musicMood,
        scene.objective,
      ]
        .filter(Boolean)
        .join(" "),
    )
    .join(" ");

  const text = normalizeText(
    input.title,
    input.hook,
    input.topic,
    input.audience,
    input.objective,
    input.preferredMood,
    sceneText,
  );

  if (
    includesAny(text, [
      "suspense",
      "warning",
      "danger",
      "secret",
      "nobody tells",
      "truth",
      "mistake",
      "trap",
      "before it is too late",
    ])
  ) {
    return "suspenseful";
  }

  if (
    includesAny(text, [
      "sad",
      "struggle",
      "pain",
      "family",
      "lost",
      "missed",
      "alone",
      "emotional",
      "pressure",
      "sacrifice",
    ])
  ) {
    return "emotional";
  }

  if (
    includesAny(text, [
      "energy",
      "fast",
      "viral",
      "scroll",
      "attention",
      "exciting",
      "powerful",
      "rapid",
    ])
  ) {
    return "energetic";
  }

  if (
    includesAny(text, [
      "motivation",
      "keep going",
      "discipline",
      "consistent",
      "work hard",
      "take action",
      "start today",
      "do not quit",
    ])
  ) {
    return "motivational";
  }

  if (
    includesAny(text, [
      "freedom",
      "future",
      "hope",
      "possibility",
      "better life",
      "transformation",
      "dream",
      "one step closer",
    ])
  ) {
    return "uplifting";
  }

  if (
    includesAny(text, [
      "confidence",
      "business",
      "success",
      "result",
      "proof",
      "growth",
      "income",
      "revenue",
      "build",
    ])
  ) {
    return "confident";
  }

  if (
    includesAny(text, [
      "calm",
      "focus",
      "simple",
      "clear",
      "peace",
      "slow",
      "relax",
    ])
  ) {
    return "calm";
  }

  return "cinematic-inspiring";
}

function determineEnergy(
  input: MusicDirectionInput,
  mood: MusicMood,
): MusicEnergy {
  const averageSceneDuration =
    input.scenes.length > 0
      ? input.scenes.reduce(
          (total, scene) =>
            total +
            Math.max(
              1,
              scene.durationInFrames,
            ),
          0,
        ) /
        input.scenes.length /
        30
      : 5;

  if (
    mood === "energetic" ||
    mood === "motivational"
  ) {
    return "high";
  }

  if (
    mood === "emotional" ||
    mood === "calm"
  ) {
    return "low";
  }

  if (averageSceneDuration <= 4) {
    return "high";
  }

  if (averageSceneDuration >= 7) {
    return "low";
  }

  return "medium";
}

function selectTrack(
  mood: MusicMood,
  energy: MusicEnergy,
): MusicTrackDefinition {
  return (
    MUSIC_TRACKS.find(
      (track) =>
        track.mood === mood &&
        track.energy === energy,
    ) ??
    MUSIC_TRACKS.find(
      (track) => track.mood === mood,
    ) ??
    MUSIC_TRACKS[0]
  );
}

function buildReason(
  mood: MusicMood,
  energy: MusicEnergy,
): string {
  return (
    `KAI selected ${mood.replaceAll(
      "-",
      " ",
    )} music with ${energy} energy ` +
    "to match the video's emotion, pacing, and story."
  );
}

export function directVideoMusic(
  input: MusicDirectionInput,
): MusicDirection {
  const mood = determineMood(input);

  const energy = determineEnergy(
    input,
    mood,
  );

  const selectedTrack = selectTrack(
    mood,
    energy,
  );

  return {
    mood,
    energy,
    reason: buildReason(
      mood,
      energy,
    ),
    track: {
      url: selectedTrack.url,
      volume: selectedTrack.volume,
      startFromSeconds: 0,
      fadeInSeconds:
        selectedTrack.fadeInSeconds,
      fadeOutSeconds:
        selectedTrack.fadeOutSeconds,
      loop: true,
    },
  };
}

export function getAvailableMusicTracks(): ReadonlyArray<{
  id: string;
  mood: MusicMood;
  energy: MusicEnergy;
  url: string;
}> {
  return MUSIC_TRACKS.map((track) => ({
    id: track.id,
    mood: track.mood,
    energy: track.energy,
    url: track.url,
  }));
}
