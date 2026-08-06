"use client";

import { useEffect, useState } from "react";

export default function OneStepCloser() {
  const [steps, setSteps] = useState(1);

  useEffect(() => {
    const savedSteps = localStorage.getItem("kwevora-steps");
    if (savedSteps) {
      setSteps(Number(savedSteps));
    }
  }, []);

  function takeStep() {
    const nextSteps = steps + 1;
    setSteps(nextSteps);
    localStorage.setItem("kwevora-steps", String(nextSteps));
  }

  return (
    <section className="mt-8">
      <button
        onClick={takeStep}
        className="w-full rounded-2xl bg-purple-600 p-6 text-left transition hover:bg-purple-500"
      >
        <h2 className="text-2xl font-bold">🚀 One Step Closer</h2>

        <p className="mt-2 text-purple-100">
          You have taken {steps} step{steps === 1 ? "" : "s"} closer.
        </p>
      </button>
    </section>
  );
}