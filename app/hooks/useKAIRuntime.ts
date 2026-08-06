"use client";

import { useEffect, useState } from "react";
import {
  getClientRuntime,
  type ClientRuntimeState,
} from "../core/runtime/clientRuntime";

export function useKAIRuntime() {
  const [runtime, setRuntime] = useState<ClientRuntimeState>(() =>
    getClientRuntime()
  );

  useEffect(() => {
    function update() {
      setRuntime(getClientRuntime());
    }

    window.addEventListener("kai-runtime-updated", update);
    window.addEventListener("storage", update);

    return () => {
      window.removeEventListener("kai-runtime-updated", update);
      window.removeEventListener("storage", update);
    };
  }, []);

  return runtime;
}