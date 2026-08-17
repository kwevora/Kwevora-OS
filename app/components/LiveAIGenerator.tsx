"use client";

import { useEffect, useState } from "react";

type YouTubeStatus = {
  connected: boolean;
  channelId: string;
  channelName: string;
};

type VideoPlan = {
  openingText: string;
  scenes: string[];
  endingText: string;
  estimatedLengthSeconds: number;
};

type GeneratedContent = {
  title: string;
  hook: string;
  caption: string;
  hashtags: string[];
  thumbnailIdea: string;
  callToAction: string;
  reason: string;
  audience: string;
  format: "faceless_video" | "record_yourself" | "upload_video";
  recommendedPlatforms: string[];
  videoPlan: VideoPlan;
};

type KaiContentResponse = {
  ideas?: GeneratedContent[];
  error?: string;
};

export default function LiveAIGenerator() {
  const [status, setStatus] = useState<YouTubeStatus | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<
    GeneratedContent[]
  >([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadYouTubeStatus() {
      try {
        const response = await fetch("/api/youtube/status", {
          method: "GET",
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Could not load YouTube connection.");
        }

        const data = (await response.json()) as YouTubeStatus;
        setStatus(data);
      } catch {
        setStatus({
          connected: false,
          channelId: "",
          channelName: "",
        });
      } finally {
        setLoadingStatus(false);
      }
    }

    loadYouTubeStatus();
  }, []);

  async function saveToReviewQueue(content: GeneratedContent) {
    const response = await fetch("/api/review", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        idea: content.reason,
        title: content.title,
        hook: content.hook,
        script: [
          content.videoPlan.openingText,
          ...content.videoPlan.scenes,
          content.videoPlan.endingText,
        ],
        caption: content.caption,
        hashtags: content.hashtags,
        thumbnailIdea: content.thumbnailIdea,
        callToAction: content.callToAction,
        audience: content.audience,
        recommendedPlatforms: content.recommendedPlatforms,
        videoPlan: content.videoPlan,
        reason: content.reason,
        format: content.format,
        destinationLink: "",
        pinnedComment: content.callToAction,
      }),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(
        data.message || "KWEVORA could not save the content package."
      );
    }
  }

  async function generateContent() {
    setGenerating(true);
    setMessage("");
    setGeneratedContent([]);

    try {
      const response = await fetch("/api/kai/content", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          memory: [],
        }),
      });

      const data = (await response.json()) as KaiContentResponse;

      if (!response.ok) {
        throw new Error(
          data.error || "KAI could not generate the content packages."
        );
      }

      if (!Array.isArray(data.ideas) || data.ideas.length === 0) {
        throw new Error("KAI returned no complete content packages.");
      }

      await Promise.all(
        data.ideas.map((content) => saveToReviewQueue(content))
      );

      setGeneratedContent(data.ideas);

      setMessage(
        `${data.ideas.length} complete content packages were created and saved to the Review Queue.`
      );
    } catch (error) {
      console.error("Content generation error:", error);

      setMessage(
        error instanceof Error
          ? error.message
          : "KAI could not generate content. Please try again."
      );
    } finally {
      setGenerating(false);
    }
  }

  if (loadingStatus) {
    return (
      <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <p className="text-sm font-bold uppercase tracking-[0.25em] text-gray-400">
          Checking YouTube connection...
        </p>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      {status?.connected ? (
        <section className="rounded-2xl border border-green-500/30 bg-green-500/10 p-6">
          <div className="flex flex-wrap items-center justify-between gap-5">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.25em] text-green-300">
                YouTube Connected
              </p>

              <h2 className="mt-3 text-2xl font-black text-white">
                {status.channelName}
              </h2>

              <p className="mt-2 text-gray-300">
                KWEVORA can prepare approved content for this channel.
              </p>
            </div>

            <div className="rounded-full border border-green-400/30 bg-green-400/10 px-4 py-2 text-sm font-bold text-green-200">
              Ready to Publish
            </div>
          </div>
        </section>
      ) : (
        <section className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6">
          <p className="text-sm font-bold uppercase tracking-[0.25em] text-red-300">
            YouTube Not Connected
          </p>

          <h2 className="mt-3 text-2xl font-black text-white">
            Connect YouTube to begin publishing.
          </h2>

          <a
            href="/api/youtube/connect"
            className="mt-5 inline-flex rounded-xl bg-red-600 px-5 py-3 font-bold text-white transition hover:bg-red-500"
          >
            Connect YouTube
          </a>
        </section>
      )}

      <section className="rounded-2xl border border-cyan-500/30 bg-cyan-500/10 p-6">
        <p className="text-sm font-bold uppercase tracking-[0.25em] text-cyan-300">
          Live AI Content Generator
        </p>

        <h2 className="mt-3 text-2xl font-black text-white">
          Let KAI build three complete video packages.
        </h2>

        <p className="mt-3 text-gray-300">
          KAI will create the titles, hooks, captions, hashtags, thumbnail
          ideas, calls to action, audiences, platform recommendations, and
          video plans, then save everything to the Review Queue.
        </p>

        <button
          type="button"
          onClick={generateContent}
          disabled={generating}
          className="mt-5 rounded-xl bg-cyan-400 px-6 py-3 font-black text-black transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {generating ? "KAI Is Generating..." : "Generate With Live AI"}
        </button>

        {message ? (
          <p className="mt-4 font-bold text-cyan-100">{message}</p>
        ) : null}
      </section>

      {generatedContent.map((content, index) => (
        <section
          key={`${content.title}-${index}`}
          className="rounded-2xl border border-white/10 bg-white/5 p-6"
        >
          <p className="text-sm font-bold uppercase tracking-[0.25em] text-purple-300">
            Fresh Content Package {index + 1}
          </p>

          <h3 className="mt-3 text-3xl font-black text-white">
            {content.title}
          </h3>

          <div className="mt-6 space-y-5">
            <ContentBlock label="Hook" value={content.hook} />
            <ContentBlock label="Caption" value={content.caption} />
            <ContentBlock
              label="Thumbnail Idea"
              value={content.thumbnailIdea}
            />
            <ContentBlock
              label="Call To Action"
              value={content.callToAction}
            />
            <ContentBlock label="Audience" value={content.audience} />
            <ContentBlock
              label="Recommended Platforms"
              value={content.recommendedPlatforms.join(", ")}
            />
            <ContentBlock
              label="Video Plan"
              value={[
                content.videoPlan.openingText,
                ...content.videoPlan.scenes,
                content.videoPlan.endingText,
              ].join("\n")}
            />
            <ContentBlock label="Why KAI Made This" value={content.reason} />

            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-400">
                Hashtags
              </p>

              <div className="mt-2 flex flex-wrap gap-2">
                {content.hashtags.map((hashtag) => (
                  <span
                    key={`${content.title}-${hashtag}`}
                    className="rounded-full border border-purple-400/30 bg-purple-400/10 px-3 py-1 text-sm font-bold text-purple-200"
                  >
                    {hashtag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>
      ))}
    </div>
  );
}

function ContentBlock({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-400">
        {label}
      </p>

      <p className="mt-2 whitespace-pre-line rounded-xl border border-white/10 bg-black/20 p-4 leading-7 text-white">
        {value}
      </p>
    </div>
  );
}