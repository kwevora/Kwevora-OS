import { randomUUID } from "node:crypto";
import { getDatabase } from "./database";
import type {
  CustomerLead,
  LeadConversionEvent,
  LeadFollowup,
} from "../CustomerAcquisitionEngine";
const parse = <T>(x: string) => JSON.parse(x) as T;
export class CustomerAcquisitionRepository {
  async lead(id: string) {
    const r = await getDatabase()
      .prepare("SELECT leadData FROM customer_leads WHERE externalLeadId=?")
      .bind(id)
      .first<{ leadData: string }>();
    return r ? parse<CustomerLead>(r.leadData) : null;
  }
  async leads() {
    const { results = [] } = await getDatabase()
      .prepare("SELECT leadData FROM customer_leads ORDER BY updatedAt DESC")
      .all<{ leadData: string }>();
    return results.map((x) => parse<CustomerLead>(x.leadData));
  }
  async saveLead(x: CustomerLead) {
    const now = new Date().toISOString(),
      saved = { ...x, updatedAt: now };
    await getDatabase()
      .prepare(
        "INSERT INTO customer_leads (id,externalLeadId,stage,leadData,createdAt,updatedAt) VALUES (?,?,?,?,?,?) ON CONFLICT(externalLeadId) DO UPDATE SET stage=excluded.stage,leadData=excluded.leadData,updatedAt=excluded.updatedAt",
      )
      .bind(
        saved.id,
        saved.externalLeadId,
        saved.stage,
        JSON.stringify(saved),
        saved.createdAt,
        now,
      )
      .run();
    return saved;
  }
  async event(id: string) {
    const r = await getDatabase()
      .prepare(
        "SELECT eventData FROM lead_conversion_events WHERE externalEventId=?",
      )
      .bind(id)
      .first<{ eventData: string }>();
    return r ? parse<LeadConversionEvent>(r.eventData) : null;
  }
  async events() {
    const { results = [] } = await getDatabase()
      .prepare(
        "SELECT eventData FROM lead_conversion_events ORDER BY occurredAt DESC",
      )
      .all<{ eventData: string }>();
    return results.map((x) => parse<LeadConversionEvent>(x.eventData));
  }
  async saveEvent(x: Omit<LeadConversionEvent, "id" | "createdAt">) {
    const old = await this.event(x.externalEventId);
    if (old) return old;
    const saved = {
      ...x,
      id: randomUUID(),
      createdAt: new Date().toISOString(),
    };
    await getDatabase()
      .prepare(
        "INSERT INTO lead_conversion_events (id,externalEventId,externalLeadId,eventType,eventData,occurredAt,createdAt) VALUES (?,?,?,?,?,?,?)",
      )
      .bind(
        saved.id,
        saved.externalEventId,
        saved.externalLeadId,
        saved.eventType,
        JSON.stringify(saved),
        saved.occurredAt,
        saved.createdAt,
      )
      .run();
    return saved;
  }
  async followups() {
    const { results = [] } = await getDatabase()
      .prepare(
        "SELECT followupData FROM lead_followups ORDER BY updatedAt DESC",
      )
      .all<{ followupData: string }>();
    return results.map((x) => parse<LeadFollowup>(x.followupData));
  }
  async saveFollowup(x: LeadFollowup) {
    const now = new Date().toISOString(),
      saved = { ...x, updatedAt: now };
    await getDatabase()
      .prepare(
        "INSERT INTO lead_followups (id,externalLeadId,status,followupData,createdAt,updatedAt) VALUES (?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET status=excluded.status,followupData=excluded.followupData,updatedAt=excluded.updatedAt",
      )
      .bind(
        saved.id,
        saved.externalLeadId,
        saved.status,
        JSON.stringify(saved),
        saved.createdAt,
        now,
      )
      .run();
    return saved;
  }
}
export const customerAcquisitionRepository =
  new CustomerAcquisitionRepository();
