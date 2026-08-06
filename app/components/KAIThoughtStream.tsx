"use client";

import { useEffect, useState } from "react";
import { kaiMind } from "../lib/kaiMind";

const thoughts = kaiMind.thoughtStream;

export default function KAIThoughtStream() {
  const [activeThought, setActiveThought] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveThought((current) => (current + 1) % thoughts.length);
    }, 3500);

    return () => clearInterval(timer);
  }, []);

  return (
    <section className="rounded-3xl border border-green-500/30 bg-gradient-to-br from-green-950/20 via-black to-purple-950/20 p-8">
      <div className="flex items-center justify-between gap-6">
        <div>
          <p className="text-sm font-bold tracking-[0.35em] text-green-300">
            LIVE THOUGHT STREAM
          </p>

          <h2 className="mt-4 text-4xl font-black">
            KAI is thinking out loud.
          </h2>

          <p className="mt-3 max-w-3xl text-gray-400">
            These thoughts now come from KAI&apos;s shared mind and decision
            process, not from this component.
          </p>
        </div>

        <div className="rounded-full border border-green-500/40 bg-green-950/40 px-5 py-3 text-sm font-bold text-green-300">
          ● LIVE
        </div>
      </div>

      <div className="mt-8 rounded-3xl border border-white/10 bg-black/50 p-6">
        <div className="flex items-start justify-between gap-6">
          <div>
            <p className="text-sm font-bold text-purple-300">
              {thoughts[activeThought].mood}
            </p>

            <h3 className="mt-3 text-3xl font-black">
              {thoughts[activeThought].title}
            </h3>

            <p className="mt-4 max-w-4xl text-lg leading-8 text-gray-300">
              {thoughts[activeThought].text}
            </p>
          </div>

          <div className="hidden rounded-2xl bg-purple-600/20 p-4 text-4xl md:block">
            🧠
          </div>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        {thoughts.map((thought, index) => {
          const active = index === activeThought;

          return (
            <button
              key={thought.title}
              onClick={() => setActiveThought(index)}
              className={`w-full rounded-2xl p-4 text-left transition ${
                active
                  ? "border border-green-500/40 bg-green-950/30"
                  : "bg-black/30 hover:bg-black/50"
              }`}
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-bold text-gray-500">
                    {thought.mood}
                  </p>

                  <p className="mt-1 font-bold text-white">
                    {thought.title}
                  </p>
                </div>

                <span className="text-green-300">
                  {active ? "Live" : "View"}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}