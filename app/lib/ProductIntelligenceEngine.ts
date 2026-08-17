import { getDatabase } from "./database/database";

export type ProductProfile = {
  sourceUrl: string;
  title: string;
  description: string;
  productAssetUrls: string[];
  inspectedAt: string;
};

async function ensureProductLibrary() {
  const database = getDatabase();
  await database.prepare(`
    CREATE TABLE IF NOT EXISTS kai_product_profiles (
      source_url TEXT PRIMARY KEY,
      profile_data TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `).run();
  return database;
}

async function cachedProduct(sourceUrl: string) {
  try {
    const database = await ensureProductLibrary();
    const row = await database
      .prepare("SELECT profile_data FROM kai_product_profiles WHERE source_url = ? LIMIT 1")
      .bind(sourceUrl)
      .first<{ profile_data?: string }>();
    if (!row?.profile_data) return null;
    const profile = JSON.parse(row.profile_data) as ProductProfile;
    return profile.productAssetUrls?.length ? profile : null;
  } catch {
    return null;
  }
}

async function rememberProduct(profile: ProductProfile, requestedUrl: string) {
  try {
    const database = await ensureProductLibrary();
    const data = JSON.stringify(profile);
    const updatedAt = new Date().toISOString();
    for (const key of new Set([requestedUrl, profile.sourceUrl])) {
      await database.prepare(`
        INSERT INTO kai_product_profiles (source_url, profile_data, updated_at)
        VALUES (?, ?, ?)
        ON CONFLICT(source_url) DO UPDATE SET
          profile_data = excluded.profile_data,
          updated_at = excluded.updated_at
      `).bind(key, data, updatedAt).run();
    }
  } catch {
    // Product inspection still succeeds when the optional memory store is unavailable.
  }
}

function decode(value: string) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
}

function meta(html: string, key: string) {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = [
    new RegExp(`<meta[^>]+(?:property|name)=["']${escaped}["'][^>]+content=["']([^"']+)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${escaped}["']`, "i"),
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return decode(match[1].trim());
  }
  return "";
}

function titleFromHtml(html: string) {
  return meta(html, "og:title") || meta(html, "twitter:title") || decode(html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim() ?? "");
}

function imageCandidates(html: string, baseUrl: string) {
  const values = [meta(html, "og:image"), meta(html, "twitter:image")];
  for (const match of html.matchAll(/<img[^>]+(?:src|data-src)=["']([^"']+)["']/gi)) values.push(decode(match[1]));
  for (const match of html.matchAll(/["'](?:image|imageUrl|thumbnailUrl)["']\s*:\s*["']([^"']+)["']/gi)) values.push(decode(match[1].replaceAll("\\/", "/")));
  return [...new Set(values.flatMap((value) => {
    if (!value || value.startsWith("data:")) return [];
    try {
      const url = new URL(value, baseUrl);
      if (!/^https?:$/.test(url.protocol)) return [];
      const text = url.toString();
      if (/logo|favicon|avatar|icon/i.test(text)) return [];
      return [text];
    } catch {
      return [];
    }
  }))].slice(0, 8);
}

export async function inspectProduct(sourceUrl: string): Promise<ProductProfile> {
  let url: URL;
  try {
    url = new URL(sourceUrl);
  } catch {
    throw new Error("KAI needs a valid Stan Store product link.");
  }
  if (url.protocol !== "https:" || !(url.hostname === "stan.store" || url.hostname.endsWith(".stan.store"))) {
    throw new Error("For this release, automatic product inspection requires a secure stan.store product link.");
  }
  const requestedUrl = url.toString();
  const cached = await cachedProduct(requestedUrl);
  try {
    const response = await fetch(url, {
      redirect: "follow",
      cache: "no-store",
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; KWEVORA-KAI/9.10; +https://getkwevora.com)",
        Accept: "text/html,application/xhtml+xml",
      },
    });
    if (!response.ok) throw new Error(`KAI could not inspect the Stan product page (${response.status}).`);
    const html = await response.text();
    const assets = imageCandidates(html, response.url || requestedUrl);
    if (!assets.length) {
      if (cached) return cached;
      throw new Error("KAI inspected the Stan page but found no usable product imagery. Add product preview images to the Stan listing once, then KAI can reuse them automatically.");
    }
    const profile = {
      sourceUrl: response.url || requestedUrl,
      title: titleFromHtml(html).replace(/\s*[|–-]\s*Stan.*$/i, "").trim() || "Digital product",
      description: meta(html, "og:description") || meta(html, "description") || "A digital product available through the connected Stan Store.",
      productAssetUrls: assets,
      inspectedAt: new Date().toISOString(),
    } satisfies ProductProfile;
    await rememberProduct(profile, requestedUrl);
    return profile;
  } catch (error) {
    if (cached) return cached;
    throw error;
  }
}
