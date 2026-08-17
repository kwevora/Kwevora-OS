import { randomUUID } from "crypto";

import { getDatabase } from "./database/database";

import type {
  DepartmentName,
  DepartmentReport,
  DepartmentStatus,
} from "./Department";

export type OrganizationTrend =
  | "improving"
  | "stable"
  | "declining"
  | "unknown";

export type OrganizationDepartmentState = {
  id: string;

  department: DepartmentName;

  status: DepartmentStatus;

  healthScore: number;

  previousHealthScore: number | null;

  healthChange: number;

  trend: OrganizationTrend;

  confidence: number;

  summary: string;

  biggestRisk: string;

  biggestOpportunity: string;

  requiresOwnerAttention: boolean;

  canOperateAutomatically: boolean;

  ownerDecisionCount: number;

  kaiWorkCount: number;

  missingInformation: string[];

  recordedAt: string;
};

export type OrganizationSnapshot = {
  id: string;

  overallHealthScore: number;

  previousOverallHealthScore: number | null;

  overallHealthChange: number;

  overallTrend: OrganizationTrend;

  healthyDepartments: DepartmentName[];

  watchingDepartments: DepartmentName[];

  departmentsNeedingAttention: DepartmentName[];

  blockedDepartments: DepartmentName[];

  ownerAttentionDepartments: DepartmentName[];

  autonomousDepartments: DepartmentName[];

  biggestRisk: string;

  biggestOpportunity: string;

  departmentStates: OrganizationDepartmentState[];

  recordedAt: string;
};

type DepartmentStateRow = {
  id: string;
  department: DepartmentName;
  status: DepartmentStatus;
  healthScore: number;
  previousHealthScore: number | null;
  healthChange: number;
  trend: OrganizationTrend;
  confidence: number;
  summary: string;
  biggestRisk: string;
  biggestOpportunity: string;
  requiresOwnerAttention: number;
  canOperateAutomatically: number;
  ownerDecisionCount: number;
  kaiWorkCount: number;
  missingInformation: string;
  recordedAt: string;
};

