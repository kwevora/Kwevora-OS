import { getDatabase } from "./database";
import type { WeeklyLearningReview } from "../WeeklyLearningLoop";
type Row = { review: string };
const parse = (r: Row | null) => {
  try {
    return r ? (JSON.parse(r.review) as WeeklyLearningReview) : null;
  } catch {
    return null;
  }
};
export class WeeklyLearningReviewRepository {
  async forPlan(id: string) {
    return parse(
      await getDatabase()
        .prepare(
          "SELECT review FROM weekly_learning_reviews WHERE growthPlanId=?",
        )
        .bind(id)
        .first<Row>(),
    );
  }
  async latest() {
    return parse(
      await getDatabase()
        .prepare(
          "SELECT review FROM weekly_learning_reviews ORDER BY updatedAt DESC LIMIT 1",
        )
        .first<Row>(),
    );
  }
  async save(x: WeeklyLearningReview) {
    const updatedAt = new Date().toISOString(),
      s = { ...x, updatedAt };
    await getDatabase()
      .prepare(
        "INSERT INTO weekly_learning_reviews(id,growthPlanId,status,review,createdAt,updatedAt) VALUES(?,?,?,?,?,?) ON CONFLICT(growthPlanId) DO UPDATE SET status=excluded.status,review=excluded.review,updatedAt=excluded.updatedAt",
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
}
export const weeklyLearningReviewRepository =
  new WeeklyLearningReviewRepository();
