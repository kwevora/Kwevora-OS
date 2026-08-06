"use client";

export type KaiMemoryEntry = {
  id: string;
  createdAt: string;
  type: "user_context" | "decision" | "lesson" | "schedule_note";
  text: string;
};

const STORAGE_KEY = "kwevora-kai-memory";

function now() {
  return new Date().toISOString();
}

export function getKaiMemory(): KaiMemoryEntry[] {
  if (typeof window === "undefined") return [];

  const saved = window.localStorage.getItem(STORAGE_KEY);

  if (!saved) return [];

  try {
    return JSON.parse(saved) as KaiMemoryEntry[];
  } catch {
    return [];
  }
}

export function saveKaiMemory(
  text: string,
  type: KaiMemoryEntry["type"] = "user_context"
) {
  if (typeof window === "undefined") return [];

  const current = getKaiMemory();

  const next: KaiMemoryEntry[] = [
    {
      id: crypto.randomUUID(),
      createdAt: now(),
      type,
      text,
    },
    ...current,
  ];

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));

  window.dispatchEvent(
    new CustomEvent("kai-memory-updated", {
      detail: next,
    })
  );

  return next;
}

export function clearKaiMemory() {
  if (typeof window === "undefined") return;

  window.localStorage.removeItem(STORAGE_KEY);

  window.dispatchEvent(
    new CustomEvent("kai-memory-updated", {
      detail: [],
    })
  );
}