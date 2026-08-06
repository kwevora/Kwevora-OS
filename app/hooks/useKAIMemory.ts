"use client";

import { useEffect, useState } from "react";
import {
  getKaiMemory,
  type KaiMemoryEntry,
} from "../core/runtime/memoryStore";

export function useKAIMemory() {
  const [memory, setMemory] = useState<KaiMemoryEntry[]>([]);

  useEffect(() => {
    function refresh() {
      setMemory(getKaiMemory());
    }

    refresh();

    window.addEventListener("kai-memory-updated", refresh);
    window.addEventListener("storage", refresh);

    return () => {
      window.removeEventListener("kai-memory-updated", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  return memory;
}