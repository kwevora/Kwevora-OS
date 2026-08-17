import { randomUUID } from "node:crypto";
import { getDatabase } from "./database";
import type {
  StanStoreProfile,
  StanTransaction,
  StanRefundReview,
} from "../StanStoreIntegrationEngine";
const parse = <T>(x: string) => JSON.parse(x) as T;
export class StanStoreRepository {
  async profile() {
    const r = await getDatabase()
      .prepare("SELECT profileData FROM stan_store_profiles WHERE id='stan'")
      .first<{ profileData: string }>();
    return r ? parse<StanStoreProfile>(r.profileData) : null;
  }
  async saveProfile(x: StanStoreProfile) {
    const now = new Date().toISOString(),
      saved = { ...x, updatedAt: now };
    await getDatabase()
      .prepare(
        "INSERT INTO stan_store_profiles (id,profileData,createdAt,updatedAt) VALUES ('stan',?,?,?) ON CONFLICT(id) DO UPDATE SET profileData=excluded.profileData,updatedAt=excluded.updatedAt",
      )
      .bind(JSON.stringify(saved), saved.createdAt, now)
      .run();
    return saved;
  }
  async transaction(id: string) {
    const r = await getDatabase()
      .prepare(
        "SELECT transactionData FROM stan_transactions WHERE externalTransactionId=?",
      )
      .bind(id)
      .first<{ transactionData: string }>();
    return r ? parse<StanTransaction>(r.transactionData) : null;
  }
  async transactions() {
    const { results = [] } = await getDatabase()
      .prepare(
        "SELECT transactionData FROM stan_transactions ORDER BY occurredAt DESC",
      )
      .all<{ transactionData: string }>();
    return results.map((x) => parse<StanTransaction>(x.transactionData));
  }
  async saveTransaction(x: Omit<StanTransaction, "id" | "createdAt">) {
    const old = await this.transaction(x.externalTransactionId);
    if (old) return old;
    const saved = {
      ...x,
      id: randomUUID(),
      createdAt: new Date().toISOString(),
    };
    await getDatabase()
      .prepare(
        "INSERT INTO stan_transactions (id,externalTransactionId,transactionType,transactionData,occurredAt,createdAt) VALUES (?,?,?,?,?,?)",
      )
      .bind(
        saved.id,
        saved.externalTransactionId,
        saved.transactionType,
        JSON.stringify(saved),
        saved.occurredAt,
        saved.createdAt,
      )
      .run();
    return saved;
  }
  async reviews() {
    const { results = [] } = await getDatabase()
      .prepare(
        "SELECT reviewData FROM stan_refund_reviews ORDER BY updatedAt DESC",
      )
      .all<{ reviewData: string }>();
    return results.map((x) => parse<StanRefundReview>(x.reviewData));
  }
  async saveReview(x: StanRefundReview) {
    const now = new Date().toISOString(),
      saved = { ...x, updatedAt: now };
    await getDatabase()
      .prepare(
        "INSERT INTO stan_refund_reviews (id,externalOrderId,status,reviewData,createdAt,updatedAt) VALUES (?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET status=excluded.status,reviewData=excluded.reviewData,updatedAt=excluded.updatedAt",
      )
      .bind(
        saved.id,
        saved.externalOrderId,
        saved.status,
        JSON.stringify(saved),
        saved.createdAt,
        now,
      )
      .run();
    return saved;
  }
}
export const stanStoreRepository = new StanStoreRepository();
