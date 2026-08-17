import { getDatabase } from "./database";
import type { CreativeVideoWinner } from "../CreativeWinnerSystem";

type Row = { winner: string };
function parse(row: Row | null): CreativeVideoWinner | null {
  if (!row) return null;
  try {
    return JSON.parse(row.winner) as CreativeVideoWinner;
  } catch {
    return null;
  }
}

export class CreativeVideoWinnerRepository {
  async save(winner: CreativeVideoWinner) {
    const updatedAt = new Date().toISOString();
    const stored = { ...winner, updatedAt };
    await getDatabase()
      .prepare(
        `INSERT INTO creative_video_winners (id, sourceExperimentId, status, winner, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(sourceExperimentId) DO UPDATE SET status = excluded.status, winner = excluded.winner, updatedAt = excluded.updatedAt`,
      )
      .bind(
        stored.id,
        stored.sourceExperimentId,
        stored.status,
        JSON.stringify(stored),
        stored.createdAt,
        updatedAt,
      )
      .run();
    return stored;
  }

  async byExperiment(sourceExperimentId: string) {
    return parse(
      await getDatabase()
        .prepare(
          "SELECT winner FROM creative_video_winners WHERE sourceExperimentId = ?",
        )
        .bind(sourceExperimentId)
        .first<Row>(),
    );
  }

  async history(limit = 200) {
    const safe = Math.max(1, Math.min(1000, Math.floor(limit)));
    return (
      (
        await getDatabase()
          .prepare(
            "SELECT winner FROM creative_video_winners ORDER BY updatedAt DESC LIMIT ?",
          )
          .bind(safe)
          .all<Row>()
      ).results ?? []
    )
      .map(parse)
      .filter((item): item is CreativeVideoWinner => item !== null);
  }
}

export const creativeVideoWinnerRepository =
  new CreativeVideoWinnerRepository();
