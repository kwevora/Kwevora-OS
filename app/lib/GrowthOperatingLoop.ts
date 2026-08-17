import { randomUUID } from "node:crypto";
import type { AutonomousGrowthPlan } from "./AutonomousGrowthPlanner";
import { growthOperatingLoopRepository } from "./database/GrowthOperatingLoopRepository";
import { autonomousVideoQueueEngine } from "./AutonomousVideoQueueEngine";
import { autonomousPublishingHandoffEngine } from "./AutonomousPublishingHandoffEngine";
import { campaignFunnelRecoveryEngine } from "./CampaignFunnelRecoveryEngine";
import { revenueScalingGovernor } from "./RevenueScalingGovernor";
import { creativeRefreshEngine } from "./CreativeRefreshEngine";
import { videoExperimentPlanner } from "./VideoExperimentPlanner";
import { crossPlatformExpansionEngine } from "./CrossPlatformExpansionEngine";

export type GrowthPriority =
  | "safety"
  | "funnel_recovery"
  | "revenue_decline"
  | "creative_fatigue"
  | "controlled_experiment"
  | "cross_platform_expansion"
  | "revenue_scaling"
  | "new_learning";
export type GrowthOperatingLoopDecision = {
  id: string;
  growthPlanId: string;
  status: "awaiting_approval" | "authorized" | "paused";
  priority: GrowthPriority;
  priorityRank: number;
  title: string;
  decision: string;
  evidence: string[];
  suppressedActions: string[];
  whyThisWeekChanged: string;
  approvalPackage: {
    summary: string;
    weeklyPlan: boolean;
    highRiskRecovery: boolean;
    posts: number;
    revenueTarget: number;
  };
  auditTrail: Array<{ at: string; event: string; detail: string }>;
  createdAt: string;
  updatedAt: string;
};
const ORDER: GrowthPriority[] = [
  "safety",
  "funnel_recovery",
  "revenue_decline",
  "creative_fatigue",
  "controlled_experiment",
  "cross_platform_expansion",
  "revenue_scaling",
  "new_learning",
];
const LABEL: Record<GrowthPriority, string> = {
  safety: "Safety and publishing recovery",
  funnel_recovery: "Broken funnel recovery",
  revenue_decline: "Revenue decline response",
  creative_fatigue: "Creative fatigue refresh",
  controlled_experiment: "Controlled experiment",
  cross_platform_expansion: "Cross-platform expansion",
  revenue_scaling: "Revenue scaling",
  new_learning: "New learning",
};
export class GrowthOperatingLoop {
  async prepare(plan: AutonomousGrowthPlan) {
    const existing = await growthOperatingLoopRepository.forPlan(plan.id);
    if (existing) return existing;
    const now = new Date().toISOString();
    const video = await autonomousVideoQueueEngine.summary(),
      publishing = await autonomousPublishingHandoffEngine.summary();
    const stopped =
      (video.counts.stopped ?? 0) +
      (publishing.counts.stopped ?? 0) +
      (publishing.counts.blocked ?? 0);
    const recovery = await campaignFunnelRecoveryEngine.plan(plan);
    const scaling = await revenueScalingGovernor.plan(plan);
    let priority: GrowthPriority = "new_learning",
      decision =
        "Collect verified outcomes and turn the next useful uncertainty into a bounded learning plan.";
    const evidence: string[] = [];
    if (stopped > 0) {
      priority = "safety";
      decision =
        "Stop lower-priority growth changes and restore safe, verifiable production and publishing.";
      evidence.push(
        `${stopped} stopped or blocked production/publishing handoff(s).`,
      );
    } else if (
      recovery &&
      ["awaiting_approval", "active", "collecting"].includes(recovery.status)
    ) {
      priority = "funnel_recovery";
      decision = recovery.proposedFix;
      evidence.push(
        recovery.diagnosis,
        `Broken stage: ${recovery.brokenStage}; verified current result: ${recovery.current}.`,
      );
    } else if (scaling.action === "reduce") {
      priority = "revenue_decline";
      decision = scaling.reason;
      evidence.push(
        `Verified revenue per post: $${scaling.recentRevenuePerPost}; previous: $${scaling.previousRevenuePerPost ?? 0}.`,
      );
    } else {
      const candidate =
        (await creativeRefreshEngine.plan(plan)) ??
        (await videoExperimentPlanner.plan(plan)) ??
        (await crossPlatformExpansionEngine.plan(plan));
      if (candidate?.kind === "creative_refresh") {
        priority = "creative_fatigue";
        decision = candidate.hypothesis;
        evidence.push(
          "A promoted creative declined across verified reuse results.",
        );
      } else if (candidate?.kind === "direction_experiment") {
        priority = "controlled_experiment";
        decision = candidate.hypothesis;
        evidence.push(`One-variable test: ${candidate.variable}.`);
      } else if (candidate?.kind === "cross_platform_expansion") {
        priority = "cross_platform_expansion";
        decision = candidate.hypothesis;
        evidence.push(
          "A verified winner has a matched destination-platform test.",
        );
      } else if (scaling.action === "scale") {
        priority = "revenue_scaling";
        decision = scaling.reason;
        evidence.push(
          `${scaling.revenuePublications} verified revenue-producing publications and ${scaling.verifiedSales} verified sales.`,
        );
      } else
        evidence.push(
          "No higher-priority fault or evidence threshold is currently active.",
        );
    }
    const rank = ORDER.indexOf(priority) + 1;
    const history = plan.ownerApprovedAt
      ? "The current plan is already authorized; this loop preserves its highest-priority verified action."
      : `This week selects ${LABEL[priority].toLowerCase()} because it is the first active condition in the fixed safety-to-learning priority order.`;
    const loop: GrowthOperatingLoopDecision = {
      id: randomUUID(),
      growthPlanId: plan.id,
      status: plan.ownerApprovedAt ? "authorized" : "awaiting_approval",
      priority,
      priorityRank: rank,
      title: LABEL[priority],
      decision,
      evidence,
      suppressedActions: ORDER.slice(rank).map(
        (x) =>
          `${LABEL[x]} — deferred until ${LABEL[priority].toLowerCase()} is resolved or measured.`,
      ),
      whyThisWeekChanged: history,
      approvalPackage: {
        summary: `Approve one ${plan.postsPlanned}-post weekly plan led by ${LABEL[priority].toLowerCase()}.`,
        weeklyPlan: !plan.ownerApprovedAt,
        highRiskRecovery: Boolean(
          priority === "funnel_recovery" && recovery?.ownerApprovalRequired,
        ),
        posts: plan.postsPlanned,
        revenueTarget: plan.weeklyRevenueTarget,
      },
      auditTrail: [
        {
          at: now,
          event: "evidence_collected",
          detail:
            "Verified prior results and current operational state loaded.",
        },
        {
          at: now,
          event: "priority_selected",
          detail: `Priority ${rank}: ${LABEL[priority]}.`,
        },
        {
          at: now,
          event: "approval_package_prepared",
          detail:
            "Weekly plan, risk controls, and the selected action were consolidated.",
        },
      ],
      createdAt: now,
      updatedAt: now,
    };
    return await growthOperatingLoopRepository.save(loop);
  }
  async authorize(plan: AutonomousGrowthPlan) {
    const loop = await this.prepare(plan);
    return growthOperatingLoopRepository.save({
      ...loop,
      status: "authorized",
      auditTrail: [
        ...loop.auditTrail,
        {
          at: new Date().toISOString(),
          event: "owner_authorized",
          detail: "The unified weekly approval package was authorized.",
        },
      ],
    });
  }
  async setPaused(plan: AutonomousGrowthPlan, paused: boolean) {
    const loop = await this.prepare(plan);
    return growthOperatingLoopRepository.save({
      ...loop,
      status: paused ? "paused" : "authorized",
      auditTrail: [
        ...loop.auditTrail,
        {
          at: new Date().toISOString(),
          event: paused ? "owner_paused" : "owner_resumed",
          detail: paused
            ? "Execution paused; evidence and plan retained."
            : "Authorized execution resumed.",
        },
      ],
    });
  }
  async summary(plan: AutonomousGrowthPlan) {
    return this.prepare(plan);
  }
}
export const growthOperatingLoop = new GrowthOperatingLoop();
