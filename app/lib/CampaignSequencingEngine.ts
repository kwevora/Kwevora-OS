import { randomUUID } from "node:crypto";
import type { AutonomousGrowthPlan } from "./AutonomousGrowthPlanner";
import { contentPerformanceSnapshotRepository } from "./database/ContentPerformanceSnapshotRepository";
import { campaignSequenceRepository } from "./database/CampaignSequenceRepository";
import { creativePortfolioManager } from "./CreativePortfolioManager";
import { videoDirectionExperimentRepository } from "./database/VideoDirectionExperimentRepository";

export type CampaignStage =
  | "attract"
  | "educate"
  | "prove"
  | "convert"
  | "follow_up";
export type CampaignSequenceAssignment = {
  slotId: string;
  position: number;
  stage: CampaignStage;
  objective: string;
  messageDirection: string;
  protectedExperimentId: string | null;
  creativeWinnerId: string | null;
  reason: string;
};
export type CampaignSequencePlan = {
  id: string;
  growthPlanId: string;
  product: string;
  offer: string;
  assignments: CampaignSequenceAssignment[];
  stageCounts: Record<CampaignStage, number>;
  explanation: string;
  approvalSummary: string;
  createdAt: string;
  updatedAt: string;
};

const PATTERN: CampaignStage[] = [
  "attract",
  "educate",
  "prove",
  "attract",
  "convert",
  "follow_up",
  "educate",
  "prove",
  "convert",
  "follow_up",
];
const OBJECTIVES: Record<
  CampaignStage,
  { objective: string; message: string }
> = {
  attract: {
    objective: "Earn attention from the right audience without forcing a sale.",
    message:
      "Name the audience's problem or desired outcome and create recognition.",
  },
  educate: {
    objective: "Help the audience understand one useful next step.",
    message:
      "Teach one practical idea that reduces confusion and builds trust.",
  },
  prove: {
    objective:
      "Reduce doubt using only verified evidence or a transparent process explanation.",
    message:
      "Show what makes the solution credible without inventing claims, testimonials, or results.",
  },
  convert: {
    objective: "Invite an informed viewer to take the approved offer step.",
    message:
      "Connect the proven problem and value clearly to the offer and existing CTA.",
  },
  follow_up: {
    objective: "Help interested viewers overcome one remaining hesitation.",
    message:
      "Answer a likely concern and repeat the approved next step without pressure.",
  },
};

export class CampaignSequencingEngine {
  async plan(growthPlan: AutonomousGrowthPlan) {
    const existing = await campaignSequenceRepository.forGrowthPlan(
      growthPlan.id,
    );
    if (existing) return existing;
    const prior = (
      await contentPerformanceSnapshotRepository.history(5000)
    ).filter((item) => item.content.campaignStage);
    const total = (
      stage: CampaignStage,
      metric: "views" | "clicks" | "leads" | "sales",
    ) =>
      prior
        .filter((item) => item.content.campaignStage === stage)
        .reduce((sum, item) => sum + (item.metrics[metric] ?? 0), 0);
    const pattern = [...PATTERN];
    let learnedAdjustment =
      "No earlier campaign-stage evidence changed the safe default sequence.";
    if (total("attract", "views") >= 100 && total("educate", "clicks") === 0) {
      pattern[8] = "educate";
      learnedAdjustment =
        "Earlier attention did not produce verified education-stage clicks, so KAI replaced one conversion post with education.";
    } else if (
      total("educate", "clicks") > 0 &&
      total("prove", "leads") === 0
    ) {
      pattern[8] = "prove";
      learnedAdjustment =
        "Earlier education earned clicks without verified proof-stage leads, so KAI replaced one conversion post with proof.";
    } else if (total("prove", "leads") > 0 && total("convert", "sales") === 0) {
      pattern[9] = "follow_up";
      learnedAdjustment =
        "Earlier proof earned leads without verified sales, so KAI preserved follow-up support instead of adding sales pressure.";
    }
    const portfolio = await creativePortfolioManager.plan(growthPlan);
    const portfolioBySlot = new Map(
      portfolio.assignments.map((item) => [item.slotId, item]),
    );
    const experiments = await videoDirectionExperimentRepository.forPlan(
      growthPlan.id,
    );
    const experimentBySlot = new Map(
      experiments.flatMap((experiment) =>
        [...experiment.control.slotIds, ...experiment.challenger.slotIds].map(
          (slotId) => [slotId, experiment] as const,
        ),
      ),
    );
    const pairedStages = new Map<string, CampaignStage>();
    for (const experiment of experiments) {
      const stages: CampaignStage[] = ["attract", "educate", "prove"];
      experiment.control.slotIds.forEach((slotId, index) =>
        pairedStages.set(slotId, stages[index % stages.length]),
      );
      experiment.challenger.slotIds.forEach((slotId, index) =>
        pairedStages.set(slotId, stages[index % stages.length]),
      );
    }
    const assignments = growthPlan.slots.map(
      (slot, index): CampaignSequenceAssignment => {
        const stage =
          pairedStages.get(slot.id) ?? pattern[index % pattern.length];
        const direction = OBJECTIVES[stage];
        const experiment = experimentBySlot.get(slot.id);
        const portfolioAssignment = portfolioBySlot.get(slot.id);
        return {
          slotId: slot.id,
          position: slot.position,
          stage,
          objective: direction.objective,
          messageDirection: direction.message,
          protectedExperimentId: experiment?.id ?? null,
          creativeWinnerId: portfolioAssignment?.winnerId ?? null,
          reason: experiment
            ? `This ${stage} assignment is mirrored across the experiment arms so campaign intent cannot corrupt the tested variable.`
            : `Placed at ${stage.replaceAll("_", " ")} to move the audience forward without repeating the previous campaign job.`,
        };
      },
    );
    const stageCounts = {
      attract: 0,
      educate: 0,
      prove: 0,
      convert: 0,
      follow_up: 0,
    };
    assignments.forEach((item) => {
      stageCounts[item.stage] += 1;
    });
    const now = new Date().toISOString();
    return campaignSequenceRepository.save({
      id: randomUUID(),
      growthPlanId: growthPlan.id,
      product: growthPlan.slots[0]?.product ?? "Current priority product",
      offer: growthPlan.slots[0]?.offer ?? "Current priority offer",
      assignments,
      stageCounts,
      explanation: `KAI sequenced ${assignments.length} posts across ${stageCounts.attract} attract, ${stageCounts.educate} educate, ${stageCounts.prove} prove, ${stageCounts.convert} convert, and ${stageCounts.follow_up} follow-up jobs. ${learnedAdjustment}`,
      approvalSummary:
        "The sequence preserves approved hooks, offers, CTAs, creative winners, and every active controlled test. No stage invents proof or changes a tested video variable.",
      createdAt: now,
      updatedAt: now,
    });
  }

