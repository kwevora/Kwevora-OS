import {
  runKaiDecisionEngine,
  type BusinessSignal,
  type KaiDecision,
  type KaiDecisionInput,
} from "./kaiDecisionEngine";

import {
  businessBrain,
  type BusinessAssessment,
  type BusinessProfile,
} from "./BusinessBrain";

import {
  memoryBrain,
  type Memory,
  type MemorySearchResult,
} from "./MemoryBrain";

import { cognitiveCore, type CognitiveSession } from "./CognitiveCore";

export type DecisionRequest = KaiDecisionInput & {
  businessProfile?: BusinessProfile;
  memoryTags?: string[];
};

export type DecisionResponse = {
  success: boolean;

  businessAssessment?: BusinessAssessment;

  relevantMemories: Memory[];

  memoryConfidence: number;

  missingMemory: string[];

  cognitiveSession: CognitiveSession;

  decision: KaiDecision;

  decisionMemoryId: string;

  completedAt: string;
};

function uniqueValues(values: Array<string | undefined>): string[] {
  return Array.from(
    new Set(
      values
        .filter(
          (value): value is string =>
            typeof value === "string" && value.trim().length > 0,
        )
        .map((value) => value.trim().toLowerCase()),
    ),
  );
}

function buildMemoryTags(context: DecisionRequest): string[] {
  return uniqueValues([
    "learning",
    "decision",
    "business",
    "project",

    context.businessName,
    context.ownerName,
    context.primaryGoal,

    context.businessProfile?.businessName,
    context.businessProfile?.ownerName,
    context.businessProfile?.industry,
    context.businessProfile?.businessModel,
    context.businessProfile?.primaryGoal,

    ...(context.currentGoals ?? []),
    ...(context.products ?? []),
    ...(context.offers ?? []),
    ...(context.targetAudience ?? []),
    ...(context.memoryTags ?? []),
  ]);
}

async function recallRelevantMemory(
  context: DecisionRequest,
): Promise<MemorySearchResult> {
  const tags = buildMemoryTags(context);

  if (tags.length === 0) {
    return {
      memories: [],
      confidence: 0,
      missingKnowledge: [
        "KAI does not yet have enough context to search its memory.",
      ],
    };
  }

  return memoryBrain.recall(tags);
}

function memoryToSignal(memory: Memory): BusinessSignal {
  const importance =
    memory.importance === "critical" || memory.importance === "high"
      ? ("High" as const)
      : memory.importance === "medium"
        ? ("Medium" as const)
        : ("Low" as const);

  const learningOutcome =
    memory.type === "learning"
      ? memory.tags.includes("failure")
        ? "failure"
        : memory.tags.includes("partial")
          ? "partial"
          : memory.tags.includes("success")
            ? "success"
            : undefined
      : undefined;

  return {
    id: `memory-${memory.id}`,

    label: `KAI recalled: ${memory.title}`,

    observation: memory.description,

    pattern:
      memory.type === "learning"
        ? "A previous result produced a lesson that may improve today's decision."
        : "KAI has relevant historical context connected to today's business situation.",

    meaning:
      memory.type === "learning"
        ? "Apply this lesson before repeating similar work."
        : "Use this memory to preserve continuity and avoid asking the owner for information KAI already knows.",

    importance,

    source: `MemoryBrain:${memory.type}`,

    learningOutcome,
  };
}

function buildBusinessSignals(
  assessment?: BusinessAssessment,
): BusinessSignal[] {
  if (!assessment) {
    return [];
  }

  return [
    {
      id: "business-understanding",

      label: "KAI assessed the current business context",

      observation: assessment.summary,

      pattern: assessment.biggestOpportunity,

      meaning: assessment.recommendedFocus,

      importance:
        assessment.confidence >= 80
          ? "High"
          : assessment.confidence >= 60
            ? "Medium"
            : "Low",

      source: "BusinessBrain",
    },
    {
      id: "business-risk",

      label: "KAI identified the strongest current business risk",

      observation: assessment.biggestRisk,

      pattern:
        assessment.missingInformation.length > 0
          ? "Missing business knowledge can reduce decision quality."
          : "KAI has enough business context to prioritize execution.",

      meaning:
        assessment.missingInformation.length > 0
          ? "KAI should continue learning while avoiding unnecessary interruption."
          : "KAI can focus on the highest-value available business action.",

      importance: assessment.missingInformation.length > 0 ? "Medium" : "High",

      source: "BusinessBrain",
    },
  ];
}

