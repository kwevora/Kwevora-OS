"use client";

import { useKAIMemory } from "../hooks/useKAIMemory";

export default function KAIMemoryTimeline() {
  const memory = useKAIMemory();

  return (
    <section className="rounded-3xl border border-purple-500/30 bg-purple-950/20 p-8">
      <p className="text-sm font-bold tracking-[0.35em] text-purple-300">
        KAI MEMORY
      </p>

      <h2 className="mt-4 text-4xl font-black">
        Here's what I remember.
      </h2>

      {memory.length === 0 ? (
        <div className="mt-6 rounded-2xl bg-black/20 p-6">
          <p className="text-gray-400">I don't have any memories yet.</p>
        </div>
      ) : (
        <div className="mt-8 space-y-4">
          {memory.map((item) => (
            <div
              key={item.id}
              className="rounded-2xl border border-white/10 bg-white/5 p-5"
            >
              <p className="text-xs uppercase tracking-[0.3em] text-cyan-300">
                {item.type.replace("_", " ")}
              </p>

              <p className="mt-2 text-lg font-bold">{item.text}</p>

              <p className="mt-3 text-sm text-gray-400">
                {new Date(item.createdAt).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}