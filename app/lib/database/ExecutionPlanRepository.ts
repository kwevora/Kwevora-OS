import { getDatabase } from "./database";
import type { ExecutionPlan } from "../ExecutionEngine";
import { experimentRepository } from "./ExperimentRepository";

type Row = { plan: string };
const parse = (row: Row | null): ExecutionPlan | null =>
  row ? (JSON.parse(row.plan) as ExecutionPlan) : null;
export class ExecutionPlanRepository {
  async save(plan: ExecutionPlan): Promise<ExecutionPlan> {
    const updatedAt = new Date().toISOString();
    await getDatabase()
      .prepare(
        "INSERT INTO execution_plans (id,plan,objective,status,progress,createdAt,updatedAt) VALUES (?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET plan=excluded.plan,objective=excluded.objective,status=excluded.status,progress=excluded.progress,updatedAt=excluded.updatedAt",
      )
      .bind(
        plan.id,
        JSON.stringify(plan),
        plan.objective,
        plan.status,
        plan.progress,
        plan.createdAt,
        updatedAt,
      )
      .run();
    if (plan.experiment) await experimentRepository.save(plan.experiment);
    return plan;
  }
  async get(id: string) {
    return parse(
      await getDatabase()
        .prepare("SELECT plan FROM execution_plans WHERE id=? LIMIT 1")
        .bind(id)
        .first<Row>(),
    );
  }
  async latest() {
    return parse(
      await getDatabase()
        .prepare(
          "SELECT plan FROM execution_plans ORDER BY createdAt DESC LIMIT 1",
        )
        .first<Row>(),
    );
  }
  async history(limit = 30) {
    const { results = [] } = await getDatabase()
      .prepare(
        "SELECT plan FROM execution_plans ORDER BY createdAt DESC LIMIT ?",
      )
      .bind(Math.max(1, Math.min(200, Math.floor(limit))))
      .all<Row>();
    return results.map((x) => parse(x)!);
  }
  async active() {
    const { results = [] } = await getDatabase()
      .prepare(
        "SELECT plan FROM execution_plans WHERE status NOT IN ('completed','failed') ORDER BY createdAt DESC",
      )
      .all<Row>();
    return results.map((x) => parse(x)!);
  }
}
export const executionPlanRepository = new ExecutionPlanRepository();
