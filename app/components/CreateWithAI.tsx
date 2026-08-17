"use client";

import { useEffect, useState } from "react";

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
  qualityScore?: { total?: number };
};

type CreativeApproach =
  | "emotional_story"
  | "problem_solution"
  | "product_demonstration";

type GenerateVideoResponse = {
  success: boolean;
  video?: GeneratedVideo;
  error?: string;
};

type ProductUploadResponse = {
  success: boolean;
  urls?: string[];
  error?: string;
};

type ProductIngestResponse = {
  success: boolean;
  product?: {
    title: string;
    description: string;
    productAssetUrls: string[];
  };
  error?: string;
};

type StanProfileResponse = {
  success: boolean;
  stan?: {
    profile?: {
      productUrl?: string;
      productName?: string;
    };
  };
};

export default function CreateWithAI() {
  const [topic, setTopic] = useState("");
  const [productName, setProductName] = useState("");
  const [offerDescription, setOfferDescription] = useState("");
  const [audience, setAudience] = useState("");
  const [destination, setDestination] = useState("");
  const [productFiles, setProductFiles] = useState<File[]>([]);
  const [creativeApproach, setCreativeApproach] =
    useState<CreativeApproach>("product_demonstration");
  const [useOpenArt, setUseOpenArt] = useState(false);

  const [status, setStatus] =
    useState<GenerationStatus>("idle");

  const [generatedVideo, setGeneratedVideo] =
    useState<GeneratedVideo | null>(null);

  const [errorMessage, setErrorMessage] =
    useState("");

  useEffect(() => {
    let active = true;
    void fetch("/api/kai/stan-store", { cache: "no-store" })
      .then((response) => response.json() as Promise<StanProfileResponse>)
      .then((result) => {
        if (!active || !result.success) return;
        const savedProductUrl = result.stan?.profile?.productUrl?.trim() ?? "";
        const savedProductName = result.stan?.profile?.productName?.trim() ?? "";
        if (savedProductUrl) setDestination(savedProductUrl);
        if (savedProductName) setProductName(savedProductName);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

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
    setStatus("preparing");
    setErrorMessage("");
    setGeneratedVideo(null);

    try {
      let productAssetUrls: string[] = [];
      let resolvedProductName = productName;
      let resolvedOfferDescription = offerDescription;
      let resolvedTopic = topic.trim();
      if (productFiles.length > 0) {
        const uploadData = new FormData();
        productFiles.forEach((file) => uploadData.append("files", file));
        const uploadResponse = await fetch("/api/kai/product-assets", { method: "POST", body: uploadData });
        const uploadResult = (await uploadResponse.json()) as ProductUploadResponse;
        if (!uploadResponse.ok || !uploadResult.success || !uploadResult.urls?.length) {
          throw new Error(uploadResult.error || "KAI could not upload the product proof.");
        }
        productAssetUrls = uploadResult.urls;
      } else {
        if (!destination.trim()) throw new Error("Connect or paste the Stan Store product link so KAI can inspect the product automatically.");
        const ingestResponse = await fetch("/api/kai/product-ingest", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sourceUrl: destination.trim() }),
        });
        const ingestResult = (await ingestResponse.json()) as ProductIngestResponse;
        if (!ingestResponse.ok || !ingestResult.success || !ingestResult.product?.productAssetUrls.length) {
          throw new Error(ingestResult.error || "KAI could not inspect the Stan product page.");
        }
        productAssetUrls = ingestResult.product.productAssetUrls;
        resolvedProductName = ingestResult.product.title || productName;
        resolvedOfferDescription = ingestResult.product.description || offerDescription;
        setProductName(resolvedProductName);
        setOfferDescription(resolvedOfferDescription);
      }

      if (!resolvedProductName.trim()) resolvedProductName = "Digital product";
      if (!resolvedOfferDescription.trim()) resolvedOfferDescription = `A practical digital product called ${resolvedProductName}.`;
      if (!resolvedTopic) {
        resolvedTopic = `Create a stop-scroll, believable product demonstration for ${resolvedProductName}. Show the real product solving the buyer's problem, prove the outcome visually, and lead naturally to the offer without displaying internal instructions.`;
      }

      const response = await fetch(
        "/api/kai/generate-video",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            topic: resolvedTopic,
            productName: resolvedProductName,
            offerDescription: resolvedOfferDescription,
            audience,
            destination,
            productAssetUrls,
            creativeApproach: productFiles.length > 0 ? creativeApproach : undefined,
            minimumQualityScore: 76,
            format: "vertical",
            aspectRatio: "9:16",
            durationSeconds: 30,
            creationMode:
              "kai-directed-product-proof-video",
            useOpenArt,
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
        Give KAI the product link. KAI will inspect the listing, learn the offer,
        select the strongest direction, create the video, quality-check it, and
        prepare only the passing result for your Review Queue.
      </p>

      <div className="mt-5 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-4 text-sm leading-6 text-emerald-100">
        <strong>KAI Autopilot:</strong> your saved Stan product is loaded automatically. Click once and KAI handles product research, audience, hook, direction, narration, footage, music, quality control, and the Review Queue.
      </div>

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
          placeholder="Optional — leave blank and KAI will choose the strongest product-specific angle automatically."
        />
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <label className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-300">
          Product (filled automatically)
          <input value={productName} onChange={(event) => setProductName(event.target.value)} disabled={isWorking} className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-base normal-case tracking-normal text-white" />
        </label>
        <label className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-300">
          Optional creative override
          <select value={creativeApproach} onChange={(event) => setCreativeApproach(event.target.value as CreativeApproach)} disabled={isWorking} className="mt-2 w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-base normal-case tracking-normal text-white">
            <option value="emotional_story">Emotional story</option>
            <option value="problem_solution">Problem → solution</option>
            <option value="product_demonstration">Product demonstration</option>
          </select>
        </label>
        <label className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-300 md:col-span-2">
          What the buyer gets (learned automatically)
          <textarea value={offerDescription} onChange={(event) => setOfferDescription(event.target.value)} disabled={isWorking} rows={3} className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-base normal-case tracking-normal text-white" />
        </label>
        <label className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-300">
          Audience
          <textarea value={audience} onChange={(event) => setAudience(event.target.value)} disabled={isWorking} rows={3} className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-base normal-case tracking-normal text-white" />
        </label>
        <label className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-300">
          Stan Store product link
          <textarea value={destination} onChange={(event) => setDestination(event.target.value)} disabled={isWorking} rows={3} placeholder="Paste the exact product link" className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-base normal-case tracking-normal text-white placeholder:text-gray-600" />
        </label>
        <label className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-300 md:col-span-2">
          Optional: give KAI private product footage once
          <span className="mt-2 block text-sm font-normal normal-case tracking-normal text-gray-300">
            KAI automatically reads the public Stan product page. Only add files when you want KAI to show private pages that Stan does not display publicly. KAI will reuse public product proof automatically.
          </span>
          <input
            type="file"
            multiple
            accept="image/png,image/jpeg,image/webp,video/mp4,video/webm,video/quicktime"
            disabled={isWorking}
            onChange={(event) => setProductFiles(Array.from(event.target.files ?? []))}
            className="mt-3 block w-full rounded-xl border border-dashed border-cyan-300/40 bg-black/30 px-4 py-4 text-sm normal-case tracking-normal text-white file:mr-4 file:rounded-lg file:border-0 file:bg-cyan-400 file:px-4 file:py-2 file:font-bold file:text-black"
          />
          {productFiles.length > 0 ? (
            <span className="mt-2 block text-sm font-normal normal-case tracking-normal text-emerald-300">
              {productFiles.length} real product file{productFiles.length === 1 ? "" : "s"} ready: {productFiles.map((file) => file.name).join(", ")}
            </span>
          ) : null}
        </label>
      </div>

      <label className="mt-5 flex items-start gap-3 rounded-2xl border border-amber-300/20 bg-amber-500/10 p-4">
        <input
          type="checkbox"
          checked={useOpenArt}
          onChange={(event) => setUseOpenArt(event.target.checked)}
          disabled={isWorking}
          className="mt-1 h-4 w-4 accent-amber-300"
        />
        <span>
          <span className="block font-black text-amber-200">
            Optional premium OpenArt hook
          </span>
          <span className="mt-1 block text-sm leading-6 text-gray-300">
            Off by default. When enabled, KAI generates one premium OpenArt scene and uses your OpenArt credits. Free footage and KAI motion are used for the rest.
          </span>
        </span>
      </label>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={generateVideo}
          disabled={isWorking}
          className="rounded-xl bg-cyan-400 px-5 py-3 font-black text-black transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isWorking
            ? "KAI Is Creating..."
            : "Let KAI Build the Campaign"}
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
          {typeof generatedVideo.qualityScore?.total === "number" ? (
            <p className="mt-3 text-sm font-black text-emerald-300">
              Premium quality gate: {generatedVideo.qualityScore.total}/100 passed
            </p>
          ) : null}
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
