import { getDatabase } from "./database";
import type { CreativePortfolioPlan } from "../CreativePortfolioManager";

type Row = { portfolio: string };
function parse(row: Row | null): CreativePortfolioPlan | null {
  if (!row) return null;
  try {
    return JSON.parse(row.portfolio) as CreativePortfolioPlan;
  } catch {
    return null;
  }
}

export class CreativePortfolioRepository {
  async save(portfolio: CreativePortfolioPlan) {
    const updatedAt = new Date().toISOString();
    const stored = { ...portfolio, updatedAt };
    await getDatabase()
      .prepare(
        `INSERT INTO creative_portfolio_plans (id, growthPlanId, portfolio, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(growthPlanId) DO UPDATE SET portfolio = excluded.portfolio, updatedAt = excluded.updatedAt`,
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
          "SELECT portfolio FROM creative_portfolio_plans WHERE growthPlanId = ?",
        )
        .bind(growthPlanId)
        .first<Row>(),
    );
  }

  async history(limit = 100) {
    const safe = Math.max(1, Math.min(500, Math.floor(limit)));
    return (
      (
        await getDatabase()
          .prepare(
            "SELECT portfolio FROM creative_portfolio_plans ORDER BY createdAt DESC LIMIT ?",
          )
          .bind(safe)
          .all<Row>()
      ).results ?? []
    )
      .map(parse)
      .filter((item): item is CreativePortfolioPlan => item !== null);
  }
}

export const creativePortfolioRepository = new CreativePortfolioRepository();
