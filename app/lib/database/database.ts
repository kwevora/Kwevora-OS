import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

const dataDirectory = path.join(
  process.cwd(),
  "data",
);

if (!fs.existsSync(dataDirectory)) {
  fs.mkdirSync(dataDirectory, {
    recursive: true,
  });
}

const databasePath = path.join(
  dataDirectory,
  "kwevora.db",
);

export const db = new Database(
  databasePath,
);

db.pragma("journal_mode = WAL");

db.exec(`
CREATE TABLE IF NOT EXISTS memories (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  importance TEXT NOT NULL,
  tags TEXT NOT NULL,
  learnedAt TEXT NOT NULL,
  lastUsed TEXT
);
`);

db.exec(`
CREATE TABLE IF NOT EXISTS business_profile (
  id INTEGER PRIMARY KEY,
  profile TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);
`);

db.exec(`
CREATE TABLE IF NOT EXISTS overnight_reports (
  id TEXT PRIMARY KEY,
  report TEXT NOT NULL,
  startedAt TEXT NOT NULL,
  finishedAt TEXT NOT NULL,
  createdAt TEXT NOT NULL
);
`);

db.exec(`
CREATE INDEX IF NOT EXISTS overnight_reports_finished_at
ON overnight_reports (finishedAt DESC);
`);

/* ----------------------------- */
/* NEW: KAI Learning Brain       */
/* ----------------------------- */

db.exec(`
CREATE TABLE IF NOT EXISTS learning_events (
  id TEXT PRIMARY KEY,
  situation TEXT NOT NULL,
  decision TEXT NOT NULL,
  outcome TEXT NOT NULL,
  lesson TEXT NOT NULL,
  confidenceBefore INTEGER NOT NULL,
  confidenceAfter INTEGER NOT NULL,
  createdAt TEXT NOT NULL,
  tags TEXT NOT NULL
);
`);

db.exec(`
CREATE INDEX IF NOT EXISTS learning_events_createdAt
ON learning_events (createdAt DESC);
`);