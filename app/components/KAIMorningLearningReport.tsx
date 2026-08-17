"use client";

import {
  useEffect,
  useState,
} from "react";

type LearningReport = {
  status:
    | "success"
    | "partial"
    | "failure"
    | "monitoring"
    | "waiting";
  headline: string;
  measuredResult: string;
  observations: string[];
  lesson: string;
  decisionImpact: string;
  todayRecommendation: string;
  appliedToCurrentPlan: boolean;
  monitoringCount: number;
  waitingCount: number;
};

type LearningResponse = {
  success: boolean;
  report: LearningReport | null;
};

export default function KAIMorningLearningReport() {
  const [report, setReport] =
    useState<LearningReport | null>(
      null,
    );

  useEffect(() => {
    let cancelled = false;

    void fetch(
      "/api/kai/morning-learning",
      {
        cache: "no-store",
      },
    )
      .then((response) =>
        response.json(),
      )
      .then(
        (data: LearningResponse) => {
          if (
            !cancelled &&
            data.success
          ) {
            setReport(data.report);
          }
        },
      )
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, []);

  if (!report) {
    return null;
  }

  const accent =
    report.status === "success"
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
      : report.status === "failure"
        ? "border-red-500/30 bg-red-500/10 text-red-300"
        : report.status === "partial"
          ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
          : "border-cyan-500/30 bg-cyan-500/10 text-cyan-300";

  return (
    <section className="rounded-3xl border border-white/10 bg-black/25 p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-bold tracking-[0.25em] text-purple-300">
            WHAT KAI LEARNED
          </p>

          <h3 className="mt-3 text-2xl font-black text-white">
            {report.headline}
          </h3>
        </div>

        <span className={`w-fit rounded-full border px-4 py-2 text-sm font-black ${accent}`}>
          {report.measuredResult}
        </span>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        <LearningCard
          label="MEASURED"
          text={
            report.observations[0] ||
            `${report.monitoringCount} result${report.monitoringCount === 1 ? " is" : "s are"} still gathering data.`
          }
        />

        <LearningCard
          label="LEARNED"
          text={report.lesson}
        />

        <LearningCard
          label="CHANGED TODAY"
          text={report.decisionImpact}
        />
      </div>

      <div className="mt-4 rounded-2xl border border-purple-500/20 bg-purple-500/10 p-5">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-purple-300">
          Recommendation after learning
        </p>

        <p className="mt-2 text-lg font-black text-white">
          {report.todayRecommendation}
        </p>
      </div>
    </section>
  );
}

function LearningCard({
  label,
  text,
}: {
  label: string;
  text: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <p className="text-xs font-bold tracking-[0.2em] text-gray-500">
        {label}
      </p>

      <p className="mt-3 leading-7 text-gray-200">
        {text}
      </p>
    </div>
  );
}
