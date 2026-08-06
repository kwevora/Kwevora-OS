import type {
  Department,
  DepartmentName,
  DepartmentReport,
} from "./Department";

import {
  marketingDepartment,
} from "./MarketingDepartment";

export type DepartmentRegistryEntry = {
  name: DepartmentName;
  department: Department;
  enabled: boolean;
  registeredAt: string;
};

export type DepartmentReviewResult = {
  reports: DepartmentReport[];
  failures: {
    department: DepartmentName;
    message: string;
  }[];
  reviewedAt: string;
};

export class DepartmentRegistry {
  private readonly departments =
    new Map<
      DepartmentName,
      DepartmentRegistryEntry
    >();

  constructor() {
    this.registerDefaults();
  }

  private registerDefaults() {
    this.register(
      marketingDepartment,
    );
  }

  register(
    department: Department,
  ): DepartmentRegistryEntry {
    const existing =
      this.departments.get(
        department.name,
      );

    if (existing) {
      return existing;
    }

    const entry: DepartmentRegistryEntry = {
      name:
        department.name,

      department,

      enabled:
        true,

      registeredAt:
        new Date().toISOString(),
    };

    this.departments.set(
      department.name,
      entry,
    );

    return entry;
  }

  unregister(
    name: DepartmentName,
  ): boolean {
    return this.departments.delete(
      name,
    );
  }

  enable(
    name: DepartmentName,
  ): boolean {
    const entry =
      this.departments.get(
        name,
      );

    if (!entry) {
      return false;
    }

    entry.enabled =
      true;

    return true;
  }

  disable(
    name: DepartmentName,
  ): boolean {
    const entry =
      this.departments.get(
        name,
      );

    if (!entry) {
      return false;
    }

    entry.enabled =
      false;

    return true;
  }

  has(
    name: DepartmentName,
  ): boolean {
    return this.departments.has(
      name,
    );
  }

  get(
    name: DepartmentName,
  ): DepartmentRegistryEntry | null {
    return (
      this.departments.get(
        name,
      ) ?? null
    );
  }

  all():
    DepartmentRegistryEntry[] {
    return Array.from(
      this.departments.values(),
    );
  }

  enabled():
    DepartmentRegistryEntry[] {
    return this.all().filter(
      (entry) =>
        entry.enabled,
    );
  }

  names():
    DepartmentName[] {
      return this.enabled().map(
        (entry) =>
          entry.name,
      );
  }

  async reviewAll():
    Promise<DepartmentReviewResult> {
    const reports:
      DepartmentReport[] = [];

    const failures:
      DepartmentReviewResult["failures"] =
        [];

    for (
      const entry of
      this.enabled()
    ) {
      try {
        const report =
          await entry.department.review();

        reports.push(
          report,
        );
      } catch (error) {
        failures.push({
          department:
            entry.name,

          message:
            error instanceof Error
              ? error.message
              : "Department review failed.",
        });
      }
    }

    reports.sort(
      (
        first,
        second,
      ) => {
        if (
          first.status ===
            "blocked" &&
          second.status !==
            "blocked"
        ) {
          return -1;
        }

        if (
          second.status ===
            "blocked" &&
          first.status !==
            "blocked"
        ) {
          return 1;
        }

        if (
          first.requiresOwnerAttention !==
          second.requiresOwnerAttention
        ) {
          return first
            .requiresOwnerAttention
            ? -1
            : 1;
        }

        return (
          first.healthScore -
          second.healthScore
        );
      },
    );

    return {
      reports,
      failures,
      reviewedAt:
        new Date().toISOString(),
    };
  }
}

export const departmentRegistry =
  new DepartmentRegistry();