import { randomUUID } from "node:crypto";
import { commerceOperationsEngine } from "./CommerceOperationsEngine";
import { customerAcquisitionRepository } from "./database/CustomerAcquisitionRepository";
import { customerRetentionRepository } from "./database/CustomerRetentionRepository";
export type LifecycleEventType =
  | "customer.satisfied"
  | "customer.unsatisfied"
  | "product.completed"
  | "testimonial.received"
  | "repeat_interest"
  | "consent.revoked";
export type CustomerLifecycleEvent = {
  id: string;
  externalEventId: string;
  customerReference: string;
  eventType: LifecycleEventType;
  externalOrderId: string | null;
  product: string;
  rating: number | null;
  amount: number;
  occurredAt: string;
  createdAt: string;
};
export type RetentionAction = {
  id: string;
  customerReference: string;
  externalOrderId: string | null;
  type:
    | "support_recovery"
    | "delivery_checkin"
    | "testimonial_request"
    | "cross_sell";
  status: "drafted" | "approved" | "dismissed";
  priority: "urgent" | "high" | "normal";
  subject: string;
  message: string;
  evidence: string[];
  ownerApprovedAt: string | null;
  createdAt: string;
  updatedAt: string;
};
const clean = (x: unknown) => (typeof x === "string" ? x.trim() : ""),
  money = (x: unknown) => Math.max(0, Math.round((Number(x) || 0) * 100) / 100);
