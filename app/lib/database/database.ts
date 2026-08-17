import { getCloudflareContext } from "@opennextjs/cloudflare";

export type D1Result<T = unknown> = {
  results?: T[];
  success: boolean;
  meta?: { changes?: number };
};

export type D1Statement = {
  bind(...values: unknown[]): D1Statement;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<D1Result<T>>;
  run<T = Record<string, unknown>>(): Promise<D1Result<T>>;
};

export type KwevoraDatabase = {
  prepare(query: string): D1Statement;
  batch<T = unknown>(statements: D1Statement[]): Promise<D1Result<T>[]>;
};

type KwevoraCloudflareEnv = { kwevora_db: KwevoraDatabase };

export function getDatabase(): KwevoraDatabase {
  const { env } = getCloudflareContext() as unknown as {
    env: KwevoraCloudflareEnv;
  };
  if (!env?.kwevora_db) {
    throw new Error("Cloudflare D1 binding 'kwevora_db' is unavailable.");
  }
  return env.kwevora_db;
}
