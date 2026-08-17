export type SignalImportance = "Low" | "Medium" | "High";

export type OpportunityCategory =
  | "Approval"
  | "Publishing"
  | "Content"
  | "Revenue"
  | "Audience"
  | "Product"
  | "Intelligence"
  | "Growth";

export type BusinessGoal =
  | "Revenue"
  | "Audience"
  | "Sales"
  | "Content"
  | "Product"
  | "Workload"
  | "Learning";

export type ExecutionOwner = "Owner" | "KAI" | "Shared";

export type BusinessSignal = {
  id: string;
  label: string;
  observation: string;
  pattern: string;
  meaning: string;
  importance: SignalImportance;
  source?: string;
  createdAt?: string;
  learningOutcome?:
    | "success"
    | "partial"
    | "failure";
};

export type KaiQuestion = {
  question: string;
  reason: string;
  options: string[];
};

export type KaiOpportunity = {
  id: string;
  title: string;
  category: OpportunityCategory;
  recommendation: string;
  reason: string;
  expectedOutcome: string;
  impact: number;
  effort: number;
  confidence: number;
  urgency: number;
  revenuePotential: number;
  goalAlignment: number;
  momentum: number;
  ownerDependency: number;
  priorityScore: number;
  requiresApproval: boolean;
  executionOwner: ExecutionOwner;
  changeToday: string[];
  prepareNext: string[];
};

export type KaiDecisionInput = {
  businessName?: string;
  ownerName?: string;
  signals?: BusinessSignal[];
  completedWork?: string[];
  previousDecisions?: string[];

  primaryGoal?: BusinessGoal;
  currentGoals?: string[];
  products?: string[];
  offers?: string[];
  targetAudience?: string[];
  ownerPreferences?: string[];

  pendingApprovals?: number;
  videosReady?: number;
  contentReady?: number;
  publishingReady?: number;

  audienceGrowthNeeded?: boolean;
  revenueNeeded?: boolean;
  productNeedsImprovement?: boolean;
  ownerWorkloadHigh?: boolean;

  recentViews?: number;
  recentClicks?: number;
  recentSales?: number;
  recentRevenue?: number;

  connectedPlatforms?: string[];
};

export type KaiDecision = {
  recommendation: string;
  reason: string;
  confidence: number;
  observation: string;
  pattern: string;
  conclusion: string;
  expectedOutcome: string;
  whatHappened: string[];
  whatChanged: string[];
  whatMattersMost: string;
  keepDoing: string[];
  changeToday: string[];
  prepareNext: string[];
  evidence: BusinessSignal[];
  opportunities: KaiOpportunity[];
  topOpportunity: KaiOpportunity;
  morningQuestion: KaiQuestion;
  generatedAt: string;
};

const importanceScores: Record<SignalImportance, number> = {
  Low: 1,
  Medium: 2,
  High: 3,
};

const defaultSignals: BusinessSignal[] = [
  {
    id: "owner-time",
    label: "The owner should spend time on decisions, not repetitive work",
    observation:
      "KWEVORA is designed to prepare work before the owner begins the day.",
    pattern:
      "The system creates the most value when KAI handles preparation and the owner handles only meaningful approvals.",
    meaning:
      "Today’s mission should reduce owner workload while moving the business forward.",
    importance: "High",
    source: "KWEVORA operating promise",
  },
  {
    id: "finished-work",
    label: "Finished work creates more value than unfinished work",
    observation:
      "Content, approvals, and publishing tasks can become blocked when work remains incomplete.",
    pattern:
      "Completing the strongest existing opportunity usually creates more value than opening another task.",
    meaning:
      "KAI should prioritize work that can reach the audience, generate data, or create income soon.",
    importance: "High",
    source: "Business workflow",
  },
  {
    id: "income-priority",
    label: "Business activity should connect to measurable results",
    observation:
      "Content and products create value only when they lead toward audience growth, clicks, leads, or sales.",
    pattern:
      "Actions connected to a clear business result should rank above internal improvements.",
    meaning:
      "Revenue, publishing, approvals, and finished content should outrank product-development work when they are available.",
    importance: "High",
    source: "Business goals",
  },
  {
    id: "learning-loop",
    label: "Every completed action should improve the next decision",
    observation:
      "Approvals, edits, publishing results, clicks, and sales reveal what the owner and audience prefer.",
    pattern:
      "KAI becomes more useful when it records results and applies them to future recommendations.",
    meaning:
      "Each mission should create both business progress and useful learning.",
    importance: "Medium",
    source: "KAI learning system",
  },
];

