"use client";

import { useState } from "react";

type VerifiedWinner = {
  productName?: string;
  brand?: string;
  verificationStatus?: string;

  program?: {
    exists?: boolean;
    currentlyAvailable?: boolean;
    programName?: string;
    signupUrl?: string;
    network?: string;
  };

  commission?: {
    verified?: boolean;
    structure?: string;
    recurring?: boolean;
    recurringDetails?: string;
  };

  cookie?: {
    verified?: boolean;
    duration?: string;
  };

  payout?: {
    verified?: boolean;
    details?: string;
  };

  requirements?: {
    verified?: boolean;
    approvalRequirements?: string[];
    trafficRequirements?: string;
    geographicRestrictions?: string;
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

type MoneyModeResult = {
  success?: boolean;
  mode?: string;
  pipelineStatus?: string;
  verificationRounds?: number;
  researchSummary?: string;

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

  evidence?: {
    broadResearch?: {
      sourceCount?: number;
    };

    verification?: {
      rounds?: number;
      sourceCount?: number;
      summary?: string;
    };
  };

  message?: string;
};

export default function MoneyModePage() {
  const [running, setRunning] =
    useState(false);

  const [result, setResult] =
    useState<MoneyModeResult | null>(
      null
    );

  const [error, setError] =
    useState("");

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
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            niche: "",
            audience: "",

            goal:
              "Find the strongest practical opportunity I can start promoting to generate digital or affiliate marketing income as quickly as reasonably possible.",

            notes:
              "Keep startup cost low. Prefer opportunities that can be marketed with faceless short-form video. Research broadly, verify the monetization path, and only authorize action when the opportunity is genuinely verified.",
          }),
        }
      );

      const data: MoneyModeResult =
        await response.json();

      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          data.message ||
            "KAI could not complete today's Money Hunt."
        );
      }

      setResult(data);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "KAI could not complete today's Money Hunt."
      );
    } finally {
      setRunning(false);
    }
  }

  const winner =
    result?.verifiedWinner;

  const readyToAct =
    result?.recommendation
      ?.readyToAct === true;

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
              best money opportunity.
            </h1>

            <p className="mt-5 max-w-3xl text-lg leading-8 text-gray-300">
              KAI researches the live
              market, compares
              opportunities, verifies how
              you actually get paid, and
              refuses to move forward until
              the money path is strong
              enough to test.
            </p>

            <div className="mt-8 flex flex-wrap gap-3 text-sm">
              <StatusPill>
                Live research
              </StatusPill>

              <StatusPill>
                Opportunity scoring
              </StatusPill>

              <StatusPill>
                Deep verification
              </StatusPill>

              <StatusPill>
                Hard action gate
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
                : "Find Today's Opportunity"}
            </button>

            {running ? (
              <div className="mt-6 rounded-2xl border border-purple-400/20 bg-purple-500/10 p-5">
                <p className="font-bold text-purple-200">
                  KAI is researching the
                  current market.
                </p>

                <p className="mt-2 text-sm leading-6 text-gray-400">
                  This may take a few
                  minutes because KAI can
                  perform broad research and
                  multiple live verification
                  passes before authorizing
                  an opportunity.
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
              title="Find"
              text="KAI searches current market opportunities instead of relying on old model knowledge."
            />

            <InfoCard
              number="02"
              title="Prove"
              text="The strongest finalists are checked again for real affiliate terms and restrictions."
            />

            <InfoCard
              number="03"
              title="Act"
              text="KWEVORA only authorizes the business move after an opportunity passes verification."
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
                      ? "VERIFIED & READY"
                      : "KAI STOPPED THE CAMPAIGN"}
                  </p>

                  <h2 className="mt-3 text-3xl font-black md:text-4xl">
                    {readyToAct
                      ? result
                          .recommendation
                          ?.bestOpportunity ||
                        winner?.productName ||
                        "Verified opportunity"
                      : "No opportunity passed the gate yet."}
                  </h2>

                  <p className="mt-4 max-w-3xl leading-7 text-gray-300">
                    {result
                      .recommendation
                      ?.reason ||
                      (readyToAct
                        ? "KAI verified a practical money opportunity."
                        : "KWEVORA needs stronger evidence before allowing a campaign to begin.")}
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
                    : "Blocked"}
                </div>
              </div>

              <div className="mt-8 grid gap-4 md:grid-cols-3">
                <MetricCard
                  label="Verification"
                  value={
                    result
                      .recommendation
                      ?.verificationStatus ||
                    "Unknown"
                  }
                />

                <MetricCard
                  label="Confidence"
                  value={`${
                    result
                      .recommendation
                      ?.monetizationConfidence ??
                    0
                  }%`}
                />

                <MetricCard
                  label="Verification Rounds"
                  value={String(
                    result.verificationRounds ??
                      0
                  )}
                />
              </div>
            </section>

            {winner ? (
              <section className="grid gap-6 xl:grid-cols-2">
                <SectionCard
                  eyebrow="MONEY PATH"
                  title="How this opportunity pays"
                >
                  <Detail
                    label="Brand"
                    value={
                      winner.brand ||
                      "Unknown"
                    }
                  />

                  <Detail
                    label="Program"
                    value={
                      winner.program
                        ?.programName ||
                      "Unknown"
                    }
                  />

                  <Detail
                    label="Affiliate network"
                    value={
                      winner.program
                        ?.network ||
                      "Direct / Unknown"
                    }
                  />

                  <Detail
                    label="Commission"
                    value={
                      winner.commission
                        ?.structure ||
                      "Not available"
                    }
                  />

                  <Detail
                    label="Cookie window"
                    value={
                      winner.cookie
                        ?.duration ||
                      "Not available"
                    }
                  />

                  <Detail
                    label="Payout"
                    value={
                      winner.payout
                        ?.details ||
                      "Not available"
                    }
                  />
                </SectionCard>

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
                        {winner
                          .facelessMarketing
                          ?.score ?? 0}
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
              </section>
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
                eyebrow="WAITING FOR PROOF"
                title="Why KAI refused to move forward"
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

            <SectionCard
              eyebrow="KAI'S NEXT MOVE"
              title={
                readyToAct
                  ? "What happens next"
                  : "What KAI needs before acting"
              }
            >
              <div className="rounded-2xl border border-purple-400/20 bg-purple-500/10 p-6">
                <p className="text-xl font-black">
                  {result
                    .recommendation
                    ?.firstAction ||
                    result.message ||
                    "Review the Money Mode result."}
                </p>
              </div>

              {readyToAct ? (
                <p className="mt-5 leading-7 text-gray-400">
                  This is where we will
                  connect Money Mode to
                  KAI&apos;s campaign builder.
                  KAI will prepare the offer,
                  positioning, faceless video
                  concepts, content package,
                  destination strategy, and
                  Review Queue items before
                  anything is published.
                </p>
              ) : null}
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
                label="Research Status"
                value="Complete"
              />

              <MetricCard
                label="Action Gate"
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
                : "Run Another Money Hunt"}
            </button>
          </>
        ) : null}
      </section>
    </main>
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

      <p className="mt-2 text-xl font-black">
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

      <p className="mt-2 leading-7 text-gray-200">
        {value}
      </p>
    </div>
  );
}