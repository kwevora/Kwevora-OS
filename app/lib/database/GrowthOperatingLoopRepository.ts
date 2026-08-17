import { getDatabase } from "./database";
import type { GrowthOperatingLoopDecision } from "../GrowthOperatingLoop";
type Row = { loop: string };
const parse = (r: Row | null) => {
  try {
    return r ? (JSON.parse(r.loop) as GrowthOperatingLoopDecision) : null;
  } catch {
    return null;
  }
};
export class GrowthOperatingLoopRepository {
  async forPlan(id: string) {
    return parse(
      await getDatabase()
        .prepare("SELECT loop FROM growth_operating_loops WHERE growthPlanId=?")
        .bind(id)
        .first<Row>(),
    );
  }
  async save(x: GrowthOperatingLoopDecision) {
    const updatedAt = new Date().toISOString(),
      s = { ...x, updatedAt };
    await getDatabase()
      .prepare(
        "INSERT INTO growth_operating_loops(id,growthPlanId,status,priority,loop,createdAt,updatedAt) VALUES(?,?,?,?,?,?,?) ON CONFLICT(growthPlanId) DO UPDATE SET status=excluded.status,priority=excluded.priority,loop=excluded.loop,updatedAt=excluded.updatedAt",
      )
      .bind(
        s.id,
        s.growthPlanId,
        s.status,
        s.priority,
        JSON.stringify(s),
        s.createdAt,
        updatedAt,
      )
      .run();
    return s;
  }
}
export const growthOperatingLoopRepository =
  new GrowthOperatingLoopRepository();
