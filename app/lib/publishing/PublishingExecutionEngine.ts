export type PublishingPlatform =
  | "youtube"
  | "tiktok"
  | "instagram"
  | "facebook"
  | string;

export type PublishingMedia = {
  source:
    | "recording"
    | "upload";

  fileName: string;

  storedFileName: string;

  mimeType: string;

  size: number;

  filePath: string;
};

export type PublishingExecutionItem = {
  id: string;

  executionPlanId?: string;

  status: string;

  title: string;

  caption: string;

  hashtags: string[];

  callToAction: string;

  destinationLink: string;

  recommendedPlatforms:
    string[];

  media?: PublishingMedia;
};

export type PlatformConnectionStatus = {
  platform:
    PublishingPlatform;

  connected: boolean;

  authenticated?: boolean;

  accountId?: string;

  accountName?: string;
};

export type PublishingRequirement = {
  id: string;

  label: string;

  satisfied: boolean;

  reason: string;
};

export type PublishingExecutionStatus =
  | "ready"
  | "waiting"
  | "blocked"
  | "unsupported";

export type PublishingExecutionAssessment = {
  platform:
    PublishingPlatform;

  status:
    PublishingExecutionStatus;

  canExecute:
    boolean;

  executionPlanId:
    string;

  publishingItemId:
    string;

  requirements:
    PublishingRequirement[];

  missingRequirements:
    string[];

  nextAction:
    string;

  reason:
    string;
};

function cleanString(
  value: unknown,
): string {
  return typeof value ===
    "string"
    ? value.trim()
    : "";
}

function normalizePlatform(
  value: string,
): string {
  return value
    .trim()
    .toLowerCase();
}

function hasVideoMedia(
  media:
    PublishingMedia | undefined,
): boolean {
  if (
    !media
  ) {
    return false;
  }

  return Boolean(
    cleanString(
      media.filePath,
    ) &&
    cleanString(
      media.mimeType,
    ) &&
    cleanString(
      media.storedFileName,
    ),
  );
}

function isVideoMimeType(
  media:
    PublishingMedia | undefined,
): boolean {
  if (
    !media
  ) {
    return false;
  }

  return cleanString(
    media.mimeType,
  )
    .toLowerCase()
    .startsWith(
      "video/",
    );
}

function buildMissingRequirements(
  requirements:
    PublishingRequirement[],
): string[] {
  return requirements
    .filter(
      (
        requirement,
      ) =>
        !requirement.satisfied,
    )
    .map(
      (
        requirement,
      ) =>
        requirement.label,
    );
}

