"use client";

import { runKaiBrainPipeline } from "./brainPipeline";
import type { KaiContentIdea } from "./contentGenerator";
import { getKaiMemory } from "./memoryStore";
import {
  createOvernightReport,
  type OvernightReport,
} from "./overnightReport";

export type RuntimeStatus = "planning" | "working" | "sleeping";

export type RuntimeActivity = {
  id: string;
  time: string;
  status: "done" | "working" | "waiting" | "sleeping";
  title: string;
  detail: string;
};

export type KaiGamePlanItem = {
  id: string;
  title: string;
  reason: string;
  time: string;
};

export type OvernightRun = {
  startedAt: string;
  finishedAt: string;
  summary: string;
  morningBrief: string;
  recommendation: string;
  question: string;
  gamePlan: KaiGamePlanItem[];
  contentIdeas: KaiContentIdea[];
  activities: RuntimeActivity[];
};

export type ClientRuntimeState = {
  status: RuntimeStatus;
  lastUpdated: string;
  overnightRun: OvernightRun | null;
  overnightReport: OvernightReport | null;
  activity: RuntimeActivity[];
  contentIdeas: KaiContentIdea[];
  gamePlan: KaiGamePlanItem[];
};

const STORAGE_KEY = "kwevora-kai-runtime";

function now() {
  return new Date().toISOString();
}

function makeActivity(
  status: RuntimeActivity["status"],
  title: string,
  detail: string
): RuntimeActivity {
  return {
    id: crypto.randomUUID(),
    time: now(),
    status,
    title,
    detail,
  };
}

export function getEmptyClientRuntime(): ClientRuntimeState {
  return {
    status: "planning",
    lastUpdated: "Not started yet",
    overnightRun: null,
    overnightReport: null,
    activity: [],
    contentIdeas: [],
    gamePlan: [],
  };
}

const defaultRuntime: ClientRuntimeState = getEmptyClientRuntime();

export function getClientRuntime(): ClientRuntimeState {
  if (typeof window === "undefined") return defaultRuntime;

  const saved = window.localStorage.getItem(STORAGE_KEY);

  if (!saved) return defaultRuntime;

  try {
    const parsed = JSON.parse(saved) as ClientRuntimeState;

    return {
      ...defaultRuntime,
      ...parsed,
      activity: parsed.activity ?? [],
      overnightRun: parsed.overnightRun ?? null,
      overnightReport: parsed.overnightReport ?? null,
      contentIdeas:
        parsed.contentIdeas ??
        parsed.overnightReport?.contentIdeas ??
        parsed.overnightRun?.contentIdeas ??
        [],
      gamePlan:
        parsed.gamePlan ??
        parsed.overnightReport?.gamePlan ??
        parsed.overnightRun?.gamePlan ??
        [],
    };
  } catch {
    return defaultRuntime;
  }
}

export function setClientRuntime(next: ClientRuntimeState) {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));

  window.dispatchEvent(
    new CustomEvent("kai-runtime-updated", {
      detail: next,
    })
  );
}

export function updateClientRuntime(
  updater: (current: ClientRuntimeState) => ClientRuntimeState
) {
  const current = getClientRuntime();

  const next = {
    ...updater(current),
    lastUpdated: now(),
  };

  setClientRuntime(next);

  return next;
}

export function approveToday() {
  return updateClientRuntime((current) => ({
    ...current,
    status: "working",
    activity: [
      makeActivity(
        "done",
        "Approval received",
        "Kent approved today's direction. KAI moved from planning into working."
      ),
      makeActivity(
        "working",
        "Working through today's plan",
        "KAI is organizing the day around the approved priority."
      ),
      ...current.activity,
    ],
  }));
}

export function resetToday() {
  return updateClientRuntime(() => ({
    ...getEmptyClientRuntime(),
    status: "planning",
    lastUpdated: now(),
    activity: [
      makeActivity(
        "waiting",
        "Runtime reset",
        "KAI is back in planning mode and waiting for the next approval."
      ),
    ],
  }));
}

