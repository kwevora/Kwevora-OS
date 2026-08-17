import { getDatabase } from "./database";
import type { StorefrontOfferPackage } from "../StorefrontOfferBuilder";
type Row = { package: string };
const parse = (r: Row | null) => {
  if (!r) return null;
  try {
    return JSON.parse(r.package) as StorefrontOfferPackage;
  } catch {
    return null;
  }
};
export class StorefrontOfferPackageRepository {
  async forLaunch(id: string) {
    return parse(
      await getDatabase()
        .prepare(
          "SELECT package FROM storefront_offer_packages WHERE launchId=?",
        )
        .bind(id)
        .first<Row>(),
    );
  }
  async latest() {
    return parse(
      await getDatabase()
        .prepare(
          "SELECT package FROM storefront_offer_packages ORDER BY updatedAt DESC LIMIT 1",
        )
        .first<Row>(),
    );
  }
  async save(x: StorefrontOfferPackage) {
    const updatedAt = new Date().toISOString(),
      saved = { ...x, updatedAt };
    await getDatabase()
      .prepare(
        "INSERT INTO storefront_offer_packages (id,launchId,status,package,createdAt,updatedAt) VALUES (?,?,?,?,?,?) ON CONFLICT(launchId) DO UPDATE SET status=excluded.status,package=excluded.package,updatedAt=excluded.updatedAt",
      )
      .bind(
        saved.id,
        saved.launchId,
        saved.status,
        JSON.stringify(saved),
        saved.createdAt,
        updatedAt,
      )
      .run();
    return saved;
  }
}
export const storefrontOfferPackageRepository =
  new StorefrontOfferPackageRepository();
