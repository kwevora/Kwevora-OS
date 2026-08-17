import { randomUUID } from "node:crypto";
import type {
  AutonomousGrowthPlan,
  GrowthPlanSlot,
  GrowthPlanSlotStatus,
} from "./AutonomousGrowthPlanner";
import { autonomousGrowthPlanRepository } from "./database/AutonomousGrowthPlanRepository";
import { revenueAttributionBrain } from "./RevenueAttributionBrain";

export type GrowthPlanProgress = {
  plan: AutonomousGrowthPlan;
  nextSlot: GrowthPlanSlot | null;
  counts: Record<GrowthPlanSlotStatus, number>;
  earnedRevenue: number;
  remainingRevenueTarget: number;
  expectedRevenueByNow: number;
  onPace: boolean;
  summary: string;
};

const STATUSES: GrowthPlanSlotStatus[] = [
  "planned",
  "awaiting_review",
  "approved",
  "publishing_blocked",
  "scheduled",
  "published",
  "measured",
  "rejected",
];

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function normalized(slot: GrowthPlanSlot): GrowthPlanSlot {
  return {
    ...slot,
    status: slot.status ?? "planned",
    executionPlanId: slot.executionPlanId ?? null,
    reviewItemId: slot.reviewItemId ?? null,
    replacementFor: slot.replacementFor ?? null,
    publishedAt: slot.publishedAt ?? null,
    revenueActual: slot.revenueActual ?? 0,
    updatedAt: slot.updatedAt ?? new Date().toISOString(),
  };
}

function planStatus(slots: GrowthPlanSlot[]): AutonomousGrowthPlan["status"] {
  const active = slots.filter((slot) => slot.status !== "rejected");
  if (active.length > 0 && active.every((slot) => slot.status === "measured"))
    return "completed";
  if (active.some((slot) => slot.status === "publishing_blocked"))
    return "needs_attention";
  if (active.some((slot) => slot.status !== "planned")) return "active";
  return "ready_for_approval";
}

export class GrowthPlanExecutionEngine {
  next(plan: AutonomousGrowthPlan): GrowthPlanSlot | null {
    return (
      plan.slots.map(normalized).find((slot) => slot.status === "planned") ??
      null
    );
  }

  async claim(
    planId: string,
    slotId: string,
    executionPlanId: string,
    reviewItemId: string,
  ) {
    return this.update(planId, slotId, (slot) => ({
      ...slot,
      status: "awaiting_review",
      executionPlanId,
      reviewItemId,
      updatedAt: new Date().toISOString(),
    }));
  }

  async transition(executionPlanId: string, status: GrowthPlanSlotStatus) {
    const plan =
      (await autonomousGrowthPlanRepository.history()).find((candidate) =>
        candidate.slots.some(
          (slot) => normalized(slot).executionPlanId === executionPlanId,
        ),
      ) ?? null;
    if (!plan) return null;
    const target = plan.slots
      .map(normalized)
      .find((slot) => slot.executionPlanId === executionPlanId);
    if (!target) return null;
    const updated = await this.update(plan.id, target.id, (slot) => ({
      ...slot,
      status,
      publishedAt:
        status === "published" ? new Date().toISOString() : slot.publishedAt,
      updatedAt: new Date().toISOString(),
    }));
    if ((status === "publishing_blocked" || status === "rejected") && updated) {
      return await this.ensureReplacement(updated, target.id);
    }
    return updated;
  }

  async progress(plan: AutonomousGrowthPlan, now = new Date()) {
    const slots = await Promise.all(
      plan.slots.map(async (slot) => {
        const current = normalized(slot);
        if (!current.executionPlanId) return current;
        const attribution = await revenueAttributionBrain.forCycle(
          current.executionPlanId,
        );
        return attribution
          ? { ...current, revenueActual: attribution.revenue }
          : current;
      }),
    );
    const earnedRevenue = round(
      slots.reduce((total, slot) => total + slot.revenueActual, 0),
    );
    const remainingRevenueTarget = Math.max(
      0,
      round(plan.weeklyRevenueTarget - earnedRevenue),
    );
    const replacedIds = new Set(
      slots
        .map((slot) => slot.replacementFor)
        .filter((id): id is string => Boolean(id)),
    );
    const expectedRevenueByNow = round(
      slots
        .filter(
          (slot) =>
            new Date(slot.scheduledFor).getTime() <= now.getTime() &&
            slot.status !== "rejected" &&
            !replacedIds.has(slot.id),
        )
        .reduce((total, slot) => total + slot.revenueTarget, 0),
    );
    const onPace =
      expectedRevenueByNow === 0 || earnedRevenue >= expectedRevenueByNow;
    const counts = Object.fromEntries(
      STATUSES.map((status) => [
        status,
        slots.filter((slot) => slot.status === status).length,
      ]),
    ) as Record<GrowthPlanSlotStatus, number>;
    const updatedPlan = { ...plan, slots, status: planStatus(slots) };
    const nextSlot = this.next(updatedPlan);
    const summary = `${counts.measured} measured, ${counts.published} published, ${counts.awaiting_review} awaiting review, and ${counts.planned} still planned. KAI has earned $${earnedRevenue.toFixed(2)} with $${remainingRevenueTarget.toFixed(2)} remaining. The week is ${onPace ? "on pace" : "behind pace"}.`;
    return {
      plan: updatedPlan,
      nextSlot,
      counts,
      earnedRevenue,
      remainingRevenueTarget,
      expectedRevenueByNow,
      onPace,
      summary,
    };
  }

  private async update(
    planId: string,
    slotId: string,
    change: (slot: GrowthPlanSlot) => GrowthPlanSlot,
  ) {
    const stored = await autonomousGrowthPlanRepository.byId(planId);
    if (!stored) return null;
    const slots = stored.slots
      .map(normalized)
      .map((slot) => (slot.id === slotId ? change(slot) : slot));
    return autonomousGrowthPlanRepository.save({
      ...stored,
      slots,
      status: planStatus(slots),
    });
  }

  private async ensureReplacement(
    plan: AutonomousGrowthPlan,
    failedSlotId: string,
  ) {
    if (plan.slots.some((slot) => slot.replacementFor === failedSlotId))
      return plan;
    const failed = plan.slots
      .map(normalized)
      .find((slot) => slot.id === failedSlotId);
    if (!failed) return plan;
    const replacement: GrowthPlanSlot = {
      ...failed,
      id: randomUUID(),
      position: Math.max(...plan.slots.map((slot) => slot.position), 0) + 1,
      status: "planned",
      executionPlanId: null,
      reviewItemId: null,
      replacementFor: failed.id,
      publishedAt: null,
      revenueActual: 0,
      updatedAt: new Date().toISOString(),
      expectedOutcome: `Replacement slot: ${failed.expectedOutcome}`,
    };
    const slots = [...plan.slots, replacement];
    return autonomousGrowthPlanRepository.save({
      ...plan,
      slots,
      status: planStatus(slots),
    });
  }
}

export const growthPlanExecutionEngine = new GrowthPlanExecutionEngine();
