"use client";

import { useEffect, useState } from "react";

type PlatformId =
  | "youtube"
  | "tiktok"
  | "instagram"
  | "facebook"
  | "linkedin"
  | "x"
  | "pinterest";

type Platform = {
  id: PlatformId;
  name: string;
  icon: string;
  description: string;
  available: boolean;
};

const platforms: Platform[] = [
  {
    id: "youtube",
    name: "YouTube",
    icon: "▶️",
    description:
      "Prepare and publish long-form videos and YouTube Shorts.",
    available: true,
  },
  {
    id: "tiktok",
    name: "TikTok",
    icon: "🎵",
    description:
      "Prepare short-form videos, captions, hashtags, and publishing plans.",
    available: false,
  },
  {
    id: "instagram",
    name: "Instagram",
    icon: "📸",
    description:
      "Prepare Reels, posts, captions, hashtags, and content schedules.",
    available: false,
  },
  {
    id: "facebook",
    name: "Facebook",
    icon: "📘",
    description:
      "Prepare Facebook posts, Reels, and page content.",
    available: false,
  },
  {
    id: "linkedin",
    name: "LinkedIn",
    icon: "💼",
    description:
      "Prepare professional posts, articles, and business updates.",
    available: false,
  },
  {
    id: "x",
    name: "X",
    icon: "𝕏",
    description:
      "Prepare short posts, threads, announcements, and promotions.",
    available: false,
  },
  {
    id: "pinterest",
    name: "Pinterest",
    icon: "📌",
    description:
      "Prepare pins, descriptions, links, and visual content plans.",
    available: false,
  },
];

