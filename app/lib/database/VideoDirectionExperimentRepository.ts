import { getDatabase } from "./database";
import type { VideoDirectionExperiment } from "../VideoExperimentPlanner";

type Row = { experiment: string };
function parse(row: Row | null): VideoDirectionExperiment | null {
  if (!row) return null;
  try {
    return JSON.parse(row.experiment) as VideoDirectionExperiment;
  } catch {
    return null;
  }
}

export class VideoDirectionExperimentRepository {
  async save(experiment: VideoDirectionExperiment) {
    const updatedAt = new Date().toISOString();
    const stored = { ...experiment, updatedAt };
    await getDatabase()
      .prepare(
        `INSERT INTO video_direction_experiments (id, growthPlanId, status, experiment, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET status = excluded.status, experiment = excluded.experiment, updatedAt = excluded.updatedAt`,
      )
      .bind(
        stored.id,
        stored.growthPlanId,
        stored.status,
        JSON.stringify(stored),
        stored.createdAt,
        updatedAt,
      )
      .run();
    return stored;
  }
  async forPlan(growthPlanId: string) {
    return (
      (
        await getDatabase()
          .prepare(
            "SELECT experiment FROM video_direction_experiments WHERE growthPlanId = ? ORDER BY createdAt DESC",
          )
          .bind(growthPlanId)
          .all<Row>()
      ).results ?? []
    )
      .map(parse)
      .filter((item): item is VideoDirectionExperiment => item !== null);
  }
  async forSlot(slotId: string) {
    return (
      (await this.history()).find(
        (item) =>
          item.control.slotIds.includes(slotId) ||
          item.challenger.slotIds.includes(slotId),
      ) ?? null
    );
  }
  async history(limit = 200) {
    const safe = Math.max(1, Math.min(1000, Math.floor(limit)));
    return (
      (
        await getDatabase()
          .prepare(
            "SELECT experiment FROM video_direction_experiments ORDER BY createdAt DESC LIMIT ?",
          )
          .bind(safe)
          .all<Row>()
      ).results ?? []
    )
      .map(parse)
      .filter((item): item is VideoDirectionExperiment => item !== null);
  }
}

export const videoDirectionExperimentRepository =
  new VideoDirectionExperimentRepository();
