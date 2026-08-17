"use client";

import {
  useEffect,
  useState,
} from "react";
import PlatformConnections from "../components/PlatformConnections";

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

type YouTubeStatusResponse = {
  success?: boolean;
  connected?: boolean;
  authenticated?: boolean;
  refreshAvailable?: boolean;
  channelId?: string;
  channelName?: string;
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
  const [
    mode,
    setMode,
  ] = useState(
    "silent",
  );

  const [
    message,
    setMessage,
  ] = useState(
    "",
  );

  const [
    youtubeConnected,
    setYoutubeConnected,
  ] = useState(
    false,
  );

  const [
    youtubeAuthenticated,
    setYoutubeAuthenticated,
  ] = useState(
    false,
  );

  const [
    youtubeRefreshAvailable,
    setYoutubeRefreshAvailable,
  ] = useState(
    false,
  );

  const [
    youtubeChannelName,
    setYoutubeChannelName,
  ] = useState(
    "",
  );

  const [
    youtubeChannelId,
    setYoutubeChannelId,
  ] = useState(
    "",
  );

  const [
    youtubeLoading,
    setYoutubeLoading,
  ] = useState(
    true,
  );

  useEffect(
    () => {
      const savedMode =
        localStorage.getItem(
          "kwevora-kai-mode",
        );

      if (
        savedMode
      ) {
        setMode(
          savedMode,
        );
      }

      void loadYouTubeStatus();
    },
    [],
  );

  async function loadYouTubeStatus() {
    setYoutubeLoading(
      true,
    );

    try {
      const response =
        await fetch(
          "/api/youtube/status",
          {
            method:
              "GET",

            cache:
              "no-store",
          },
        );

      const contentType = response.headers.get("content-type") ?? "";

      if (!contentType.includes("application/json")) {
        throw new Error(
          "KWEVORA received an invalid YouTube status response.",
        );
      }

      const data =
        (
          await response.json()
        ) as YouTubeStatusResponse;

      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          "KWEVORA could not check YouTube connection status.",
        );
      }

      setYoutubeConnected(
        Boolean(
          data.connected,
        ),
      );

      setYoutubeAuthenticated(
        Boolean(
          data.authenticated,
        ),
      );

      setYoutubeRefreshAvailable(
        Boolean(
          data.refreshAvailable,
        ),
      );

      setYoutubeChannelName(
        typeof data.channelName ===
        "string"
          ? data.channelName
          : "",
      );

      setYoutubeChannelId(
        typeof data.channelId ===
        "string"
          ? data.channelId
          : "",
      );
    } catch {

      setYoutubeConnected(
        false,
      );

      setYoutubeAuthenticated(
        false,
      );

      setYoutubeRefreshAvailable(
        false,
      );

      setYoutubeChannelName(
        "",
      );

      setYoutubeChannelId(
        "",
      );
    } finally {
      setYoutubeLoading(
        false,
      );
    }
  }

  function chooseMode(
    newMode: string,
  ) {
    setMode(
      newMode,
    );

    localStorage.setItem(
      "kwevora-kai-mode",
      newMode,
    );

    setMessage(
      "KAI communication mode updated.",
    );
  }

  function connectYouTube() {
    window.location.href =
      "/api/youtube/connect";
  }

  async function disconnectYouTube() {
    setMessage(
      "",
    );

    try {
      const response =
        await fetch(
          "/api/youtube/disconnect",
          {
            method:
              "POST",
          },
        );

      if (
        !response.ok
      ) {
        throw new Error(
          "KWEVORA could not disconnect YouTube.",
        );
      }

      await loadYouTubeStatus();

      setMessage(
        "YouTube disconnected.",
      );
    } catch (
      error
    ) {
      console.error(
        "YouTube disconnect failed:",
        error,
      );

      setMessage(
        error instanceof Error
          ? error.message
          : "KWEVORA could not disconnect YouTube.",
      );
    }
  }

  const connectedCount =
    youtubeConnected
      ? 1
      : 0;

  return (
    <main className="min-h-screen bg-[#07040f] p-8 text-white">
      <div className="mx-auto max-w-7xl space-y-8">
        <section className="rounded-3xl border border-purple-500/30 bg-purple-500/10 p-8">
          <p className="text-sm font-bold uppercase tracking-[0.35em] text-purple-300">
            KWEVORA OS
          </p>

          <h1 className="mt-4 text-5xl font-black">
            Settings
          </h1>

          <p className="mt-4 max-w-3xl text-lg leading-8 text-gray-300">
            Control how KAI communicates with you and manage the
            platforms KAI will prepare content for.
          </p>
        </section>

        {message ? (
          <section className="rounded-2xl border border-cyan-500/30 bg-cyan-500/10 p-5">
            <p className="font-bold text-cyan-100">
              {message}
            </p>
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
              {mode ===
              "silent"
                ? "🔇 Silent Mode"
                : "🎙️ Voice Mode"}
            </h3>
          </div>

          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <button
              type="button"
              onClick={() =>
                chooseMode(
                  "silent",
                )
              }
              className={
                mode ===
                "silent"
                  ? "rounded-3xl border border-purple-400 bg-purple-600 p-8 text-left"
                  : "rounded-3xl border border-white/10 bg-black/20 p-8 text-left transition hover:bg-white/10"
              }
            >
              <h3 className="text-2xl font-black">
                🔇 Silent Mode
              </h3>

              <p className="mt-3 leading-7 text-gray-200">
                KAI communicates through text only.
              </p>
            </button>

            <button
              type="button"
              onClick={() =>
                chooseMode(
                  "voice",
                )
              }
              className={
                mode ===
                "voice"
                  ? "rounded-3xl border border-purple-400 bg-purple-600 p-8 text-left"
                  : "rounded-3xl border border-white/10 bg-black/20 p-8 text-left transition hover:bg-white/10"
              }
            >
              <h3 className="text-2xl font-black">
                🎙️ Voice Mode
              </h3>

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
                KAI will use real platform authorization for supported
                platforms instead of development-only connection flags.
              </p>
            </div>

            <div className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 text-sm font-bold text-cyan-200">
              {connectedCount} Connected
            </div>
          </div>

          <div className="mt-8 grid gap-5 lg:grid-cols-2">
            {platforms.map(
              (
                platform,
              ) => {
                const isYouTube =
                  platform.id ===
                  "youtube";

                const isConnected =
                  isYouTube
                    ? youtubeConnected
                    : false;

                return (
                  <article
                    key={
                      platform.id
                    }
                    className="rounded-2xl border border-white/10 bg-black/20 p-6"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex gap-4">
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-2xl">
                          {
                            platform.icon
                          }
                        </div>

                        <div>
                          <h3 className="text-2xl font-black">
                            {
                              platform.name
                            }
                          </h3>

                          <p className="mt-2 leading-7 text-gray-300">
                            {
                              platform.description
                            }
                          </p>
                        </div>
                      </div>

                      <PlatformStatus
                        available={
                          platform.available
                        }
                        connected={
                          isConnected
                        }
                        loading={
                          isYouTube &&
                          youtubeLoading
                        }
                      />
                    </div>

                    {isYouTube &&
                    youtubeConnected ? (
                      <div className="mt-5 rounded-xl border border-green-400/20 bg-green-400/5 p-4">
                        <p className="font-black text-green-200">
                          {youtubeChannelName ||
                            "Connected YouTube Channel"}
                        </p>

                        {youtubeChannelId ? (
                          <p className="mt-1 text-sm text-gray-400">
                            Channel ID:{" "}
                            {
                              youtubeChannelId
                            }
                          </p>
                        ) : null}

                        <p className="mt-2 text-sm text-gray-300">
                          Access token:{" "}
                          {youtubeAuthenticated
                            ? "Available"
                            : "Not currently available"}
                        </p>

                        <p className="mt-1 text-sm text-gray-300">
                          Refresh token:{" "}
                          {youtubeRefreshAvailable
                            ? "Available"
                            : "Not currently available"}
                        </p>
                      </div>
                    ) : null}

                    {isYouTube ? (
                      <button
                        type="button"
                        onClick={() => {
                          if (
                            youtubeConnected
                          ) {
                            void disconnectYouTube();
                          } else {
                            connectYouTube();
                          }
                        }}
                        disabled={
                          youtubeLoading
                        }
                        className={
                          youtubeConnected
                            ? "mt-6 w-full rounded-xl border border-red-500/30 bg-red-500/10 px-5 py-3 font-black text-red-200 transition hover:bg-red-500/20 disabled:opacity-60"
                            : "mt-6 w-full rounded-xl bg-cyan-400 px-5 py-3 font-black text-black transition hover:bg-cyan-300 disabled:opacity-60"
                        }
                      >
                        {youtubeLoading
                          ? "Checking YouTube..."
                          : youtubeConnected
                            ? "Disconnect YouTube"
                            : "Connect YouTube"}
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled
                        className="mt-6 w-full rounded-xl border border-white/10 bg-white/5 px-5 py-3 font-black text-gray-400"
                      >
                        Connection Coming Soon
                      </button>
                    )}
                  </article>
                );
              },
            )}
          </div>
        </section>

        <PlatformConnections />

        <section className="rounded-3xl border border-amber-400/20 bg-amber-400/5 p-8">
          <p className="text-sm font-bold uppercase tracking-[0.3em] text-amber-300">
            Connection Status
          </p>

          <h2 className="mt-3 text-2xl font-black">
            YouTube now uses real account authorization.
          </h2>

          <p className="mt-3 max-w-4xl leading-7 text-gray-300">
            The YouTube card now reflects the actual backend OAuth
            connection. Other platform integrations will be connected
            individually as their official publishing integrations are
            added.
          </p>
        </section>
      </div>
    </main>
  );
}

function PlatformStatus({
  available,
  connected,
  loading,
}: {
  available: boolean;

  connected: boolean;

  loading?: boolean;
}) {
  if (
    loading
  ) {
    return (
      <span className="shrink-0 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-black text-gray-300">
        Checking
      </span>
    );
  }

  if (
    connected
  ) {
    return (
      <span className="shrink-0 rounded-full border border-green-400/30 bg-green-400/10 px-3 py-1 text-xs font-black text-green-200">
        Connected
      </span>
    );
  }

  if (
    available
  ) {
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
