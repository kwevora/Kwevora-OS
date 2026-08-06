"use client";

import { useEffect, useMemo, useState } from "react";
import { useKAIRuntime } from "../hooks/useKAIRuntime";
import {
  KaiOpportunity,
  runKaiDecisionEngine,
} from "../lib/kaiDecisionEngine";

export default function KAIDailyBrief() {
  const runtime = useKAIRuntime();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const report = mounted ? runtime.overnightReport : null;

  const decision = useMemo(() => {
    if (!mounted) {
      return null;
    }

    return runKaiDecisionEngine({
      businessName: "KWEVORA",
      ownerName: "Kent",
      completedWork: report?.morningBrief
        ? [report.morningBrief]
        : undefined,
      previousDecisions: report?.recommendation
        ? [report.recommendation]
        : undefined,
    });
  }, [mounted, report]);

  if (!mounted || !decision) {
    return (
      <section className="rounded-3xl border border-cyan-500/30 bg-cyan-950/10 p-8">
        <p className="text-sm font-bold tracking-[0.35em] text-cyan-300">
          MORNING BRIEF
        </p>

        <h2 className="mt-4 text-4xl font-black">
          Loading your morning brief...
        </h2>

        <p className="mt-6 max-w-4xl text-lg leading-8 text-gray-300">
          KAI is comparing today&apos;s opportunities and deciding which one
          creates the most value.
        </p>
      </section>
    );
  }

  const topOpportunity = decision.topOpportunity;
  const otherOpportunities = decision.opportunities.slice(1, 4);

  return (
    <section className="overflow-hidden rounded-3xl border border-cyan-500/30 bg-gradient-to-br from-cyan-950/20 via-black to-black">
      <div className="p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-bold tracking-[0.35em] text-cyan-300">
              MORNING BRIEF
            </p>

            <h2 className="mt-4 text-4xl font-black">
              Here&apos;s what matters today.
            </h2>
          </div>

          <div className="w-fit rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2">
            <p className="text-sm font-bold text-cyan-200">
              {topOpportunity.confidence}% confidence
            </p>
          </div>
        </div>

        <p className="mt-6 max-w-4xl text-lg leading-8 text-gray-300">
          {report?.morningBrief || decision.observation}
        </p>

        <div className="mt-8 grid gap-5 lg:grid-cols-3">
          <BriefCard
            number="1"
            label="What happened"
            text={decision.whatHappened[0]}
          />

          <BriefCard
            number="2"
            label="What changed"
            text={decision.whatChanged[0]}
          />

          <BriefCard
            number="3"
            label="What matters most"
            text={decision.whatMattersMost}
          />
        </div>

        <div className="mt-8 rounded-3xl border border-purple-500/30 bg-purple-500/10 p-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-bold tracking-[0.25em] text-purple-300">
                TOP OPPORTUNITY
              </p>

              <h3 className="mt-3 text-3xl font-black">
                {topOpportunity.title}
              </h3>

              <p className="mt-2 text-sm font-bold uppercase tracking-[0.18em] text-purple-200/70">
                {topOpportunity.category}
              </p>
            </div>

            <div className="rounded-2xl border border-purple-400/20 bg-black/30 px-5 py-4 text-center">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-gray-400">
                Priority score
              </p>

              <p className="mt-1 text-3xl font-black text-purple-200">
                {topOpportunity.priorityScore}
              </p>
            </div>
          </div>

          <h4 className="mt-6 text-xl font-black text-white">
            {topOpportunity.recommendation}
          </h4>

          <p className="mt-4 max-w-4xl leading-7 text-gray-300">
            {topOpportunity.reason}
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <ScoreCard label="Impact" score={topOpportunity.impact} />
            <ScoreCard label="Urgency" score={topOpportunity.urgency} />
            <ScoreCard
              label="Confidence"
              score={topOpportunity.confidence}
            />
            <ScoreCard
              label="Effort"
              score={topOpportunity.effort}
              lowerIsBetter
            />
          </div>

          <div className="mt-6 rounded-2xl border border-white/10 bg-black/30 p-5">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-gray-400">
              Expected outcome
            </p>

            <p className="mt-3 leading-7 text-gray-200">
              {topOpportunity.expectedOutcome}
            </p>
          </div>
        </div>

        <details className="mt-6 rounded-2xl border border-white/10 bg-white/[0.025]">
          <summary className="cursor-pointer list-none px-6 py-5 font-bold text-cyan-200">
            Why this opportunity ranked first
          </summary>

          <div className="border-t border-white/10 px-6 py-6">
            <div className="grid gap-5 lg:grid-cols-2">
              <ReasoningList
                title="What KAI will change today"
                items={topOpportunity.changeToday}
              />

              <ReasoningList
                title="What KAI will prepare next"
                items={topOpportunity.prepareNext}
              />
            </div>

            <div className="mt-6 space-y-5">
              {decision.evidence.slice(0, 3).map((signal) => (
                <div
                  key={signal.id}
                  className="rounded-2xl border border-white/10 bg-black/20 p-5"
                >
                  <div className="flex flex-wrap items-center gap-3">
                    <h4 className="font-black text-white">
                      {signal.label}
                    </h4>

                    <span className="rounded-full bg-white/5 px-3 py-1 text-xs font-bold text-gray-400">
                      {signal.importance} importance
                    </span>
                  </div>

                  <p className="mt-3 leading-7 text-gray-400">
                    {signal.meaning}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-2xl border border-cyan-500/20 bg-cyan-500/10 p-5">
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-cyan-300">
                KAI&apos;s conclusion
              </p>

              <p className="mt-3 leading-7 text-gray-200">
                {decision.conclusion}
              </p>
            </div>
          </div>
        </details>

        {otherOpportunities.length > 0 && (
          <div className="mt-6 rounded-3xl border border-white/10 bg-white/[0.025] p-6">
            <p className="text-sm font-bold tracking-[0.25em] text-gray-400">
              OTHER OPPORTUNITIES CONSIDERED
            </p>

            <div className="mt-5 space-y-4">
              {otherOpportunities.map((opportunity, index) => (
                <OpportunityRow
                  key={opportunity.id}
                  rank={index + 2}
                  opportunity={opportunity}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function BriefCard({
  number,
  label,
  text,
}: {
  number: string;
  label: string;
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

      <p className="mt-3 leading-7 text-gray-200">
        {text}
      </p>
    </article>
  );
}

function ScoreCard({
  label,
  score,
  lowerIsBetter = false,
}: {
  label: string;
  score: number;
  lowerIsBetter?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-gray-500">
        {label}
      </p>

      <div className="mt-2 flex items-end justify-between gap-3">
        <p className="text-2xl font-black text-white">
          {score}
        </p>

        {lowerIsBetter && (
          <p className="text-xs font-bold text-gray-500">
            Lower is better
          </p>
        )}
      </div>

      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-white/60"
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}

function ReasoningList({
  title,
  items,
}: {
  title: string;
  items: string[];
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
      <p className="text-sm font-bold uppercase tracking-[0.18em] text-gray-400">
        {title}
      </p>

      <div className="mt-4 space-y-3">
        {items.map((item) => (
          <div key={item} className="flex gap-3">
            <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-cyan-300" />

            <p className="leading-7 text-gray-300">
              {item}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function OpportunityRow({
  rank,
  opportunity,
}: {
  rank: number;
  opportunity: KaiOpportunity;
}) {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-black/20 p-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/5 font-black text-gray-300">
          {rank}
        </div>

        <div>
          <h4 className="font-black text-white">
            {opportunity.title}
          </h4>

          <p className="mt-1 text-sm text-gray-500">
            {opportunity.category}
          </p>

          <p className="mt-3 max-w-3xl leading-7 text-gray-400">
            {opportunity.reason}
          </p>
        </div>
      </div>

      <div className="shrink-0 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-center">
        <p className="text-xs font-bold uppercase tracking-[0.15em] text-gray-500">
          Score
        </p>

        <p className="mt-1 text-xl font-black text-gray-200">
          {opportunity.priorityScore}
        </p>
      </div>
    </div>
  );
}