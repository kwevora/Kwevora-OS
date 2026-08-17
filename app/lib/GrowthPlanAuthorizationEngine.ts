import { randomUUID } from "node:crypto";
import type {
  AutonomousGrowthPlan,
  GrowthPlanSlot,
} from "./AutonomousGrowthPlanner";
import { autonomousGrowthPlanRepository } from "./database/AutonomousGrowthPlanRepository";

export type AuthorizedAction =
  | "prepare_content"
  | "produce_video"
  | "schedule"
  | "publish";

export type AuthorizationDecision = {
  allowed: boolean;
  action: AuthorizedAction;
  reason: string;
  ownerApprovalRequired: boolean;
  planId: string | null;
  slotId: string | null;
};

function status(plan: AutonomousGrowthPlan) {
  return (
    plan.autonomyStatus ??
    (plan.ownerApprovedAt ? "authorized" : "awaiting_approval")
  );
}

function highRisk(slot: GrowthPlanSlot): boolean {
  return (
    slot.bucket === "challenger" &&
    ["offer", "platform", "format"].includes(slot.changedVariable ?? "")
  );
}

function log(
  plan: AutonomousGrowthPlan,
  actor: "owner" | "kai",
  action: string,
  detail: string,
): AutonomousGrowthPlan {
  return {
    ...plan,
    authorizationLog: [
      ...(plan.authorizationLog ?? []),
      { id: randomUUID(), at: new Date().toISOString(), actor, action, detail },
    ],
  };
}

export class GrowthPlanAuthorizationEngine {
  async decision(executionPlanId: string, action: AuthorizedAction) {
    const plan = (await autonomousGrowthPlanRepository.history()).find(
      (candidate) =>
        candidate.slots.some(
          (slot) => slot.executionPlanId === executionPlanId,
        ),
    );
    const slot =
      plan?.slots.find(
        (candidate) => candidate.executionPlanId === executionPlanId,
      ) ?? null;
    if (!plan || !slot) {
      return {
        allowed: true,
        action,
        reason:
          "This owner-directed item is outside the autonomous weekly plan.",
        ownerApprovalRequired: false,
        planId: null,
        slotId: null,
      };
    }
    if (action === "prepare_content") {
      return {
        allowed: true,
        action,
        reason: "KAI may prepare content before weekly approval.",
        ownerApprovalRequired: false,
        planId: plan.id,
        slotId: slot.id,
      };
    }
    if (status(plan) === "paused") {
      return {
        allowed: false,
        action,
        reason: "The owner paused this weekly plan.",
        ownerApprovalRequired: true,
        planId: plan.id,
        slotId: slot.id,
      };
    }
    if (status(plan) !== "authorized" || !plan.ownerApprovedAt) {
      return {
        allowed: false,
        action,
        reason:
          "Approve the weekly plan before KAI produces videos, schedules, or publishes its assignments.",
        ownerApprovalRequired: true,
        planId: plan.id,
        slotId: slot.id,
      };
    }
    if (
      highRisk(slot) &&
      !(plan.approvedHighRiskSlotIds ?? []).includes(slot.id)
    ) {
      return {
        allowed: false,
        action,
        reason: `This challenger changes ${slot.changedVariable}; approve this high-risk slot individually.`,
        ownerApprovalRequired: true,
        planId: plan.id,
        slotId: slot.id,
      };
    }
    return {
      allowed: true,
      action,
      reason:
        "The owner-authorized weekly boundary permits this routine action.",
      ownerApprovalRequired: false,
      planId: plan.id,
      slotId: slot.id,
    };
  }

  async approvePlan(plan: AutonomousGrowthPlan) {
    const at = new Date().toISOString();
    return autonomousGrowthPlanRepository.save(
      log(
        { ...plan, ownerApprovedAt: at, autonomyStatus: "authorized" },
        "owner",
        "approve_week",
        "Owner authorized routine content, video production, scheduling, and publishing for this weekly plan.",
      ),
    );
  }

