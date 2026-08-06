import "server-only";

import { promises as fs } from "node:fs";
import path from "node:path";

import {
  defaultMemory,
  KaiMemory,
  KaiMemoryItem,
  MemoryCategory,
  MemoryImportance,
} from "./kaiMemory";

const DATA_DIRECTORY = path.join(
  process.cwd(),
  "data",
);

const MEMORY_FILE_PATH = path.join(
  DATA_DIRECTORY,
  "kai-memory.json",
);

const TEMP_MEMORY_FILE_PATH = path.join(
  DATA_DIRECTORY,
  "kai-memory.tmp.json",
);

function cloneMemory(memory: KaiMemory): KaiMemory {
  return {
    items: memory.items.map((item) => ({
      ...item,
    })),
  };
}

function isMemoryCategory(
  value: unknown,
): value is MemoryCategory {
  return (
    value === "owner" ||
    value === "business" ||
    value === "audience" ||
    value === "product" ||
    value === "content" ||
    value === "learning" ||
    value === "preference"
  );
}

function isMemoryImportance(
  value: unknown,
): value is MemoryImportance {
  return (
    value === "low" ||
    value === "medium" ||
    value === "high"
  );
}

function isValidDate(value: unknown): value is string {
  if (typeof value !== "string") {
    return false;
  }

  return !Number.isNaN(
    new Date(value).getTime(),
  );
}

function isKaiMemoryItem(
  value: unknown,
): value is KaiMemoryItem {
  if (!value || typeof value !== "object") {
    return false;
  }

  const item = value as Partial<KaiMemoryItem>;

  return (
    typeof item.id === "string" &&
    item.id.trim().length > 0 &&
    isMemoryCategory(item.category) &&
    typeof item.title === "string" &&
    item.title.trim().length > 0 &&
    typeof item.value === "string" &&
    item.value.trim().length > 0 &&
    isMemoryImportance(item.importance) &&
    typeof item.confidence === "number" &&
    Number.isFinite(item.confidence) &&
    item.confidence >= 0 &&
    item.confidence <= 100 &&
    typeof item.source === "string" &&
    item.source.trim().length > 0 &&
    isValidDate(item.createdAt) &&
    isValidDate(item.updatedAt)
  );
}

function isKaiMemory(
  value: unknown,
): value is KaiMemory {
  if (!value || typeof value !== "object") {
    return false;
  }

  const memory = value as Partial<KaiMemory>;

  return (
    Array.isArray(memory.items) &&
    memory.items.every(isKaiMemoryItem)
  );
}

function removeDuplicateIds(
  items: KaiMemoryItem[],
): KaiMemoryItem[] {
  const itemMap = new Map<
    string,
    KaiMemoryItem
  >();

  for (const item of items) {
    const existing = itemMap.get(item.id);

    if (!existing) {
      itemMap.set(item.id, {
        ...item,
      });

      continue;
    }

    const existingUpdatedAt =
      new Date(existing.updatedAt).getTime();

    const incomingUpdatedAt =
      new Date(item.updatedAt).getTime();

    if (incomingUpdatedAt >= existingUpdatedAt) {
      itemMap.set(item.id, {
        ...item,
      });
    }
  }

  return Array.from(itemMap.values());
}

function mergeDefaultMemory(
  savedMemory: KaiMemory,
): KaiMemory {
  const savedItems = removeDuplicateIds(
    savedMemory.items,
  );

  const savedIds = new Set(
    savedItems.map((item) => item.id),
  );

  const missingDefaults =
    defaultMemory.items
      .filter(
        (item) => !savedIds.has(item.id),
      )
      .map((item) => ({
        ...item,
      }));

  return {
    items: [
      ...savedItems,
      ...missingDefaults,
    ],
  };
}

async function ensureDataDirectory(): Promise<void> {
  await fs.mkdir(DATA_DIRECTORY, {
    recursive: true,
  });
}

