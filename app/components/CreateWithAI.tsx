"use client";

import { useState } from "react";

type GenerationStatus =
  | "idle"
  | "preparing"
  | "rendering"
  | "complete"
  | "error";

type SelectedConcept = {
  id: string;
  name: string;
  confidence: number;
  reason: string;
};

type AlternateConcept = {
  id: string;
  name: string;
  confidence: number;
  reason: string;
  hook: string;
  emotion: string;
  visualStyle: string;
  thumbnailIdea: string;
};

type GeneratedVideo = {
  id: string;
  title: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  status: string;
  selectedConcept?: SelectedConcept;
  alternateConcepts?: AlternateConcept[];
};

type GenerateVideoResponse = {
  success: boolean;
  video?: GeneratedVideo;
  error?: string;
};

export default function CreateWithAI() {
  const [topic, setTopic] = useState(
    "Help people take one step toward escaping the paycheck-to-paycheck lifestyle",
  );

  const [status, setStatus] =
    useState<GenerationStatus>("idle");

  const [generatedVideo, setGeneratedVideo] =
    useState<GeneratedVideo | null>(null);

  const [errorMessage, setErrorMessage] =
    useState("");

  const isWorking =
    status === "preparing" ||
    status === "rendering";

  const videoUrl =
    typeof generatedVideo?.videoUrl === "string"
      ? generatedVideo.videoUrl.trim()
      : "";

  const thumbnailUrl =
    typeof generatedVideo?.thumbnailUrl === "string"
      ? generatedVideo.thumbnailUrl.trim()
      : "";

  function getStatusMessage() {
    if (status === "preparing") {
      return "KAI is comparing creative concepts and building the strongest video plan...";
    }

    if (status === "rendering") {
      return "KAI selected the best concept and is rendering the actual video...";
    }

    if (status === "complete") {
      return videoUrl
        ? "Your video has been created and is ready for review."
        : "Your content package was created, but the MP4 is not ready yet.";
    }

    if (status === "error") {
      return errorMessage;
    }

    return "";
  }

  async function generateVideo() {
    const cleanTopic = topic.trim();

    if (!cleanTopic) {
      setStatus("error");
      setErrorMessage(
        "Enter a topic before asking KAI to create the video.",
      );
      return;
    }

    setStatus("preparing");
    setErrorMessage("");
    setGeneratedVideo(null);

    try {
      const response = await fetch(
        "/api/kai/generate-video",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            topic: cleanTopic,
            format: "vertical",
            aspectRatio: "9:16",
            durationSeconds: 30,
            creationMode:
              "faceless-text-video",
            sendToReviewQueue: true,
          }),
        },
      );

      setStatus("rendering");

      const result =
        (await response.json()) as GenerateVideoResponse;

      if (
        !response.ok ||
        !result.success ||
        !result.video
      ) {
        throw new Error(
          result.error ||
            "KAI could not create the video.",
        );
      }

      setGeneratedVideo(result.video);
      setStatus("complete");
    } catch (error) {
      console.error(
        "KAI video generation failed:",
        error,
      );

      setStatus("error");

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "KAI could not create the video.",
      );
    }
  }

  return (
    <section className="rounded-3xl border border-cyan-400/20 bg-cyan-500/10 p-6">
      <p className="text-sm font-bold uppercase tracking-[0.25em] text-cyan-300">
        Create with AI
      </p>

      <h3 className="mt-3 text-2xl font-black text-white">
        Ask KAI to create the actual video.
      </h3>

      <p className="mt-3 max-w-3xl leading-7 text-gray-300">
        Give KAI the topic. KAI will compare creative
        concepts, select the strongest direction, render
        the video, and prepare it for your Review Queue.
      </p>

      <div className="mt-6">
        <label
          htmlFor="kai-video-topic"
          className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-300"
        >
          What should the video be about?
        </label>

        <textarea
          id="kai-video-topic"
          value={topic}
          onChange={(event) =>
            setTopic(event.target.value)
          }
          disabled={isWorking}
          rows={4}
          className="mt-3 w-full resize-none rounded-2xl border border-white/10 bg-black/30 px-4 py-4 text-white outline-none transition placeholder:text-gray-500 focus:border-cyan-400/50 disabled:cursor-not-allowed disabled:opacity-60"
          placeholder="Tell KAI what the video should be about..."
        />
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={generateVideo}
          disabled={isWorking}
          className="rounded-xl bg-cyan-400 px-5 py-3 font-black text-black transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isWorking
            ? "KAI Is Creating..."
            : "Create Actual Video"}
        </button>

        <div className="rounded-full border border-white/10 bg-black/20 px-4 py-2 text-sm text-gray-300">
          Vertical · 9:16 · 30 seconds
        </div>
      </div>

      {status !== "idle" && (
        <div
          className={`mt-6 rounded-2xl border p-4 ${
            status === "error"
              ? "border-red-400/20 bg-red-500/10"
              : status === "complete"
                ? "border-emerald-400/20 bg-emerald-500/10"
                : "border-cyan-400/20 bg-cyan-500/10"
          }`}
        >
          <p className="text-sm font-bold text-white">
            {getStatusMessage()}
          </p>
        </div>
      )}

      {generatedVideo?.selectedConcept && (
        <div className="mt-6 rounded-2xl border border-purple-400/20 bg-purple-500/10 p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-purple-300">
                KAI Selected
              </p>

              <h4 className="mt-2 text-xl font-black text-white">
                {
                  generatedVideo
                    .selectedConcept.name
                }
              </h4>
            </div>

            <div className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-4 py-2 text-sm font-black text-emerald-300">
              {
                generatedVideo
                  .selectedConcept.confidence
              }
              % confidence
            </div>
          </div>

          <p className="mt-4 leading-7 text-gray-300">
            {
              generatedVideo
                .selectedConcept.reason
            }
          </p>
        </div>
      )}

      {generatedVideo &&
        generatedVideo.alternateConcepts &&
        generatedVideo.alternateConcepts
          .length > 0 && (
          <div className="mt-6">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-gray-400">
              Other Concepts KAI Considered
            </p>

            <div className="mt-3 grid gap-3">
              {generatedVideo.alternateConcepts.map(
                (concept) => (
                  <div
                    key={concept.id}
                    className="rounded-2xl border border-white/10 bg-black/20 p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="font-black text-white">
                        {concept.name}
                      </p>

                      <span className="rounded-full border border-white/10 px-3 py-1 text-xs font-bold text-gray-300">
                        {concept.confidence}%
                      </span>
                    </div>

                    <p className="mt-3 text-sm leading-6 text-gray-400">
                      {concept.reason}
                    </p>

                    <p className="mt-3 text-sm text-cyan-300">
                      Hook: {concept.hook}
                    </p>
                  </div>
                ),
              )}
            </div>
          </div>
        )}

      {generatedVideo && (
        <div className="mt-6 rounded-2xl border border-emerald-400/20 bg-black/25 p-5">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-300">
            {videoUrl
              ? "Video Ready"
              : "Content Package Ready"}
          </p>

          <h4 className="mt-2 text-xl font-black text-white">
            {generatedVideo.title ||
              "Untitled KWEVORA Video"}
          </h4>

          {videoUrl ? (
            <video
              controls
              playsInline
              preload="metadata"
              poster={
                thumbnailUrl || undefined
              }
              className="mt-5 aspect-[9/16] max-h-[620px] w-full rounded-2xl bg-black object-contain"
            >
              <source
                src={videoUrl}
                type="video/mp4"
              />

              Your browser could not play this
              video.
            </video>
          ) : (
            <div className="mt-5 flex min-h-[320px] items-center justify-center rounded-2xl border border-dashed border-white/15 bg-black/30 p-8 text-center">
              <div>
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-cyan-400/10 text-2xl">
                  ▶
                </div>

                <p className="mt-4 font-black text-white">
                  The MP4 is not connected yet.
                </p>

                <p className="mt-2 text-sm leading-6 text-gray-400">
                  KAI created the content
                  package, but no finished video
                  address was returned.
                </p>
              </div>
            </div>
          )}

          <p className="mt-4 text-sm text-gray-300">
            The package has been prepared for
            the Review Queue.
          </p>
        </div>
      )}
    </section>
  );
}