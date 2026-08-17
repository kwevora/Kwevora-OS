import { randomUUID } from "node:crypto";
import { getDatabase } from "./database";
import type { OutcomeEvaluation } from "../OutcomeEngine";

type Row = {
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
const parse = (row: Row | null): StoredOutcomeEvaluation | null => {
  if (!row) return null;
  try {
    return {
      ...row,
      evaluation: JSON.parse(row.evaluation) as OutcomeEvaluation,
    };
  } catch {
    return null;
  }
};
export class OutcomeEvaluationRepository {
  async save(evaluation: OutcomeEvaluation): Promise<StoredOutcomeEvaluation> {
    const id = randomUUID(),
      createdAt = new Date().toISOString(),
      executionPlanId = evaluation.learningResult.plan.id;
    await getDatabase()
      .prepare(
        "INSERT INTO outcome_evaluations (id,executionPlanId,evaluation,outcome,score,createdAt) VALUES (?,?,?,?,?,?)",
      )
      .bind(
        id,
        executionPlanId,
        JSON.stringify(evaluation),
        evaluation.outcome,
        evaluation.score,
        createdAt,
      )
      .run();
    return {
      id,
      executionPlanId,
      evaluation,
      outcome: evaluation.outcome,
      score: evaluation.score,
      createdAt,
    };
  }
  async latest() {
    return parse(
      await getDatabase()
        .prepare(
          "SELECT * FROM outcome_evaluations ORDER BY createdAt DESC LIMIT 1",
        )
        .first<Row>(),
    );
  }
  async forExecutionPlan(id: string) {
    const { results = [] } = await getDatabase()
      .prepare(
        "SELECT * FROM outcome_evaluations WHERE executionPlanId=? ORDER BY createdAt DESC",
      )
      .bind(id)
      .all<Row>();
    return results
      .map(parse)
      .filter((x): x is StoredOutcomeEvaluation => x !== null);
  }
  async history(limit = 50) {
    const { results = [] } = await getDatabase()
      .prepare(
        "SELECT * FROM outcome_evaluations ORDER BY createdAt DESC LIMIT ?",
      )
      .bind(Math.max(1, Math.min(500, Math.floor(limit))))
      .all<Row>();
    return results
      .map(parse)
      .filter((x): x is StoredOutcomeEvaluation => x !== null);
  }
}
export const outcomeEvaluationRepository = new OutcomeEvaluationRepository();
