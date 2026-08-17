"use client";

import { useEffect, useMemo, useState } from "react";
import { useKAIRuntime } from "../hooks/useKAIRuntime";
import KAIMorningLearningReport from "./KAIMorningLearningReport";

type ServerOvernightReport = {
  summary: string;
  completedWork: string[];
  opportunities: string[];
  warnings: string[];
  nextOwnerDecision: string;
  contentCreated: boolean;
  createdContentTitle: string;
  executivePriority: string;
  ownerTasks: string[];
  kaiTasks: string[];
  biggestRisk: string;
  biggestOpportunity: string;
  organizationHealth: number;
  organizationTrend: string;
  judgment: string;
  judgmentConfidence: number;
  executionStatus: string;
  executionProgress: number;
  executionNextAction: string;
};

type OvernightResponse = {
  success: boolean;
  report: ServerOvernightReport | null;
  message?: string;
};

function trendLabel(value: string): string {
  if (value === "improving") return "Improving";
  if (value === "declining") return "Needs attention";
  if (value === "stable") return "Stable";
  return "Building history";
}

function statusLabel(value: string): string {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function WhileYouSleptFlow() {
  const runtime = useKAIRuntime();

  const [mounted, setMounted] = useState(false);
  const [serverReport, setServerReport] =
    useState<ServerOvernightReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadMessage, setLoadMessage] = useState("");

  useEffect(() => {
    setMounted(true);

    let cancelled = false;

    async function loadLatestReport() {
      try {
        const response = await fetch("/api/kai/overnight", {
          method: "GET",
          cache: "no-store",
        });

        const data =
          (await response.json()) as OvernightResponse;

        if (cancelled) return;

        if (response.ok && data.success && data.report) {
          setServerReport(data.report);
          setLoadMessage("");
        } else {
          setLoadMessage(
            data.message ??
              "KAI has not completed an overnight shift yet.",
          );
        }
      } catch {
        if (!cancelled) {
          setLoadMessage(
            "KAI could not load the latest overnight report.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadLatestReport();

    return () => {
      cancelled = true;
    };
  }, []);

  const clientReport =
    mounted ? runtime.overnightReport : null;

  const headline = useMemo(() => {
    if (loading) return "Loading KAI’s overnight work...";
    if (serverReport) return "I handled the overnight review.";
    if (clientReport) return "Here’s what I prepared.";
    return "I’m ready for the next overnight shift.";
  }, [clientReport, loading, serverReport]);

  if (serverReport) {
    return (
      <section className="overflow-hidden rounded-3xl border border-purple-500/30 bg-gradient-to-br from-purple-950/30 via-black to-black">
        <div className="p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm font-bold tracking-[0.35em] text-purple-300">
                WHILE YOU SLEPT
              </p>

              <h2 className="mt-4 text-4xl font-black">
                {headline}
              </h2>

              <p className="mt-5 max-w-4xl text-lg leading-8 text-gray-300">
                {serverReport.summary}
              </p>
            </div>

            <div className="grid w-full max-w-md grid-cols-2 gap-3">
              <MetricCard
                label="Organization health"
                value={`${serverReport.organizationHealth}%`}
              />

              <MetricCard
                label="Current trend"
                value={trendLabel(
                  serverReport.organizationTrend,
                )}
              />

              <MetricCard
                label="Judgment confidence"
                value={`${serverReport.judgmentConfidence}%`}
              />

              <MetricCard
                label="Execution progress"
                value={`${serverReport.executionProgress}%`}
              />
            </div>
          </div>

          <div className="mt-6">
            <KAIMorningLearningReport />
          </div>

          <div className="mt-8 rounded-3xl border border-cyan-500/25 bg-cyan-500/10 p-6">
            <p className="text-sm font-bold tracking-[0.25em] text-cyan-300">
              TODAY’S BEST MOVE
            </p>

            <h3 className="mt-3 text-3xl font-black text-white">
              {serverReport.biggestOpportunity ||
                serverReport.executivePriority}
            </h3>

            <p className="mt-4 max-w-4xl leading-7 text-gray-300">
              {serverReport.judgment}
            </p>

            <div className="mt-5 rounded-2xl border border-white/10 bg-black/25 p-5">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-400">
                KAI’s next action
              </p>

              <p className="mt-2 text-lg font-bold text-white">
                {serverReport.executionNextAction}
              </p>

              <p className="mt-2 text-sm text-gray-400">
                Execution status:{" "}
                {statusLabel(
                  serverReport.executionStatus,
                )}
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-5 lg:grid-cols-2">
            <TaskList
              label="KAI IS HANDLING"
              emptyText="No autonomous work is waiting."
              items={serverReport.kaiTasks}
            />

            <TaskList
              label="WAITING ON YOU"
              emptyText="Nothing needs your attention right now."
              items={serverReport.ownerTasks}
            />
          </div>

          <div className="mt-6 grid gap-5 lg:grid-cols-2">
            <ListCard
              label="COMPLETED OVERNIGHT"
              items={serverReport.completedWork}
              emptyText="No completed work was reported."
            />

            <ListCard
              label="OPPORTUNITIES FOUND"
              items={serverReport.opportunities}
              emptyText="No new opportunities were reported."
            />
          </div>

          {serverReport.contentCreated ? (
            <div className="mt-6 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-5">
              <p className="text-sm font-bold tracking-[0.2em] text-emerald-300">
                CONTENT READY FOR REVIEW
              </p>

              <p className="mt-3 text-xl font-black text-white">
                {serverReport.createdContentTitle}
              </p>
            </div>
          ) : null}

          <div className="mt-6 rounded-2xl border border-purple-500/25 bg-purple-500/10 p-5">
            <p className="text-sm font-bold tracking-[0.2em] text-purple-300">
              ONE DECISION FROM YOU
            </p>

            <p className="mt-3 text-lg leading-7 text-gray-200">
              {serverReport.nextOwnerDecision}
            </p>
          </div>

          {serverReport.warnings.length > 0 ? (
            <details className="mt-6 rounded-2xl border border-amber-500/20 bg-amber-500/5">
              <summary className="cursor-pointer px-5 py-4 font-bold text-amber-200">
                What KAI is still watching
              </summary>

              <ul className="space-y-3 border-t border-amber-500/15 px-5 py-5 text-sm leading-6 text-gray-300">
                {serverReport.warnings.map(
                  (warning, index) => (
                    <li key={`${warning}-${index}`}>
                      {warning}
                    </li>
                  ),
                )}
              </ul>
            </details>
          ) : null}
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-3xl border border-purple-500/30 bg-purple-950/10 p-8">
      <p className="text-sm font-bold tracking-[0.35em] text-purple-300">
        WHILE YOU SLEPT
      </p>

      <h2 className="mt-4 text-4xl font-black">
        {headline}
      </h2>

      <p className="mt-5 max-w-4xl text-xl leading-8 text-gray-300">
        {loading
          ? "KAI is loading the latest overnight report."
          : clientReport
            ? clientReport.summary
            : loadMessage}
      </p>

      <div className="mt-6">
        <KAIMorningLearningReport />
      </div>

      {mounted && clientReport ? (
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <FallbackCard
            label="MORNING BRIEF"
            text={clientReport.morningBrief}
          />

          <FallbackCard
            label="MY RECOMMENDATION"
            text={clientReport.recommendation}
          />

          <div className="rounded-2xl border border-white/10 bg-black/30 p-5 md:col-span-2">
            <p className="text-sm font-bold tracking-[0.25em] text-purple-300">
              ONE QUESTION
            </p>

            <p className="mt-3 text-gray-300">
              {clientReport.question}
            </p>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function MetricCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-gray-500">
        {label}
      </p>

      <p className="mt-2 text-xl font-black text-white">
        {value}
      </p>
    </div>
  );
}

function TaskList({
  label,
  items,
  emptyText,
}: {
  label: string;
  items: string[];
  emptyText: string;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.025] p-6">
      <p className="text-sm font-bold tracking-[0.22em] text-gray-400">
        {label}
      </p>

      {items.length > 0 ? (
        <ul className="mt-5 space-y-3">
          {items.map((item, index) => (
            <li
              key={`${item}-${index}`}
              className="rounded-2xl border border-white/10 bg-black/25 p-4 leading-7 text-gray-200"
            >
              {item}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-5 text-gray-400">
          {emptyText}
        </p>
      )}
    </div>
  );
}

function ListCard({
  label,
  items,
  emptyText,
}: {
  label: string;
  items: string[];
  emptyText: string;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.025] p-6">
      <p className="text-sm font-bold tracking-[0.22em] text-gray-400">
        {label}
      </p>

      {items.length > 0 ? (
        <ul className="mt-5 space-y-3 text-gray-300">
          {items.slice(0, 8).map((item, index) => (
            <li
              key={`${item}-${index}`}
              className="flex gap-3 leading-7"
            >
              <span className="mt-3 h-1.5 w-1.5 shrink-0 rounded-full bg-purple-300" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-5 text-gray-400">
          {emptyText}
        </p>
      )}
    </div>
  );
}

function FallbackCard({
  label,
  text,
}: {
  label: string;
  text: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/30 p-5">
      <p className="text-sm font-bold tracking-[0.25em] text-purple-300">
        {label}
      </p>

      <p className="mt-3 text-gray-300">
        {text}
      </p>
    </div>
  );
}
