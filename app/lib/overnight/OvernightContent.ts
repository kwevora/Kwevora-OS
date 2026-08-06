import {
  contentIntelligenceEngine,
  type ContentPackage,
} from "../ContentIntelligenceEngine";

import {
  reviewQueueStore,
} from "./ReviewQueueStore";

import type {
  DecisionRequest,
} from "../DecisionCore";

import type {
  KaiDecision,
} from "../kaiDecisionEngine";

export type OvernightContentInput = {
  request: DecisionRequest;
  decision: KaiDecision;
};

export type OvernightContentResult = {
  contentPackage: ContentPackage | null;
  reviewItemId: string | null;
};

export class OvernightContent {
  generate(
    input: OvernightContentInput,
  ): OvernightContentResult {
    if (
      !contentIntelligenceEngine.shouldGenerate(
        input.decision,
      )
    ) {
      return {
        contentPackage: null,
        reviewItemId: null,
      };
    }

    const contentPackage =
      contentIntelligenceEngine.generate({
        decision:
          input.decision,

        businessName:
          input.request.businessName ??
          input.request.businessProfile
            ?.businessName,

        ownerName:
          input.request.ownerName ??
          input.request.businessProfile
            ?.ownerName,

        products:
          input.request.products ??
          input.request.businessProfile
            ?.products,

        offers:
          input.request.offers ??
          input.request.businessProfile
            ?.services,

        targetAudience:
          input.request.targetAudience ??
          input.request.businessProfile
            ?.targetAudience,

        connectedPlatforms:
          input.request.connectedPlatforms ??
          input.request.businessProfile
            ?.platforms,

        brandVoice:
          input.request.businessProfile
            ?.brandVoice,

        preferredFormat:
          "faceless_video",
      });

    const reviewItem =
      reviewQueueStore.addContentPackage(
        contentPackage,
      );

    return {
      contentPackage,
      reviewItemId:
        reviewItem.id,
    };
  }
}

export const overnightContent =
  new OvernightContent();