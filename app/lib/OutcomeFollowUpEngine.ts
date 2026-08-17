import { promises as fs } from "node:fs";
import path from "node:path";

import type { ExecutionMetricTarget, ExecutionPlan } from "./ExecutionEngine";

import { executionPlanRepository } from "./database/ExecutionPlanRepository";

import { outcomeEvaluationRepository } from "./database/OutcomeEvaluationRepository";

export type FollowUpStatus =
  | "waiting_for_execution"
  | "monitoring"
  | "ready_to_collect"
  | "needs_owner_input";

export type FollowUpPublication = {
  platform: string;
  externalId: string;
  url: string;
  publishedAt: string;
};

export type FollowUpPublishingItem = {
  id: string;
  executionPlanId?: string;
  status?: string;
  title?: string;
  publishedAt?: string;
  publications?: FollowUpPublication[];
};

export type OutcomeFollowUp = {
  executionPlanId: string;
  objective: string;
  status: FollowUpStatus;
  dueAt: string | null;
  ownerAttentionRequired: boolean;
  collectionSource: string | null;
  publishingItemId: string | null;
  publication: FollowUpPublication | null;
  requiredMetrics: string[];
  automaticMetrics: string[];
  metricTargets: ExecutionMetricTarget[];
  nextAction: string;
  reason: string;
};

const DEFAULT_MEASUREMENT_DELAY_MS = 24 * 60 * 60 * 1000;

const publishingFile = path.join(
  process.cwd(),
  "data",
  "publishing-queue.json",
);

function cleanString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function parseDate(value: unknown): Date | null {
  const text = cleanString(value);

  if (!text) {
    return null;
  }

  const date = new Date(text);

  return Number.isFinite(date.getTime()) ? date : null;
}

function cleanPublication(value: unknown): FollowUpPublication | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const publication = value as Record<string, unknown>;

  const platform = cleanString(publication.platform).toLowerCase();

  const externalId = cleanString(publication.externalId);

  if (!platform || !externalId) {
    return null;
  }

  return {
    platform,
    externalId,
    url: cleanString(publication.url),
    publishedAt: cleanString(publication.publishedAt),
  };
}

function cleanPublishingItem(value: unknown): FollowUpPublishingItem | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const item = value as Record<string, unknown>;

  const id = cleanString(item.id);

  if (!id) {
    return null;
  }

  const publications = Array.isArray(item.publications)
    ? item.publications
        .map(cleanPublication)
        .filter(
          (publication): publication is FollowUpPublication =>
            publication !== null,
        )
    : [];

  return {
    id,
    executionPlanId: cleanString(item.executionPlanId) || undefined,
    status: cleanString(item.status) || undefined,
    title: cleanString(item.title) || undefined,
    publishedAt: cleanString(item.publishedAt) || undefined,
    publications,
  };
}

function requiredMetricsFor(plan: ExecutionPlan): string[] {
  if (plan.measurementPlan?.metrics.length) {
    return plan.measurementPlan.metrics.map((metric) => metric.name);
  }

  const objective = `${plan.objective} ${plan.nextAction}`.toLowerCase();

  const metrics = new Set<string>();

  if (/content|marketing|publish|audience|video|post/.test(objective)) {
    metrics.add("Views");
    metrics.add("Clicks");
  }

  if (/income|revenue|sale|offer|product|store/.test(objective)) {
    metrics.add("Sales");
    metrics.add("Revenue");
  }

  if (metrics.size === 0) {
    metrics.add("Primary result");
  }

  return Array.from(metrics);
}

function findPublishedAt(
  item: FollowUpPublishingItem,
  publication: FollowUpPublication | null,
): Date | null {
  return parseDate(publication?.publishedAt) ?? parseDate(item.publishedAt);
}

