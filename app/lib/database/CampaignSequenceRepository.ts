import { getDatabase } from "./database";
import type { CampaignSequencePlan } from "../CampaignSequencingEngine";

type Row = { campaign: string };
function parse(row: Row | null): CampaignSequencePlan | null {
  if (!row) return null;
  try {
    return JSON.parse(row.campaign) as CampaignSequencePlan;
  } catch {
    return null;
  }
}

export class CampaignSequenceRepository {
  async save(campaign: CampaignSequencePlan) {
    const updatedAt = new Date().toISOString();
    const stored = { ...campaign, updatedAt };
    await getDatabase()
      .prepare(
        `INSERT INTO campaign_sequence_plans (id, growthPlanId, campaign, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?) ON CONFLICT(growthPlanId) DO UPDATE SET campaign = excluded.campaign, updatedAt = excluded.updatedAt`,
      )
      .bind(
        stored.id,
        stored.growthPlanId,
        JSON.stringify(stored),
        stored.createdAt,
        updatedAt,
      )
      .run();
    return stored;
  }
  async forGrowthPlan(growthPlanId: string) {
    return parse(
      await getDatabase()
        .prepare(
          "SELECT campaign FROM campaign_sequence_plans WHERE growthPlanId = ?",
        )
        .bind(growthPlanId)
        .first<Row>(),
    );
  }
}
export const campaignSequenceRepository = new CampaignSequenceRepository();
