"use client";

import { useMemo } from "react";

export default function KAITodayPlanner() {
  const plan = useMemo(
    () => [
      {
        title: "Finish today's KWEVORA feature",
        reason:
          "Building the Brain is still the highest priority for long-term leverage.",
        time: "9:00 AM",
      },
      {
        title: "Create one piece of content",
        reason:
          "Daily publishing keeps momentum while the platform is being built.",
        time: "11:00 AM",
      },
      {
        title: "Review KAI's work",
        reason:
          "Only you can approve the direction before KAI continues.",
        time: "1:00 PM",
      },
      {
        title: "Leave 3–5 PM open",
        reason:
          "I remembered you're busy during this time.",
        time: "3:00 PM",
      },
    ],
    []
  );

  return (
    <section className="rounded-3xl border border-cyan-500/30 bg-cyan-950/20 p-8">
      <p className="text-sm font-bold tracking-[0.35em] text-cyan-300">
        TODAY'S PLAN
      </p>

      <h2 className="mt-3 text-4xl font-black">
        Here's what I recommend today.
      </h2>

      <div className="mt-8 space-y-4">
        {plan.map((item, index) => (
          <div
            key={index}
            className="rounded-2xl border border-white/10 bg-black/20 p-5"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold">{item.title}</h3>

              <span className="rounded-full bg-cyan-500/20 px-3 py-1 text-sm">
                {item.time}
              </span>
            </div>

            <p className="mt-3 text-gray-300">
              {item.reason}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}