function clampScore(value: number): number {
  return Math.min(100, Math.max(0, Math.round(value)));
}

function normalizeCount(value: number | undefined): number {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value)
  ) {
    return 0;
  }

  return Math.max(0, Math.floor(value));
}

function calculatePriorityScore({
  impact,
  effort,
  confidence,
  urgency,
  revenuePotential,
  goalAlignment,
  momentum,
  ownerDependency,
}: {
  impact: number;
  effort: number;
  confidence: number;
  urgency: number;
  revenuePotential: number;
  goalAlignment: number;
  momentum: number;
  ownerDependency: number;
}): number {
  const impactWeight = impact * 0.22;
  const confidenceWeight = confidence * 0.12;
  const urgencyWeight = urgency * 0.16;
  const revenueWeight = revenuePotential * 0.2;
  const goalWeight = goalAlignment * 0.16;
  const momentumWeight = momentum * 0.1;
  const effortPenalty = effort * 0.08;
  const ownerDependencyPenalty = ownerDependency * 0.04;

  return clampScore(
    impactWeight +
      confidenceWeight +
      urgencyWeight +
      revenueWeight +
      goalWeight +
      momentumWeight -
      effortPenalty -
      ownerDependencyPenalty,
  );
}

function createOpportunity(
  opportunity: Omit<KaiOpportunity, "priorityScore">,
): KaiOpportunity {
  const normalized = {
    ...opportunity,
    impact: clampScore(opportunity.impact),
    effort: clampScore(opportunity.effort),
    confidence: clampScore(opportunity.confidence),
    urgency: clampScore(opportunity.urgency),
    revenuePotential: clampScore(opportunity.revenuePotential),
    goalAlignment: clampScore(opportunity.goalAlignment),
    momentum: clampScore(opportunity.momentum),
    ownerDependency: clampScore(opportunity.ownerDependency),
  };

  return {
    ...normalized,
    priorityScore: calculatePriorityScore(normalized),
  };
}

function sortSignalsByImportance(
  signals: BusinessSignal[],
): BusinessSignal[] {
  return [...signals].sort(
    (a, b) =>
      importanceScores[b.importance] -
      importanceScores[a.importance],
  );
}

function combineEvidence(
  suppliedSignals: BusinessSignal[],
): BusinessSignal[] {
  const byId =
    new Map<
      string,
      BusinessSignal
    >();

  [
    ...defaultSignals,
    ...suppliedSignals,
  ].forEach(
    (signal) =>
      byId.set(
        signal.id,
        signal,
      ),
  );

  return Array.from(
    byId.values(),
  );
}

function sortOpportunities(
  opportunities: KaiOpportunity[],
): KaiOpportunity[] {
  return [...opportunities].sort((a, b) => {
    if (b.priorityScore !== a.priorityScore) {
      return b.priorityScore - a.priorityScore;
    }

    if (b.revenuePotential !== a.revenuePotential) {
      return b.revenuePotential - a.revenuePotential;
    }

    if (b.goalAlignment !== a.goalAlignment) {
      return b.goalAlignment - a.goalAlignment;
    }

    if (b.impact !== a.impact) {
      return b.impact - a.impact;
    }

    return a.effort - b.effort;
  });
}

const OUTCOME_MATCH_STOP_WORDS =
  new Set([
    "about",
    "after",
    "again",
    "business",
    "content",
    "create",
    "current",
    "from",
    "into",
    "kai",
    "move",
    "next",
    "prepare",
    "result",
    "strongest",
    "that",
    "this",
    "today",
    "toward",
    "with",
  ]);

