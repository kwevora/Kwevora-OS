export type VideoCameraShot =
  | "extreme-wide"
  | "wide"
  | "medium"
  | "close-up"
  | "extreme-close-up"
  | "over-the-shoulder"
  | "top-down"
  | "low-angle"
  | "high-angle"
  | "establishing"
  | "detail";

export type VideoCameraMovement =
  | "static"
  | "slow-push-in"
  | "slow-pull-out"
  | "push-in"
  | "pull-out"
  | "zoom-in"
  | "zoom-out"
  | "pan-left"
  | "pan-right"
  | "tilt-up"
  | "tilt-down"
  | "handheld"
  | "tracking"
  | "shake";

export type VideoSceneTransition =
  | "fade"
  | "cross-dissolve"
  | "hard-cut"
  | "cut"
  | "blur"
  | "flash"
  | "slide-left"
  | "slide-right"
  | "zoom"
  | "zoom-through"
  | "punch"
  | "none";

export type VideoTextPosition =
  | "top"
  | "center"
  | "bottom"
  | "left"
  | "right"
  | "upper"
  | "lower-third";

export type VideoPresenterGender = "male" | "female" | "neutral";

export type VideoPresenterAgeRange =
  | "young-adult"
  | "adult"
  | "middle-aged"
  | "older-adult";

export type VideoPresenterStyle =
  | "casual"
  | "business-casual"
  | "professional"
  | "creator"
  | "cinematic";

export type VideoPresenterEnergy =
  | "calm"
  | "conversational"
  | "confident"
  | "energetic"
  | "emotional"
  | "urgent";

export type VideoPresenterFraming =
  | "close-up"
  | "medium-close-up"
  | "medium"
  | "waist-up";

export type VideoPresenterBackground =
  | "clean-studio"
  | "modern-office"
  | "home-office"
  | "cinematic-dark"
  | "lifestyle"
  | "transparent";

export type VideoPresenterVoiceStyle =
  | "warm"
  | "friendly"
  | "authoritative"
  | "motivational"
  | "calm"
  | "dramatic"
  | "energetic";

export type VideoPresenterProfile = {
  id: string;
  name: string;

  gender: VideoPresenterGender;
  ageRange: VideoPresenterAgeRange;
  style: VideoPresenterStyle;
  energy: VideoPresenterEnergy;

  framing: VideoPresenterFraming;
  background: VideoPresenterBackground;
  voiceStyle: VideoPresenterVoiceStyle;

  speakingRate: number;
  eyeContact: boolean;
  handGestures: boolean;

  expression: string;
  wardrobe: string;
};

export type VideoPresenterDirection = {
  presenter: VideoPresenterProfile;
  reason: string;
  deliveryNotes: string[];
  generationPrompt: string;

  presenterVideoUrl?: string;
  presenterAudioUrl?: string;

  status?: "planned" | "generating" | "ready" | "failed";
};

export type VideoVoiceGender = "male" | "female" | "neutral";

export type VideoVoiceEmotion =
  | "calm"
  | "confident"
  | "conversational"
  | "dramatic"
  | "emotional"
  | "energetic"
  | "friendly"
  | "motivational"
  | "urgent";

export type VideoVoicePause = {
  afterText: string;
  durationMilliseconds: number;
};

export type VideoVoiceEmphasis = {
  text: string;
  strength: "light" | "medium" | "strong";
};

export type VideoVoiceProfile = {
  id: string;
  name: string;

  gender: VideoVoiceGender;
  style: VideoPresenterVoiceStyle;
  emotion: VideoVoiceEmotion;

  speakingRate: number;
  pitch: number;
  stability: number;
  clarity: number;
  warmth: number;
};

export type VideoVoiceDirection = {
  voice: VideoVoiceProfile;

  script: string;
  deliveryScript: string;

  pauses: VideoVoicePause[];
  emphasis: VideoVoiceEmphasis[];
  pronunciationNotes: string[];

  reason: string;
  generationPrompt: string;

  status: "planned" | "generating" | "ready" | "failed";

  audioUrl?: string;
};

export type VideoScene = {
  id: string;

  text: string;
  supportingText?: string;
  narration?: string;

  durationInFrames: number;
  backgroundColor?: string;

  visual?: string;
  visualPrompt?: string;
  imagePrompt?: string;

  bRollKeywords?: string[];

  imageUrl?: string;
  videoUrl?: string;

  presenterVideoUrl?: string;
  presenterAudioUrl?: string;
  voiceAudioUrl?: string;

  cameraShot?: VideoCameraShot;
  cameraMovement?: VideoCameraMovement;
  transition?: VideoSceneTransition;

  emotion?: string;
  lighting?: string;
  colorMood?: string;
  backgroundStyle?: string;

  textPosition?: VideoTextPosition;

  thumbnailPrompt?: string;
  thumbnailTitle?: string;

  musicMood?: string;
  soundEffects?: string[];

  cta?: string;
  hashtags?: string[];

  confidence?: number;
  audience?: string;
  objective?: string;
  reasoning?: string;

  metadata?: Record<string, unknown>;
};

export type VideoAudioTrack = {
  url: string;
  volume?: number;
  startFromSeconds?: number;
  fadeInSeconds?: number;
  fadeOutSeconds?: number;
  loop?: boolean;
};

export type VideoProductionPackage = {
  title: string;
  hook: string;

  thumbnailTitle: string;
  thumbnailPrompt: string;

  caption: string;
  hashtags: string[];

  cta: string;

  audience: string;
  objective: string;
  reasoning: string;

  confidence: number;

  estimatedLengthSeconds: number;

  recommendedPlatforms: string[];

  musicMood?: string;
  music?: VideoAudioTrack;

  presenter?: VideoPresenterDirection;
  voice?: VideoVoiceDirection;

  scenes: VideoScene[];

  videoDirection?: AdaptiveVideoDirection;
};

export type AdaptiveVideoDirection = {
  mode: "proven_winner" | "controlled_challenger" | "learning";
  platform: string;
  aspectRatio: "9:16";
  pace: "rapid" | "balanced" | "deliberate";
  textDensity: "minimal" | "moderate";
  voiceRate: number;
  musicEnergy: "low" | "medium" | "high";
  changedVariable:
    | "pacing"
    | "opening_scene"
    | "ending_scene"
    | "visual_sequence"
    | null;
  winnerProtected: boolean;
  evidence: string[];
  whyKaiDirectedItThisWay: string;
  experiment?: {
    id: string;
    arm: "control" | "challenger";
    variable: string;
    value: string;
    directions: Record<string, string>;
    hypothesis: string;
    matchedConditions: Record<string, string>;
    kind?:
      | "direction_experiment"
      | "creative_refresh"
      | "cross_platform_expansion";
    sourceWinnerId?: string | null;
    sourcePlatform?: string | null;
    destinationPlatform?: string | null;
    sourceDirections?: Record<string, string>;
  };
  creativeWinner?: {
    id: string;
    sourceExperimentId: string;
    variable: string;
    value: string;
    directions: Record<string, string>;
    explanation: string;
    context: Record<string, string>;
  };
  creativePortfolio?: {
    planId: string;
    slotId: string;
    role: "scale" | "rotate" | "test" | "learn" | "hold";
    winnerId: string | null;
    winnerScore: number | null;
    reason: string;
  };
};

export type KwevoraVideoProps = {
  title: string;
  scenes: VideoScene[];
  brand?: string;

  musicMood?: string;
  music?: VideoAudioTrack;

  presenter?: VideoPresenterDirection;
  voice?: VideoVoiceDirection;
};
