import { randomUUID } from "node:crypto";
import { getDatabase } from "./database";
import type {
  BusinessExpense,
  CashFlowProfile,
  PayoutRecord,
} from "../ProfitCashFlowController";
const parse = <T>(x: string) => JSON.parse(x) as T;
export class ProfitCashFlowRepository {
  async profile() {
    const r = await getDatabase()
      .prepare(
        "SELECT profileData FROM profit_cashflow_profiles WHERE id='owner'",
      )
      .first<{ profileData: string }>();
    return r ? parse<CashFlowProfile>(r.profileData) : null;
  }
  async saveProfile(x: CashFlowProfile) {
    const now = new Date().toISOString(),
      saved = { ...x, updatedAt: now };
    await getDatabase()
      .prepare(
        "INSERT INTO profit_cashflow_profiles (id,profileData,createdAt,updatedAt) VALUES ('owner',?,?,?) ON CONFLICT(id) DO UPDATE SET profileData=excluded.profileData,updatedAt=excluded.updatedAt",
      )
      .bind(JSON.stringify(saved), saved.createdAt, now)
      .run();
    return saved;
  }
  async expenses() {
    const { results = [] } = await getDatabase()
      .prepare(
        "SELECT expenseData FROM business_expenses ORDER BY incurredAt DESC",
      )
      .all<{ expenseData: string }>();
    return results.map((x) => parse<BusinessExpense>(x.expenseData));
  }
  async saveExpense(x: Omit<BusinessExpense, "id" | "createdAt">) {
    const saved = {
      ...x,
      id: randomUUID(),
      createdAt: new Date().toISOString(),
    };
    await getDatabase()
      .prepare(
        "INSERT INTO business_expenses (id,category,expenseData,incurredAt,createdAt) VALUES (?,?,?,?,?)",
      )
      .bind(
        saved.id,
        saved.category,
        JSON.stringify(saved),
        saved.incurredAt,
        saved.createdAt,
      )
      .run();
    return saved;
  }
  async payout(id: string) {
    const r = await getDatabase()
      .prepare("SELECT payoutData FROM payout_records WHERE externalPayoutId=?")
      .bind(id)
      .first<{ payoutData: string }>();
    return r ? parse<PayoutRecord>(r.payoutData) : null;
  }
  async payouts() {
    const { results = [] } = await getDatabase()
      .prepare("SELECT payoutData FROM payout_records ORDER BY occurredAt DESC")
      .all<{ payoutData: string }>();
    return results.map((x) => parse<PayoutRecord>(x.payoutData));
  }
  async savePayout(x: Omit<PayoutRecord, "id" | "createdAt" | "updatedAt">) {
    const old = await this.payout(x.externalPayoutId),
      now = new Date().toISOString(),
      saved = {
        ...x,
        id: old?.id ?? randomUUID(),
        createdAt: old?.createdAt ?? now,
        updatedAt: now,
      };
    await getDatabase()
      .prepare(
        "INSERT INTO payout_records (id,externalPayoutId,status,payoutData,occurredAt,createdAt,updatedAt) VALUES (?,?,?,?,?,?,?) ON CONFLICT(externalPayoutId) DO UPDATE SET status=excluded.status,payoutData=excluded.payoutData,occurredAt=excluded.occurredAt,updatedAt=excluded.updatedAt",
      )
      .bind(
        saved.id,
        saved.externalPayoutId,
        saved.status,
        JSON.stringify(saved),
        saved.occurredAt,
        saved.createdAt,
        now,
      )
      .run();
    return saved;
  }
}
export const profitCashFlowRepository = new ProfitCashFlowRepository();
