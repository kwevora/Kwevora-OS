import {
  KaiMemory,
  KaiMemoryItem,
  MemoryCategory,
  MemoryImportance,
} from "./kaiMemory";

export type LearningSource =
  | "owner"
  | "content-performance"
  | "approval"
  | "publishing"
  | "conversation"
  | "business-data"
  | "system";

export type KaiLearningInput = {
  category: MemoryCategory;
  title: string;
  value: string;
  importance?: MemoryImportance;
  confidence?: number;
  source: LearningSource | string;
};

export type KaiLearningResult = {
  memory: KaiMemory;
  action: "created" | "updated" | "ignored";
  item: KaiMemoryItem | null;
  reason: string;
};

function createTimestamp(): string {
  return new Date().toISOString();
}

function normalizeText(value: string): string {
  return value
    .trim()
    .replace(/\s+/g, " ");
}

function normalizeForComparison(value: string): string {
  return normalizeText(value).toLowerCase();
}

function clampConfidence(value: number): number {
  return Math.min(100, Math.max(0, Math.round(value)));
}

function createMemoryId(
  category: MemoryCategory,
  title: string,
): string {
  const slug = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return `${category}-${slug || "memory"}`;
}

function findMatchingMemory(
  memory: KaiMemory,
  input: KaiLearningInput,
): KaiMemoryItem | undefined {
  const normalizedTitle = normalizeForComparison(input.title);
  const normalizedValue = normalizeForComparison(input.value);

  return memory.items.find((item) => {
    const titleMatches =
      normalizeForComparison(item.title) === normalizedTitle;

    const valueMatches =
      normalizeForComparison(item.value) === normalizedValue;

    return (
      item.category === input.category &&
      (titleMatches || valueMatches)
    );
  });
}

function resolveImportance(
  current: MemoryImportance,
  incoming: MemoryImportance,
): MemoryImportance {
  const scores: Record<MemoryImportance, number> = {
    low: 1,
    medium: 2,
    high: 3,
  };

  return scores[incoming] >= scores[current]
    ? incoming
    : current;
}

export function learnMemory(
  memory: KaiMemory,
  input: KaiLearningInput,
): KaiLearningResult {
  const title = normalizeText(input.title);
  const value = normalizeText(input.value);

  if (!title || !value) {
    return {
      memory,
      action: "ignored",
      item: null,
      reason:
        "KAI ignored the learning because both a title and value are required.",
    };
  }

  const confidence = clampConfidence(
    input.confidence ?? 80,
  );

  const importance = input.importance ?? "medium";

  const existing = findMatchingMemory(memory, {
    ...input,
    title,
    value,
  });

  if (existing) {
    const sameValue =
      normalizeForComparison(existing.value) ===
      normalizeForComparison(value);

    const incomingIsWeaker =
      confidence < existing.confidence;

    if (sameValue && incomingIsWeaker) {
      return {
        memory,
        action: "ignored",
        item: existing,
        reason:
          "KAI already remembers this information with stronger confidence.",
      };
    }

    const updatedItem: KaiMemoryItem = {
      ...existing,
      title,
      value,
      importance: resolveImportance(
        existing.importance,
        importance,
      ),
      confidence: Math.max(
        existing.confidence,
        confidence,
      ),
      source: input.source,
      updatedAt: createTimestamp(),
    };

    const updatedMemory: KaiMemory = {
      items: memory.items.map((item) =>
        item.id === existing.id
          ? updatedItem
          : item,
      ),
    };

    return {
      memory: updatedMemory,
      action: "updated",
      item: updatedItem,
      reason:
        "KAI updated an existing memory with newer or stronger information.",
    };
  }

  const timestamp = createTimestamp();

  const newItem: KaiMemoryItem = {
    id: createMemoryId(input.category, title),
    category: input.category,
    title,
    value,
    importance,
    confidence,
    source: input.source,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  return {
    memory: {
      items: [...memory.items, newItem],
    },
    action: "created",
    item: newItem,
    reason:
      "KAI added a new piece of knowledge to memory.",
  };
}

export function learnMany(
  memory: KaiMemory,
  inputs: KaiLearningInput[],
): {
  memory: KaiMemory;
  results: KaiLearningResult[];
} {
  let workingMemory = memory;
  const results: KaiLearningResult[] = [];

  for (const input of inputs) {
    const result = learnMemory(
      workingMemory,
      input,
    );

    workingMemory = result.memory;
    results.push(result);
  }

  return {
    memory: workingMemory,
    results,
  };
}

export function learnOwnerPreference(
  memory: KaiMemory,
  title: string,
  value: string,
): KaiLearningResult {
  return learnMemory(memory, {
    category: "preference",
    title,
    value,
    importance: "high",
    confidence: 95,
    source: "owner",
  });
}

export function learnContentResult(
  memory: KaiMemory,
  input: {
    title: string;
    lesson: string;
    confidence?: number;
  },
): KaiLearningResult {
  return learnMemory(memory, {
    category: "learning",
    title: input.title,
    value: input.lesson,
    importance: "high",
    confidence: input.confidence ?? 85,
    source: "content-performance",
  });
}

export function learnApprovalDecision(
  memory: KaiMemory,
  input: {
    title: string;
    decision: string;
  },
): KaiLearningResult {
  return learnMemory(memory, {
    category: "learning",
    title: input.title,
    value: input.decision,
    importance: "medium",
    confidence: 90,
    source: "approval",
  });
}

export function getStrongestMemories(
  memory: KaiMemory,
  limit = 20,
): KaiMemoryItem[] {
  const importanceScores: Record<
    MemoryImportance,
    number
  > = {
    low: 1,
    medium: 2,
    high: 3,
  };

  return [...memory.items]
    .sort((a, b) => {
      const importanceDifference =
        importanceScores[b.importance] -
        importanceScores[a.importance];

      if (importanceDifference !== 0) {
        return importanceDifference;
      }

      if (b.confidence !== a.confidence) {
        return b.confidence - a.confidence;
      }

      return (
        new Date(b.updatedAt).getTime() -
        new Date(a.updatedAt).getTime()
      );
    })
    .slice(0, Math.max(1, limit));
}