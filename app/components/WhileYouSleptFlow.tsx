"use client";

import { useEffect, useState } from "react";
import { useKAIRuntime } from "../hooks/useKAIRuntime";

export default function WhileYouSleptFlow() {
  const runtime = useKAIRuntime();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const report = mounted ? runtime.overnightReport : null;

  return (
    <section className="rounded-3xl border border-purple-500/30 bg-purple-950/10 p-8">
      <p className="text-sm font-bold tracking-[0.35em] text-purple-300">
        WHILE YOU SLEPT
      </p>

      <h2 className="mt-4 text-4xl font-black">
        {!mounted
          ? "Loading KAI’s overnight work..."
          : report
          ? "Here’s what I prepared."
          : "I’m getting ready."}
      </h2>

      <p className="mt-5 max-w-4xl text-xl leading-8 text-gray-300">
        {!mounted
          ? "KAI is loading the latest runtime."
          : report
          ? report.summary
          : "Run the overnight autopilot so KAI can prepare real work for your next morning review."}
      </p>

      {mounted && report && (
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-black/30 p-5">
            <p className="text-sm font-bold tracking-[0.25em] text-purple-300">
              MORNING BRIEF
            </p>
            <p className="mt-3 text-gray-300">{report.morningBrief}</p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/30 p-5">
            <p className="text-sm font-bold tracking-[0.25em] text-purple-300">
              MY RECOMMENDATION
            </p>
            <p className="mt-3 text-gray-300">{report.recommendation}</p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/30 p-5 md:col-span-2">
            <p className="text-sm font-bold tracking-[0.25em] text-purple-300">
              ONE QUESTION
            </p>
            <p className="mt-3 text-gray-300">{report.question}</p>
          </div>
        </div>
      )}
    </section>
  );
}