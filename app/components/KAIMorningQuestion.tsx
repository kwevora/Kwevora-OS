"use client";

import { useState } from "react";
import { saveKaiMemory } from "../core/runtime/memoryStore";

const questions = [
  "What is the one thing I should know before I finish today's plan?",
  "Is there anything that became more important overnight?",
  "Should today's focus be building, selling, or learning?",
  "Is there a deadline I need to account for today?",
];

export default function KAIMorningQuestion() {
  const [answered, setAnswered] = useState(false);
  const [answer, setAnswer] = useState("");

  function sendToKai() {
    const cleanAnswer = answer.trim();

    if (!cleanAnswer) return;

    saveKaiMemory(cleanAnswer, "user_context");
    setAnswered(true);
  }

  return (
    <section className="rounded-3xl border border-cyan-500/30 bg-cyan-950/20 p-8">
      <p className="text-sm font-bold tracking-[0.35em] text-cyan-300">
        ONE QUESTION
      </p>

      <h2 className="mt-4 text-3xl font-black">
        {questions[0]}
      </h2>

      {!answered ? (
        <>
          <textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="Tell KAI anything it should know..."
            className="mt-6 h-32 w-full rounded-2xl bg-black/30 p-4 outline-none"
          />

          <button
            onClick={sendToKai}
            className="mt-6 rounded-2xl bg-cyan-600 px-8 py-4 font-bold transition hover:bg-cyan-500"
          >
            Send to KAI
          </button>
        </>
      ) : (
        <div className="mt-6 rounded-2xl bg-green-900/30 p-6">
          <p className="font-bold text-green-300">
            ✓ Saved to KAI's memory.
          </p>

          <p className="mt-3 text-gray-300">
            I'll use this while preparing today's plan and future mornings.
          </p>
        </div>
      )}
    </section>
  );
}