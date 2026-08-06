"use client";

import { useEffect, useState } from "react";

type VideoPlan = {
  openingText: string;
  scenes: string[];
  endingText: string;
};

type ReviewItem = {
  id: string;
  createdAt: string;
  status: "needs_review";
  idea: string;
  reason: string;
  hook: string;
  title: string;
  script: string;
  caption: string;
  hashtags: string[];
  thumbnailIdea: string;
  callToAction: string;
  audience: string;
  recommendedPlatforms: string[];
  videoPlan: VideoPlan;
  format: string;
  destinationLink: string;
  pinnedComment: string;
};

type ReviewResponse = {
  success: boolean;
  items: ReviewItem[];
};

export default function ReviewPage() {
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [approvingId, setApprovingId] = useState<string | null>(null);

  useEffect(() => {
    async function loadReviewQueue() {
      try {
        const response = await fetch("/api/review", {
          method: "GET",
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("KWEVORA could not load the Review Queue.");
        }

        const data = (await response.json()) as ReviewResponse;

        setItems(Array.isArray(data.items) ? data.items : []);
      } catch (error) {
        console.error("Review Queue load failed:", error);
        setMessage("KWEVORA could not load the Review Queue.");
      } finally {
        setLoading(false);
      }
    }

    loadReviewQueue();
  }, []);

  async function approveItem(id: string) {
    setApprovingId(id);
    setMessage("");

    try {
      const response = await fetch("/api/review", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "approve",
          id,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "KWEVORA could not approve this package."
        );
      }

      setItems((currentItems) =>
        currentItems.filter((item) => item.id !== id)
      );

      setMessage("Approved and moved to the Publishing Queue.");
    } catch (error) {
      console.error("Approval failed:", error);

      setMessage(
        error instanceof Error
          ? error.message
          : "KWEVORA could not approve this package."
      );
    } finally {
      setApprovingId(null);
    }
  }

  return (
    <main className="min-h-screen bg-[#07040f] p-8 text-white">
      <div className="mx-auto max-w-7xl space-y-8">
        <section className="rounded-3xl border border-purple-500/30 bg-purple-500/10 p-8">
          <p className="text-sm font-bold uppercase tracking-[0.35em] text-purple-300">
            Review Queue
          </p>

          <h1 className="mt-4 text-5xl font-black">
            KAI prepared this for your approval.
          </h1>

          <p className="mt-4 max-w-3xl text-lg leading-8 text-gray-300">
            Review each complete content package before it moves into the
            Publishing Queue.
          </p>
        </section>

        {loading ? (
          <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <p className="font-bold text-gray-300">
              Loading the Review Queue...
            </p>
          </section>
        ) : null}

        {message ? (
          <section className="rounded-2xl border border-cyan-500/30 bg-cyan-500/10 p-6">
            <p className="font-bold text-cyan-100">{message}</p>
          </section>
        ) : null}

        {!loading && items.length === 0 ? (
          <section className="rounded-2xl border border-white/10 bg-white/5 p-8">
            <p className="text-sm font-bold uppercase tracking-[0.25em] text-gray-400">
              Nothing Waiting
            </p>

            <h2 className="mt-3 text-2xl font-black">
              Your Review Queue is empty.
            </h2>

            <p className="mt-3 text-gray-300">
              Generate a fresh content package in Video Studio and KAI will
              place it here.
            </p>
          </section>
        ) : null}

        <div className="space-y-8">
          {items.map((item) => {
            const isApproving = approvingId === item.id;
            const hashtags = Array.isArray(item.hashtags)
              ? item.hashtags
              : [];
            const platforms = Array.isArray(item.recommendedPlatforms)
              ? item.recommendedPlatforms
              : [];
            const scenes = Array.isArray(item.videoPlan?.scenes)
              ? item.videoPlan.scenes
              : [];

            return (
              <article
                key={item.id}
                className="rounded-3xl border border-white/10 bg-white/5 p-8"
              >
                <div className="flex flex-wrap items-start justify-between gap-5">
                  <div>
                    <p className="text-sm font-bold uppercase tracking-[0.25em] text-amber-300">
                      Needs Review
                    </p>

                    <h2 className="mt-3 text-3xl font-black">
                      {item.title || "Untitled Content Package"}
                    </h2>

                    <p className="mt-2 text-sm text-gray-400">
                      Prepared {formatDate(item.createdAt)}
                    </p>
                  </div>

                  <div className="rounded-full border border-amber-400/30 bg-amber-400/10 px-4 py-2 text-sm font-bold text-amber-200">
                    Waiting On You
                  </div>
                </div>

                <div className="mt-8 grid gap-8">
                  <section className="rounded-2xl border border-purple-400/20 bg-purple-400/5 p-6">
                    <SectionHeading
                      eyebrow="KAI Recommendation"
                      title="Why this content matters"
                    />

                    <div className="mt-6 grid gap-5 lg:grid-cols-2">
                      <ReviewBlock
                        label="Video Idea"
                        value={item.idea}
                      />

                      <ReviewBlock
                        label="Why KAI Chose This"
                        value={item.reason}
                      />

                      <ReviewBlock
                        label="Target Audience"
                        value={item.audience}
                      />

                      <ReviewBlock
                        label="Content Format"
                        value={formatLabel(item.format)}
                      />
                    </div>
                  </section>

                  <section className="rounded-2xl border border-cyan-400/20 bg-cyan-400/5 p-6">
                    <SectionHeading
                      eyebrow="Creative Package"
                      title="Content and messaging"
                    />

                    <div className="mt-6 grid gap-5">
                      <ReviewBlock label="Hook" value={item.hook} />

                      <ReviewBlock label="Script" value={item.script} />

                      <ReviewBlock label="Caption" value={item.caption} />

                      <ReviewBlock
                        label="Call To Action"
                        value={item.callToAction}
                      />

                      <ReviewBlock
                        label="Thumbnail Idea"
                        value={item.thumbnailIdea}
                      />

                      <ReviewBlock
                        label="Pinned Comment"
                        value={item.pinnedComment}
                      />

                      <ReviewBlock
                        label="Destination Link"
                        value={item.destinationLink}
                      />

                      <TagList
                        label="Hashtags"
                        values={hashtags}
                        emptyMessage="No hashtags were included."
                        tone="purple"
                        itemId={item.id}
                      />

                      <TagList
                        label="Recommended Platforms"
                        values={platforms}
                        emptyMessage="No platforms were recommended."
                        tone="cyan"
                        itemId={item.id}
                      />
                    </div>
                  </section>

                  <section className="rounded-2xl border border-green-400/20 bg-green-400/5 p-6">
                    <SectionHeading
                      eyebrow="Video Plan"
                      title="How KAI plans to build the video"
                    />

                    <div className="mt-6 grid gap-5">
                      <ReviewBlock
                        label="Opening Text"
                        value={item.videoPlan?.openingText}
                      />

                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-400">
                          Scenes
                        </p>

                        {scenes.length > 0 ? (
                          <div className="mt-3 space-y-3">
                            {scenes.map((scene, index) => (
                              <div
                                key={`${item.id}-scene-${index}`}
                                className="flex gap-4 rounded-xl border border-white/10 bg-black/20 p-4"
                              >
                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-green-400/30 bg-green-400/10 text-sm font-black text-green-200">
                                  {index + 1}
                                </div>

                                <p className="leading-7 text-white">{scene}</p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <EmptyValue message="No scenes were included." />
                        )}
                      </div>

                      <ReviewBlock
                        label="Ending Text"
                        value={item.videoPlan?.endingText}
                      />
                    </div>
                  </section>
                </div>

                <div className="mt-8 flex flex-wrap gap-3 border-t border-white/10 pt-6">
                  <button
                    type="button"
                    onClick={() => approveItem(item.id)}
                    disabled={isApproving}
                    className="rounded-xl bg-green-400 px-5 py-3 font-black text-black transition hover:bg-green-300 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isApproving ? "Approving..." : "Approve"}
                  </button>

                  <button
                    type="button"
                    className="rounded-xl border border-white/15 bg-white/5 px-5 py-3 font-bold text-white transition hover:bg-white/10"
                  >
                    Edit
                  </button>

                  <button
                    type="button"
                    className="rounded-xl border border-red-500/30 bg-red-500/10 px-5 py-3 font-bold text-red-200 transition hover:bg-red-500/20"
                  >
                    Reject
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </main>
  );
}

function SectionHeading({
  eyebrow,
  title,
}: {
  eyebrow: string;
  title: string;
}) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.25em] text-gray-400">
        {eyebrow}
      </p>

      <h3 className="mt-2 text-xl font-black">{title}</h3>
    </div>
  );
}

function ReviewBlock({
  label,
  value,
}: {
  label: string;
  value?: string;
}) {
  const cleanValue = typeof value === "string" ? value.trim() : "";

  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-400">
        {label}
      </p>

      {cleanValue ? (
        <p className="mt-2 whitespace-pre-wrap rounded-xl border border-white/10 bg-black/20 p-4 leading-7 text-white">
          {cleanValue}
        </p>
      ) : (
        <EmptyValue message={`No ${label.toLowerCase()} was included.`} />
      )}
    </div>
  );
}

function TagList({
  label,
  values,
  emptyMessage,
  tone,
  itemId,
}: {
  label: string;
  values: string[];
  emptyMessage: string;
  tone: "purple" | "cyan";
  itemId: string;
}) {
  const cleanValues = values.filter(
    (value) => typeof value === "string" && value.trim().length > 0
  );

  const classes =
    tone === "purple"
      ? "border-purple-400/30 bg-purple-400/10 text-purple-200"
      : "border-cyan-400/30 bg-cyan-400/10 text-cyan-200";

  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-400">
        {label}
      </p>

      {cleanValues.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {cleanValues.map((value, index) => (
            <span
              key={`${itemId}-${label}-${value}-${index}`}
              className={`rounded-full border px-3 py-1 text-sm font-bold ${classes}`}
            >
              {value}
            </span>
          ))}
        </div>
      ) : (
        <EmptyValue message={emptyMessage} />
      )}
    </div>
  );
}

function EmptyValue({ message }: { message: string }) {
  return (
    <p className="mt-2 rounded-xl border border-dashed border-white/10 bg-black/10 p-4 text-sm text-gray-500">
      {message}
    </p>
  );
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "recently";
  }

  return date.toLocaleString();
}

function formatLabel(value?: string) {
  if (!value) {
    return "";
  }

  return value
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}