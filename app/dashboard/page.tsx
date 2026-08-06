"use client";

import KaiMissionCard from "@/app/components/KaiMissionCard";
import TalkToKAI from "@/app/components/TalkToKAI";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type ReviewItem = {
  id: string;
  title?: string;
  hook?: string;
  caption?: string;
  status?: string;
  platforms?: string[];
  recommendedPlatforms?: string[];
  createdAt?: string;
  thumbnailIdea?: string;
  media?: {
    source?: string;
    fileName?: string;
    storedFileName?: string;
    mimeType?: string;
    filePath?: string;
  };
};

type ReviewResponse = {
  items?: ReviewItem[];
  queue?: ReviewItem[];
};

type OvernightReport = {
  startedAt: string;
  finishedAt: string;
  summary: string;
  completedWork: string[];
  opportunities: string[];
  warnings: string[];
  nextOwnerDecision: string;
  activeWork: unknown;

  contentCreated?: boolean;
  createdContentTitle?: string;

  executivePriority?: string;
  ownerTasks?: string[];
  kaiTasks?: string[];

  biggestRisk?: string;
  biggestOpportunity?: string;

  organizationHealth?: number;
  organizationTrend?: string;

  judgment?: string;
  judgmentConfidence?: number;

  executionStatus?: string;
  executionProgress?: number;
  executionNextAction?: string;
};

type OvernightResponse = {
  success?: boolean;
  report?: OvernightReport | null;
  reportId?: string;
  createdAt?: string;
  message?: string;
};

function formatTrend(value?: string): string {
  if (value === "improving") {
    return "Improving";
  }

  if (value === "declining") {
    return "Needs attention";
  }

  if (value === "stable") {
    return "Stable";
  }

  return "Building history";
}

function formatStatus(value?: string): string {
  if (!value) {
    return "Ready";
  }

  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase(),
    );
}

