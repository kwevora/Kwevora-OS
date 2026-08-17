import { createReadStream, promises as fs } from "node:fs";
import path from "node:path";

type MetaError = { message?: string; code?: number; is_transient?: boolean };
type MetaResponse<T> = T & { error?: MetaError };
type Phase = { status?: string; bytes_transferred?: number; error?: { message?: string } };

export type FacebookReelStatus = {
  videoStatus: string;
  uploading: string;
  processing: string;
  publishing: string;
  message: string;
  complete: boolean;
  failed: boolean;
};

export type FacebookReel = { id: string; permalink: string; createdTime: string };

function clean(value: unknown): string { return typeof value === "string" ? value.trim() : ""; }
function version(): string { return process.env.META_GRAPH_VERSION?.trim() || "v23.0"; }
function graph(pathname: string): string { return `https://graph.facebook.com/${version()}/${pathname.replace(/^\//, "")}`; }

async function parse<T>(response: Response, fallback: string): Promise<T> {
  const body = await response.json() as MetaResponse<T>;
  if (!response.ok || body.error) {
    const error = new Error(clean(body.error?.message) || `${fallback} (Meta HTTP ${response.status})`) as Error & { retryable?: boolean };
    error.retryable = Boolean(body.error?.is_transient) || Number(body.error?.code) >= 500;
    throw error;
  }
  return body;
}

export function resolveFacebookVideo(filePath: string): string {
  const normalized = clean(filePath).replaceAll("\\", "/");
  const generatedRoot = path.join(process.cwd(), "public", "generated-videos");
  const uploadsRoot = path.join(process.cwd(), "data", "video-uploads");
  const root = normalized.includes("generated-videos") ? generatedRoot : uploadsRoot;
  return path.resolve(root, path.basename(normalized));
}

export class FacebookPublishingExecutor {
  async start(pageId: string, accessToken: string): Promise<{ videoId: string; uploadUrl: string }> {
    const response = await fetch(graph(`${pageId}/video_reels`), {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ upload_phase: "start", access_token: accessToken }),
      cache: "no-store",
    });
    const data = await parse<{ video_id?: string; upload_url?: string }>(response, "Meta could not start the Facebook Reel upload.");
    const videoId = clean(data.video_id);
    const uploadUrl = clean(data.upload_url);
    if (!videoId || !uploadUrl) throw new Error("Meta started no usable Facebook Reel upload session.");
    return { videoId, uploadUrl };
  }

  async upload(uploadUrl: string, accessToken: string, filePath: string): Promise<void> {
    const approvedPath = resolveFacebookVideo(filePath);
    const stat = await fs.stat(approvedPath);
    if (!stat.isFile() || stat.size <= 0) throw new Error("The approved Facebook video is missing or empty.");
    const response = await fetch(uploadUrl, {
      method: "POST",
      headers: {
        Authorization: `OAuth ${accessToken}`,
        offset: "0",
        file_size: String(stat.size),
        "Content-Length": String(stat.size),
        "Content-Type": "application/octet-stream",
      },
      body: createReadStream(approvedPath),
      duplex: "half",
    } as unknown as RequestInit);
    await parse<Record<string, unknown>>(response, "Meta rejected the Facebook Reel video transfer.");
  }

  async finish(input: { pageId: string; videoId: string; accessToken: string; title: string; description: string }): Promise<void> {
    const response = await fetch(graph(`${input.pageId}/video_reels`), {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        upload_phase: "finish",
        video_id: input.videoId,
        video_state: "PUBLISHED",
        title: clean(input.title).slice(0, 255),
        description: clean(input.description),
        access_token: input.accessToken,
      }),
      cache: "no-store",
    });
    const data = await parse<{ success?: boolean }>(response, "Meta could not finish the Facebook Reel upload.");
    if (!data.success) throw new Error("Meta did not confirm the Facebook Reel finish request.");
  }

  async status(videoId: string, accessToken: string): Promise<FacebookReelStatus> {
    const url = new URL(graph(videoId));
    url.searchParams.set("fields", "status");
    url.searchParams.set("access_token", accessToken);
    const data = await parse<{ status?: { video_status?: string; uploading_phase?: Phase; processing_phase?: Phase; publishing_phase?: Phase } }>(
      await fetch(url, { cache: "no-store" }),
      "Meta could not read Facebook Reel status.",
    );
    const status = data.status ?? {};
    const uploading = clean(status.uploading_phase?.status);
    const processing = clean(status.processing_phase?.status);
    const publishing = clean(status.publishing_phase?.status);
    const videoStatus = clean(status.video_status);
    const message = clean(status.uploading_phase?.error?.message) || clean(status.processing_phase?.error?.message) || clean(status.publishing_phase?.error?.message);
    const failed = [uploading, processing, publishing, videoStatus].some((value) => ["error", "failed"].includes(value.toLowerCase()));
    return {
      videoStatus, uploading, processing, publishing, message,
      complete: publishing.toLowerCase() === "complete" || videoStatus.toLowerCase() === "ready",
      failed,
    };
  }

  async details(videoId: string, accessToken: string): Promise<FacebookReel> {
    const url = new URL(graph(videoId));
    url.searchParams.set("fields", "id,permalink_url,created_time");
    url.searchParams.set("access_token", accessToken);
    const data = await parse<{ id?: string; permalink_url?: string; created_time?: string }>(
      await fetch(url, { cache: "no-store" }),
      "Meta published the Facebook Reel but KWEVORA could not verify it.",
    );
    const id = clean(data.id);
    if (!id) throw new Error("Meta returned no verified Facebook Reel ID.");
    return { id, permalink: clean(data.permalink_url), createdTime: clean(data.created_time) };
  }
}

export const facebookPublishingExecutor = new FacebookPublishingExecutor();
