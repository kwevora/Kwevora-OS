"use client";

import { useState } from "react";

type VerifiedWinner = {
  productName?: string;
  brand?: string;
  verificationStatus?: string;

  source?: {
    verified?: boolean;
    seller?: string;
    productUrl?: string;
    sourceReputation?: string;
  };

  license?: {
    verified?: boolean;
    licenseType?: string;
    licenseUrl?: string;
    resaleToEndCustomers?: boolean;
    rebrandingAllowed?: boolean;
    modificationAllowed?: boolean;
    transferableResaleRights?: boolean;
    details?: string;
  };

  acquisition?: {
    verified?: boolean;
    cost?: string;
    recurringFees?: string;
  };

  resale?: {
    verified?: boolean;
    permittedPrice?: string;
    minimumPrice?: string;
    suggestedPrice?: string;
  };

  margin?: {
    verified?: boolean;
    details?: string;
    score?: number;
  };

  demand?: {
    verified?: boolean;
    score?: number;
    evidence?: string[];
    details?: string;
  };

  quality?: {
    verified?: boolean;
    score?: number;
    details?: string;
    freshnessConcerns?: string;
  };

  competition?: {
    verified?: boolean;
    score?: number;
    saturationRisk?: string;
    details?: string;
  };

  restrictions?: string[];

  requirements?: {
    verified?: boolean;
    marketplaceRestrictions?: string[];
    advertisingRestrictions?: string[];
    bundlingRestrictions?: string[];
    giveawayRestrictions?: string[];
    geographicRestrictions?: string;
  };

  pricing?: {
    verified?: boolean;
    details?: string;
  };

  facelessMarketing?: {
    suitable?: boolean;
    score?: number;
    reason?: string;
    legalAssetNotes?: string;
    contentAngles?: string[];
  };

  monetizationConfidence?: number;
  verifiedFacts?: string[];
  unresolvedFacts?: string[];
  warnings?: string[];
  readyForTesting?: boolean;
  nextAction?: string;
};

type ProductPlan = {
  source?: VerifiedWinner["source"];
  license?: VerifiedWinner["license"];
  acquisition?: VerifiedWinner["acquisition"];
  resale?: VerifiedWinner["resale"];
  margin?: VerifiedWinner["margin"];
  demand?: VerifiedWinner["demand"];
  quality?: VerifiedWinner["quality"];
  competition?: VerifiedWinner["competition"];
  facelessMarketing?: VerifiedWinner["facelessMarketing"];

  stanStorePlan?: {
    shouldUseStanStore?: boolean;
    productTitle?: string;
    productDescription?: string;
    suggestedPrice?: string;
    callToAction?: string;
    deliveryStrategy?: string;
    setupInstructions?: string[];
  } | null;

  marketingPlan?: {
    primaryAngle?: string;
    hookIdeas?: string[];
    contentIdeas?: string[];
    recommendedPlatforms?: string[];
    callToAction?: string;
  } | null;

  firstMoneyTest?: {
    objective?: string;
    contentCount?: number;
    testPeriod?: string;
    successSignal?: string;
    stopSignal?: string;
  } | null;
};

type MoneyModeResult = {
  success?: boolean;
  mode?: string;
  businessModel?: string;
  pipelineStatus?: string;
  verificationRounds?: number;
  researchSummary?: string;

  autonomousSearch?: {
    enabled?: boolean;
    maxAttemptsThisRun?: number;
    attemptsCompleted?: number;
    successfulAttempt?: number | null;
    shouldContinue?: boolean;
    nextCycle?: string;
    rejectedCandidates?: string[];
  };

  recommendation?: {
    bestOpportunity?: string;
    readyToAct?: boolean;
    firstAction?: string;
    reason?: string;
    verificationStatus?: string;
    monetizationConfidence?: number;
    unresolvedFacts?: string[];
  };

  verifiedWinner?: VerifiedWinner | null;
  productPlan?: ProductPlan | null;

  evidence?: {
    broadResearch?: {
      sourceCount?: number;
    };

    verification?: {
      totalRounds?: number;
      sourceCount?: number;
      summary?: string;
    };
  };

  message?: string;
};

