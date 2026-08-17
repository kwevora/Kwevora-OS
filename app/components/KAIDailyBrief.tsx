"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import KAIMorningLearningReport from "./KAIMorningLearningReport";

type ExecutivePriority = {
  id: string;
  title: string;
  reason: string;
  urgency: number;
  ownerRequired: boolean;
};

type DepartmentReport = {
  department: string;
  status: string;
  healthScore: number;
  confidence: number;
  summary: string;
  biggestRisk: string;
  biggestOpportunity: string;
  requiresOwnerAttention: boolean;
  canOperateAutomatically: boolean;
};

type ExecutiveReview = {
  summary: string;
  priorities: ExecutivePriority[];
  ownerTasks: ExecutivePriority[];
  kaiTasks: ExecutivePriority[];
  departments: DepartmentReport[];
  biggestRisk: string;
  biggestOpportunity: string;
  confidence: number;
};

type OvernightReport = {
  startedAt: string;
  finishedAt: string;
  summary: string;
  completedWork: string[];
  opportunities: string[];
  warnings: string[];
  nextOwnerDecision: string;
  contentCreated: boolean;
  createdContentTitle: string;
  executiveReview: ExecutiveReview;
  executivePriority: string;
  ownerTasks: string[];
  kaiTasks: string[];
  biggestRisk: string;
  biggestOpportunity: string;
  organizationHealth: number;
  organizationTrend: string;
  judgment: string;
  judgmentConfidence: number;
  executionPlanId: string;
  executionStatus: string;
  executionProgress: number;
  executionNextAction: string;
};

type OvernightApiResponse = {
  success: boolean;
  report: OvernightReport | null;
  reportId?: string;
  createdAt?: string;
  message?: string;
};

function cleanList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (item): item is string =>
      typeof item === "string" && item.trim().length > 0,
  );
}

