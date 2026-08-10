"use client";

import { useState } from "react";

type VideoQuality = {
  width: number | null;
  height: number | null;
  resolution: string | null;
  quality: string;
  orientation: "portrait" | "landscape" | "square" | "unknown";
  durationSeconds: number | null;
  frameRate: number | null;
  codec: string | null;
  inspected: boolean;
};

type UploadResponse = {
  success?: boolean;
  message?: string;
  videoQuality?: VideoQuality;
  item?: {
    id?: string;
  };
};

type ProcessResponse = {
  success?: boolean;
  message?: string;
};

export default function UploadVideo() {
  const [file, setFile] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");
  const [videoQuality, setVideoQuality] =
    useState<VideoQuality | null>(null);

  async function sendToKai() {
    if (!file) {
      setMessage("Choose a video first.");
      return;
    }

    setSending(true);
    setVideoQuality(null);
    setMessage("Uploading video to KAI...");

    try {
      const formData = new FormData();

      formData.append("video", file);
      formData.append("source", "upload");
      formData.append(
        "title",
        file.name.replace(/\.[^/.]+$/, "")
      );
      formData.append(
        "notes",
        "Uploaded through Video Studio."
      );

      /*
       * STEP 1:
       * Save the exact original video and inspect its quality.
       */
      const uploadResponse = await fetch(
        "/api/kai/ingest-video",
        {
          method: "POST",
          body: formData,
        }
      );

      const uploadData: UploadResponse =
        await uploadResponse.json();

      if (
        !uploadResponse.ok ||
        !uploadData.success
      ) {
        throw new Error(
          uploadData.message ||
            "KWEVORA could not upload this video."
        );
      }

      setVideoQuality(
        uploadData.videoQuality ?? null
      );

      const reviewItemId =
        uploadData.item?.id;

      if (!reviewItemId) {
        setMessage(
          uploadData.message ||
            "Video saved in the Review Queue, but KAI could not begin processing because no Review Queue ID was returned."
        );
        return;
      }

      /*
       * STEP 2:
       * Transcribe and understand the video.
       */
      setMessage(
        "Video saved at original quality. KAI is now transcribing and understanding it..."
      );

      const processResponse = await fetch(
        "/api/kai/process-video",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            id: reviewItemId,
          }),
        }
      );

      const processData: ProcessResponse =
        await processResponse.json();

      if (
        !processResponse.ok ||
        !processData.success
      ) {
        throw new Error(
          processData.message ||
            "The video was saved, but KAI could not finish processing it."
        );
      }

      /*
       * STEP 3:
       * KAI has now created the finished content package.
       */
      const qualityText =
        uploadData.videoQuality?.inspected
          ? `${uploadData.videoQuality.quality}${
              uploadData.videoQuality.resolution
                ? ` · ${uploadData.videoQuality.resolution}`
                : ""
            }${
              uploadData.videoQuality.frameRate !== null
                ? ` · ${uploadData.videoQuality.frameRate} FPS`
                : ""
            }`
          : "original quality";

      setMessage(
        `KAI finished processing the video. ${qualityText} preserved. The transcript, title, hook, caption, hashtags, thumbnail idea, CTA, platform recommendation, and publishing recommendation are ready in the Review Queue.`
      );
    } catch (error) {
      console.error(
        "Upload or KAI processing failed:",
        error
      );

      setMessage(
        error instanceof Error
          ? error.message
          : "KWEVORA could not finish processing this video."
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
      <p className="text-sm font-black uppercase tracking-[0.25em] text-purple-300">
        Upload Video
      </p>

      <h3 className="mt-3 text-2xl font-black">
        Give KAI an existing video.
      </h3>

      <p className="mt-3 text-gray-300">
        Upload a finished recording and let KAI understand it, prepare the content package, and send it to your Review Queue.
      </p>

      <label className="mt-6 block cursor-pointer rounded-2xl border border-dashed border-purple-400/40 bg-purple-500/10 p-8 text-center transition hover:bg-purple-500/15">
        <span className="text-lg font-black">
          Choose Video
        </span>

        <input
          type="file"
          accept="video/*"
          className="hidden"
          onChange={(event) => {
            setFile(
              event.target.files?.[0] ??
                null
            );
            setMessage("");
            setVideoQuality(null);
          }}
        />
      </label>

      {file ? (
        <div className="mt-6 rounded-xl border border-white/10 bg-black/20 p-5">
          <p className="font-black">
            {file.name}
          </p>

          <p className="mt-1 text-sm text-gray-400">
            {(
              file.size /
              1024 /
              1024
            ).toFixed(2)}{" "}
            MB
          </p>

          <button
            type="button"
            onClick={sendToKai}
            disabled={sending}
            className="mt-5 rounded-xl bg-purple-600 px-5 py-3 font-black transition hover:bg-purple-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {sending
              ? "KAI Is Processing..."
              : "Send Video to KAI"}
          </button>
        </div>
      ) : null}

      {message ? (
        <div className="mt-6 rounded-xl border border-white/10 bg-black/30 p-4">
          <p>{message}</p>

          {videoQuality?.inspected ? (
            <div className="mt-4 grid gap-2 text-sm text-gray-300 sm:grid-cols-2">
              <p>
                <span className="font-bold text-white">
                  Quality:
                </span>{" "}
                {videoQuality.quality}
              </p>

              <p>
                <span className="font-bold text-white">
                  Resolution:
                </span>{" "}
                {videoQuality.resolution ??
                  "Unknown"}
              </p>

              <p>
                <span className="font-bold text-white">
                  Orientation:
                </span>{" "}
                {videoQuality.orientation}
              </p>

              <p>
                <span className="font-bold text-white">
                  Frame rate:
                </span>{" "}
                {videoQuality.frameRate !==
                null
                  ? `${videoQuality.frameRate} FPS`
                  : "Unknown"}
              </p>

              <p>
                <span className="font-bold text-white">
                  Duration:
                </span>{" "}
                {videoQuality.durationSeconds !==
                null
                  ? `${videoQuality.durationSeconds} seconds`
                  : "Unknown"}
              </p>

              <p>
                <span className="font-bold text-white">
                  Codec:
                </span>{" "}
                {videoQuality.codec ??
                  "Unknown"}
              </p>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}