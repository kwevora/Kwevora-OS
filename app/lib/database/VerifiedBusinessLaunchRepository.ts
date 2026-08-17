import { getDatabase } from "./database";
import type { VerifiedBusinessLaunch } from "../VerifiedBusinessLaunchEngine";
type Row = { launch: string };
const parse = (r: Row | null) => {
  if (!r) return null;
  try {
    return JSON.parse(r.launch) as VerifiedBusinessLaunch;
  } catch {
    return null;
  }
};
export class VerifiedBusinessLaunchRepository {
  async latest() {
    return parse(
      await getDatabase()
        .prepare(
          "SELECT launch FROM verified_business_launches ORDER BY updatedAt DESC LIMIT 1",
        )
        .first<Row>(),
    );
  }
  async byProductKey(key: string) {
    return parse(
      await getDatabase()
        .prepare(
          "SELECT launch FROM verified_business_launches WHERE productKey=?",
        )
        .bind(key)
        .first<Row>(),
    );
  }
  async save(x: VerifiedBusinessLaunch) {
    const updatedAt = new Date().toISOString(),
      saved = { ...x, updatedAt };
    await getDatabase()
      .prepare(
        "INSERT INTO verified_business_launches (id,productKey,status,launch,createdAt,updatedAt) VALUES (?,?,?,?,?,?) ON CONFLICT(productKey) DO UPDATE SET status=excluded.status,launch=excluded.launch,updatedAt=excluded.updatedAt",
      )
      .bind(
        saved.id,
        saved.productKey,
        saved.status,
        JSON.stringify(saved),
        saved.createdAt,
        updatedAt,
      )
      .run();
    return saved;
  }
}
export const verifiedBusinessLaunchRepository =
  new VerifiedBusinessLaunchRepository();