function outcomeMatchTokens(
  value: string,
): Set<string> {
  return new Set(
    value
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .map((token) =>
        token.trim(),
      )
      .filter(
        (token) =>
          token.length >= 4 &&
          !OUTCOME_MATCH_STOP_WORDS.has(
            token,
          ),
      ),
  );
}

function signalMatchesOpportunity(
  signal: BusinessSignal,
  opportunity: KaiOpportunity,
): boolean {
  if (
    !signal.learningOutcome
  ) {
    return false;
  }

  const signalTokens =
    outcomeMatchTokens([
      signal.label,
      signal.observation,
      signal.pattern,
      signal.meaning,
    ].join(" "));

  const opportunityTokens =
    outcomeMatchTokens([
      opportunity.id,
      opportunity.title,
      opportunity.category,
      opportunity.recommendation,
      opportunity.reason,
    ].join(" "));

  const sharedTokens =
    Array.from(
      signalTokens,
    ).filter(
      (token) =>
        opportunityTokens.has(
          token,
        ),
    );

  return sharedTokens.length >= 2;
}

function applyOutcomeEvidence(
  opportunities: KaiOpportunity[],
  signals: BusinessSignal[],
): KaiOpportunity[] {
  return opportunities.map(
    (opportunity) => {
      const matchingSignals =
        signals.filter(
          (signal) =>
            signalMatchesOpportunity(
              signal,
              opportunity,
            ),
        );

      if (
        matchingSignals.length === 0
      ) {
        return opportunity;
      }

      const successCount =
        matchingSignals.filter(
          (signal) =>
            signal.learningOutcome ===
            "success",
        ).length;

      const partialCount =
        matchingSignals.filter(
          (signal) =>
            signal.learningOutcome ===
            "partial",
        ).length;

      const failureCount =
        matchingSignals.filter(
          (signal) =>
            signal.learningOutcome ===
            "failure",
        ).length;

      const scoreAdjustment =
        successCount * 12 +
        partialCount * 2 -
        failureCount * 20;

      const confidenceAdjustment =
        successCount * 5 -
        partialCount * 3 -
        failureCount * 12;

      const outcomeExplanation =
        failureCount > 0
          ? "A relevant past execution failed, so KAI lowered this option and will not repeat the same approach unchanged."
          : partialCount > 0
            ? "A relevant past execution produced mixed results, so KAI kept this option available but reduced certainty until the weak parts are adjusted."
            : "A relevant past execution succeeded, so KAI strengthened this option using measured evidence.";

      return {
        ...opportunity,

        confidence:
          clampScore(
            opportunity.confidence +
              confidenceAdjustment,
          ),

        priorityScore:
          clampScore(
            opportunity.priorityScore +
              scoreAdjustment,
          ),

        reason:
          `${opportunity.reason} ${outcomeExplanation}`,

        changeToday:
          failureCount > 0
            ? [
                "Change the failed approach before repeating this opportunity.",
                ...opportunity.changeToday,
              ]
            : opportunity.changeToday,
      };
    },
  );
}

function calculateEvidenceConfidence(
  signals: BusinessSignal[],
): number {
  if (signals.length === 0) {
    return 55;
  }

  const totalScore = signals.reduce(
    (total, signal) =>
      total + importanceScores[signal.importance],
    0,
  );

  const maximumScore =
    signals.length * importanceScores.High;

  const evidenceStrength =
    maximumScore > 0
      ? totalScore / maximumScore
      : 0;

  const evidenceBonus =
    Math.min(signals.length * 3, 12);

  return Math.min(
    98,
    Math.max(
      60,
      Math.round(
        68 +
          evidenceStrength * 18 +
          evidenceBonus,
      ),
    ),
  );
}

function getPrimaryGoal(
  input: KaiDecisionInput,
): BusinessGoal {
  if (input.primaryGoal) {
    return input.primaryGoal;
  }

  if (
    input.revenueNeeded ||
    normalizeCount(input.recentSales) === 0
  ) {
    return "Revenue";
  }

  if (input.audienceGrowthNeeded) {
    return "Audience";
  }

  if (input.productNeedsImprovement) {
    return "Product";
  }

  if (input.ownerWorkloadHigh) {
    return "Workload";
  }

  return "Revenue";
}

