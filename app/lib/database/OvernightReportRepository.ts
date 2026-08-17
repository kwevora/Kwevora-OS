import { getDatabase } from "./database";
import type { OvernightReport } from "../OvernightEngine";

type Row = {
  id: string;
  report: string;
  startedAt: string;
  finishedAt: string;
  createdAt: string;
};
export type StoredOvernightReport = {
  id: string;
  report: OvernightReport;
  startedAt: string;
  finishedAt: string;
  createdAt: string;
};
const parse = (row: Row | null): StoredOvernightReport | null => {
  if (!row) return null;
  try {
    return { ...row, report: JSON.parse(row.report) as OvernightReport };
  } catch {
    return null;
  }
};

export class OvernightReportRepository {
  async save(report: OvernightReport): Promise<StoredOvernightReport> {
    const id = `overnight-${report.finishedAt.replace(/[:.]/g, "-")}`;
    const createdAt = new Date().toISOString();
    await getDatabase()
      .prepare(
        "INSERT OR REPLACE INTO overnight_reports (id,report,startedAt,finishedAt,createdAt) VALUES (?,?,?,?,?)",
      )
      .bind(
        id,
        JSON.stringify(report),
        report.startedAt,
        report.finishedAt,
        createdAt,
      )
      .run();
    return {
      id,
      report,
      startedAt: report.startedAt,
      finishedAt: report.finishedAt,
      createdAt,
    };
  }
  async latest(): Promise<StoredOvernightReport | null> {
    return parse(
      await getDatabase()
        .prepare(
          "SELECT * FROM overnight_reports ORDER BY finishedAt DESC LIMIT 1",
        )
        .first<Row>(),
    );
  }
  async history(limit = 30): Promise<StoredOvernightReport[]> {
    const safe = Math.max(1, Math.min(365, Math.floor(limit)));
    const { results = [] } = await getDatabase()
      .prepare(
        "SELECT * FROM overnight_reports ORDER BY finishedAt DESC LIMIT ?",
      )
      .bind(safe)
      .all<Row>();
    return results
      .map(parse)
      .filter((x): x is StoredOvernightReport => x !== null);
  }
  async deleteOlderThan(isoDate: string): Promise<number> {
    const result = await getDatabase()
      .prepare("DELETE FROM overnight_reports WHERE finishedAt < ?")
      .bind(isoDate)
      .run();
    return result.meta?.changes ?? 0;
  }
}
export const overnightReportRepository = new OvernightReportRepository();
