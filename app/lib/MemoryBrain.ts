import { db } from "./database/database";

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

export type MemoryImportance =
  | "low"
  | "medium"
  | "high"
  | "critical";

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
  status:
    | "planned"
    | "working"
    | "blocked"
    | "waiting"
    | "completed";
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

const ACTIVE_WORK_MEMORY_ID =
  "kai-active-work";

function parseTags(
  value: string,
): string[] {
  try {
    const parsed: unknown =
      JSON.parse(value);

    return Array.isArray(parsed)
      ? parsed.filter(
          (tag): tag is string =>
            typeof tag === "string",
        )
      : [];
  } catch {
    return [];
  }
}

function rowToMemory(
  row: MemoryRow,
): Memory {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    description: row.description,
    importance: row.importance,
    learnedAt: row.learnedAt,
    lastUsed:
      row.lastUsed ?? undefined,
    tags: parseTags(row.tags),
  };
}

function normalizeTags(
  tags: string[],
): string[] {
  return Array.from(
    new Set(
      tags
        .map((tag) =>
          tag.trim().toLowerCase(),
        )
        .filter(Boolean),
    ),
  );
}

function activeWorkToDescription(
  work: ActiveWork,
): string {
  return JSON.stringify(work);
}

function descriptionToActiveWork(
  description: string,
): ActiveWork | null {
  try {
    const parsed =
      JSON.parse(
        description,
      ) as Partial<ActiveWork>;

    if (
      typeof parsed.project !==
        "string" ||
      typeof parsed.release !==
        "string" ||
      typeof parsed.mission !==
        "string" ||
      typeof parsed.lastCompletedStep !==
        "string" ||
      typeof parsed.nextStep !==
        "string" ||
      typeof parsed.updatedAt !==
        "string" ||
      ![
        "planned",
        "working",
        "blocked",
        "waiting",
        "completed",
      ].includes(
        parsed.status ?? "",
      )
    ) {
      return null;
    }

    return {
      project: parsed.project,
      release: parsed.release,
      mission: parsed.mission,
      lastCompletedStep:
        parsed.lastCompletedStep,
      currentBlocker:
        typeof parsed.currentBlocker ===
        "string"
          ? parsed.currentBlocker
          : undefined,
      nextStep: parsed.nextStep,
      status:
        parsed.status as ActiveWork["status"],
      updatedAt: parsed.updatedAt,
    };
  } catch {
    return null;
  }
}

export class MemoryBrain {
  remember(
    memory: Memory,
  ): void {
    db.prepare(
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
    ).run(
      memory.id,
      memory.type,
      memory.title,
      memory.description,
      memory.importance,
      JSON.stringify(
        normalizeTags(
          memory.tags,
        ),
      ),
      memory.learnedAt,
      new Date().toISOString(),
    );
  }

  recall(
    tags: string[],
  ): MemorySearchResult {
    const normalizedTags =
      normalizeTags(tags);

    if (
      normalizedTags.length === 0
    ) {
      return {
        memories: [],
        confidence: 0,
        missingKnowledge: [
          "No memory search tags were supplied.",
        ],
      };
    }

    const rows = db
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
      .all() as MemoryRow[];

    const memories = rows
      .map(rowToMemory)
      .filter((memory) =>
        normalizedTags.some(
          (tag) =>
            memory.tags.includes(
              tag,
            ),
        ),
      );

    return {
      memories,
      confidence:
        memories.length > 0
          ? Math.min(
              100,
              60 +
                memories.length *
                  5,
            )
          : 0,
      missingKnowledge:
        memories.length > 0
          ? []
          : [
              "No relevant memories found.",
            ],
    };
  }

  all(): Memory[] {
    const rows = db
      .prepare(
        `
        SELECT *
        FROM memories
        ORDER BY learnedAt DESC
        `,
      )
      .all() as MemoryRow[];

    return rows.map(
      rowToMemory,
    );
  }

  setActiveWork(
    input: Omit<
      ActiveWork,
      "updatedAt"
    >,
  ): ActiveWork {
    const activeWork: ActiveWork = {
      ...input,
      updatedAt:
        new Date().toISOString(),
    };

    this.remember({
      id: ACTIVE_WORK_MEMORY_ID,
      type: "work",
      title:
        `${activeWork.project} — ${activeWork.release}`,
      description:
        activeWorkToDescription(
          activeWork,
        ),
      importance: "critical",
      learnedAt:
        activeWork.updatedAt,
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

  getActiveWork():
    | ActiveWork
    | null {
    const row = db
      .prepare(
        `
        SELECT *
        FROM memories
        WHERE id = ?
        LIMIT 1
        `,
      )
      .get(
        ACTIVE_WORK_MEMORY_ID,
      ) as MemoryRow | undefined;

    if (!row) {
      return null;
    }

    db.prepare(
      `
      UPDATE memories
      SET lastUsed = ?
      WHERE id = ?
      `,
    ).run(
      new Date().toISOString(),
      ACTIVE_WORK_MEMORY_ID,
    );

    return descriptionToActiveWork(
      row.description,
    );
  }

  clearActiveWork(): void {
    db.prepare(
      `
      DELETE FROM memories
      WHERE id = ?
      `,
    ).run(
      ACTIVE_WORK_MEMORY_ID,
    );
  }
}

export const memoryBrain =
  new MemoryBrain();