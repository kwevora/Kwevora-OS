"use client";

import { useEffect, useState } from "react";

type OwnerQuestion = {
  executionPlanId: string;
  objective: string;
  requiredMetrics: string[];
  metricTargets: Array<{
    name: string;
    target: number;
    reason: string;
  }>;
  reason: string;
};

type MorningLearningResponse = {
  success: boolean;
  report: {
    ownerQuestion: OwnerQuestion | null;
  } | null;
};

type MetricAnswer = {
  actual: string;
  target: string;
};

export default function KAIMorningQuestion() {
  const [question, setQuestion] =
    useState<OwnerQuestion | null>(null);
  const [answers, setAnswers] =
    useState<Record<string, MetricAnswer>>({});
  const [loading, setLoading] =
    useState(true);
  const [submitting, setSubmitting] =
    useState(false);
  const [message, setMessage] =
    useState("");

  useEffect(() => {
    let cancelled = false;

    void fetch("/api/kai/morning-learning", {
      cache: "no-store",
    })
      .then((response) => response.json())
      .then((data: MorningLearningResponse) => {
        if (cancelled) return;

        const ownerQuestion =
          data.success
            ? data.report?.ownerQuestion ?? null
            : null;

        setQuestion(ownerQuestion);

        if (ownerQuestion) {
          setAnswers(
            Object.fromEntries(
              ownerQuestion.requiredMetrics.map(
                (metric) => [
                  metric,
                  {
                    actual: "",
                    target:
                      ownerQuestion
                        .metricTargets
                        .find(
                          (target) =>
                            target.name ===
                            metric,
                        )
                        ?.target
                        .toString() ??
                      "",
                  },
                ],
              ),
            ),
          );
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  function updateAnswer(
    metric: string,
    field: keyof MetricAnswer,
    value: string,
  ) {
    setAnswers((current) => ({
      ...current,
      [metric]: {
        ...current[metric],
        [field]: value,
      },
    }));
  }

  async function sendResults() {
    if (!question) return;

    const metrics = Object.entries(answers)
      .map(([name, answer]) => {
        const actual = Number(answer.actual);
        const target = Number(answer.target);

        if (
          !answer.actual.trim() ||
          !Number.isFinite(actual)
        ) {
          return null;
        }

        return {
          name,
          actual,
          target:
            answer.target.trim() &&
            Number.isFinite(target)
              ? target
              : undefined,
          higherIsBetter: true,
        };
      })
      .filter(
        (
          metric,
        ): metric is {
          name: string;
          actual: number;
          target: number | undefined;
          higherIsBetter: boolean;
        } => metric !== null,
      );

    if (metrics.length === 0) {
      setMessage(
        "Enter at least one real result before sending it to KAI.",
      );
      return;
    }

    setSubmitting(true);
    setMessage("");

    try {
      const response = await fetch("/api/kai/follow-up", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          executionPlanId: question.executionPlanId,
          metrics,
          observations: [
            "The owner supplied the unavailable result during the morning review.",
          ],
        }),
      });

      const result = (await response.json()) as {
        success?: boolean;
        learned?: boolean;
        message?: string;
      };

      if (!response.ok || !result.success) {
        throw new Error(
          result.message ||
            "KAI could not save this result.",
        );
      }

      setMessage(
        result.learned
          ? "KAI measured the result, learned from it, and updated the plan."
          : result.message || "KAI saved the result.",
      );

      if (result.learned) setQuestion(null);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "KAI could not save this result.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <section className="rounded-3xl border border-cyan-500/30 bg-cyan-950/20 p-8">
        <p className="text-sm font-bold tracking-[0.35em] text-cyan-300">
          ONE QUESTION
        </p>
        <p className="mt-4 text-gray-300">
          KAI is checking whether anything truly needs you.
        </p>
      </section>
    );
  }

  if (!question) {
    return (
      <section className="rounded-3xl border border-emerald-500/30 bg-emerald-950/20 p-8">
        <p className="text-sm font-bold tracking-[0.35em] text-emerald-300">
          NOTHING NEEDED FROM YOU
        </p>
        <h2 className="mt-4 text-3xl font-black">
          KAI has the results it needs right now.
        </h2>
        <p className="mt-4 text-gray-300">
          {message ||
            "Routine monitoring and learning will continue in the background."}
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-3xl border border-amber-500/30 bg-amber-950/20 p-8">
      <p className="text-sm font-bold tracking-[0.35em] text-amber-300">
        ONE QUESTION
      </p>
      <h2 className="mt-4 text-3xl font-black">
        What results did this work produce?
      </h2>
      <p className="mt-3 max-w-3xl leading-7 text-gray-300">
        {question.objective}
      </p>
      <p className="mt-2 text-sm text-gray-400">
        {question.reason}
      </p>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {question.requiredMetrics.map((metric) => (
          <div
            key={metric}
            className="rounded-2xl border border-white/10 bg-black/25 p-5"
          >
            <p className="font-black text-white">{metric}</p>
            <p className="mt-1 text-sm text-gray-400">
              KAI&apos;s target: {answers[metric]?.target || "Not set"}
            </p>
            <p className="mt-1 text-xs leading-5 text-gray-500">
              {question.metricTargets.find(
                (target) =>
                  target.name === metric,
              )?.reason ||
                "KAI will compare the result with the plan's original success criteria."}
            </p>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <input
                type="number"
                min="0"
                inputMode="decimal"
                value={answers[metric]?.actual ?? ""}
                onChange={(event) =>
                  updateAnswer(
                    metric,
                    "actual",
                    event.target.value,
                  )
                }
                placeholder="Actual"
                className="rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none focus:border-amber-400"
              />
              <input
                type="number"
                min="0"
                inputMode="decimal"
                value={answers[metric]?.target ?? ""}
                readOnly
                aria-label={`${metric} target set before execution`}
                className="cursor-not-allowed rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-gray-400 outline-none"
              />
            </div>
          </div>
        ))}
      </div>

      {message ? (
        <p className="mt-4 text-sm text-amber-200">
          {message}
        </p>
      ) : null}

      <button
        type="button"
        disabled={submitting}
        onClick={() => void sendResults()}
        className="mt-6 rounded-2xl bg-amber-500 px-8 py-4 font-black text-black transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting
          ? "KAI is learning..."
          : "Send Results to KAI"}
      </button>
    </section>
  );
}
