"use client";

import { useEffect, useState } from "react";
import {
  approveToday,
  endDayWithLiveAI,
  resetToday,
} from "../core/runtime/clientRuntime";
import { useKAIRuntime } from "../hooks/useKAIRuntime";

export default function KAIRuntimeDebug() {
  const runtime = useKAIRuntime();
  const [mounted, setMounted] = useState(false);
  const [endingDay, setEndingDay] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  async function handleEndDay() {
    setEndingDay(true);
    setMessage("KAI is running the real overnight autopilot...");

    try {
      await endDayWithLiveAI();
      setMessage("Overnight autopilot complete. Tomorrow is prepared.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Overnight autopilot failed."
      );
    } finally {
      setEndingDay(false);
    }
  }

  return (
    <section className="rounded-3xl border border-blue-500/30 bg-blue-950/10 p-6">
      <p className="text-sm font-bold tracking-[0.3em] text-blue-300">
        KAI RUNTIME
      </p>

      <h2 className="mt-3 text-3xl font-black">
        Status: {mounted ? runtime.status : "loading"}
      </h2>

      <p className="mt-2 text-gray-300">Last Update:</p>

      <p className="mt-1 font-mono text-sm text-blue-300">
        {mounted ? runtime.lastUpdated : "Loading..."}
      </p>

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          onClick={approveToday}
          className="rounded-xl bg-green-600 px-5 py-3 font-bold transition hover:bg-green-500"
        >
          Approve
        </button>

        <button
          onClick={handleEndDay}
          disabled={endingDay}
          className="rounded-xl bg-yellow-600 px-5 py-3 font-bold transition hover:bg-yellow-500 disabled:opacity-50"
        >
          {endingDay ? "Running Overnight..." : "End Day"}
        </button>

        <button
          onClick={resetToday}
          className="rounded-xl bg-red-600 px-5 py-3 font-bold transition hover:bg-red-500"
        >
          Reset
        </button>
      </div>

      {message && (
        <p className="mt-5 rounded-2xl bg-black/30 p-4 text-gray-300">
          {message}
        </p>
      )}
    </section>
  );
}