export class CustomerRetentionEngine {
  async ingest(input: Record<string, unknown>) {
    const externalEventId = clean(input.externalEventId),
      eventType = clean(input.eventType) as LifecycleEventType,
      externalOrderId = clean(input.externalOrderId) || null,
      order = externalOrderId
        ? (await commerceOperationsEngine.summary()).orders.find(
            (x) => x.externalOrderId === externalOrderId,
          )
        : null,
      customerReference =
        order?.customerReference || clean(input.customerReference);
    if (
      !externalEventId ||
      !customerReference ||
      ![
        "customer.satisfied",
        "customer.unsatisfied",
        "product.completed",
        "testimonial.received",
        "repeat_interest",
        "consent.revoked",
      ].includes(eventType)
    )
      throw new Error(
        "A unique event ID, verified customer reference, and supported lifecycle event are required.",
      );
    const duplicate = await customerRetentionRepository.event(externalEventId);
    if (duplicate) return { event: duplicate, duplicate: true };
    const ratingRaw = Number(input.rating),
      event = await customerRetentionRepository.saveEvent({
        externalEventId,
        customerReference,
        eventType,
        externalOrderId,
        product: clean(input.product) || order?.product || "Digital offer",
        rating: Number.isFinite(ratingRaw)
          ? Math.max(1, Math.min(5, Math.round(ratingRaw)))
          : null,
        amount: money(input.amount),
        occurredAt: clean(input.occurredAt) || new Date().toISOString(),
      });
    await this.refresh();
    return { event, duplicate: false };
  }
  private async consent(reference: string) {
    const leads = (await customerAcquisitionRepository.leads()).filter(
      (x) => x.contactReference === reference,
    );
    return (
      leads.some((x) => x.consent === "granted") &&
      !leads.some((x) => x.consent === "revoked")
    );
  }
  async refresh() {
    const commerce = await commerceOperationsEngine.summary(),
      events = await customerRetentionRepository.events(),
      existing = await customerRetentionRepository.actions(),
      openCases = [
        ...commerce.support.needsReview,
        ...commerce.support.approved,
      ],
      now = new Date().toISOString();
    for (const order of commerce.orders) {
      const consent = await this.consent(order.customerReference),
        customerEvents = events.filter(
          (x) => x.customerReference === order.customerReference,
        ),
        bad =
          order.deliveryStatus === "failed" ||
          order.refundedAmount > 0 ||
          openCases.some((x) => x.externalOrderId === order.externalOrderId) ||
          customerEvents.some((x) => x.eventType === "customer.unsatisfied"),
        positive =
          customerEvents.some(
            (x) => x.eventType === "customer.satisfied" && (x.rating ?? 0) >= 4,
          ) || customerEvents.some((x) => x.eventType === "product.completed"),
        testimonial = customerEvents.some(
          (x) => x.eventType === "testimonial.received",
        ),
        has = (type: RetentionAction["type"]) =>
          existing.some(
            (x) =>
              x.externalOrderId === order.externalOrderId &&
              x.type === type &&
              x.status !== "dismissed",
          );
      let draft: Omit<
        RetentionAction,
        "id" | "createdAt" | "updatedAt"
      > | null = null;
      if (bad && !has("support_recovery"))
        draft = {
          customerReference: order.customerReference,
          externalOrderId: order.externalOrderId,
          type: "support_recovery",
          status: "drafted",
          priority: "urgent",
          subject: `Let us make your ${order.product} experience right`,
          message: `We noticed an issue connected to your ${order.product} order. We want to help resolve it before discussing anything else. Reply with what went wrong and we will review the safest next step.`,
          evidence: [
            order.deliveryStatus === "failed"
              ? "Delivery failed."
              : "Customer experience needs review.",
            order.refundedAmount > 0
              ? `$${order.refundedAmount.toFixed(2)} refunded.`
              : "No verified refund.",
          ],
          ownerApprovedAt: null,
        };
      else if (
        consent &&
        order.deliveryStatus === "delivered" &&
        !positive &&
        !has("delivery_checkin")
      )
        draft = {
          customerReference: order.customerReference,
          externalOrderId: order.externalOrderId,
          type: "delivery_checkin",
          status: "drafted",
          priority: "normal",
          subject: `How is ${order.product} working for you?`,
          message: `Your ${order.product} was delivered. Is everything working as expected? Your honest feedback helps us improve, and you can reply if you need support.`,
          evidence: [
            "Verified delivery succeeded.",
            "No positive outcome has been recorded yet.",
          ],
          ownerApprovedAt: null,
        };
      else if (
        consent &&
        positive &&
        !bad &&
        !testimonial &&
        !has("testimonial_request")
      )
        draft = {
          customerReference: order.customerReference,
          externalOrderId: order.externalOrderId,
          type: "testimonial_request",
          status: "drafted",
          priority: "normal",
          subject: "Would you share your honest experience?",
          message: `Thank you for using ${order.product}. Since you reported a positive result, would you be comfortable sharing an honest testimonial? There is no obligation, and we will not publish anything without permission.`,
          evidence: [
            "Positive outcome verified.",
            "No unresolved support or refund risk.",
          ],
          ownerApprovedAt: null,
        };
      else if (consent && positive && !bad && !has("cross_sell"))
        draft = {
          customerReference: order.customerReference,
          externalOrderId: order.externalOrderId,
          type: "cross_sell",
          status: "drafted",
          priority: "normal",
          subject: "A possible next step—only if it fits",
          message: `Based on your positive experience with ${order.product}, KAI found a possible next offer. Review it only if it supports your current goal; there is no urgency or automatic purchase.`,
          evidence: [
            "Positive customer outcome verified.",
            "Consent is active and no service risk is open.",
          ],
          ownerApprovedAt: null,
        };
      if (draft)
        await customerRetentionRepository.saveAction({
          ...draft,
          id: randomUUID(),
          createdAt: now,
          updatedAt: now,
        });
    }
    return customerRetentionRepository.actions();
  }
  async approve(id: string) {
    const action = (await customerRetentionRepository.actions()).find(
      (x) => x.id === id,
    );
    if (!action) throw new Error("Retention action not found.");
    if (!(await this.consent(action.customerReference)))
      throw new Error(
        "Approval is blocked because active customer consent is not recorded.",
      );
    return customerRetentionRepository.saveAction({
      ...action,
      status: "approved",
      ownerApprovedAt: new Date().toISOString(),
    });
  }
  async dismiss(id: string) {
    const action = (await customerRetentionRepository.actions()).find(
      (x) => x.id === id,
    );
    if (!action) throw new Error("Retention action not found.");
    return customerRetentionRepository.saveAction({
      ...action,
      status: "dismissed",
    });
  }
  async summary() {
    const commerce = await commerceOperationsEngine.summary(),
      actions = await this.refresh(),
      events = await customerRetentionRepository.events(),
      groups = Object.values(
        commerce.orders.reduce<
          Record<
            string,
            {
              customerReference: string;
              orders: number;
              gross: number;
              refunds: number;
              net: number;
              products: Set<string>;
            }
          >
        >((a, x) => {
          const v = a[x.customerReference] ?? {
            customerReference: x.customerReference,
            orders: 0,
            gross: 0,
            refunds: 0,
            net: 0,
            products: new Set<string>(),
          };
          v.orders++;
          v.gross += x.grossRevenue;
          v.refunds += x.refundedAmount;
          v.net += x.netRevenue;
          v.products.add(x.product);
          a[x.customerReference] = v;
          return a;
        }, {}),
      ),
      repeat = groups.filter((x) => x.orders > 1),
      atRisk = actions.filter(
        (x) => x.type === "support_recovery" && x.status === "drafted",
      ),
      eligible = actions.filter(
        (x) => x.type === "testimonial_request" && x.status === "drafted",
      ),
      ltv = groups.length
        ? groups.reduce((n, x) => n + x.net, 0) / groups.length
        : 0;
    return {
      customers: groups.length,
      repeatCustomers: repeat.length,
      repeatRatePercent: groups.length
        ? Math.round((repeat.length / groups.length) * 10000) / 100
        : 0,
      averageLifetimeValue: Math.round(ltv * 100) / 100,
      totalCustomerValue:
        Math.round(groups.reduce((n, x) => n + x.net, 0) * 100) / 100,
      atRisk: atRisk.length,
      testimonialEligible: eligible.length,
      positiveOutcomes: events.filter(
        (x) =>
          x.eventType === "customer.satisfied" ||
          x.eventType === "product.completed",
      ).length,
      testimonialsReceived: events.filter(
        (x) => x.eventType === "testimonial.received",
      ).length,
      actions: {
        drafted: actions
          .filter((x) => x.status === "drafted")
          .sort(
            (a, b) =>
              ({ urgent: 0, high: 1, normal: 2 })[a.priority] -
              { urgent: 0, high: 1, normal: 2 }[b.priority],
          ),
        approved: actions.filter((x) => x.status === "approved"),
        dismissed: actions.filter((x) => x.status === "dismissed"),
      },
      topCustomers: groups
        .sort((a, b) => b.net - a.net)
        .slice(0, 5)
        .map((x) => ({
          ...x,
          products: [...x.products],
          gross: Math.round(x.gross * 100) / 100,
          refunds: Math.round(x.refunds * 100) / 100,
          net: Math.round(x.net * 100) / 100,
        })),
      guardrail:
        "Service recovery always outranks testimonials and offers. Every outreach requires active consent and owner approval; approval never sends automatically.",
    };
  }
}
export const customerRetentionEngine = new CustomerRetentionEngine();
