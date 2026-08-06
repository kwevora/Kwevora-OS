import {
  departmentRegistry,
  type DepartmentReviewResult,
} from "../DepartmentRegistry";

import {
  executiveBrain,
  type ExecutiveReview,
} from "../ExecutiveBrain";

import {
  organizationMemory,
  type OrganizationSnapshot,
} from "../OrganizationMemory";

import type {
  DecisionResponse,
} from "../DecisionCore";

import type {
  ActiveWork,
} from "../MemoryBrain";

export type OvernightExecutiveResult = {
  departmentReview: DepartmentReviewResult;
  organizationSnapshot: OrganizationSnapshot;
  executiveReview: ExecutiveReview;
};

export type OvernightExecutiveInput = {
  decisionResult: DecisionResponse;
  activeWork: ActiveWork | null;
};

export class OvernightExecutive {
  async review(
    input: OvernightExecutiveInput,
  ): Promise<OvernightExecutiveResult> {
    const departmentReview =
      await departmentRegistry.reviewAll();

    const organizationSnapshot =
      organizationMemory.recordOrganization(
        departmentReview.reports,
      );

    const executiveReview =
      executiveBrain.review({
        decision:
          input.decisionResult,

        activeWork:
          input.activeWork,

        departments:
          departmentReview.reports,
      });

    return {
      departmentReview,
      organizationSnapshot,
      executiveReview,
    };
  }
}

export const overnightExecutive =
  new OvernightExecutive();