export default function MoneyModePage() {
  const [running, setRunning] = useState(false);

  const [result, setResult] =
    useState<MoneyModeResult | null>(null);

  const [error, setError] = useState("");

  async function runMoneyHunt() {
    setRunning(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch(
        "/api/kai/opportunities/run",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            niche: "",
            audience: "",

            goal:
              "Find a strong existing digital product with current buyer demand that can legally be purchased or licensed and resold for profit.",

            notes:
              "Keep startup cost low. Demand comes first. Find existing quality digital products with explicit resale rights. Prefer products that can be marketed with original faceless short-form video. Do not use affiliate marketing as the primary model. Do not require creating a large original product from scratch. Only authorize a product when the exact resale license, source, pricing, demand, quality, restrictions, and marketing path are genuinely verified.",
          }),
        }
      );

      const data: MoneyModeResult =
        await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message ||
            "KAI could not complete today's digital product hunt."
        );
      }

      setResult(data);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "KAI could not complete today's digital product hunt."
      );
    } finally {
      setRunning(false);
    }
  }

  const winner = result?.verifiedWinner;

  const plan = result?.productPlan;

  const readyToAct =
    result?.recommendation?.readyToAct === true;

  return (
    <main className="min-h-screen bg-[#07040f] text-white">
      <section className="mx-auto max-w-7xl space-y-8 p-6 lg:p-10">
        <section className="overflow-hidden rounded-[32px] border border-purple-400/20 bg-gradient-to-br from-purple-950/60 via-[#110b20] to-black p-8 shadow-2xl shadow-purple-950/20 lg:p-10">
          <div className="max-w-4xl">
            <p className="text-sm font-black uppercase tracking-[0.35em] text-purple-300">
              KWEVORA MONEY MODE
            </p>

            <h1 className="mt-4 text-4xl font-black leading-tight md:text-5xl">
              Let KAI find today&apos;s
              resellable digital product.
            </h1>

            <p className="mt-5 max-w-3xl text-lg leading-8 text-gray-300">
              KAI researches what people
              currently want, finds an
              existing digital product that
              matches the demand, verifies
              the exact resale rights,
              checks the economics and
              quality, and keeps searching
              until something is strong
              enough to test.
            </p>

            <div className="mt-8 flex flex-wrap gap-3 text-sm">
              <StatusPill>
                Live demand research
              </StatusPill>

              <StatusPill>
                Resale-rights check
              </StatusPill>

              <StatusPill>
                Product quality
              </StatusPill>

              <StatusPill>
                Margin & pricing
              </StatusPill>

              <StatusPill>
                Hard license gate
              </StatusPill>
            </div>

            <button
              type="button"
              onClick={runMoneyHunt}
              disabled={running}
              className="mt-9 rounded-2xl bg-purple-600 px-7 py-4 text-lg font-black shadow-lg shadow-purple-950/40 transition hover:bg-purple-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {running
                ? "KAI is hunting..."
                : "Find Today's Digital Product"}
            </button>

            {running ? (
              <div className="mt-6 rounded-2xl border border-purple-400/20 bg-purple-500/10 p-5">
                <p className="font-bold text-purple-200">
                  KAI is searching the live
                  market.
                </p>

                <p className="mt-2 text-sm leading-6 text-gray-400">
                  KAI may research several
                  batches of products,
                  reject weak or unclear
                  licenses, chase missing
                  facts, and broaden the
                  search before it
                  authorizes anything.
                </p>
              </div>
            ) : null}

            {error ? (
              <div className="mt-6 rounded-2xl border border-red-400/20 bg-red-500/10 p-5 text-red-200">
                {error}
              </div>
            ) : null}
          </div>
        </section>

        {!result ? (
          <section className="grid gap-5 md:grid-cols-3">
            <InfoCard
              number="01"
              title="Find Demand"
              text="KAI searches what people are interested in buying now before choosing a product."
            />

            <InfoCard
              number="02"
              title="Verify Rights"
              text="KAI finds existing products and verifies the exact license, source, pricing rules, quality, and restrictions."
            />

            <InfoCard
              number="03"
              title="Sell"
              text="KWEVORA only authorizes a product after the resale-rights hard gate passes."
            />
          </section>
        ) : null}

        {result ? (
          <>
            <section
              className={`rounded-[32px] border p-8 lg:p-10 ${
                readyToAct
                  ? "border-green-400/30 bg-green-500/10"
                  : "border-yellow-400/30 bg-yellow-500/10"
              }`}
            >
              <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p
                    className={`text-sm font-black uppercase tracking-[0.3em] ${
                      readyToAct
                        ? "text-green-300"
                        : "text-yellow-300"
                    }`}
                  >
                    {readyToAct
                      ? "VERIFIED FOR RESALE"
                      : "KAI IS STILL LOOKING"}
                  </p>

                  <h2 className="mt-3 text-3xl font-black md:text-4xl">
                    {readyToAct
                      ? result.recommendation
                          ?.bestOpportunity ||
                        winner?.productName ||
                        "Verified digital product"
                      : "No product passed the license gate yet."}
                  </h2>

                  <p className="mt-4 max-w-3xl leading-7 text-gray-300">
                    {result.recommendation
                      ?.reason ||
                      (readyToAct
                        ? "KAI verified a resellable digital product."
                        : "KWEVORA is keeping the standards locked and will continue searching for a stronger product.")}
                  </p>
                </div>

                <div
                  className={`w-fit rounded-full border px-4 py-2 text-sm font-black ${
                    readyToAct
                      ? "border-green-400/30 bg-green-400/10 text-green-200"
                      : "border-yellow-400/30 bg-yellow-400/10 text-yellow-100"
                  }`}
                >
                  {readyToAct
                    ? "Ready to Test"
                    : "Search Continues"}
                </div>
              </div>

              <div className="mt-8 grid gap-4 md:grid-cols-4">
                <MetricCard
                  label="Verification"
                  value={
                    result.recommendation
                      ?.verificationStatus ||
                    "Unknown"
                  }
                />

                <MetricCard
                  label="Confidence"
                  value={`${normalizeScore(
                    result.recommendation
                      ?.monetizationConfidence
                  )}%`}
                />

                <MetricCard
                  label="Verification Rounds"
                  value={String(
                    result.verificationRounds ?? 0
                  )}
                />

                <MetricCard
                  label="Hunt Attempts"
                  value={String(
                    result.autonomousSearch
                      ?.attemptsCompleted ?? 0
                  )}
                />
              </div>
            </section>

            {winner ? (
              <>
                <section className="grid gap-6 xl:grid-cols-2">
                  <SectionCard
                    eyebrow="PRODUCT SOURCE"
                    title="Where KAI found it"
                  >
                    <Detail
                      label="Product"
                      value={
                        winner.productName ||
                        "Unknown"
                      }
                    />

                    <Detail
                      label="Seller"
                      value={
                        winner.source?.seller ||
                        winner.brand ||
                        "Unknown"
                      }
                    />

                    <Detail
                      label="Source reputation"
                      value={
                        winner.source
                          ?.sourceReputation ||
                        "Not available"
                      }
                    />

                    <Detail
                      label="Product URL"
                      value={
                        winner.source
                          ?.productUrl ||
                        "Not available"
                      }
                    />
                  </SectionCard>

                  <SectionCard
                    eyebrow="RESALE LICENSE"
                    title="What KWEVORA verified"
                  >
                    <Detail
                      label="License type"
                      value={
                        winner.license
                          ?.licenseType ||
                        "Unknown"
                      }
                    />

                    <BooleanDetail
                      label="Resale to customers"
                      value={
                        winner.license
                          ?.resaleToEndCustomers ===
                        true
                      }
                    />

                    <BooleanDetail
                      label="Rebranding allowed"
                      value={
                        winner.license
                          ?.rebrandingAllowed ===
                        true
                      }
                    />

                    <BooleanDetail
                      label="Modification allowed"
                      value={
                        winner.license
                          ?.modificationAllowed ===
                        true
                      }
                    />

                    <BooleanDetail
                      label="Can pass resale rights"
                      value={
                        winner.license
                          ?.transferableResaleRights ===
                        true
                      }
                    />

                    <Detail
                      label="License details"
                      value={
                        winner.license
                          ?.details ||
                        "Not available"
                      }
                    />
                  </SectionCard>
                </section>

                <section className="grid gap-6 xl:grid-cols-2">
                  <SectionCard
                    eyebrow="MONEY PATH"
                    title="What it costs and how we can price it"
                  >
                    <Detail
                      label="Acquisition cost"
                      value={
                        winner.acquisition
                          ?.cost ||
                        "Not available"
                      }
                    />

                    <Detail
                      label="Recurring fees"
                      value={
                        winner.acquisition
                          ?.recurringFees ||
                        "None verified"
                      }
                    />

                    <Detail
                      label="Permitted resale price"
                      value={
                        winner.resale
                          ?.permittedPrice ||
                        "Not available"
                      }
                    />

                    <Detail
                      label="Minimum price"
                      value={
                        winner.resale
                          ?.minimumPrice ||
                        "No minimum verified"
                      }
                    />

                    <Detail
                      label="Suggested price"
                      value={
                        winner.resale
                          ?.suggestedPrice ||
                        plan?.stanStorePlan
                          ?.suggestedPrice ||
                        "Not available"
                      }
                    />

                    <Detail
                      label="Margin"
                      value={
                        winner.margin?.details ||
                        "Not available"
                      }
                    />
                  </SectionCard>

                  <SectionCard
                    eyebrow="PRODUCT SCORE"
                    title="Is this worth selling?"
                  >
                    <ScoreRow
                      label="Demand"
                      score={
                        winner.demand?.score
                      }
                    />

                    <ScoreRow
                      label="Product quality"
                      score={
                        winner.quality?.score
                      }
                    />

                    <ScoreRow
                      label="Competition"
                      score={
                        winner.competition
                          ?.score
                      }
                    />

                    <ScoreRow
                      label="Margin potential"
                      score={
                        winner.margin?.score
                      }
                    />

                    <ScoreRow
                      label="Faceless video fit"
                      score={
                        winner
                          .facelessMarketing
                          ?.score
                      }
                    />

                    <p className="mt-5 text-sm leading-6 text-gray-400">
                      Competition score is
                      better when KAI sees a
                      realistic opening for
                      us, not simply when
                      fewer sellers exist.
                    </p>
                  </SectionCard>
                </section>

                <section className="grid gap-6 xl:grid-cols-2">
                  <SectionCard
                    eyebrow="DEMAND"
                    title="Why KAI believes people want it"
                  >
                    <p className="leading-7 text-gray-300">
                      {winner.demand?.details ||
                        "No demand explanation was included."}
                    </p>

                    {winner.demand?.evidence
                      ?.length ? (
                      <div className="mt-5 space-y-3">
                        {winner.demand.evidence.map(
                          (
                            evidence,
                            index
                          ) => (
                            <div
                              key={`${evidence}-${index}`}
                              className="rounded-2xl border border-white/10 bg-black/20 p-4 text-gray-200"
                            >
                              {evidence}
                            </div>
                          )
                        )}
                      </div>
                    ) : null}
                  </SectionCard>

                  <SectionCard
                    eyebrow="QUALITY & SATURATION"
                    title="What could make or break this product"
                  >
                    <Detail
                      label="Quality"
                      value={
                        winner.quality
                          ?.details ||
                        "Not available"
                      }
                    />

                    <Detail
                      label="Freshness concerns"
                      value={
                        winner.quality
                          ?.freshnessConcerns ||
                        "None identified"
                      }
                    />

                    <Detail
                      label="Saturation risk"
                      value={
                        winner.competition
                          ?.saturationRisk ||
                        "Not available"
                      }
                    />

                    <Detail
                      label="Competition"
                      value={
                        winner.competition
                          ?.details ||
                        "Not available"
                      }
                    />
                  </SectionCard>
                </section>

                <section className="grid gap-6 xl:grid-cols-2">
                  <SectionCard
                    eyebrow="FACELESS MARKETING"
                    title="Can KAI sell this with content?"
                  >
                    <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 p-5">
                      <div>
                        <p className="text-sm text-gray-400">
                          Faceless video fit
                        </p>

                        <p className="mt-1 text-3xl font-black">
                          {normalizeScore(
                            winner
                              .facelessMarketing
                              ?.score
                          )}
                          /100
                        </p>
                      </div>

                      <div
                        className={`rounded-full px-4 py-2 text-sm font-bold ${
                          winner
                            .facelessMarketing
                            ?.suitable
                            ? "bg-green-500/15 text-green-300"
                            : "bg-red-500/15 text-red-300"
                        }`}
                      >
                        {winner
                          .facelessMarketing
                          ?.suitable
                          ? "Strong Fit"
                          : "Weak Fit"}
                      </div>
                    </div>

                    <p className="mt-5 leading-7 text-gray-300">
                      {winner
                        .facelessMarketing
                        ?.reason ||
                        "KAI did not include a faceless marketing explanation."}
                    </p>

                    <Detail
                      label="Asset rules"
                      value={
                        winner
                          .facelessMarketing
                          ?.legalAssetNotes ||
                        "Not available"
                      }
                    />

                    {winner
                      .facelessMarketing
                      ?.contentAngles
                      ?.length ? (
                      <div className="mt-6">
                        <p className="text-sm font-black uppercase tracking-[0.2em] text-purple-300">
                          Content angles
                        </p>

                        <div className="mt-3 space-y-3">
                          {winner.facelessMarketing.contentAngles.map(
                            (
                              angle,
                              index
                            ) => (
                              <div
                                key={`${angle}-${index}`}
                                className="rounded-2xl border border-white/10 bg-black/20 p-4 text-gray-200"
                              >
                                {angle}
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    ) : null}
                  </SectionCard>

                  <SectionCard
                    eyebrow="RESTRICTIONS"
                    title="Rules KAI says we must follow"
                  >
                    {buildRestrictionList(
                      winner
                    ).length ? (
                      <div className="space-y-3">
                        {buildRestrictionList(
                          winner
                        ).map(
                          (
                            item,
                            index
                          ) => (
                            <div
                              key={`${item}-${index}`}
                              className="rounded-2xl border border-yellow-400/15 bg-yellow-500/5 p-4 text-yellow-100"
                            >
                              {item}
                            </div>
                          )
                        )}
                      </div>
                    ) : (
                      <p className="text-gray-400">
                        No material
                        restrictions were
                        returned.
                      </p>
                    )}
                  </SectionCard>
                </section>
              </>
            ) : null}

            {winner?.verifiedFacts
              ?.length ? (
              <SectionCard
                eyebrow="WHAT KAI VERIFIED"
                title="Evidence strong enough to trust"
              >
                <div className="grid gap-3 md:grid-cols-2">
                  {winner.verifiedFacts.map(
                    (fact, index) => (
                      <div
                        key={`${fact}-${index}`}
                        className="rounded-2xl border border-green-400/15 bg-green-500/5 p-4"
                      >
                        <span className="mr-2 text-green-400">
                          ✓
                        </span>

                        {fact}
                      </div>
                    )
                  )}
                </div>
              </SectionCard>
            ) : null}

            {!readyToAct &&
            result.recommendation
              ?.unresolvedFacts
              ?.length ? (
              <SectionCard
                eyebrow="STILL VERIFYING"
                title="Why KAI has not authorized a product yet"
              >
                <div className="space-y-3">
                  {result.recommendation.unresolvedFacts.map(
                    (fact, index) => (
                      <div
                        key={`${fact}-${index}`}
                        className="rounded-2xl border border-yellow-400/20 bg-yellow-500/5 p-4 text-yellow-100"
                      >
                        {fact}
                      </div>
                    )
                  )}
                </div>
              </SectionCard>
            ) : null}

            {readyToAct &&
            plan?.stanStorePlan ? (
              <SectionCard
                eyebrow="STAN STORE PLAN"
                title="How KAI wants to list it"
              >
                <div className="grid gap-5 lg:grid-cols-2">
                  <div>
                    <Detail
                      label="Listing title"
                      value={
                        plan.stanStorePlan
                          .productTitle ||
                        winner?.productName ||
                        "Not available"
                      }
                    />

                    <Detail
                      label="Suggested price"
                      value={
                        plan.stanStorePlan
                          .suggestedPrice ||
                        winner?.resale
                          ?.suggestedPrice ||
                        "Not available"
                      }
                    />

                    <Detail
                      label="Call to action"
                      value={
                        plan.stanStorePlan
                          .callToAction ||
                        "Not available"
                      }
                    />

                    <Detail
                      label="Delivery strategy"
                      value={
                        plan.stanStorePlan
                          .deliveryStrategy ||
                        "Not available"
                      }
                    />
                  </div>

                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-gray-500">
                      Product description
                    </p>

                    <p className="mt-3 leading-7 text-gray-200">
                      {plan.stanStorePlan
                        .productDescription ||
                        "KAI has not prepared the description yet."}
                    </p>
                  </div>
                </div>

                {plan.stanStorePlan
                  .setupInstructions
                  ?.length ? (
                  <div className="mt-6">
                    <p className="text-sm font-black uppercase tracking-[0.2em] text-purple-300">
                      Setup steps
                    </p>

                    <div className="mt-3 space-y-3">
                      {plan.stanStorePlan.setupInstructions.map(
                        (
                          step,
                          index
                        ) => (
                          <div
                            key={`${step}-${index}`}
                            className="rounded-2xl border border-white/10 bg-black/20 p-4 text-gray-200"
                          >
                            <span className="mr-3 font-black text-purple-300">
                              {index + 1}.
                            </span>
                            {step}
                          </div>
                        )
                      )}
                    </div>
                  </div>
                ) : null}
              </SectionCard>
            ) : null}

            {readyToAct &&
            plan?.marketingPlan ? (
              <SectionCard
                eyebrow="MARKETING PLAN"
                title="How KAI wants to sell it"
              >
                <Detail
                  label="Primary angle"
                  value={
                    plan.marketingPlan
                      .primaryAngle ||
                    "Not available"
                  }
                />

                <Detail
                  label="Call to action"
                  value={
                    plan.marketingPlan
                      .callToAction ||
                    "Not available"
                  }
                />

                {plan.marketingPlan
                  .hookIdeas?.length ? (
                  <div className="mt-6">
                    <p className="text-sm font-black uppercase tracking-[0.2em] text-purple-300">
                      Hook ideas
                    </p>

                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      {plan.marketingPlan.hookIdeas.map(
                        (
                          hook,
                          index
                        ) => (
                          <div
                            key={`${hook}-${index}`}
                            className="rounded-2xl border border-white/10 bg-black/20 p-4 text-gray-200"
                          >
                            {hook}
                          </div>
                        )
                      )}
                    </div>
                  </div>
                ) : null}

                {plan.marketingPlan
                  .contentIdeas
                  ?.length ? (
                  <div className="mt-6">
                    <p className="text-sm font-black uppercase tracking-[0.2em] text-purple-300">
                      Content ideas
                    </p>

                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      {plan.marketingPlan.contentIdeas.map(
                        (
                          idea,
                          index
                        ) => (
                          <div
                            key={`${idea}-${index}`}
                            className="rounded-2xl border border-white/10 bg-black/20 p-4 text-gray-200"
                          >
                            {idea}
                          </div>
                        )
                      )}
                    </div>
                  </div>
                ) : null}
              </SectionCard>
            ) : null}

            {readyToAct &&
            plan?.firstMoneyTest ? (
              <SectionCard
                eyebrow="FIRST MONEY TEST"
                title="How KAI wants to validate it"
              >
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <MetricCard
                    label="Content Pieces"
                    value={String(
                      plan.firstMoneyTest
                        .contentCount ?? 0
                    )}
                  />

                  <MetricCard
                    label="Test Period"
                    value={
                      plan.firstMoneyTest
                        .testPeriod ||
                      "Not set"
                    }
                  />

                  <MetricCard
                    label="Continue If"
                    value={
                      plan.firstMoneyTest
                        .successSignal ||
                      "Not set"
                    }
                  />

                  <MetricCard
                    label="Change Course If"
                    value={
                      plan.firstMoneyTest
                        .stopSignal ||
                      "Not set"
                    }
                  />
                </div>

                <p className="mt-5 leading-7 text-gray-300">
                  {plan.firstMoneyTest
                    .objective ||
                    "KAI has not defined the test objective yet."}
                </p>
              </SectionCard>
            ) : null}

            <SectionCard
              eyebrow="KAI'S NEXT MOVE"
              title={
                readyToAct
                  ? "What happens next"
                  : "What KAI does next"
              }
            >
              <div className="rounded-2xl border border-purple-400/20 bg-purple-500/10 p-6">
                <p className="text-xl font-black">
                  {result.recommendation
                    ?.firstAction ||
                    result.message ||
                    "Review the Money Mode result."}
                </p>
              </div>

              <p className="mt-5 leading-7 text-gray-400">
                {readyToAct
                  ? "Next we connect this verified product to KAI's store and campaign builder so KAI can prepare the listing, marketing package, and faceless videos for review."
                  : "KAI keeps the rejected products in memory and continues the autonomous hunt with fresh products instead of lowering the license or quality standards."}
              </p>
            </SectionCard>

            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <MetricCard
                label="Broad Research Sources"
                value={String(
                  result.evidence
                    ?.broadResearch
                    ?.sourceCount ?? 0
                )}
              />

              <MetricCard
                label="Verification Sources"
                value={String(
                  result.evidence
                    ?.verification
                    ?.sourceCount ?? 0
                )}
              />

              <MetricCard
                label="Search Status"
                value={
                  readyToAct
                    ? "Winner Found"
                    : "Keep Searching"
                }
              />

              <MetricCard
                label="License Gate"
                value={
                  readyToAct
                    ? "Passed"
                    : "Blocked"
                }
              />
            </section>

            <button
              type="button"
              onClick={runMoneyHunt}
              disabled={running}
              className="rounded-2xl border border-white/10 bg-white/5 px-6 py-4 font-black transition hover:bg-white/10 disabled:opacity-50"
            >
              {running
                ? "KAI is hunting..."
                : "Run Another Product Hunt"}
            </button>
          </>
        ) : null}
      </section>
    </main>
  );
}

function normalizeScore(
  score: number | undefined
): number {
  if (
    typeof score !== "number" ||
    !Number.isFinite(score)
  ) {
    return 0;
  }

  if (score > 0 && score <= 10) {
    return Math.max(
      0,
      Math.min(
        100,
        Math.round(score * 10)
      )
    );
  }

  return Math.max(
    0,
    Math.min(
      100,
      Math.round(score)
    )
  );
}

function buildRestrictionList(
  winner: VerifiedWinner
): string[] {
  const items = [
    ...(winner.restrictions ?? []),

    ...(winner.requirements
      ?.marketplaceRestrictions ??
      []).map(
      (item) =>
        `Marketplace: ${item}`
    ),

    ...(winner.requirements
      ?.advertisingRestrictions ??
      []).map(
      (item) =>
        `Advertising: ${item}`
    ),

    ...(winner.requirements
      ?.bundlingRestrictions ??
      []).map(
      (item) =>
        `Bundling: ${item}`
    ),

    ...(winner.requirements
      ?.giveawayRestrictions ??
      []).map(
      (item) =>
        `Giveaway: ${item}`
    ),
  ];

  const geographic =
    winner.requirements
      ?.geographicRestrictions;

  if (geographic) {
    items.push(
      `Geographic: ${geographic}`
    );
  }

  return Array.from(
    new Set(
      items
        .map((item) => item.trim())
        .filter(Boolean)
    )
  );
}

function StatusPill({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2 font-bold text-gray-300">
      {children}
    </span>
  );
}

function InfoCard({
  number,
  title,
  text,
}: {
  number: string;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
      <p className="text-sm font-black text-purple-300">
        {number}
      </p>

      <h3 className="mt-3 text-xl font-black">
        {title}
      </h3>

      <p className="mt-3 leading-7 text-gray-400">
        {text}
      </p>
    </div>
  );
}

function MetricCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
      <p className="text-xs font-black uppercase tracking-[0.2em] text-gray-500">
        {label}
      </p>

      <p className="mt-2 break-words text-xl font-black">
        {value}
      </p>
    </div>
  );
}

