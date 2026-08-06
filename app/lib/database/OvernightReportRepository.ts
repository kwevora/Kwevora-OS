import { db } from "./database";

import type {
  OvernightReport,
} from "../OvernightEngine";

type OvernightReportRow = {
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

function createReportId(
  report: OvernightReport,
): string {
  return `overnight-${report.finishedAt.replace(
    /[:.]/g,
    "-",
  )}`;
}

function parseReport(
  value: string,
): OvernightReport | null {
  try {
    const parsed =
      JSON.parse(value) as OvernightReport;

    if (
      typeof parsed.startedAt !== "string" ||
      typeof parsed.finishedAt !== "string" ||
      typeof parsed.summary !== "string" ||
      !Array.isArray(parsed.completedWork) ||
      !Array.isArray(parsed.opportunities) ||
      !Array.isArray(parsed.warnings) ||
      typeof parsed.nextOwnerDecision !==
        "string"
    ) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

function rowToStoredReport(
  row: OvernightReportRow,
): StoredOvernightReport | null {
  const report =
    parseReport(row.report);

  if (!report) {
    return null;
  }

  return {
    id: row.id,
    report,
    startedAt: row.startedAt,
    finishedAt: row.finishedAt,
    createdAt: row.createdAt,
  };
}

export class OvernightReportRepository {
  save(
    report: OvernightReport,
  ): StoredOvernightReport {
    const id =
      createReportId(report);

    const createdAt =
      new Date().toISOString();

    db.prepare(
      `
      INSERT OR REPLACE INTO overnight_reports
      (
        id,
        report,
        startedAt,
        finishedAt,
        createdAt
      )
      VALUES
      (?, ?, ?, ?, ?)
      `,
    ).run(
      id,
      JSON.stringify(report),
      report.startedAt,
      report.finishedAt,
      createdAt,
    );

    return {
      id,
      report,
      startedAt:
        report.startedAt,
      finishedAt:
        report.finishedAt,
      createdAt,
    };
  }

  latest():
    | StoredOvernightReport
    | null {
    const row = db
      .prepare(
        `
        SELECT *
        FROM overnight_reports
        ORDER BY finishedAt DESC
        LIMIT 1
        `,
      )
      .get() as
      | OvernightReportRow
      | undefined;

    if (!row) {
      return null;
    }

    return rowToStoredReport(
      row,
    );
  }

  history(
    limit = 30,
  ): StoredOvernightReport[] {
    const safeLimit =
      Math.max(
        1,
        Math.min(
          365,
          Math.floor(limit),
        ),
      );

    const rows = db
      .prepare(
        `
        SELECT *
        FROM overnight_reports
        ORDER BY finishedAt DESC
        LIMIT ?
        `,
      )
      .all(
        safeLimit,
      ) as OvernightReportRow[];

    return rows
      .map(rowToStoredReport)
      .filter(
        (
          report,
        ): report is StoredOvernightReport =>
          report !== null,
      );
  }

  deleteOlderThan(
    isoDate: string,
  ): number {
    const result = db
      .prepare(
        `
        DELETE FROM overnight_reports
        WHERE finishedAt < ?
        `,
      )
      .run(
        isoDate,
      );

    return result.changes;
  }
}

export const overnightReportRepository =
  new OvernightReportRepository();