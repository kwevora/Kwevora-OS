import { randomUUID } from "node:crypto";
import type { AutonomousGrowthPlan } from "./AutonomousGrowthPlanner";
import {
  campaignSequencingEngine,
  type CampaignStage,
} from "./CampaignSequencingEngine";
import { campaignFunnelRecoveryRepository } from "./database/CampaignFunnelRecoveryRepository";

export type CampaignFunnelRecovery = {
  id: string;
  growthPlanId: string;
  status:
    | "awaiting_approval"
    | "active"
    | "collecting"
    | "recovered"
    | "stopped";
  brokenStage: CampaignStage;
  variable:
    | "education_depth"
    | "proof_evidence"
    | "cta_presentation"
    | "offer_destination";
  diagnosis: string;
  proposedFix: string;
  protectedVariables: string[];
  ownerApprovalRequired: boolean;
  minimumEvidence: number;
  successRule: string;
  stopRule: string;
  baseline: number;
  current: number;
  createdAt: string;
  updatedAt: string;
};
export class CampaignFunnelRecoveryEngine {
  async plan(growthPlan: AutonomousGrowthPlan) {
    const existing = await campaignFunnelRecoveryRepository.forPlan(
      growthPlan.id,
    );
    if (existing) return this.evaluate(growthPlan, existing);
    const campaign = await campaignSequencingEngine.summary(growthPlan);
    const r = campaign.results;
    let input: Omit<
      CampaignFunnelRecovery,
      "id" | "growthPlanId" | "status" | "createdAt" | "updatedAt"
    > | null = null;
    if (r.attract.views >= 100 && r.educate.clicks === 0)
      input = {
        brokenStage: "educate",
        variable: "education_depth",
        diagnosis: "Verified attention is not becoming clicks.",
        proposedFix:
          "Replace one conversion slot with deeper practical education.",
        protectedVariables: [
          "product",
          "audience",
          "offer",
          "CTA",
          "creative winner",
          "video tests",
        ],
        ownerApprovalRequired: false,
        minimumEvidence: 3,
        successRule:
          "Recover after three measured education posts produce verified clicks.",
        stopRule:
          "Stop if three measured posts still produce no verified clicks.",
        baseline: r.attract.views,
        current: r.educate.clicks,
      };
    else if (r.educate.clicks > 0 && r.prove.leads === 0)
      input = {
        brokenStage: "prove",
        variable: "proof_evidence",
        diagnosis: "Verified clicks are not becoming leads.",
        proposedFix:
          "Strengthen transparent, verifiable proof without inventing claims.",
        protectedVariables: [
          "product",
          "audience",
          "offer",
          "CTA",
          "creative winner",
          "video tests",
        ],
        ownerApprovalRequired: false,
        minimumEvidence: 3,
        successRule:
          "Recover after three measured proof posts produce verified leads.",
        stopRule:
          "Stop if three measured posts still produce no verified leads.",
        baseline: r.educate.clicks,
        current: r.prove.leads,
      };
    else if (r.prove.leads > 0 && r.convert.sales === 0)
      input = {
        brokenStage: "convert",
        variable: "cta_presentation",
        diagnosis: "Verified leads are not becoming sales.",
        proposedFix:
          "Test one clearer CTA presentation while preserving the offer and destination.",
        protectedVariables: [
          "product",
          "audience",
          "offer",
          "destination",
          "creative winner",
          "video tests",
        ],
        ownerApprovalRequired: true,
        minimumEvidence: 3,
        successRule:
          "Recover after three measured conversion posts produce a verified sale.",
        stopRule: "Stop if three measured posts produce no verified sale.",
        baseline: r.prove.leads,
        current: r.convert.sales,
      };
    if (!input) return null;
    const now = new Date().toISOString();
    return await campaignFunnelRecoveryRepository.save({
      id: randomUUID(),
      growthPlanId: growthPlan.id,
      status: "awaiting_approval",
      ...input,
      createdAt: now,
      updatedAt: now,
    });
  }
  async approve(growthPlan: AutonomousGrowthPlan) {
    const recovery = await this.plan(growthPlan);
    return recovery
      ? campaignFunnelRecoveryRepository.save({ ...recovery, status: "active" })
      : null;
  }
  async evaluate(
    growthPlan: AutonomousGrowthPlan,
    recovery: CampaignFunnelRecovery,
  ) {
    const r = (await campaignSequencingEngine.summary(growthPlan)).results;
    const measured = r[recovery.brokenStage].publications;
    const value =
      recovery.variable === "education_depth"
        ? r.educate.clicks
        : recovery.variable === "proof_evidence"
          ? r.prove.leads
          : r.convert.sales;
    if (recovery.status === "awaiting_approval") return recovery;
    if (measured < recovery.minimumEvidence)
      return campaignFunnelRecoveryRepository.save({
        ...recovery,
        status: "collecting",
        current: value,
      });
    return campaignFunnelRecoveryRepository.save({
      ...recovery,
      status: value > 0 ? "recovered" : "stopped",
      current: value,
    });
  }
  async summary(growthPlan: AutonomousGrowthPlan) {
    return {
      active: await this.plan(growthPlan),
      evidenceRule:
        "One verified funnel gap, one recovery variable, three measured posts, and separate owner approval for CTA, offer, pricing, or destination risk.",
    };
  }
}
export const campaignFunnelRecoveryEngine = new CampaignFunnelRecoveryEngine();