export class PublishingExecutionEngine {
  assessYouTube({
    item,
    connection,
  }: {
    item:
      PublishingExecutionItem;

    connection:
      PlatformConnectionStatus;
  }): PublishingExecutionAssessment {
    const platform =
      "youtube";

    const recommendedPlatforms =
      Array.isArray(
        item.recommendedPlatforms,
      )
        ? item.recommendedPlatforms
            .map(
              normalizePlatform,
            )
        : [];

    const youtubeRecommended =
      recommendedPlatforms
        .length === 0 ||
      recommendedPlatforms
        .includes(
          "youtube",
        );

    const mediaExists =
      hasVideoMedia(
        item.media,
      );

    const mediaIsVideo =
      isVideoMimeType(
        item.media,
      );

    const requirements:
      PublishingRequirement[] = [
        {
          id:
            "approved",

          label:
            "Content approved",

          satisfied:
            item.status ===
              "ready_to_publish" ||
            item.status ===
              "scheduled",

          reason:
            item.status ===
              "ready_to_publish" ||
            item.status ===
              "scheduled"
              ? "The owner approved this content package."
              : "This content package has not reached an executable publishing state.",
        },

        {
          id:
            "platform",

          label:
            "YouTube selected",

          satisfied:
            youtubeRecommended,

          reason:
            youtubeRecommended
              ? "YouTube is an approved destination for this content."
              : "YouTube is not currently included in the recommended publishing platforms.",
        },

        {
          id:
            "connection",

          label:
            "YouTube connected",

          satisfied:
            connection.connected,

          reason:
            connection.connected
              ? connection.accountName
                ? `Connected to ${connection.accountName}.`
                : "A YouTube account is connected."
              : "YouTube must be connected before KAI can publish.",
        },

        {
          id:
            "authentication",

          label:
            "YouTube authorized",

          satisfied:
            connection.authenticated !==
              false &&
            connection.connected,

          reason:
            connection.connected &&
            connection.authenticated !==
              false
              ? "KAI has authorization to use the connected YouTube account."
              : "YouTube authorization is unavailable or expired.",
        },

        {
          id:
            "media",

          label:
            "Video file available",

          satisfied:
            mediaExists,

          reason:
            mediaExists
              ? `Video file ready: ${item.media?.fileName || item.media?.storedFileName || "video"}.`
              : "A finished video file has not been attached to this content package.",
        },

        {
          id:
            "video-format",

          label:
            "Valid video format",

          satisfied:
            mediaExists &&
            mediaIsVideo,

          reason:
            !mediaExists
              ? "KAI cannot validate the video format until a video file exists."
              : mediaIsVideo
                ? `Video MIME type ${item.media?.mimeType} is ready for the YouTube upload pipeline.`
                : `The attached media type ${item.media?.mimeType || "unknown"} is not a video file.`,
        },

        {
          id:
            "title",

          label:
            "Video title available",

          satisfied:
            Boolean(
              cleanString(
                item.title,
              ),
            ),

          reason:
            cleanString(
              item.title,
            )
              ? "The YouTube video has a title."
              : "A title is required before publishing.",
        },
      ];

    const missingRequirements =
      buildMissingRequirements(
        requirements,
      );

    const canExecute =
      missingRequirements
        .length === 0;

    let status:
      PublishingExecutionStatus =
      canExecute
        ? "ready"
        : "waiting";

    if (
      !connection.connected
    ) {
      status =
        "blocked";
    }

    const nextAction =
      canExecute
        ? "Upload the approved video to YouTube."
        : !connection.connected
          ? "Connect YouTube in Settings."
          : !mediaExists
            ? "Create or attach the finished video file."
            : !mediaIsVideo
              ? "Attach a valid video file."
              : !youtubeRecommended
                ? "Approve YouTube as a publishing destination."
                : item.status !==
                      "ready_to_publish" &&
                    item.status !==
                      "scheduled"
                  ? "Approve the content package before publishing."
                  : !cleanString(
                        item.title,
                      )
                    ? "Add a video title."
                    : "Resolve the remaining publishing requirements.";

    const reason =
      canExecute
        ? "Every requirement for YouTube publishing is satisfied. KAI can hand this package to the existing YouTube upload route."
        : `KAI will not publish yet. ${missingRequirements.join(", ")} ${
            missingRequirements.length ===
            1
              ? "is"
              : "are"
          } still required.`;

    return {
      platform,

      status,

      canExecute,

      executionPlanId:
        cleanString(
          item.executionPlanId,
        ),

      publishingItemId:
        item.id,

      requirements,

      missingRequirements,

      nextAction,

      reason,
    };
  }

  assess({
    platform,
    item,
    connection,
  }: {
    platform:
      PublishingPlatform;

    item:
      PublishingExecutionItem;

    connection:
      PlatformConnectionStatus;
  }): PublishingExecutionAssessment {
    const normalizedPlatform =
      normalizePlatform(
        platform,
      );

    if (
      normalizedPlatform ===
      "youtube"
    ) {
      return this.assessYouTube({
        item,
        connection,
      });
    }

    return {
      platform:
        normalizedPlatform,

      status:
        "unsupported",

      canExecute:
        false,

      executionPlanId:
        cleanString(
          item.executionPlanId,
        ),

      publishingItemId:
        item.id,

      requirements:
        [],

      missingRequirements: [
        `${platform} publishing integration`,
      ],

      nextAction:
        `Connect the real ${platform} publishing integration before execution.`,

      reason:
        `KAI does not yet have a real ${platform} executor and will not simulate publishing.`,
    };
  }
}

export const publishingExecutionEngine =
  new PublishingExecutionEngine();