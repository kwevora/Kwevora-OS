"use client";

import { useEffect, useState } from "react";

type OvernightReport = {
  startedAt: string;
  finishedAt: string;
  summary: string;
  completedWork: string[];
  opportunities: string[];
  warnings: string[];
  nextOwnerDecision: string;
};

type OvernightResponse = {
  success: boolean;
  report: OvernightReport | null;
};

export default function OvernightPage() {
  const [loading, setLoading] = useState(true);
  const [report, setReport] =
    useState<OvernightReport | null>(null);

  useEffect(() => {
    async function loadReport() {
      try {
        const response =
          await fetch(
            "/api/kai/overnight/latest",
          );

        const data: OvernightResponse =
          await response.json();

        if (data.success) {
          setReport(data.report);
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }

    loadReport();
  }, []);

  if (loading) {
    return (
      <main className="p-10 text-white">
        <h1 className="text-5xl font-black">
          While You Slept
        </h1>

        <div className="mt-8 rounded-2xl border border-zinc-700 bg-zinc-900 p-6">
          KAI is loading the latest overnight report...
        </div>
      </main>
    );
  }

  if (!report) {
    return (
      <main className="p-10 text-white">
        <h1 className="text-5xl font-black">
          While You Slept
        </h1>

        <div className="mt-8 rounded-2xl border border-zinc-700 bg-zinc-900 p-6">
          KAI hasn't completed an overnight shift yet.
        </div>
      </main>
    );
  }

  return (
    <main className="space-y-8 p-10 text-white">
      <h1 className="text-5xl font-black">
        While You Slept
      </h1>

      <section className="rounded-2xl border border-zinc-700 bg-zinc-900 p-6">
        <h2 className="mb-4 text-2xl font-bold">
          Summary
        </h2>

        <p className="text-zinc-300">
          {report.summary}
        </p>
      </section>

      <section className="rounded-2xl border border-zinc-700 bg-zinc-900 p-6">
        <h2 className="mb-4 text-2xl font-bold">
          What KAI Completed
        </h2>

        <ul className="space-y-3">
          {report.completedWork.map(
            (item) => (
              <li key={item}>
                ✅ {item}
              </li>
            ),
          )}
        </ul>
      </section>

      <section className="rounded-2xl border border-zinc-700 bg-zinc-900 p-6">
        <h2 className="mb-4 text-2xl font-bold">
          Opportunities Found
        </h2>

        <ul className="space-y-3">
          {report.opportunities.map(
            (item) => (
              <li key={item}>
                🚀 {item}
              </li>
            ),
          )}
        </ul>
      </section>

      {report.warnings.length > 0 && (
        <section className="rounded-2xl border border-yellow-700 bg-yellow-950/20 p-6">
          <h2 className="mb-4 text-2xl font-bold">
            Attention Needed
          </h2>

          <ul className="space-y-3">
            {report.warnings.map(
              (item) => (
                <li key={item}>
                  ⚠️ {item}
                </li>
              ),
            )}
          </ul>
        </section>
      )}

      <section className="rounded-2xl border border-purple-700 bg-purple-950/20 p-6">
        <h2 className="mb-4 text-2xl font-bold">
          One Decision Waiting
        </h2>

        <p className="text-lg">
          {report.nextOwnerDecision}
        </p>
      </section>
    </main>
  );
}