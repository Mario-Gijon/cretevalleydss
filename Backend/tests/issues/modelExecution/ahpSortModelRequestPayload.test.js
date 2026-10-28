import { beforeEach, describe, expect, it, vi } from "vitest";

const evaluationStructureState = vi.hoisted(() => ({
  orderedEntities: null,
}));

vi.mock("../../../modules/issues/evaluations/evaluationStructureData.js", () => ({
  getOrderedAlternativeAndCriterionNames: (...args) =>
    evaluationStructureState.orderedEntities(...args),
}));

import { buildIssueModelRequestPayload } from "../../../modules/issues/modelExecution/buildIssueModelRequestPayload.js";

const modelParameters = {
  orderedCategories: [
    { categoryId: "low", label: "Low", order: 0 },
    { categoryId: "high", label: "High", order: 1 },
  ],
  ahpSortProfiles: {
    mode: "limiting",
    profiles: [
      {
        profileId: "low-high",
        lowerCategoryId: "low",
        upperCategoryId: "high",
      },
    ],
  },
  weights: { "criterion-mongo-id": 0.75 },
};

describe("AHPSort I issue model request projection", () => {
  beforeEach(() => {
    evaluationStructureState.orderedEntities = vi.fn().mockResolvedValue({
      alternatives: [
        { _id: "alternative-mongo-id", name: "Alpha", description: null },
      ],
      criteria: [
        {
          _id: "criterion-mongo-id",
          id: "criterion-mongo-id",
          name: "Quality",
          description: null,
          type: "benefit",
          expressionDomain: { typeKey: "numericContinuous", definition: { min: 0, max: 1 } },
        },
      ],
    });
  });

  it("passes ID-keyed criterion weights and the saved evaluation contract without global transformation", async () => {
    const evaluationPayload = {
      alternativeProfileComparisons: [
        {
          alternativeId: "alternative-mongo-id",
          criterionId: "criterion-mongo-id",
          profileId: "low-high",
          alternativeToProfile: 5,
        },
      ],
      profileComparisons: [],
    };
    const issue = {
      _id: "issue-mongo-id",
      name: "AHPSort draft",
      apiModelKey: "ahp_sort_i",
      modelParameters,
      consensusThreshold: null,
      consensusMaxPhases: null,
    };
    const evaluations = [
      {
        expert: {
          _id: "expert-mongo-id",
          name: "Expert",
          email: "expert@example.test",
        },
        payload: evaluationPayload,
      },
    ];

    const request = await buildIssueModelRequestPayload({
      issue,
      structureKey: "ahpSortAlternativeProfiles",
      evaluations,
      phase: 0,
    });

    expect(request.modelParameters).toBe(modelParameters);
    expect(request.modelParameters.weights).toEqual({ "criterion-mongo-id": 0.75 });
    expect(request.evaluations).toEqual([
      {
        expert: {
          id: "expert-mongo-id",
          name: "Expert",
          email: "expert@example.test",
        },
        payload: evaluationPayload,
      },
    ]);
    expect(request.context.structure).toEqual({
      key: "ahpSortAlternativeProfiles",
      stage: "alternativeEvaluation",
    });
    expect(request.context.criteria[0].id).toBe("criterion-mongo-id");
    expect(request.context.alternatives[0].id).toBe("alternative-mongo-id");
  });

  it("sends group policy once for multi-expert requests and never adds unsupported expert weights", async () => {
    const issue = {
      _id: "issue-mongo-id",
      name: "AHPSort group draft",
      apiModelKey: "ahp_sort_i",
      modelParameters: {
        ...modelParameters,
        ahpSortGroup: { tiePolicy: "pessimistic" },
      },
    };
    const evaluations = ["expert-1", "expert-2", "expert-3"].map((id) => ({
      expert: { _id: id, name: id, email: `${id}@example.test` },
      payload: {
        alternativeProfileComparisons: [],
        profileComparisons: [],
      },
      weight: 1 / 3,
    }));

    const request = await buildIssueModelRequestPayload({
      issue,
      structureKey: "ahpSortAlternativeProfiles",
      evaluations,
      phase: 0,
      expertWeightsByExpertId: new Map(evaluations.map(({ expert }) => [expert._id, 1 / 3])),
    });

    expect(request.modelParameters.ahpSortGroup).toEqual({ tiePolicy: "pessimistic" });
    expect(request.evaluations).toHaveLength(3);
    expect(request.evaluations.map((evaluation) => Object.keys(evaluation).sort())).toEqual(
      Array.from({ length: 3 }, () => ["expert", "payload"])
    );
    expect(request.evaluations.map(({ expert }) => expert.id)).toEqual([
      "expert-1",
      "expert-2",
      "expert-3",
    ]);
  });

  it("omits optional group policy from single-expert legacy requests", async () => {
    const issue = {
      _id: "issue-mongo-id",
      name: "AHPSort single draft",
      apiModelKey: "ahp_sort_i",
      modelParameters: {
        ...modelParameters,
        ahpSortGroup: { tiePolicy: "optimistic" },
      },
    };
    const request = await buildIssueModelRequestPayload({
      issue,
      structureKey: "ahpSortAlternativeProfiles",
      evaluations: [{
        expert: { _id: "expert-1", name: "Expert", email: "expert@example.test" },
        payload: { alternativeProfileComparisons: [], profileComparisons: [] },
      }],
      phase: 0,
    });

    expect(request.modelParameters).not.toHaveProperty("ahpSortGroup");
  });
});
