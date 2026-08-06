"use client";

import { useState } from "react";
import { getKaiMemory } from "../core/runtime/memoryStore";
import {
  getClientRuntime,
  setClientRuntime,
} from "../core/runtime/clientRuntime";
import type { KaiContentIdea } from "../core/runtime/contentGenerator";

type GeneratedIdea = {
  title?: string;
  hook?: string;
  caption?: string;
  reason?: string;
  format?: "faceless_video" | "record_yourself" | "upload_video";
  hashtags?: string[];
  thumbnailIdea?: string;
  callToAction?: string;
  audience?: string;
  recommendedPlatforms?: string[];
  videoPlan?: {
    openingText?: string;
    scenes?: string[];
    endingText?: string;
    estimatedLengthSeconds?: number;
  };
};

type KaiContentResponse = {
  ideas?: GeneratedIdea[];
  error?: string;
};

export default function KAILiveAITest() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function saveToReviewQueue(idea: GeneratedIdea) {
    const openingText = idea.videoPlan?.openingText ?? "";
    const scenes = Array.isArray(idea.videoPlan?.scenes)
      ? idea.videoPlan.scenes
      : [];
    const endingText = idea.videoPlan?.endingText ?? "";

    const videoPlan = {
      openingText,
      scenes,
      endingText,
      estimatedLengthSeconds:
        idea.videoPlan?.estimatedLengthSeconds ?? 30,
    };

    const script = [openingText, ...scenes, endingText]
      .filter(Boolean)
      .join("\n\n");

    const response = await fetch("/api/review", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        idea: idea.reason ?? "",
        reason: idea.reason ?? "",
        hook: idea.hook ?? "",
        title: idea.title ?? "Untitled idea",
        script,
        caption: idea.caption ?? "",
        hashtags: Array.isArray(idea.hashtags) ? idea.hashtags : [],
        thumbnailIdea: idea.thumbnailIdea ?? "",
        callToAction: idea.callToAction ?? "",
        audience: idea.audience ?? "",
        recommendedPlatforms: Array.isArray(
          idea.recommendedPlatforms
        )
          ? idea.recommendedPlatforms
          : [],
        videoPlan,
        format: idea.format ?? "faceless_video",
        destinationLink: "",
        pinnedComment: idea.callToAction ?? "",
      }),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(
        data.message ||
          "KWEVORA could not save an item to the Review Queue."
      );
    }
  }

  async function runLiveAI() {
    setLoading(true);
    setMessage("KAI is calling the live AI...");

    try {
      const response = await fetch("/api/kai/content", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          memory: getKaiMemory(),
        }),
      });

      const data = (await response.json()) as KaiContentResponse;

      if (!response.ok) {
        throw new Error(data.error || "Live AI request failed.");
      }

      if (!Array.isArray(data.ideas) || data.ideas.length === 0) {
        throw new Error(
          "Live AI responded, but no content packages were returned."
        );
      }

      const ideas: KaiContentIdea[] = data.ideas.map((idea) => ({
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        title: idea.title ?? "Untitled idea",
        hook: idea.hook ?? "",
        caption: idea.caption ?? "",
        reason: idea.reason ?? "",
        format: idea.format ?? "faceless_video",
        hashtags: Array.isArray(idea.hashtags) ? idea.hashtags : [],
        thumbnailIdea: idea.thumbnailIdea ?? "",
        callToAction: idea.callToAction ?? "",
        audience: idea.audience ?? "",
        recommendedPlatforms: Array.isArray(
          idea.recommendedPlatforms
        )
          ? idea.recommendedPlatforms
          : [],
        videoPlan: {
          openingText: idea.videoPlan?.openingText ?? "",
          scenes: Array.isArray(idea.videoPlan?.scenes)
            ? idea.videoPlan.scenes
            : [],
          endingText: idea.videoPlan?.endingText ?? "",
          estimatedLengthSeconds:
            idea.videoPlan?.estimatedLengthSeconds ?? 30,
        },
      }));

      const current = getClientRuntime();

      setClientRuntime({
        ...current,
        contentIdeas: ideas,
        lastUpdated: new Date().toISOString(),
      });

      for (const idea of data.ideas) {
        await saveToReviewQueue(idea);
      }

      setMessage(
        `${data.ideas.length} complete content packages were generated and saved to the Review Queue.`
      );
    } catch (error) {
      console.error("Live AI generation failed:", error);

      setMessage(
        error instanceof Error
          ? error.message
          : "Something went wrong reading the live AI response."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-3xl border border-orange-500/30 bg-orange-950/10 p-8">
      <p className="text-sm font-bold tracking-[0.35em] text-orange-300">
        LIVE AI TEST
      </p>

      <h2 className="mt-4 text-4xl font-black">
        Generate real AI content.
      </h2>

      <p className="mt-4 max-w-3xl text-gray-300">
        KAI sends its memory to the server, creates complete content
        packages, stores them for Video Studio, and places the full
        package into the Review Queue.
      </p>

      <button
        type="button"
        onClick={runLiveAI}
        disabled={loading}
        className="mt-6 rounded-2xl bg-orange-600 px-8 py-4 text-lg font-black transition hover:bg-orange-500 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? "Calling Live AI..." : "Run Live AI"}
      </button>

      {message ? (
        <p className="mt-5 rounded-2xl bg-black/30 p-4 text-gray-300">
          {message}
        </p>
      ) : null}
    </section>
  );
}