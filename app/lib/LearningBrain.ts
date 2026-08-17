import { memoryBrain } from "./MemoryBrain";

import { getDatabase } from "./database/database";

export type LearningResult = "success" | "partial" | "failure";

export type LearningOutcome = {
  id: string;

  title: string;

  objective: string;

  outcome: LearningResult;

  observations: string[];

  lessons: string[];

  recommendations: string[];

  completedAt: string;
};

export type LearningSummary = {
  learned: boolean;

  confidence: number;

  confidenceChange: number;

  nextImprovement: string;

  learningEventId: string;
};

export type LearningEvent = {
  id: string;

  situation: string;

  decision: string;

  outcome: string;

  lesson: string;

  confidenceBefore: number;

  confidenceAfter: number;

  createdAt: string;

  tags: string[];
};

export type LearningExperienceInput = {
  id?: string;

  situation: string;

  decision: string;

  outcome: string;

  lesson: string;

  confidenceBefore?: number;

  confidenceAfter?: number;

  tags?: string[];

  createdAt?: string;
};

type LearningEventRow = {
  id: string;

  situation: string;

  decision: string;

  outcome: string;

  lesson: string;

  confidenceBefore: number;

  confidenceAfter: number;

  createdAt: string;

  tags: string;
};

function clampConfidence(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function normalizeTags(tags: string[]): string[] {
  return Array.from(
    new Set(tags.map((tag) => tag.trim().toLowerCase()).filter(Boolean)),
  );
}

function parseTags(value: string): string[] {
  try {
    const parsed: unknown = JSON.parse(value);

    return Array.isArray(parsed)
      ? parsed.filter((tag): tag is string => typeof tag === "string")
      : [];
  } catch {
    return [];
  }
}

function rowToLearningEvent(row: LearningEventRow): LearningEvent {
  return {
    id: row.id,

    situation: row.situation,

    decision: row.decision,

    outcome: row.outcome,

    lesson: row.lesson,

    confidenceBefore: row.confidenceBefore,

    confidenceAfter: row.confidenceAfter,

    createdAt: row.createdAt,

    tags: parseTags(row.tags),
  };
}

function confidenceForOutcome(outcome: LearningResult): number {
  if (outcome === "success") {
    return 95;
  }

  if (outcome === "partial") {
    return 75;
  }

  return 50;
}

function buildOutcomeText(outcome: LearningOutcome): string {
  const observations =
    outcome.observations.length > 0
      ? outcome.observations.join(" | ")
      : "No observations were recorded.";

  return [`Result: ${outcome.outcome}`, `Observations: ${observations}`].join(
    "\n",
  );
}

function buildLessonText(outcome: LearningOutcome): string {
  if (outcome.lessons.length > 0) {
    return outcome.lessons.join(" | ");
  }

  return outcome.outcome === "success"
    ? "The decision produced the intended result and should be considered again in similar situations."
    : outcome.outcome === "partial"
      ? "The decision produced mixed results and should be adjusted before repeating it."
      : "The decision did not produce the intended result and should not be repeated without a meaningful change.";
}

export class LearningBrain {
  async recordExperience(
    input: LearningExperienceInput,
  ): Promise<LearningEvent> {
    const createdAt = input.createdAt ?? new Date().toISOString();

    const id = input.id ?? `learning-${crypto.randomUUID()}`;

    const confidenceBefore = clampConfidence(input.confidenceBefore ?? 50);

    const confidenceAfter = clampConfidence(
      input.confidenceAfter ?? confidenceBefore,
    );

    const tags = normalizeTags(input.tags ?? []);

    await getDatabase()
      .prepare(
        `
      INSERT OR REPLACE INTO learning_events
      (
        id,
        situation,
        decision,
        outcome,
        lesson,
        confidenceBefore,
        confidenceAfter,
        createdAt,
        tags
      )
      VALUES
      (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      )
      .bind(
        id,
        input.situation.trim(),
        input.decision.trim(),
        input.outcome.trim(),
        input.lesson.trim(),
        confidenceBefore,
        confidenceAfter,
        createdAt,
        JSON.stringify(tags),
      )
      .run();

    return {
      id,

      situation: input.situation.trim(),

      decision: input.decision.trim(),

      outcome: input.outcome.trim(),

      lesson: input.lesson.trim(),

      confidenceBefore,

      confidenceAfter,

      createdAt,

      tags,
    };
  }

  async learn(outcome: LearningOutcome): Promise<LearningSummary> {
    const confidenceBefore = 50;

    const confidenceAfter = confidenceForOutcome(outcome.outcome);

    const lesson = buildLessonText(outcome);

    const learningEvent = await this.recordExperience({
      id: outcome.id,

      situation: outcome.objective,

      decision: outcome.title,

      outcome: buildOutcomeText(outcome),

      lesson,

      confidenceBefore,

      confidenceAfter,

      createdAt: outcome.completedAt,

      tags: ["learning", "experience", outcome.objective, outcome.outcome],
    });

    await Promise.all(
      outcome.lessons.map((currentLesson, index) =>
        memoryBrain.remember({
          id: `${outcome.id}-lesson-${index}`,

          type: "learning",

          title: outcome.title,

          description: currentLesson,

          importance: outcome.outcome === "failure" ? "critical" : "high",

          learnedAt: outcome.completedAt,

          tags: ["learning", "experience", outcome.objective, outcome.outcome],
        }),
      ),
    );

    if (outcome.lessons.length === 0) {
      await memoryBrain.remember({
        id: `${outcome.id}-lesson`,

        type: "learning",

        title: outcome.title,

        description: lesson,

        importance: outcome.outcome === "failure" ? "critical" : "high",

        learnedAt: outcome.completedAt,

        tags: ["learning", "experience", outcome.objective, outcome.outcome],
      });
    }

    const nextImprovement =
      outcome.recommendations[0] ??
      (outcome.outcome === "success"
        ? "Repeat the strongest parts of this decision in similar situations."
        : outcome.outcome === "partial"
          ? "Adjust the weakest part of the decision before trying again."
          : "Choose a different approach before repeating this decision.");

    return {
      learned: true,

      confidence: confidenceAfter,

      confidenceChange: confidenceAfter - confidenceBefore,

      nextImprovement,

      learningEventId: learningEvent.id,
    };
  }

  async latest(limit = 20): Promise<LearningEvent[]> {
    const safeLimit = Math.max(1, Math.min(200, Math.floor(limit)));

    const { results: rows = [] } = await getDatabase()
      .prepare(
        `
        SELECT *
        FROM learning_events
        ORDER BY createdAt DESC
        LIMIT ?
        `,
      )
      .bind(safeLimit)
      .all<LearningEventRow>();

    return rows.map(rowToLearningEvent);
  }

  async recall(tags: string[], limit = 20): Promise<LearningEvent[]> {
    const normalizedTags = normalizeTags(tags);

    if (normalizedTags.length === 0) {
      return [];
    }

    const { results: rows = [] } = await getDatabase()
      .prepare(
        `
        SELECT *
        FROM learning_events
        ORDER BY createdAt DESC
        `,
      )
      .all<LearningEventRow>();

    return rows
      .map(rowToLearningEvent)
      .filter((event) => normalizedTags.some((tag) => event.tags.includes(tag)))
      .slice(0, Math.max(1, Math.min(200, Math.floor(limit))));
  }

  async confidenceFor(tags: string[]): Promise<number> {
    const events = await this.recall(tags, 25);

    if (events.length === 0) {
      return 0;
    }

    const weightedTotal = events.reduce((total, event, index) => {
      const recencyWeight = Math.max(1, 25 - index);

      return total + event.confidenceAfter * recencyWeight;
    }, 0);

    const totalWeight = events.reduce(
      (total, _event, index) => total + Math.max(1, 25 - index),
      0,
    );

    return clampConfidence(weightedTotal / totalWeight);
  }

  async all(): Promise<LearningEvent[]> {
    const { results: rows = [] } = await getDatabase()
      .prepare(
        `
        SELECT *
        FROM learning_events
        ORDER BY createdAt DESC
        `,
      )
      .all<LearningEventRow>();

    return rows.map(rowToLearningEvent);
  }
}

export const learningBrain = new LearningBrain();