function getGoalAlignment(
  category: OpportunityCategory,
  goal: BusinessGoal,
): number {
  const matches: Record<
    BusinessGoal,
    OpportunityCategory[]
  > = {
    Revenue: [
      "Revenue",
      "Publishing",
      "Approval",
      "Content",
    ],
    Audience: [
      "Audience",
      "Publishing",
      "Content",
    ],
    Sales: [
      "Revenue",
      "Publishing",
      "Approval",
      "Content",
    ],
    Content: [
      "Content",
      "Publishing",
      "Approval",
    ],
    Product: [
      "Product",
      "Intelligence",
      "Growth",
    ],
    Workload: [
      "Approval",
      "Publishing",
      "Intelligence",
    ],
    Learning: [
      "Intelligence",
      "Publishing",
      "Content",
    ],
  };

  if (matches[goal].includes(category)) {
    return 96;
  }

  if (
    category === "Publishing" ||
    category === "Approval" ||
    category === "Content"
  ) {
    return 78;
  }

  return 58;
}

function buildCompletedWorkSummary(
  input: KaiDecisionInput,
): string[] {
  if (input.completedWork?.length) {
    return input.completedWork;
  }

  const completed: string[] = [];

  if (
    normalizeCount(input.videosReady) > 0
  ) {
    completed.push(
      `${normalizeCount(input.videosReady)} ${
        normalizeCount(input.videosReady) === 1
          ? "video has"
          : "videos have"
      } been prepared.`,
    );
  }

  if (
    normalizeCount(input.contentReady) > 0
  ) {
    completed.push(
      `${normalizeCount(input.contentReady)} ${
        normalizeCount(input.contentReady) === 1
          ? "content package has"
          : "content packages have"
      } been prepared.`,
    );
  }

  if (
    normalizeCount(input.publishingReady) > 0
  ) {
    completed.push(
      `${normalizeCount(input.publishingReady)} ${
        normalizeCount(input.publishingReady) === 1
          ? "item is"
          : "items are"
      } ready for publishing.`,
    );
  }

  if (completed.length > 0) {
    return completed;
  }

  return [
    "KAI reviewed the available business state.",
    "The strongest opportunities were compared by impact, urgency, revenue potential, effort, and business-goal alignment.",
    "Today’s mission was selected from the highest-value available action.",
  ];
}

function buildWhatChanged(
  input: KaiDecisionInput,
): string[] {
  const changes: string[] = [];

  const pendingApprovals =
    normalizeCount(input.pendingApprovals);

  const videosReady =
    normalizeCount(input.videosReady);

  const contentReady =
    normalizeCount(input.contentReady);

  const publishingReady =
    normalizeCount(input.publishingReady);

  if (pendingApprovals > 0) {
    changes.push(
      `${pendingApprovals} ${
        pendingApprovals === 1
          ? "item now needs"
          : "items now need"
      } the owner's approval.`,
    );
  }

  if (videosReady > 0) {
    changes.push(
      `${videosReady} ${
        videosReady === 1
          ? "video is"
          : "videos are"
      } ready for review.`,
    );
  }

  if (contentReady > 0) {
    changes.push(
      `${contentReady} ${
        contentReady === 1
          ? "content package is"
          : "content packages are"
      } ready to be completed.`,
    );
  }

  if (publishingReady > 0) {
    changes.push(
      `${publishingReady} ${
        publishingReady === 1
          ? "item is"
          : "items are"
      } ready to reach the audience.`,
    );
  }

  if (
    normalizeCount(input.recentViews) > 0
  ) {
    changes.push(
      `Recent content generated ${normalizeCount(
        input.recentViews,
      )} views.`,
    );
  }

  if (
    normalizeCount(input.recentClicks) > 0
  ) {
    changes.push(
      `Recent activity generated ${normalizeCount(
        input.recentClicks,
      )} clicks.`,
    );
  }

  if (
    normalizeCount(input.recentSales) > 0
  ) {
    changes.push(
      `Recent activity generated ${normalizeCount(
        input.recentSales,
      )} ${
        normalizeCount(input.recentSales) === 1
          ? "sale"
          : "sales"
      }.`,
    );
  }

  if (changes.length === 0) {
    changes.push(
      "No completed content, approvals, publishing work, or performance results were supplied for today’s decision.",
    );

    changes.push(
      "KAI is using the business goal and available memory to choose the next useful move.",
    );
  }

  return changes;
}

