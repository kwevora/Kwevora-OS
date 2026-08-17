import { NextResponse } from "next/server";
import { revenueAttributionBrain } from "../../../lib/RevenueAttributionBrain";
import type { AttributionEventType } from "../../../lib/database/RevenueAttributionRepository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EVENT_TYPES = new Set<AttributionEventType>([
  "view",
  "click",
  "lead",
  "sale",
  "revenue",
]);

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function number(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export async function GET() {
  try {
    return NextResponse.json({
      success: true,
      report: await revenueAttributionBrain.summary(),
    });
  } catch (error) {
    console.error("Revenue attribution report failed:", error);
    return NextResponse.json(
      {
        success: false,
        report: null,
        message: "KAI could not load revenue attribution.",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const executionPlanId = text(body.executionPlanId);
    const eventType = text(body.eventType) as AttributionEventType;
    const source = text(body.source);
    if (!executionPlanId || !EVENT_TYPES.has(eventType) || !source) {
      return NextResponse.json(
        {
          success: false,
          message:
            "executionPlanId, a valid eventType, and source are required.",
        },
        { status: 400 },
      );
    }
    const event = await revenueAttributionBrain.record({
      executionPlanId,
      eventType,
      quantity: number(body.quantity, 1),
      amount: number(body.amount, 0),
      currency: text(body.currency) || "USD",
      source,
      externalEventId: text(body.externalEventId) || undefined,
      metadata:
        body.metadata &&
        typeof body.metadata === "object" &&
        !Array.isArray(body.metadata)
          ? (body.metadata as Record<string, unknown>)
          : {},
      occurredAt: text(body.occurredAt) || undefined,
    });
    return NextResponse.json({
      success: true,
      event,
      attribution: await revenueAttributionBrain.forCycle(executionPlanId),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "KAI could not save the attribution event.",
      },
      { status: 400 },
    );
  }
}
