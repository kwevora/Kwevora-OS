import { getDatabase } from "./database";
import type { CampaignFunnelRecovery } from "../CampaignFunnelRecoveryEngine";
type Row = { recovery: string };
const parse = (r: Row | null) => {
  try {
    return r ? (JSON.parse(r.recovery) as CampaignFunnelRecovery) : null;
  } catch {
    return null;
  }
};
export class CampaignFunnelRecoveryRepository {
  async save(x: CampaignFunnelRecovery) {
    const updatedAt = new Date().toISOString(),
      s = { ...x, updatedAt };
    await getDatabase()
      .prepare(
        "INSERT INTO campaign_funnel_recoveries(id,growthPlanId,status,recovery,createdAt,updatedAt) VALUES(?,?,?,?,?,?) ON CONFLICT(growthPlanId) DO UPDATE SET status=excluded.status,recovery=excluded.recovery,updatedAt=excluded.updatedAt",
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
          "SELECT recovery FROM campaign_funnel_recoveries WHERE growthPlanId=?",
        )
        .bind(id)
        .first<Row>(),
    );
  }
  async history(limit = 100) {
    const { results = [] } = await getDatabase()
      .prepare(
        "SELECT recovery FROM campaign_funnel_recoveries ORDER BY createdAt DESC LIMIT ?",
      )
      .bind(Math.max(1, Math.min(500, limit)))
      .all<Row>();
    return results
      .map(parse)
      .filter((x): x is CampaignFunnelRecovery => x !== null);
  }
}
export const campaignFunnelRecoveryRepository =
  new CampaignFunnelRecoveryRepository();
