import { NextRequest, NextResponse } from "next/server";
import { GET as collectYouTubeResults } from "../../youtube/results/route";
import { GET as collectTikTokResults } from "../../tiktok/results/route";
import { GET as collectInstagramResults } from "../../instagram/results/route";
import { GET as collectFacebookResults } from "../../facebook/results/route";
import {
  contentPerformanceLearningEngine,
  type VerifiedPerformanceMetrics,
} from "../../../lib/ContentPerformanceLearningEngine";
import { autonomousPublishingHandoffRepository } from "../../../lib/database/AutonomousPublishingHandoffRepository";
import { contentPerformanceSnapshotRepository } from "../../../lib/database/ContentPerformanceSnapshotRepository";
import type { AutonomousPublishingHandoff } from "../../../lib/AutonomousPublishingHandoffEngine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function clean(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function cleanMetrics(
  value: unknown,
): Partial<Record<keyof VerifiedPerformanceMetrics, number | null>> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const metrics = value as Record<string, unknown>;
  const allowed: Array<keyof VerifiedPerformanceMetrics> = [
    "views",
    "watchTimeMinutes",
    "averageViewDurationSeconds",
    "averageViewPercentage",
    "likes",
    "comments",
    "shares",
    "engagementRate",
    "clicks",
    "leads",
    "sales",
    "revenue",
  ];
  return Object.fromEntries(
    allowed.flatMap((name) => {
      const current = metrics[name];
      return current === null ||
        (typeof current === "number" && Number.isFinite(current))
        ? [[name, current]]
        : [];
    }),
  ) as Partial<Record<keyof VerifiedPerformanceMetrics, number | null>>;
}

async function collectPublication(
  request: NextRequest,
  due: AutonomousPublishingHandoff,
) {
  const dueExternalId = due.externalId;
  if (!dueExternalId)
    throw new Error(
      "The due publication does not have a verified platform ID.",
    );
  const resultsPath =
    due.platform === "facebook"
      ? "/api/facebook/results"
      : due.platform === "instagram"
        ? "/api/instagram/results"
        : due.platform === "tiktok"
          ? "/api/tiktok/results"
          : "/api/youtube/results";
  const resultsUrl = new URL(resultsPath, request.url);
  resultsUrl.searchParams.set(
    due.platform === "instagram" ? "mediaId" : "videoId",
    dueExternalId,
  );
  const resultRequest = new NextRequest(resultsUrl, {
    headers: request.headers,
  });
  const resultsResponse =
    due.platform === "facebook"
      ? await collectFacebookResults(resultRequest)
      : due.platform === "instagram"
        ? await collectInstagramResults(resultRequest)
        : due.platform === "tiktok"
          ? await collectTikTokResults(resultRequest)
          : await collectYouTubeResults(resultRequest);
  const results = (await resultsResponse.json()) as {
    success?: boolean;
    message?: string;
    collectedAt?: string;
    platform?: string;
    video?: { id?: string };
    media?: { id?: string };
    verifiedMetrics?: Partial<
      Record<keyof VerifiedPerformanceMetrics, number | null>
    >;
  };
  if (!resultsResponse.ok || !results.success)
    throw new Error(
      results.message ||
        `KAI could not collect the due ${due.platform} result.`,
    );
  return {
    snapshot: await contentPerformanceLearningEngine.capture({
      executionPlanId: due.executionPlanId,
      platform: clean(results.platform) || due.platform,
      externalId:
        clean(results.video?.id) || clean(results.media?.id) || dueExternalId,
      source: `${due.platform}_api`,
      metrics: results.verifiedMetrics ?? {},
      collectedAt: clean(results.collectedAt) || undefined,
    }),
    refreshedCookie: resultsResponse.headers.get("set-cookie"),
  };
}

export async function GET() {
  try {
    return NextResponse.json({
      success: true,
      performanceLearning: await contentPerformanceLearningEngine.summary(),
    });
  } catch (error) {
    console.error("Performance learning summary failed:", error);
    return NextResponse.json(
      {
        success: false,
        message: "KAI could not load verified performance learning.",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;
    if (body.action === "collect_next" || Object.keys(body).length === 0) {
      const now = new Date();
      const minimumAgeMs = 24 * 60 * 60 * 1000;
      const due: Awaited<
        ReturnType<typeof autonomousPublishingHandoffRepository.history>
      > = [];
      for (const handoff of await autonomousPublishingHandoffRepository.history(
        2000,
      )) {
        if (
          handoff.status !== "published" ||
          !["youtube", "tiktok", "instagram", "facebook"].includes(
            handoff.platform,
          ) ||
          !handoff.externalId ||
          !handoff.publishedAt
        )
          continue;
        if (handoff.platform === "tiktok" && !handoff.publicationUrl) continue;
        if (
          now.getTime() - new Date(handoff.publishedAt).getTime() <
          minimumAgeMs
        )
          continue;
        const latest =
          await contentPerformanceSnapshotRepository.latestForPublication(
            handoff.executionPlanId,
            handoff.platform,
            handoff.externalId,
          );
        if (
          !latest ||
          now.getTime() - new Date(latest.collectedAt).getTime() >= minimumAgeMs
        )
          due.push(handoff);
        if (due.length >= 4) break;
      }
      if (!due.length) {
        return NextResponse.json({
          success: true,
          collected: false,
          performanceLearning: await contentPerformanceLearningEngine.summary(),
          message:
            "No verified platform result is due for another snapshot right now.",
        });
      }
      const snapshots = [];
      const failures: Array<{ platform: string; message: string }> = [];
      let refreshedCookie: string | null = null;
      for (const publication of due) {
        try {
          const collected = await collectPublication(request, publication);
          snapshots.push(collected.snapshot);
          refreshedCookie = collected.refreshedCookie || refreshedCookie;
        } catch (error) {
          failures.push({
            platform: publication.platform,
            message:
              error instanceof Error
                ? error.message
                : "Result collection failed.",
          });
        }
      }
      const response = NextResponse.json({
        success: snapshots.length > 0,
        collected: snapshots.length > 0,
        collectedCount: snapshots.length,
        snapshot: snapshots.at(-1) ?? null,
        snapshots,
        failures,
        performanceLearning: await contentPerformanceLearningEngine.summary(),
        message:
          snapshots.length > 0
            ? `KAI collected ${snapshots.length} due verified platform result${snapshots.length === 1 ? "" : "s"} and rebuilt its cross-platform playbook.`
            : "KAI could not collect any due platform results.",
      });
      if (refreshedCookie) response.headers.set("set-cookie", refreshedCookie);
      return response;
    }
    const executionPlanId = clean(body.executionPlanId);
    const platform = clean(body.platform);
    const externalId = clean(body.externalId);
    const source = clean(body.source);
    if (!executionPlanId || !platform || !externalId || !source) {
      return NextResponse.json(
        {
          success: false,
          message:
            "executionPlanId, platform, externalId, and a verified source are required.",
        },
        { status: 400 },
      );
    }
    const snapshot = await contentPerformanceLearningEngine.capture({
      executionPlanId,
      platform,
      externalId,
      source,
      metrics: cleanMetrics(body.metrics),
      collectedAt: clean(body.collectedAt) || undefined,
    });
    return NextResponse.json({
      success: true,
      snapshot,
      performanceLearning: await contentPerformanceLearningEngine.summary(),
      message:
        "KAI saved the verified result and updated its performance lesson.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "KAI could not learn from that result.",
      },
      { status: 400 },
    );
  }
}