function enrichDecisionContext(
  context: DecisionRequest,
  assessment: BusinessAssessment | undefined,
  memories: Memory[],
): KaiDecisionInput {
  const businessSignals = buildBusinessSignals(assessment);

  const memorySignals = memories.map(memoryToSignal);

  return {
    ...context,

    signals: [...businessSignals, ...memorySignals, ...(context.signals ?? [])],

    businessName: context.businessName ?? context.businessProfile?.businessName,

    ownerName: context.ownerName ?? context.businessProfile?.ownerName,

    products: context.products ?? context.businessProfile?.products,

    offers: context.offers ?? context.businessProfile?.services,

    targetAudience:
      context.targetAudience ?? context.businessProfile?.targetAudience,

    ownerPreferences:
      context.ownerPreferences ??
      uniqueValues([
        context.businessProfile?.brandVoice,
        ...(context.businessProfile?.constraints ?? []),
      ]),

    currentGoals:
      context.currentGoals ?? context.businessProfile?.currentPriorities,

    connectedPlatforms:
      context.connectedPlatforms ?? context.businessProfile?.platforms,

    previousDecisions:
      context.previousDecisions ??
      memories
        .filter(
          (memory) => memory.type === "decision" || memory.type === "learning",
        )
        .map((memory) => `${memory.title}: ${memory.description}`)
        .slice(0, 10),
  };
}

function buildCognitiveObservation(
  context: DecisionRequest,
  assessment?: BusinessAssessment,
): string {
  if (assessment?.summary) {
    return assessment.summary;
  }

  const businessName =
    context.businessName ??
    context.businessProfile?.businessName ??
    "the business";

  const goals =
    context.currentGoals ?? context.businessProfile?.currentPriorities ?? [];

  if (goals.length > 0) {
    return `${businessName} needs the strongest next move toward: ${goals.join(
      ", ",
    )}.`;
  }

  return `${businessName} needs KAI to review the current business state and choose the highest-value next action.`;
}

function buildRememberedKnowledge(memories: Memory[]): string[] {
  return memories
    .map((memory) => `${memory.title}: ${memory.description}`)
    .slice(0, 12);
}

function buildAssumptions(
  context: DecisionRequest,
  assessment?: BusinessAssessment,
): string[] {
  const assumptions: string[] = [];

  if (context.revenueNeeded || context.recentSales === 0) {
    assumptions.push(
      "Creating a clearer path toward revenue is currently important.",
    );
  }

  if (context.audienceGrowthNeeded) {
    assumptions.push(
      "Audience growth is needed to create more future opportunities.",
    );
  }

  if (context.ownerWorkloadHigh) {
    assumptions.push(
      "KAI should reduce the owner's workload and avoid unnecessary interruptions.",
    );
  }

  if (assessment?.missingInformation.length) {
    assumptions.push(
      "Missing business information may reduce confidence, but KAI should still complete safe preparation work.",
    );
  }

  if (assumptions.length === 0) {
    assumptions.push(
      "Finished work connected to a measurable business result should outrank unnecessary internal work.",
    );
  }

  return assumptions;
}

function buildPredictions(
  context: DecisionRequest,
  assessment?: BusinessAssessment,
): string[] {
  const predictions: string[] = [];

  if (context.pendingApprovals && context.pendingApprovals > 0) {
    predictions.push(
      "Prepared work will remain blocked until the strongest approval is completed.",
    );
  }

  if (context.publishingReady && context.publishingReady > 0) {
    predictions.push(
      "Approved work will not create views, clicks, learning, or sales until it reaches the audience.",
    );
  }

  if (context.revenueNeeded || context.recentSales === 0) {
    predictions.push(
      "Without a clear offer and destination, content is unlikely to create reliable income.",
    );
  }

  if (assessment?.biggestRisk) {
    predictions.push(
      `If nothing changes, the current risk remains: ${assessment.biggestRisk}`,
    );
  }

  if (predictions.length === 0) {
    predictions.push(
      "If KAI does not choose and complete a clear priority, the business may lose momentum.",
    );
  }

  return predictions;
}

