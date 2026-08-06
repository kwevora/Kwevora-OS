import type {
  VideoPresenterDirection,
} from "../../remotion/types";

export type PresenterVideoRequest = {
  videoId: string;
  presenter: VideoPresenterDirection;
};

export type PresenterVideoResult = {
  success: boolean;
  presenter: VideoPresenterDirection;
  videoUrl?: string;
  message: string;
};

function markGenerating(
  presenter: VideoPresenterDirection,
): VideoPresenterDirection {
  return {
    ...presenter,
    status: "generating",
  };
}

function markFailed(
  presenter: VideoPresenterDirection,
): VideoPresenterDirection {
  return {
    ...presenter,
    status: "failed",
  };
}

export async function generatePresenterVideo(
  request: PresenterVideoRequest,
): Promise<PresenterVideoResult> {
  const videoId = request.videoId.trim();

  if (!videoId) {
    return {
      success: false,
      presenter: markFailed(
        request.presenter,
      ),
      message:
        "A video ID is required.",
    };
  }

  const presenter = markGenerating(
    request.presenter,
  );

  /*
    Release 6 Foundation

    No presenter has actually been generated yet.

    In the next release this function will call
    the selected provider (Wav2Lip, MuseTalk,
    HeyGen, Synthesia, Tavus, etc.).

    Until then we accurately report that the
    presenter is waiting to be generated.
  */

  return {
    success: false,
    presenter,
    message:
      "Presenter generation provider not connected yet.",
  };
}