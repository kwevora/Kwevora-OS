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
  adaptiveCreation?: {
    mode: "proven_winner" | "controlled_challenger" | "learning";
    changedVariable: string | null;
    whyKaiCreatedThis: string;
    decisions: Array<{ dimension: string; value: string; action: string; evidenceCount: number; explanation: string }>;
    platformVariants: Array<{ platform: string; hook: string; caption: string; callToAction: string; estimatedLengthSeconds: number }>;
  };
  videoProduction?: {
    videoId: string;
    status: "ready_for_review";
    videoUrl: string;
    whyKaiDirectedItThisWay?: string;
    reviewRequired: true;
    direction?: {
      platform: string;
      pace: string;
      textDensity: string;
      changedVariable: string | null;
      evidence: string[];
    };
    currentVersion?: number;
    versions?: Array<{
      version: number;
      videoId: string;
      videoUrl: string;
      outputLocation: string;
      createdAt: string;
      changeType: string;
      request: string;
      changes: string[];
      platform: string;
    }>;
  };
  videoDirectionFeedback?: string;
  media?: {
    source: string;
    fileName: string;
    storedFileName: string;
    mimeType: string;
    size: number;
    filePath: string;
    videoUrl?: string;
  };
  platformApprovals?: Record<string, {
    platform: string;
    version: number;
    videoId: string;
    videoUrl: string;
    outputLocation: string;
    approvedAt: string;
  }>;
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
  const [revisingId, setRevisingId] = useState<string | null>(null);
  const [previewVersions, setPreviewVersions] = useState<Record<string, number>>({});

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

  async function rejectItem(id: string) {
    const reason = window.prompt("Tell KAI why you are rejecting this package:");
    if (reason === null) return;
    const response = await fetch("/api/review", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reject", id, reason }),
    });
    const data = await response.json();
    if (!response.ok || !data.success) return setMessage(data.message || "KWEVORA could not reject this package.");
    setItems((current) => current.filter((item) => item.id !== id));
    setMessage(data.message);
  }

  async function editItem(item: ReviewItem) {
    const title = window.prompt("Edit the title:", item.title);
    if (title === null) return;
    const hook = window.prompt("Edit the hook:", item.hook);
    if (hook === null) return;
    const caption = window.prompt("Edit the caption:", item.caption);
    if (caption === null) return;
    const callToAction = window.prompt("Edit the call to action:", item.callToAction);
    if (callToAction === null) return;
    const videoDirectionFeedback = item.videoProduction
      ? window.prompt("What should KAI change about the finished video's look, pacing, voice, or music?", item.videoDirectionFeedback ?? "")
      : "";
    if (videoDirectionFeedback === null) return;
    const response = await fetch("/api/review", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "edit", id: item.id, title, hook, caption, callToAction, videoDirectionFeedback }),
    });
    const data = await response.json();
    if (!response.ok || !data.success) return setMessage(data.message || "KWEVORA could not save these edits.");
    setItems((current) => current.map((entry) => entry.id === item.id ? data.item : entry));
    setMessage(data.message);
  }

  async function reviseVideo(item: ReviewItem) {
    const targetValue = window.prompt("What should KAI revise? Type: scene, captions, voice, music, pacing, or platform", "scene");
    if (targetValue === null) return;
    const target = targetValue.trim().toLowerCase();
    if (!["scene", "captions", "voice", "music", "pacing", "platform"].includes(target)) return setMessage("Choose scene, captions, voice, music, pacing, or platform.");
    let sceneIndex: number | undefined;
    let platform: string | undefined;
    if (target === "scene") {
      const sceneNumber = window.prompt(`Which scene? Enter 1 through ${item.videoPlan?.scenes?.length ?? 1}`, "1");
      if (sceneNumber === null) return;
      sceneIndex = Math.max(0, Number(sceneNumber) - 1);
    }
    if (target === "platform") {
      platform = window.prompt("Which platform cut?", item.recommendedPlatforms[0] ?? "TikTok") ?? undefined;
      if (!platform) return;
    }
    const instruction = window.prompt("Tell KAI exactly what you want changed:");
    if (!instruction) return;
    setRevisingId(item.id);
    setMessage("KAI is revising only the requested part and rendering a new version...");
    try {
      const response = await fetch("/api/review/video-revision", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id, target, instruction, sceneIndex, platform }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.message || "KAI could not revise this video.");
      setItems((current) => current.map((entry) => entry.id === item.id ? data.item : entry));
      setPreviewVersions((current) => ({ ...current, [item.id]: data.version.version }));
      setMessage(data.message);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "KAI could not revise this video.");
    } finally {
      setRevisingId(null);
    }
  }

  async function approvePlatformVersion(item: ReviewItem, platform: string, version: number) {
    const response = await fetch("/api/review", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "approve_platform", id: item.id, platform, version }),
    });
    const data = await response.json();
    if (!response.ok || !data.success) return setMessage(data.message || "KWEVORA could not lock this platform version.");
    setItems((current) => current.map((entry) => entry.id === item.id ? data.item : entry));
    setMessage(data.message);
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
            const versions = Array.isArray(item.videoProduction?.versions)
              ? item.videoProduction.versions
              : [];
            const previewVersion = previewVersions[item.id] ?? item.videoProduction?.currentVersion ?? versions.at(-1)?.version;
            const preview = versions.find((version) => version.version === previewVersion) ?? versions.at(-1);
            const previewUrl = preview?.videoUrl || item.media?.videoUrl || item.videoProduction?.videoUrl;

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
                        label="Why KAI Created This"
                        value={item.adaptiveCreation?.whyKaiCreatedThis || item.reason}
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

                    {item.adaptiveCreation?.decisions?.length ? (
                      <div className="mt-6 rounded-xl border border-purple-300/20 bg-black/20 p-4">
                        <p className="text-xs font-bold uppercase tracking-[0.2em] text-purple-200">Verified decisions behind this package</p>
                        <div className="mt-3 space-y-2">
                          {item.adaptiveCreation.decisions.slice(0, 8).map((decision, index) => (
                            <p key={`${item.id}-decision-${index}`} className="text-sm leading-6 text-gray-300">
                              <span className="font-bold text-white">{formatLabel(decision.dimension)}: {decision.value}</span>
                              {` · ${decision.action} · ${decision.evidenceCount} verified result${decision.evidenceCount === 1 ? "" : "s"}`}
                            </p>
                          ))}
                        </div>
                      </div>
                    ) : null}
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
                      {item.videoProduction ? (
                        <>
                          {previewUrl ? (
                            <div>
                              <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-400">
                                Finished Video · Version {preview?.version ?? item.videoProduction.currentVersion ?? 1}
                              </p>
                              <video
                                key={previewUrl}
                                className="mt-3 max-h-[680px] w-full rounded-2xl border border-white/10 bg-black"
                                controls
                                preload="metadata"
                                src={previewUrl}
                              />
                              <p className="mt-2 text-sm text-gray-400">
                                Pause, scrub, inspect timing, and replay any scene before approval.
                              </p>
                            </div>
                          ) : null}
                          <ReviewBlock
                            label="Why KAI Directed It This Way"
                            value={item.videoProduction.whyKaiDirectedItThisWay}
                          />
                          <ReviewBlock
                            label="Video Direction"
                            value={`${formatLabel(item.videoProduction.direction?.pace)} pacing · ${formatLabel(item.videoProduction.direction?.textDensity)} text · ${item.videoProduction.direction?.platform ?? "Selected platform"}${item.videoProduction.direction?.changedVariable ? ` · controlled change: ${formatLabel(item.videoProduction.direction.changedVariable)}` : ""}`}
                          />
                          {versions.length > 0 ? (
                            <div>
                              <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-400">Compare Versions</p>
                              <div className="mt-3 grid gap-3 lg:grid-cols-2">
                                {versions.map((version) => (
                                  <button
                                    key={`${item.id}-version-${version.version}`}
                                    type="button"
                                    onClick={() => setPreviewVersions((current) => ({ ...current, [item.id]: version.version }))}
                                    className={`rounded-xl border p-4 text-left ${previewVersion === version.version ? "border-green-300 bg-green-400/10" : "border-white/10 bg-black/20"}`}
                                  >
                                    <span className="font-black text-white">Version {version.version} · {formatLabel(version.changeType)}</span>
                                    <span className="mt-1 block text-sm text-gray-300">{version.request}</span>
                                    <span className="mt-1 block text-xs text-gray-500">{version.platform}</span>
                                  </button>
                                ))}
                              </div>
                            </div>
                          ) : null}
                          {preview ? (
                            <div>
                              <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-400">Approve This Version By Platform</p>
                              <div className="mt-3 flex flex-wrap gap-2">
                                {platforms.map((platform) => {
                                  const lower = platform.toLowerCase();
                                  const key = lower.includes("youtube") ? "youtube" : lower.includes("tiktok") ? "tiktok" : lower.includes("instagram") ? "instagram" : lower.includes("facebook") ? "facebook" : lower;
                                  const locked = item.platformApprovals?.[key]?.version === preview.version;
                                  return (
                                    <button
                                      key={`${item.id}-${key}-${preview.version}`}
                                      type="button"
                                      onClick={() => approvePlatformVersion(item, key, preview.version)}
                                      className={`rounded-xl border px-4 py-2 text-sm font-bold ${locked ? "border-green-300 bg-green-400/20 text-green-100" : "border-cyan-400/30 bg-cyan-400/10 text-cyan-100"}`}
                                    >
                                      {locked ? `Version ${preview.version} locked for ${platform}` : `Approve Version ${preview.version} for ${platform}`}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          ) : null}
                        </>
                      ) : null}
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
                    onClick={() => editItem(item)}
                    className="rounded-xl border border-white/15 bg-white/5 px-5 py-3 font-bold text-white transition hover:bg-white/10"
                  >
                    Edit
                  </button>

                  {item.videoProduction ? (
                    <button
                      type="button"
                      onClick={() => reviseVideo(item)}
                      disabled={revisingId === item.id}
                      className="rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-5 py-3 font-bold text-cyan-100 transition hover:bg-cyan-400/20 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {revisingId === item.id ? "Revising Video..." : "Request Video Changes"}
                    </button>
                  ) : null}

                  <button
                    type="button"
                    onClick={() => rejectItem(item.id)}
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
