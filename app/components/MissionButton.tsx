"use client";

import { useState } from "react";

export default function MissionButton() {
  const [complete, setComplete] = useState(false);

  function finishMission() {
    setComplete(true);

    const savedSteps = localStorage.getItem("kwevora-steps");
    const currentSteps = savedSteps ? Number(savedSteps) : 1;

    localStorage.setItem("kwevora-steps", String(currentSteps + 1));
  }

  return (
    <button
      onClick={finishMission}
      className={
        complete
          ? "mt-6 rounded-full bg-green-600 px-6 py-3 font-bold transition hover:bg-green-500"
          : "mt-6 rounded-full bg-purple-600 px-6 py-3 font-bold transition hover:bg-purple-500"
      }
    >
      {complete
        ? "✅ Mission Complete — One Step Closer"
        : "▶ Begin Today's Mission"}
    </button>
  );
}