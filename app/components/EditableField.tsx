"use client";

export type EditableFieldName =
  | "title"
  | "hook"
  | "caption"
  | "hashtags"
  | "thumbnailIdea"
  | "cta"
  | "destinationLink"
  | "pinnedComment"
  | "script";

export type EditingField = {
  id: string;
  field: EditableFieldName;
};

type EditableFieldProps = {
  title: string;
  value: string;
  packageId: string;
  field: EditableFieldName;
  editing: EditingField | null;
  onStartEdit: (next: EditingField | null) => void;
  onChange: (
    packageId: string,
    field: EditableFieldName,
    value: string
  ) => void;
};

export default function EditableField({
  title,
  value,
  packageId,
  field,
  editing,
  onStartEdit,
  onChange,
}: EditableFieldProps) {
  const isEditing =
    editing?.id === packageId && editing.field === field;

  function toggleEditing() {
    if (isEditing) {
      onStartEdit(null);
      return;
    }

    onStartEdit({
      id: packageId,
      field,
    });
  }

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-bold tracking-[0.25em] text-gray-400">
          {title.toUpperCase()}
        </p>

        <button
          type="button"
          onClick={toggleEditing}
          className="rounded-lg bg-white/10 px-3 py-2 text-sm font-bold transition hover:bg-white/20"
        >
          {isEditing ? "Done" : "Edit"}
        </button>
      </div>

      {isEditing ? (
        <textarea
          value={value}
          onChange={(event) =>
            onChange(packageId, field, event.target.value)
          }
          className="mt-3 min-h-28 w-full rounded-xl border border-white/10 bg-black p-4 text-gray-200 outline-none focus:border-green-400"
        />
      ) : (
        <p className="mt-3 whitespace-pre-line text-gray-300">
          {value || "Nothing added yet."}
        </p>
      )}
    </div>
  );
}