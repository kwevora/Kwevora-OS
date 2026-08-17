import { createHmac, randomUUID } from "node:crypto";
import { customerAcquisitionRepository } from "./database/CustomerAcquisitionRepository";
import { revenueAttributionBrain } from "./RevenueAttributionBrain";
export type LeadStage =
  | "new"
  | "interested"
  | "ready_to_buy"
  | "customer"
  | "inactive";
export type ConsentStatus = "granted" | "revoked" | "unknown";
export type LeadEventType =
  | "lead.captured"
  | "lead.engaged"
  | "checkout.started"
  | "checkout.abandoned"
  | "sale.completed"
  | "consent.revoked";
export type CustomerLead = {
  id: string;
  externalLeadId: string;
  contactReference: string;
  maskedContact: string;
  source: string;
  platform: string;
  campaign: string;
  executionPlanId: string | null;
  product: string;
  stage: LeadStage;
  consent: ConsentStatus;
  estimatedValue: number;
  lastActivityAt: string;
  convertedAt: string | null;
  createdAt: string;
  updatedAt: string;
};
export type LeadConversionEvent = {
  id: string;
  externalEventId: string;
  externalLeadId: string;
  eventType: LeadEventType;
  amount: number;
  currency: string;
  occurredAt: string;
  createdAt: string;
};
export type LeadFollowup = {
  id: string;
  externalLeadId: string;
  reason: "welcome" | "engagement" | "abandoned_checkout";
  status: "drafted" | "approved" | "dismissed";
  subject: string;
  message: string;
  ownerApprovedAt: string | null;
  createdAt: string;
  updatedAt: string;
};
const clean = (x: unknown) => (typeof x === "string" ? x.trim() : ""),
  money = (x: unknown) => Math.max(0, Math.round((Number(x) || 0) * 100) / 100);
