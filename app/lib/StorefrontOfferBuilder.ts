import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import path from "node:path";
import { storefrontOfferPackageRepository } from "./database/StorefrontOfferPackageRepository";
import { verifiedBusinessLaunchRepository } from "./database/VerifiedBusinessLaunchRepository";
import { verifiedBusinessLaunchEngine } from "./VerifiedBusinessLaunchEngine";
export type StorefrontOfferPackage = {
  id: string;
  launchId: string;
  status: "needs_delivery" | "needs_review" | "approved" | "store_ready";
  licenseSafety: {
    licenseType: string;
    licenseUrl: string;
    restrictions: string[];
    rulesAcknowledged: boolean;
    legalAssetsConfirmed: boolean;
    prohibitedClaims: string[];
  };
  qualityAudit: {
    openedAndInspected: boolean;
    complete: boolean;
    current: boolean;
    professional: boolean;
    notes: string;
  };
  delivery: {
    fileName: string;
    storedPath: string;
    sizeBytes: number;
    ready: boolean;
    customerInstructions: string;
    supportInstructions: string;
  };
  offer: {
    title: string;
    headline: string;
    description: string;
    benefits: string[];
    price: string;
    callToAction: string;
    coverDirection: string;
    checkoutCopy: string;
  };
  setupChecklist: Array<{ key: string; label: string; completed: boolean }>;
  storefront: {
    destinationLink: string;
    checkoutTested: boolean;
    deliveryTested: boolean;
    publishedAt: string | null;
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
const clean = (x: unknown) => (typeof x === "string" ? x.trim() : "");
export class StorefrontOfferBuilder {
  async prepare() {
    const launch = await verifiedBusinessLaunchRepository.latest();
    if (!launch) return null;
    const existing = await storefrontOfferPackageRepository.forLaunch(
      launch.id,
    );
    if (existing) return existing;
    const now = new Date().toISOString(),
      facts = launch.product.verifiedFacts.slice(0, 4);
    return storefrontOfferPackageRepository.save({
      id: randomUUID(),
      launchId: launch.id,
      status: "needs_delivery",
      licenseSafety: {
        licenseType: launch.product.licenseType,
        licenseUrl: launch.product.licenseUrl,
        restrictions: launch.product.restrictions,
        rulesAcknowledged: false,
        legalAssetsConfirmed: false,
        prohibitedClaims: [
          "No false income or guaranteed-results claims.",
          "Do not use seller footage, graphics, testimonials, or copyrighted assets unless the exact license permits it.",
          "Do not grant customers rights the verified license does not permit.",
        ],
      },
      qualityAudit: {
        openedAndInspected: false,
        complete: false,
        current: false,
        professional: false,
        notes: "",
      },
      delivery: {
        fileName: "",
        storedPath: "",
        sizeBytes: 0,
        ready: false,
        customerInstructions: `Download ${launch.product.name} immediately after checkout and save a backup copy.`,
        supportInstructions:
          "Contact KWEVORA through the support method shown on the checkout page for delivery problems.",
      },
      offer: {
        title: launch.offer.title,
        headline: `A practical digital resource for customers ready to take the next useful step.`,
        description:
          `${launch.product.name} is a verified digital product offered under the documented ${launch.product.licenseType || "resale"} license. ${facts.join(" ")}`.trim(),
        benefits: facts.length
          ? facts
          : [
              "Digital delivery after purchase.",
              "A focused resource designed for practical use.",
            ],
        price: launch.offer.price,
        callToAction: launch.offer.callToAction,
        coverDirection: `Create an original KWEVORA cover for ${launch.product.name}; do not reuse seller artwork unless the license explicitly permits it.`,
        checkoutCopy: `You are purchasing digital access to ${launch.product.name}. Review the product description and delivery terms before checkout.`,
      },
      setupChecklist: [
        {
          key: "copy",
          label:
            "Paste the approved title, description, benefits, price, and CTA into Stan Store.",
          completed: false,
        },
        {
          key: "cover",
          label: "Upload an original or explicitly licensed product cover.",
          completed: false,
        },
        {
          key: "delivery",
          label: "Attach the approved customer delivery file.",
          completed: false,
        },
        {
          key: "support",
          label: "Add customer delivery and support instructions.",
          completed: false,
        },
        {
          key: "checkout",
          label: "Complete a test checkout from the live product page.",
          completed: false,
        },
      ],
      storefront: {
        destinationLink: "",
        checkoutTested: false,
        deliveryTested: false,
        publishedAt: null,
      },
      approval: { approvedAt: null, approvedBy: null },
      auditTrail: [
        {
          at: now,
          actor: "kai",
          event: "storefront_package_prepared",
          detail:
            "KAI prepared license-safe offer copy, delivery guidance, and the Stan Store setup checklist.",
        },
      ],
      createdAt: now,
      updatedAt: now,
    });
  }
  async update(input: Record<string, unknown>) {
    const x = await this.prepare();
    if (!x) throw new Error("A verified business launch is required first.");
    const quality =
      input.qualityAudit && typeof input.qualityAudit === "object"
        ? (input.qualityAudit as Record<string, unknown>)
        : {};
    const offer =
      input.offer && typeof input.offer === "object"
        ? (input.offer as Record<string, unknown>)
        : {};
    const checklist = Array.isArray(input.completedChecklist)
      ? new Set(input.completedChecklist.map(String))
      : new Set(x.setupChecklist.filter((i) => i.completed).map((i) => i.key));
    const updated = {
      ...x,
      status: "needs_review" as const,
      licenseSafety: {
        ...x.licenseSafety,
        rulesAcknowledged: input.rulesAcknowledged === true,
        legalAssetsConfirmed: input.legalAssetsConfirmed === true,
      },
      qualityAudit: {
        openedAndInspected: quality.openedAndInspected === true,
        complete: quality.complete === true,
        current: quality.current === true,
        professional: quality.professional === true,
        notes: clean(quality.notes),
      },
      offer: {
        ...x.offer,
        title: clean(offer.title) || x.offer.title,
        headline: clean(offer.headline) || x.offer.headline,
        description: clean(offer.description) || x.offer.description,
        price: clean(offer.price) || x.offer.price,
        callToAction: clean(offer.callToAction) || x.offer.callToAction,
        coverDirection: clean(offer.coverDirection) || x.offer.coverDirection,
        checkoutCopy: clean(offer.checkoutCopy) || x.offer.checkoutCopy,
      },
      setupChecklist: x.setupChecklist.map((i) => ({
        ...i,
        completed: checklist.has(i.key),
      })),
      approval: { approvedAt: null, approvedBy: null },
      auditTrail: [
        ...x.auditTrail,
        {
          at: new Date().toISOString(),
          actor: "owner" as const,
          event: "storefront_review_updated",
          detail:
            "The product audit, license confirmations, offer copy, and setup progress were updated.",
        },
      ],
    };
    return storefrontOfferPackageRepository.save(updated);
  }
  async attachDelivery(input: {
    fileName: string;
    storedPath: string;
    sizeBytes: number;
  }) {
    const x = await this.prepare();
    if (!x) throw new Error("A verified business launch is required first.");
    const full = path.join(process.cwd(), input.storedPath.replace(/^\/+/, ""));
    if (!existsSync(full))
      throw new Error("The delivery file could not be verified.");
    return storefrontOfferPackageRepository.save({
      ...x,
      status: "needs_review",
      delivery: {
        ...x.delivery,
        fileName: input.fileName,
        storedPath: input.storedPath,
        sizeBytes: input.sizeBytes,
        ready: true,
      },
      auditTrail: [
        ...x.auditTrail,
        {
          at: new Date().toISOString(),
          actor: "owner",
          event: "delivery_file_attached",
          detail: `${input.fileName} was attached as the customer delivery package.`,
        },
      ],
    });
  }
  readiness(x: StorefrontOfferPackage | null) {
    if (!x) return { ready: false, missing: ["Verified business launch"] };
    const q = x.qualityAudit;
    const missing = [
      ...(!x.delivery.ready ? ["Customer delivery file"] : []),
      ...(!x.licenseSafety.rulesAcknowledged
        ? ["License rules acknowledged"]
        : []),
      ...(!x.licenseSafety.legalAssetsConfirmed
        ? ["Legal asset use confirmed"]
        : []),
      ...(!(q.openedAndInspected && q.complete && q.current && q.professional)
        ? ["Product quality audit"]
        : []),
      ...(!x.offer.title ||
      !x.offer.description ||
      !x.offer.price ||
      !x.offer.callToAction
        ? ["Complete offer copy and supported price"]
        : []),
    ];
    return { ready: missing.length === 0, missing };
  }
  async approve() {
    const x = await this.prepare();
    if (!x) throw new Error("No storefront package exists.");
    const ready = this.readiness(x);
    if (!ready.ready)
      throw new Error(
        `Storefront approval blocked: ${ready.missing.join(", ")}.`,
      );
    const now = new Date().toISOString();
    return storefrontOfferPackageRepository.save({
      ...x,
      status: "approved",
      approval: { approvedAt: now, approvedBy: "owner" },
      auditTrail: [
        ...x.auditTrail,
        {
          at: now,
          actor: "owner",
          event: "storefront_offer_approved",
          detail:
            "The license-safe offer and customer delivery package were approved for storefront setup.",
        },
      ],
    });
  }
  async publish(input: {
    destinationLink: unknown;
    checkoutTested: unknown;
    deliveryTested: unknown;
  }) {
    const x = await this.prepare();
    if (!x || !x.approval.approvedAt)
      throw new Error("Approve the storefront package before marking it live.");
    const destinationLink = clean(input.destinationLink);
    if (
      !/^https:\/\/[^\s]+$/i.test(destinationLink) ||
      input.checkoutTested !== true ||
      input.deliveryTested !== true
    )
      throw new Error(
        "A live HTTPS product page plus successful checkout and delivery tests are required.",
      );
    const now = new Date().toISOString(),
      saved = await storefrontOfferPackageRepository.save({
        ...x,
        status: "store_ready",
        storefront: {
          destinationLink,
          checkoutTested: true,
          deliveryTested: true,
          publishedAt: now,
        },
        setupChecklist: x.setupChecklist.map((i) => ({
          ...i,
          completed: true,
        })),
        auditTrail: [
          ...x.auditTrail,
          {
            at: now,
            actor: "owner",
            event: "storefront_verified_live",
            detail:
              "The live product page, checkout, and customer delivery were verified.",
          },
        ],
      });
    const launch = await verifiedBusinessLaunchRepository.latest();
    if (launch)
      await verifiedBusinessLaunchEngine.configure({
        destinationLink,
        checkoutConfirmed: true,
        deliveryConfirmed: true,
        platforms: launch.campaign.platforms,
        contentCount: launch.campaign.contentCount,
        testPeriod: launch.campaign.testPeriod,
        successSignal: launch.campaign.successSignal,
        stopSignal: launch.campaign.stopSignal,
        revenueGoal: launch.campaign.revenueGoal,
        callToAction: saved.offer.callToAction,
      });
    return saved;
  }
  async summary() {
    const pack = await this.prepare();
    return {
      package: pack,
      readiness: this.readiness(pack),
      nextAction: !pack
        ? "Verify a product in Money Mode first."
        : !pack.delivery.ready
          ? "Upload the customer delivery file."
          : !pack.approval.approvedAt
            ? "Complete the product audit and approve the storefront offer."
            : pack.status !== "store_ready"
              ? "Build the Stan Store page, then verify its checkout and delivery."
              : "The storefront is verified and connected to the business launch gate.",
    };
  }
}
export const storefrontOfferBuilder = new StorefrontOfferBuilder();
