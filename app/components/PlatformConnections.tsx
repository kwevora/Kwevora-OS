"use client";

import { useEffect, useState } from "react";
import {
  defaultPlatformConnections,
  type PlatformConnection,
  type PlatformConnectionStatus,
} from "../core/runtime/platformConnections";

const STORAGE_KEY = "kwevora-platform-connections";

function isValidConnection(value: unknown): value is PlatformConnection {
  if (!value || typeof value !== "object") {
    return false;
  }

  const connection = value as Partial<PlatformConnection>;

  return (
    typeof connection.platform === "string" &&
    typeof connection.label === "string" &&
    typeof connection.status === "string" &&
    typeof connection.username === "string" &&
    typeof connection.profileUrl === "string" &&
    typeof connection.notes === "string"
  );
}

function loadConnections(): PlatformConnection[] {
  const saved = window.localStorage.getItem(STORAGE_KEY);

  if (!saved) {
    return defaultPlatformConnections;
  }

  try {
    const parsed: unknown = JSON.parse(saved);

    if (
      !Array.isArray(parsed) ||
      parsed.length === 0 ||
      !parsed.every(isValidConnection)
    ) {
      window.localStorage.removeItem(STORAGE_KEY);
      return defaultPlatformConnections;
    }

    return parsed;
  } catch {
    window.localStorage.removeItem(STORAGE_KEY);
    return defaultPlatformConnections;
  }
}

export default function PlatformConnections() {
  const [connections, setConnections] = useState<PlatformConnection[]>([]);

  useEffect(() => {
    const loadedConnections = loadConnections();

    setConnections(loadedConnections);
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(loadedConnections)
    );
  }, []);

  function saveConnections(next: PlatformConnection[]) {
    setConnections(next);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  function updateConnection(
    platform: PlatformConnection["platform"],
    field: "username" | "profileUrl" | "notes",
    value: string
  ) {
    saveConnections(
      connections.map((connection) =>
        connection.platform === platform
          ? {
              ...connection,
              [field]: value,
            }
          : connection
      )
    );
  }

  function updateStatus(
    platform: PlatformConnection["platform"],
    status: PlatformConnectionStatus
  ) {
    saveConnections(
      connections.map((connection) =>
        connection.platform === platform
          ? {
              ...connection,
              status,
            }
          : connection
      )
    );
  }

  if (connections.length === 0) {
    return null;
  }

  return (
    <section className="rounded-3xl border border-blue-500/30 bg-blue-950/10 p-8">
      <p className="text-sm font-bold tracking-[0.35em] text-blue-300">
        PLATFORM CONNECTIONS
      </p>

      <h2 className="mt-4 text-4xl font-black">
        Connect the accounts KAI will publish to.
      </h2>

      <p className="mt-4 max-w-4xl text-gray-300">
        KAI can prepare every package for publishing. Direct account
        connections use each platform&apos;s official publishing tools.
      </p>

      <div className="mt-8 grid gap-5 lg:grid-cols-2">
        {connections.map((connection, index) => (
          <article
            key={`${connection.platform}-${index}`}
            className="rounded-2xl border border-white/10 bg-black/30 p-6"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-2xl font-black">{connection.label}</h3>

              <StatusBadge status={connection.status} />
            </div>

            <div className="mt-5 grid gap-4">
              <label>
                <span className="text-sm font-bold tracking-[0.2em] text-gray-400">
                  USERNAME / CHANNEL NAME
                </span>

                <input
                  value={connection.username}
                  onChange={(event) =>
                    updateConnection(
                      connection.platform,
                      "username",
                      event.target.value
                    )
                  }
                  placeholder={`Enter your ${connection.label} name`}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-white outline-none focus:border-blue-400"
                />
              </label>

              <label>
                <span className="text-sm font-bold tracking-[0.2em] text-gray-400">
                  PROFILE URL
                </span>

                <input
                  value={connection.profileUrl}
                  onChange={(event) =>
                    updateConnection(
                      connection.platform,
                      "profileUrl",
                      event.target.value
                    )
                  }
                  placeholder={`Paste your ${connection.label} profile link`}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-white outline-none focus:border-blue-400"
                />
              </label>

              <label>
                <span className="text-sm font-bold tracking-[0.2em] text-gray-400">
                  NOTES
                </span>

                <textarea
                  value={connection.notes}
                  onChange={(event) =>
                    updateConnection(
                      connection.platform,
                      "notes",
                      event.target.value
                    )
                  }
                  className="mt-2 min-h-28 w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-white outline-none focus:border-blue-400"
                />
              </label>
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() =>
                  updateStatus(connection.platform, "manual_ready")
                }
                className="rounded-xl bg-yellow-600 px-4 py-3 font-black transition hover:bg-yellow-500"
              >
                Mark Manual Ready
              </button>

              <button
                type="button"
                onClick={() =>
                  updateStatus(connection.platform, "connected")
                }
                className="rounded-xl bg-green-600 px-4 py-3 font-black transition hover:bg-green-500"
              >
                Mark Connected
              </button>

              <button
                type="button"
                onClick={() =>
                  updateStatus(connection.platform, "not_connected")
                }
                className="rounded-xl bg-white/10 px-4 py-3 font-black transition hover:bg-white/20"
              >
                Disconnect
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function StatusBadge({ status }: { status: PlatformConnectionStatus }) {
  const label =
    status === "connected"
      ? "Connected"
      : status === "manual_ready"
        ? "Manual Ready"
        : "Not Connected";

  const className =
    status === "connected"
      ? "bg-green-600/20 text-green-300"
      : status === "manual_ready"
        ? "bg-yellow-600/20 text-yellow-300"
        : "bg-white/10 text-gray-300";

  return (
    <span
      className={`rounded-full px-4 py-2 text-sm font-bold uppercase ${className}`}
    >
      {label}
    </span>
  );
}