async function writeMemoryFile(
  memory: KaiMemory,
): Promise<void> {
  await ensureDataDirectory();

  const cleanedMemory: KaiMemory = {
    items: removeDuplicateIds(
      memory.items,
    ),
  };

  const fileContents = JSON.stringify(
    cleanedMemory,
    null,
    2,
  );

  await fs.writeFile(
    TEMP_MEMORY_FILE_PATH,
    fileContents,
    "utf8",
  );

  await fs.rename(
    TEMP_MEMORY_FILE_PATH,
    MEMORY_FILE_PATH,
  );
}

async function createDefaultMemoryFile(): Promise<KaiMemory> {
  const memory = cloneMemory(defaultMemory);

  await writeMemoryFile(memory);

  return memory;
}

export async function loadKaiMemory(): Promise<KaiMemory> {
  await ensureDataDirectory();

  try {
    const fileContents = await fs.readFile(
      MEMORY_FILE_PATH,
      "utf8",
    );

    const parsed: unknown = JSON.parse(
      fileContents,
    );

    if (!isKaiMemory(parsed)) {
      console.warn(
        "KAI memory file was invalid. Restoring default memory.",
      );

      return createDefaultMemoryFile();
    }

    const mergedMemory =
      mergeDefaultMemory(parsed);

    const memoryChanged =
      JSON.stringify(parsed) !==
      JSON.stringify(mergedMemory);

    if (memoryChanged) {
      await writeMemoryFile(
        mergedMemory,
      );
    }

    return mergedMemory;
  } catch (error) {
    const nodeError = error as NodeJS.ErrnoException;

    if (nodeError.code === "ENOENT") {
      return createDefaultMemoryFile();
    }

    if (error instanceof SyntaxError) {
      console.warn(
        "KAI memory JSON could not be read. Restoring default memory.",
      );

      return createDefaultMemoryFile();
    }

    console.error(
      "KAI could not load persistent memory:",
      error,
    );

    throw new Error(
      "KAI could not load persistent memory.",
    );
  }
}

export async function saveKaiMemory(
  memory: KaiMemory,
): Promise<KaiMemory> {
  if (!isKaiMemory(memory)) {
    throw new Error(
      "KAI refused to save invalid memory data.",
    );
  }

  const mergedMemory =
    mergeDefaultMemory(memory);

  await writeMemoryFile(
    mergedMemory,
  );

  return mergedMemory;
}

export async function updateKaiMemory(
  updater: (
    currentMemory: KaiMemory,
  ) =>
    | KaiMemory
    | Promise<KaiMemory>,
): Promise<KaiMemory> {
  const currentMemory =
    await loadKaiMemory();

  const updatedMemory =
    await updater(
      cloneMemory(currentMemory),
    );

  return saveKaiMemory(
    updatedMemory,
  );
}

export async function addOrReplaceMemoryItem(
  item: KaiMemoryItem,
): Promise<KaiMemory> {
  if (!isKaiMemoryItem(item)) {
    throw new Error(
      "KAI refused to save an invalid memory item.",
    );
  }

  return updateKaiMemory(
    (currentMemory) => {
      const existingIndex =
        currentMemory.items.findIndex(
          (memoryItem) =>
            memoryItem.id === item.id,
        );

      if (existingIndex === -1) {
        return {
          items: [
            ...currentMemory.items,
            {
              ...item,
            },
          ],
        };
      }

      return {
        items: currentMemory.items.map(
          (memoryItem, index) =>
            index === existingIndex
              ? {
                  ...item,
                }
              : memoryItem,
        ),
      };
    },
  );
}

export async function deleteKaiMemoryItem(
  id: string,
): Promise<KaiMemory> {
  const normalizedId = id.trim();

  if (!normalizedId) {
    throw new Error(
      "A memory ID is required.",
    );
  }

  const protectedDefaultIds =
    new Set(
      defaultMemory.items.map(
        (item) => item.id,
      ),
    );

  if (protectedDefaultIds.has(normalizedId)) {
    throw new Error(
      "KAI's core setup memory cannot be deleted.",
    );
  }

  return updateKaiMemory(
    (currentMemory) => ({
      items: currentMemory.items.filter(
        (item) =>
          item.id !== normalizedId,
      ),
    }),
  );
}

export async function resetKaiMemory(): Promise<KaiMemory> {
  return createDefaultMemoryFile();
}

export function getKaiMemoryFilePath(): string {
  return MEMORY_FILE_PATH;
}