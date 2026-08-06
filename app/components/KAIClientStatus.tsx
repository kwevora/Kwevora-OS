"use client";

import { useEffect, useState } from "react";
import {
  getClientRuntime,
  resetToday,
  type ClientRuntimeState,
} from "../core/runtime/clientRuntime";

export default function KAIClientStatus() {
  const [runtime, setRuntime] = useState<ClientRuntimeState>(() =>
    getClientRuntime()
  );

  useEffect(() => {
    function handleUpdate() {
      setRuntime(getClientRuntime());
    }

    window.addEventListener("kai-runtime-updated", handleUpdate);
    window.addEventListener("storage", handleUpdate);

    return () => {
      window.removeEventListener("kai-runtime-updated", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, []);

  return (
    <section className="rounded-3xl border border-green-500/30 bg-green-950/10 p-6">
      <p className="text-sm font-bold tracking-[0.3em] text-green-300">
        LIVE RUNTIME
      </p>

      <h2 className="mt-3 text-3xl font-black">
        KAI is {runtime.status}.
      </h2>

      <p className="mt-3 text-gray-300">
        Last updated: {new Date(runtime.lastUpdated).toLocaleString()}
      </p>

      <button
        onClick={() => {
          resetToday();
          setRuntime(getClientRuntime());
        }}
        className="mt-5 rounded-xl border border-white/10 bg-white/5 px-5 py-3 font-bold transition hover:bg-white/10"
      >
        Reset to Planning
      </button>
    </section>
  );
}