"use client";

import { useState } from "react";
import CreateWithAI from "./CreateWithAI";
import GoLive from "./GoLivePanel";
import RecordYourself from "./RecordYourself";
import UploadVideo from "./UploadVideo";

type CreationMode = "ai" | "record" | "upload" | "live";

export default function VideoCreationModes() {
  const [selectedMode, setSelectedMode] =
    useState<CreationMode>("ai");

  return (
    <section className="rounded-3xl border border-white/10 bg-white/5 p-8">
      <p className="text-sm font-bold uppercase tracking-[0.35em] text-purple-300">
        Choose How You Want to Create
      </p>

      <h2 className="mt-4 text-4xl font-black text-white">
        Four ways to create inside Video Studio.
      </h2>

      <p className="mt-4 max-w-4xl text-gray-300">
        Create with AI, record yourself, upload an existing video, or prepare a
        live broadcast.
      </p>

      <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <ModeButton
          icon="🎬"
          title="Create with AI"
          description="KAI creates a faceless video package."
          active={selectedMode === "ai"}
          onClick={() => setSelectedMode("ai")}
        />

        <ModeButton
          icon="📹"
          title="Record Yourself"
          description="Record inside KWEVORA and send it to KAI."
          active={selectedMode === "record"}
          onClick={() => setSelectedMode("record")}
        />

        <ModeButton
          icon="📤"
          title="Upload Video"
          description="Give KAI an existing video to improve."
          active={selectedMode === "upload"}
          onClick={() => setSelectedMode("upload")}
        />

        <ModeButton
          icon="🔴"
          title="Go Live"
          description="Prepare a live session with KAI."
          active={selectedMode === "live"}
          onClick={() => setSelectedMode("live")}
        />
      </div>

      <div className="mt-8">
        {selectedMode === "ai" ? <CreateWithAI /> : null}
        {selectedMode === "record" ? <RecordYourself /> : null}
        {selectedMode === "upload" ? <UploadVideo /> : null}
        {selectedMode === "live" ? <GoLive /> : null}
      </div>
    </section>
  );
}

function ModeButton({
  icon,
  title,
  description,
  active,
  onClick,
}: {
  icon: string;
  title: string;
  description: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border p-5 text-left transition ${
        active
          ? "border-purple-400 bg-purple-500/20"
          : "border-white/10 bg-black/20 hover:border-white/25"
      }`}
    >
      <span className="text-3xl">{icon}</span>

      <span className="mt-4 block text-xl font-black">
        {title}
      </span>

      <span className="mt-2 block text-sm leading-6 text-gray-300">
        {description}
      </span>
    </button>
  );
}