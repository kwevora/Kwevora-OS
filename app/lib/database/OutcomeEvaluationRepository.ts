import { randomUUID } from "crypto";

import {
  db,
} from "./database";

import type {
  OutcomeEvaluation,
} from "../OutcomeEngine";

type OutcomeEvaluationRow = {
  id: string;
  executionPlanId: string;
  evaluation: string;
  outcome: string;
  score: number;
  createdAt: string;
};

export type StoredOutcomeEvaluation = {
  id: string;

  executionPlanId: string;

  evaluation: OutcomeEvaluation;

  outcome: string;

  score: number;

  createdAt: string;
};

function rowToStoredEvaluation(
  row: OutcomeEvaluationRow,
): StoredOutcomeEvaluation | null {
  try {
    const evaluation =
      JSON.parse(
        row.evaluation,
      ) as OutcomeEvaluation;

    return {
      id:
        row.id,

      executionPlanId:
        row.executionPlanId,

      evaluation,

      outcome:
        row.outcome,

      score:
        row.score,

      createdAt:
        row.createdAt,
    };
  } catch {
    return null;
  }
}

export class OutcomeEvaluationRepository {
  save(
    evaluation: OutcomeEvaluation,
  ): StoredOutcomeEvaluation {
    const id =
      randomUUID();

    const createdAt =
      new Date().toISOString();

    const executionPlanId =
      evaluation.learningResult
        .plan.id;

    db.prepare(
      `
        INSERT INTO outcome_evaluations
        (
          id,
          executionPlanId,
          evaluation,
          outcome,
          score,
          createdAt
        )
        VALUES (?, ?, ?, ?, ?, ?)
      `,
    ).run(
      id,
      executionPlanId,
      JSON.stringify(
        evaluation,
      ),
      evaluation.outcome,
      evaluation.score,
      createdAt,
    );

    return {
      id,

      executionPlanId,

      evaluation,

      outcome:
        evaluation.outcome,

      score:
        evaluation.score,

      createdAt,
    };
  }

  latest():
    | StoredOutcomeEvaluation
    | null {
    const row =
      db.prepare(
        `
          SELECT *
          FROM outcome_evaluations
          ORDER BY createdAt DESC
          LIMIT 1
        `,
      ).get() as
        | OutcomeEvaluationRow
        | undefined;

    return row
      ? rowToStoredEvaluation(
          row,
        )
      : null;
  }

  forExecutionPlan(
    executionPlanId: string,
  ): StoredOutcomeEvaluation[] {
    const rows =
      db.prepare(
        `
          SELECT *
          FROM outcome_evaluations
          WHERE executionPlanId = ?
          ORDER BY createdAt DESC
        `,
      ).all(
        executionPlanId,
      ) as OutcomeEvaluationRow[];

    return rows
      .map(
        rowToStoredEvaluation,
      )
      .filter(
        (
          value,
        ): value is StoredOutcomeEvaluation =>
          value !== null,
      );
  }

  history(
    limit = 50,
  ): StoredOutcomeEvaluation[] {
    const safeLimit =
      Math.max(
        1,
        Math.min(
          500,
          Math.floor(
            limit,
          ),
        ),
      );

    const rows =
      db.prepare(
        `
          SELECT *
          FROM outcome_evaluations
          ORDER BY createdAt DESC
          LIMIT ?
        `,
      ).all(
        safeLimit,
      ) as OutcomeEvaluationRow[];

    return rows
      .map(
        rowToStoredEvaluation,
      )
      .filter(
        (
          value,
        ): value is StoredOutcomeEvaluation =>
          value !== null,
      );
  }
}

export const outcomeEvaluationRepository =
  new OutcomeEvaluationRepository();