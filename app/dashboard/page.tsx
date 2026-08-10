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

export default function Dashboard() {
  const router = useRouter();

  const [reviewItems, setReviewItems] = useState<ReviewItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [currentTime, setCurrentTime] = useState<Date | null>(null);

  useEffect(() => {
    loadMorningHome();

    // Wait until the browser has mounted before using local time.
    // This keeps the server HTML and first browser render identical.
    setCurrentTime(new Date());

    const clock = window.setInterval(() => {
      setCurrentTime(new Date());
    }, 60_000);

    return () => window.clearInterval(clock);
  }, []);

  async function loadMorningHome() {
    try {
      setIsLoading(true);
      setLoadError("");

      const response = await fetch("/api/review", {
        method: "GET",
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("KAI could not load your prepared work.");
      }

      const data: ReviewResponse | ReviewItem[] =
        await response.json();

      const items = Array.isArray(data)
        ? data
        : Array.isArray(data.items)
          ? data.items
          : Array.isArray(data.queue)
            ? data.queue
            : [];

      setReviewItems(
        items.filter((item) => {
          const status = item.status?.toLowerCase();

          return (
            !status ||
            status === "review" ||
            status === "ready" ||
            status === "pending" ||
            status === "awaiting-approval"
          );
        }),
      );
    } catch (error) {
      setLoadError(
        error instanceof Error
          ? error.message
          : "KAI could not load your prepared work.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  const greeting = useMemo(() => {
    if (!currentTime) {
      return "Welcome back";
    }

    const hour = currentTime.getHours();

    if (hour < 12) {
      return "Good morning";
    }

    if (hour < 18) {
      return "Good afternoon";
    }

    return "Good evening";
  }, [currentTime]);

  const videosReady = reviewItems.filter(
    (item) => item.media,
  ).length;

  const contentReady =
    reviewItems.length - videosReady;

  const everythingApproved =
    !isLoading && reviewItems.length === 0;

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
              While you were away, I kept working on your business.
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
            <p className="text-sm font-bold uppercase tracking-[0.22em] text-purple-300">
              While You Slept
            </p>

            {everythingApproved ? (
              <div className="py-10 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-500/15 text-3xl">
                  ✓
                </div>

                <h2 className="mt-5 text-3xl font-black">
                  You&apos;re all caught up.
                </h2>

                <p className="mx-auto mt-3 max-w-xl text-lg text-gray-300">
                  Everything that needed your approval has been
                  handled. I&apos;ll keep working in the background.
                </p>

                <p className="mt-6 text-xl font-bold text-purple-300">
                  Go live your life.
                </p>
              </div>
            ) : (
              <>
                <div className="mt-5 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <h2 className="text-3xl font-black sm:text-4xl">
                      I prepared {reviewItems.length}{" "}
                      {reviewItems.length === 1
                        ? "thing"
                        : "things"}{" "}
                      for you.
                    </h2>

                    <p className="mt-3 text-lg text-gray-300">
                      A quick review is all that stands between this
                      work and publishing.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => router.push("/review")}
                    className="rounded-full bg-purple-600 px-7 py-4 text-base font-black transition hover:bg-purple-500"
                  >
                    Review Everything
                  </button>
                </div>

                <div className="mt-7 grid gap-4 sm:grid-cols-3">
                  <SummaryCard
                    number={videosReady}
                    label="Videos ready"
                    icon="🎬"
                  />

                  <SummaryCard
                    number={contentReady}
                    label="Content packages"
                    icon="📝"
                  />

                  <SummaryCard
                    number={reviewItems.length}
                    label="Decisions needed"
                    icon="✅"
                  />
                </div>
              </>
            )}
          </div>
        </section>

        {!everythingApproved && (
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
                onClick={loadMorningHome}
                className="rounded-full border border-white/15 px-4 py-2 text-sm font-bold text-gray-300 transition hover:border-white/30 hover:text-white"
              >
                Refresh
              </button>
            </div>

            {isLoading && (
              <div className="mt-5 rounded-3xl border border-white/10 bg-white/[0.03] p-8 text-center text-gray-400">
                KAI is gathering your prepared work...
              </div>
            )}

            {!isLoading && loadError && (
              <div className="mt-5 rounded-3xl border border-red-500/30 bg-red-500/10 p-6">
                <p className="font-bold text-red-300">
                  I couldn&apos;t load your work.
                </p>

                <p className="mt-2 text-sm text-red-100/70">
                  {loadError}
                </p>

                <button
                  type="button"
                  onClick={loadMorningHome}
                  className="mt-5 rounded-full bg-red-500 px-5 py-2.5 font-bold text-white transition hover:bg-red-400"
                >
                  Try Again
                </button>
              </div>
            )}

            {!isLoading &&
              !loadError &&
              reviewItems.length > 0 && (
                <div className="mt-5 grid gap-5 lg:grid-cols-2">
                  {reviewItems
                    .slice(0, 4)
                    .map((item, index) => (
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
                              {item.media ? "🎬" : "📝"}
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
                          {(item.platforms?.length
                            ? item.platforms
                            : ["Social Media"]
                          ).map((platform) => (
                            <span
                              key={platform}
                              className="rounded-full bg-white/5 px-3 py-1 text-xs font-semibold text-gray-400"
                            >
                              {platform}
                            </span>
                          ))}
                        </div>

                        <div className="mt-6 flex gap-3">
                          <button
                            type="button"
                            onClick={() =>
                              router.push("/review")
                            }
                            className="flex-1 rounded-full bg-purple-600 px-5 py-3 font-black transition hover:bg-purple-500"
                          >
                            Review & Approve
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              router.push("/review")
                            }
                            className="rounded-full border border-white/15 px-5 py-3 font-bold text-gray-300 transition hover:border-white/30 hover:text-white"
                          >
                            Edit
                          </button>
                        </div>
                      </article>
                    ))}
                </div>
              )}

            {!isLoading &&
              reviewItems.length > 4 && (
                <button
                  type="button"
                  onClick={() =>
                    router.push("/review")
                  }
                  className="mt-5 w-full rounded-2xl border border-white/10 bg-white/[0.025] px-5 py-4 font-bold text-gray-300 transition hover:border-purple-500/40 hover:text-white"
                >
                  See all {reviewItems.length} items
                </button>
              )}
          </section>
        )}

        <section className="mt-8 grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-3xl border border-white/10 bg-white/[0.025] p-6">
            <p className="text-sm font-bold uppercase tracking-[0.22em] text-gray-500">
              KAI Is Working
            </p>

            <h2 className="mt-2 text-2xl font-black">
              You don&apos;t need to start anything.
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

function SummaryCard({
  number,
  label,
  icon,
}: {
  number: number;
  label: string;
  icon: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/30 p-5">
      <div className="flex items-center justify-between">
        <span className="text-2xl">{icon}</span>

        <span className="text-3xl font-black">
          {number}
        </span>
      </div>

      <p className="mt-4 text-sm font-semibold text-gray-400">
        {label}
      </p>
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