import { randomUUID } from "node:crypto";
import type {
  AutonomousGrowthPlan,
  GrowthPlanSlot,
} from "./AutonomousGrowthPlanner";
import type { GrowthPlanProgress } from "./GrowthPlanExecutionEngine";
import type { RevenueOptimizationDecision } from "./RevenueOptimizationEngine";
import { revenueAttributionBrain } from "./RevenueAttributionBrain";

export type RecoveryDiagnosis =
  | "on_pace"
  | "blocked_access"
  | "missed_publishing"
  | "low_traffic"
  | "weak_clicks"
  | "weak_conversion"
  | "revenue_gap";

export type WeeklyRecoveryResult = {
  plan: AutonomousGrowthPlan;
  diagnosis: RecoveryDiagnosis;
  actions: NonNullable<AutonomousGrowthPlan["recoveryHistory"]>;
  ownerApprovals: string[];
  changed: boolean;
  briefing: string;
};

const MAX_AUTOMATIC_ACTIONS_PER_DAY = 2;

function day(value: string): string {
  return value.slice(0, 10);
}

function active(slot: GrowthPlanSlot): boolean {
  return slot.status !== "rejected" && slot.status !== "measured";
}

async function diagnosis(
  plan: AutonomousGrowthPlan,
  progress: GrowthPlanProgress,
  now: Date,
): Promise<RecoveryDiagnosis> {
  if (plan.slots.some((slot) => slot.status === "publishing_blocked"))
    return "blocked_access";
  if (
    plan.slots.some(
      (slot) =>
        active(slot) && new Date(slot.scheduledFor).getTime() < now.getTime(),
    )
  )
    return "missed_publishing";
  if (progress.onPace) return "on_pace";
  for (const slot of plan.slots) {
    if (
      !slot.executionPlanId ||
      (slot.status !== "published" && slot.status !== "measured")
    )
      continue;
    const result = await revenueAttributionBrain.forCycle(slot.executionPlanId);
    if (!result || result.views < 100) return "low_traffic";
    if (result.clicks === 0) return "weak_clicks";
    if (result.clicks >= 10 && result.sales === 0) return "weak_conversion";
  }
  return "revenue_gap";
}

function nextSafeTime(plan: AutonomousGrowthPlan, now: Date): string | null {
  const end = new Date(plan.weekEnd);
  const candidate = new Date(now.getTime() + 6 * 60 * 60 * 1000);
  candidate.setUTCMinutes(0, 0, 0);
  const occupied = new Set(
    plan.slots.filter(active).map((slot) => slot.scheduledFor),
  );
  while (candidate <= end) {
    const value = candidate.toISOString();
    if (!occupied.has(value)) return value;
    candidate.setUTCHours(candidate.getUTCHours() + 4);
  }
  return null;
}

function action(
  at: string,
  diagnosisValue: RecoveryDiagnosis,
  description: string,
  slotId: string | null,
  ownerApprovalRequired = false,
) {
  return {
    id: randomUUID(),
    at,
    diagnosis: diagnosisValue,
    action: description,
    slotId,
    ownerApprovalRequired,
  };
}

