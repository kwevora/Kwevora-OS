import { NextRequest, NextResponse } from "next/server";

import { GET as collectYouTubeResults } from "@/app/api/youtube/results/route";

import { executionPlanRepository } from "@/app/lib/database/ExecutionPlanRepository";

import { outcomeEvaluationRepository } from "@/app/lib/database/OutcomeEvaluationRepository";

import { outcomeFollowUpEngine } from "@/app/lib/OutcomeFollowUpEngine";

import { outcomeEngine, type OutcomeMetric } from "@/app/lib/OutcomeEngine";

import { revenueAttributionBrain } from "@/app/lib/RevenueAttributionBrain";
import {
  contentPerformanceLearningEngine,
  type ContentPerformanceSnapshot,
  type VerifiedPerformanceMetrics,
} from "@/app/lib/ContentPerformanceLearningEngine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type FollowUpRequestBody = {
  executionPlanId?: unknown;
  metrics?: unknown;
  observations?: unknown;
};

type YouTubeResultsBody = {
  success?: boolean;
  message?: string;
  reconnectRequired?: boolean;
  collectedAt?: string;
  outcomeMetrics?: unknown;
  platform?: string;
  video?: { id?: string };
  verifiedMetrics?: Partial<
    Record<keyof VerifiedPerformanceMetrics, number | null>
  >;
};

function cleanString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function cleanStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean)
    : [];
}

function cleanMetric(value: unknown): OutcomeMetric | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const metric = value as Record<string, unknown>;

  const name = cleanString(metric.name);

  if (
    !name ||
    typeof metric.actual !== "number" ||
    !Number.isFinite(metric.actual)
  ) {
    return null;
  }

  return {
    name,
    actual: metric.actual,
    target:
      typeof metric.target === "number" && Number.isFinite(metric.target)
        ? metric.target
        : undefined,
    previous:
      typeof metric.previous === "number" && Number.isFinite(metric.previous)
        ? metric.previous
        : undefined,
    higherIsBetter:
      typeof metric.higherIsBetter === "boolean"
        ? metric.higherIsBetter
        : undefined,
  };
}

function cleanMetrics(value: unknown): OutcomeMetric[] {
  return Array.isArray(value)
    ? value
        .map(cleanMetric)
        .filter((metric): metric is OutcomeMetric => metric !== null)
    : [];
}

function canonicalMetricName(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/^youtube\s+/, "");
}

function applyPlanTargets(
  metrics: OutcomeMetric[],
  plan: NonNullable<Awaited<ReturnType<typeof executionPlanRepository.get>>>,
): OutcomeMetric[] {
  const targets = plan.measurementPlan?.metrics ?? [];

  if (targets.length === 0) {
    return metrics;
  }

  const targetedMetrics: OutcomeMetric[] = [];

  metrics.forEach((metric) => {
    const target = targets.find(
      (candidate) =>
        canonicalMetricName(candidate.name) ===
        canonicalMetricName(metric.name),
    );

    if (target) {
      targetedMetrics.push({
        ...metric,
        name: target.name,
        target: target.target,
        previous: target.baseline,
        higherIsBetter: target.higherIsBetter,
      });
    }
  });

  return targetedMetrics;
}

function mergeMetrics(
  first: OutcomeMetric[],
  second: OutcomeMetric[],
): OutcomeMetric[] {
  const merged = new Map<string, OutcomeMetric>();

  [...first, ...second].forEach((metric) =>
    merged.set(canonicalMetricName(metric.name), metric),
  );

  return Array.from(merged.values());
}

function summarize(
  followUps: Awaited<ReturnType<typeof outcomeFollowUpEngine.scan>>,
) {
  return {
    total: followUps.length,
    waitingForExecution: followUps.filter(
      (item) => item.status === "waiting_for_execution",
    ).length,
    monitoring: followUps.filter((item) => item.status === "monitoring").length,
    readyToCollect: followUps.filter(
      (item) => item.status === "ready_to_collect",
    ).length,
    needsOwnerInput: followUps.filter(
      (item) => item.status === "needs_owner_input",
    ).length,
  };
}