export class CustomerAcquisitionEngine {
  private reference(x: unknown) {
    const value = clean(x).toLowerCase();
    if (!value) return "anonymous";
    return createHmac(
      "sha256",
      process.env.COMMERCE_PRIVACY_SALT ||
        process.env.COMMERCE_WEBHOOK_SECRET ||
        "kwevora-private-lead",
    )
      .update(value)
      .digest("hex")
      .slice(0, 24);
  }
  private masked(x: unknown) {
    const value = clean(x);
    if (!value) return "Private contact";
    if (value.includes("@")) {
      const [a, b] = value.split("@");
      return `${a.slice(0, 1)}***@${b}`;
    }
    return `***${value.slice(-4)}`;
  }
  async ingest(input: Record<string, unknown>) {
    const externalEventId = clean(input.externalEventId),
      externalLeadId = clean(input.externalLeadId),
      eventType = clean(input.eventType) as LeadEventType;
    if (
      !externalEventId ||
      !externalLeadId ||
      ![
        "lead.captured",
        "lead.engaged",
        "checkout.started",
        "checkout.abandoned",
        "sale.completed",
        "consent.revoked",
      ].includes(eventType)
    )
      throw new Error(
        "A unique event ID, lead ID, and supported conversion event are required.",
      );
    const duplicate =
      await customerAcquisitionRepository.event(externalEventId);
    if (duplicate)
      return {
        event: duplicate,
        lead: await customerAcquisitionRepository.lead(externalLeadId),
        duplicate: true,
      };
    const now = clean(input.occurredAt) || new Date().toISOString(),
      old = await customerAcquisitionRepository.lead(externalLeadId),
      executionPlanId =
        clean(input.executionPlanId) || old?.executionPlanId || null,
      consent =
        eventType === "consent.revoked"
          ? "revoked"
          : input.consent === true
            ? "granted"
            : (old?.consent ?? "unknown");
    let stage: LeadStage = old?.stage ?? "new";
    if (eventType === "lead.engaged") stage = "interested";
    if (eventType === "checkout.started" || eventType === "checkout.abandoned")
      stage = "ready_to_buy";
    if (eventType === "sale.completed") stage = "customer";
    if (eventType === "consent.revoked") stage = "inactive";
    const lead = await customerAcquisitionRepository.saveLead({
      id: old?.id ?? randomUUID(),
      externalLeadId,
      contactReference: old?.contactReference ?? this.reference(input.contact),
      maskedContact: old?.maskedContact ?? this.masked(input.contact),
      source: clean(input.source) || old?.source || "storefront",
      platform: clean(input.platform) || old?.platform || "unknown",
      campaign:
        clean(input.campaign) ||
        old?.campaign ||
        executionPlanId ||
        "unattributed",
      executionPlanId,
      product: clean(input.product) || old?.product || "Digital offer",
      stage,
      consent,
      estimatedValue: money(input.amount) || old?.estimatedValue || 0,
      lastActivityAt: now,
      convertedAt:
        eventType === "sale.completed" ? now : (old?.convertedAt ?? null),
      createdAt: old?.createdAt ?? now,
      updatedAt: now,
    });
    const event = await customerAcquisitionRepository.saveEvent({
      externalEventId,
      externalLeadId,
      eventType,
      amount: money(input.amount),
      currency: (clean(input.currency) || "USD").toUpperCase(),
      occurredAt: now,
    });
    if (
      executionPlanId &&
      (eventType === "lead.captured" || eventType === "sale.completed")
    )
      try {
        await revenueAttributionBrain.record({
          executionPlanId,
          eventType: eventType === "lead.captured" ? "lead" : "sale",
          amount: event.amount,
          source: "customer_acquisition",
          externalEventId: `lead:${externalEventId}`,
          metadata: { externalLeadId, verified: true },
          occurredAt: now,
        });
      } catch {}
    if (consent === "granted" && eventType !== "sale.completed")
      await this.prepareFollowup(lead, eventType);
    return { event, lead, duplicate: false };
  }
  async prepareFollowup(lead: CustomerLead, eventType: LeadEventType) {
    const open = (await customerAcquisitionRepository.followups()).filter(
      (x) =>
        x.externalLeadId === lead.externalLeadId && x.status !== "dismissed",
    );
    if (open.length >= 3 || open.some((x) => x.status === "drafted"))
      return null;
    const abandoned = eventType === "checkout.abandoned",
      reason: LeadFollowup["reason"] = abandoned
        ? "abandoned_checkout"
        : eventType === "lead.engaged"
          ? "engagement"
          : "welcome",
      subject = abandoned
        ? `Still interested in ${lead.product}?`
        : `Your next step with ${lead.product}`,
      message = abandoned
        ? `You were close to completing your order for ${lead.product}. If something got in the way, your original checkout is the safest place to continue. Reply if you need help—there is no pressure.`
        : `Thanks for your interest in ${lead.product}. Here is the next step when you are ready. Reply if you have a question and we will help before you decide.`;
    const now = new Date().toISOString();
    return customerAcquisitionRepository.saveFollowup({
      id: randomUUID(),
      externalLeadId: lead.externalLeadId,
      reason,
      status: "drafted",
      subject,
      message,
      ownerApprovedAt: null,
      createdAt: now,
      updatedAt: now,
    });
  }
  async approve(id: string) {
    const f = (await customerAcquisitionRepository.followups()).find(
        (x) => x.id === id,
      ),
      lead = f && (await customerAcquisitionRepository.lead(f.externalLeadId));
    if (!f || !lead) throw new Error("Follow-up not found.");
    if (lead.consent !== "granted")
      throw new Error(
        "Follow-up approval is blocked because recorded consent is not active.",
      );
    return customerAcquisitionRepository.saveFollowup({
      ...f,
      status: "approved",
      ownerApprovedAt: new Date().toISOString(),
    });
  }
  async dismiss(id: string) {
    const f = (await customerAcquisitionRepository.followups()).find(
      (x) => x.id === id,
    );
    if (!f) throw new Error("Follow-up not found.");
    return customerAcquisitionRepository.saveFollowup({
      ...f,
      status: "dismissed",
    });
  }
  async summary() {
    const leads = await customerAcquisitionRepository.leads(),
      events = await customerAcquisitionRepository.events(),
      followups = await customerAcquisitionRepository.followups(),
      sales = events.filter((x) => x.eventType === "sale.completed"),
      abandoned = events.filter((x) => x.eventType === "checkout.abandoned"),
      rate = leads.length ? (sales.length / leads.length) * 100 : 0,
      sourceMap = leads.reduce<
        Record<
          string,
          { source: string; leads: number; customers: number; value: number }
        >
      >((a, x) => {
        const key = `${x.platform}:${x.campaign}`,
          v = a[key] ?? { source: key, leads: 0, customers: 0, value: 0 };
        v.leads++;
        if (x.stage === "customer") {
          v.customers++;
          v.value += x.estimatedValue;
        }
        a[key] = v;
        return a;
      }, {}),
      priorities = leads
        .filter((x) => x.stage === "ready_to_buy" && x.consent === "granted")
        .sort((a, b) => b.estimatedValue - a.estimatedValue)
        .slice(0, 5);
    return {
      totalLeads: leads.length,
      stages: {
        new: leads.filter((x) => x.stage === "new").length,
        interested: leads.filter((x) => x.stage === "interested").length,
        readyToBuy: leads.filter((x) => x.stage === "ready_to_buy").length,
        customers: leads.filter((x) => x.stage === "customer").length,
        inactive: leads.filter((x) => x.stage === "inactive").length,
      },
      conversionRate: Math.round(rate * 100) / 100,
      abandonedCheckouts: abandoned.length,
      consent: {
        granted: leads.filter((x) => x.consent === "granted").length,
        blocked: leads.filter((x) => x.consent !== "granted").length,
      },
      followups: {
        drafted: followups.filter((x) => x.status === "drafted"),
        approved: followups.filter((x) => x.status === "approved"),
        dismissed: followups.filter((x) => x.status === "dismissed"),
      },
      priorities,
      sourcePerformance: Object.values(sourceMap).sort(
        (a, b) => b.customers - a.customers || b.value - a.value,
      ),
      privacyRule:
        "Raw contact details are not stored. Follow-ups require recorded consent and owner approval, and approval does not automatically send a message.",
    };
  }
}
export const customerAcquisitionEngine = new CustomerAcquisitionEngine();