export class WeeklyRecoveryBrain {
  async recover(input: {
    plan: AutonomousGrowthPlan;
    progress: GrowthPlanProgress;
    optimization: RevenueOptimizationDecision;
    now?: Date;
  }): Promise<WeeklyRecoveryResult> {
    const now = input.now ?? new Date();
    const at = now.toISOString();
    const diagnosisValue = await diagnosis(input.plan, input.progress, now);
    const history = input.plan.recoveryHistory ?? [];
    const todayActions = history.filter(
      (item) => day(item.at) === day(at) && !item.ownerApprovalRequired,
    ).length;
    const allowance = Math.max(0, MAX_AUTOMATIC_ACTIONS_PER_DAY - todayActions);
    const actions: NonNullable<AutonomousGrowthPlan["recoveryHistory"]> = [];
    const ownerApprovals: string[] = [];
    let slots = [...input.plan.slots];

    if (diagnosisValue === "blocked_access") {
      const blocked = slots.find(
        (slot) => slot.status === "publishing_blocked",
      );
      ownerApprovals.push(
        `Reconnect or authorize ${blocked?.platform ?? "the blocked platform"} so KAI can publish the prepared post.`,
      );
      actions.push(
        action(
          at,
          diagnosisValue,
          "Preserved the blocked work and its automatic replacement; requested only the missing owner authorization.",
          blocked?.id ?? null,
          true,
        ),
      );
    } else if (diagnosisValue === "missed_publishing" && allowance > 0) {
      const missed = slots.find(
        (slot) =>
          active(slot) && new Date(slot.scheduledFor).getTime() < now.getTime(),
      );
      const replacementTime = nextSafeTime(input.plan, now);
      if (missed && replacementTime) {
        slots = slots.map((slot) =>
          slot.id === missed.id
            ? { ...slot, scheduledFor: replacementTime, updatedAt: at }
            : slot,
        );
        actions.push(
          action(
            at,
            diagnosisValue,
            `Rescheduled the missed post to ${replacementTime} without adding another post.`,
            missed.id,
          ),
        );
      } else {
        ownerApprovals.push(
          "Choose whether to carry the missed post into next week; no safe slot remains this week.",
        );
        actions.push(
          action(
            at,
            diagnosisValue,
            "Protected the schedule from panic-posting because no safe opening remains.",
            missed?.id ?? null,
            true,
          ),
        );
      }
    } else if (
      (diagnosisValue === "low_traffic" ||
        diagnosisValue === "weak_clicks" ||
        diagnosisValue === "weak_conversion") &&
      allowance > 0
    ) {
      const candidate = slots.find(
        (slot) => slot.status === "planned" && slot.bucket !== "winner",
      );
      if (candidate) {
        const field =
          diagnosisValue === "weak_conversion" ? "callToAction" : "hook";
        slots = slots.map((slot) =>
          slot.id !== candidate.id
            ? slot
            : {
                ...slot,
                [field]: `${slot[field]} — recovery variant`,
                changedVariable:
                  field === "callToAction" ? "call_to_action" : "hook",
                expectedOutcome: `Recovery test for ${diagnosisValue.replaceAll("_", " ")}; every other strategy variable remains controlled.`,
                updatedAt: at,
              },
        );
        actions.push(
          action(
            at,
            diagnosisValue,
            `Changed only the ${field === "callToAction" ? "CTA" : "hook"} on one unstarted test slot.`,
            candidate.id,
          ),
        );
      }
    } else if (
      diagnosisValue === "revenue_gap" &&
      allowance > 0 &&
      input.optimization.winner?.sufficientEvidence
    ) {
      const learning = slots.find(
        (slot) => slot.status === "planned" && slot.bucket === "learning",
      );
      const control = slots.find((slot) => slot.bucket === "winner");
      if (learning && control) {
        slots = slots.map((slot) =>
          slot.id !== learning.id
            ? slot
            : {
                ...slot,
                bucket: "winner",
                product: control.product,
                platform: control.platform,
                format: control.format,
                hook: control.hook,
                callToAction: control.callToAction,
                offer: control.offer,
                changedVariable: null,
                revenueTarget: control.revenueTarget,
                expectedOutcome:
                  "Recovery allocation added to a strategy that already passed the minimum evidence threshold.",
                updatedAt: at,
              },
        );
        actions.push(
          action(
            at,
            diagnosisValue,
            "Shifted one learning slot to the already proven winner; no unproven strategy was scaled.",
            learning.id,
          ),
        );
      }
    }

    const changed = actions.some((item) => !item.ownerApprovalRequired);
    const replacedIds = new Set(
      slots
        .map((slot) => slot.replacementFor)
        .filter((id): id is string => Boolean(id)),
    );
    const weeklyRevenueTarget =
      Math.round(
        slots
          .filter(
            (slot) => slot.status !== "rejected" && !replacedIds.has(slot.id),
          )
          .reduce((total, slot) => total + slot.revenueTarget, 0) * 100,
      ) / 100;
    const plan = {
      ...input.plan,
      slots,
      weeklyRevenueTarget,
      recoveryHistory: [...history, ...actions],
    };
    const briefing =
      diagnosisValue === "on_pace"
        ? `The week is on pace. KAI made no recovery changes and preserved the approved strategy.`
        : `KAI diagnosed ${diagnosisValue.replaceAll("_", " ")}. ${actions.map((item) => item.action).join(" ") || "No automatic change was safe."} ${ownerApprovals.length ? `Owner decision needed: ${ownerApprovals.join(" ")}` : "No owner decision is needed."}`;
    return {
      plan,
      diagnosis: diagnosisValue,
      actions,
      ownerApprovals,
      changed,
      briefing,
    };
  }
}

export const weeklyRecoveryBrain = new WeeklyRecoveryBrain();
