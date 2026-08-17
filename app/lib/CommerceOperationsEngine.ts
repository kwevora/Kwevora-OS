import { createHmac, randomUUID } from "node:crypto";
import { commerceOperationsRepository } from "./database/CommerceOperationsRepository";
import { verifiedBusinessLaunchRepository } from "./database/VerifiedBusinessLaunchRepository";
import { revenueAttributionBrain } from "./RevenueAttributionBrain";
import { autonomousCycleRepository } from "./database/AutonomousCycleRepository";
export type CommerceEventType =
  | "order.paid"
  | "order.refunded"
  | "delivery.succeeded"
  | "delivery.failed"
  | "support.requested";
export type CommerceEvent = {
  id: string;
  externalEventId: string;
  externalOrderId: string;
  eventType: CommerceEventType;
  amount: number;
  currency: string;
  occurredAt: string;
  metadata: {
    source: string;
    executionPlanId: string | null;
    launchId: string | null;
  };
  createdAt: string;
};
export type CommerceOrder = {
  id: string;
  externalOrderId: string;
  launchId: string | null;
  executionPlanId: string | null;
  customerReference: string;
  product: string;
  currency: string;
  grossRevenue: number;
  refundedAmount: number;
  netRevenue: number;
  status: "paid" | "partially_refunded" | "refunded";
  deliveryStatus: "pending" | "delivered" | "failed";
  attributionStatus: "attributed" | "unattributed";
  createdAt: string;
  updatedAt: string;
};
export type CustomerSupportCase = {
  id: string;
  externalOrderId: string;
  type: "delivery_failure" | "refund_request" | "customer_question";
  status: "needs_review" | "response_approved" | "resolved";
  summary: string;
  preparedResponse: string;
  approvedAt: string | null;
  resolution: string;
  createdAt: string;
  updatedAt: string;
};
const clean = (x: unknown) => (typeof x === "string" ? x.trim() : "");
const money = (x: unknown) =>
  Math.max(0, Math.round((Number(x) || 0) * 100) / 100);
