"use client";

import { useEffect, useState } from "react";
import { runReasoningEngine } from "../core/runtime/reasoningEngine";
import { getKaiMemory } from "../core/runtime/memoryStore";
import { useKAIRuntime } from "../hooks/useKAIRuntime";

export default function KAIReasoning() {
  const runtime = useKAIRuntime();
  const [mounted, setMounted] = useState(false);
  const [reasoning, setReasoning] = useState<ReturnType<
    typeof runReasoningEngine
  > | null>(null);

  useEffect(() => {
    setMounted(true);
    setReasoning(runReasoningEngine(getKaiMemory(), runtime));
  }, [runtime]);

  if (!mounted || !reasoning) {
    return (
      <section className="rounded-3xl border border-yellow-500/30 bg-yellow-950/10 p-8">
        <p className="text-sm font-bold tracking-[0.35em] text-yellow-300">
          KAI DECISION INTELLIGENCE
        </p>
        <h2 className="mt-4 text-4xl font-black">
          Loading KAI’s executive reasoning...
        </h2>
      </section>
    );
  }

  return (
    <section className="rounded-3xl border border-yellow-500/30 bg-yellow-950/10 p-8">
      <p className="text-sm font-bold tracking-[0.35em] text-yellow-300">
        KAI DECISION INTELLIGENCE
      </p>

      <h2 className="mt-4 text-4xl font-black">
        If I were running KWEVORA today, here’s what I would do first.
      </h2>

      <div className="mt-8 rounded-2xl border border-white/10 bg-black/30 p-6">
        <p className="text-sm font-bold tracking-[0.25em] text-yellow-300">
          EXECUTIVE SUMMARY
        </p>
        <p className="mt-3 text-lg leading-8 text-gray-300">
          {reasoning.executiveSummary}
        </p>
      </div>

      <div className="mt-6 rounded-2xl border border-green-500/30 bg-green-950/10 p-6">
        <p className="text-sm font-bold tracking-[0.25em] text-green-300">
          CHOSEN STRATEGY
        </p>
        <h3 className="mt-3 text-3xl font-black">
          {reasoning.chosenStrategy}
        </h3>
        <p className="mt-4 text-lg leading-8 text-gray-300">
          {reasoning.recommendation}
        </p>
        <div className="mt-5 inline-flex rounded-full bg-green-600/20 px-5 py-2 text-sm font-bold text-green-300">
          Confidence: {reasoning.confidence}%
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-cyan-500/30 bg-cyan-950/10 p-6">
        <p className="text-sm font-bold tracking-[0.25em] text-cyan-300">
          RANKED PRIORITIES
        </p>

        <div className="mt-5 grid gap-4">
          {reasoning.priorities.map((priority) => (
            <article
              key={priority.title}
              className="rounded-xl border border-white/10 bg-black/30 p-5"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-2xl font-black">
                  #{priority.rank} {priority.title}
                </h3>

                <span className="rounded-full bg-cyan-600/20 px-4 py-2 text-sm font-bold text-cyan-300">
                  {priority.confidence}% confident
                </span>
              </div>

              <p className="mt-3 text-gray-300">{priority.reason}</p>

              <div className="mt-5 grid gap-3 md:grid-cols-5">
                <Score label="Impact" value={priority.score.impact} />
                <Score label="Speed" value={priority.score.speed} />
                <Score
                  label="Difficulty"
                  value={priority.score.difficulty}
                />
                <Score
                  label="Revenue"
                  value={priority.score.revenuePotential}
                />
                <Score label="Urgency" value={priority.score.urgency} />
              </div>
            </article>
          ))}
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-white/10 bg-black/30 p-6">
        <p className="text-sm font-bold tracking-[0.25em] text-yellow-300">
          WHAT I NOTICED
        </p>
        <p className="mt-3 text-lg leading-8 text-gray-300">
          {reasoning.observation}
        </p>
      </div>

      <div className="mt-6 rounded-2xl border border-white/10 bg-black/30 p-6">
        <p className="text-sm font-bold tracking-[0.25em] text-yellow-300">
          DECISION FACTORS
        </p>

        <div className="mt-4 grid gap-3">
          {reasoning.decisionFactors.map((factor) => (
            <div
              key={factor.label}
              className="rounded-xl border border-white/10 bg-white/5 p-4"
            >
              <p className="font-black">{factor.label}</p>
              <p className="mt-1 text-gray-300">{factor.detail}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-white/10 bg-black/30 p-6">
        <p className="text-sm font-bold tracking-[0.25em] text-yellow-300">
          WHY IT MATTERS
        </p>
        <p className="mt-3 text-lg leading-8 text-gray-300">
          {reasoning.reasoning}
        </p>
      </div>

      <div className="mt-6 rounded-2xl border border-red-500/30 bg-red-950/10 p-6">
        <p className="text-sm font-bold tracking-[0.25em] text-red-300">
          WHAT I DID NOT CHOOSE
        </p>

        <div className="mt-4 grid gap-3">
          {reasoning.rejectedOptions.map((option) => (
            <div
              key={option.label}
              className="rounded-xl border border-white/10 bg-black/30 p-4"
            >
              <p className="font-black">{option.label}</p>
              <p className="mt-1 text-gray-300">{option.detail}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-purple-500/30 bg-purple-950/10 p-6">
        <p className="text-sm font-bold tracking-[0.25em] text-purple-300">
          NEXT ACTION
        </p>
        <p className="mt-3 text-2xl font-black">{reasoning.nextAction}</p>
      </div>

      <div className="mt-6 rounded-2xl border border-cyan-500/30 bg-cyan-950/10 p-6">
        <p className="text-sm font-bold tracking-[0.25em] text-cyan-300">
          CONTENT DIRECTION
        </p>
        <p className="mt-3 text-lg leading-8 text-gray-300">
          {reasoning.contentDirection}
        </p>
      </div>

      <div className="mt-6 rounded-2xl border border-purple-500/30 bg-purple-950/10 p-6">
        <p className="text-sm font-bold tracking-[0.25em] text-purple-300">
          ONE QUESTION
        </p>
        <p className="mt-3 text-2xl font-black">{reasoning.question}</p>
      </div>
    </section>
  );
}

function Score({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-center">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-400">
        {label}
      </p>
      <p className="mt-2 text-2xl font-black">{value}</p>
    </div>
  );
}