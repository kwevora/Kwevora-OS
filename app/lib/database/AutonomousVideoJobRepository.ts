import { getDatabase } from "./database";
import type { AutonomousVideoJob } from "../AutonomousVideoQueueEngine";

type Row = { job: string };
function parse(row: Row | null): AutonomousVideoJob | null {
  if (!row) return null;
  try {
    return JSON.parse(row.job) as AutonomousVideoJob;
  } catch {
    return null;
  }
}

export class AutonomousVideoJobRepository {
  async save(job: AutonomousVideoJob) {
    const updatedAt = new Date().toISOString();
    const stored = { ...job, updatedAt };
    await getDatabase()
      .prepare(
        `INSERT INTO autonomous_video_jobs
      (id, executionPlanId, growthPlanId, slotId, reviewItemId, status, attempts, job, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(executionPlanId) DO UPDATE SET status = excluded.status, attempts = excluded.attempts, job = excluded.job, updatedAt = excluded.updatedAt`,
      )
      .bind(
        stored.id,
        stored.executionPlanId,
        stored.growthPlanId,
        stored.slotId,
        stored.reviewItemId,
        stored.status,
        stored.attempts,
        JSON.stringify(stored),
        stored.createdAt,
        updatedAt,
      )
      .run();
    return stored;
  }

  async forExecutionPlan(executionPlanId: string) {
    return parse(
      await getDatabase()
        .prepare(
          "SELECT job FROM autonomous_video_jobs WHERE executionPlanId = ? LIMIT 1",
        )
        .bind(executionPlanId)
        .first<Row>(),
    );
  }

  async nextReady() {
    return parse(
      await getDatabase()
        .prepare(
          "SELECT job FROM autonomous_video_jobs WHERE status IN ('queued', 'retry_waiting') ORDER BY createdAt ASC LIMIT 1",
        )
        .first<Row>(),
    );
  }

  async history(limit = 200) {
    const safe = Math.max(1, Math.min(1000, Math.floor(limit)));
    return (
      (
        await getDatabase()
          .prepare(
            "SELECT job FROM autonomous_video_jobs ORDER BY createdAt DESC LIMIT ?",
          )
          .bind(safe)
          .all<Row>()
      ).results ?? []
    )
      .map(parse)
      .filter((job): job is AutonomousVideoJob => job !== null);
  }
}

export const autonomousVideoJobRepository = new AutonomousVideoJobRepository();