export default function Dashboard() {
  const router = useRouter();

  const [reviewItems, setReviewItems] =
    useState<ReviewItem[]>([]);

  const [overnightReport, setOvernightReport] =
    useState<OvernightReport | null>(null);

  const [isLoading, setIsLoading] =
    useState(true);

  const [loadError, setLoadError] =
    useState("");

  const [currentTime, setCurrentTime] =
    useState(new Date());

  useEffect(() => {
    void loadMorningHome();

    const clock = window.setInterval(() => {
      setCurrentTime(new Date());
    }, 60_000);

    return () =>
      window.clearInterval(clock);
  }, []);

  async function loadMorningHome() {
    try {
      setIsLoading(true);
      setLoadError("");

      const [reviewResult, overnightResult] =
        await Promise.allSettled([
          fetch("/api/review", {
            method: "GET",
            cache: "no-store",
          }),
          fetch("/api/kai/overnight", {
            method: "GET",
            cache: "no-store",
          }),
        ]);

      if (
        reviewResult.status ===
        "fulfilled"
      ) {
        const response =
          reviewResult.value;

        if (!response.ok) {
          throw new Error(
            "KAI could not load your prepared work.",
          );
        }

        const data:
          | ReviewResponse
          | ReviewItem[] =
          await response.json();

        const items =
          Array.isArray(data)
            ? data
            : Array.isArray(data.items)
              ? data.items
              : Array.isArray(
                    data.queue,
                  )
                ? data.queue
                : [];

        setReviewItems(
          items.filter((item) => {
            const status =
              item.status
                ?.toLowerCase()
                .replace("_", "-");

            return (
              !status ||
              status === "review" ||
              status === "ready" ||
              status === "pending" ||
              status ===
                "needs-review" ||
              status ===
                "awaiting-approval"
            );
          }),
        );
      } else {
        throw new Error(
          "KAI could not load your prepared work.",
        );
      }

      if (
        overnightResult.status ===
        "fulfilled"
      ) {
        const response =
          overnightResult.value;

        if (response.ok) {
          const data:
            OvernightResponse =
            await response.json();

          setOvernightReport(
            data.report ?? null,
          );
        } else if (
          response.status === 404
        ) {
          setOvernightReport(null);
        } else {
          throw new Error(
            "KAI could not load the overnight report.",
          );
        }
      } else {
        throw new Error(
          "KAI could not load the overnight report.",
        );
      }
    } catch (error) {
      setLoadError(
        error instanceof Error
          ? error.message
          : "KAI could not load your morning briefing.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  const greeting = useMemo(() => {
    const hour =
      currentTime.getHours();

    if (hour < 12) {
      return "Good morning";
    }

    if (hour < 18) {
      return "Good afternoon";
    }

    return "Good evening";
  }, [currentTime]);

  const videosReady =
    reviewItems.filter(
      (item) => item.media,
    ).length;

  const contentReady =
    reviewItems.length -
    videosReady;

  const everythingApproved =
    !isLoading &&
    reviewItems.length === 0;

  const organizationHealth =
    overnightReport
      ?.organizationHealth ?? 0;

  const judgmentConfidence =
    overnightReport
      ?.judgmentConfidence ?? 0;

  const bestMove =
    overnightReport
      ?.biggestOpportunity ||
    overnightReport
      ?.executivePriority ||
    overnightReport
      ?.opportunities?.[0] ||
    "Continue preparing the next highest-value move.";

  const whyThisMove =
    overnightReport?.judgment ||
    overnightReport?.summary ||
    "KAI is still gathering enough business history to make a stronger recommendation.";

  const ownerTasks =
    overnightReport?.ownerTasks ??
    [];

  const kaiTasks =
    overnightReport?.kaiTasks ??
    [];

  const approvalCount =
    reviewItems.length +
    ownerTasks.length;

  function approvePlan() {
    if (reviewItems.length > 0) {
      router.push("/review");
      return;
    }

    router.push("/kai");
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-10">
        <header className="flex flex-col gap-5 border-b border-white/10 pb-8 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.28em] text-purple-400">
              KWEVORA OS
            </p>

            <h1 className="mt-4 text-4xl font-black tracking-tight sm:text-5xl">
              {greeting}, Kent.
            </h1>

            <p className="mt-3 max-w-2xl text-lg text-gray-400">
              While you were away, I kept
              working on your business.
            </p>
          </div>

          <div className="rounded-2xl border border-green-500/20 bg-green-500/10 px-5 py-4">
            <div className="flex items-center gap-3">
              <span className="relative flex h-3 w-3">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />

                <span className="relative inline-flex h-3 w-3 rounded-full bg-green-500" />
              </span>

              <div>
                <p className="font-bold text-green-300">
                  KAI is working
                </p>

                <p className="text-sm text-green-100/60">
                  Preparing what comes next
                </p>
              </div>
            </div>
          </div>
        </header>

        <section className="mt-8 overflow-hidden rounded-3xl border border-purple-500/30 bg-gradient-to-br from-purple-950/60 via-purple-950/30 to-black">
          <div className="p-6 sm:p-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.22em] text-purple-300">
                  Morning Command Center
                </p>

                <h2 className="mt-3 text-3xl font-black sm:text-4xl">
                  I reviewed the business before
                  you logged in.
                </h2>

                <p className="mt-4 max-w-3xl text-lg leading-8 text-gray-300">
                  {isLoading
                    ? "KAI is loading the latest executive briefing."
                    : overnightReport
                      ? overnightReport.summary
                      : "Run the overnight shift so KAI can prepare a complete executive briefing."}
                </p>
              </div>

              <button
                type="button"
                onClick={approvePlan}
                disabled={
                  isLoading ||
                  !overnightReport
                }
                className="shrink-0 rounded-full bg-purple-600 px-7 py-4 text-base font-black transition hover:bg-purple-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {approvalCount > 0
                  ? `Approve My Plan (${approvalCount})`
                  : "Open KAI Workspace"}
              </button>
            </div>

            {loadError ? (
              <div className="mt-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-5">
                <p className="font-bold text-red-300">
                  I couldn&apos;t load your
                  command center.
                </p>

                <p className="mt-2 text-sm text-red-100/70">
                  {loadError}
                </p>

                <button
                  type="button"
                  onClick={() =>
                    void loadMorningHome()
                  }
                  className="mt-4 rounded-full bg-red-500 px-5 py-2.5 font-bold text-white transition hover:bg-red-400"
                >
                  Try Again
                </button>
              </div>
            ) : null}

            <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                label="Organization Health"
                value={
                  overnightReport
                    ? `${organizationHealth}%`
                    : "—"
                }
                detail={formatTrend(
                  overnightReport
                    ?.organizationTrend,
                )}
              />

              <MetricCard
                label="KAI Confidence"
                value={
                  overnightReport
                    ? `${judgmentConfidence}%`
                    : "—"
                }
                detail="Backed by current business evidence"
              />

              <MetricCard
                label="Ready for Approval"
                value={`${reviewItems.length}`}
                detail={`${videosReady} video${
                  videosReady === 1
                    ? ""
                    : "s"
                }, ${contentReady} content item${
                  contentReady === 1
                    ? ""
                    : "s"
                }`}
              />

              <MetricCard
                label="Execution"
                value={
                  overnightReport
                    ? `${overnightReport.executionProgress ?? 0}%`
                    : "—"
                }
                detail={formatStatus(
                  overnightReport
                    ?.executionStatus,
                )}
              />
            </div>

            {overnightReport ? (
              <>
                <div className="mt-6 rounded-3xl border border-cyan-500/25 bg-cyan-500/10 p-6">
                  <p className="text-xs font-bold uppercase tracking-[0.22em] text-cyan-300">
                    Today&apos;s Best Move
                  </p>

                  <h3 className="mt-3 text-3xl font-black">
                    {bestMove}
                  </h3>

                  <p className="mt-4 max-w-4xl text-lg leading-8 text-gray-300">
                    {whyThisMove}
                  </p>

                  <div className="mt-5 rounded-2xl border border-white/10 bg-black/25 p-5">
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-gray-500">
                      KAI&apos;s next action
                    </p>

                    <p className="mt-2 text-lg font-bold">
                      {overnightReport
                        .executionNextAction ||
                        bestMove}
                    </p>
                  </div>
                </div>

                <div className="mt-6 grid gap-5 lg:grid-cols-2">
                  <ActionList
                    label="KAI Is Already Working On"
                    items={
                      kaiTasks.length > 0
                        ? kaiTasks
                        : [
                            "Preparing tomorrow's business priorities.",
                            "Watching for meaningful changes.",
                            "Learning from the latest results.",
                          ]
                    }
                    emptyText="No autonomous work is active."
                  />

                  <ActionList
                    label="Waiting On You"
                    items={[
                      ...ownerTasks,
                      ...reviewItems
                        .slice(0, 3)
                        .map(
                          (item) =>
                            `Review: ${
                              item.title ||
                              "Prepared content"
                            }`,
                        ),
                    ]}
                    emptyText="Nothing needs your attention right now."
                  />
                </div>

                <div className="mt-6 grid gap-5 lg:grid-cols-2">
                  <ActionList
                    label="Completed Overnight"
                    items={
                      overnightReport.completedWork
                    }
                    emptyText="No completed work was reported."
                  />

                  <ActionList
                    label="Opportunities Found"
                    items={
                      overnightReport.opportunities
                    }
                    emptyText="No new opportunities were reported."
                  />
                </div>

                <div className="mt-6 rounded-2xl border border-purple-500/25 bg-purple-500/10 p-6">
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-purple-300">
                    One Question From KAI
                  </p>

                  <p className="mt-3 text-xl font-black">
                    {
                      overnightReport.nextOwnerDecision
                    }
                  </p>
                </div>

                {overnightReport.warnings.length >
                0 ? (
                  <details className="mt-6 rounded-2xl border border-yellow-500/20 bg-yellow-500/10">
                    <summary className="cursor-pointer px-6 py-5 font-bold text-yellow-300">
                      What KAI is still watching
                    </summary>

                    <div className="space-y-3 border-t border-yellow-500/15 px-6 py-5">
                      {overnightReport.warnings.map(
                        (
                          warning,
                          index,
                        ) => (
                          <p
                            key={`${warning}-${index}`}
                            className="text-yellow-100/80"
                          >
                            {warning}
                          </p>
                        ),
                      )}
                    </div>
                  </details>
                ) : null}
              </>
            ) : null}
          </div>
        </section>

        {!everythingApproved ? (
          <section className="mt-8">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.22em] text-gray-500">
                  Ready for Your Approval
                </p>

                <h2 className="mt-2 text-2xl font-black">
                  Your morning decisions
                </h2>
              </div>

              <button
                type="button"
                onClick={() =>
                  void loadMorningHome()
                }
                className="rounded-full border border-white/15 px-4 py-2 text-sm font-bold text-gray-300 transition hover:border-white/30 hover:text-white"
              >
                Refresh
              </button>
            </div>

            {!loadError &&
            reviewItems.length > 0 ? (
              <div className="mt-5 grid gap-5 lg:grid-cols-2">
                {reviewItems
                  .slice(0, 4)
                  .map((item, index) => {
                    const platforms =
                      item
                        .recommendedPlatforms
                        ?.length
                        ? item.recommendedPlatforms
                        : item.platforms
                              ?.length
                          ? item.platforms
                          : [
                              "Social Media",
                            ];

                    return (
                      <article
                        key={
                          item.id ||
                          `${item.title}-${index}`
                        }
                        className="rounded-3xl border border-white/10 bg-white/[0.035] p-6 transition hover:border-purple-500/40"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex min-w-0 items-center gap-4">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-purple-500/15 text-2xl">
                              {item.media
                                ? "🎬"
                                : "📝"}
                            </div>

                            <div className="min-w-0">
                              <p className="text-xs font-bold uppercase tracking-[0.18em] text-purple-300">
                                {item.media
                                  ? "Video"
                                  : "Content"}
                              </p>

                              <h3 className="mt-1 truncate text-xl font-black">
                                {item.title ||
                                  "Untitled content"}
                              </h3>
                            </div>
                          </div>

                          <span className="shrink-0 rounded-full bg-yellow-500/10 px-3 py-1 text-xs font-bold text-yellow-300">
                            Needs approval
                          </span>
                        </div>

                        <p className="mt-5 line-clamp-3 text-gray-300">
                          {item.hook ||
                            item.caption ||
                            "KAI prepared this item and it is ready for your review."}
                        </p>

                        <div className="mt-5 flex flex-wrap gap-2">
                          {platforms.map(
                            (platform) => (
                              <span
                                key={
                                  platform
                                }
                                className="rounded-full bg-white/5 px-3 py-1 text-xs font-semibold text-gray-400"
                              >
                                {
                                  platform
                                }
                              </span>
                            ),
                          )}
                        </div>

                        <div className="mt-6 flex gap-3">
                          <button
                            type="button"
                            onClick={() =>
                              router.push(
                                "/review",
                              )
                            }
                            className="flex-1 rounded-full bg-purple-600 px-5 py-3 font-black transition hover:bg-purple-500"
                          >
                            Review & Approve
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              router.push(
                                "/review",
                              )
                            }
                            className="rounded-full border border-white/15 px-5 py-3 font-bold text-gray-300 transition hover:border-white/30 hover:text-white"
                          >
                            Edit
                          </button>
                        </div>
                      </article>
                    );
                  })}
              </div>
            ) : null}

            {reviewItems.length > 4 ? (
              <button
                type="button"
                onClick={() =>
                  router.push("/review")
                }
                className="mt-5 w-full rounded-2xl border border-white/10 bg-white/[0.025] px-5 py-4 font-bold text-gray-300 transition hover:border-purple-500/40 hover:text-white"
              >
                See all{" "}
                {reviewItems.length} items
              </button>
            ) : null}
          </section>
        ) : (
          <p className="mt-8 text-center font-bold text-green-300">
            Nothing is waiting for approval.
            KAI will keep working in the
            background.
          </p>
        )}

        <section className="mt-8 grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-3xl border border-white/10 bg-white/[0.025] p-6">
            <p className="text-sm font-bold uppercase tracking-[0.22em] text-gray-500">
              KAI Is Working
            </p>

            <h2 className="mt-2 text-2xl font-black">
              You don&apos;t need to start
              anything.
            </h2>

            <div className="mt-6 space-y-4">
              <WorkingItem text="Preparing new content opportunities" />
              <WorkingItem text="Learning from your latest results" />
              <WorkingItem text="Watching your connected platforms" />
              <WorkingItem text="Building tomorrow's morning brief" />
            </div>
          </div>

          <KaiMissionCard />
        </section>

        <TalkToKAI />
      </div>
    </main>
  );
}

function MetricCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/30 p-5">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-gray-500">
        {label}
      </p>

      <p className="mt-3 text-3xl font-black">
        {value}
      </p>

      <p className="mt-2 text-sm text-gray-400">
        {detail}
      </p>
    </div>
  );
}

function ActionList({
  label,
  items,
  emptyText,
}: {
  label: string;
  items: string[];
  emptyText: string;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-black/30 p-6">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-400">
        {label}
      </p>

      {items.length > 0 ? (
        <div className="mt-5 space-y-4">
          {items
            .slice(0, 8)
            .map((item, index) => (
              <div
                key={`${item}-${index}`}
                className="flex items-start gap-3"
              >
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-purple-500/15 text-sm text-purple-300">
                  ✓
                </span>

                <p className="text-gray-300">
                  {item}
                </p>
              </div>
            ))}
        </div>
      ) : (
        <p className="mt-5 text-gray-400">
          {emptyText}
        </p>
      )}
    </div>
  );
}

function WorkingItem({
  text,
}: {
  text: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="relative flex h-3 w-3 shrink-0">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-purple-400 opacity-50" />

        <span className="relative inline-flex h-3 w-3 rounded-full bg-purple-500" />
      </span>

      <p className="text-gray-300">
        {text}
      </p>
    </div>
  );
}