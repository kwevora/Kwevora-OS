"use client";

import { useKAIRuntime } from "../hooks/useKAIRuntime";

export default function GamePlanPage() {
  const runtime = useKAIRuntime();
  const report = runtime.overnightReport;

  if (!report) {
    return (
      <main className="p-10 text-white">
        <h1 className="text-4xl font-bold">Today's Game Plan</h1>

        <div className="mt-8 rounded-2xl border border-zinc-700 bg-zinc-900 p-6">
          <p>No overnight report is available.</p>
          <p className="mt-2 text-zinc-400">
            End your day first so KAI can prepare tomorrow's plan.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="p-10 text-white space-y-8">
      <h1 className="text-5xl font-black">Today's Game Plan</h1>

      <div className="rounded-2xl border border-cyan-500/30 bg-cyan-950/10 p-8">
        <p className="text-sm tracking-[0.3em] text-cyan-300 font-bold">
          TODAY'S PRIORITY
        </p>

        <h2 className="mt-3 text-3xl font-black">
          {report.recommendation}
        </h2>
      </div>

      <div className="rounded-2xl border border-zinc-700 bg-zinc-900 p-8">
        <p className="text-sm tracking-[0.3em] text-cyan-300 font-bold">
          WHAT KAI PREPARED
        </p>

        <p className="mt-4 text-lg leading-8">{report.summary}</p>
      </div>

      <div className="rounded-2xl border border-zinc-700 bg-zinc-900 p-8">
        <p className="text-sm tracking-[0.3em] text-cyan-300 font-bold">
          WAITING FOR YOUR APPROVAL
        </p>

        <p className="mt-4 text-lg">{report.question}</p>
      </div>

      <div className="rounded-2xl border border-green-500/30 bg-green-950/10 p-8">
        <p className="text-sm tracking-[0.3em] text-green-300 font-bold">
          AFTER YOU PRESS APPROVE
        </p>

        <ul className="mt-5 space-y-3 text-lg">
          <li>✅ KAI begins executing today's plan.</li>
          <li>✅ Content creation starts automatically.</li>
          <li>✅ Progress is tracked in the workspace.</li>
          <li>✅ Overnight learning begins again after End Day.</li>
        </ul>
      </div>
    </main>
  );
}