  async pause(plan: AutonomousGrowthPlan) {
    return autonomousGrowthPlanRepository.save(
      log(
        { ...plan, autonomyStatus: "paused" },
        "owner",
        "pause_week",
        "Owner paused video production, scheduling, and publishing for the week.",
      ),
    );
  }

  async resume(plan: AutonomousGrowthPlan) {
    const nextStatus = plan.ownerApprovedAt
      ? "authorized"
      : "awaiting_approval";
    return autonomousGrowthPlanRepository.save(
      log(
        { ...plan, autonomyStatus: nextStatus },
        "owner",
        "resume_week",
        "Owner resumed the weekly workflow within its existing approval boundary.",
      ),
    );
  }

  async approveHighRiskSlot(plan: AutonomousGrowthPlan, slotId: string) {
    const slot = plan.slots.find((candidate) => candidate.id === slotId);
    if (!slot || !highRisk(slot)) return null;
    return autonomousGrowthPlanRepository.save(
      log(
        {
          ...plan,
          approvedHighRiskSlotIds: Array.from(
            new Set([...(plan.approvedHighRiskSlotIds ?? []), slotId]),
          ),
        },
        "owner",
        "approve_high_risk_slot",
        `Owner individually approved slot ${slot.position}, which changes ${slot.changedVariable}.`,
      ),
    );
  }

  async reviseOnce(plan: AutonomousGrowthPlan, reason: string) {
    if ((plan.revisionCount ?? 0) >= 1) return null;
    const candidate = plan.slots.find(
      (slot) => slot.status === "planned" && slot.bucket !== "winner",
    );
    const slots = candidate
      ? plan.slots.map((slot) =>
          slot.id === candidate.id
            ? {
                ...slot,
                hook: `${slot.hook} — evidence-led revision`,
                changedVariable: "hook",
                expectedOutcome: `Owner-requested revision using one controlled hook change. Reason: ${reason}`,
                updatedAt: new Date().toISOString(),
              }
            : slot,
        )
      : plan.slots;
    return autonomousGrowthPlanRepository.save(
      log(
        {
          ...plan,
          slots,
          ownerApprovedAt: null,
          autonomyStatus: "revision_requested",
          revisionCount: 1,
          approvalBrief: `${plan.approvalBrief} KAI completed the one permitted evidence-based revision and returned the plan for approval.`,
        },
        "owner",
        "request_revision",
        reason,
      ),
    );
  }

  async propagateOwnerEdits(
    executionPlanId: string,
    edits: Array<{ field: string; after: unknown }>,
  ) {
    const plan = (await autonomousGrowthPlanRepository.history()).find(
      (candidate) =>
        candidate.slots.some(
          (slot) => slot.executionPlanId === executionPlanId,
        ),
    );
    const source = plan?.slots.find(
      (slot) => slot.executionPlanId === executionPlanId,
    );
    if (!plan || !source || edits.length === 0) return plan ?? null;
    const supported = edits.filter((edit) =>
      ["hook", "callToAction", "format", "recommendedPlatforms"].includes(
        edit.field,
      ),
    );
    if (supported.length === 0) return plan;
    const slots = plan.slots.map((slot) => {
      if (slot.status !== "planned" || slot.product !== source.product)
        return slot;
      const updated = { ...slot };
      for (const edit of supported) {
        if (edit.field === "hook" && typeof edit.after === "string")
          updated.hook = edit.after;
        if (edit.field === "callToAction" && typeof edit.after === "string")
          updated.callToAction = edit.after;
        if (edit.field === "format" && typeof edit.after === "string")
          updated.format = edit.after;
        if (
          edit.field === "recommendedPlatforms" &&
          Array.isArray(edit.after) &&
          typeof edit.after[0] === "string"
        )
          updated.platform = edit.after[0];
      }
      return { ...updated, updatedAt: new Date().toISOString() };
    });
    return autonomousGrowthPlanRepository.save(
      log(
        { ...plan, slots },
        "kai",
        "propagate_owner_edits",
        `Applied ${supported.map((edit) => edit.field).join(", ")} to remaining uncreated ${source.product} slots.`,
      ),
    );
  }
}

export const growthPlanAuthorizationEngine =
  new GrowthPlanAuthorizationEngine();
