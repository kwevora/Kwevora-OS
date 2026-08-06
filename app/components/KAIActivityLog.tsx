"use client";

import { useEffect, useState } from "react";
import { useKAIRuntime } from "../hooks/useKAIRuntime";

export default function KAIActivityLog() {
  const runtime = useKAIRuntime();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const headline = !mounted
    ? "Loading KAI activity..."
    : runtime.status === "sleeping"
    ? "I finished the overnight run."
    : runtime.status === "working"
    ? "I’m working through the approved plan."
    : "Here’s what I’ve been doing.";

  return (
    <section className="rounded-3xl border border-white/10 bg-white/5 p-8">
      <p className="text-sm font-bold tracking-[0.35em] text-cyan-300">
        KAI ACTIVITY LOG
      </p>

      <h2 className="mt-4 text-4xl font-black">{headline}</h2>

      <div className="mt-8 space-y-4">
        {mounted && runtime.activity.length > 0 ? (
          runtime.activity.map((item) => (
            <div
              key={item.id}
              className="rounded-2xl border border-white/10 bg-black/30 p-5"
            >
              <p className="text-sm font-bold uppercase tracking-[0.25em] text-cyan-300">
                {item.status}
              </p>

              <h3 className="mt-2 text-xl font-black">{item.title}</h3>

              <p className="mt-2 text-gray-300">{item.detail}</p>

              <p className="mt-3 text-xs text-gray-500">{item.time}</p>
            </div>
          ))
        ) : (
          <div className="rounded-2xl border border-white/10 bg-black/30 p-5">
            <h3 className="text-xl font-black">No activity yet.</h3>
            <p className="mt-2 text-gray-300">
              KAI will start logging work after you approve the day or run the overnight autopilot.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}