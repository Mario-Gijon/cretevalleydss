import { beforeEach, describe, expect, it, vi } from "vitest";

const creatorApiModelState = vi.hoisted(() => ({
  buildCreatorDecisionContext: vi.fn(),
  getEvaluationStructureOrThrow: vi.fn(),
  executeTrackedDecisionModelRequest: vi.fn(),
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
vi.mock("../../../modules/issues/modelExecution/index.js", () => ({
  executeTrackedDecisionModelRequest: creatorApiModelState.executeTrackedDecisionModelRequest,
}));

import {
  resolveCreatorApiCriteriaWeightingModelWeightsOrThrow,
} from "../../../modules/issues/creation/initialCriteriaWeights/runCriteriaWeightApiModel.js";

describe("creator API criteria-weighting execution", () => {
  beforeEach(() => {
    creatorApiModelState.buildCreatorDecisionContext.mockReset();
    creatorApiModelState.getEvaluationStructureOrThrow.mockReset();
    creatorApiModelState.executeTrackedDecisionModelRequest.mockReset();
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
    creatorApiModelState.executeTrackedDecisionModelRequest.mockImplementation(async ({ normalize }) => ({ result: await normalize({ weightsByCriterion: { "criterion-cost": 2, "criterion-quality": 3 } }), attempt: { _id: "attempt" } }));

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
        executionAttemptInput: { issue: null, scope: "issueCreation", actorType: "user", actorUser: "user", correlationId: "creation", evaluationStage: "criteriaWeighting", issueStage: "criteriaWeighting", consensusPhase: 0, modelContext: {} },
      })
    ).resolves.toMatchObject({ weights: { "criterion-cost": 0.4, "criterion-quality": 0.6 } });

    expect(creatorApiModelState.buildCreatorDecisionContext).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith({
      mode: "submit",
      payload: { selected: "input" },
      decisionContext: creatorDecisionContext,
    });
    expect(creatorApiModelState.executeTrackedDecisionModelRequest).toHaveBeenCalledWith(expect.objectContaining({
      apiEndpointPath: "/criteria-weights",
      requestPayload: {
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
      },
    }));
  });
});
