import { randomUUID } from "node:crypto";
import { getDatabase } from "./database";

export type AttributionEventType =
  | "view"
  | "click"
  | "lead"
  | "sale"
  | "revenue"
  | "refund";

export type RevenueAttributionEvent = {
  id: string;
  externalEventId?: string;
  executionPlanId: string;
  eventType: AttributionEventType;
  quantity: number;
  amount: number;
  currency: string;
  source: string;
  metadata: Record<string, unknown>;
  occurredAt: string;
  createdAt: string;
};

type EventRow = Omit<
  RevenueAttributionEvent,
  "metadata" | "externalEventId"
> & {
  externalEventId: string | null;
  metadata: string;
};

function rowToEvent(row: EventRow): RevenueAttributionEvent {
  let metadata: Record<string, unknown> = {};
  try {
    metadata = JSON.parse(row.metadata) as Record<string, unknown>;
  } catch {}
  return {
    ...row,
    externalEventId: row.externalEventId ?? undefined,
    metadata,
  };
}

export class RevenueAttributionRepository {
  async save(input: Omit<RevenueAttributionEvent, "id" | "createdAt">) {
    if (input.externalEventId) {
      const existing = await getDatabase()
        .prepare(
          `SELECT * FROM revenue_attribution_events WHERE externalEventId = ? LIMIT 1`,
        )
        .bind(input.externalEventId)
        .first<EventRow>();
      if (existing) {
        if (input.metadata.cumulativeSnapshot === true) {
          await getDatabase()
            .prepare(
              `UPDATE revenue_attribution_events
             SET quantity = ?, amount = ?, metadata = ?, occurredAt = ?
             WHERE id = ?`,
            )
            .bind(
              Math.max(0, input.quantity),
              Math.max(0, input.amount),
              JSON.stringify(input.metadata),
              input.occurredAt,
              existing.id,
            )
            .run();
          return rowToEvent({
            ...existing,
            quantity: Math.max(0, input.quantity),
            amount: Math.max(0, input.amount),
            metadata: JSON.stringify(input.metadata),
            occurredAt: input.occurredAt,
          });
        }
        return rowToEvent(existing);
      }
    }
    const event: RevenueAttributionEvent = {
      ...input,
      id: randomUUID(),
      createdAt: new Date().toISOString(),
    };
    await getDatabase()
      .prepare(
        `INSERT INTO revenue_attribution_events
       (id, externalEventId, executionPlanId, eventType, quantity, amount,
        currency, source, metadata, occurredAt, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        event.id,
        event.externalEventId ?? null,
        event.executionPlanId,
        event.eventType,
        event.quantity,
        event.amount,
        event.currency,
        event.source,
        JSON.stringify(event.metadata),
        event.occurredAt,
        event.createdAt,
      )
      .run();
    return event;
  }

  async forExecutionPlan(executionPlanId: string) {
    return (
      (
        await getDatabase()
          .prepare(
            `SELECT * FROM revenue_attribution_events
       WHERE executionPlanId = ? ORDER BY occurredAt ASC`,
          )
          .bind(executionPlanId)
          .all<EventRow>()
      ).results ?? []
    ).map(rowToEvent);
  }

  async history(limit = 2000) {
    const safeLimit = Math.max(1, Math.min(10000, Math.floor(limit)));
    return (
      (
        await getDatabase()
          .prepare(
            `SELECT * FROM revenue_attribution_events ORDER BY occurredAt DESC LIMIT ?`,
          )
          .bind(safeLimit)
          .all<EventRow>()
      ).results ?? []
    ).map(rowToEvent);
  }
}

export const revenueAttributionRepository = new RevenueAttributionRepository();