function SectionCard({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[32px] border border-white/10 bg-white/[0.03] p-7 lg:p-8">
      <p className="text-xs font-black uppercase tracking-[0.3em] text-purple-300">
        {eyebrow}
      </p>

      <h2 className="mt-3 text-2xl font-black">
        {title}
      </h2>

      <div className="mt-6">
        {children}
      </div>
    </section>
  );
}

function Detail({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="border-b border-white/10 py-4 last:border-b-0">
      <p className="text-xs font-black uppercase tracking-[0.2em] text-gray-500">
        {label}
      </p>

      <p className="mt-2 break-words leading-7 text-gray-200">
        {value}
      </p>
    </div>
  );
}

function BooleanDetail({
  label,
  value,
}: {
  label: string;
  value: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-5 border-b border-white/10 py-4 last:border-b-0">
      <p className="text-xs font-black uppercase tracking-[0.2em] text-gray-500">
        {label}
      </p>

      <span
        className={`rounded-full px-3 py-1 text-sm font-black ${
          value
            ? "bg-green-500/15 text-green-300"
            : "bg-red-500/15 text-red-300"
        }`}
      >
        {value ? "Yes" : "No"}
      </span>
    </div>
  );
}

function ScoreRow({
  label,
  score,
}: {
  label: string;
  score: number | undefined;
}) {
  const normalized =
    normalizeScore(score);

  return (
    <div className="border-b border-white/10 py-4 last:border-b-0">
      <div className="flex items-center justify-between gap-5">
        <p className="font-bold text-gray-300">
          {label}
        </p>

        <p className="text-xl font-black">
          {normalized}/100
        </p>
      </div>

      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-white/70"
          style={{
            width: `${normalized}%`,
          }}
        />
      </div>
    </div>
  );
}