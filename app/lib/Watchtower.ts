import { randomUUID } from "crypto";

export type WatchEventSeverity =
  | "low"
  | "medium"
  | "high"
  | "critical";

export type WatchEvent = {
  id: string;
  source: string;
  category: string;
  title: string;
  description: string;
  severity: WatchEventSeverity;
  detectedAt: string;
  handled: boolean;
};

export type WatchtowerStatus = {
  startedAt: string;
  completedAt: string;

  totalEvents: number;

  criticalEvents: number;

  highPriorityEvents: number;

  departmentsNotified: string[];

  summary: string;
};

export class Watchtower {
  private events: WatchEvent[] = [];

  report(event: Omit<WatchEvent, "id" | "detectedAt" | "handled">): WatchEvent {
    const watchEvent: WatchEvent = {
      id: randomUUID(),
      detectedAt: new Date().toISOString(),
      handled: false,
      ...event,
    };

    this.events.unshift(watchEvent);

    return watchEvent;
  }

  pending(): WatchEvent[] {
    return this.events.filter(
      (event) => !event.handled,
    );
  }

  resolve(id: string): boolean {
    const event = this.events.find(
      (item) => item.id === id,
    );

    if (!event) {
      return false;
    }

    event.handled = true;

    return true;
  }

  latest(limit = 100): WatchEvent[] {
    return this.events.slice(0, limit);
  }

  summarize(): WatchtowerStatus {
    const pending =
      this.pending();

    return {
      startedAt:
        pending.at(-1)?.detectedAt ??
        new Date().toISOString(),

      completedAt:
        new Date().toISOString(),

      totalEvents:
        pending.length,

      criticalEvents:
        pending.filter(
          (event) =>
            event.severity ===
            "critical",
        ).length,

      highPriorityEvents:
        pending.filter(
          (event) =>
            event.severity ===
              "critical" ||
            event.severity ===
              "high",
        ).length,

      departmentsNotified: [],

      summary:
        pending.length === 0
          ? "No important business changes detected."
          : `${pending.length} business event(s) require attention.`,
    };
  }
}

export const watchtower =
  new Watchtower();