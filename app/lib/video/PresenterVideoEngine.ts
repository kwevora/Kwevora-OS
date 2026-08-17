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

function markReady(
  presenter: VideoPresenterDirection,
  videoUrl: string,
): VideoPresenterDirection {
  return {
    ...presenter,
    presenterVideoUrl: videoUrl,
    status: "ready",
  };
}

type LocalPresenterResponse = {
  success?: boolean;
  videoUrl?: string;
  message?: string;
};

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

  const presenter = markGenerating(request.presenter);
  const serviceUrl = process.env.KAI_PRESENTER_SERVICE_URL?.trim();
  const avatarUrl = process.env.KAI_PRESENTER_AVATAR_URL?.trim();
  const audioUrl = request.presenter.presenterAudioUrl?.trim();

  if (!serviceUrl || !avatarUrl || !audioUrl) {
    return {
      success: false,
      presenter: markFailed(request.presenter),
      message:
        "The local MuseTalk presenter service, KWEVORA avatar, or narration audio is not configured.",
    };
  }

  try {
    const response = await fetch(
      `${serviceUrl.replace(/\/$/, "")}/v1/presenter/generate`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoId,
          avatarUrl,
          audioUrl,
          presenter: {
            id: presenter.presenter.id,
            style: presenter.presenter.style,
            energy: presenter.presenter.energy,
            framing: presenter.presenter.framing,
            expression: presenter.presenter.expression,
            wardrobe: presenter.presenter.wardrobe,
          },
          pipeline: ["sadtalker", "musetalk-v1.5"],
        }),
        signal: AbortSignal.timeout(30 * 60 * 1000),
      },
    );

    const result = (await response.json()) as LocalPresenterResponse;
    const videoUrl = result.videoUrl?.trim();

    if (!response.ok || !result.success || !videoUrl) {
      throw new Error(
        result.message || `Presenter service returned ${response.status}.`,
      );
    }

    return {
      success: true,
      presenter: markReady(request.presenter, videoUrl),
      videoUrl,
      message: "KAI generated and lip-synced the local AI presenter.",
    };
  } catch (error) {
    return {
      success: false,
      presenter: markFailed(request.presenter),
      message:
        error instanceof Error
          ? `Local presenter generation failed: ${error.message}`
          : "Local presenter generation failed.",
    };
  }
}
