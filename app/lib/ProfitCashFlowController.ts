import { randomUUID } from "node:crypto";
import { commerceOperationsEngine } from "./CommerceOperationsEngine";
import { profitCashFlowRepository } from "./database/ProfitCashFlowRepository";
export type ExpenseCategory =
  | "acquisition_license"
  | "software"
  | "advertising"
  | "transaction_fee"
  | "storefront_fee"
  | "support"
  | "other";
export type BusinessExpense = {
  id: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  currency: string;
  incurredAt: string;
  campaign: string | null;
  platform: string | null;
  orderId: string | null;
  createdAt: string;
};
export type PayoutRecord = {
  id: string;
  externalPayoutId: string;
  amount: number;
  currency: string;
  status: "pending" | "paid" | "failed";
  occurredAt: string;
  createdAt: string;
  updatedAt: string;
};
export type CashFlowProfile = {
  taxReservePercent: number;
  emergencyReservePercent: number;
  paymentFeePercent: number;
  paymentFeeFixed: number;
  storefrontFeePercent: number;
  monthlySoftwareEstimate: number;
  profitGoal: number;
  minimumMarginPercent: number;
  budgetStatus: "awaiting_approval" | "authorized";
  approvedAdBudget: number;
  createdAt: string;
  updatedAt: string;
};
const cash = (x: unknown) =>
    Math.max(0, Math.round((Number(x) || 0) * 100) / 100),
  pct = (x: unknown) => Math.min(100, cash(x));
