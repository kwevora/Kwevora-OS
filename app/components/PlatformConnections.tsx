"use client";

import { useEffect, useState } from "react";

type PlatformReadiness = {
  platform: "youtube" | "tiktok" | "instagram" | "facebook";
  label: string;
  configured: boolean;
  connected: boolean;
  executorAvailable: boolean;
  accountName: string;
  state: "ready" | "needs_connection" | "needs_app_setup" | "waiting_executor";
  requirements: Array<{ label: string; satisfied: boolean; reason: string }>;
  nextAction: string;
};

type ControlCenterResponse = {
  success: boolean;
  message?: string;
  controlCenter?: {
    ready: number;
    connected: number;
    needsSetup: number;
    waitingExecutor: number;
    platforms: PlatformReadiness[];
  };
  publishingJobs?: {
    platforms: Array<{ platform: string; total: number; counts: Record<string, number> }>;
  };
};

const icons: Record<string, string> = {
  youtube: "â–¶ï¸", tiktok: "ðŸŽµ", instagram: "ðŸ“¸", facebook: "ðŸ“˜",
};

export default function PlatformConnections() {
  const [data, setData] = useState<ControlCenterResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/platforms/status", { cache: "no-store" })
      .then(async (response) => {
        const result = await response.json() as ControlCenterResponse;
        if (!response.ok || !result.success) throw new Error(result.message ?? "KAI could not check the publishing platforms.");
        if (!cancelled) setData(result);
      })
      .catch((reason) => {
        if (!cancelled) setError(reason instanceof Error ? reason.message : "KAI could not check the publishing platforms.");
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  if (loading) return <section className="rounded-3xl border border-blue-500/30 bg-blue-950/10 p-8 text-gray-300">KAI is verifying the real platform controls...</section>;
  if (error || !data?.controlCenter) return <section className="rounded-3xl border border-red-500/30 bg-red-500/10 p-8 text-red-200">{error || "Platform status is unavailable."}</section>;

  return (
    <section className="rounded-3xl border border-blue-500/30 bg-blue-950/10 p-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-bold tracking-[0.35em] text-blue-300">MULTI-PLATFORM CONTROL CENTER</p>
          <h2 className="mt-4 text-4xl font-black">One approval. Independent platform jobs.</h2>
          <p className="mt-4 max-w-4xl text-gray-300">These statuses come from real server credentials, account authorization, and installed publishers. There are no manual â€œconnectedâ€ switches.</p>
        </div>
        <div className="rounded-full border border-blue-300/20 px-4 py-2 text-sm font-black text-blue-200">{data.controlCenter.ready} ready Â· {data.controlCenter.connected} connected</div>
      </div>

      <div className="mt-8 grid gap-5 lg:grid-cols-2">
        {data.controlCenter.platforms.map((platform) => {
          const jobs = data.publishingJobs?.platforms?.find((item) => item.platform === platform.platform);
          return (
            <article key={platform.platform} className="rounded-2xl border border-white/10 bg-black/30 p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/5 text-2xl">{icons[platform.platform]}</div>
                  <div><h3 className="text-2xl font-black">{platform.label}</h3><p className="mt-1 text-sm text-gray-400">{platform.accountName || platform.nextAction}</p></div>
                </div>
                <Status state={platform.state} />
              </div>

              <div className="mt-5 grid gap-2">
                {platform.requirements.map((requirement) => (
                  <div key={requirement.label} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                    <p className={requirement.satisfied ? "font-bold text-green-300" : "font-bold text-amber-300"}>{requirement.satisfied ? "âœ“" : "â€¢"} {requirement.label}</p>
                    {!requirement.satisfied && <p className="mt-1 text-xs text-gray-400">{requirement.reason}</p>}
                  </div>
                ))}
              </div>

              <div className="mt-5 flex flex-wrap gap-2 text-xs font-bold text-gray-300">
                <span className="rounded-full bg-white/5 px-3 py-2">{jobs?.counts.scheduled ?? 0} scheduled</span>
                <span className="rounded-full bg-white/5 px-3 py-2">{jobs?.counts.published ?? 0} published</span>
                <span className="rounded-full bg-white/5 px-3 py-2">{jobs?.counts.waiting_executor ?? 0} waiting executor</span>
                <span className="rounded-full bg-white/5 px-3 py-2">{jobs?.counts.blocked ?? 0} blocked</span>
              </div>

              {platform.platform === "youtube" && !platform.connected && platform.configured && <button type="button" onClick={() => { window.location.href = "/api/youtube/connect"; }} className="mt-5 w-full rounded-xl bg-blue-500 px-5 py-3 font-black text-white hover:bg-blue-400">Connect YouTube</button>}
              {platform.platform === "tiktok" && !platform.connected && platform.configured && <button type="button" onClick={() => { window.location.href = "/api/tiktok/connect"; }} className="mt-5 w-full rounded-xl bg-blue-500 px-5 py-3 font-black text-white hover:bg-blue-400">Connect TikTok</button>}
              {(platform.platform === "instagram" || platform.platform === "facebook") && !platform.connected && platform.configured && <button type="button" onClick={() => { window.location.href = "/api/meta/connect"; }} className="mt-5 w-full rounded-xl bg-blue-500 px-5 py-3 font-black text-white hover:bg-blue-400">Connect Meta Accounts</button>}
            </article>
          );
        })}
      </div>
    </section>
  );
}

function Status({ state }: { state: PlatformReadiness["state"] }) {
  const label = state === "ready" ? "Ready" : state === "needs_app_setup" ? "Needs app setup" : state === "needs_connection" ? "Needs connection" : "Waiting executor";
  const tone = state === "ready" ? "border-green-400/30 bg-green-400/10 text-green-200" : "border-amber-400/30 bg-amber-400/10 text-amber-200";
  return <span className={`shrink-0 rounded-full border px-3 py-1 text-xs font-black ${tone}`}>{label}</span>;
}


