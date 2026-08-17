import { getDatabase } from "./database/database";

export type MemoryType =
  | "identity"
  | "business"
  | "goal"
  | "project"
  | "work"
  | "decision"
  | "learning"
  | "result"
  | "preference"
  | "relationship";

export type MemoryImportance = "low" | "medium" | "high" | "critical";

export type Memory = {
  id: string;
  type: MemoryType;
  title: string;
  description: string;
  importance: MemoryImportance;
  learnedAt: string;
  lastUsed?: string;
  tags: string[];
};

export type MemorySearchResult = {
  memories: Memory[];
  confidence: number;
  missingKnowledge: string[];
};

export type ActiveWork = {
  project: string;
  release: string;
  mission: string;
  lastCompletedStep: string;
  currentBlocker?: string;
  nextStep: string;
  status: "planned" | "working" | "blocked" | "waiting" | "completed";
  updatedAt: string;
};

type MemoryRow = {
  id: string;
  type: MemoryType;
  title: string;
  description: string;
  importance: MemoryImportance;
  tags: string;
  learnedAt: string;
  lastUsed: string | null;
};

const ACTIVE_WORK_MEMORY_ID = "kai-active-work";

const GENERIC_RECALL_TAGS = new Set([
  "business",
  "cognitive-session",
  "decision",
  "experience",
  "learning",
  "project",
  "result",
  "success",
  "partial",
  "failure",
  "work",
]);

const RECALL_LIMIT = 12;

function parseTags(value: string): string[] {
  try {
    const parsed: unknown = JSON.parse(value);

    return Array.isArray(parsed)
      ? parsed.filter((tag): tag is string => typeof tag === "string")
      : [];
  } catch {
    return [];
  }
}

function rowToMemory(row: MemoryRow): Memory {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    description: row.description,
    importance: row.importance,
    learnedAt: row.learnedAt,
    lastUsed: row.lastUsed ?? undefined,
    tags: parseTags(row.tags),
  };
}

function normalizeTags(tags: string[]): string[] {
  return Array.from(
    new Set(tags.map((tag) => tag.trim().toLowerCase()).filter(Boolean)),
  );
}

function meaningfulTokens(values: string[]): Set<string> {
  return new Set(
    values
      .flatMap((value) => value.toLowerCase().split(/[^a-z0-9]+/))
      .map((token) => token.trim())
      .filter((token) => token.length >= 4 && !GENERIC_RECALL_TAGS.has(token)),
  );
}

function relevanceScore(memory: Memory, requestedTags: string[]): number {
  const specificRequestedTags = requestedTags.filter(
    (tag) => !GENERIC_RECALL_TAGS.has(tag),
  );

  const exactMatches = specificRequestedTags.filter((tag) =>
    memory.tags.includes(tag),
  ).length;

  const requestedTokens = meaningfulTokens(specificRequestedTags);

  const memoryTokens = meaningfulTokens([
    memory.title,
    memory.description,
    ...memory.tags,
  ]);

  const tokenMatches = Array.from(requestedTokens).filter((token) =>
    memoryTokens.has(token),
  ).length;

  if (exactMatches === 0 && tokenMatches < 2) {
    return 0;
  }

  const importanceWeight =
    memory.importance === "critical"
      ? 4
      : memory.importance === "high"
        ? 3
        : memory.importance === "medium"
          ? 2
          : 1;

  return exactMatches * 20 + tokenMatches * 5 + importanceWeight;
}

function activeWorkToDescription(work: ActiveWork): string {
  return JSON.stringify(work);
}

function descriptionToActiveWork(description: string): ActiveWork | null {
  try {
    const parsed = JSON.parse(description) as Partial<ActiveWork>;

    if (
      typeof parsed.project !== "string" ||
      typeof parsed.release !== "string" ||
      typeof parsed.mission !== "string" ||
      typeof parsed.lastCompletedStep !== "string" ||
      typeof parsed.nextStep !== "string" ||
      typeof parsed.updatedAt !== "string" ||
      !["planned", "working", "blocked", "waiting", "completed"].includes(
        parsed.status ?? "",
      )
    ) {
      return null;
    }

    return {
      project: parsed.project,
      release: parsed.release,
      mission: parsed.mission,
      lastCompletedStep: parsed.lastCompletedStep,
      currentBlocker:
        typeof parsed.currentBlocker === "string"
          ? parsed.currentBlocker
          : undefined,
      nextStep: parsed.nextStep,
      status: parsed.status as ActiveWork["status"],
      updatedAt: parsed.updatedAt,
    };
  } catch {
    return null;
  }
}

