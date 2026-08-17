import { randomUUID } from "node:crypto";
import { commerceOperationsEngine } from "./CommerceOperationsEngine";
import { profitCashFlowController } from "./ProfitCashFlowController";
import { customerAcquisitionEngine } from "./CustomerAcquisitionEngine";
import { customerRetentionEngine } from "./CustomerRetentionEngine";
import { storefrontOfferBuilder } from "./StorefrontOfferBuilder";
import { verifiedBusinessLaunchRepository } from "./database/VerifiedBusinessLaunchRepository";
import { autonomousVideoQueueEngine } from "./AutonomousVideoQueueEngine";
import { autonomousPublishingHandoffEngine } from "./AutonomousPublishingHandoffEngine";
import { businessHealthRepository } from "./database/BusinessHealthRepository";
export type ExecutivePriority =
  | "financial_safety"
  | "customer_care"
  | "store_readiness"
  | "sales_pipeline"
  | "retention"
  | "execution_recovery"
  | "controlled_growth";
export type HealthArea = {
  key: string;
  label: string;
  score: number;
  status: "healthy" | "watch" | "critical";
  evidence: string;
};
export type BusinessHealthSnapshot = {
  id: string;
  snapshotDate: string;
  healthScore: number;
  status: "healthy" | "watch" | "critical";
  areas: HealthArea[];
  metrics: {
    netSales: number;
    operatingProfit: number;
    spendableCash: number;
    orders: number;
    leads: number;
    conversionRate: number;
    customers: number;
    repeatRate: number;
  };
  holds: {
    scaling: boolean;
    promotionalOutreach: boolean;
    publishing: boolean;
    reasons: string[];
  };
  changedSincePrevious: string[];
  createdAt: string;
  updatedAt: string;
};
export type ExecutiveDecision = {
  id: string;
  snapshotId: string;
  status: "awaiting_approval" | "approved" | "paused";
  priority: ExecutivePriority;
  priorityRank: number;
  title: string;
  whatToDo: string;
  why: string;
  evidence: string[];
  deferred: string[];
  approvalPackage: { summary: string; actions: string[]; boundaries: string[] };
  ownerApprovedAt: string | null;
  createdAt: string;
  updatedAt: string;
};
const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n))),
  area = (
    key: string,
    label: string,
    score: number,
    evidence: string,
  ): HealthArea => ({
    key,
    label,
    score: clamp(score),
    status: score >= 70 ? "healthy" : score >= 40 ? "watch" : "critical",
    evidence,
  });
