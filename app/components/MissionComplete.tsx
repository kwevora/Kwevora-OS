"use client";

import { useState } from "react";

export default function MissionComplete() {
  const [complete, setComplete] = useState(false);

  return (
    <button
      onClick={() => setComplete(true)}
      className={
        complete
          ? "rounded-2xl bg-green-600 p-5 text-left"
          : "rounded-2xl bg-white/10 p-5 text-left hover:bg-white/20"
      }
    >
      <p className="text-gray-300">Today&apos;s Mission</p>
      <h2 className="mt-2 text-2xl font-bold">
        {complete ? "✅ Mission Complete" : "Create 1 video"}
      </h2>
    </button>
  );
}