import {
  Department,
  type DepartmentPriority,
  type DepartmentReport,
  type DepartmentSignal,
} from "./Department";

export type MarketingDepartmentInput = {
  recentViews?: number;
  recentClicks?: number;
  recentSales?: number;
  recentRevenue?: number;

  contentReady?: number;
  videosReady?: number;
  publishingReady?: number;
  pendingApprovals?: number;

  connectedPlatforms?: string[];

  audienceGrowthNeeded?: boolean;
  revenueNeeded?: boolean;

  strongestOffer?: string;
  destinationLink?: string;

  completedWork?: string[];
  lessonsLearned?: string[];
  missingInformation?: string[];
};

function normalizeCount(
  value: number | undefined,
): number {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value)
  ) {
    return 0;
  }

  return Math.max(
    0,
    Math.floor(value),
  );
}

function clampScore(
  value: number,
): number {
  return Math.max(
    0,
    Math.min(
      100,
      Math.round(value),
    ),
  );
}

function createSignal({
  id,
  title,
  observation,
  meaning,
  source,
  confidence,
}: {
  id: string;
  title: string;
  observation: string;
  meaning: string;
  source: string;
  confidence: number;
}): DepartmentSignal {
  return {
    id,
    title,
    observation,
    meaning,
    source,
    confidence:
      clampScore(confidence),
    detectedAt:
      new Date().toISOString(),
  };
}

function createPriority({
  id,
  title,
  reason,
  urgency,
  impact,
  confidence,
  owner,
  canContinueAutomatically,
  nextAction,
}: DepartmentPriority): DepartmentPriority {
  return {
    id,
    title,
    reason,
    urgency:
      clampScore(urgency),
    impact:
      clampScore(impact),
    confidence:
      clampScore(confidence),
    owner,
    canContinueAutomatically,
    nextAction,
  };
}

export class MarketingDepartment extends Department {
  readonly name =
    "Marketing" as const;

