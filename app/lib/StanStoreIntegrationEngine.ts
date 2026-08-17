import { randomUUID } from "node:crypto";
import { stanStoreRepository } from "./database/StanStoreRepository";
import { commerceOperationsEngine } from "./CommerceOperationsEngine";
import { profitCashFlowController } from "./ProfitCashFlowController";
import { customerAcquisitionEngine } from "./CustomerAcquisitionEngine";
export type StanStoreProfile = {
  storeUrl: string;
  productUrl: string;
  productName: string;
  price: number;
  currency: string;
  termsEnabled: boolean;
  finalSalePolicyAccepted: boolean;
  checkoutTested: boolean;
  deliveryTested: boolean;
  freeTestCompleted: boolean;
  zapierConnected: boolean;
  createdAt: string;
  updatedAt: string;
};
export type StanTransactionType = "sale" | "refund" | "dispute" | "payout";
export type StanTransaction = {
  id: string;
  externalTransactionId: string;
  transactionType: StanTransactionType;
  externalOrderId: string;
  product: string;
  amount: number;
  currency: string;
  deliveryStatus: "delivered" | "failed" | "unknown";
  source: "csv" | "zapier" | "owner";
  occurredAt: string;
  createdAt: string;
};
export type RefundReason =
  | "duplicate_charge"
  | "unauthorized_charge"
  | "failed_delivery"
  | "materially_incorrect"
  | "required_by_law"
  | "change_of_mind";
export type StanRefundReview = {
  id: string;
  externalOrderId: string;
  reason: RefundReason;
  status: "needs_review" | "approved_exception" | "denied_final_sale";
  eligibility: "exception" | "final_sale";
  amount: number;
  customerStatement: string;
  evidence: {
    termsAccepted: boolean;
    deliveryVerified: boolean;
    transactionVerified: boolean;
    notes: string[];
  };
  decisionNote: string;
  ownerDecidedAt: string | null;
  createdAt: string;
  updatedAt: string;
};
const clean = (x: unknown) => (typeof x === "string" ? x.trim() : ""),
  money = (x: unknown) =>
    Math.max(
      0,
      Math.round((Number(String(x ?? 0).replace(/[$,]/g, "")) || 0) * 100) /
        100,
    ),
  bool = (x: unknown) =>
    x === true ||
    ["true", "yes", "1", "completed", "delivered"].includes(
      clean(x).toLowerCase(),
    );
