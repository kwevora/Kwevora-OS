import { randomUUID } from "node:crypto";
import { verifiedBusinessLaunchRepository } from "./database/VerifiedBusinessLaunchRepository";
import {
  platformPublishingControlCenter,
  type ControlledPlatform,
  type PlatformConnectionInput,
} from "./PlatformPublishingControlCenter";
import { contentPerformanceSnapshotRepository } from "./database/ContentPerformanceSnapshotRepository";

export type VerifiedBusinessLaunch = {
  id: string;
  productKey: string;
  status:
    | "setup_required"
    | "awaiting_approval"
    | "authorized"
    | "active"
    | "paused"
    | "completed"
    | "stopped";
  product: {
    name: string;
    brand: string;
    seller: string;
    productUrl: string;
    licenseType: string;
    licenseUrl: string;
    resaleVerified: boolean;
    resaleToEndCustomers: boolean;
    sourceVerified: boolean;
    pricingVerified: boolean;
    demandVerified: boolean;
    qualityVerified: boolean;
    confidence: number;
    verifiedFacts: string[];
    restrictions: string[];
    warnings: string[];
  };
  offer: {
    title: string;
    price: string;
    destinationLink: string;
    callToAction: string;
    checkoutConfirmed: boolean;
    deliveryConfirmed: boolean;
  };
  campaign: {
    objective: string;
    contentCount: number;
    testPeriod: string;
    successSignal: string;
    stopSignal: string;
    revenueGoal: number;
    platforms: ControlledPlatform[];
    growthPlanId?: string | null;
  };
  approval: { approvedAt: string | null; approvedBy: "owner" | null };
  auditTrail: Array<{
    at: string;
    actor: "kai" | "owner";
    event: string;
    detail: string;
  }>;
  createdAt: string;
  updatedAt: string;
};
export type LaunchReadiness = {
  ready: boolean;
  gates: Array<{
    key: string;
    label: string;
    satisfied: boolean;
    reason: string;
  }>;
  missing: string[];
  readyPlatforms: ControlledPlatform[];
  selectedPlatformStates: Array<{
    platform: ControlledPlatform;
    state: string;
    nextAction: string;
  }>;
};
const clean = (v: unknown) => (typeof v === "string" ? v.trim() : "");
const key = (name: string, seller: string) =>
  `${name}|${seller}`.toLowerCase().replace(/[^a-z0-9|]+/g, "-");