export class MemoryBrain {
  async forget(id: string): Promise<void> {
    await getDatabase()
      .prepare(`DELETE FROM memories WHERE id = ?`)
      .bind(id)
      .run();
  }

  async remember(memory: Memory): Promise<void> {
    await getDatabase()
      .prepare(
        `
      INSERT OR REPLACE INTO memories
      (
        id,
        type,
        title,
        description,
        importance,
        tags,
        learnedAt,
        lastUsed
      )
      VALUES
      (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      )
      .bind(
        memory.id,
        memory.type,
        memory.title,
        memory.description,
        memory.importance,
        JSON.stringify(normalizeTags(memory.tags)),
        memory.learnedAt,
        new Date().toISOString(),
      )
      .run();
  }

  async recall(tags: string[]): Promise<MemorySearchResult> {
    const normalizedTags = normalizeTags(tags);

    if (normalizedTags.length === 0) {
      return {
        memories: [],
        confidence: 0,
        missingKnowledge: ["No memory search tags were supplied."],
      };
    }

    const { results: rows = [] } = await getDatabase()
      .prepare(
        `
        SELECT *
        FROM memories
        ORDER BY
          CASE importance
            WHEN 'critical' THEN 4
            WHEN 'high' THEN 3
            WHEN 'medium' THEN 2
            ELSE 1
          END DESC,
          learnedAt DESC
        `,
      )
      .all<MemoryRow>();

    const rankedMemories = rows
      .map(rowToMemory)
      .map((memory) => ({
        memory,
        score: relevanceScore(memory, normalizedTags),
      }))
      .filter(({ score }) => score > 0)
      .sort((left, right) => right.score - left.score)
      .slice(0, RECALL_LIMIT);

    const memories = rankedMemories.map(({ memory }) => memory);

    if (memories.length > 0) {
      const usedAt = new Date().toISOString();

      const database = getDatabase();
      const statements = memories.map((memory) =>
        database
          .prepare(
            `
          UPDATE memories
          SET lastUsed = ?
          WHERE id = ?
          `,
          )
          .bind(usedAt, memory.id),
      );
      await database.batch(statements);
    }

    const strongestScore = rankedMemories[0]?.score ?? 0;

    return {
      memories,
      confidence:
        memories.length > 0
          ? Math.min(
              100,
              50 + strongestScore + Math.min(memories.length, 5) * 3,
            )
          : 0,
      missingKnowledge:
        memories.length > 0 ? [] : ["No relevant memories found."],
    };
  }

  async all(): Promise<Memory[]> {
    const { results: rows = [] } = await getDatabase()
      .prepare(
        `
        SELECT *
        FROM memories
        ORDER BY learnedAt DESC
        `,
      )
      .all<MemoryRow>();

    return rows.map(rowToMemory);
  }

  async setActiveWork(
    input: Omit<ActiveWork, "updatedAt">,
  ): Promise<ActiveWork> {
    const activeWork: ActiveWork = {
      ...input,
      updatedAt: new Date().toISOString(),
    };

    await this.remember({
      id: ACTIVE_WORK_MEMORY_ID,
      type: "work",
      title: `${activeWork.project} — ${activeWork.release}`,
      description: activeWorkToDescription(activeWork),
      importance: "critical",
      learnedAt: activeWork.updatedAt,
      tags: [
        "active-work",
        "current-project",
        activeWork.project,
        activeWork.release,
        activeWork.status,
      ],
    });

    return activeWork;
  }

  async getActiveWork(): Promise<ActiveWork | null> {
    const row = await getDatabase()
      .prepare(
        `
        SELECT *
        FROM memories
        WHERE id = ?
        LIMIT 1
        `,
      )
      .bind(ACTIVE_WORK_MEMORY_ID)
      .first<MemoryRow>();

    if (!row) {
      return null;
    }

    await getDatabase()
      .prepare(
        `
      UPDATE memories
      SET lastUsed = ?
      WHERE id = ?
      `,
      )
      .bind(new Date().toISOString(), ACTIVE_WORK_MEMORY_ID)
      .run();

    return descriptionToActiveWork(row.description);
  }

  async clearActiveWork(): Promise<void> {
    await getDatabase()
      .prepare(
        `
      DELETE FROM memories
      WHERE id = ?
      `,
      )
      .bind(ACTIVE_WORK_MEMORY_ID)
      .run();
  }
}

export const memoryBrain = new MemoryBrain();