export class BusinessHealthExecutiveEngine {
  async snapshot() {
    const commerce = await commerceOperationsEngine.summary(),
      finance = await profitCashFlowController.summary(),
      acquisition = await customerAcquisitionEngine.summary(),
      retention = await customerRetentionEngine.summary(),
      store = await storefrontOfferBuilder.summary(),
      launch = await verifiedBusinessLaunchRepository.latest(),
      video = await autonomousVideoQueueEngine.summary(),
      publishing = await autonomousPublishingHandoffEngine.summary(),
      stopped =
        (video.counts.stopped ?? 0) +
        (publishing.counts.stopped ?? 0) +
        (publishing.counts.blocked ?? 0),
      storeScore =
        store.package?.status === "store_ready"
          ? 100
          : store.readiness.ready
            ? 75
            : launch
              ? 40
              : 10,
      financialScore = !commerce.totalOrders
        ? 45
        : finance.operatingProfit > 0
          ? Math.min(100, 70 + finance.profitMarginPercent / 3)
          : 15,
      customerScore =
        commerce.deliveryFailures || retention.atRisk
          ? 20
          : commerce.totalOrders
            ? 85
            : 50,
      pipelineScore = acquisition.totalLeads
        ? Math.min(100, 55 + acquisition.conversionRate)
        : 35,
      retentionScore = retention.customers
        ? Math.min(
            100,
            55 +
              retention.repeatRatePercent / 2 +
              (retention.positiveOutcomes ? 15 : 0),
          )
        : 45,
      executionScore = stopped ? 20 : 85;
    const areas = [
        area(
          "store",
          "Offer readiness",
          storeScore,
          store.package?.status === "store_ready"
            ? "Storefront, checkout, and delivery are verified."
            : store.nextAction,
        ),
        area(
          "finance",
          "Profit and cash",
          financialScore,
          commerce.totalOrders
            ? `Operating profit is $${finance.operatingProfit.toFixed(2)} with $${finance.cash.spendable.toFixed(2)} spendable cash.`
            : "No verified paid orders yet.",
        ),
        area(
          "customers",
          "Customer care",
          customerScore,
          retention.atRisk
            ? `${retention.atRisk} customer(s) need recovery.`
            : `${commerce.deliveryFailures} delivery failures and ${commerce.support.needsReview.length} unresolved support cases.`,
        ),
        area(
          "pipeline",
          "Customer pipeline",
          pipelineScore,
          `${acquisition.totalLeads} leads at ${acquisition.conversionRate.toFixed(1)}% verified conversion.`,
        ),
        area(
          "retention",
          "Retention",
          retentionScore,
          `${retention.repeatCustomers} repeat customers; ${retention.repeatRatePercent.toFixed(1)}% repeat rate.`,
        ),
        area(
          "execution",
          "Execution",
          executionScore,
          stopped
            ? `${stopped} production or publishing handoff(s) are stopped or blocked.`
            : "No stopped production or publishing handoffs.",
        ),
      ],
      healthScore = clamp(
        areas.reduce((n, x) => n + x.score, 0) / areas.length,
      ),
      reasons: string[] = [];
    if (!finance.scalingGate.allowed)
      reasons.push(finance.scalingGate.explanation);
    if (retention.atRisk || commerce.deliveryFailures)
      reasons.push("Customer-care risk must be resolved before promotion.");
    if (stopped)
      reasons.push(
        "Publishing is held while stopped execution work is recovered.",
      );
    const holds = {
        scaling: !finance.scalingGate.allowed || retention.atRisk > 0,
        promotionalOutreach:
          retention.atRisk > 0 || commerce.deliveryFailures > 0,
        publishing: stopped > 0,
        reasons,
      },
      date = new Date().toISOString().slice(0, 10),
      previous = (await businessHealthRepository.history(2)).find(
        (x) => x.snapshotDate !== date,
      ),
      metrics = {
        netSales: finance.netSales,
        operatingProfit: finance.operatingProfit,
        spendableCash: finance.cash.spendable,
        orders: commerce.totalOrders,
        leads: acquisition.totalLeads,
        conversionRate: acquisition.conversionRate,
        customers: retention.customers,
        repeatRate: retention.repeatRatePercent,
      },
      changed: string[] = [];
    if (previous) {
      const delta = healthScore - previous.healthScore;
      changed.push(
        delta === 0
          ? "Overall health score is unchanged."
          : `Overall health ${delta > 0 ? "improved" : "declined"} by ${Math.abs(delta)} point(s).`,
      );
      for (const [key, label] of [
        ["operatingProfit", "Operating profit"],
        ["orders", "Verified orders"],
        ["leads", "Leads"],
        ["customers", "Customers"],
      ] as const) {
        const d = metrics[key] - previous.metrics[key];
        if (d)
          changed.push(
            `${label} ${d > 0 ? "increased" : "decreased"} by ${Math.abs(Math.round(d * 100) / 100)}.`,
          );
      }
    } else changed.push("This is the first business-wide health baseline.");
    const old = await businessHealthRepository.snapshot(date),
      now = new Date().toISOString();
    return businessHealthRepository.saveSnapshot({
      id: old?.id ?? randomUUID(),
      snapshotDate: date,
      healthScore,
      status:
        healthScore >= 70
          ? "healthy"
          : healthScore >= 40
            ? "watch"
            : "critical",
      areas,
      metrics,
      holds,
      changedSincePrevious: changed,
      createdAt: old?.createdAt ?? now,
      updatedAt: now,
    });
  }
  async decision() {
    const snapshot = await this.snapshot(),
      old = await businessHealthRepository.decision(snapshot.id);
    if (old?.status === "approved" || old?.status === "paused") return old;
    const a = Object.fromEntries(
      snapshot.areas.map((x) => [x.key, x]),
    ) as Record<string, HealthArea>;
    let priority: ExecutivePriority = "controlled_growth",
      title = "Continue controlled growth",
      what =
        "Keep the approved plan moving and measure the next verified result.",
      why = "No higher-priority business risk is active.",
      evidence = [`Business health is ${snapshot.healthScore}/100.`],
      rank = 7;
    if (a.finance.status === "critical") {
      priority = "financial_safety";
      title = "Protect cash and restore profit";
      what =
        "Hold scaling and review fees, expenses, refunds, and the break-even target before increasing spend.";
      why = a.finance.evidence;
      evidence = [a.finance.evidence, ...snapshot.holds.reasons];
      rank = 1;
    } else if (a.customers.status === "critical") {
      priority = "customer_care";
      title = "Resolve customer risk first";
      what =
        "Handle delivery, refund, and support recovery before asking for testimonials or another purchase.";
      why = a.customers.evidence;
      evidence = [a.customers.evidence];
      rank = 2;
    } else if (a.store.status !== "healthy") {
      priority = "store_readiness";
      title = "Finish the verified selling path";
      what = (await storefrontOfferBuilder.summary()).nextAction;
      why =
        "Content cannot reliably generate income without a verified offer, checkout, and delivery path.";
      evidence = [a.store.evidence];
      rank = 3;
    } else if (a.execution.status === "critical") {
      priority = "execution_recovery";
      title = "Restore safe execution";
      what =
        "Recover stopped production or publishing handoffs before adding new work.";
      why = a.execution.evidence;
      evidence = [a.execution.evidence];
      rank = 4;
    } else if (a.pipeline.status !== "healthy") {
      priority = "sales_pipeline";
      title = "Build and convert the customer pipeline";
      what =
        "Focus today’s approved content and follow-up work on the strongest consented sales opportunity.";
      why = a.pipeline.evidence;
      evidence = [a.pipeline.evidence];
      rank = 5;
    } else if (a.retention.status !== "healthy") {
      priority = "retention";
      title = "Strengthen customer outcomes";
      what =
        "Collect verified customer outcomes and approve only relevant post-purchase actions.";
      why = a.retention.evidence;
      evidence = [a.retention.evidence];
      rank = 6;
    }
    const labels = [
        "Protect cash",
        "Resolve customer care",
        "Finish storefront",
        "Restore execution",
        "Build pipeline",
        "Improve retention",
        "Controlled growth",
      ],
      deferred = labels.filter((_, i) => i + 1 > rank),
      now = new Date().toISOString();
    return businessHealthRepository.saveDecision({
      id: old?.id ?? randomUUID(),
      snapshotId: snapshot.id,
      status: "awaiting_approval",
      priority,
      priorityRank: rank,
      title,
      whatToDo: what,
      why,
      evidence,
      deferred,
      approvalPackage: {
        summary: `Approve today's single priority: ${title}.`,
        actions: [what],
        boundaries: [
          "No spending, publishing, customer messaging, refunds, or external account changes occur from this approval alone.",
          "Existing consent, financial, platform, and safety gates still apply.",
        ],
      },
      ownerApprovedAt: null,
      createdAt: old?.createdAt ?? now,
      updatedAt: now,
    });
  }
  async approve() {
    const d = await this.decision();
    return businessHealthRepository.saveDecision({
      ...d,
      status: "approved",
      ownerApprovedAt: new Date().toISOString(),
    });
  }
  async pause() {
    const d = await this.decision();
    return businessHealthRepository.saveDecision({ ...d, status: "paused" });
  }
  async summary() {
    return {
      snapshot: await this.snapshot(),
      decision: await this.decision(),
      history: await businessHealthRepository.history(14),
      plainLanguageRule:
        "KAI chooses one business priority in this order: financial safety, customer care, selling-path readiness, execution recovery, pipeline, retention, then controlled growth.",
    };
  }
}
export const businessHealthExecutiveEngine =
  new BusinessHealthExecutiveEngine();
