"use client";

import {
  getPlatformLabel,
  type PublishingQueueItem,
} from "../core/runtime/publishingQueue";

type PublishingQueueProps = {
  items: PublishingQueueItem[];
  copied: string;
  onClear: () => void;
  onCopyPackage: (item: PublishingQueueItem) => void;
  onMarkPublished: (id: string) => void;
  onMarkFailed: (id: string) => void;
};

export default function PublishingQueue({
  items,
  copied,
  onClear,
  onCopyPackage,
  onMarkPublished,
  onMarkFailed,
}: PublishingQueueProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <section className="rounded-3xl border border-cyan-500/30 bg-cyan-950/10 p-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-bold tracking-[0.35em] text-cyan-300">
            PUBLISHING QUEUE
          </p>

          <h2 className="mt-4 text-4xl font-black">
            {items.length} package{items.length === 1 ? "" : "s"} ready to
            publish.
          </h2>
        </div>

        <button
          type="button"
          onClick={onClear}
          className="rounded-xl bg-red-600 px-5 py-3 font-black transition hover:bg-red-500"
        >
          Clear Queue
        </button>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {items.map((item) => {
          const copyLabel = `Full ${getPlatformLabel(item.platform)} Package`;

          return (
            <article
              key={item.id}
              className="rounded-2xl border border-white/10 bg-black/30 p-5"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="rounded-full bg-green-600/20 px-4 py-2 text-sm font-bold uppercase text-green-300">
                  Ready for {getPlatformLabel(item.platform)}
                </p>

                <p className="rounded-full bg-white/10 px-4 py-2 text-sm font-bold uppercase text-gray-300">
                  {(item.publishingStatus ?? "needs_manual_post").replaceAll(
                    "_",
                    " "
                  )}
                </p>
              </div>

              <h3 className="mt-4 text-2xl font-black">
                {item.title || "Untitled publishing package"}
              </h3>

              <p className="mt-3 text-gray-300">
                {item.hook || "No hook added yet."}
              </p>

              <p className="mt-4 rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-gray-300">
                {item.publishNote ||
                  "KAI prepared this package for manual publishing."}
              </p>

              {item.publishedAt && (
                <p className="mt-3 text-sm font-bold text-green-300">
                  Published: {new Date(item.publishedAt).toLocaleString()}
                </p>
              )}

              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => onCopyPackage(item)}
                  className="rounded-xl bg-white/10 px-5 py-3 font-black transition hover:bg-white/20"
                >
                  {copied === copyLabel
                    ? "Copied"
                    : "Copy Full Publishing Package"}
                </button>

                <button
                  type="button"
                  onClick={() => onMarkPublished(item.id)}
                  disabled={item.publishingStatus === "published"}
                  className="rounded-xl bg-green-600 px-5 py-3 font-black transition hover:bg-green-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {item.publishingStatus === "published"
                    ? "Published"
                    : "Mark Published"}
                </button>

                <button
                  type="button"
                  onClick={() => onMarkFailed(item.id)}
                  className="rounded-xl bg-red-600 px-5 py-3 font-black transition hover:bg-red-500"
                >
                  Needs Attention
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}