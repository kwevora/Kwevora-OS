import { promises as fs } from "fs";
import path from "path";

import { getDatabase } from "./database";

const TABLE_NAME = "kwevora_queue_state";

async function ensureTable() {
  const database = getDatabase();

  await database
    .prepare(
      `CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (
        queue_key TEXT PRIMARY KEY,
        queue_value TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`,
    )
    .run();

  return database;
}

async function readLocal<T>(fileName: string): Promise<T[]> {
  const dataFolder = path.join(process.cwd(), "data");
  const filePath = path.join(dataFolder, fileName);

  try {
    const value = JSON.parse(await fs.readFile(filePath, "utf8")) as unknown;
    return Array.isArray(value) ? (value as T[]) : [];
  } catch {
    return [];
  }
}

async function writeLocal(fileName: string, items: unknown[]) {
  const dataFolder = path.join(process.cwd(), "data");
  await fs.mkdir(dataFolder, { recursive: true });
  await fs.writeFile(
    path.join(dataFolder, fileName),
    JSON.stringify(items, null, 2),
    "utf8",
  );
}

export class DurableQueueRepository<T> {
  constructor(
    private readonly key: string,
    private readonly localFileName: string,
  ) {}

  async read(): Promise<T[]> {
    try {
      const database = await ensureTable();
      const row = await database
        .prepare(
          `SELECT queue_value FROM ${TABLE_NAME} WHERE queue_key = ? LIMIT 1`,
        )
        .bind(this.key)
        .first<{ queue_value?: string }>();

      if (!row?.queue_value) {
        const localItems = await readLocal<T>(this.localFileName);
        if (localItems.length > 0) await this.write(localItems);
        return localItems;
      }

      const value = JSON.parse(row.queue_value) as unknown;
      return Array.isArray(value) ? (value as T[]) : [];
    } catch (error) {
      console.warn(
        `D1 queue "${this.key}" is unavailable; using the local development store.`,
        error,
      );
      return readLocal<T>(this.localFileName);
    }
  }

  async write(items: T[]): Promise<void> {
    try {
      const database = await ensureTable();
      await database
        .prepare(
          `INSERT INTO ${TABLE_NAME} (queue_key, queue_value, updated_at)
           VALUES (?, ?, ?)
           ON CONFLICT(queue_key) DO UPDATE SET
             queue_value = excluded.queue_value,
             updated_at = excluded.updated_at`,
        )
        .bind(this.key, JSON.stringify(items), new Date().toISOString())
        .run();
    } catch (error) {
      console.warn(
        `D1 queue "${this.key}" is unavailable; saving to the local development store.`,
        error,
      );
      await writeLocal(this.localFileName, items);
    }
  }
}
