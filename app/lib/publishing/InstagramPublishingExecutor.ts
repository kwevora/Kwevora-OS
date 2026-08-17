import { createReadStream, promises as fs } from "node:fs";
import path from "node:path";

type MetaError = { message?: string; type?: string; code?: number; error_subcode?: number; is_transient?: boolean };
type MetaResponse<T> = T & { error?: MetaError };

export type InstagramContainerStatus = {
  statusCode: string;
  status: string;
  retryable: boolean;
};

export type InstagramPublishedMedia = {
  id: string;
  permalink: string;
  timestamp: string;
};

function clean(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function version(): string {
  return process.env.META_GRAPH_VERSION?.trim() || "v23.0";
}

function graph(pathname: string): string {
  return `https://graph.facebook.com/${version()}/${pathname.replace(/^\//, "")}`;
}

function failure(error: MetaError | undefined, fallback: string): Error {
  const message = clean(error?.message) || fallback;
  const result = new Error(message) as Error & { retryable?: boolean };
  result.retryable = Boolean(error?.is_transient) || (Number(error?.code) >= 500);
  return result;
}

async function parse<T>(response: Response, fallback: string): Promise<T> {
  const body = await response.json() as MetaResponse<T>;
  if (!response.ok || body.error) throw failure(body.error, `${fallback} (Meta HTTP ${response.status})`);
  return body;
}

export function resolveInstagramVideo(filePath: string): string {
  const normalized = clean(filePath).replaceAll("\\", "/");
  const generatedRoot = path.join(process.cwd(), "public", "generated-videos");
  const uploadsRoot = path.join(process.cwd(), "data", "video-uploads");
  const root = normalized.includes("generated-videos") ? generatedRoot : uploadsRoot;
  return path.resolve(root, path.basename(normalized));
}

export class InstagramPublishingExecutor {
  async createContainer(input: { igUserId: string; accessToken: string; caption: string }): Promise<{ id: string; uploadUri: string }> {
    const response = await fetch(graph(`${input.igUserId}/media`), {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        media_type: "REELS",
        upload_type: "resumable",
        caption: clean(input.caption).slice(0, 2200),
        share_to_feed: "true",
        access_token: input.accessToken,
      }),
      cache: "no-store",
    });
    const data = await parse<{ id?: string; uri?: string }>(response, "Meta could not create the Instagram Reel container.");
    const id = clean(data.id);
    const uploadUri = clean(data.uri);
    if (!id || !uploadUri) throw new Error("Meta created no usable Reel upload session.");
    return { id, uploadUri };
  }

  async upload(input: { uploadUri: string; accessToken: string; filePath: string }): Promise<void> {
    const approvedPath = resolveInstagramVideo(input.filePath);
    const stat = await fs.stat(approvedPath);
    if (!stat.isFile() || stat.size <= 0) throw new Error("The approved Instagram video is missing or empty.");
    const init = {
      method: "POST",
      headers: {
        Authorization: `OAuth ${input.accessToken}`,
        file_offset: "0",
        "Content-Length": String(stat.size),
        "Content-Type": "application/octet-stream",
      },
      body: createReadStream(approvedPath),
      duplex: "half",
    } as unknown as RequestInit;
    const response = await fetch(input.uploadUri, init);
    await parse<Record<string, unknown>>(response, "Meta rejected the Instagram video transfer.");
  }

  async status(containerId: string, accessToken: string): Promise<InstagramContainerStatus> {
    const url = new URL(graph(containerId));
    url.searchParams.set("fields", "status_code,status");
    url.searchParams.set("access_token", accessToken);
    const response = await fetch(url, { cache: "no-store" });
    const data = await parse<{ status_code?: string; status?: string }>(response, "Meta could not read Reel processing status.");
    const statusCode = clean(data.status_code);
    return {
      statusCode,
      status: clean(data.status),
      retryable: statusCode === "IN_PROGRESS" || statusCode === "EXPIRED",
    };
  }

  async publish(igUserId: string, containerId: string, accessToken: string): Promise<InstagramPublishedMedia> {
    const response = await fetch(graph(`${igUserId}/media_publish`), {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ creation_id: containerId, access_token: accessToken }),
      cache: "no-store",
    });
    const published = await parse<{ id?: string }>(response, "Meta could not publish the finished Instagram Reel.");
    const id = clean(published.id);
    if (!id) throw new Error("Meta published the Reel without returning a media ID.");
    const detailsUrl = new URL(graph(id));
    detailsUrl.searchParams.set("fields", "id,permalink,timestamp");
    detailsUrl.searchParams.set("access_token", accessToken);
    const details = await parse<{ id?: string; permalink?: string; timestamp?: string }>(
      await fetch(detailsUrl, { cache: "no-store" }),
      "Meta published the Reel but KWEVORA could not verify its link.",
    );
    return { id, permalink: clean(details.permalink), timestamp: clean(details.timestamp) };
  }
}

export const instagramPublishingExecutor = new InstagramPublishingExecutor();
