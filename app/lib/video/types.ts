export type VideoSceneMetadata = {
  visualPrompt?: string;
  imagePrompt?: string;
  videoPrompt?: string;
  cameraMovement?: string;
  visualStyle?: string;
  generatedBy?: string;
  [key: string]: unknown;
};

export type VideoScene = {
  id: string;
  text: string;
  supportingText?: string;
  durationInFrames: number;

  imageUrl?: string;
  videoUrl?: string;

  background?: string;
  textColor?: string;
  accentColor?: string;

  metadata?: VideoSceneMetadata;
};