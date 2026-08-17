import { randomUUID } from "node:crypto";
import { getDatabase } from "./database";
import type {
  CustomerLifecycleEvent,
  RetentionAction,
} from "../CustomerRetentionEngine";
const parse = <T>(x: string) => JSON.parse(x) as T;
export class CustomerRetentionRepository {
  async event(id: string) {
    const r = await getDatabase()
      .prepare(
        "SELECT eventData FROM customer_lifecycle_events WHERE externalEventId=?",
      )
      .bind(id)
      .first<{ eventData: string }>();
    return r ? parse<CustomerLifecycleEvent>(r.eventData) : null;
  }
  async events() {
    const { results = [] } = await getDatabase()
      .prepare(
        "SELECT eventData FROM customer_lifecycle_events ORDER BY occurredAt DESC",
      )
      .all<{ eventData: string }>();
    return results.map((x) => parse<CustomerLifecycleEvent>(x.eventData));
  }
  async saveEvent(x: Omit<CustomerLifecycleEvent, "id" | "createdAt">) {
    const old = await this.event(x.externalEventId);
    if (old) return old;
    const saved = {
      ...x,
      id: randomUUID(),
      createdAt: new Date().toISOString(),
    };
    await getDatabase()
      .prepare(
        "INSERT INTO customer_lifecycle_events (id,externalEventId,customerReference,eventType,eventData,occurredAt,createdAt) VALUES (?,?,?,?,?,?,?)",
      )
      .bind(
        saved.id,
        saved.externalEventId,
        saved.customerReference,
        saved.eventType,
        JSON.stringify(saved),
        saved.occurredAt,
        saved.createdAt,
      )
      .run();
    return saved;
  }
  async actions() {
    const { results = [] } = await getDatabase()
      .prepare(
        "SELECT actionData FROM retention_actions ORDER BY updatedAt DESC",
      )
      .all<{ actionData: string }>();
    return results.map((x) => parse<RetentionAction>(x.actionData));
  }
  async saveAction(x: RetentionAction) {
    const now = new Date().toISOString(),
      saved = { ...x, updatedAt: now };
    await getDatabase()
      .prepare(
        "INSERT INTO retention_actions (id,customerReference,status,actionData,createdAt,updatedAt) VALUES (?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET status=excluded.status,actionData=excluded.actionData,updatedAt=excluded.updatedAt",
      )
      .bind(
        saved.id,
        saved.customerReference,
        saved.status,
        JSON.stringify(saved),
        saved.createdAt,
        now,
      )
      .run();
    return saved;
  }
}
export const customerRetentionRepository = new CustomerRetentionRepository();
