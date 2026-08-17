"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Metric = { name: string; target: number; actual: number | null; percent: number | null };
type CommandItem = {
  id: string;
  title: string;
  product: string;
  status: string;
  stageLabel: string;
  stageNumber: number;
  ownerAttentionRequired: boolean;
  nextAction: string;
  blocker: string | null;
  predictedApproval: number | null;
  approvalPredictionAccuracy: number | null;
  correctionsApplied: string[];
  familiarIssues: string[];
  ownerEdits: string[];
  metrics: Metric[];
  experiment: {
    variable: string;
    hypothesis: string;
    status: string;
    verdict: string | null;
    explanation: string;
  } | null;
  learning: { result: string; score: number; changeNext: string } | null;
  revenueAttribution: {
    views: number;
    clicks: number;
    leads: number;
    sales: number;
    revenue: number;
    clickRate: number;
    salesConversionRate: number;
    classification: string;
  } | null;
  history: Array<{ type: string; at: string; message: string }>;
};
type Report = {
  summary: {
    total: number;
    needsAttention: number;
    awaitingApproval: number;
    blocked: number;
    publishingOrMonitoring: number;
    learned: number;
  };
  topAttention: CommandItem[];
  active: CommandItem[];
  history: CommandItem[];
};

const statusStyle: Record<string, string> = {
  awaiting_review: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  publishing_blocked: "border-red-500/30 bg-red-500/10 text-red-300",
  approved: "border-purple-500/30 bg-purple-500/10 text-purple-300",
  published: "border-cyan-500/30 bg-cyan-500/10 text-cyan-300",
  monitoring: "border-cyan-500/30 bg-cyan-500/10 text-cyan-300",
  learned: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  stopped: "border-gray-500/30 bg-gray-500/10 text-gray-300",
};

export default function KAIPerformanceCommandCenter() {
  const router = useRouter();
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/kai/command-center", { cache: "no-store" })
      .then((response) => response.json())
      .then((data: { success?: boolean; report?: Report }) => {
        if (!cancelled && data.success && data.report) setReport(data.report);
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <section className="mt-8 rounded-3xl border border-white/10 bg-white/[0.025] p-6 text-gray-400">
        KAI is assembling the complete performance picture...
      </section>
    );
  }

  if (!report || report.summary.total === 0) {
    return (
      <section className="mt-8 rounded-3xl border border-white/10 bg-white/[0.025] p-6 sm:p-8">
        <p className="text-sm font-bold uppercase tracking-[0.22em] text-cyan-300">Performance Command Center</p>
        <h2 className="mt-3 text-2xl font-black">The first tracked content cycle will appear here.</h2>
        <p className="mt-3 max-w-3xl text-gray-400">
          KAI will show the path from creation and approval through publishing, measurement, experiments, and learning without inventing activity that has not happened yet.
        </p>
      </section>
    );
  }

  const priorityItems = report.topAttention.length > 0
    ? report.topAttention
    : report.active.slice(0, 3);

  return (
    <section className="mt-8 rounded-3xl border border-cyan-500/20 bg-gradient-to-br from-cyan-950/30 via-black to-purple-950/20 p-6 sm:p-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.22em] text-cyan-300">Performance Command Center</p>
          <h2 className="mt-2 text-3xl font-black">What needs you—and what KAI is handling.</h2>
          <p className="mt-3 max-w-3xl text-gray-400">
            Every content cycle is connected from idea to measured result. Owner-required decisions are ranked first.
          </p>
        </div>
        {report.summary.needsAttention > 0 && (
          <button
            type="button"
            onClick={() => router.push("/review")}
            className="rounded-full bg-cyan-500 px-6 py-3 font-black text-black transition hover:bg-cyan-400"
          >
            Handle {report.summary.needsAttention} decision{report.summary.needsAttention === 1 ? "" : "s"}
          </button>
        )}
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Stat value={report.summary.needsAttention} label="Needs you" tone="text-amber-300" />
        <Stat value={report.summary.awaitingApproval} label="Awaiting approval" />
        <Stat value={report.summary.blocked} label="Blocked" tone="text-red-300" />
        <Stat value={report.summary.publishingOrMonitoring} label="KAI handling" tone="text-cyan-300" />
        <Stat value={report.summary.learned} label="Learned" tone="text-emerald-300" />
      </div>

      <div className="mt-7 space-y-4">
        {priorityItems.map((item) => (
          <CycleCard key={item.id} item={item} onReview={() => router.push("/review")} />
        ))}
      </div>

      {(report.active.length > priorityItems.length || report.history.length > 0) && (
        <details className="mt-5 rounded-2xl border border-white/10 bg-black/25">
          <summary className="cursor-pointer px-5 py-4 font-bold text-gray-300">
            View all active cycles and complete history
          </summary>
          <div className="space-y-4 border-t border-white/10 p-4">
            {[...report.active, ...report.history]
              .filter((item) => !priorityItems.some((priority) => priority.id === item.id))
              .map((item) => (
                <CycleCard key={item.id} item={item} onReview={() => router.push("/review")} compact />
              ))}
          </div>
        </details>
      )}
    </section>
  );
}

