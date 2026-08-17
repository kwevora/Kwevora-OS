import type {
  VideoAudioTrack,
  VideoProductionPackage,
  VideoScene,
} from "../../remotion/types";
import type { AdaptiveCreationPlan } from "../AdaptiveContentCreationBrain";
import type { VideoExperimentDirective } from "../VideoExperimentPlanner";
import type { CreativeWinnerDirective } from "../CreativeWinnerSystem";
import type { CreativePortfolioDirective } from "../CreativePortfolioManager";

export type ProductionStatus =
  | "planning"
  | "directing"
  | "generating_images"
  | "rendering"
  | "packaging"
  | "completed"
  | "failed";

export type ProductionRequest = {
  videoId: string;
  topic: string;
  productName?: string;
  offerDescription?: string;
  audience?: string;
  destination?: string;
  productAssetUrls?: string[];
  openArtAccessToken?: string;
  creativeApproach?: "emotional_story" | "problem_solution" | "product_demonstration";
  minimumQualityScore?: number;
  adaptiveCreation?: AdaptiveCreationPlan;
  videoExperiment?: VideoExperimentDirective;
  creativeWinner?: CreativeWinnerDirective;
  creativePortfolio?: CreativePortfolioDirective;
};

export type ProductionRenderRequest = {
  videoId: string;
  title: string;
  brand?: string;
  scenes: VideoScene[];
  musicMood?: string;
  music?: VideoAudioTrack;
};

export type ProductionRenderResult = {
  success: true;
  videoId: string;
  outputLocation: string;
  videoUrl: string;
};

export type ProductionResult = {
  success: true;
  videoId: string;
  title: string;
  scenes: VideoScene[];
  productionPackage: VideoProductionPackage;
  render: ProductionRenderResult;
};

export type ProductionError = {
  success: false;
  videoId: string;
  stage: ProductionStatus;
  message: string;
};

export type ProductionLogger = (
  message: string,
) => void;