  async directiveForSlot(growthPlan: AutonomousGrowthPlan, slotId: string) {
    const plan = await this.plan(growthPlan);
    const assignment = plan.assignments.find((item) => item.slotId === slotId);
    return assignment
      ? {
          campaignId: plan.id,
          stage: assignment.stage,
          objective: assignment.objective,
          messageDirection: assignment.messageDirection,
          protectedExperimentId: assignment.protectedExperimentId,
        }
      : null;
  }

  async summary(growthPlan: AutonomousGrowthPlan) {
    const campaign = await this.plan(growthPlan);
    const results: Record<
      CampaignStage,
      {
        publications: number;
        views: number;
        clicks: number;
        leads: number;
        sales: number;
        revenue: number;
      }
    > = {
      attract: {
        publications: 0,
        views: 0,
        clicks: 0,
        leads: 0,
        sales: 0,
        revenue: 0,
      },
      educate: {
        publications: 0,
        views: 0,
        clicks: 0,
        leads: 0,
        sales: 0,
        revenue: 0,
      },
      prove: {
        publications: 0,
        views: 0,
        clicks: 0,
        leads: 0,
        sales: 0,
        revenue: 0,
      },
      convert: {
        publications: 0,
        views: 0,
        clicks: 0,
        leads: 0,
        sales: 0,
        revenue: 0,
      },
      follow_up: {
        publications: 0,
        views: 0,
        clicks: 0,
        leads: 0,
        sales: 0,
        revenue: 0,
      },
    };
    const latest = new Map<
      string,
      Awaited<
        ReturnType<typeof contentPerformanceSnapshotRepository.history>
      >[number]
    >();
    (await contentPerformanceSnapshotRepository.history(5000)).forEach(
      (snapshot) => {
        if (!latest.has(snapshot.executionPlanId))
          latest.set(snapshot.executionPlanId, snapshot);
      },
    );
    latest.forEach((snapshot) => {
      const stage =
        snapshot.content.campaignId === campaign.id
          ? snapshot.content.campaignStage
          : null;
      if (!stage) return;
      const result = results[stage];
      result.publications += 1;
      result.views += snapshot.metrics.views ?? 0;
      result.clicks += snapshot.metrics.clicks ?? 0;
      result.leads += snapshot.metrics.leads ?? 0;
      result.sales += snapshot.metrics.sales ?? 0;
      result.revenue += snapshot.metrics.revenue ?? 0;
    });
    const dropoff =
      results.attract.views > 0 && results.educate.clicks === 0
        ? "Attention is not moving into verified clicks; strengthen education before adding conversion pressure."
        : results.educate.clicks > 0 && results.prove.leads === 0
          ? "Interest is not becoming verified leads; strengthen proof and trust."
          : results.prove.leads > 0 && results.convert.sales === 0
            ? "Qualified interest is not becoming verified sales; inspect the offer and conversion step."
            : "No verified campaign-stage drop-off is strong enough to change the next sequence yet.";
    return {
      ...campaign,
      results,
      dropoff,
      evidenceRule:
        "Campaign-stage adjustments use verified views, clicks, leads, sales, and revenue. Missing metrics remain zero only in totals and never become invented events.",
    };
  }
}
export const campaignSequencingEngine = new CampaignSequencingEngine();
