"use client";

import { useState } from "react";

export default function KAIChat() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-6 rounded-full bg-purple-600 px-5 py-4 font-bold text-white shadow-lg hover:bg-purple-500"
      >
        KAI
      </button>

      {open && (
        <aside className="fixed bottom-24 right-6 w-96 rounded-3xl border border-purple-500/30 bg-black p-6 text-white shadow-2xl">
          <p className="text-sm font-bold tracking-widest text-purple-400">
            KAI ASSISTANT
          </p>

          <h2 className="mt-3 text-2xl font-black">Hello Kent.</h2>

          <p className="mt-3 text-gray-300">
            What are we building today?
          </p>

          <div className="mt-5 space-y-3">
            <button className="w-full rounded-xl bg-white/10 p-3 text-left hover:bg-white/20">
              🎬 Build today&apos;s video
            </button>

            <button className="w-full rounded-xl bg-white/10 p-3 text-left hover:bg-white/20">
              ✍️ Write captions
            </button>

            <button className="w-full rounded-xl bg-white/10 p-3 text-left hover:bg-white/20">
              📦 Build a product
            </button>

            <button className="w-full rounded-xl bg-white/10 p-3 text-left hover:bg-white/20">
              🚀 Give me my next mission
            </button>
          </div>

          <div className="mt-5 rounded-xl bg-purple-950/40 p-4 text-sm text-purple-100">
            KAI is online. Full AI responses are coming soon.
          </div>
        </aside>
      )}
    </>
  );
}