export default function SettingsPage() {
  const [mode, setMode] = useState("silent");
  const [connectedPlatforms, setConnectedPlatforms] = useState<
    PlatformId[]
  >([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const savedMode = localStorage.getItem("kwevora-kai-mode");
    const savedConnections = localStorage.getItem(
      "kwevora-platform-connections"
    );

    if (savedMode) {
      setMode(savedMode);
    }

    if (savedConnections) {
      try {
        const parsedConnections = JSON.parse(savedConnections);

        if (Array.isArray(parsedConnections)) {
          setConnectedPlatforms(parsedConnections);
        }
      } catch (error) {
        console.error(
          "Platform connection settings could not be loaded:",
          error
        );
      }
    }
  }, []);

  function chooseMode(newMode: string) {
    setMode(newMode);
    localStorage.setItem("kwevora-kai-mode", newMode);
    setMessage("KAI communication mode updated.");
  }

  function connectPlatform(platform: Platform) {
    setMessage("");

    if (!platform.available) {
      setMessage(
        `${platform.name} connection support is being prepared.`
      );
      return;
    }

    const isConnected = connectedPlatforms.includes(platform.id);

    const updatedConnections = isConnected
      ? connectedPlatforms.filter(
          (platformId) => platformId !== platform.id
        )
      : [...connectedPlatforms, platform.id];

    setConnectedPlatforms(updatedConnections);

    localStorage.setItem(
      "kwevora-platform-connections",
      JSON.stringify(updatedConnections)
    );

    setMessage(
      isConnected
        ? `${platform.name} disconnected.`
        : `${platform.name} marked as connected for development testing.`
    );
  }

  return (
    <main className="min-h-screen bg-[#07040f] p-8 text-white">
      <div className="mx-auto max-w-7xl space-y-8">
        <section className="rounded-3xl border border-purple-500/30 bg-purple-500/10 p-8">
          <p className="text-sm font-bold uppercase tracking-[0.35em] text-purple-300">
            KWEVORA OS
          </p>

          <h1 className="mt-4 text-5xl font-black">Settings</h1>

          <p className="mt-4 max-w-3xl text-lg leading-8 text-gray-300">
            Control how KAI communicates with you and manage the
            platforms KAI will prepare content for.
          </p>
        </section>

        {message ? (
          <section className="rounded-2xl border border-cyan-500/30 bg-cyan-500/10 p-5">
            <p className="font-bold text-cyan-100">{message}</p>
          </section>
        ) : null}

        <section className="rounded-3xl border border-white/10 bg-white/5 p-8">
          <p className="text-sm font-bold uppercase tracking-[0.3em] text-purple-300">
            KAI Communication
          </p>

          <h2 className="mt-3 text-3xl font-black">
            Choose how KAI communicates.
          </h2>

          <div className="mt-6 rounded-2xl border border-purple-500/30 bg-purple-950/30 p-6">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-purple-300">
              Current KAI Mode
            </p>

            <h3 className="mt-2 text-3xl font-black">
              {mode === "silent"
                ? "🔇 Silent Mode"
                : "🎙️ Voice Mode"}
            </h3>
          </div>

          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <button
              type="button"
              onClick={() => chooseMode("silent")}
              className={
                mode === "silent"
                  ? "rounded-3xl border border-purple-400 bg-purple-600 p-8 text-left"
                  : "rounded-3xl border border-white/10 bg-black/20 p-8 text-left transition hover:bg-white/10"
              }
            >
              <h3 className="text-2xl font-black">🔇 Silent Mode</h3>

              <p className="mt-3 leading-7 text-gray-200">
                KAI communicates through text only.
              </p>
            </button>

            <button
              type="button"
              onClick={() => chooseMode("voice")}
              className={
                mode === "voice"
                  ? "rounded-3xl border border-purple-400 bg-purple-600 p-8 text-left"
                  : "rounded-3xl border border-white/10 bg-black/20 p-8 text-left transition hover:bg-white/10"
              }
            >
              <h3 className="text-2xl font-black">🎙️ Voice Mode</h3>

              <p className="mt-3 leading-7 text-gray-200">
                Save Voice Mode as your preference while voice
                conversations are being developed.
              </p>
            </button>
          </div>
        </section>

        <section className="rounded-3xl border border-cyan-500/20 bg-cyan-500/5 p-8">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.3em] text-cyan-300">
                Platform Connections
              </p>

              <h2 className="mt-3 text-3xl font-black">
                Connect where KAI will publish.
              </h2>

              <p className="mt-3 max-w-3xl leading-7 text-gray-300">
                KAI will use these connections to prepare the correct
                captions, formats, schedules, and publishing packages
                for each platform.
              </p>
            </div>

            <div className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 text-sm font-bold text-cyan-200">
              {connectedPlatforms.length} Connected
            </div>
          </div>

          <div className="mt-8 grid gap-5 lg:grid-cols-2">
            {platforms.map((platform) => {
              const isConnected = connectedPlatforms.includes(
                platform.id
              );

              return (
                <article
                  key={platform.id}
                  className="rounded-2xl border border-white/10 bg-black/20 p-6"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex gap-4">
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-2xl">
                        {platform.icon}
                      </div>

                      <div>
                        <h3 className="text-2xl font-black">
                          {platform.name}
                        </h3>

                        <p className="mt-2 leading-7 text-gray-300">
                          {platform.description}
                        </p>
                      </div>
                    </div>

                    <PlatformStatus
                      available={platform.available}
                      connected={isConnected}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => connectPlatform(platform)}
                    className={
                      isConnected
                        ? "mt-6 w-full rounded-xl border border-red-500/30 bg-red-500/10 px-5 py-3 font-black text-red-200 transition hover:bg-red-500/20"
                        : platform.available
                          ? "mt-6 w-full rounded-xl bg-cyan-400 px-5 py-3 font-black text-black transition hover:bg-cyan-300"
                          : "mt-6 w-full rounded-xl border border-white/10 bg-white/5 px-5 py-3 font-black text-gray-400 transition hover:bg-white/10"
                    }
                  >
                    {isConnected
                      ? `Disconnect ${platform.name}`
                      : platform.available
                        ? `Connect ${platform.name}`
                        : "Connection Coming Soon"}
                  </button>
                </article>
              );
            })}
          </div>
        </section>

        <section className="rounded-3xl border border-amber-400/20 bg-amber-400/5 p-8">
          <p className="text-sm font-bold uppercase tracking-[0.3em] text-amber-300">
            Connection Status
          </p>

          <h2 className="mt-3 text-2xl font-black">
            Platform connections are being built in stages.
          </h2>

          <p className="mt-3 max-w-4xl leading-7 text-gray-300">
            This page now stores connection choices for development.
            Real account authorization and automatic publishing will be
            connected individually through each platform&apos;s official
            integration.
          </p>
        </section>
      </div>
    </main>
  );
}

function PlatformStatus({
  available,
  connected,
}: {
  available: boolean;
  connected: boolean;
}) {
  if (connected) {
    return (
      <span className="shrink-0 rounded-full border border-green-400/30 bg-green-400/10 px-3 py-1 text-xs font-black text-green-200">
        Connected
      </span>
    );
  }

  if (available) {
    return (
      <span className="shrink-0 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs font-black text-cyan-200">
        Ready
      </span>
    );
  }

  return (
    <span className="shrink-0 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-black text-gray-400">
      Coming Soon
    </span>
  );
}