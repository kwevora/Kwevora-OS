import { getDatabase } from "./database";
import type { AutonomousPublishingHandoff } from "../AutonomousPublishingHandoffEngine";

type Row = { handoff: string };

function parse(row: Row | null): AutonomousPublishingHandoff | null {
  if (!row) return null;
  try {
    return JSON.parse(row.handoff) as AutonomousPublishingHandoff;
  } catch {
    return null;
  }
}

export class AutonomousPublishingHandoffRepository {
  private initialization?: Promise<void>;

  private async ensureTable() {
    if (!this.initialization) {
      this.initialization = (async () => {
        await getDatabase()
          .prepare(
            `CREATE TABLE IF NOT EXISTS autonomous_publishing_handoffs (
              id TEXT PRIMARY KEY,
              publishingItemId TEXT NOT NULL,
              executionPlanId TEXT NOT NULL,
              platform TEXT NOT NULL,
              status TEXT NOT NULL,
              scheduledFor TEXT,
              attempts INTEGER NOT NULL DEFAULT 0,
              handoff TEXT NOT NULL,
              createdAt TEXT NOT NULL,
              updatedAt TEXT NOT NULL,
              UNIQUE(publishingItemId, platform)
            )`,
          )
          .run();
      })();
    }

    try {
      await this.initialization;
    } catch (error) {
      // Allow a later request to retry initialization after a transient D1
      // failure instead of permanently poisoning this repository instance.
      this.initialization = undefined;
      throw error;
    }
  }

  async save(handoff: AutonomousPublishingHandoff) {
    await this.ensureTable();
    const updatedAt = new Date().toISOString();
    const stored = { ...handoff, updatedAt };
    await getDatabase()
      .prepare(
        `INSERT INTO autonomous_publishing_handoffs
      (id, publishingItemId, executionPlanId, platform, status, scheduledFor, attempts, handoff, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(publishingItemId, platform) DO UPDATE SET
        status = excluded.status,
        scheduledFor = excluded.scheduledFor,
        attempts = excluded.attempts,
        handoff = excluded.handoff,
        updatedAt = excluded.updatedAt`,
      )
      .bind(
        stored.id,
        stored.publishingItemId,
        stored.executionPlanId,
        stored.platform,
        stored.status,
        stored.scheduledFor,
        stored.attempts,
        JSON.stringify(stored),
        stored.createdAt,
        updatedAt,
      )
      .run();
    return stored;
  }

  async forItemPlatform(publishingItemId: string, platform: string) {
    await this.ensureTable();
    return parse(
      await getDatabase()
        .prepare(
          "SELECT handoff FROM autonomous_publishing_handoffs WHERE publishingItemId = ? AND platform = ? LIMIT 1",
        )
        .bind(publishingItemId, platform)
        .first<Row>(),
    );
  }

  async byId(id: string) {
    await this.ensureTable();
    return parse(
      await getDatabase()
        .prepare(
          "SELECT handoff FROM autonomous_publishing_handoffs WHERE id = ? LIMIT 1",
        )
        .bind(id)
        .first<Row>(),
    );
  }

  async forItem(publishingItemId: string) {
    await this.ensureTable();
    return (
      (
        await getDatabase()
          .prepare(
            "SELECT handoff FROM autonomous_publishing_handoffs WHERE publishingItemId = ? ORDER BY createdAt ASC",
          )
          .bind(publishingItemId)
          .all<Row>()
      ).results ?? []
    )
      .map(parse)
      .filter((item): item is AutonomousPublishingHandoff => item !== null);
  }

  async nextDue(now: string) {
    await this.ensureTable();
    return parse(
      await getDatabase()
        .prepare(
          `SELECT handoff FROM autonomous_publishing_handoffs
      WHERE status IN ('ready', 'retry_waiting')
        AND (scheduledFor IS NULL OR scheduledFor = '' OR scheduledFor <= ?)
      ORDER BY CASE WHEN scheduledFor IS NULL OR scheduledFor = '' THEN createdAt ELSE scheduledFor END ASC
      LIMIT 1`,
        )
        .bind(now)
        .first<Row>(),
    );
  }

  async nextProcessing(platform?: string) {
    await this.ensureTable();
    if (!platform) {
      return parse(
        await getDatabase()
          .prepare(
            `SELECT handoff FROM autonomous_publishing_handoffs
        WHERE status = 'platform_processing'
        ORDER BY updatedAt ASC LIMIT 1`,
          )
          .first<Row>(),
      );
    }
    return parse(
      await getDatabase()
        .prepare(
          `SELECT handoff FROM autonomous_publishing_handoffs
      WHERE status = 'platform_processing' AND platform = ?
      ORDER BY updatedAt ASC LIMIT 1`,
        )
        .bind(platform)
        .first<Row>(),
    );
  }

  async history(limit = 500) {
    await this.ensureTable();
    const safe = Math.max(1, Math.min(2000, Math.floor(limit)));
    return (
      (
        await getDatabase()
          .prepare(
            "SELECT handoff FROM autonomous_publishing_handoffs ORDER BY createdAt DESC LIMIT ?",
          )
          .bind(safe)
          .all<Row>()
      ).results ?? []
    )
      .map(parse)
      .filter((item): item is AutonomousPublishingHandoff => item !== null);
  }
}

export const autonomousPublishingHandoffRepository =
  new AutonomousPublishingHandoffRepository();
