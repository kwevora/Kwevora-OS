import { getDatabase } from "./database";
import type { AutonomousContentCycle } from "../AutonomousContentCycleEngine";

type CycleRow = { cycle: string };

function parse(row: CycleRow | null): AutonomousContentCycle | null {
  if (!row) return null;
  try {
    return JSON.parse(row.cycle) as AutonomousContentCycle;
  } catch {
    return null;
  }
}

export class AutonomousCycleRepository {
  async save(cycle: AutonomousContentCycle) {
    const updatedAt = new Date().toISOString();
    await getDatabase()
      .prepare(
        `INSERT INTO autonomous_content_cycles
       (id, executionPlanId, status, cycle, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(executionPlanId) DO UPDATE SET
         status = excluded.status,
         cycle = excluded.cycle,
         updatedAt = excluded.updatedAt`,
      )
      .bind(
        cycle.id,
        cycle.executionPlanId,
        cycle.status,
        JSON.stringify(cycle),
        cycle.createdAt,
        updatedAt,
      )
      .run();
    return cycle;
  }

  async forExecutionPlan(executionPlanId: string) {
    return parse(
      await getDatabase()
        .prepare(
          `SELECT cycle FROM autonomous_content_cycles
       WHERE executionPlanId = ? LIMIT 1`,
        )
        .bind(executionPlanId)
        .first<CycleRow>(),
    );
  }

  async latest() {
    return parse(
      await getDatabase()
        .prepare(
          `SELECT cycle FROM autonomous_content_cycles
       ORDER BY updatedAt DESC LIMIT 1`,
        )
        .first<CycleRow>(),
    );
  }

  async active() {
    return (
      (
        await getDatabase()
          .prepare(
            `SELECT cycle FROM autonomous_content_cycles
       WHERE status NOT IN ('learned', 'stopped')
       ORDER BY updatedAt DESC`,
          )
          .all<CycleRow>()
      ).results ?? []
    )
      .map((row) => parse(row))
      .filter((cycle): cycle is AutonomousContentCycle => cycle !== null);
  }

  async history(limit = 200) {
    const safeLimit = Math.max(1, Math.min(1000, Math.floor(limit)));
    return (
      (
        await getDatabase()
          .prepare(
            `SELECT cycle FROM autonomous_content_cycles
       ORDER BY updatedAt DESC LIMIT ?`,
          )
          .bind(safeLimit)
          .all<CycleRow>()
      ).results ?? []
    )
      .map((row) => parse(row))
      .filter((cycle): cycle is AutonomousContentCycle => cycle !== null);
  }
}

export const autonomousCycleRepository = new AutonomousCycleRepository();
