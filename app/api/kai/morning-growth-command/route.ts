import { NextRequest, NextResponse } from "next/server";
import { autonomousGrowthPlanRepository } from "../../../lib/database/AutonomousGrowthPlanRepository";
import { growthPlanExecutionEngine } from "../../../lib/GrowthPlanExecutionEngine";
import { revenueOptimizationEngine } from "../../../lib/RevenueOptimizationEngine";
import { weeklyRecoveryBrain } from "../../../lib/WeeklyRecoveryBrain";
import { growthPlanAuthorizationEngine } from "../../../lib/GrowthPlanAuthorizationEngine";
import { autonomousVideoQueueEngine } from "../../../lib/AutonomousVideoQueueEngine";
import { autonomousPublishingHandoffEngine } from "../../../lib/AutonomousPublishingHandoffEngine";
import { contentPerformanceLearningEngine } from "../../../lib/ContentPerformanceLearningEngine";
import { videoExperimentPlanner } from "../../../lib/VideoExperimentPlanner";
import { creativeWinnerSystem } from "../../../lib/CreativeWinnerSystem";
import { creativeRefreshEngine } from "../../../lib/CreativeRefreshEngine";
import { creativePortfolioManager } from "../../../lib/CreativePortfolioManager";
import { crossPlatformExpansionEngine } from "../../../lib/CrossPlatformExpansionEngine";
import { campaignSequencingEngine } from "../../../lib/CampaignSequencingEngine";
import { campaignFunnelRecoveryEngine } from "../../../lib/CampaignFunnelRecoveryEngine";
import { revenueScalingGovernor } from "../../../lib/RevenueScalingGovernor";
import { growthOperatingLoop } from "../../../lib/GrowthOperatingLoop";
import { weeklyLearningLoop } from "../../../lib/WeeklyLearningLoop";
import { verifiedBusinessLaunchEngine } from "../../../lib/VerifiedBusinessLaunchEngine";
import { revenueAttributionBrain } from "../../../lib/RevenueAttributionBrain";
import type {
  ControlledPlatform,
  PlatformConnectionInput,
} from "../../../lib/PlatformPublishingControlCenter";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function cookie(request: NextRequest, name: string) {
  return request.cookies.get(name)?.value?.trim() ?? "";
}
function connections(
  request: NextRequest,
): Partial<Record<ControlledPlatform, PlatformConnectionInput>> {
  return {
    youtube: {
      accessToken: cookie(request, "kwevora_youtube_access_token"),
      refreshToken: cookie(request, "kwevora_youtube_refresh_token"),
      accountId: cookie(request, "kwevora_youtube_channel_id"),
    },
    tiktok: {
      accessToken: cookie(request, "kwevora_tiktok_access_token"),
      refreshToken: cookie(request, "kwevora_tiktok_refresh_token"),
      accountId: cookie(request, "kwevora_tiktok_open_id"),
      scopes: cookie(request, "kwevora_tiktok_scopes"),
    },
    instagram: {
      accessToken: cookie(request, "kwevora_meta_access_token"),
      accountId: cookie(request, "kwevora_instagram_business_id"),
      scopes: cookie(request, "kwevora_meta_scopes"),
    },
    facebook: {
      accessToken: cookie(request, "kwevora_meta_access_token"),
      accountId: cookie(request, "kwevora_facebook_page_id"),
      scopes: cookie(request, "kwevora_meta_scopes"),
    },
  };
}
async function command(request: NextRequest) {
  const stored = await autonomousGrowthPlanRepository.latest();
  if (!stored) return null;
  const progress = await growthPlanExecutionEngine.progress(stored);
  const recovery = await weeklyRecoveryBrain.recover({
    plan: progress.plan,
    progress,
    optimization: revenueOptimizationEngine.optimize(
      await revenueAttributionBrain.report(),
    ),
  });
  const acknowledged = new Set(stored.acknowledgedRecoveryActionIds ?? []);
  const ownerApprovals = (stored.recoveryHistory ?? []).filter(
    (item) => item.ownerApprovalRequired && !acknowledged.has(item.id),
  );
  const pace =
    progress.earnedRevenue > progress.expectedRevenueByNow
      ? "ahead"
      : progress.onPace
        ? "on_pace"
        : "behind";
  const recommendation =
    ownerApprovals.length > 0
      ? ownerApprovals[0].action
      : !stored.ownerApprovedAt
        ? "Approve the weekly growth plan so KAI can keep the production schedule moving."
        : !progress.onPace
          ? recovery.briefing
          : progress.nextSlot
            ? `Keep the plan moving with slot ${progress.nextSlot.position}: ${progress.nextSlot.product} on ${progress.nextSlot.platform}.`
            : "The active weekly plan is complete. KAI will use the measured results in the next plan.";
  const highRiskSlots = stored.ownerApprovedAt
    ? stored.slots.filter(
        (slot) =>
          slot.bucket === "challenger" &&
          ["offer", "platform", "format"].includes(
            slot.changedVariable ?? "",
          ) &&
          !(stored.approvedHighRiskSlotIds ?? []).includes(slot.id),
      )
    : [];
  const videoAuthorized =
    Boolean(stored.ownerApprovedAt) &&
    (stored.autonomyStatus ?? "awaiting_approval") === "authorized";
  const creativeWinners = await creativeWinnerSystem.summary();
  const creativeRefresh = await creativeRefreshEngine.summary(stored);
  const crossPlatformExpansion =
    await crossPlatformExpansionEngine.summary(stored);
  const videoExperiments = await videoExperimentPlanner.summary(stored);
  const creativePortfolio = await creativePortfolioManager.summary(stored);
  const campaignSequence = await campaignSequencingEngine.summary(stored);
  const campaignRecovery = await campaignFunnelRecoveryEngine.summary(stored);
  const revenueScaling = await revenueScalingGovernor.summary(stored);
  const operatingLoop = await growthOperatingLoop.summary(stored);
  const weeklyLearning = await weeklyLearningLoop.summary(stored);
  const businessLaunch = await verifiedBusinessLaunchEngine.summary(
    connections(request),
  );
  return {
    plan: stored,
    progress,
    pace,
    recovery,
    pendingApprovals: {
      weeklyPlan: !stored.ownerApprovedAt,
      recoveryActions: ownerApprovals,
      highRiskSlots,
      total:
        (!stored.ownerApprovedAt ? 1 : 0) +
        ownerApprovals.length +
        highRiskSlots.length,
    },
    autonomy: {
      status:
        stored.autonomyStatus ??
        (stored.ownerApprovedAt ? "authorized" : "awaiting_approval"),
      videoAuthorized,
      schedulingAuthorized: videoAuthorized,
      publishingAuthorized: videoAuthorized,
      revisionCount: stored.revisionCount ?? 0,
    },
    todayAssignment: progress.nextSlot,
    recommendation,
    handoff: "I'll take it from here. One step closer.",
    videoProduction: await autonomousVideoQueueEngine.summary(),
    publishingHandoff: await autonomousPublishingHandoffEngine.summary(),
    performanceLearning: await contentPerformanceLearningEngine.summary(),
    videoExperiments,
    creativeWinners,
    creativeRefresh,
    creativePortfolio,
    crossPlatformExpansion,
    campaignSequence,
    campaignRecovery,
    revenueScaling,
    operatingLoop,
    weeklyLearning,
    businessLaunch,
  };
}