  review(
    input: MarketingDepartmentInput = {},
  ): DepartmentReport {
    const recentViews =
      normalizeCount(
        input.recentViews,
      );

    const recentClicks =
      normalizeCount(
        input.recentClicks,
      );

    const recentSales =
      normalizeCount(
        input.recentSales,
      );

    const recentRevenue =
      normalizeCount(
        input.recentRevenue,
      );

    const contentReady =
      normalizeCount(
        input.contentReady,
      );

    const videosReady =
      normalizeCount(
        input.videosReady,
      );

    const publishingReady =
      normalizeCount(
        input.publishingReady,
      );

    const pendingApprovals =
      normalizeCount(
        input.pendingApprovals,
      );

    const connectedPlatforms =
      input.connectedPlatforms ?? [];

    const signals:
      DepartmentSignal[] = [];

    const priorities:
      DepartmentPriority[] = [];

    if (
      connectedPlatforms.length === 0
    ) {
      signals.push(
        createSignal({
          id:
            "marketing-no-platforms",
          title:
            "No marketing platforms are connected",
          observation:
            "KAI does not currently have connected marketing platforms to publish to or monitor.",
          meaning:
            "Marketing execution and performance learning are limited until at least one platform is connected.",
          source:
            "MarketingDepartment",
          confidence:
            100,
        }),
      );

      priorities.push(
        createPriority({
          id:
            "connect-marketing-platform",
          title:
            "Connect a marketing platform",
          reason:
            "KAI needs at least one connected platform to publish content, collect results, and improve future marketing decisions.",
          urgency:
            92,
          impact:
            95,
          confidence:
            100,
          owner:
            "Owner",
          canContinueAutomatically:
            false,
          nextAction:
            "Choose and connect the first marketing platform.",
        }),
      );
    }

    if (
      pendingApprovals > 0
    ) {
      signals.push(
        createSignal({
          id:
            "marketing-approval-backlog",
          title:
            "Marketing work is waiting for approval",
          observation:
            `${pendingApprovals} marketing item${
              pendingApprovals === 1
                ? " is"
                : "s are"
            } waiting for approval.`,
          meaning:
            "Prepared work cannot move toward publishing until the owner approves or edits it.",
          source:
            "Review Queue",
          confidence:
            100,
        }),
      );

      priorities.push(
        createPriority({
          id:
            "clear-marketing-approvals",
          title:
            "Review the strongest marketing item",
          reason:
            "Approval is the main blocker preventing prepared marketing work from reaching the audience.",
          urgency:
            99,
          impact:
            96,
          confidence:
            98,
          owner:
            "Owner",
          canContinueAutomatically:
            false,
          nextAction:
            "Present the strongest approval item first.",
        }),
      );
    }

    if (
      publishingReady > 0
    ) {
      signals.push(
        createSignal({
          id:
            "marketing-ready-to-publish",
          title:
            "Approved marketing work is ready",
          observation:
            `${publishingReady} approved item${
              publishingReady === 1
                ? " is"
                : "s are"
            } ready for publishing.`,
          meaning:
            "The department has finished work that can begin generating reach, clicks, learning, and possible sales.",
          source:
            "Publishing Queue",
          confidence:
            100,
        }),
      );

      priorities.push(
        createPriority({
          id:
            "publish-marketing-work",
          title:
            "Publish the strongest approved item",
          reason:
            "Finished marketing work creates no business value until it reaches the audience.",
          urgency:
            97,
          impact:
            98,
          confidence:
            96,
          owner:
            "KAI",
          canContinueAutomatically:
            connectedPlatforms.length > 0,
          nextAction:
            "Verify the platform, caption, call to action, and destination link, then publish or schedule it.",
        }),
      );
    }

    if (
      contentReady +
        videosReady >
      0
    ) {
      const totalReady =
        contentReady +
        videosReady;

      signals.push(
        createSignal({
          id:
            "marketing-work-in-progress",
          title:
            "Marketing work is already in progress",
          observation:
            `${totalReady} content item${
              totalReady === 1
                ? " is"
                : "s are"
            } already being prepared.`,
          meaning:
            "Finishing existing work is likely more valuable than opening another unfinished marketing task.",
          source:
            "Marketing Workflow",
          confidence:
            95,
        }),
      );

      priorities.push(
        createPriority({
          id:
            "finish-marketing-content",
          title:
            "Finish the strongest content package",
          reason:
            "Completing existing work preserves momentum and moves the business closer to publishing and measurable results.",
          urgency:
            90,
          impact:
            92,
          confidence:
            92,
          owner:
            "KAI",
          canContinueAutomatically:
            true,
          nextAction:
            "Complete the title, hook, script, caption, hashtags, thumbnail, call to action, and platform recommendation.",
        }),
      );
    }

    if (
      input.revenueNeeded ||
      recentSales === 0
    ) {
      signals.push(
        createSignal({
          id:
            "marketing-revenue-needed",
          title:
            "Marketing is not producing confirmed sales",
          observation:
            recentSales === 0
              ? "No recent sales were supplied."
              : "Revenue growth is currently a priority.",
          meaning:
            "Marketing should connect attention to a clear offer, destination, and measurable conversion goal.",
          source:
            "Business Performance",
          confidence:
            90,
        }),
      );

      priorities.push(
        createPriority({
          id:
            "create-income-focused-content",
          title:
            "Create income-focused marketing",
          reason:
            "The business needs a clear path from attention to an offer, guide, landing page, or store.",
          urgency:
            input.revenueNeeded
              ? 98
              : 84,
          impact:
            96,
          confidence:
            88,
          owner:
            input.strongestOffer
              ? "KAI"
              : "Shared",
          canContinueAutomatically:
            Boolean(
              input.strongestOffer,
            ),
          nextAction:
            input.strongestOffer
              ? `Create content that sends people toward ${input.strongestOffer}.`
              : "Choose the strongest current offer before creating the package.",
        }),
      );
    }

    if (
      input.audienceGrowthNeeded ||
      recentViews === 0 ||
      recentClicks === 0
    ) {
      signals.push(
        createSignal({
          id:
            "marketing-audience-growth",
          title:
            "Audience growth needs attention",
          observation:
            `Recent results supplied: ${recentViews} views and ${recentClicks} clicks.`,
          meaning:
            "The department needs more audience data or stronger content to create future sales opportunities.",
          source:
            "Marketing Performance",
          confidence:
            85,
        }),
      );

      priorities.push(
        createPriority({
          id:
            "create-audience-growth-content",
          title:
            "Create an audience-growth post",
          reason:
            "Useful content with a strong hook can increase reach, trust, profile visits, and future sales opportunities.",
          urgency:
            input.audienceGrowthNeeded
              ? 91
              : 72,
          impact:
            84,
          confidence:
            84,
          owner:
            "KAI",
          canContinueAutomatically:
            true,
          nextAction:
            "Create one useful short-form post around a problem the audience already recognizes.",
        }),
      );
    }

    if (
      input.destinationLink ===
        "" &&
      (
        input.revenueNeeded ||
        recentSales === 0
      )
    ) {
      priorities.push(
        createPriority({
          id:
            "add-destination-link",
          title:
            "Add a destination link",
          reason:
            "Income-focused marketing needs a clear next step so viewers know where to go.",
          urgency:
            88,
          impact:
            90,
          confidence:
            96,
          owner:
            "Owner",
          canContinueAutomatically:
            false,
          nextAction:
            "Provide the strongest product, guide, landing page, or store link.",
        }),
      );
    }

    const measurableActivity =
      recentViews +
      recentClicks +
      recentSales +
      recentRevenue;

    const healthScore =
      clampScore(
        55 +
        (
          connectedPlatforms.length >
          0
            ? 10
            : -15
        ) +
        (
          publishingReady > 0
            ? 10
            : 0
        ) +
        (
          measurableActivity > 0
            ? 10
            : -5
        ) -
        (
          pendingApprovals > 0
            ? 8
            : 0
        ),
      );

    const biggestRisk =
      connectedPlatforms.length === 0
        ? "Marketing cannot fully publish or learn without a connected platform."
        : pendingApprovals > 0
          ? "Prepared marketing work is blocked by pending approvals."
          : recentSales === 0
            ? "Marketing activity is not yet producing confirmed sales."
            : "No major marketing risk detected.";

    const biggestOpportunity =
      publishingReady > 0
        ? "Publish the strongest approved marketing item."
        : contentReady +
              videosReady >
            0
          ? "Finish the strongest content package."
          : input.revenueNeeded ||
              recentSales === 0
            ? "Create one income-focused content package."
            : "Create one audience-growth post.";

    return this.createReport({
      summary:
        "KAI reviewed marketing readiness, content flow, platform access, and recent performance.",

      healthScore,

      confidence:
        signals.length > 0
          ? 90
          : 70,

      biggestRisk,

      biggestOpportunity,

      signals,

      priorities,

      whatChanged: [
        `${pendingApprovals} item(s) are waiting for approval.`,
        `${publishingReady} item(s) are ready for publishing.`,
        `${contentReady + videosReady} content item(s) are in progress.`,
        `${recentViews} recent views, ${recentClicks} clicks, ${recentSales} sales, and ${recentRevenue} in revenue were supplied.`,
      ],

      completedWork:
        input.completedWork ?? [],

      lessonsLearned:
        input.lessonsLearned ??
        [],

      missingInformation: [
        ...(
          input.missingInformation ??
          []
        ),
        ...(
          connectedPlatforms.length ===
          0
            ? [
                "No connected marketing platforms were supplied.",
              ]
            : []
        ),
        ...(
          !input.strongestOffer &&
          (
            input.revenueNeeded ||
            recentSales === 0
          )
            ? [
                "The strongest current offer is unknown.",
              ]
            : []
        ),
      ],

      canOperateAutomatically:
        priorities.some(
          (priority) =>
            priority.owner ===
              "KAI" &&
            priority
              .canContinueAutomatically,
        ),
    });
  }
}

export const marketingDepartment =
  new MarketingDepartment();