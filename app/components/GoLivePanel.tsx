"use client";

import { useState } from "react";

export default function GoLive() {
  const [title, setTitle] = useState("");
  const [platform, setPlatform] = useState("YouTube");
  const [message, setMessage] = useState("");

  function prepareLive() {
    if (!title.trim()) {
      setMessage("Enter a live topic first.");
      return;
    }

    setMessage(
      `KAI is preparing your ${platform} live session. Direct launching and live assistance are the next connection steps.`
    );
  }

  return (
    <section className="rounded-2xl border border-red-400/20 bg-red-500/10 p-6">
      <p className="text-sm font-bold uppercase tracking-[0.25em] text-red-300">
        Go Live
      </p>

      <h3 className="mt-3 text-2xl font-black">
        Prepare your next live session.
      </h3>

      <p className="mt-3 max-w-3xl text-gray-300">
        KAI will help prepare your title, talking points, call to action, and
        follow-up clips.
      </p>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <label>
          <span className="text-sm font-bold text-gray-300">
            Live topic
          </span>

          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="What are you going live about?"
            className="mt-2 w-full rounded-xl border border-white/10 bg-black px-4 py-3 outline-none focus:border-red-400"
          />
        </label>

        <label>
          <span className="text-sm font-bold text-gray-300">
            Platform
          </span>

          <select
            value={platform}
            onChange={(event) => setPlatform(event.target.value)}
            className="mt-2 w-full rounded-xl border border-white/10 bg-black px-4 py-3 outline-none focus:border-red-400"
          >
            <option>YouTube</option>
            <option>TikTok</option>
            <option>Instagram</option>
            <option>Facebook</option>
          </select>
        </label>
      </div>

      <button
        type="button"
        onClick={prepareLive}
        className="mt-5 rounded-xl bg-red-600 px-5 py-3 font-black transition hover:bg-red-500"
      >
        Prepare My Live
      </button>

      {message ? (
        <p className="mt-6 rounded-xl border border-white/10 bg-black/30 p-4">
          {message}
        </p>
      ) : null}
    </section>
  );
}