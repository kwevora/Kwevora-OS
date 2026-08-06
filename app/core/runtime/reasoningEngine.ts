import type { ClientRuntimeState } from "./clientRuntime";
import type { KaiMemoryEntry } from "./memoryStore";

export type KaiDecisionFactor = {
  label: string;
  detail: string;
};

export type KaiPriorityScore = {
  impact: number;
  speed: number;
  difficulty: number;
  revenuePotential: number;
  urgency: number;
};

export type KaiRankedPriority = {
  rank: number;
  title: string;
  reason: string;
  score: KaiPriorityScore;
  confidence: number;
};

export type KaiReasoningResult = {
  executiveSummary: string;
  observation: string;
  reasoning: string;
  recommendation: string;
  question: string;
  confidence: number;
  contentDirection: string;
  chosenStrategy: string;
  nextAction: string;
  decisionFactors: KaiDecisionFactor[];
  rejectedOptions: KaiDecisionFactor[];
  priorities: KaiRankedPriority[];
};

function memoryText(memory: KaiMemoryEntry[]) {
  return memory.map((item) => item.text).join(" ").toLowerCase();
}

function averageScore(score: KaiPriorityScore) {
  return Math.round(
    (score.impact +
      score.speed +
      score.revenuePotential +
      score.urgency -
      score.difficulty) /
      4
  );
}

function rankPriorities(
  priorities: Omit<KaiRankedPriority, "rank">[]
): KaiRankedPriority[] {
  return priorities
    .sort((a, b) => averageScore(b.score) - averageScore(a.score))
    .map((priority, index) => ({
      ...priority,
      rank: index + 1,
    }));
}

export function runReasoningEngine(
  memory: KaiMemoryEntry[],
  runtime?: ClientRuntimeState
): KaiReasoningResult {
  const savedText = memoryText(memory);

  const hasBusyWindow =
    savedText.includes("busy") ||
    savedText.includes("3pm") ||
    savedText.includes("5pm") ||
    savedText.includes("appointment") ||
    savedText.includes("limited time");

  const isMoneyMode =
    savedText.includes("money") ||
    savedText.includes("income") ||
    savedText.includes("bills") ||
    savedText.includes("digital product") ||
    savedText.includes("affiliate") ||
    savedText.includes("stan") ||
    savedText.includes("sell");

  const hasLiveAI = Boolean(
    runtime?.overnightReport || runtime?.contentIdeas?.length
  );

  const contentCount = runtime?.contentIdeas?.length ?? 0;
  const gamePlanCount = runtime?.gamePlan?.length ?? 0;
  const status = runtime?.status ?? "planning";

  const decisionFactors: KaiDecisionFactor[] = [
    {
      label: "Current runtime",
      detail: `KAI is currently in ${status} mode.`,
    },
    {
      label: "Money Mode",
      detail:
        "Version 1.0 is focused on helping Kent create content, point people to offers, and move toward income sooner.",
    },
    {
      label: "Content readiness",
      detail:
        contentCount > 0
          ? `${contentCount} content idea(s) are ready to turn into publishing packages.`
          : "No saved content ideas are ready yet, so KAI should create new ones before anything else.",
    },
    {
      label: "Game plan readiness",
      detail:
        gamePlanCount > 0
          ? `${gamePlanCount} game plan item(s) are already prepared.`
          : "The game plan should be built around content production first.",
    },
    {
      label: "Owner preference",
      detail:
        "Kent wants complete files, less talking, real working software, and features that help him earn sooner.",
    },
  ];

  if (hasBusyWindow) {
    decisionFactors.push({
      label: "Availability",
      detail:
        "Kent has limited time, so KAI should avoid low-value work and prepare content that can be copied, approved, and published quickly.",
    });
  }

  if (hasLiveAI) {
    decisionFactors.push({
      label: "Live AI status",
      detail:
        "Live AI has already proven it can generate and save real work into the runtime.",
    });
  }

  const priorities = rankPriorities([
    {
      title: "Create today’s content package",
      reason:
        "Content is the shortest path to attention, clicks, and future sales. KAI should turn the current strategy into usable posts before adding more app features.",
      score: {
        impact: 99,
        speed: 92,
        difficulty: 34,
        revenuePotential: 96,
        urgency: 98,
      },
      confidence: 98,
    },
    {
      title: "Attach a product or lead magnet link",
      reason:
        "Views alone do not pay bills. Every content package needs a clear CTA and destination link so attention can turn into clicks.",
      score: {
        impact: 96,
        speed: 95,
        difficulty: 22,
        revenuePotential: 98,
        urgency: 96,
      },
      confidence: 97,
    },
    {
      title: "Prepare the content for approval",
      reason:
        "KAI should not publish blindly. Kent needs to review, approve, copy, and move fast without rewriting everything manually.",
      score: {
        impact: 93,
        speed: 88,
        difficulty: 35,
        revenuePotential: 88,
        urgency: 91,
      },
      confidence: 94,
    },
    {
      title: "Improve publishing workflow after content is ready",
      reason:
        "Publishing integrations matter, but they only matter after KAI can reliably create strong content packages worth posting.",
      score: {
        impact: 91,
        speed: 64,
        difficulty: 72,
        revenuePotential: 95,
        urgency: 84,
      },
      confidence: 89,
    },
  ]);

  const rejectedOptions: KaiDecisionFactor[] = [
    {
      label: "Build more dashboard sections",
      detail:
        "The app already has enough UI for Version 1.0. More sections would slow down the path to revenue.",
    },
    {
      label: "Polish buttons before building the engine",
      detail:
        "A prettier button does not help Kent earn. A usable content package with a link does.",
    },
    {
      label: "Jump straight to social APIs",
      detail:
        "Direct publishing is valuable, but KAI first needs a reliable content package and approval workflow.",
    },
    {
      label: "Create random content",
      detail:
        "Random content wastes time. KAI should create content connected to offers, digital products, affiliate marketing, and KWEVORA’s story.",
    },
  ];

  return {
    executiveSummary:
      "If I were running KWEVORA today, I would stop adding new screens and focus on the shortest path to money: create content, attach the right link, prepare it for approval, and get Kent closer to publishing.",
    observation:
      "I noticed that KWEVORA already has a strong interface, working runtime, visible reasoning, and a Video Studio that can generate platform-ready content packages.",
    reasoning:
      "The next best move is not more UI. The next best move is making KAI produce work that can attract attention and point people to an offer. That means content packages with hooks, scripts, captions, CTAs, pinned comments, and links.",
    recommendation:
      "Make content production the top priority. KAI should create today’s video packages first, attach Kent’s product or Stan Store link, and prepare everything for approval.",
    question:
      "What link should KAI attach to today’s content: your Stan Store, a free guide, or a specific digital product?",
    confidence: isMoneyMode ? 99 : 97,
    contentDirection:
      "Create content around this message: I’m building an AI COO that helps digital product sellers wake up with content, CTAs, and a plan already prepared.",
    chosenStrategy: "Money Mode First",
    nextAction:
      "Use Video Studio to generate today’s content packages, attach the offer link, approve the strongest package, and publish it manually while the publishing engine is being built.",
    decisionFactors,
    rejectedOptions,
    priorities,
  };
}