function Stat({ value, label, tone = "text-white" }: { value: number; label: string; tone?: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
      <p className={`text-3xl font-black ${tone}`}>{value}</p>
      <p className="mt-1 text-sm text-gray-500">{label}</p>
    </div>
  );
}

function CycleCard({
  item,
  onReview,
  compact = false,
}: {
  item: CommandItem;
  onReview: () => void;
  compact?: boolean;
}) {
  return (
    <article className="rounded-2xl border border-white/10 bg-black/35 p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full border px-3 py-1 text-xs font-black ${statusStyle[item.status] ?? statusStyle.approved}`}>
              {item.stageLabel}
            </span>
            <span className="text-xs font-bold uppercase tracking-[0.15em] text-gray-600">
              Stage {item.stageNumber} of 6
            </span>
          </div>
          <h3 className="mt-3 text-xl font-black">{item.title}</h3>
          <p className="mt-1 text-sm text-gray-500">{item.product}</p>
        </div>
        {item.ownerAttentionRequired && (
          <button type="button" onClick={onReview} className="rounded-full bg-purple-600 px-5 py-2.5 text-sm font-black hover:bg-purple-500">
            Review now
          </button>
        )}
      </div>

      {item.blocker && (
        <div className="mt-4 rounded-xl border border-red-500/25 bg-red-500/10 p-4">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-red-300">What is blocking progress</p>
          <p className="mt-2 text-sm leading-6 text-red-100/80">{item.blocker}</p>
        </div>
      )}

      <p className="mt-4 text-sm leading-6 text-gray-300"><strong className="text-white">Next:</strong> {item.nextAction}</p>

      {!compact && (
        <div className="mt-5 grid gap-4 lg:grid-cols-4">
          <Info label="Approval intelligence">
            <p>{item.predictedApproval === null ? "Building evidence" : `${item.predictedApproval}% predicted approval`}</p>
            {item.correctionsApplied.length > 0 && <p className="mt-2 text-emerald-300">KAI fixed: {item.correctionsApplied.join(" ")}</p>}
            {item.ownerEdits.length > 0 && <p className="mt-2">You changed: {item.ownerEdits.join(", ")}</p>}
          </Info>

          <Info label="Targets vs actual">
            {item.metrics.length === 0 ? (
              <p>No measured target is available yet.</p>
            ) : item.metrics.map((metric) => (
              <div key={metric.name} className="mb-2 last:mb-0">
                <div className="flex justify-between gap-3"><span>{metric.name}</span><span>{metric.actual ?? "—"} / {metric.target}</span></div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full rounded-full bg-cyan-400" style={{ width: `${Math.min(100, metric.percent ?? 0)}%` }} />
                </div>
              </div>
            ))}
          </Info>

          <Info label="Experiment and learning">
            {item.experiment ? (
              <>
                <p className="capitalize">Testing: {item.experiment.variable}</p>
                <p className="mt-2">Verdict: <span className="font-bold uppercase text-purple-300">{item.experiment.verdict ?? "pending"}</span></p>
                <p className="mt-2 text-gray-500">{item.experiment.hypothesis}</p>
              </>
            ) : <p>No controlled experiment is attached.</p>}
            {item.learning && <p className="mt-2 text-emerald-300">Next change: {item.learning.changeNext}</p>}
          </Info>

          <Info label="Revenue attribution">
            {item.revenueAttribution ? (
              <>
                <p>{item.revenueAttribution.views} views → {item.revenueAttribution.clicks} clicks → {item.revenueAttribution.leads} leads → {item.revenueAttribution.sales} sales</p>
                <p className="mt-2 text-emerald-300">${item.revenueAttribution.revenue.toFixed(2)} attributed revenue</p>
                <p className="mt-2">{item.revenueAttribution.clickRate}% click rate · {item.revenueAttribution.salesConversionRate}% sales conversion</p>
                <p className="mt-2 capitalize text-gray-500">{item.revenueAttribution.classification.replaceAll("_", " ")}</p>
              </>
            ) : <p>No attributed traffic or revenue yet.</p>}
          </Info>
        </div>
      )}

      {!compact && item.history.length > 0 && (
        <details className="mt-4 border-t border-white/10 pt-4">
          <summary className="cursor-pointer text-sm font-bold text-gray-400">Complete idea-to-result history</summary>
          <ol className="mt-3 space-y-2">
            {item.history.map((event, index) => (
              <li key={`${event.at}-${index}`} className="flex gap-3 text-sm text-gray-400">
                <span className="font-black text-purple-400">{index + 1}</span>
                <span>{event.message}</span>
              </li>
            ))}
          </ol>
        </details>
      )}
    </article>
  );
}

function Info({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.025] p-4 text-sm leading-6 text-gray-300">
      <p className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-gray-500">{label}</p>
      {children}
    </div>
  );
}
