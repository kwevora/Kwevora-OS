"use client";

import { useState } from "react";

export default function UploadVideo() {
  const [file, setFile] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");

  async function sendToKai() {
    if (!file) {
      setMessage("Choose a video first.");
      return;
    }

    setSending(true);
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

      const response = await fetch("/api/kai/ingest-video", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message ||
            "KWEVORA could not upload this video."
        );
      }

      setMessage(
        "Video uploaded successfully and added to the Review Queue."
      );
    } catch (error) {
      console.error(error);

      setMessage(
        error instanceof Error
          ? error.message
          : "Upload failed."
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="rounded-2xl border border-purple-400/20 bg-purple-500/10 p-6">
      <p className="text-sm font-bold uppercase tracking-[0.25em] text-purple-300">
        Upload Video
      </p>

      <h3 className="mt-3 text-2xl font-black">
        Give KAI an existing video.
      </h3>

      <p className="mt-3 text-gray-300">
        Upload a finished recording and let KAI prepare it for your Review Queue.
      </p>

      <label className="mt-6 block cursor-pointer rounded-2xl border border-dashed border-purple-400/40 bg-purple-500/10 p-8 text-center transition hover:bg-purple-500/15">
        <span className="text-lg font-black">
          Choose Video
        </span>

        <input
          type="file"
          accept="video/*"
          className="hidden"
          onChange={(event) =>
            setFile(event.target.files?.[0] ?? null)
          }
        />
      </label>

      {file ? (
        <div className="mt-6 rounded-xl border border-white/10 bg-black/20 p-5">
          <p className="font-black">{file.name}</p>

          <p className="mt-1 text-sm text-gray-400">
            {(file.size / 1024 / 1024).toFixed(2)} MB
          </p>

          <button
            type="button"
            onClick={sendToKai}
            disabled={sending}
            className="mt-5 rounded-xl bg-purple-600 px-5 py-3 font-black transition hover:bg-purple-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {sending ? "Sending to KAI..." : "Send Video to KAI"}
          </button>
        </div>
      ) : null}

      {message ? (
        <p className="mt-6 rounded-xl border border-white/10 bg-black/30 p-4">
          {message}
        </p>
      ) : null}
    </section>
  );
}