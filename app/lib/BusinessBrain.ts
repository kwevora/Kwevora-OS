export type BusinessProfile = {
  businessName: string;
  ownerName: string;

  mission: string;
  vision: string;

  industry: string;
  businessModel: string;

  products: string[];
  services: string[];

  targetAudience: string[];
  customerProblems: string[];
  customerGoals: string[];

  revenueStreams: string[];

  primaryGoal: string;
  currentPriorities: string[];

  strengths: string[];
  weaknesses: string[];

  competitors: string[];

  brandVoice: string;

  platforms: string[];

  successMetrics: string[];

  constraints: string[];

  lastUpdated: string;
};

export type BusinessAssessment = {
  summary: string;

  biggestOpportunity: string;

  biggestRisk: string;

  recommendedFocus: string;

  missingInformation: string[];

  confidence: number;
};

export class BusinessBrain {
  understand(
    profile: BusinessProfile,
  ): BusinessAssessment {
    const missing: string[] = [];

    if (!profile.mission)
      missing.push("Mission");

    if (!profile.vision)
      missing.push("Vision");

    if (!profile.businessModel)
      missing.push("Business Model");

    if (
      profile.products.length === 0
    )
      missing.push("Products");

    if (
      profile.targetAudience
        .length === 0
    )
      missing.push(
        "Target Audience",
      );

    if (
      profile.customerProblems
        .length === 0
    )
      missing.push(
        "Customer Problems",
      );

    if (
      profile.revenueStreams
        .length === 0
    )
      missing.push(
        "Revenue Streams",
      );

    const confidence =
      Math.max(
        40,
        100 - missing.length * 8,
      );

    return {
      summary:
        `${profile.businessName} is focused on ${profile.primaryGoal}.`,

      biggestOpportunity:
        "Finish more work before the owner wakes up.",

      biggestRisk:
        missing.length
          ? "KAI is making decisions with incomplete business knowledge."
          : "Execution quality.",

      recommendedFocus:
        missing.length
          ? "Continue learning the business."
          : "Execute today's highest-value mission.",

      missingInformation:
        missing,

      confidence,
    };
  }
}

export const businessBrain =
  new BusinessBrain();