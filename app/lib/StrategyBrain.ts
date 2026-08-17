import type {
  ExecutionExperiment,
  ExperimentVariable,
} from "./ExperimentEngine";

import { experimentRepository } from "./database/ExperimentRepository";
import { memoryBrain } from "./MemoryBrain";

export type StrategyStatus = "learning" | "proven" | "retired";

export type StrategyEvidence = {
  key: string;
  variable: ExperimentVariable;
  variation: string;
  status: StrategyStatus;
  experiments: number;
  wins: number;
  mixed: number;
  failures: number;
  averageScore: number;
  confidence: number;
  rankScore: number;
  explanation: string;
};

export type StrategyDecision = {
  selected?: StrategyEvidence;
  ranked: StrategyEvidence[];
  explanation: string;
};

const PLATFORM_TAGS = new Set([
  "facebook",
  "instagram",
  "linkedin",
  "pinterest",
  "tiktok",
  "youtube",
]);
const GOAL_TAGS = new Set([
  "approval",
  "audience",
  "awareness",
  "connection",
  "income",
  "leads",
  "product",
  "revenue",
  "sales",
  "traffic",
]);
const FORMAT_TAGS = new Set(["email", "post", "short", "video"]);

function dimensionMismatch(
  left: Set<string>,
  right: Set<string>,
  dimension: Set<string>,
): boolean {
  const leftValues = [...left].filter((tag) => dimension.has(tag));
  const rightValues = [...right].filter((tag) => dimension.has(tag));
  return (
    leftValues.length > 0 &&
    rightValues.length > 0 &&
    !leftValues.some((tag) => rightValues.includes(tag))
  );
}

function contextsMatch(
  currentTags: string[],
  historicalTags: string[],
): boolean {
  const current = new Set(currentTags);
  const historical = new Set(historicalTags);
  if (
    dimensionMismatch(current, historical, PLATFORM_TAGS) ||
    dimensionMismatch(current, historical, GOAL_TAGS) ||
    dimensionMismatch(current, historical, FORMAT_TAGS)
  )
    return false;

  return currentTags.filter((tag) => historical.has(tag)).length >= 2;
}

function strategyKey(experiment: ExecutionExperiment): string {
  return `${experiment.variable}:${experiment.variation.trim().toLowerCase()}`;
}

function summarize(experiments: ExecutionExperiment[]): StrategyEvidence {
  const first = experiments[0];
  const wins = experiments.filter((item) => item.verdict === "keep").length;
  const mixed = experiments.filter((item) => item.verdict === "revise").length;
  const failures = experiments.filter((item) => item.verdict === "stop").length;
  const averageScore = Math.round(
    experiments.reduce((total, item) => total + (item.score ?? 0), 0) /
      experiments.length,
  );
  const evidenceStrength = Math.min(1, experiments.length / 5);
  const winRate = wins / experiments.length;
  const failureRate = failures / experiments.length;
  const status: StrategyStatus =
    experiments.length >= 3 &&
    wins >= 2 &&
    winRate >= 2 / 3 &&
    averageScore >= 75
      ? "proven"
      : experiments.length >= 3 &&
          failures >= 2 &&
          failureRate >= 2 / 3 &&
          averageScore < 40
        ? "retired"
        : "learning";
  const confidence = Math.round(
    Math.min(
      100,
      evidenceStrength * 60 + winRate * 30 + Math.max(0, averageScore) * 0.1,
    ),
  );
  const rankScore = Math.round(
    averageScore * 0.55 +
      winRate * 30 +
      evidenceStrength * 15 -
      failureRate * 25,
  );
  const explanation =
    status === "proven"
      ? `${first.variation} is proven by ${experiments.length} related tests, ${wins} wins, and an average score of ${averageScore}%.`
      : status === "retired"
        ? `${first.variation} is retired after ${failures} failures across ${experiments.length} related tests and an average score of ${averageScore}%.`
        : `${first.variation} is still learning from ${experiments.length} related test${experiments.length === 1 ? "" : "s"}; KAI needs at least three consistent results before making it permanent.`;

  return {
    key: strategyKey(first),
    variable: first.variable,
    variation: first.variation,
    status,
    experiments: experiments.length,
    wins,
    mixed,
    failures,
    averageScore,
    confidence,
    rankScore,
    explanation,
  };
}

export class StrategyBrain {
  async analyze(
    contextTags: string[],
    variable?: ExperimentVariable,
  ): Promise<StrategyEvidence[]> {
    const groups = new Map<string, ExecutionExperiment[]>();
    for (const experiment of await experimentRepository.completed(500)) {
      if (
        (variable && experiment.variable !== variable) ||
        !contextsMatch(contextTags, experiment.contextTags)
      )
        continue;
      const key = strategyKey(experiment);
      groups.set(key, [...(groups.get(key) ?? []), experiment]);
    }
    return [...groups.values()]
      .map(summarize)
      .sort((left, right) => right.rankScore - left.rankScore);
  }

  async recommend(
    contextTags: string[],
    variable?: ExperimentVariable,
  ): Promise<StrategyDecision> {
    const ranked = await this.analyze(contextTags, variable);
    const selected =
      ranked.find((strategy) => strategy.status === "proven") ??
      ranked.find((strategy) => strategy.status === "learning");
    return {
      selected,
      ranked,
      explanation: selected
        ? selected.status === "proven"
          ? `KAI selected this strategy because repeated related experiments proved it is the strongest available option. ${selected.explanation}`
          : `KAI is treating this strategy as provisional, not permanent. ${selected.explanation}`
        : ranked.length > 0
          ? "KAI found only retired strategies for this context and will test a meaningfully different approach."
          : "KAI has no related strategy evidence yet, so this plan begins with a controlled learning test.",
    };
  }

  async recordResult(
    experiment: ExecutionExperiment,
  ): Promise<StrategyDecision> {
    const decision = await this.recommend(
      experiment.contextTags,
      experiment.variable,
    );
    for (const strategy of decision.ranked) {
      const memoryId = `strategy-${encodeURIComponent(strategy.key)}`;
      if (strategy.status === "proven") {
        await memoryBrain.remember({
          id: memoryId,
          type: "preference",
          title: `Proven ${strategy.variable.replaceAll("_", " ")} strategy`,
          description: strategy.explanation,
          importance: "high",
          learnedAt: experiment.completedAt ?? new Date().toISOString(),
          tags: [
            "experiment",
            "proven-strategy",
            strategy.variable,
            ...experiment.contextTags,
          ],
        });
      } else {
        await memoryBrain.forget(memoryId);
      }
    }
    return decision;
  }
}

export const strategyBrain = new StrategyBrain();