const round = (n: number) => Math.round(n * 100) / 100;
export class ProfitCashFlowController {
  async profile() {
    return (await profitCashFlowRepository.profile()) ?? this.configure({});
  }
  async configure(input: Record<string, unknown>) {
    const old = await profitCashFlowRepository.profile(),
      now = new Date().toISOString();
    return profitCashFlowRepository.saveProfile({
      taxReservePercent: pct(
        input.taxReservePercent ?? old?.taxReservePercent ?? 20,
      ),
      emergencyReservePercent: pct(
        input.emergencyReservePercent ?? old?.emergencyReservePercent ?? 10,
      ),
      paymentFeePercent: pct(
        input.paymentFeePercent ?? old?.paymentFeePercent ?? 2.9,
      ),
      paymentFeeFixed: cash(
        input.paymentFeeFixed ?? old?.paymentFeeFixed ?? 0.3,
      ),
      storefrontFeePercent: pct(
        input.storefrontFeePercent ?? old?.storefrontFeePercent ?? 0,
      ),
      monthlySoftwareEstimate: cash(
        input.monthlySoftwareEstimate ?? old?.monthlySoftwareEstimate ?? 0,
      ),
      profitGoal: cash(input.profitGoal ?? old?.profitGoal ?? 500),
      minimumMarginPercent: pct(
        input.minimumMarginPercent ?? old?.minimumMarginPercent ?? 10,
      ),
      budgetStatus: old?.budgetStatus ?? "awaiting_approval",
      approvedAdBudget: cash(
        input.approvedAdBudget ?? old?.approvedAdBudget ?? 0,
      ),
      createdAt: old?.createdAt ?? now,
      updatedAt: now,
    });
  }
  async addExpense(input: Record<string, unknown>) {
    const category = String(input.category ?? "") as ExpenseCategory;
    if (
      ![
        "acquisition_license",
        "software",
        "advertising",
        "transaction_fee",
        "storefront_fee",
        "support",
        "other",
      ].includes(category) ||
      cash(input.amount) <= 0
    )
      throw new Error(
        "A supported expense category and positive amount are required.",
      );
    return profitCashFlowRepository.saveExpense({
      category,
      description: String(input.description ?? category)
        .trim()
        .slice(0, 180),
      amount: cash(input.amount),
      currency: String(input.currency ?? "USD").toUpperCase(),
      incurredAt: String(input.incurredAt ?? new Date().toISOString()),
      campaign: typeof input.campaign === "string" ? input.campaign : null,
      platform: typeof input.platform === "string" ? input.platform : null,
      orderId: typeof input.orderId === "string" ? input.orderId : null,
    });
  }
  async recordPayout(input: Record<string, unknown>) {
    const externalPayoutId = String(input.externalPayoutId ?? "").trim(),
      status = String(input.status ?? "") as PayoutRecord["status"];
    if (
      !externalPayoutId ||
      !["pending", "paid", "failed"].includes(status) ||
      cash(input.amount) <= 0
    )
      throw new Error(
        "A unique payout ID, status, and positive amount are required.",
      );
    return profitCashFlowRepository.savePayout({
      externalPayoutId,
      amount: cash(input.amount),
      currency: String(input.currency ?? "USD").toUpperCase(),
      status,
      occurredAt: String(input.occurredAt ?? new Date().toISOString()),
    });
  }
  async approveBudget(amount: unknown) {
    const p = await this.configure({ approvedAdBudget: amount });
    return profitCashFlowRepository.saveProfile({
      ...p,
      budgetStatus: "authorized",
    });
  }
  async summary() {
    const commerce = await commerceOperationsEngine.summary(),
      p = await this.profile(),
      expenses = await profitCashFlowRepository.expenses(),
      payouts = await profitCashFlowRepository.payouts(),
      actualFees = expenses
        .filter(
          (x) =>
            x.category === "transaction_fee" || x.category === "storefront_fee",
        )
        .reduce((n, x) => n + x.amount, 0),
      estimatedFees = actualFees
        ? 0
        : commerce.orders.reduce(
            (n, x) =>
              n +
              (x.grossRevenue *
                (p.paymentFeePercent + p.storefrontFeePercent)) /
                100 +
              (x.grossRevenue > 0 ? p.paymentFeeFixed : 0),
            0,
          ),
      nonFeeExpenses = expenses
        .filter(
          (x) =>
            !(["transaction_fee", "storefront_fee"] as string[]).includes(
              x.category,
            ),
        )
        .reduce((n, x) => n + x.amount, 0),
      softwareEstimate = expenses.some((x) => x.category === "software")
        ? 0
        : p.monthlySoftwareEstimate,
      totalCosts =
        actualFees + estimatedFees + nonFeeExpenses + softwareEstimate,
      profit = commerce.netRevenue - totalCosts,
      margin =
        commerce.netRevenue > 0 ? (profit / commerce.netRevenue) * 100 : 0,
      taxReserve = (Math.max(0, profit) * p.taxReservePercent) / 100,
      emergencyReserve =
        (Math.max(0, profit) * p.emergencyReservePercent) / 100,
      paid = payouts
        .filter((x) => x.status === "paid")
        .reduce((n, x) => n + x.amount, 0),
      pending = payouts
        .filter((x) => x.status === "pending")
        .reduce((n, x) => n + x.amount, 0),
      avgContribution = commerce.totalOrders
        ? Math.max(
            0.01,
            (commerce.netRevenue - actualFees - estimatedFees) /
              commerce.totalOrders,
          )
        : 0,
      fixed = nonFeeExpenses + softwareEstimate,
      breakEvenSales =
        avgContribution > 0 ? Math.ceil(fixed / avgContribution) : null,
      salesToGoal =
        avgContribution > 0
          ? Math.ceil((fixed + p.profitGoal) / avgContribution)
          : null,
      refundRate = commerce.grossRevenue
        ? (commerce.refundedAmount / commerce.grossRevenue) * 100
        : 0,
      allowed =
        commerce.totalOrders > 0 &&
        profit > 0 &&
        margin >= p.minimumMarginPercent &&
        refundRate <= 20;
    const blockers: string[] = [];
    if (!commerce.totalOrders) blockers.push("No verified paid orders yet.");
    if (profit <= 0) blockers.push("Operating profit is not positive.");
    if (margin < p.minimumMarginPercent)
      blockers.push(
        `Profit margin is below the ${p.minimumMarginPercent}% owner threshold.`,
      );
    if (refundRate > 20)
      blockers.push("Refund rate is above the 20% safety threshold.");
    const byProduct = Object.values(
      commerce.orders.reduce<
        Record<string, { product: string; orders: number; netRevenue: number }>
      >((a, x) => {
        const v = a[x.product] ?? {
          product: x.product,
          orders: 0,
          netRevenue: 0,
        };
        v.orders++;
        v.netRevenue = round(v.netRevenue + x.netRevenue);
        a[x.product] = v;
        return a;
      }, {}),
    );
    return {
      profile: p,
      grossSales: commerce.grossRevenue,
      refunds: commerce.refundedAmount,
      netSales: commerce.netRevenue,
      fees: round(actualFees + estimatedFees),
      feeEvidence: actualFees ? "recorded_actual" : "configured_estimate",
      operatingExpenses: round(nonFeeExpenses + softwareEstimate),
      operatingProfit: round(profit),
      profitMarginPercent: round(margin),
      refundRatePercent: round(refundRate),
      reserves: {
        tax: round(taxReserve),
        emergency: round(emergencyReserve),
        notice: "Planning reserves only; KWEVORA does not provide tax advice.",
      },
      cash: {
        received: round(paid),
        pending: round(pending),
        spendable: round(paid - totalCosts - taxReserve - emergencyReserve),
      },
      breakEven: {
        sales: breakEvenSales,
        salesToProfitGoal: salesToGoal,
        profitGoal: p.profitGoal,
      },
      scalingGate: {
        allowed,
        blockers,
        explanation: allowed
          ? "Verified profit supports owner-reviewed scaling."
          : `Scaling is blocked: ${blockers.join(" ")}`,
      },
      budget: {
        status: p.budgetStatus,
        approvedAdBudget: p.approvedAdBudget,
        suggestedAdBudget: round(
          Math.max(0, profit - taxReserve - emergencyReserve) * 0.2,
        ),
        rule: "No ad spend is executed without owner approval.",
      },
      byProduct,
      expenses,
      payouts,
      generatedAt: new Date().toISOString(),
    };
  }
}
export const profitCashFlowController = new ProfitCashFlowController();