type OrganizationSnapshotRow = {
  id: string;
  snapshot: string;
  overallHealthScore: number;
  overallTrend: OrganizationTrend;
  recordedAt: string;
};

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function parseStringArray(value: string): string[] {
  try {
    const parsed: unknown = JSON.parse(value);

    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
}

function calculateTrend(
  change: number,
  hasPreviousValue: boolean,
): OrganizationTrend {
  if (!hasPreviousValue) {
    return "unknown";
  }

  if (change >= 3) {
    return "improving";
  }

  if (change <= -3) {
    return "declining";
  }

  return "stable";
}

function rowToDepartmentState(
  row: DepartmentStateRow,
): OrganizationDepartmentState {
  return {
    id: row.id,

    department: row.department,

    status: row.status,

    healthScore: row.healthScore,

    previousHealthScore: row.previousHealthScore,

    healthChange: row.healthChange,

    trend: row.trend,

    confidence: row.confidence,

    summary: row.summary,

    biggestRisk: row.biggestRisk,

    biggestOpportunity: row.biggestOpportunity,

    requiresOwnerAttention: row.requiresOwnerAttention === 1,

    canOperateAutomatically: row.canOperateAutomatically === 1,

    ownerDecisionCount: row.ownerDecisionCount,

    kaiWorkCount: row.kaiWorkCount,

    missingInformation: parseStringArray(row.missingInformation),

    recordedAt: row.recordedAt,
  };
}

function parseSnapshot(value: string): OrganizationSnapshot | null {
  try {
    const parsed = JSON.parse(value) as Partial<OrganizationSnapshot>;

    if (
      typeof parsed.id !== "string" ||
      typeof parsed.overallHealthScore !== "number" ||
      typeof parsed.overallTrend !== "string" ||
      typeof parsed.recordedAt !== "string" ||
      !Array.isArray(parsed.departmentStates)
    ) {
      return null;
    }

    return parsed as OrganizationSnapshot;
  } catch {
    return null;
  }
}

export class OrganizationMemory {
  private async latestDepartmentState(
    department: DepartmentName,
  ): Promise<OrganizationDepartmentState | null> {
    const row = await getDatabase()
      .prepare(
        `
        SELECT *
        FROM organization_department_states
        WHERE department = ?
        ORDER BY recordedAt DESC
        LIMIT 1
        `,
      )
      .bind(department)
      .first<DepartmentStateRow>();

    return row ? rowToDepartmentState(row) : null;
  }

  async recordDepartmentReport(
    report: DepartmentReport,
  ): Promise<OrganizationDepartmentState> {
    const previous = await this.latestDepartmentState(report.department);

    const previousHealthScore = previous?.healthScore ?? null;

    const healthScore = clampScore(report.healthScore);

    const healthChange =
      previousHealthScore === null ? 0 : healthScore - previousHealthScore;

    const trend = calculateTrend(healthChange, previousHealthScore !== null);

    const state: OrganizationDepartmentState = {
      id: randomUUID(),

      department: report.department,

      status: report.status,

      healthScore,

      previousHealthScore,

      healthChange,

      trend,

      confidence: clampScore(report.confidence),

      summary: report.summary,

      biggestRisk: report.biggestRisk,

      biggestOpportunity: report.biggestOpportunity,

      requiresOwnerAttention: report.requiresOwnerAttention,

      canOperateAutomatically: report.canOperateAutomatically,

      ownerDecisionCount: report.ownerDecisions.length,

      kaiWorkCount: report.kaiWork.length,

      missingInformation: report.missingInformation,

      recordedAt: new Date().toISOString(),
    };

    await getDatabase()
      .prepare(
        `
      INSERT INTO organization_department_states
      (
        id,
        department,
        status,
        healthScore,
        previousHealthScore,
        healthChange,
        trend,
        confidence,
        summary,
        biggestRisk,
        biggestOpportunity,
        requiresOwnerAttention,
        canOperateAutomatically,
        ownerDecisionCount,
        kaiWorkCount,
        missingInformation,
        recordedAt
      )
      VALUES
      (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      )
      .bind(
        state.id,
        state.department,
        state.status,
        state.healthScore,
        state.previousHealthScore,
        state.healthChange,
        state.trend,
        state.confidence,
        state.summary,
        state.biggestRisk,
        state.biggestOpportunity,
        state.requiresOwnerAttention ? 1 : 0,
        state.canOperateAutomatically ? 1 : 0,
        state.ownerDecisionCount,
        state.kaiWorkCount,
        JSON.stringify(state.missingInformation),
        state.recordedAt,
      )
      .run();

    return state;
  }

  async recordOrganization(
    reports: DepartmentReport[],
  ): Promise<OrganizationSnapshot> {
    const departmentStates = await Promise.all(
      reports.map((report) => this.recordDepartmentReport(report)),
    );

    const previousSnapshot = await this.latestSnapshot();

    const overallHealthScore =
      departmentStates.length > 0
        ? clampScore(
            departmentStates.reduce(
              (total, state) => total + state.healthScore,
              0,
            ) / departmentStates.length,
          )
        : 0;

    const previousOverallHealthScore =
      previousSnapshot?.overallHealthScore ?? null;

    const overallHealthChange =
      previousOverallHealthScore === null
        ? 0
        : overallHealthScore - previousOverallHealthScore;

    const overallTrend = calculateTrend(
      overallHealthChange,
      previousOverallHealthScore !== null,
    );

    const riskState = [...departmentStates].sort(
      (first, second) => first.healthScore - second.healthScore,
    )[0];

    const opportunityState = [...departmentStates].sort(
      (first, second) => second.healthScore - first.healthScore,
    )[0];

    const snapshot: OrganizationSnapshot = {
      id: randomUUID(),

      overallHealthScore,

      previousOverallHealthScore,

      overallHealthChange,

      overallTrend,

      healthyDepartments: departmentStates
        .filter((state) => state.status === "healthy")
        .map((state) => state.department),

      watchingDepartments: departmentStates
        .filter((state) => state.status === "watching")
        .map((state) => state.department),

      departmentsNeedingAttention: departmentStates
        .filter((state) => state.status === "needs_attention")
        .map((state) => state.department),

      blockedDepartments: departmentStates
        .filter((state) => state.status === "blocked")
        .map((state) => state.department),

      ownerAttentionDepartments: departmentStates
        .filter((state) => state.requiresOwnerAttention)
        .map((state) => state.department),

      autonomousDepartments: departmentStates
        .filter((state) => state.canOperateAutomatically)
        .map((state) => state.department),

      biggestRisk: riskState
        ? `${riskState.department}: ${riskState.biggestRisk}`
        : "No department risks were reported.",

      biggestOpportunity: opportunityState
        ? `${opportunityState.department}: ${opportunityState.biggestOpportunity}`
        : "No department opportunities were reported.",

      departmentStates,

      recordedAt: new Date().toISOString(),
    };

    await getDatabase()
      .prepare(
        `
      INSERT INTO organization_snapshots
      (
        id,
        snapshot,
        overallHealthScore,
        overallTrend,
        recordedAt
      )
      VALUES
      (?, ?, ?, ?, ?)
      `,
      )
      .bind(
        snapshot.id,
        JSON.stringify(snapshot),
        snapshot.overallHealthScore,
        snapshot.overallTrend,
        snapshot.recordedAt,
      )
      .run();

    return snapshot;
  }

  async latestSnapshot(): Promise<OrganizationSnapshot | null> {
    const row = await getDatabase()
      .prepare(
        `
        SELECT *
        FROM organization_snapshots
        ORDER BY recordedAt DESC
        LIMIT 1
        `,
      )
      .first<OrganizationSnapshotRow>();

    if (!row) {
      return null;
    }

    return parseSnapshot(row.snapshot);
  }

  async snapshotHistory(limit = 30): Promise<OrganizationSnapshot[]> {
    const safeLimit = Math.max(1, Math.min(365, Math.floor(limit)));

    const rows = await getDatabase()
      .prepare(
        `
        SELECT *
        FROM organization_snapshots
        ORDER BY recordedAt DESC
        LIMIT ?
        `,
      )
      .bind(safeLimit)
      .all<OrganizationSnapshotRow>();

    return (rows.results ?? [])
      .map((row) => parseSnapshot(row.snapshot))
      .filter(
        (snapshot): snapshot is OrganizationSnapshot => snapshot !== null,
      );
  }

  async departmentHistory(
    department: DepartmentName,
    limit = 30,
  ): Promise<OrganizationDepartmentState[]> {
    const safeLimit = Math.max(1, Math.min(365, Math.floor(limit)));

    const rows = await getDatabase()
      .prepare(
        `
        SELECT *
        FROM organization_department_states
        WHERE department = ?
        ORDER BY recordedAt DESC
        LIMIT ?
        `,
      )
      .bind(department, safeLimit)
      .all<DepartmentStateRow>();

    return (rows.results ?? []).map(rowToDepartmentState);
  }
}

export const organizationMemory = new OrganizationMemory();