function buildOpportunities(
  input: KaiDecisionInput,
  evidenceConfidence: number,
): KaiOpportunity[] {
  const pendingApprovals =
    normalizeCount(input.pendingApprovals);

  const videosReady =
    normalizeCount(input.videosReady);

  const contentReady =
    normalizeCount(input.contentReady);

  const publishingReady =
    normalizeCount(input.publishingReady);

  const recentSales =
    normalizeCount(input.recentSales);

  const recentClicks =
    normalizeCount(input.recentClicks);

  const primaryGoal = getPrimaryGoal(input);

  const opportunities: KaiOpportunity[] = [];

  if (pendingApprovals > 0) {
    opportunities.push(
      createOpportunity({
        id: "clear-approvals",
        title: "Approve the strongest prepared item",
        category: "Approval",
        recommendation:
          "Review and approve the prepared item with the strongest chance of creating income or audience growth.",
        reason:
          `${pendingApprovals} ${
            pendingApprovals === 1
              ? "item is"
              : "items are"
          } waiting for a decision. Approval is the main blocker preventing finished work from moving forward.`,
        expectedOutcome:
          "The strongest prepared work moves immediately toward publishing while KAI records the decision and continues preparing what comes next.",
        impact: 97,
        effort: 16,
        confidence:
          Math.max(91, evidenceConfidence),
        urgency: 99,
        revenuePotential: 91,
        goalAlignment: getGoalAlignment(
          "Approval",
          primaryGoal,
        ),
        momentum: 96,
        ownerDependency: 82,
        requiresApproval: true,
        executionOwner: "Owner",
        changeToday: [
          "Rank approval items by revenue potential, audience value, quality, and readiness.",
          "Present the strongest item first.",
          "Explain why that item deserves the owner's decision.",
        ],
        prepareNext: [
          "Move approved work into the publishing stage.",
          "Record the owner's approval, edits, or rejection.",
          "Use that decision to improve future rankings.",
        ],
      }),
    );
  }

  if (publishingReady > 0) {
    opportunities.push(
      createOpportunity({
        id: "publish-ready-work",
        title: "Publish the strongest approved item",
        category: "Publishing",
        recommendation:
          "Move the strongest approved item into publishing today.",
        reason:
          `${publishingReady} ${
            publishingReady === 1
              ? "item is"
              : "items are"
          } already prepared and approved. Finished work creates business value only after it reaches the audience.`,
        expectedOutcome:
          "KWEVORA begins collecting real views, clicks, audience response, leads, and possible sales.",
        impact: 98,
        effort: 20,
        confidence:
          Math.max(90, evidenceConfidence),
        urgency: 97,
        revenuePotential: 96,
        goalAlignment: getGoalAlignment(
          "Publishing",
          primaryGoal,
        ),
        momentum: 98,
        ownerDependency: 18,
        requiresApproval: false,
        executionOwner: "KAI",
        changeToday: [
          "Confirm the destination platform.",
          "Verify the caption, call to action, and destination link.",
          "Schedule or publish the approved item.",
        ],
        prepareNext: [
          "Watch early performance.",
          "Record which hook and call to action performed best.",
          "Use those results in the next recommendation.",
        ],
      }),
    );
  }

  if (
    videosReady > 0 ||
    contentReady > 0
  ) {
    const totalReady =
      videosReady + contentReady;

    opportunities.push(
      createOpportunity({
        id: "finish-content-pipeline",
        title: "Finish the strongest content package",
        category: "Content",
        recommendation:
          "Complete the content package with the strongest sales or audience potential and send it to review.",
        reason:
          `${totalReady} ${
            totalReady === 1
              ? "content item is"
              : "content items are"
          } already in progress. Finishing existing work creates more value than opening another unfinished task.`,
        expectedOutcome:
          "One complete content package becomes ready for approval and publishing.",
        impact: 94,
        effort: 32,
        confidence:
          Math.max(88, evidenceConfidence),
        urgency: 90,
        revenuePotential: 88,
        goalAlignment: getGoalAlignment(
          "Content",
          primaryGoal,
        ),
        momentum: 94,
        ownerDependency: 24,
        requiresApproval: false,
        executionOwner: "KAI",
        changeToday: [
          "Select the item with the strongest business potential.",
          "Complete the title, hook, caption, hashtags, thumbnail idea, call to action, and platform recommendation.",
          "Send the finished package into the Review Queue.",
        ],
        prepareNext: [
          "Prepare one alternate hook.",
          "Recommend the strongest destination link.",
          "Record the owner's final edits and approval.",
        ],
      }),
    );
  }

  if (
    input.revenueNeeded ||
    recentSales === 0
  ) {
    opportunities.push(
      createOpportunity({
        id: "create-revenue-content",
        title: "Create one income-focused content package",
        category: "Revenue",
        recommendation:
          "Prepare one complete short-form content package designed to move viewers toward the strongest current offer.",
        reason:
          "The business needs a clear path from attention to a product, guide, landing page, or store. Content without a destination cannot reliably create income.",
        expectedOutcome:
          "One finished content package enters the Review Queue with a clear offer, call to action, destination link, and publishing recommendation.",
        impact: 96,
        effort: 38,
        confidence:
          Math.max(86, evidenceConfidence),
        urgency:
          input.revenueNeeded ? 98 : 84,
        revenuePotential: 97,
        goalAlignment: getGoalAlignment(
          "Revenue",
          primaryGoal,
        ),
        momentum:
          videosReady + contentReady > 0
            ? 82
            : 70,
        ownerDependency: 32,
        requiresApproval: true,
        executionOwner: "Shared",
        changeToday: [
          "Choose the strongest current product or destination.",
          "Create one audience-specific hook and content package.",
          "Attach a direct call to action and destination link.",
        ],
        prepareNext: [
          "Create an alternate hook for testing.",
          "Recommend the best platform and posting time.",
          "Measure views, clicks, and sales after publishing.",
        ],
      }),
    );
  }

  if (
    input.audienceGrowthNeeded ||
    recentClicks === 0
  ) {
    opportunities.push(
      createOpportunity({
        id: "grow-audience",
        title: "Create an audience-growth post",
        category: "Audience",
        recommendation:
          "Prepare one useful short-form post designed to earn attention, trust, and profile visits.",
        reason:
          "Audience growth creates more opportunities for future clicks and sales, especially when recent engagement data is limited.",
        expectedOutcome:
          "One audience-focused content package becomes ready for review with a strong hook and clear reason to follow or learn more.",
        impact: 84,
        effort: 34,
        confidence:
          Math.max(82, evidenceConfidence),
        urgency:
          input.audienceGrowthNeeded
            ? 91
            : 70,
        revenuePotential: 72,
        goalAlignment: getGoalAlignment(
          "Audience",
          primaryGoal,
        ),
        momentum: 76,
        ownerDependency: 26,
        requiresApproval: true,
        executionOwner: "Shared",
        changeToday: [
          "Choose one problem the audience already recognizes.",
          "Create a direct hook and useful takeaway.",
          "End with one simple follow or profile-visit action.",
        ],
        prepareNext: [
          "Prepare a second variation.",
          "Recommend the strongest platform.",
          "Track views, watch time, saves, and profile visits.",
        ],
      }),
    );
  }

  if (
    input.productNeedsImprovement
  ) {
    opportunities.push(
      createOpportunity({
        id: "improve-offer",
        title: "Strengthen the current offer",
        category: "Product",
        recommendation:
          "Improve the clarity, promise, or positioning of the current product before sending more traffic to it.",
        reason:
          "More traffic will not create strong results if the offer is unclear or does not give the audience a compelling reason to act.",
        expectedOutcome:
          "The product or landing page communicates who it is for, what it solves, and what the buyer receives.",
        impact: 88,
        effort: 48,
        confidence:
          Math.max(82, evidenceConfidence),
        urgency: 78,
        revenuePotential: 90,
        goalAlignment: getGoalAlignment(
          "Product",
          primaryGoal,
        ),
        momentum: 65,
        ownerDependency: 56,
        requiresApproval: true,
        executionOwner: "Shared",
        changeToday: [
          "Clarify the target customer.",
          "Strengthen the main promise.",
          "Make the next action obvious.",
        ],
        prepareNext: [
          "Create matching promotional content.",
          "Test the revised message.",
          "Measure clicks and sales.",
        ],
      }),
    );
  }

  opportunities.push(
    createOpportunity({
      id: "improve-kai-intelligence",
      title: "Improve KAI's business understanding",
      category: "Intelligence",
      recommendation:
        "Improve KAI's understanding only when no finished business work is waiting and no stronger revenue, content, approval, or publishing opportunity is available.",
      reason:
        "Better reasoning creates long-term value, but internal improvement should not outrank work that can reach the audience or create income today.",
      expectedOutcome:
        "KAI produces more relevant future recommendations without delaying higher-value business execution.",
      impact: 80,
      effort: 52,
      confidence:
        Math.max(80, evidenceConfidence),
      urgency:
        pendingApprovals +
          publishingReady +
          videosReady +
          contentReady ===
        0
          ? 72
          : 30,
      revenuePotential: 48,
      goalAlignment: getGoalAlignment(
        "Intelligence",
        primaryGoal,
      ),
      momentum: 52,
      ownerDependency: 20,
      requiresApproval: false,
      executionOwner: "KAI",
      changeToday: [
        "Review missing business information.",
        "Strengthen memory quality and opportunity evidence.",
        "Improve explanations without interrupting business execution.",
      ],
      prepareNext: [
        "Connect more real business results.",
        "Learn from approvals and edits.",
        "Use results to improve the next mission.",
      ],
    }),
  );

  opportunities.push(
    createOpportunity({
      id: "build-new-feature",
      title: "Build another feature",
      category: "Growth",
      recommendation:
        "Add another feature only after the highest-value existing business workflow is complete.",
      reason:
        "A new feature may expand the product, but it creates less immediate value than finishing, approving, publishing, selling, or learning from existing work.",
      expectedOutcome:
        "New features are added only when they support a proven need, increase income potential, or reduce owner workload.",
      impact: 50,
      effort: 82,
      confidence: 66,
      urgency: 24,
      revenuePotential: 38,
      goalAlignment: getGoalAlignment(
        "Growth",
        primaryGoal,
      ),
      momentum: 28,
      ownerDependency: 70,
      requiresApproval: true,
      executionOwner: "Owner",
      changeToday: [
        "Keep new ideas on the roadmap.",
        "Do not interrupt the active business mission.",
        "Finish the strongest current workflow first.",
      ],
      prepareNext: [
        "Review the roadmap after the mission is complete.",
        "Choose the next feature using evidence.",
        "Confirm that it supports income or reduces workload.",
      ],
    }),
  );

  return sortOpportunities(opportunities);
}