export class CommerceOperationsEngine {
  customerReference(value: unknown) {
    const normalized = clean(value).toLowerCase();
    if (!normalized) return "anonymous";
    const salt =
      process.env.COMMERCE_PRIVACY_SALT ||
      process.env.COMMERCE_WEBHOOK_SECRET ||
      "kwevora-local-private-reference";
    return createHmac("sha256", salt)
      .update(normalized)
      .digest("hex")
      .slice(0, 24);
  }
  async ingest(input: Record<string, unknown>) {
    const externalEventId = clean(input.externalEventId),
      externalOrderId = clean(input.externalOrderId),
      eventType = clean(input.eventType) as CommerceEventType;
    if (
      !externalEventId ||
      !externalOrderId ||
      ![
        "order.paid",
        "order.refunded",
        "delivery.succeeded",
        "delivery.failed",
        "support.requested",
      ].includes(eventType)
    )
      throw new Error(
        "A unique event ID, order ID, and supported commerce event are required.",
      );
    const duplicate = await commerceOperationsRepository.event(externalEventId);
    if (duplicate)
      return {
        event: duplicate,
        order: await commerceOperationsRepository.order(externalOrderId),
        duplicate: true,
      };
    const launch = await verifiedBusinessLaunchRepository.latest(),
      executionPlanId = clean(input.executionPlanId) || null,
      amount = money(input.amount),
      currency = (clean(input.currency) || "USD").toUpperCase(),
      now = clean(input.occurredAt) || new Date().toISOString();
    let order = (await commerceOperationsRepository.order(externalOrderId)) ?? {
      id: randomUUID(),
      externalOrderId,
      launchId: launch?.id ?? null,
      executionPlanId,
      customerReference: this.customerReference(
        input.customerEmail ?? input.customerId,
      ),
      product:
        clean(input.product) ||
        launch?.product.name ||
        "Verified digital product",
      currency,
      grossRevenue: 0,
      refundedAmount: 0,
      netRevenue: 0,
      status: "paid" as const,
      deliveryStatus: "pending" as const,
      attributionStatus:
        executionPlanId &&
        (await autonomousCycleRepository.forExecutionPlan(executionPlanId))
          ? ("attributed" as const)
          : ("unattributed" as const),
      createdAt: now,
      updatedAt: now,
    };
    if (eventType === "order.paid") {
      order = {
        ...order,
        grossRevenue: Math.max(order.grossRevenue, amount),
        status: "paid",
      };
    } else if (eventType === "order.refunded") {
      const refunded = Math.min(
        order.grossRevenue,
        order.refundedAmount + amount,
      );
      order = {
        ...order,
        refundedAmount: refunded,
        status:
          refunded >= order.grossRevenue ? "refunded" : "partially_refunded",
      };
    } else if (eventType === "delivery.succeeded")
      order = { ...order, deliveryStatus: "delivered" };
    else if (eventType === "delivery.failed")
      order = { ...order, deliveryStatus: "failed" };
    order = {
      ...order,
      netRevenue:
        Math.round((order.grossRevenue - order.refundedAmount) * 100) / 100,
    };
    order = await commerceOperationsRepository.saveOrder(order);
    const event = await commerceOperationsRepository.saveEvent({
      externalEventId,
      externalOrderId,
      eventType,
      amount,
      currency,
      occurredAt: now,
      metadata: {
        source: clean(input.source) || "storefront",
        executionPlanId: order.executionPlanId,
        launchId: order.launchId,
      },
    });
    if (
      eventType === "order.paid" &&
      order.executionPlanId &&
      order.attributionStatus === "attributed"
    )
      await revenueAttributionBrain.record({
        executionPlanId: order.executionPlanId,
        eventType: "sale",
        quantity: 1,
        amount,
        currency,
        source: "commerce",
        externalEventId: `commerce:${externalEventId}`,
        metadata: { externalOrderId, launchId: order.launchId, verified: true },
        occurredAt: now,
      });
    if (
      eventType === "order.paid" &&
      launch &&
      !["completed", "stopped"].includes(launch.status)
    )
      await verifiedBusinessLaunchRepository.save({
        ...launch,
        status: "completed",
        auditTrail: [
          ...launch.auditTrail,
          {
            at: now,
            actor: "kai",
            event: "verified_order_paid",
            detail: `A verified $${amount.toFixed(2)} order completed the first-sale launch milestone.`,
          },
        ],
      });
    if (eventType === "delivery.failed")
      await this.openCase(
        externalOrderId,
        "delivery_failure",
        "Verified payment succeeded, but customer delivery failed.",
        `I'm sorry your digital product did not arrive correctly. I have your order reference and will help restore access. No additional purchase is required.`,
      );
    if (eventType === "support.requested")
      await this.openCase(
        externalOrderId,
        "customer_question",
        clean(input.message) || "The customer requested help.",
        "Thank you for reaching out. I found your order reference and prepared this request for review so we can provide an accurate response.",
      );
    if (eventType === "order.refunded")
      await this.openCase(
        externalOrderId,
        "refund_request",
        `A refund event for $${amount.toFixed(2)} requires reconciliation.`,
        `Your refund status is being reviewed against the verified order. We will confirm the final amount and delivery access after owner approval.`,
      );
    return { event, order, duplicate: false };
  }
  async openCase(
    orderId: string,
    type: CustomerSupportCase["type"],
    summary: string,
    response: string,
  ) {
    const existing = (await commerceOperationsRepository.cases()).find(
      (x) =>
        x.externalOrderId === orderId &&
        x.type === type &&
        x.status !== "resolved",
    );
    if (existing) return existing;
    const now = new Date().toISOString();
    return commerceOperationsRepository.saveCase({
      id: randomUUID(),
      externalOrderId: orderId,
      type,
      status: "needs_review",
      summary,
      preparedResponse: response,
      approvedAt: null,
      resolution: "",
      createdAt: now,
      updatedAt: now,
    });
  }
  async approveResponse(id: string) {
    const x = (await commerceOperationsRepository.cases()).find(
      (c) => c.id === id,
    );
    if (!x) throw new Error("Support case not found.");
    return commerceOperationsRepository.saveCase({
      ...x,
      status: "response_approved",
      approvedAt: new Date().toISOString(),
    });
  }
  async resolve(id: string, resolution: string) {
    const x = (await commerceOperationsRepository.cases()).find(
      (c) => c.id === id,
    );
    if (!x) throw new Error("Support case not found.");
    return commerceOperationsRepository.saveCase({
      ...x,
      status: "resolved",
      resolution: clean(resolution) || "Resolved by owner.",
    });
  }
  async attribute(orderId: string, executionPlanId: string) {
    const x = await commerceOperationsRepository.order(orderId);
    if (!x || !autonomousCycleRepository.forExecutionPlan(executionPlanId))
      throw new Error(
        "The order or KWEVORA content cycle could not be verified.",
      );
    return commerceOperationsRepository.saveOrder({
      ...x,
      executionPlanId,
      attributionStatus: "attributed",
    });
  }
  async summary() {
    const orders = await commerceOperationsRepository.orders(),
      cases = await commerceOperationsRepository.cases(),
      gross = orders.reduce((n, x) => n + x.grossRevenue, 0),
      refunds = orders.reduce((n, x) => n + x.refundedAmount, 0);
    return {
      orders,
      totalOrders: orders.length,
      grossRevenue: Math.round(gross * 100) / 100,
      refundedAmount: Math.round(refunds * 100) / 100,
      netRevenue: Math.round((gross - refunds) * 100) / 100,
      delivered: orders.filter((x) => x.deliveryStatus === "delivered").length,
      deliveryFailures: orders.filter((x) => x.deliveryStatus === "failed")
        .length,
      unattributed: orders.filter((x) => x.attributionStatus === "unattributed")
        .length,
      support: {
        needsReview: cases.filter((x) => x.status === "needs_review"),
        approved: cases.filter((x) => x.status === "response_approved"),
        resolved: cases.filter((x) => x.status === "resolved"),
      },
      privacyRule:
        "Customer email and identity are converted to a one-way private reference; raw contact details are not stored in the commerce ledger.",
    };
  }
}
export const commerceOperationsEngine = new CommerceOperationsEngine();