export class StanStoreIntegrationEngine {
  async profile() {
    const old = await stanStoreRepository.profile(),
      now = new Date().toISOString();
    return (
      old ??
      (await stanStoreRepository.saveProfile({
        storeUrl: "",
        productUrl: "",
        productName: "",
        price: 0,
        currency: "USD",
        termsEnabled: false,
        finalSalePolicyAccepted: false,
        checkoutTested: false,
        deliveryTested: false,
        freeTestCompleted: false,
        zapierConnected: false,
        createdAt: now,
        updatedAt: now,
      }))
    );
  }
  async configure(input: Record<string, unknown>) {
    const old = await this.profile(),
      url = (x: unknown, fallback: string) => {
        const v = clean(x) || fallback;
        if (
          v &&
          !/^https:\/\/stan\.store\/[a-z0-9_.-]+(?:\/p\/[a-z0-9_.-]+)?(?:[/?#].*)?$/i.test(
            v,
          )
        )
          throw new Error("Use a valid HTTPS stan.store URL.");
        return v;
      };
    return stanStoreRepository.saveProfile({
      ...old,
      storeUrl: url(input.storeUrl, old.storeUrl),
      productUrl: url(input.productUrl, old.productUrl),
      productName: clean(input.productName) || old.productName,
      price: input.price === undefined ? old.price : money(input.price),
      currency: (clean(input.currency) || old.currency).toUpperCase(),
      termsEnabled:
        input.termsEnabled === undefined
          ? old.termsEnabled
          : bool(input.termsEnabled),
      finalSalePolicyAccepted:
        input.finalSalePolicyAccepted === undefined
          ? old.finalSalePolicyAccepted
          : bool(input.finalSalePolicyAccepted),
      checkoutTested:
        input.checkoutTested === undefined
          ? old.checkoutTested
          : bool(input.checkoutTested),
      deliveryTested:
        input.deliveryTested === undefined
          ? old.deliveryTested
          : bool(input.deliveryTested),
      freeTestCompleted:
        input.freeTestCompleted === undefined
          ? old.freeTestCompleted
          : bool(input.freeTestCompleted),
      zapierConnected:
        input.zapierConnected === undefined
          ? old.zapierConnected
          : bool(input.zapierConnected),
    });
  }
  async readiness() {
    const p = await this.profile(),
      missing = [
        ...(!p.storeUrl ? ["Stan Store URL"] : []),
        ...(!p.productUrl ? ["Live Stan product URL"] : []),
        ...(!p.productName ? ["Product name"] : []),
        ...(!(p.price > 0) ? ["Verified product price"] : []),
        ...(!p.termsEnabled ? ["Stan Terms & Conditions checkbox"] : []),
        ...(!p.finalSalePolicyAccepted
          ? ["Owner-approved final-sale policy"]
          : []),
        ...(!p.checkoutTested ? ["Checkout test"] : []),
        ...(!p.deliveryTested ? ["Digital delivery test"] : []),
        ...(!p.freeTestCompleted
          ? ["Free or 100%-discount customer-flow test"]
          : []),
      ];
    return {
      ready: missing.length === 0,
      missing,
      nextAction: missing[0] ?? "Stan selling path is verified live.",
    };
  }
  async trackedUrl(executionPlanId?: string) {
    const p = await this.profile();
    if (!p.productUrl) return "";
    const u = new URL(p.productUrl);
    u.searchParams.set("utm_source", "kwevora");
    u.searchParams.set("utm_medium", "kai");
    if (executionPlanId) {
      u.searchParams.set("utm_campaign", executionPlanId);
      u.searchParams.set("kw_cycle", executionPlanId);
    }
    return u.toString();
  }
  async ingest(
    input: Record<string, unknown>,
    source: StanTransaction["source"] = "owner",
  ) {
    const externalTransactionId = clean(
        input.externalTransactionId ?? input.transactionId ?? input.id,
      ),
      type = clean(
        input.transactionType ?? input.type ?? "sale",
      ).toLowerCase() as StanTransactionType,
      externalOrderId = clean(
        input.externalOrderId ?? input.orderId ?? externalTransactionId,
      );
    if (
      !externalTransactionId ||
      !externalOrderId ||
      !["sale", "refund", "dispute", "payout"].includes(type)
    )
      throw new Error(
        "A unique Stan transaction ID, order ID, and supported transaction type are required.",
      );
    const duplicate = await stanStoreRepository.transaction(
      externalTransactionId,
    );
    if (duplicate) return { transaction: duplicate, duplicate: true };
    const p = await this.profile(),
      amount = money(input.amount ?? input.price),
      currency = (clean(input.currency) || p.currency || "USD").toUpperCase(),
      occurredAt =
        clean(input.occurredAt ?? input.date) || new Date().toISOString(),
      deliveryStatus = bool(input.delivered ?? input.deliveryStatus)
        ? "delivered"
        : clean(input.deliveryStatus).toLowerCase() === "failed"
          ? "failed"
          : "unknown",
      product =
        clean(input.product ?? input.productName) ||
        p.productName ||
        "Stan digital product";
    if (type === "sale") {
      await commerceOperationsEngine.ingest({
        externalEventId: `stan:${externalTransactionId}:paid`,
        externalOrderId,
        eventType: "order.paid",
        amount,
        currency,
        occurredAt,
        product,
        customerEmail: input.customerEmail ?? input.email,
        customerId: input.customerId,
        executionPlanId: input.executionPlanId,
        source: "stan_store",
      });
      if (deliveryStatus === "delivered")
        await commerceOperationsEngine.ingest({
          externalEventId: `stan:${externalTransactionId}:delivery`,
          externalOrderId,
          eventType: "delivery.succeeded",
          amount: 0,
          currency,
          occurredAt,
          product,
          source: "stan_store",
        });
      if (clean(input.externalLeadId))
        await customerAcquisitionEngine.ingest({
          externalEventId: `stan:${externalTransactionId}:customer`,
          externalLeadId: input.externalLeadId,
          eventType: "sale.completed",
          amount,
          currency,
          occurredAt,
          product,
          contact: input.customerEmail ?? input.email,
          source: "stan_store",
          platform: input.platform,
          executionPlanId: input.executionPlanId,
        });
    } else if (type === "refund")
      await commerceOperationsEngine.ingest({
        externalEventId: `stan:${externalTransactionId}:refund`,
        externalOrderId,
        eventType: "order.refunded",
        amount,
        currency,
        occurredAt,
        product,
        source: "stan_store",
      });
    else if (type === "payout")
      await profitCashFlowController.recordPayout({
        externalPayoutId: externalTransactionId,
        amount,
        currency,
        status: clean(input.status) === "pending" ? "pending" : "paid",
        occurredAt,
      });
    else
      await this.requestRefund({
        externalOrderId,
        reason: "unauthorized_charge",
        amount,
        customerStatement: "A Stan payment dispute requires owner review.",
      });
    const saved = await stanStoreRepository.saveTransaction({
      externalTransactionId,
      transactionType: type,
      externalOrderId,
      product,
      amount,
      currency,
      deliveryStatus,
      source,
      occurredAt,
    });
    return { transaction: saved, duplicate: false };
  }
  async importRows(rows: Record<string, unknown>[]) {
    let imported = 0,
      duplicates = 0,
      failed = 0;
    const errors: string[] = [];
    for (const [index, row] of rows.entries())
      try {
        const normalized = {
          externalTransactionId:
            row.externalTransactionId ??
            row["Transaction ID"] ??
            row["Order ID"] ??
            row.id,
          externalOrderId:
            row.externalOrderId ?? row["Order ID"] ?? row["Transaction ID"],
          transactionType:
            (row.transactionType ?? row.Type ?? row.Status === "Refunded")
              ? "refund"
              : "sale",
          product: row.product ?? row.Product ?? row["Product Name"],
          amount: row.amount ?? row.Amount ?? row.Price,
          currency: row.currency ?? row.Currency,
          email: row.email ?? row.Email ?? row["Customer Email"],
          deliveryStatus:
            row.deliveryStatus ?? row["Delivery Status"] ?? "unknown",
          occurredAt: row.occurredAt ?? row.Date ?? row["Purchase Date"],
        };
        const result = await this.ingest(normalized, "csv");
        result.duplicate ? duplicates++ : imported++;
      } catch (e) {
        failed++;
        errors.push(
          `Row ${index + 1}: ${e instanceof Error ? e.message : "Invalid Stan transaction."}`,
        );
      }
    return { imported, duplicates, failed, errors: errors.slice(0, 20) };
  }
  async requestRefund(input: Record<string, unknown>) {
    const externalOrderId = clean(input.externalOrderId),
      reason = clean(input.reason) as RefundReason;
    if (
      !externalOrderId ||
      ![
        "duplicate_charge",
        "unauthorized_charge",
        "failed_delivery",
        "materially_incorrect",
        "required_by_law",
        "change_of_mind",
      ].includes(reason)
    )
      throw new Error(
        "A verified order and supported refund reason are required.",
      );
    const order = (await commerceOperationsEngine.summary()).orders.find(
        (x) => x.externalOrderId === externalOrderId,
      ),
      exception = reason !== "change_of_mind",
      now = new Date().toISOString(),
      profile = await this.profile();
    return stanStoreRepository.saveReview({
      id: randomUUID(),
      externalOrderId,
      reason,
      status: "needs_review",
      eligibility: exception ? "exception" : "final_sale",
      amount: money(input.amount) || order?.netRevenue || 0,
      customerStatement: clean(input.customerStatement).slice(0, 500),
      evidence: {
        termsAccepted: profile.termsEnabled && profile.finalSalePolicyAccepted,
        deliveryVerified: order?.deliveryStatus === "delivered",
        transactionVerified: Boolean(order),
        notes: [
          exception
            ? "Reason falls within the narrow exception review list."
            : "Change-of-mind requests are covered by the final-sale policy.",
          "No refund has been issued automatically.",
        ],
      },
      decisionNote: "",
      ownerDecidedAt: null,
      createdAt: now,
      updatedAt: now,
    });
  }
  async decideRefund(id: string, approve: boolean, note: string) {
    const x = (await stanStoreRepository.reviews()).find((r) => r.id === id);
    if (!x) throw new Error("Refund review not found.");
    if (approve && x.eligibility !== "exception")
      throw new Error(
        "This request is covered by the final-sale policy. Change the verified reason before approving an exception.",
      );
    return stanStoreRepository.saveReview({
      ...x,
      status: approve ? "approved_exception" : "denied_final_sale",
      decisionNote:
        clean(note) ||
        (approve
          ? "Owner approved a documented exception."
          : "Denied under the disclosed final-sale policy."),
      ownerDecidedAt: new Date().toISOString(),
    });
  }
  async summary() {
    const p = await this.profile(),
      transactions = await stanStoreRepository.transactions(),
      reviews = await stanStoreRepository.reviews(),
      sales = transactions.filter((x) => x.transactionType === "sale"),
      refunds = transactions.filter((x) => x.transactionType === "refund");
    return {
      profile: p,
      readiness: await this.readiness(),
      trackedProductUrl: await this.trackedUrl(),
      transactions: {
        total: transactions.length,
        sales: sales.length,
        refunds: refunds.length,
        disputes: transactions.filter((x) => x.transactionType === "dispute")
          .length,
        payouts: transactions.filter((x) => x.transactionType === "payout")
          .length,
        gross: sales.reduce((n, x) => n + x.amount, 0),
        refunded: refunds.reduce((n, x) => n + x.amount, 0),
      },
      refundReviews: {
        needsReview: reviews.filter((x) => x.status === "needs_review"),
        approved: reviews.filter((x) => x.status === "approved_exception"),
        denied: reviews.filter((x) => x.status === "denied_final_sale"),
      },
      policy: {
        display:
          "All digital-product sales are final and non-refundable after successful delivery, except where required by law or when a charge or delivery was demonstrably incorrect, duplicated, unauthorized, or unsuccessful.",
        boundary:
          "Customers may still file payment disputes, and banks or applicable law can override a seller policy. KAI never issues refunds automatically.",
      },
      integration: {
        primary: "Stan Income CSV import",
        optional:
          "Stan New Customer trigger through Zapier to KWEVORA's signed endpoint",
        truth:
          "Stan remains responsible for checkout, payment processing, receipts, and digital delivery.",
      },
    };
  }
}
export const stanStoreIntegrationEngine = new StanStoreIntegrationEngine();
export function importNormalizedStanRows(rows: Record<string, unknown>[]) {
  return stanStoreIntegrationEngine.importRows(
    rows.map((row) => ({
      ...row,
      transactionType:
        row.transactionType ??
        row.Type ??
        (String(row.Status ?? "")
          .toLowerCase()
          .includes("refund")
          ? "refund"
          : "sale"),
    })),
  );
}