export async function GET(request: NextRequest) {
  try {
    return NextResponse.json({
      success: true,
      command: await command(request),
    });
  } catch (error) {
    console.error("Morning Growth Command failed:", error);
    return NextResponse.json(
      {
        success: false,
        command: null,
        message: "KAI could not load the morning growth command.",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      action?: unknown;
      recoveryActionId?: unknown;
      slotId?: unknown;
      reason?: unknown;
    };
    const plan = await autonomousGrowthPlanRepository.latest();
    if (!plan)
      return NextResponse.json(
        { success: false, message: "No weekly growth plan is available." },
        { status: 404 },
      );
    if (body.action === "approve_plan") {
      const approved = await growthPlanAuthorizationEngine.approvePlan(plan);
      await videoExperimentPlanner.approvePlan(approved);
      await creativeRefreshEngine.approvePlan(approved);
      await crossPlatformExpansionEngine.approvePlan(approved);
      await revenueScalingGovernor.approve(approved);
      if (
        (await growthOperatingLoop.summary(approved)).approvalPackage
          .highRiskRecovery
      )
        await campaignFunnelRecoveryEngine.approve(approved);
      await growthOperatingLoop.authorize(approved);
      await autonomousVideoQueueEngine.releasePlan(approved.id);
    } else if (body.action === "pause_plan") {
      await growthPlanAuthorizationEngine.pause(plan);
      await growthOperatingLoop.setPaused(plan, true);
    } else if (body.action === "resume_plan") {
      await growthPlanAuthorizationEngine.resume(plan);
      await growthOperatingLoop.setPaused(plan, false);
    } else if (body.action === "request_revision") {
      const revised = await growthPlanAuthorizationEngine.reviseOnce(
        plan,
        typeof body.reason === "string" && body.reason.trim()
          ? body.reason.trim()
          : "The owner requested a safer evidence-based revision.",
      );
      if (!revised)
        return NextResponse.json(
          {
            success: false,
            message:
              "KAI already used the one permitted revision for this plan.",
          },
          { status: 409 },
        );
    } else if (
      body.action === "approve_high_risk_slot" &&
      typeof body.slotId === "string"
    ) {
      const approved = await growthPlanAuthorizationEngine.approveHighRiskSlot(
        plan,
        body.slotId,
      );
      if (!approved)
        return NextResponse.json(
          {
            success: false,
            message: "That high-risk slot could not be approved.",
          },
          { status: 404 },
        );
    } else if (body.action === "approve_campaign_recovery") {
      const approved = await campaignFunnelRecoveryEngine.approve(plan);
      if (!approved)
        return NextResponse.json(
          {
            success: false,
            message: "No verified campaign recovery is ready.",
          },
          { status: 404 },
        );
    } else if (
      body.action === "acknowledge_recovery" &&
      typeof body.recoveryActionId === "string"
    ) {
      const valid = (plan.recoveryHistory ?? []).some(
        (item) =>
          item.id === body.recoveryActionId && item.ownerApprovalRequired,
      );
      if (!valid)
        return NextResponse.json(
          {
            success: false,
            message: "That recovery action could not be found.",
          },
          { status: 404 },
        );
      await autonomousGrowthPlanRepository.save({
        ...plan,
        acknowledgedRecoveryActionIds: Array.from(
          new Set([
            ...(plan.acknowledgedRecoveryActionIds ?? []),
            body.recoveryActionId,
          ]),
        ),
      });
    } else if (body.action === "approve_business_launch") {
      await verifiedBusinessLaunchEngine.approve(connections(request));
    } else if (body.action === "pause_business_launch") {
      await verifiedBusinessLaunchEngine.setPaused(true);
    } else if (body.action === "resume_business_launch") {
      await verifiedBusinessLaunchEngine.setPaused(false);
    } else {
      return NextResponse.json(
        {
          success: false,
          message: "A valid morning approval action is required.",
        },
        { status: 400 },
      );
    }
    return NextResponse.json({
      success: true,
      command: await command(request),
    });
  } catch (error) {
    console.error("Morning Growth Command approval failed:", error);
    return NextResponse.json(
      { success: false, message: "KAI could not save that approval." },
      { status: 500 },
    );
  }
}
