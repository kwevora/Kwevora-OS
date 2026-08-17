import { getDatabase } from "./database";
import type {
  BusinessHealthSnapshot,
  ExecutiveDecision,
} from "../BusinessHealthExecutiveEngine";
const parse = <T>(x: string) => JSON.parse(x) as T;
export class BusinessHealthRepository {
  async snapshot(date: string) {
    const r = await getDatabase()
      .prepare(
        "SELECT snapshotData FROM business_health_snapshots WHERE snapshotDate=?",
      )
      .bind(date)
      .first<{ snapshotData: string }>();
    return r ? parse<BusinessHealthSnapshot>(r.snapshotData) : null;
  }
  async history(limit = 30) {
    const { results = [] } = await getDatabase()
      .prepare(
        "SELECT snapshotData FROM business_health_snapshots ORDER BY snapshotDate DESC LIMIT ?",
      )
      .bind(Math.max(1, Math.min(365, limit)))
      .all<{ snapshotData: string }>();
    return results.map((x) => parse<BusinessHealthSnapshot>(x.snapshotData));
  }
  async saveSnapshot(x: BusinessHealthSnapshot) {
    const now = new Date().toISOString(),
      saved = { ...x, updatedAt: now };
    await getDatabase()
      .prepare(
        "INSERT INTO business_health_snapshots (id,snapshotDate,healthScore,snapshotData,createdAt,updatedAt) VALUES (?,?,?,?,?,?) ON CONFLICT(snapshotDate) DO UPDATE SET healthScore=excluded.healthScore,snapshotData=excluded.snapshotData,updatedAt=excluded.updatedAt",
      )
      .bind(
        saved.id,
        saved.snapshotDate,
        saved.healthScore,
        JSON.stringify(saved),
        saved.createdAt,
        now,
      )
      .run();
    return saved;
  }
  async decision(id: string) {
    const r = await getDatabase()
      .prepare(
        "SELECT decisionData FROM executive_decisions WHERE snapshotId=?",
      )
      .bind(id)
      .first<{ decisionData: string }>();
    return r ? parse<ExecutiveDecision>(r.decisionData) : null;
  }
  async saveDecision(x: ExecutiveDecision) {
    const now = new Date().toISOString(),
      saved = { ...x, updatedAt: now };
    await getDatabase()
      .prepare(
        "INSERT INTO executive_decisions (id,snapshotId,status,decisionData,createdAt,updatedAt) VALUES (?,?,?,?,?,?) ON CONFLICT(snapshotId) DO UPDATE SET status=excluded.status,decisionData=excluded.decisionData,updatedAt=excluded.updatedAt",
      )
      .bind(
        saved.id,
        saved.snapshotId,
        saved.status,
        JSON.stringify(saved),
        saved.createdAt,
        now,
      )
      .run();
    return saved;
  }
}
export const businessHealthRepository = new BusinessHealthRepository();