export function runOvernightWorker() {
  const startedAt = now();
  const savedMemory = getKaiMemory();

  const brain = runKaiBrainPipeline({
    previousDecision:
      "Kent approved building the real KAI runtime instead of adding more mock screens.",
    lessonLearned:
      "The product became stronger when the runtime, activity log, and overnight worker started producing real state.",
    ownerPreference:
      "Kent wants complete files, less talking, and real working software.",
    savedMemory,
  });

  const finishedAt = now();

  const overnightRun: OvernightRun = {
    startedAt,
    finishedAt,
    summary: brain.summary,
    morningBrief: brain.summary,
    recommendation: brain.recommendation,
    question: brain.question,
    gamePlan: [],
    contentIdeas: brain.contentIdeas,
    activities: brain.activities,
  };

  const overnightReport = createOvernightReport({
    summary: overnightRun.summary,
    morningBrief: overnightRun.morningBrief,
    recommendation: overnightRun.recommendation,
    question: overnightRun.question,
    gamePlan: overnightRun.gamePlan,
    contentIdeas: overnightRun.contentIdeas,
    activity: overnightRun.activities,
    memorySnapshot: savedMemory,
  });

  return { overnightRun, overnightReport };
}

export function endDay() {
  return updateClientRuntime((current) => {
    const { overnightRun, overnightReport } = runOvernightWorker();

    return {
      ...current,
      status: "sleeping",
      overnightRun,
      overnightReport,
      contentIdeas: overnightReport.contentIdeas,
      gamePlan: overnightReport.gamePlan,
      activity: [...overnightReport.activity, ...current.activity],
    };
  });
}

export async function endDayWithLiveAI() {
  const startedAt = now();
  const current = getClientRuntime();
  const memory = getKaiMemory();

  setClientRuntime({
    ...current,
    status: "sleeping",
    lastUpdated: now(),
    activity: [
      makeActivity(
        "sleeping",
        "Started live overnight autopilot",
        "KAI is sending memory and runtime state to the live AI to prepare tomorrow."
      ),
      ...current.activity,
    ],
  });

  const response = await fetch("/api/kai/overnight", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      memory,
      runtime: current,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Overnight autopilot failed.");
  }

  const finishedAt = now();

  const contentIdeas: KaiContentIdea[] = (data.contentIdeas ?? []).map(
    (idea: any) => ({
      id: crypto.randomUUID(),
      createdAt: now(),
      title: idea.title ?? "Untitled idea",
      hook: idea.hook ?? "",
      caption: idea.caption ?? "",
      reason: idea.reason ?? "",
      format: "short_video",
    })
  );

  const gamePlan: KaiGamePlanItem[] = (data.gamePlan ?? []).map(
    (item: any) => ({
      id: crypto.randomUUID(),
      title: item.title ?? "Untitled task",
      reason: item.reason ?? "",
      time: item.time ?? "Today",
    })
  );

  const activities: RuntimeActivity[] = [
    makeActivity(
      "done",
      "Live AI prepared tomorrow",
      data.summary ?? "KAI prepared tomorrow's overnight package."
    ),
    makeActivity(
      "done",
      "Generated tomorrow's game plan",
      `KAI created ${gamePlan.length} plan item(s) for tomorrow.`
    ),
    makeActivity(
      "done",
      "Generated content ideas",
      `KAI created ${contentIdeas.length} content idea(s) from live AI.`
    ),
    makeActivity(
      "waiting",
      "Morning review ready",
      data.question ?? "KAI has one question ready for tomorrow morning."
    ),
  ];

  const overnightRun: OvernightRun = {
    startedAt,
    finishedAt,
    summary: data.summary ?? "KAI completed the live overnight autopilot.",
    morningBrief: data.morningBrief ?? "",
    recommendation: data.recommendation ?? "",
    question: data.question ?? "",
    gamePlan,
    contentIdeas,
    activities,
  };

  const overnightReport = createOvernightReport({
    summary: overnightRun.summary,
    morningBrief: overnightRun.morningBrief,
    recommendation: overnightRun.recommendation,
    question: overnightRun.question,
    gamePlan: overnightRun.gamePlan,
    contentIdeas: overnightRun.contentIdeas,
    activity: overnightRun.activities,
    memorySnapshot: memory,
  });

  const latest = getClientRuntime();

  const next: ClientRuntimeState = {
    ...latest,
    status: "sleeping",
    overnightRun,
    overnightReport,
    contentIdeas: overnightReport.contentIdeas,
    gamePlan: overnightReport.gamePlan,
    activity: [...overnightReport.activity, ...latest.activity],
    lastUpdated: now(),
  };

  setClientRuntime(next);

  return next;
}