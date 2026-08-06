export type MemoryCategory =
  | "owner"
  | "business"
  | "audience"
  | "product"
  | "content"
  | "learning"
  | "preference";

export type MemoryImportance =
  | "low"
  | "medium"
  | "high";

export interface KaiMemoryItem {
  id: string;
  category: MemoryCategory;
  title: string;
  value: string;
  importance: MemoryImportance;
  confidence: number;
  source: string;
  createdAt: string;
  updatedAt: string;
}

export interface KaiMemory {
  items: KaiMemoryItem[];
}

const now = () => new Date().toISOString();

export const defaultMemory: KaiMemory = {
  items: [
    {
      id: "owner-name",
      category: "owner",
      title: "Owner Name",
      value: "Kent",
      importance: "high",
      confidence: 100,
      source: "Initial Setup",
      createdAt: now(),
      updatedAt: now(),
    },
    {
      id: "business-name",
      category: "business",
      title: "Business",
      value: "KWEVORA",
      importance: "high",
      confidence: 100,
      source: "Initial Setup",
      createdAt: now(),
      updatedAt: now(),
    },
    {
      id: "primary-goal",
      category: "business",
      title: "Primary Goal",
      value:
        "Help people escape the paycheck-to-paycheck lifestyle using digital products and affiliate marketing.",
      importance: "high",
      confidence: 100,
      source: "Business Vision",
      createdAt: now(),
      updatedAt: now(),
    },
    {
      id: "content-style",
      category: "preference",
      title: "Preferred Content",
      value:
        "Faceless short-form videos with text on screen and optional voiceover.",
      importance: "high",
      confidence: 100,
      source: "User Preference",
      createdAt: now(),
      updatedAt: now(),
    }
  ],
};

export function getMemoryByCategory(
  memory: KaiMemory,
  category: MemoryCategory
) {
  return memory.items.filter(item => item.category === category);
}

export function addMemory(
  memory: KaiMemory,
  item: Omit<KaiMemoryItem, "createdAt" | "updatedAt">
): KaiMemory {

  const existing = memory.items.find(i => i.id === item.id);

  if (existing) {

    existing.value = item.value;
    existing.title = item.title;
    existing.category = item.category;
    existing.importance = item.importance;
    existing.confidence = item.confidence;
    existing.source = item.source;
    existing.updatedAt = now();

    return memory;
  }

  memory.items.push({
    ...item,
    createdAt: now(),
    updatedAt: now(),
  });

  return memory;
}

export function searchMemory(
  memory: KaiMemory,
  query: string
) {

  const lower = query.toLowerCase();

  return memory.items.filter(item =>
    item.title.toLowerCase().includes(lower) ||
    item.value.toLowerCase().includes(lower)
  );
}