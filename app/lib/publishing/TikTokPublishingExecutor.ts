import { promises as fs } from "node:fs";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import ffprobeStatic from "ffprobe-static";

const execFileAsync = promisify(execFile);
const API = "https://open.tiktokapis.com/v2";
const MAX_CHUNK = 64 * 1024 * 1024;

type TikTokError = { code?: string; message?: string; log_id?: string };
type CreatorInfo = {
  creator_username?: string;
  creator_nickname?: string;
  privacy_level_options?: string[];
  comment_disabled?: boolean;
  duet_disabled?: boolean;
  stitch_disabled?: boolean;
  max_video_post_duration_sec?: number;
};
export type TikTokPostStatus = {
  status: string;
  failReason: string;
  postIds: string[];
  uploadedBytes: number;
};
export type TikTokPublishResult = {
  publishId: string;
  privacyLevel: string;
  creatorUsername: string;
  status: TikTokPostStatus;
};

function clean(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function apiError(response: Response, error: TikTokError | undefined, fallback: string): Error {
  const detail = clean(error?.message) || clean(error?.code) || fallback;
  return new Error(response.ok ? detail : `${detail} (TikTok HTTP ${response.status})`);
}

async function jsonPost<T>(url: string, accessToken: string, body: object): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json; charset=UTF-8" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const value = await response.json() as { data?: T; error?: TikTokError };
  if (!response.ok || (value.error?.code && value.error.code !== "ok")) {
    throw apiError(response, value.error, "TikTok rejected the request.");
  }
  if (!value.data) throw new Error("TikTok returned no usable response data.");
  return value.data;
}

export function resolveApprovedVideo(filePath: string): string {
  const normalized = clean(filePath).replaceAll("\\", "/");
  const generatedRoot = path.join(process.cwd(), "public", "generated-videos");
  const uploadsRoot = path.join(process.cwd(), "data", "video-uploads");
  const root = normalized.includes("generated-videos") ? generatedRoot : uploadsRoot;
  const candidate = path.resolve(root, path.basename(normalized));
  if (!candidate.startsWith(`${root}${path.sep}`)) throw new Error("TikTok publishing accepts only an approved KWEVORA video file.");
  return candidate;
}

async function durationSeconds(filePath: string): Promise<number> {
  if (!ffprobeStatic?.path) throw new Error("KWEVORA cannot verify the video duration before TikTok upload.");
  const { stdout } = await execFileAsync(ffprobeStatic.path, [
    "-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", filePath,
  ]);
  const duration = Number(stdout.trim());
  if (!Number.isFinite(duration) || duration <= 0) throw new Error("The approved video has no verifiable duration.");
  return duration;
}

function chunkPlan(size: number): { chunkSize: number; total: number } {
  if (size < 5 * 1024 * 1024) return { chunkSize: size, total: 1 };
  const total = Math.ceil(size / MAX_CHUNK);
  return { chunkSize: Math.ceil(size / total), total };
}

export class TikTokPublishingExecutor {
  async creatorInfo(accessToken: string): Promise<CreatorInfo> {
    return jsonPost<CreatorInfo>(`${API}/post/publish/creator_info/query/`, accessToken, {});
  }

  async status(accessToken: string, publishId: string): Promise<TikTokPostStatus> {
    const data = await jsonPost<{
      status?: string; fail_reason?: string; publicaly_available_post_id?: Array<string | number>; uploaded_bytes?: number;
    }>(`${API}/post/publish/status/fetch/`, accessToken, { publish_id: publishId });
    return {
      status: clean(data.status),
      failReason: clean(data.fail_reason),
      postIds: Array.isArray(data.publicaly_available_post_id) ? data.publicaly_available_post_id.map(String) : [],
      uploadedBytes: Number(data.uploaded_bytes) || 0,
    };
  }

  async publish(input: { accessToken: string; filePath: string; mimeType: string; caption: string }): Promise<TikTokPublishResult> {
    const approvedPath = resolveApprovedVideo(input.filePath);
    const stat = await fs.stat(approvedPath);
    if (!stat.isFile() || stat.size <= 0) throw new Error("The approved TikTok video file is missing or empty.");
    const creator = await this.creatorInfo(input.accessToken);
    const duration = await durationSeconds(approvedPath);
    const maximum = Number(creator.max_video_post_duration_sec) || 0;
    if (!maximum || duration > maximum) {
      throw new Error(`TikTok allows this creator up to ${maximum || "an unknown number of"} seconds; this video is ${Math.ceil(duration)} seconds.`);
    }
    const options = Array.isArray(creator.privacy_level_options) ? creator.privacy_level_options : [];
    const audited = process.env.TIKTOK_DIRECT_POST_AUDITED === "true";
    const privacyLevel = audited && options.includes("PUBLIC_TO_EVERYONE")
      ? "PUBLIC_TO_EVERYONE"
      : options.includes("SELF_ONLY") ? "SELF_ONLY" : "";
    if (!privacyLevel) throw new Error("TikTok did not offer a safe privacy option for this account. KAI stopped before upload.");
    const plan = chunkPlan(stat.size);
    const initialized = await jsonPost<{ publish_id?: string; upload_url?: string }>(
      `${API}/post/publish/video/init/`, input.accessToken, {
        post_info: {
          title: clean(input.caption).slice(0, 2200),
          privacy_level: privacyLevel,
          disable_duet: Boolean(creator.duet_disabled),
          disable_comment: Boolean(creator.comment_disabled),
          disable_stitch: Boolean(creator.stitch_disabled),
          brand_content_toggle: false,
          brand_organic_toggle: true,
          is_aigc: true,
        },
        source_info: { source: "FILE_UPLOAD", video_size: stat.size, chunk_size: plan.chunkSize, total_chunk_count: plan.total },
      },
    );
    const publishId = clean(initialized.publish_id);
    const uploadUrl = clean(initialized.upload_url);
    if (!publishId || !uploadUrl) throw new Error("TikTok initialized the post without a publish ID or upload URL.");

    const handle = await fs.open(approvedPath, "r");
    try {
      for (let start = 0; start < stat.size; start += plan.chunkSize) {
        const end = Math.min(stat.size, start + plan.chunkSize);
        const buffer = Buffer.alloc(end - start);
        await handle.read(buffer, 0, buffer.length, start);
        const upload = await fetch(uploadUrl, {
          method: "PUT",
          headers: {
            "Content-Type": clean(input.mimeType) || "video/mp4",
            "Content-Length": String(buffer.length),
            "Content-Range": `bytes ${start}-${end - 1}/${stat.size}`,
          },
          body: buffer,
        });
        if (!upload.ok) throw new Error(`TikTok video transfer failed at byte ${start} (HTTP ${upload.status}).`);
      }
    } finally {
      await handle.close();
    }
    return {
      publishId,
      privacyLevel,
      creatorUsername: clean(creator.creator_username),
      status: await this.status(input.accessToken, publishId),
    };
  }
}

export const tiktokPublishingExecutor = new TikTokPublishingExecutor();