function buildMorningQuestion(
  input: KaiDecisionInput,
  topOpportunity: KaiOpportunity,
): KaiQuestion {
  if (topOpportunity.category === "Approval") {
    return {
      question:
        "Should I rank today's approval items by sales potential, audience growth, or overall quality?",
      reason:
        "Your answer determines which prepared item should receive your attention first.",
      options: [
        "Sales potential",
        "Audience growth",
        "Overall quality",
      ],
    };
  }

  if (
    topOpportunity.category === "Publishing"
  ) {
    return {
      question:
        "Should today's publishing decision prioritize reach, clicks, or direct sales?",
      reason:
        "The primary goal changes the platform, caption, call to action, and destination link.",
      options: [
        "Reach",
        "Clicks",
        "Direct sales",
      ],
    };
  }

  if (
    topOpportunity.category === "Revenue"
  ) {
    return {
      question:
        "Which offer should today's content send people toward?",
      reason:
        "KAI needs a clear destination before building an income-focused content package.",
      options:
        input.offers?.length
          ? input.offers.slice(0, 3)
          : [
              "Free guide",
              "Stan Store",
              "Choose for me",
            ],
    };
  }

  if (
    topOpportunity.category === "Content" ||
    topOpportunity.category === "Audience"
  ) {
    return {
      question:
        "Which result matters most for the next content package: views, clicks, or sales?",
      reason:
        "The goal changes the hook, call to action, platform recommendation, and editing style.",
      options: [
        "More views",
        "More clicks",
        "More sales",
      ],
    };
  }

  if (
    topOpportunity.category === "Product"
  ) {
    return {
      question:
        "What part of the offer feels weakest right now: the promise, the product page, or the price?",
      reason:
        "Your answer tells KAI which part of the offer should be improved first.",
      options: [
        "The promise",
        "The product page",
        "The price",
      ],
    };
  }

  return {
    question:
      "Did anything happen yesterday that should change today's business plan?",
    reason:
      "Performance data shows what happened, but you can explain important context that the numbers cannot.",
    options: [
      "Nothing important",
      "Yes, I'll tell you",
      "Skip for today",
    ],
  };
}

