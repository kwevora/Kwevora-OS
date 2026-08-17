import { getDatabase } from "./database";
import type { RevenueScalingDecision } from "../RevenueScalingGovernor";
type Row = { decision: string };
const parse = (r: Row | null) => {
  try {
    return r ? (JSON.parse(r.decision) as RevenueScalingDecision) : null;
  } catch {
    return null;
  }
};
export class RevenueScalingDecisionRepository {
  async save(x: RevenueScalingDecision) {
    const updatedAt = new Date().toISOString(),
      s = { ...x, updatedAt };
    await getDatabase()
      .prepare(
        "INSERT INTO revenue_scaling_decisions(id,growthPlanId,status,decision,createdAt,updatedAt) VALUES(?,?,?,?,?,?) ON CONFLICT(growthPlanId) DO UPDATE SET status=excluded.status,decision=excluded.decision,updatedAt=excluded.updatedAt",
      )
      .bind(
        s.id,
        s.growthPlanId,
        s.status,
        JSON.stringify(s),
        s.createdAt,
        updatedAt,
      )
      .run();
    return s;
  }
  async forPlan(id: string) {
    return parse(
      await getDatabase()
        .prepare(
          "SELECT decision FROM revenue_scaling_decisions WHERE growthPlanId=?",
        )
        .bind(id)
        .first<Row>(),
    );
  }
}
export const revenueScalingDecisionRepository =
  new RevenueScalingDecisionRepository();
