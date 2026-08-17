import {
  generateVoice,
  type VoiceGenerationResult,
} from "./VoiceGenerator";

import type {
  VideoVoiceDirection,
} from "../../remotion/types";

export type VoiceGenerationServiceRequest = {
  videoId: string;
  voiceDirection: VideoVoiceDirection;
};

export type VoiceGenerationServiceResult = {
  success: boolean;
  voice: VideoVoiceDirection;
  audioUrl?: string;
  outputPath?: string;
  durationSeconds?: number;
  message: string;
};

function createFailedVoice(
  voiceDirection: VideoVoiceDirection,
): VideoVoiceDirection {
  return {
    ...voiceDirection,
    status: "failed",
    audioUrl: undefined,
  };
}

function createReadyVoice(
  voiceDirection: VideoVoiceDirection,
  audioUrl: string,
): VideoVoiceDirection {
  return {
    ...voiceDirection,
    status: "ready",
    audioUrl,
  };
}

export async function generatePlannedVoice(
  request: VoiceGenerationServiceRequest,
): Promise<VoiceGenerationServiceResult> {
  const videoId = request.videoId.trim();

  if (!videoId) {
    return {
      success: false,
      voice: createFailedVoice(
        request.voiceDirection,
      ),
      message:
        "A video ID is required before voice generation can begin.",
    };
  }

  const script =
    request.voiceDirection.script.trim();

  if (!script) {
    return {
      success: false,
      voice: createFailedVoice(
        request.voiceDirection,
      ),
      message:
        "A voice script is required before voice generation can begin.",
    };
  }

  const generatingVoice: VideoVoiceDirection = {
    ...request.voiceDirection,
    status: "generating",
  };

  let result: VoiceGenerationResult;

  try {
    result = await generateVoice({
      videoId,
      script,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "KAI could not generate the voice.";

    return {
      success: false,
      voice: createFailedVoice(
        generatingVoice,
      ),
      message,
    };
  }

  if (
    !result.success ||
    !result.audioUrl
  ) {
    return {
      success: false,
      voice: createFailedVoice(
        generatingVoice,
      ),
      message:
        result.message ||
        "KAI could not generate the voice.",
    };
  }

  const readyVoice = createReadyVoice(
    generatingVoice,
    result.audioUrl,
  );

  return {
    success: true,
    voice: readyVoice,
    audioUrl: result.audioUrl,
    outputPath: result.outputPath,
    durationSeconds: result.durationSeconds,
    message:
      result.message ||
      "Voice generated successfully.",
  };
}