export class OutcomeFollowUpEngine {
  assess({
    plan,
    publishingItem,
    now = new Date(),
    measurementDelayMs = DEFAULT_MEASUREMENT_DELAY_MS,
  }: {
    plan: ExecutionPlan;
    publishingItem?: FollowUpPublishingItem;
    now?: Date;
    measurementDelayMs?: number;
  }): OutcomeFollowUp {
    const requiredMetrics = requiredMetricsFor(plan);

    const metricTargets = plan.measurementPlan?.metrics ?? [];

    const automaticMetrics = metricTargets
      .filter((metric) => metric.source === "youtube")
      .map((metric) => metric.name);

    if (!publishingItem) {
      return {
        executionPlanId: plan.id,
        objective: plan.objective,
        status: "waiting_for_execution",
        dueAt: null,
        ownerAttentionRequired: false,
        collectionSource: null,
        publishingItemId: null,
        publication: null,
        requiredMetrics,
        automaticMetrics,
        metricTargets,
        nextAction: plan.nextAction,
        reason:
          "KAI is waiting for this plan to produce a measurable execution result.",
      };
    }

    const publication =
      publishingItem.publications?.find(
        (current) => current.platform === "youtube",
      ) ??
      publishingItem.publications?.[0] ??
      null;

    const publishedAt = findPublishedAt(publishingItem, publication);

    if (publishingItem.status !== "published" || !publishedAt) {
      return {
        executionPlanId: plan.id,
        objective: plan.objective,
        status: "waiting_for_execution",
        dueAt: null,
        ownerAttentionRequired: false,
        collectionSource: null,
        publishingItemId: publishingItem.id,
        publication,
        requiredMetrics,
        automaticMetrics,
        metricTargets,
        nextAction: "Publish the linked work before measuring its result.",
        reason:
          "The linked content has not been published yet, so KAI will not ask for outcome data prematurely.",
      };
    }

    const dueAt = new Date(
      publishedAt.getTime() +
        Math.max(
          0,
          plan.measurementPlan
            ? plan.measurementPlan.measureAfterHours * 60 * 60 * 1000
            : measurementDelayMs,
        ),
    );

    if (now.getTime() < dueAt.getTime()) {
      return {
        executionPlanId: plan.id,
        objective: plan.objective,
        status: "monitoring",
        dueAt: dueAt.toISOString(),
        ownerAttentionRequired: false,
        collectionSource: publication?.platform ?? null,
        publishingItemId: publishingItem.id,
        publication,
        requiredMetrics,
        automaticMetrics,
        metricTargets,
        nextAction: `Measure this result after ${dueAt.toISOString()}.`,
        reason:
          "The work is live, but KAI is allowing enough time for meaningful performance data to accumulate.",
      };
    }

    if (publication?.platform === "youtube" && publication.externalId) {
      const ownerMetrics =
        metricTargets.length > 0
          ? metricTargets
              .filter((metric) => metric.source !== "youtube")
              .map((metric) => metric.name)
          : requiredMetrics.filter((metric) => metric !== "Views");

      return {
        executionPlanId: plan.id,
        objective: plan.objective,
        status: "ready_to_collect",
        dueAt: dueAt.toISOString(),
        ownerAttentionRequired: ownerMetrics.length > 0,
        collectionSource: "youtube",
        publishingItemId: publishingItem.id,
        publication,
        requiredMetrics: ownerMetrics,
        automaticMetrics:
          automaticMetrics.length > 0 ? automaticMetrics : ["Views"],
        metricTargets,
        nextAction:
          "Collect the linked YouTube results and send them through KAI's Outcome Engine.",
        reason:
          "The measurement window has passed and KAI has a real YouTube publication ID it can check automatically.",
      };
    }

    return {
      executionPlanId: plan.id,
      objective: plan.objective,
      status: "needs_owner_input",
      dueAt: dueAt.toISOString(),
      ownerAttentionRequired: true,
      collectionSource: null,
      publishingItemId: publishingItem.id,
      publication,
      requiredMetrics,
      automaticMetrics,
      metricTargets,
      nextAction: `Provide only the unavailable result${requiredMetrics.length === 1 ? "" : "s"}: ${requiredMetrics.join(", ")}.`,
      reason:
        "The measurement window has passed, but no connected platform source can supply these results automatically.",
    };
  }

  async loadPublishingItems(): Promise<FollowUpPublishingItem[]> {
    try {
      const contents = await fs.readFile(publishingFile, "utf8");

      const parsed: unknown = JSON.parse(contents);

      return Array.isArray(parsed)
        ? parsed
            .map(cleanPublishingItem)
            .filter((item): item is FollowUpPublishingItem => item !== null)
        : [];
    } catch {
      return [];
    }
  }

  async scan(now = new Date()): Promise<OutcomeFollowUp[]> {
    const plans = await executionPlanRepository.history(200);

    const evaluatedPlanIds = new Set(
      (await outcomeEvaluationRepository.history(500)).map(
        (outcome) => outcome.executionPlanId,
      ),
    );

    const publishingItems = await this.loadPublishingItems();

    return plans
      .filter((plan) => !evaluatedPlanIds.has(plan.id))
      .map((plan) => {
        const publishingItem = publishingItems.find(
          (item) => item.executionPlanId === plan.id,
        );

        return this.assess({
          plan,
          publishingItem,
          now,
        });
      });
  }
}

export const outcomeFollowUpEngine = new OutcomeFollowUpEngine();