function formatTrend(value: string): string {
  if (!value) {
    return "Unknown";
  }

  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatStatus(value: string): string {
  return formatTrend(value || "planned");
}

export default function KAIDailyBrief() {
  const [report, setReport] = useState<OvernightReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadBrief = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/kai/overnight", {
        method: "GET",
        cache: "no-store",
      });

      const data = (await response.json()) as OvernightApiResponse;

      if (!response.ok || !data.success || !data.report) {
        throw new Error(
          data.message || "KAI could not load the latest overnight report.",
        );
      }

      setReport(data.report);
    } catch (currentError) {
      setReport(null);
      setError(
        currentError instanceof Error
          ? currentError.message
          : "KAI could not load the latest overnight report.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadBrief();
  }, [loadBrief]);

  const departments = report?.executiveReview?.departments ?? [];

  const departmentsNeedingAttention = useMemo(
    () =>
      departments.filter(
        (department) => department.requiresOwnerAttention,
      ),
    [departments],
  );

  const autonomousDepartments = useMemo(
    () =>
      departments.filter(
        (department) => department.canOperateAutomatically,
      ),
    [departments],
  );

  if (loading) {
    return (
      <section className="rounded-3xl border border-cyan-500/30 bg-cyan-950/10 p-8">
        <p className="text-sm font-bold tracking-[0.35em] text-cyan-300">
          MORNING BRIEF
        </p>

        <h2 className="mt-4 text-4xl font-black">
          Loading KAI&apos;s overnight work...
        </h2>

        <p className="mt-6 max-w-4xl text-lg leading-8 text-gray-300">
          KAI is loading the latest executive review, judgment, and execution
          plan.
        </p>
      </section>
    );
  }

  if (!report) {
    return (
      <section className="rounded-3xl border border-red-500/30 bg-red-950/10 p-8">
        <p className="text-sm font-bold tracking-[0.35em] text-red-300">
          MORNING BRIEF
        </p>

        <h2 className="mt-4 text-4xl font-black">
          The latest brief could not be loaded.
        </h2>

        <p className="mt-6 max-w-4xl text-lg leading-8 text-gray-300">
          {error}
        </p>

        <button
          type="button"
          onClick={() => void loadBrief()}
          className="mt-6 rounded-xl bg-white px-5 py-3 font-black text-black transition hover:bg-gray-200"
        >
          Try Again
        </button>
      </section>
    );
  }

  const completedWork = cleanList(report.completedWork);
  const ownerTasks = cleanList(report.ownerTasks);
  const kaiTasks = cleanList(report.kaiTasks);
  const warnings = cleanList(report.warnings);
  const opportunities = cleanList(report.opportunities);

  return (
    <section className="overflow-hidden rounded-3xl border border-cyan-500/30 bg-gradient-to-br from-cyan-950/20 via-black to-black">
      <div className="p-8">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <p className="text-sm font-bold tracking-[0.35em] text-cyan-300">
              MORNING BRIEF
            </p>

            <h2 className="mt-4 text-4xl font-black">
              Here&apos;s what matters today.
            </h2>

            <p className="mt-5 max-w-4xl text-lg leading-8 text-gray-300">
              {report.summary}
            </p>
          </div>

          <div className="grid w-full gap-3 sm:grid-cols-3 xl:w-auto">
            <MetricCard
              label="Organization"
              value={`${report.organizationHealth ?? 0}%`}
              detail={formatTrend(report.organizationTrend)}
            />

            <MetricCard
              label="Judgment"
              value={`${report.judgmentConfidence ?? 0}%`}
              detail="Confidence"
            />

            <MetricCard
              label="Execution"
              value={`${report.executionProgress ?? 0}%`}
              detail={formatStatus(report.executionStatus)}
            />
          </div>
        </div>

        <div className="mt-6">
          <KAIMorningLearningReport />
        </div>

        <div className="mt-8 grid gap-5 lg:grid-cols-3">
          <BriefCard
            number="1"
            label="What KAI finished"
            title={`${completedWork.length} completed item${completedWork.length === 1 ? "" : "s"}`}
            text={
              completedWork[0] ||
              "KAI completed the overnight review and prepared the day."
            }
          />

          <BriefCard
            number="2"
            label="What needs you"
            title={`${ownerTasks.length} owner decision${ownerTasks.length === 1 ? "" : "s"}`}
            text={
              ownerTasks[0] ||
              "Nothing currently requires your attention."
            }
          />

          <BriefCard
            number="3"
            label="What KAI can handle"
            title={`${kaiTasks.length} active task${kaiTasks.length === 1 ? "" : "s"}`}
            text={
              kaiTasks[0] ||
              "KAI is monitoring the business for the next executable action."
            }
          />
        </div>

        <div className="mt-8 rounded-3xl border border-purple-500/30 bg-purple-500/10 p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm font-bold tracking-[0.25em] text-purple-300">
                TODAY&apos;S BEST MOVE
              </p>

              <h3 className="mt-3 text-3xl font-black">
                {report.biggestOpportunity || report.executivePriority}
              </h3>
            </div>

            <div className="rounded-2xl border border-purple-400/20 bg-black/30 px-5 py-4">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-gray-400">
                KAI&apos;s judgment
              </p>

              <p className="mt-2 text-lg font-black text-purple-200">
                {report.judgmentConfidence ?? 0}% confidence
              </p>
            </div>
          </div>

          <p className="mt-6 max-w-4xl text-lg leading-8 text-gray-200">
            {report.judgment || report.executiveReview?.summary}
          </p>

          <div className="mt-6 rounded-2xl border border-white/10 bg-black/30 p-5">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-gray-400">
              Next action already prepared
            </p>

            <p className="mt-3 text-xl font-black text-white">
              {report.executionNextAction || report.nextOwnerDecision}
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-5 xl:grid-cols-2">
          <ActionList
            title="Waiting On You"
            emptyText="No owner decisions are currently blocking KAI."
            items={ownerTasks}
            accent="amber"
          />

          <ActionList
            title="KAI Is Handling"
            emptyText="KAI is waiting for the next executable priority."
            items={kaiTasks}
            accent="cyan"
          />
        </div>

        {departments.length > 0 && (
          <div className="mt-6 rounded-3xl border border-white/10 bg-white/[0.025] p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm font-bold tracking-[0.25em] text-gray-400">
                  DEPARTMENT REVIEW
                </p>

                <h3 className="mt-2 text-2xl font-black">
                  KAI reviewed {departments.length} department
                  {departments.length === 1 ? "" : "s"}.
                </h3>
              </div>

              <p className="text-sm text-gray-400">
                {departmentsNeedingAttention.length} need attention ·{" "}
                {autonomousDepartments.length} can continue automatically
              </p>
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              {departments.map((department) => (
                <DepartmentCard
                  key={department.department}
                  department={department}
                />
              ))}
            </div>
          </div>
        )}

        {(opportunities.length > 0 || warnings.length > 0) && (
          <details className="mt-6 rounded-2xl border border-white/10 bg-white/[0.025]">
            <summary className="cursor-pointer list-none px-6 py-5 font-bold text-cyan-200">
              View KAI&apos;s supporting details
            </summary>

            <div className="grid gap-5 border-t border-white/10 px-6 py-6 lg:grid-cols-2">
              <ActionList
                title="Opportunities Considered"
                emptyText="No additional opportunities were recorded."
                items={opportunities}
                accent="purple"
              />

              <ActionList
                title="Risks and Missing Information"
                emptyText="No important warnings were recorded."
                items={warnings}
                accent="red"
              />
            </div>
          </details>
        )}
      </div>
    </section>
  );
}

function MetricCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="min-w-40 rounded-2xl border border-white/10 bg-black/30 p-4">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-gray-500">
        {label}
      </p>

      <p className="mt-2 text-2xl font-black text-white">
        {value}
      </p>

      <p className="mt-1 text-sm text-gray-400">
        {detail}
      </p>
    </div>
  );
}

function BriefCard({
  number,
  label,
  title,
  text,
}: {
  number: string;
  label: string;
  title: string;
  text: string;
}) {
  return (
    <article className="rounded-2xl border border-white/10 bg-white/[0.025] p-5">
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-cyan-500/15 font-black text-cyan-300">
        {number}
      </div>

      <p className="mt-4 text-sm font-bold uppercase tracking-[0.18em] text-gray-500">
        {label}
      </p>

      <h3 className="mt-2 text-xl font-black text-white">
        {title}
      </h3>

      <p className="mt-3 leading-7 text-gray-300">
        {text}
      </p>
    </article>
  );
}

function ActionList({
  title,
  emptyText,
  items,
  accent,
}: {
  title: string;
  emptyText: string;
  items: string[];
  accent: "amber" | "cyan" | "purple" | "red";
}) {
  const accentClasses = {
    amber: "border-amber-500/20 bg-amber-500/10 text-amber-300",
    cyan: "border-cyan-500/20 bg-cyan-500/10 text-cyan-300",
    purple: "border-purple-500/20 bg-purple-500/10 text-purple-300",
    red: "border-red-500/20 bg-red-500/10 text-red-300",
  }[accent];

  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
      <p
        className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] ${accentClasses}`}
      >
        {title}
      </p>

      <div className="mt-4 space-y-3">
        {items.length === 0 ? (
          <p className="leading-7 text-gray-400">
            {emptyText}
          </p>
        ) : (
          items.slice(0, 5).map((item) => (
            <div key={item} className="flex gap-3">
              <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-white/50" />

              <p className="leading-7 text-gray-300">
                {item}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function DepartmentCard({
  department,
}: {
  department: DepartmentReport;
}) {
  return (
    <article className="rounded-2xl border border-white/10 bg-black/20 p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h4 className="text-xl font-black text-white">
            {department.department}
          </h4>

          <p className="mt-1 text-sm text-gray-500">
            {formatStatus(department.status)}
          </p>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.15em] text-gray-500">
            Health
          </p>

          <p className="mt-1 text-xl font-black text-gray-200">
            {department.healthScore}%
          </p>
        </div>
      </div>

      <p className="mt-4 leading-7 text-gray-300">
        {department.summary}
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-red-500/10 bg-red-500/5 p-3">
          <p className="text-xs font-bold uppercase tracking-[0.15em] text-red-300/70">
            Risk
          </p>

          <p className="mt-2 text-sm leading-6 text-gray-400">
            {department.biggestRisk}
          </p>
        </div>

        <div className="rounded-xl border border-emerald-500/10 bg-emerald-500/5 p-3">
          <p className="text-xs font-bold uppercase tracking-[0.15em] text-emerald-300/70">
            Opportunity
          </p>

          <p className="mt-2 text-sm leading-6 text-gray-400">
            {department.biggestOpportunity}
          </p>
        </div>
      </div>
    </article>
  );
}
