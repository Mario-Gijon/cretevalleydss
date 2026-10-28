import { describe, expect, it } from "vitest";

import { buildDecisionContext } from "../../../modules/issues/evaluations/buildDecisionContext.js";
import { ahpSortAlternativeProfilesStructure } from "../../../modules/decisionPlugins/evaluations/structures/ahpSortAlternativeProfiles/index.js";

describe("AHPSort I evaluation decision context", () => {
  it("carries persisted profile configuration and ID-keyed weights into evaluation snapshots", async () => {
    const modelParameters = {
      orderedCategories: [
        { categoryId: "low", label: "Low", order: 0 },
        { categoryId: "medium", label: "Medium", order: 1 },
      ],
      ahpSortProfiles: {
        mode: "limiting",
        profiles: [
          {
            profileId: "low-medium",
            lowerCategoryId: "low",
            upperCategoryId: "medium",
          },
        ],
      },
      weights: { "criterion-mongo-id": 1 },
    };
    const context = await buildDecisionContext({
      issue: {
        _id: "creation",
        model: { _id: "model-id", name: "AHPSort I", apiModelKey: "ahp_sort_i" },
        modelParameters,
      },
      structure: ahpSortAlternativeProfilesStructure,
      stage: "alternativeEvaluation",
      consensusPhase: 0,
      alternatives: [{ _id: "alternative-id", name: "Alternative" }],
      leafCriteria: [
        {
          _id: "criterion-mongo-id",
          name: "Quality",
          type: "benefit",
          expressionDomain: {
            typeKey: "numericContinuous",
            definition: { min: 0, max: 1 },
          },
        },
      ],
      criteria: [
        {
          _id: "criterion-mongo-id",
          name: "Quality",
          type: "benefit",
          position: 0,
        },
      ],
    });

    expect(context.modelParameters).toEqual(modelParameters);
    expect(context.modelParameters).not.toBe(modelParameters);
    expect(context.criteriaWeights).toEqual({ "criterion-mongo-id": 1 });
    expect(context.alternatives).toEqual([
      { id: "alternative-id", name: "Alternative" },
    ]);
    expect(context.leafCriteria[0]).toMatchObject({
      id: "criterion-mongo-id",
      name: "Quality",
      expressionDomain: {
        typeKey: "numericContinuous",
        definition: { min: 0, max: 1 },
      },
    });
  });
});
