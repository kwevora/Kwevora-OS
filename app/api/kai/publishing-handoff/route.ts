import { NextRequest, NextResponse } from "next/server";
import { POST as executePublishing } from "../../publishing/execute/route";
import { POST as executeTikTok } from "../../tiktok/publish/route";
import { POST as executeInstagram } from "../../instagram/publish/route";
import { POST as executeFacebook } from "../../facebook/publish/route";
import { POST as updatePublishing } from "../../publishing/route";
import { autonomousPublishingHandoffEngine } from "../../../lib/AutonomousPublishingHandoffEngine";
import { autonomousPublishingHandoffRepository } from "../../../lib/database/AutonomousPublishingHandoffRepository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

function clean(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

type TikTokExecutionResult = {
  success?: boolean;
  executed?: boolean;
  message?: string;
  publishId?: string;
  status?: { status?: string; failReason?: string; postIds?: string[] };
  result?: {
    publishId?: string;
    privacyLevel?: string;
    creatorUsername?: string;
    status?: { status?: string; failReason?: string; postIds?: string[] };
  };
};

type InstagramExecutionResult = {
  success?: boolean;
  executed?: boolean;
  message?: string;
  containerId?: string;
  status?: { statusCode?: string; status?: string };
  media?: { id?: string; permalink?: string; timestamp?: string } | null;
};

type FacebookExecutionResult = {
  success?: boolean;
  executed?: boolean;
  message?: string;
  videoId?: string;
  status?: {
    videoStatus?: string;
    processing?: string;
    publishing?: string;
    failed?: boolean;
  };
  reel?: { id?: string; permalink?: string; createdTime?: string } | null;
};

async function markTikTokPublished(
  request: NextRequest,
  handoffId: string,
  publishingItemId: string,
  result: TikTokExecutionResult,
) {
  const details = result.result ?? {
    publishId: result.publishId,
    status: result.status,
  };
  const postId = details.status?.postIds?.[0] ?? "";
  const externalId = postId || clean(details.publishId);
  const username =
    clean(details.creatorUsername) ||
    request.cookies.get("kwevora_tiktok_display_name")?.value?.trim() ||
    "";
  const url =
    postId && username
      ? `https://www.tiktok.com/@${encodeURIComponent(username.replace(/^@/, ""))}/video/${postId}`
      : "";
  const publishedAt = new Date().toISOString();
  const update = await updatePublishing(
    new NextRequest(new URL("/api/publishing", request.url), {
      method: "POST",
      headers: request.headers,
      body: JSON.stringify({
        action: "mark_published",
        id: publishingItemId,
        publication: {
          platform: "tiktok",
          externalId,
          url,
          publishedAt,
          channelName: username,
          privacyStatus:
            clean(details.privacyLevel) ||
            (postId ? "PUBLIC_TO_EVERYONE" : "SELF_ONLY"),
        },
      }),
    }),
  );
  if (!update.ok) {
    const body = (await update.json()) as { message?: string };
    throw new Error(
      body.message ||
        "TikTok posted, but KWEVORA could not save the verified publication.",
    );
  }
  return await autonomousPublishingHandoffEngine.succeeded(handoffId, {
    externalId,
    url,
    publishedAt,
  });
}

async function runTikTok(
  request: NextRequest,
  handoff: Awaited<
    ReturnType<typeof autonomousPublishingHandoffRepository.byId>
  >,
  statusOnly = false,
) {
  if (!handoff)
    throw new Error("The TikTok publishing handoff no longer exists.");
  const response = await executeTikTok(
    new NextRequest(new URL("/api/tiktok/publish", request.url), {
      method: "POST",
      headers: request.headers,
      body: JSON.stringify(
        statusOnly
          ? {
              action: "status",
              publishId: handoff.externalId,
            }
          : {
              filePath: handoff.payload.mediaFilePath,
              mimeType: handoff.payload.mediaMimeType,
              caption: handoff.payload.platformCaption,
            },
      ),
    }),
  );
  const result = (await response.json()) as TikTokExecutionResult;
  if (!response.ok || !result.success)
    throw new Error(
      result.message || "TikTok rejected the publishing request.",
    );
  const status = result.result?.status ?? result.status;
  if (status?.status === "FAILED")
    throw new Error(status.failReason || "TikTok processing failed.");
  if (status?.status === "PUBLISH_COMPLETE") {
    return {
      published: await markTikTokPublished(
        request,
        handoff.id,
        handoff.publishingItemId,
        result,
      ),
      result,
    };
  }
  const publishId =
    clean(result.result?.publishId) ||
    clean(result.publishId) ||
    clean(handoff.externalId);
  return {
    published: await autonomousPublishingHandoffEngine.processing(
      handoff.id,
      publishId,
      `TikTok accepted the real upload and reports ${clean(status?.status) || "processing"}. KAI will verify completion before recording publication.`,
    ),
    result,
  };
}

async function markInstagramPublished(
  request: NextRequest,
  handoffId: string,
  publishingItemId: string,
  result: InstagramExecutionResult,
) {
  const externalId = clean(result.media?.id);
  const url = clean(result.media?.permalink);
  if (!externalId)
    throw new Error(
      "Meta reported success without a verified Instagram media ID.",
    );
  const publishedAt =
    clean(result.media?.timestamp) || new Date().toISOString();
  const accountName =
    request.cookies.get("kwevora_instagram_account_name")?.value?.trim() ?? "";
  const update = await updatePublishing(
    new NextRequest(new URL("/api/publishing", request.url), {
      method: "POST",
      headers: request.headers,
      body: JSON.stringify({
        action: "mark_published",
        id: publishingItemId,
        publication: {
          platform: "instagram",
          externalId,
          url,
          publishedAt,
          channelName: accountName,
          privacyStatus: "published",
        },
      }),
    }),
  );
  if (!update.ok) {
    const body = (await update.json()) as { message?: string };
    throw new Error(
      body.message ||
        "Instagram published, but KWEVORA could not save the verified Reel.",
    );
  }
  return await autonomousPublishingHandoffEngine.succeeded(handoffId, {
    externalId,
    url,
    publishedAt,
  });
}

async function runInstagram(
  request: NextRequest,
  handoff: Awaited<
    ReturnType<typeof autonomousPublishingHandoffRepository.byId>
  >,
  statusOnly = false,
) {
  if (!handoff)
    throw new Error("The Instagram publishing handoff no longer exists.");
  const response = await executeInstagram(
    new NextRequest(new URL("/api/instagram/publish", request.url), {
      method: "POST",
      headers: request.headers,
      body: JSON.stringify(
        statusOnly
          ? {
              action: "status",
              containerId: handoff.externalId,
            }
          : {
              filePath: handoff.payload.mediaFilePath,
              caption: handoff.payload.platformCaption,
            },
      ),
    }),
  );
  const result = (await response.json()) as InstagramExecutionResult;
  if (!response.ok || !result.success)
    throw new Error(
      result.message || "Meta rejected the Instagram Reel request.",
    );
  if (result.executed && result.media?.id) {
    return {
      published: await markInstagramPublished(
        request,
        handoff.id,
        handoff.publishingItemId,
        result,
      ),
      result,
    };
  }
  const containerId = clean(result.containerId) || clean(handoff.externalId);
  return {
    published: await autonomousPublishingHandoffEngine.processing(
      handoff.id,
      containerId,
      `Meta accepted the real Reel upload and reports ${clean(result.status?.statusCode) || "IN_PROGRESS"}. KAI will verify completion before publishing it.`,
    ),
    result,
  };
}

async function markFacebookPublished(
  request: NextRequest,
  handoffId: string,
  publishingItemId: string,
  result: FacebookExecutionResult,
) {
  const externalId = clean(result.reel?.id);
  const url = clean(result.reel?.permalink);
  if (!externalId)
    throw new Error(
      "Meta reported success without a verified Facebook Reel ID.",
    );
  const publishedAt =
    clean(result.reel?.createdTime) || new Date().toISOString();
  const pageId =
    request.cookies.get("kwevora_facebook_page_id")?.value?.trim() ?? "";
  const pageName =
    request.cookies.get("kwevora_facebook_page_name")?.value?.trim() ?? "";
  const update = await updatePublishing(
    new NextRequest(new URL("/api/publishing", request.url), {
      method: "POST",
      headers: request.headers,
      body: JSON.stringify({
        action: "mark_published",
        id: publishingItemId,
        publication: {
          platform: "facebook",
          externalId,
          url,
          publishedAt,
          channelId: pageId,
          channelName: pageName,
          privacyStatus: "published",
        },
      }),
    }),
  );
  if (!update.ok) {
    const body = (await update.json()) as { message?: string };
    throw new Error(
      body.message ||
        "Facebook published, but KWEVORA could not save the verified Reel.",
    );
  }
  return await autonomousPublishingHandoffEngine.succeeded(handoffId, {
    externalId,
    url,
    publishedAt,
  });
}

async function runFacebook(
  request: NextRequest,
  handoff: Awaited<
    ReturnType<typeof autonomousPublishingHandoffRepository.byId>
  >,
  statusOnly = false,
) {
  if (!handoff)
    throw new Error("The Facebook publishing handoff no longer exists.");
  const response = await executeFacebook(
    new NextRequest(new URL("/api/facebook/publish", request.url), {
      method: "POST",
      headers: request.headers,
      body: JSON.stringify(
        statusOnly
          ? {
              action: "status",
              videoId: handoff.externalId,
            }
          : {
              filePath: handoff.payload.mediaFilePath,
              title: handoff.payload.title,
              description: handoff.payload.platformCaption,
            },
      ),
    }),
  );
  const result = (await response.json()) as FacebookExecutionResult;
  if (!response.ok || !result.success)
    throw new Error(
      result.message || "Meta rejected the Facebook Reel request.",
    );
  if (result.executed && result.reel?.id) {
    return {
      published: await markFacebookPublished(
        request,
        handoff.id,
        handoff.publishingItemId,
        result,
      ),
      result,
    };
  }
  const videoId = clean(result.videoId) || clean(handoff.externalId);
  return {
    published: await autonomousPublishingHandoffEngine.processing(
      handoff.id,
      videoId,
      `Meta accepted the real Facebook Reel and reports ${clean(result.status?.videoStatus) || clean(result.status?.processing) || "processing"}. KAI will verify publication before saving it.`,
    ),
    result,
  };
}

export async function GET() {
  try {
    return NextResponse.json({
      success: true,
      publishing: await autonomousPublishingHandoffEngine.summary(),
    });
  } catch (error) {
    console.error("Publishing handoff summary failed:", error);
    return NextResponse.json(
      {
        success: false,
        message: "KAI could not load the publishing handoffs.",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  let handoffId = "";
  try {
    await autonomousPublishingHandoffEngine.releaseExecutor("tiktok");
    await autonomousPublishingHandoffEngine.releaseExecutor("instagram");
    await autonomousPublishingHandoffEngine.releaseExecutor("facebook");
    const processing =
      await autonomousPublishingHandoffRepository.nextProcessing();
    if (processing) {
      handoffId = processing.id;
      const checked =
        processing.platform === "facebook"
          ? await runFacebook(request, processing, true)
          : processing.platform === "instagram"
            ? await runInstagram(request, processing, true)
            : await runTikTok(request, processing, true);
      return NextResponse.json({
        success: true,
        executed: Boolean(checked.published?.status === "published"),
        handoff: checked.published,
        publishing: await autonomousPublishingHandoffEngine.summary(),
        message:
          checked.published?.status === "published"
            ? `KAI verified the completed ${processing.platform} publication and saved its real ID.`
            : `${processing.platform} is still processing the accepted video; KAI preserved the job for another verified check.`,
      });
    }
    const handoff = await autonomousPublishingHandoffEngine.claimNext();
    if (!handoff) {
      return NextResponse.json({
        success: true,
        executed: false,
        publishing: await autonomousPublishingHandoffEngine.summary(),
        message: "No approved publishing handoff is due right now.",
      });
    }
    handoffId = handoff.id;
    if (handoff.status !== "publishing") {
      return NextResponse.json({
        success: true,
        executed: false,
        handoff,
        publishing: await autonomousPublishingHandoffEngine.summary(),
        message: handoff.error ?? "The publishing handoff is blocked.",
      });
    }

    if (handoff.platform === "tiktok") {
      const executed = await runTikTok(request, handoff);
      return NextResponse.json({
        success: true,
        executed: Boolean(executed.published?.status === "published"),
        handoff: executed.published,
        publishing: await autonomousPublishingHandoffEngine.summary(),
        message:
          executed.published?.status === "published"
            ? "KAI verified the completed TikTok publication and saved its real ID."
            : "TikTok accepted the real upload and is processing it.",
      });
    }

    if (handoff.platform === "instagram") {
      const executed = await runInstagram(request, handoff);
      return NextResponse.json({
        success: true,
        executed: Boolean(executed.published?.status === "published"),
        handoff: executed.published,
        publishing: await autonomousPublishingHandoffEngine.summary(),
        message:
          executed.published?.status === "published"
            ? "KAI verified the completed Instagram Reel and saved its real ID and permalink."
            : "Meta accepted the real Reel upload and is processing it.",
      });
    }

    if (handoff.platform === "facebook") {
      const executed = await runFacebook(request, handoff);
      return NextResponse.json({
        success: true,
        executed: Boolean(executed.published?.status === "published"),
        handoff: executed.published,
        publishing: await autonomousPublishingHandoffEngine.summary(),
        message:
          executed.published?.status === "published"
            ? "KAI verified the completed Facebook Reel and saved its real ID and permalink."
            : "Meta accepted the real Facebook Reel and is processing it.",
      });
    }

    const response = await executePublishing(
      new NextRequest(new URL("/api/publishing/execute", request.url), {
        method: "POST",
        headers: request.headers,
        body: JSON.stringify({
          publishingItemId: handoff.publishingItemId,
          platform: handoff.platform,
        }),
      }),
    );
    const result = (await response.json()) as {
      success?: boolean;
      executed?: boolean;
      message?: string;
      assessment?: { status?: string };
      video?: { id?: string; url?: string };
    };

    if (!response.ok || !result.success) {
      const failed = await autonomousPublishingHandoffEngine.failed(
        handoff.id,
        clean(result.message) || "The platform publishing request failed.",
      );
      return NextResponse.json(
        {
          success: response.ok,
          executed: false,
          handoff: failed,
          publishing: await autonomousPublishingHandoffEngine.summary(),
          message: result.message,
        },
        { status: response.ok ? 200 : response.status },
      );
    }

    if (!result.executed) {
      const blocked = await autonomousPublishingHandoffEngine.block(
        handoff.id,
        clean(result.message) || "The real platform publisher is not ready.",
      );
      return NextResponse.json({
        success: true,
        executed: false,
        handoff: blocked,
        publishing: await autonomousPublishingHandoffEngine.summary(),
        message: result.message,
      });
    }

    const published = await autonomousPublishingHandoffEngine.succeeded(
      handoff.id,
      {
        externalId: clean(result.video?.id),
        url: clean(result.video?.url),
        publishedAt: new Date().toISOString(),
      },
    );
    return NextResponse.json({
      success: true,
      executed: true,
      handoff: published,
      publishing: await autonomousPublishingHandoffEngine.summary(),
      message: result.message,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "KAI could not execute the publishing handoff.";
    const failed = handoffId
      ? await autonomousPublishingHandoffEngine.failed(handoffId, message)
      : null;
    console.error("Publishing handoff execution failed:", error);
    return NextResponse.json(
      { success: false, executed: false, handoff: failed, message },
      { status: 500 },
    );
  }
}