export function runKaiDecisionEngine(
  input: KaiDecisionInput = {},
): KaiDecision {
  const businessName =
    input.businessName?.trim() || "KWEVORA";

  const ownerName =
    input.ownerName?.trim() || "Kent";

  const suppliedSignals =
    input.signals ?? [];

  const evidence =
    sortSignalsByImportance(
      combineEvidence(
        suppliedSignals,
      ),
    );

  const strongestSignal =
    evidence[0];

  const evidenceConfidence =
    calculateEvidenceConfidence(evidence);

  const opportunities =
    sortOpportunities(
      applyOutcomeEvidence(
        buildOpportunities(
          input,
          evidenceConfidence,
        ),
        evidence,
      ),
    );

  const topOpportunity =
    opportunities[0];

  const previousDecisionContext =
    input.previousDecisions?.length
      ? ` Earlier decisions also show that ${input.previousDecisions[0].toLowerCase()}`
      : "";

  const primaryGoal =
    getPrimaryGoal(input);

  return {
    recommendation:
      topOpportunity.recommendation,

    reason:
      topOpportunity.reason,

    confidence:
      topOpportunity.confidence,

    observation:
      strongestSignal?.observation ??
      `${businessName} has enough information to identify the next useful move.`,

    pattern:
      strongestSignal?.pattern ??
      "The strongest results come from finishing valuable work and connecting it to a measurable business goal.",

    conclusion:
      `Based on the available evidence, today's best move is to ${topOpportunity.recommendation
        .charAt(0)
        .toLowerCase()}${topOpportunity.recommendation.slice(1)}`,

    expectedOutcome:
      topOpportunity.expectedOutcome,

    whatHappened:
      buildCompletedWorkSummary(input),

    whatChanged:
      buildWhatChanged(input),

    whatMattersMost:
      `${ownerName}'s current priority is ${primaryGoal.toLowerCase()}. KAI should handle preparation and execution whenever possible and ask the owner only for decisions that genuinely require owner judgment.${previousDecisionContext}`,

    keepDoing: [
      "Keep Home focused on completed work, approvals, today's mission, and what KAI is doing next.",
      "Keep KAI's language plainspoken, calm, confident, and connected to real business goals.",
      "Keep repetitive preparation and execution with KAI.",
      "Keep meaningful approvals and strategic choices with the owner.",
      "Keep building around the promise: Wake up. Approve your day. Go live your life.",
    ],

    changeToday:
      topOpportunity.changeToday,

    prepareNext:
      topOpportunity.prepareNext,

    evidence,

    opportunities,

    topOpportunity,

    morningQuestion:
      buildMorningQuestion(
        input,
        topOpportunity,
      ),

    generatedAt:
      new Date().toISOString(),
  };
}
