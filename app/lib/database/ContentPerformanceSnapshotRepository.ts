import { getDatabase } from "./database";
import type { ContentPerformanceSnapshot } from "../ContentPerformanceLearningEngine";

type Row = { snapshot: string };

function parse(row: Row | null): ContentPerformanceSnapshot | null {
  if (!row) return null;
  try {
    return JSON.parse(row.snapshot) as ContentPerformanceSnapshot;
  } catch {
    return null;
  }
}

export class ContentPerformanceSnapshotRepository {
  private schemaReady: Promise<void> | null = null;

  private ensureSchema() {
    if (!this.schemaReady) {
      this.schemaReady = getDatabase()
        .prepare(`CREATE TABLE IF NOT EXISTS content_performance_snapshots (
          id TEXT PRIMARY KEY,
          executionPlanId TEXT NOT NULL,
          platform TEXT NOT NULL,
          externalId TEXT NOT NULL,
          collectedAt TEXT NOT NULL,
          snapshot TEXT NOT NULL,
          createdAt TEXT NOT NULL
        )`)
        .run()
        .then(() => undefined);
    }

    return this.schemaReady;
  }

  async save(snapshot: ContentPerformanceSnapshot) {
    await this.ensureSchema();
    await getDatabase()
      .prepare(
        `INSERT INTO content_performance_snapshots
      (id, executionPlanId, platform, externalId, collectedAt, snapshot, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        snapshot.id,
        snapshot.executionPlanId,
        snapshot.platform,
        snapshot.externalId,
        snapshot.collectedAt,
        JSON.stringify(snapshot),
        snapshot.createdAt,
      )
      .run();
    return snapshot;
  }

  async latestForExecution(executionPlanId: string) {
    await this.ensureSchema();
    return parse(
      await getDatabase()
        .prepare(
          `SELECT snapshot FROM content_performance_snapshots
      WHERE executionPlanId = ? ORDER BY collectedAt DESC LIMIT 1`,
        )
        .bind(executionPlanId)
        .first<Row>(),
    );
  }

  async latestForPublication(
    executionPlanId: string,
    platform: string,
    externalId: string,
  ) {
    await this.ensureSchema();
    return parse(
      await getDatabase()
        .prepare(
          `SELECT snapshot FROM content_performance_snapshots
      WHERE executionPlanId = ? AND platform = ? AND externalId = ?
      ORDER BY collectedAt DESC LIMIT 1`,
        )
        .bind(executionPlanId, platform, externalId)
        .first<Row>(),
    );
  }

  async forExecution(executionPlanId: string) {
    await this.ensureSchema();
    return (
      (
        await getDatabase()
          .prepare(
            `SELECT snapshot FROM content_performance_snapshots
      WHERE executionPlanId = ? ORDER BY collectedAt DESC`,
          )
          .bind(executionPlanId)
          .all<Row>()
      ).results ?? []
    )
      .map(parse)
      .filter((item): item is ContentPerformanceSnapshot => item !== null);
  }

  async history(limit = 1000) {
    await this.ensureSchema();
    const safe = Math.max(1, Math.min(5000, Math.floor(limit)));
    return (
      (
        await getDatabase()
          .prepare(
            `SELECT snapshot FROM content_performance_snapshots
      ORDER BY collectedAt DESC LIMIT ?`,
          )
          .bind(safe)
          .all<Row>()
      ).results ?? []
    )
      .map(parse)
      .filter((item): item is ContentPerformanceSnapshot => item !== null);
  }
}

export const contentPerformanceSnapshotRepository =
  new ContentPerformanceSnapshotRepository();
