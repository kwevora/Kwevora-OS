import { getDatabase } from "./database";
import type { AutonomousGrowthPlan } from "../AutonomousGrowthPlanner";

type GrowthPlanRow = { plan: string };

function parse(row: GrowthPlanRow | null): AutonomousGrowthPlan | null {
  if (!row) return null;
  try {
    return JSON.parse(row.plan) as AutonomousGrowthPlan;
  } catch {
    return null;
  }
}

export class AutonomousGrowthPlanRepository {
  async save(plan: AutonomousGrowthPlan) {
    const updatedAt = new Date().toISOString();
    await getDatabase()
      .prepare(
        `INSERT INTO autonomous_growth_plans (id, weekStart, plan, status, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(weekStart) DO UPDATE SET id = excluded.id, plan = excluded.plan, status = excluded.status, updatedAt = excluded.updatedAt`,
      )
      .bind(
        plan.id,
        plan.weekStart,
        JSON.stringify(plan),
        plan.status,
        plan.createdAt,
        updatedAt,
      )
      .run();
    return plan;
  }

  async latest() {
    return parse(
      await getDatabase()
        .prepare(
          "SELECT plan FROM autonomous_growth_plans ORDER BY weekStart DESC LIMIT 1",
        )
        .first<GrowthPlanRow>(),
    );
  }

  async byId(id: string) {
    return parse(
      await getDatabase()
        .prepare(
          "SELECT plan FROM autonomous_growth_plans WHERE id = ? LIMIT 1",
        )
        .bind(id)
        .first<GrowthPlanRow>(),
    );
  }

  async history(limit = 52) {
    const safeLimit = Math.max(1, Math.min(260, Math.floor(limit)));
    return (
      (
        await getDatabase()
          .prepare(
            "SELECT plan FROM autonomous_growth_plans ORDER BY weekStart DESC LIMIT ?",
          )
          .bind(safeLimit)
          .all<GrowthPlanRow>()
      ).results ?? []
    )
      .map((row) => parse(row))
      .filter((plan): plan is AutonomousGrowthPlan => plan !== null);
  }

  async forWeek(weekStart: string) {
    return parse(
      await getDatabase()
        .prepare(
          "SELECT plan FROM autonomous_growth_plans WHERE weekStart = ? LIMIT 1",
        )
        .bind(weekStart)
        .first<GrowthPlanRow>(),
    );
  }
}

export const autonomousGrowthPlanRepository =
  new AutonomousGrowthPlanRepository();
