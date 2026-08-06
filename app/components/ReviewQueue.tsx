"use client";

import type { KaiContentPackage } from "../core/runtime/contentGenerator";
import ContentCard from "./ContentCard";
import type {
  EditableFieldName,
  EditingField,
} from "./EditableField";

type ReviewQueueProps = {
  packages: KaiContentPackage[];
  editing: EditingField | null;
  onStartEdit: (next: EditingField | null) => void;
  onChange: (
    packageId: string,
    field: EditableFieldName,
    value: string
  ) => void;
  onApprove: (id: string) => void;
  onApproveAll: () => void;
  onReject: (id: string) => void;
  onCopyEverything: (item: KaiContentPackage) => void;
};

export default function ReviewQueue({
  packages,
  editing,
  onStartEdit,
  onChange,
  onApprove,
  onApproveAll,
  onReject,
  onCopyEverything,
}: ReviewQueueProps) {
  if (packages.length === 0) {
    return null;
  }

  const waitingCount = packages.filter(
    (item) => item.status !== "ready_to_publish"
  ).length;

  return (
    <section className="rounded-3xl border border-white/10 bg-white/5 p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold tracking-[0.35em] text-purple-300">
            REVIEW QUEUE
          </p>

          <h2 className="mt-4 text-4xl font-black">
            KAI prepared {packages.length} content package
            {packages.length === 1 ? "" : "s"}.
          </h2>

          <p className="mt-3 text-gray-300">
            Review, edit, reject, approve, or copy each full package.
          </p>

          <p className="mt-2 text-sm font-bold text-yellow-300">
            {waitingCount} waiting for approval
          </p>
        </div>

        {waitingCount > 0 && (
          <button
            type="button"
            onClick={onApproveAll}
            className="rounded-xl bg-cyan-600 px-6 py-4 font-black transition hover:bg-cyan-500"
          >
            Approve All For Publishing
          </button>
        )}
      </div>

      <div className="mt-8 grid gap-6">
        {packages.map((item) => (
          <ContentCard
            key={item.id}
            item={item}
            editing={editing}
            onStartEdit={onStartEdit}
            onChange={onChange}
            onApprove={onApprove}
            onReject={onReject}
            onCopyEverything={onCopyEverything}
          />
        ))}
      </div>
    </section>
  );
}