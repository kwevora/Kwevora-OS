"use client";

import { approveToday } from "../core/runtime/clientRuntime";
import { getKaiState } from "../lib/kaiState";
import { useKAIRuntime } from "../hooks/useKAIRuntime";
import KAIActivityLog from "./KAIActivityLog";

export default function MorningApprovalFlow() {
  const runtime = useKAIRuntime();
  const kaiState = getKaiState();

  const approved = runtime.status === "working";

  if (approved) {
    return (
      <section className="space-y-8">
        <section className="rounded-3xl border border-green-500/30 bg-gradient-to-br from-green-950/30 via-black to-purple-950/20 p-8 text-center">
          <p className="text-sm font-bold tracking-[0.35em] text-green-300">
            KAI IS NOW WORKING
          </p>

          <h2 className="mt-4 text-5xl font-black">
            I'll take it from here.
          </h2>

          <p className="mx-auto mt-5 max-w-3xl text-xl leading-9 text-gray-300">
            Your plan has been approved. KAI is now working from the live
            runtime.
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {kaiState.next.afterApproval.map((item) => (
              <div
                key={item}
                className="rounded-2xl border border-white/10 bg-white/5 p-5"
              >
                <p className="text-lg font-black text-green-300">✓</p>
                <p className="mt-2 font-bold">{item}</p>
              </div>
            ))}
          </div>
        </section>

        <KAIActivityLog approved />
      </section>
    );
  }

  return (
    <section className="space-y-8">
      <section className="rounded-3xl border border-purple-500/30 bg-purple-950/20 p-8 text-center">
        <p className="text-sm font-bold tracking-[0.35em] text-purple-300">
          READY
        </p>

        <h2 className="mt-4 text-4xl font-black">
          {kaiState.today.approvalButton}
        </h2>

        <p className="mx-auto mt-4 max-w-2xl text-lg leading-8 text-gray-300">
          Approving today now updates the live runtime so every screen can
          respond to the same KAI state.
        </p>

        <button
          onClick={approveToday}
          className="mt-8 rounded-2xl bg-purple-600 px-10 py-5 text-xl font-black transition hover:bg-purple-500"
        >
          {kaiState.today.approvalButton}
        </button>
      </section>

      <KAIActivityLog />
    </section>
  );
}