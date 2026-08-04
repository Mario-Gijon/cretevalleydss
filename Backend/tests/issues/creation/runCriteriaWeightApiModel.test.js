import { beforeEach, describe, expect, it, vi } from "vitest";

const creatorApiModelState = vi.hoisted(() => ({
  buildCreatorDecisionContext: vi.fn(),
  getEvaluationStructureOrThrow: vi.fn(),
}));

vi.mock("../../../modules/decisionPlugins/evaluations/index.js", () => ({
  getEvaluationStructureOrThrow:
    creatorApiModelState.getEvaluationStructureOrThrow,
}));

vi.mock(
  "../../../modules/issues/creation/initialCriteriaWeights/buildCreatorDecisionContext.js",
  () => ({
    buildCreatorDecisionContext:
      creatorApiModelState.buildCreatorDecisionContext,
  })
);

import {
  resolveCreatorApiCriteriaWeightingModelWeightsOrThrow,
} from "../../../modules/issues/creation/initialCriteriaWeights/runCriteriaWeightApiModel.js";

describe("creator API criteria-weighting execution", () => {
  beforeEach(() => {
    creatorApiModelState.buildCreatorDecisionContext.mockReset();
    creatorApiModelState.getEvaluationStructureOrThrow.mockReset();
  });

  it("uses one creator context for payload validation and the DMS request", async () => {
    const creatorDecisionContext = {
      issue: {
        id: null,
        name: "Issue creation",
        currentStage: "criteriaWeighting",
        consensusThreshold: null,
        consensusMaxPhases: null,
      },
      leafCriteria: [
        { id: "criterion-cost", name: "Cost", type: "cost" },
        { id: "criterion-quality", name: "Quality", type: "benefit" },
      ],
      consensus: { phase: 0 },
      structure: { key: "testCriteriaWeights", stage: "criteriaWeighting" },
    };
    const save = vi.fn(async ({ payload }) => ({ ...payload, normalized: true }));
    const structure = { key: "testCriteriaWeights", save };
    const httpClient = {
      post: vi.fn(async () => ({
        status: 200,
        data: {
          success: true,
          message: "Computed",
          data: {
            weightsByCriterion: {
              "criterion-cost": 2,
              "criterion-quality": 3,
            },
          },
        },
      })),
    };

    creatorApiModelState.buildCreatorDecisionContext.mockReturnValue(
      creatorDecisionContext
    );
    creatorApiModelState.getEvaluationStructureOrThrow.mockReturnValue(structure);

    await expect(
      resolveCreatorApiCriteriaWeightingModelWeightsOrThrow({
        payload: { selected: "input" },
        leafCriteria: creatorDecisionContext.leafCriteria,
        criteriaWeightingModel: { name: "Test criteria model" },
        criteriaWeightingRuntime: {
          criteriaWeightsStructureKey: "testCriteriaWeights",
          apiEndpoint: { path: "/criteria-weights" },
        },
        criteriaWeightingParameters: { alpha: 1 },
        decisionModelsServiceBaseUrl: "https://dms.example.test/",
        httpClient,
      })
    ).resolves.toEqual({
      "criterion-cost": 0.4,
      "criterion-quality": 0.6,
    });

    expect(creatorApiModelState.buildCreatorDecisionContext).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith({
      mode: "submit",
      payload: { selected: "input" },
      decisionContext: creatorDecisionContext,
    });
    expect(httpClient.post).toHaveBeenCalledWith(
      "https://dms.example.test/criteria-weights",
      {
        modelParameters: { alpha: 1 },
        evaluations: [
          {
            expert: {
              id: "creator",
              name: "Creator",
              email: "creator@local",
            },
            payload: { selected: "input", normalized: true },
          },
        ],
        context: {
          issue: creatorDecisionContext.issue,
          criteria: creatorDecisionContext.leafCriteria,
          consensusPhase: 0,
          previousStageResult: null,
          structure: creatorDecisionContext.structure,
        },
      }
    );
  });
});