export class VerifiedBusinessLaunchEngine {
  async ingestVerification(
    report: any,
    sources: Array<{ title: string; url: string }> = [],
  ) {
    const candidates = Array.isArray(report?.candidates)
      ? report.candidates
      : [];
    const candidate = candidates
      .filter(
        (x: any) =>
          x?.readyForTesting === true &&
          x?.verificationStatus === "verified" &&
          x?.license?.verified === true &&
          x?.license?.resaleToEndCustomers === true,
      )
      .sort(
        (a: any, b: any) =>
          Number(b?.monetizationConfidence ?? 0) -
          Number(a?.monetizationConfidence ?? 0),
      )[0];
    if (!candidate) return null;
    const name = clean(candidate.productName),
      seller = clean(candidate.source?.seller) || clean(candidate.brand),
      productKey = key(name, seller),
      existing =
        await verifiedBusinessLaunchRepository.byProductKey(productKey);
    if (existing) return existing;
    const now = new Date().toISOString();
    return verifiedBusinessLaunchRepository.save({
      id: randomUUID(),
      productKey,
      status: "setup_required",
      product: {
        name,
        brand: clean(candidate.brand),
        seller,
        productUrl: clean(candidate.source?.productUrl),
        licenseType: clean(candidate.license?.licenseType),
        licenseUrl: clean(candidate.license?.licenseUrl),
        resaleVerified: true,
        resaleToEndCustomers: true,
        sourceVerified: candidate.source?.verified === true,
        pricingVerified:
          candidate.pricing?.verified === true &&
          candidate.resale?.verified === true,
        demandVerified: candidate.demand?.verified === true,
        qualityVerified: candidate.quality?.verified === true,
        confidence: Math.max(
          0,
          Math.min(100, Number(candidate.monetizationConfidence ?? 0)),
        ),
        verifiedFacts: Array.isArray(candidate.verifiedFacts)
          ? candidate.verifiedFacts
          : [],
        restrictions: [
          ...(Array.isArray(candidate.restrictions)
            ? candidate.restrictions
            : []),
          ...(Array.isArray(candidate.requirements?.advertisingRestrictions)
            ? candidate.requirements.advertisingRestrictions
            : []),
        ],
        warnings: Array.isArray(candidate.warnings) ? candidate.warnings : [],
      },
      offer: {
        title: name,
        price:
          clean(candidate.resale?.suggestedPrice) ||
          clean(candidate.resale?.permittedPrice),
        destinationLink: "",
        callToAction: `Get ${name}`,
        checkoutConfirmed: false,
        deliveryConfirmed: false,
      },
      campaign: {
        objective: `Produce the first verified sale for ${name}.`,
        contentCount: 6,
        testPeriod: "7 days",
        successSignal: "At least one verified sale with traceable revenue.",
        stopSignal:
          "Stop after six measured posts if verified clicks, leads, and sales remain at zero.",
        revenueGoal: 0,
        platforms: [],
      },
      approval: { approvedAt: null, approvedBy: null },
      auditTrail: [
        {
          at: now,
          actor: "kai",
          event: "product_verified",
          detail: `${name} passed the exact-product resale-rights gate using ${sources.length} cited verification source(s).`,
        },
      ],
      createdAt: now,
      updatedAt: now,
    });
  }
  async configure(input: {
    destinationLink?: unknown;
    checkoutConfirmed?: unknown;
    deliveryConfirmed?: unknown;
    platforms?: unknown;
    contentCount?: unknown;
    testPeriod?: unknown;
    successSignal?: unknown;
    stopSignal?: unknown;
    revenueGoal?: unknown;
    callToAction?: unknown;
  }) {
    const launch = await verifiedBusinessLaunchRepository.latest();
    if (!launch)
      throw new Error("No verified product is ready for launch setup.");
    const platforms = Array.isArray(input.platforms)
      ? input.platforms.filter((x): x is ControlledPlatform =>
          ["youtube", "tiktok", "instagram", "facebook"].includes(String(x)),
        )
      : launch.campaign.platforms;
    const now = new Date().toISOString();
    return verifiedBusinessLaunchRepository.save({
      ...launch,
      status: "setup_required",
      offer: {
        ...launch.offer,
        destinationLink:
          clean(input.destinationLink) || launch.offer.destinationLink,
        callToAction: clean(input.callToAction) || launch.offer.callToAction,
        checkoutConfirmed: input.checkoutConfirmed === true,
        deliveryConfirmed: input.deliveryConfirmed === true,
      },
      campaign: {
        ...launch.campaign,
        platforms: Array.from(new Set(platforms)),
        contentCount: Number.isFinite(Number(input.contentCount))
          ? Math.max(1, Math.min(30, Math.floor(Number(input.contentCount))))
          : launch.campaign.contentCount,
        testPeriod: clean(input.testPeriod) || launch.campaign.testPeriod,
        successSignal:
          clean(input.successSignal) || launch.campaign.successSignal,
        stopSignal: clean(input.stopSignal) || launch.campaign.stopSignal,
        revenueGoal: Number.isFinite(Number(input.revenueGoal))
          ? Math.max(0, Number(input.revenueGoal))
          : launch.campaign.revenueGoal,
      },
      approval: { approvedAt: null, approvedBy: null },
      auditTrail: [
        ...launch.auditTrail,
        {
          at: now,
          actor: "owner",
          event: "launch_configured",
          detail:
            "The offer destination, delivery, checkout, platforms, and first test were configured.",
        },
      ],
    });
  }
  readiness(
    launch: VerifiedBusinessLaunch,
    connections: Partial<
      Record<ControlledPlatform, PlatformConnectionInput>
    > = {},
  ): LaunchReadiness {
    const report = platformPublishingControlCenter.report(connections),
      selected = launch.campaign.platforms.map(
        (p) => report.platforms.find((x) => x.platform === p)!,
      );
    const validUrl = /^https:\/\/[^\s]+$/i.test(launch.offer.destinationLink);
    const gates = [
      {
        key: "resale",
        label: "Exact resale rights verified",
        satisfied:
          launch.product.resaleVerified && launch.product.resaleToEndCustomers,
        reason: "The exact license must permit resale to end customers.",
      },
      {
        key: "source",
        label: "Seller and product source verified",
        satisfied:
          launch.product.sourceVerified && Boolean(launch.product.productUrl),
        reason: "The exact seller and product page must be verified.",
      },
      {
        key: "economics",
        label: "Pricing and economics verified",
        satisfied:
          launch.product.pricingVerified && Boolean(launch.offer.price),
        reason: "Permitted pricing must be supported by evidence.",
      },
      {
        key: "quality",
        label: "Demand and quality verified",
        satisfied:
          launch.product.demandVerified && launch.product.qualityVerified,
        reason: "Demand and product quality must pass verification.",
      },
      {
        key: "destination",
        label: "Secure storefront destination",
        satisfied: validUrl,
        reason: "Add the live HTTPS Stan Store or checkout destination.",
      },
      {
        key: "checkout",
        label: "Checkout tested",
        satisfied: launch.offer.checkoutConfirmed,
        reason: "Confirm that a customer can complete payment.",
      },
      {
        key: "delivery",
        label: "Product delivery tested",
        satisfied: launch.offer.deliveryConfirmed,
        reason: "Confirm that a customer receives the purchased product.",
      },
      {
        key: "platform",
        label: "Selected publishing platform ready",
        satisfied:
          selected.length > 0 && selected.some((x) => x?.state === "ready"),
        reason:
          "Select at least one officially connected platform that is ready to publish.",
      },
    ];
    return {
      ready: gates.every((x) => x.satisfied),
      gates,
      missing: gates.filter((x) => !x.satisfied).map((x) => x.label),
      readyPlatforms: selected
        .filter((x) => x?.state === "ready")
        .map((x) => x.platform),
      selectedPlatformStates: selected.filter(Boolean).map((x) => ({
        platform: x.platform,
        state: x.state,
        nextAction: x.nextAction,
      })),
    };
  }
  async summary(
    connections: Partial<
      Record<ControlledPlatform, PlatformConnectionInput>
    > = {},
  ) {
    let launch = await verifiedBusinessLaunchRepository.latest();
    if (!launch)
      return {
        launch: null,
        readiness: null,
        results: null,
        nextAction:
          "Run Money Mode until an exact product passes the resale-rights verification gate.",
      };
    const readiness = this.readiness(launch, connections);
    const latest = new Map<
      string,
      Awaited<
        ReturnType<typeof contentPerformanceSnapshotRepository.history>
      >[number]
    >();
    for (const row of await contentPerformanceSnapshotRepository.history(
      5000,
    )) {
      if (row.content.businessLaunchId !== launch.id) continue;
      const k = `${row.executionPlanId}:${row.platform}:${row.externalId}`;
      if (!latest.has(k)) latest.set(k, row);
    }
    const rows = [...latest.values()],
      sales = rows.reduce((n, x) => n + (x.metrics.sales ?? 0), 0),
      revenue =
        Math.round(
          rows.reduce((n, x) => n + (x.metrics.revenue ?? 0), 0) * 100,
        ) / 100;
    let status = launch.approval.approvedAt
      ? launch.status
      : readiness.ready
        ? "awaiting_approval"
        : "setup_required";
    if ((sales > 0 || revenue > 0) && launch.approval.approvedAt)
      status = "completed";
    if (status !== launch.status) {
      launch = await verifiedBusinessLaunchRepository.save({
        ...launch,
        status,
        auditTrail:
          status === "completed"
            ? [
                ...launch.auditTrail,
                {
                  at: new Date().toISOString(),
                  actor: "kai",
                  event: "first_sale_verified",
                  detail: `The launch produced ${sales} verified sale(s) and $${revenue.toFixed(2)} verified revenue.`,
                },
              ]
            : launch.auditTrail,
      });
    }
    return {
      launch,
      readiness,
      results: {
        measuredPublications: rows.length,
        verifiedSales: sales,
        verifiedRevenue: revenue,
        revenueGoal: launch.campaign.revenueGoal,
        goalReached:
          launch.campaign.revenueGoal > 0 &&
          revenue >= launch.campaign.revenueGoal,
      },
      nextAction:
        readiness.ready && !launch.approval.approvedAt
          ? "Approve the verified offer and first controlled revenue campaign."
          : (readiness.missing[0] ??
            (launch.status === "authorized"
              ? "KAI can use this offer in the next approved weekly plan."
              : launch.status === "completed"
                ? "The first verified sale is complete; KAI will carry the results into weekly learning."
                : "The verified launch is ready.")),
    };
  }
  async approve(
    connections: Partial<
      Record<ControlledPlatform, PlatformConnectionInput>
    > = {},
  ) {
    const launch = await verifiedBusinessLaunchRepository.latest();
    if (!launch) throw new Error("No verified launch exists.");
    const readiness = this.readiness(launch, connections);
    if (!readiness.ready)
      throw new Error(`Launch blocked: ${readiness.missing.join(", ")}.`);
    const now = new Date().toISOString();
    return verifiedBusinessLaunchRepository.save({
      ...launch,
      status: "authorized",
      approval: { approvedAt: now, approvedBy: "owner" },
      auditTrail: [
        ...launch.auditTrail,
        {
          at: now,
          actor: "owner",
          event: "launch_authorized",
          detail:
            "The verified offer and bounded first-revenue campaign were authorized.",
        },
      ],
    });
  }
  async setPaused(paused: boolean) {
    const launch = await verifiedBusinessLaunchRepository.latest();
    if (!launch || !launch.approval.approvedAt)
      throw new Error("No authorized launch exists.");
    return verifiedBusinessLaunchRepository.save({
      ...launch,
      status: paused ? "paused" : "authorized",
      auditTrail: [
        ...launch.auditTrail,
        {
          at: new Date().toISOString(),
          actor: "owner",
          event: paused ? "launch_paused" : "launch_resumed",
          detail: paused
            ? "The launch was paused without losing its evidence."
            : "The authorized launch was resumed.",
        },
      ],
    });
  }
  async markActive(growthPlanId: string) {
    const x = await verifiedBusinessLaunchRepository.latest();
    if (!x || !["authorized", "active"].includes(x.status)) return null;
    if (x.status === "active" && x.campaign.growthPlanId === growthPlanId)
      return x;
    return verifiedBusinessLaunchRepository.save({
      ...x,
      status: "active",
      campaign: { ...x.campaign, growthPlanId },
      auditTrail: [
        ...x.auditTrail,
        {
          at: new Date().toISOString(),
          actor: "kai",
          event: "campaign_activated",
          detail: `The verified offer entered weekly growth plan ${growthPlanId}.`,
        },
      ],
    });
  }
  async activeDirective() {
    const x = await verifiedBusinessLaunchRepository.latest();
    if (!x || !["authorized", "active"].includes(x.status)) return null;
    return {
      launchId: x.id,
      product: x.product.name,
      offer: x.offer.title,
      platform: x.campaign.platforms[0],
      destinationLink: x.offer.destinationLink,
      callToAction: x.offer.callToAction,
      contentCount: x.campaign.contentCount,
      revenueGoal: x.campaign.revenueGoal,
    };
  }
}
export const verifiedBusinessLaunchEngine = new VerifiedBusinessLaunchEngine();
