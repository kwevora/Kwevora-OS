import { randomUUID } from "node:crypto";
import { getDatabase } from "./database";
import type {
  CommerceOrder,
  CommerceEvent,
  CustomerSupportCase,
} from "../CommerceOperationsEngine";
const parse = <T>(x: string) => JSON.parse(x) as T;
export class CommerceOperationsRepository {
  async order(id: string) {
    const r = await getDatabase()
      .prepare("SELECT orderData FROM commerce_orders WHERE externalOrderId=?")
      .bind(id)
      .first<{ orderData: string }>();
    return r ? parse<CommerceOrder>(r.orderData) : null;
  }
  async saveOrder(x: CommerceOrder) {
    const updatedAt = new Date().toISOString(),
      saved = { ...x, updatedAt };
    await getDatabase()
      .prepare(
        "INSERT INTO commerce_orders (id,externalOrderId,status,orderData,createdAt,updatedAt) VALUES (?,?,?,?,?,?) ON CONFLICT(externalOrderId) DO UPDATE SET status=excluded.status,orderData=excluded.orderData,updatedAt=excluded.updatedAt",
      )
      .bind(
        saved.id,
        saved.externalOrderId,
        saved.status,
        JSON.stringify(saved),
        saved.createdAt,
        updatedAt,
      )
      .run();
    return saved;
  }
  async orders(limit = 500) {
    const { results = [] } = await getDatabase()
      .prepare(
        "SELECT orderData FROM commerce_orders ORDER BY updatedAt DESC LIMIT ?",
      )
      .bind(Math.max(1, Math.min(2000, limit)))
      .all<{ orderData: string }>();
    return results.map((r) => parse<CommerceOrder>(r.orderData));
  }
  async event(id: string) {
    const r = await getDatabase()
      .prepare("SELECT eventData FROM commerce_events WHERE externalEventId=?")
      .bind(id)
      .first<{ eventData: string }>();
    return r ? parse<CommerceEvent>(r.eventData) : null;
  }
  async saveEvent(x: Omit<CommerceEvent, "id" | "createdAt">) {
    const old = await this.event(x.externalEventId);
    if (old) return old;
    const saved = {
      ...x,
      id: randomUUID(),
      createdAt: new Date().toISOString(),
    };
    await getDatabase()
      .prepare(
        "INSERT INTO commerce_events (id,externalEventId,externalOrderId,eventType,eventData,occurredAt,createdAt) VALUES (?,?,?,?,?,?,?)",
      )
      .bind(
        saved.id,
        saved.externalEventId,
        saved.externalOrderId,
        saved.eventType,
        JSON.stringify(saved),
        saved.occurredAt,
        saved.createdAt,
      )
      .run();
    return saved;
  }
  async events(limit = 2000) {
    const { results = [] } = await getDatabase()
      .prepare(
        "SELECT eventData FROM commerce_events ORDER BY occurredAt DESC LIMIT ?",
      )
      .bind(Math.max(1, Math.min(10000, limit)))
      .all<{ eventData: string }>();
    return results.map((r) => parse<CommerceEvent>(r.eventData));
  }
  async saveCase(x: CustomerSupportCase) {
    const updatedAt = new Date().toISOString(),
      saved = { ...x, updatedAt };
    await getDatabase()
      .prepare(
        "INSERT INTO customer_support_cases (id,externalOrderId,status,caseData,createdAt,updatedAt) VALUES (?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET status=excluded.status,caseData=excluded.caseData,updatedAt=excluded.updatedAt",
      )
      .bind(
        saved.id,
        saved.externalOrderId,
        saved.status,
        JSON.stringify(saved),
        saved.createdAt,
        updatedAt,
      )
      .run();
    return saved;
  }
  async cases(limit = 500) {
    const { results = [] } = await getDatabase()
      .prepare(
        "SELECT caseData FROM customer_support_cases ORDER BY updatedAt DESC LIMIT ?",
      )
      .bind(Math.max(1, Math.min(2000, limit)))
      .all<{ caseData: string }>();
    return results.map((r) => parse<CustomerSupportCase>(r.caseData));
  }
}
export const commerceOperationsRepository = new CommerceOperationsRepository();