function buildInitialOptions(
  context: DecisionRequest,
  assessment?: BusinessAssessment,
): string[] {
  return uniqueValues([
    assessment?.recommendedFocus,
    assessment?.biggestOpportunity,
    ...(context.currentGoals ?? []),
    ...(context.completedWork ?? []),
    "Finish the strongest existing business opportunity",
    "Prepare work that can create revenue or audience growth",
    "Improve KAI's understanding only when stronger execution work is unavailable",
  ]);
}

function finalizeCognitiveSession(
  session: CognitiveSession,
  decision: KaiDecision,
): CognitiveSession {
  return {
    ...session,

    completedAt: new Date().toISOString(),

    options: decision.opportunities.map(
      (opportunity) => `${opportunity.title}: ${opportunity.recommendation}`,
    ),

    priority: decision.topOpportunity.title,

    decision: decision.recommendation,

    executionPlan: [...decision.changeToday, ...decision.prepareNext],

    reflection: `After execution, KAI should compare the expected outcome with the actual result, record what worked, record what failed, and use that lesson to improve the next decision.`,

    confidence: decision.confidence,
  };
}

async function saveDecisionMemory(
  context: DecisionRequest,
  decision: KaiDecision,
  cognitiveSession: CognitiveSession,
): Promise<string> {
  const createdAt = new Date().toISOString();

  const decisionMemoryId = `decision-${createdAt.replace(/[:.]/g, "-")}`;

  const description = [
    `Cognitive session: ${cognitiveSession.id}`,
    `Observation: ${cognitiveSession.observation}`,
    `Priority: ${cognitiveSession.priority}`,
    `Recommendation: ${decision.recommendation}`,
    `Reason: ${decision.reason}`,
    `Expected outcome: ${decision.expectedOutcome}`,
    `What matters most: ${decision.whatMattersMost}`,
    decision.changeToday.length > 0
      ? `Change today: ${decision.changeToday.join(" | ")}`
      : "",
    decision.prepareNext.length > 0
      ? `Prepare next: ${decision.prepareNext.join(" | ")}`
      : "",
    `Reflection goal: ${cognitiveSession.reflection}`,
  ]
    .filter(Boolean)
    .join("\n");

  await memoryBrain.remember({
    id: decisionMemoryId,

    type: "decision",

    title: decision.topOpportunity.title,

    description,

    importance:
      decision.confidence >= 90
        ? "critical"
        : decision.confidence >= 75
          ? "high"
          : "medium",

    learnedAt: createdAt,

    tags: uniqueValues([
      "decision",
      "cognitive-session",
      "business",
      "project",
      context.businessName,
      context.ownerName,
      context.primaryGoal,
      context.businessProfile?.businessName,
      context.businessProfile?.industry,
      decision.topOpportunity.category,
      decision.topOpportunity.id,
      ...(context.currentGoals ?? []),
      ...(context.memoryTags ?? []),
    ]),
  });

  return decisionMemoryId;
}

export class DecisionCore {
  async think(context: DecisionRequest = {}): Promise<DecisionResponse> {
    const businessAssessment = context.businessProfile
      ? businessBrain.understand(context.businessProfile)
      : undefined;

    const memoryResult = await recallRelevantMemory(context);

    const initialCognitiveSession = cognitiveCore.think({
      observation: buildCognitiveObservation(context, businessAssessment),

      rememberedKnowledge: buildRememberedKnowledge(memoryResult.memories),

      assumptions: buildAssumptions(context, businessAssessment),

      predictions: buildPredictions(context, businessAssessment),

      options: buildInitialOptions(context, businessAssessment),
    });

    const decisionContext = enrichDecisionContext(
      context,
      businessAssessment,
      memoryResult.memories,
    );

    const decision = runKaiDecisionEngine(decisionContext);

    const cognitiveSession = finalizeCognitiveSession(
      initialCognitiveSession,
      decision,
    );

    const decisionMemoryId = await saveDecisionMemory(
      context,
      decision,
      cognitiveSession,
    );

    return {
      success: true,

      businessAssessment,

      relevantMemories: memoryResult.memories,

      memoryConfidence: memoryResult.confidence,

      missingMemory: memoryResult.missingKnowledge,

      cognitiveSession,

      decision,

      decisionMemoryId,

      completedAt: new Date().toISOString(),
    };
  }
}

export const decisionCore = new DecisionCore();