export async function GET() {
  try {
    const followUps = await outcomeFollowUpEngine.scan();

    return NextResponse.json({
      success: true,
      summary: summarize(followUps),
      nextOwnerQuestion:
        followUps.find((item) => item.ownerAttentionRequired) ?? null,
      followUps,
    });
  } catch (error) {
    console.error("Outcome follow-up scan failed:", error);

    return NextResponse.json(
      {
        success: false,
        message: "KAI could not scan pending outcome follow-ups.",
      },
      {
        status: 500,
      },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as FollowUpRequestBody;

    const followUps = await outcomeFollowUpEngine.scan();

    const requestedPlanId = cleanString(body.executionPlanId);

    const followUp = requestedPlanId
      ? followUps.find((item) => item.executionPlanId === requestedPlanId)
      : followUps.find(
          (item) =>
            item.status === "ready_to_collect" ||
            item.status === "needs_owner_input",
        );

    if (!followUp) {
      return NextResponse.json({
        success: true,
        learned: false,
        followUp: null,
        message: "KAI has no outcome follow-up ready right now.",
      });
    }

    if (
      (
        await outcomeEvaluationRepository.forExecutionPlan(
          followUp.executionPlanId,
        )
      ).length > 0
    ) {
      return NextResponse.json({
        success: true,
        learned: false,
        followUp,
        message: "KAI already learned from this execution.",
      });
    }

    const plan = await executionPlanRepository.get(followUp.executionPlanId);

    if (!plan) {
      return NextResponse.json(
        {
          success: false,
          learned: false,
          message: "The execution plan for this follow-up no longer exists.",
        },
        {
          status: 404,
        },
      );
    }

    if (
      followUp.status === "waiting_for_execution" ||
      followUp.status === "monitoring"
    ) {
      return NextResponse.json(
        {
          success: true,
          learned: false,
          followUp,
          message: followUp.nextAction,
        },
        {
          status: 202,
        },
      );
    }

    let metrics = applyPlanTargets(cleanMetrics(body.metrics), plan);

    const observations = cleanStringArray(body.observations);

    let collectedAt = new Date().toISOString();

    let refreshedCookie = "";

    let performanceSnapshot: ContentPerformanceSnapshot | null = null;

    const suppliedMetricNames = new Set(
      metrics.map((metric) => canonicalMetricName(metric.name)),
    );

    const automaticMetricsMissing = followUp.automaticMetrics.some(
      (metric) => !suppliedMetricNames.has(canonicalMetricName(metric)),
    );

    if (
      automaticMetricsMissing &&
      followUp.status === "ready_to_collect" &&
      followUp.collectionSource === "youtube" &&
      followUp.publication
    ) {
      const resultsUrl = new URL("/api/youtube/results", request.url);

      resultsUrl.searchParams.set("videoId", followUp.publication.externalId);

      const resultsResponse = await collectYouTubeResults(
        new NextRequest(resultsUrl, {
          headers: request.headers,
        }),
      );

      const results = (await resultsResponse.json()) as YouTubeResultsBody;

      if (!resultsResponse.ok || !results.success) {
        return NextResponse.json(
          {
            success: false,
            learned: false,
            followUp: {
              ...followUp,
              ownerAttentionRequired: true,
            },
            reconnectRequired: results.reconnectRequired ?? false,
            message:
              results.message ||
              "KAI could not collect the connected YouTube result.",
          },
          {
            status: resultsResponse.status,
          },
        );
      }

      metrics = mergeMetrics(
        applyPlanTargets(cleanMetrics(results.outcomeMetrics), plan),
        metrics,
      );

      collectedAt = cleanString(results.collectedAt) || collectedAt;

      refreshedCookie = resultsResponse.headers.get("set-cookie") || "";

      observations.push(
        "KAI automatically collected this result from the linked YouTube publication.",
      );

      performanceSnapshot = await contentPerformanceLearningEngine.capture({
        executionPlanId: plan.id,
        platform: cleanString(results.platform) || "youtube",
        externalId:
          cleanString(results.video?.id) || followUp.publication.externalId,
        source: "youtube_api",
        metrics: results.verifiedMetrics ?? {},
        collectedAt,
      });

      const views = metrics.find(
        (metric) => canonicalMetricName(metric.name) === "views",
      );

      if (views) {
        await revenueAttributionBrain.record({
          executionPlanId: plan.id,
          eventType: "view",
          quantity: views.actual,
          source: "youtube",
          externalEventId: `youtube:${followUp.publication.externalId}:views`,
          occurredAt: collectedAt,
          metadata: {
            cumulativeSnapshot: true,
            videoId: followUp.publication.externalId,
          },
        });
      }
    }

    const measuredMetricNames = new Set(
      metrics.map((metric) => canonicalMetricName(metric.name)),
    );

    const missingMetrics = (plan.measurementPlan?.metrics ?? [])
      .map((metric) => metric.name)
      .filter(
        (metric) => !measuredMetricNames.has(canonicalMetricName(metric)),
      );

    if (missingMetrics.length > 0) {
      return NextResponse.json(
        {
          success: false,
          learned: false,
          followUp: {
            ...followUp,
            ownerAttentionRequired: true,
            requiredMetrics: missingMetrics,
          },
          availableMetrics: metrics,
          performanceSnapshot,
          requiredMetrics: missingMetrics,
          message: `KAI collected what it could. Provide only the remaining result${missingMetrics.length === 1 ? "" : "s"}: ${missingMetrics.join(", ")}.`,
        },
        {
          status: 409,
        },
      );
    }

    if (metrics.length === 0 && observations.length === 0) {
      return NextResponse.json(
        {
          success: false,
          learned: false,
          followUp,
          requiredMetrics: followUp.requiredMetrics,
          message: followUp.nextAction,
        },
        {
          status: 409,
        },
      );
    }

    const result = await outcomeEngine.evaluate({
      executionPlan: plan,
      metrics,
      observations,
      completedAt: collectedAt,
    });

    const response = NextResponse.json({
      success: true,
      learned: true,
      followUp,
      evaluation: result.evaluation,
      storedEvaluation: result.storedEvaluation,
      performanceSnapshot,
      message: followUp.collectionSource
        ? "KAI collected the available result automatically, measured it, learned from it, and updated the execution plan."
        : "KAI measured the supplied result, learned from it, and updated the execution plan.",
    });

    if (refreshedCookie) {
      response.headers.set("set-cookie", refreshedCookie);
    }

    return response;
  } catch (error) {
    console.error("Outcome follow-up failed:", error);

    return NextResponse.json(
      {
        success: false,
        learned: false,
        message: "KAI could not complete the outcome follow-up.",
      },
      {
        status: 500,
      },
    );
  }
}
