import { getDatabase } from "./database";
import type { ExecutionExperiment } from "../ExperimentEngine";

type Row = { experiment: string };
const parse = (row: Row | null): ExecutionExperiment | null => {
  if (!row) return null;
  try {
    return JSON.parse(row.experiment) as ExecutionExperiment;
  } catch {
    return null;
  }
};
const list = (rows: Row[]) =>
  rows.map(parse).filter((x): x is ExecutionExperiment => x !== null);

export class ExperimentRepository {
  async save(x: ExecutionExperiment): Promise<ExecutionExperiment> {
    const updatedAt = new Date().toISOString();
    await getDatabase()
      .prepare(
        "INSERT INTO execution_experiments (id,executionPlanId,contextKey,variable,status,verdict,experiment,createdAt,updatedAt) VALUES (?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET status=excluded.status,verdict=excluded.verdict,experiment=excluded.experiment,updatedAt=excluded.updatedAt",
      )
      .bind(
        x.id,
        x.executionPlanId,
        x.contextKey,
        x.variable,
        x.status,
        x.verdict ?? null,
        JSON.stringify(x),
        x.createdAt,
        updatedAt,
      )
      .run();
    return x;
  }
  async get(id: string) {
    return parse(
      await getDatabase()
        .prepare(
          "SELECT experiment FROM execution_experiments WHERE id=? LIMIT 1",
        )
        .bind(id)
        .first<Row>(),
    );
  }
  async forExecutionPlan(id: string) {
    return parse(
      await getDatabase()
        .prepare(
          "SELECT experiment FROM execution_experiments WHERE executionPlanId=? LIMIT 1",
        )
        .bind(id)
        .first<Row>(),
    );
  }
  async activeForContext(key: string) {
    return parse(
      await getDatabase()
        .prepare(
          "SELECT experiment FROM execution_experiments WHERE contextKey=? AND status IN ('planned','running') ORDER BY createdAt DESC LIMIT 1",
        )
        .bind(key)
        .first<Row>(),
    );
  }
  async active() {
    const { results = [] } = await getDatabase()
      .prepare(
        "SELECT experiment FROM execution_experiments WHERE status IN ('planned','running') ORDER BY createdAt DESC",
      )
      .all<Row>();
    return list(results);
  }
  async completed(limit = 500) {
    const { results = [] } = await getDatabase()
      .prepare(
        "SELECT experiment FROM execution_experiments WHERE status='completed' ORDER BY createdAt DESC LIMIT ?",
      )
      .bind(Math.max(1, Math.min(2000, Math.floor(limit))))
      .all<Row>();
    return list(results);
  }
  async history(key: string, limit = 20) {
    const { results = [] } = await getDatabase()
      .prepare(
        "SELECT experiment FROM execution_experiments WHERE contextKey=? ORDER BY createdAt DESC LIMIT ?",
      )
      .bind(key, Math.max(1, Math.min(100, Math.floor(limit))))
      .all<Row>();
    return list(results);
  }
}
export const experimentRepository = new ExperimentRepository();
