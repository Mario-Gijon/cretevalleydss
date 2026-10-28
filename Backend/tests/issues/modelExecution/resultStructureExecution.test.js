import { beforeEach, describe, expect, it, vi } from "vitest";

const executionState = vi.hoisted(() => ({
  executeTrackedDecisionModelRequest: vi.fn(),
  buildIssueModelRequestPayload: vi.fn(),
  buildIssueResultStructureContextOrThrow: vi.fn(),
}));

vi.mock("../../../modules/issues/modelExecution/executionEvidence.js", () => ({
  executeTrackedDecisionModelRequest:
    executionState.executeTrackedDecisionModelRequest,
}));

vi.mock("../../../modules/issues/modelExecution/buildIssueModelRequestPayload.js", () => ({
  buildIssueModelRequestPayload: executionState.buildIssueModelRequestPayload,
}));

vi.mock("../../../modules/issues/modelExecution/buildIssueResultStructureContext.js", () => ({
  buildIssueResultStructureContextOrThrow:
    executionState.buildIssueResultStructureContextOrThrow,
}));

import { buildIssueModelExecutionResult } from "../../../modules/issues/modelExecution/buildIssueModelExecutionResult.js";
import { executeAlternativeEvaluationModel } from "../../../modules/issues/modelExecution/executeIssueModels.js";
import { executeScenarioModel } from "../../../modules/issues/modelExecution/executeScenarioModel.js";
import { buildTargetModelRuntimeSnapshotOrThrow } from "../../../modules/issues/scenarios/validateScenarioModelCompatibility.js";
import {
  buildResultStructureRegistry,
  projectNormalizedResultOrThrow,
} from "../../../modules/decisionPlugins/resultStructures/resultStructureRegistry.js";

const standardRankingResult = (overrides = {}) => ({
  rankedAlternatives: [
    {
      alternativeId: "alternative-1",
      name: "Alternative A",
      score: 0.9,
      rank: 1,
    },
  ],
  collectiveEvaluations: { expertA: { value: 0.9 } },
  plotsGraphic: { scores: [0.9] },
  consensusMeasure: 0.75,
  consensusLifecycle: { phase: 1 },
  rawOutput: { source: "model" },
  ...overrides,
});

const makeUsableIssueModel = (overrides = {}) => ({
  _id: "issue-model-1",
  name: "Ranking model",
  modelKind: "issue",
  implementationStatus: "ready",
  publicUsable: true,
  issueExecutionAuthorized: true,
  visibleInIssueCreation: true,
  apiModelKey: "ranking-model",
  apiEndpoint: { method: "POST", path: "/execute" },
  evaluationStructureKey: "alternativeCriteriaMatrix",
  resultStructureKey: "ranking",
  resultStructureVersion: 1,
  supportsConsensus: false,
  supportsConsensusSimulation: false,
  usesCriteriaWeights: false,
  usesExpertWeights: false,
  usesFuzzyCriteriaWeights: false,
  usesCriterionTypes: false,
  isMultiCriteria: true,
  requiresHomogeneousExpressionDomains: false,
  ...overrides,
});

const makeIssueUsingModel = (model, overrides = {}) => ({
  _id: "issue-1",
  model,
  populated: (path) => path === "model" && model?._id ? model._id : undefined,
  apiModelKey: model?.apiModelKey ?? "ranking-model",
  apiEndpoint: model?.apiEndpoint ?? { method: "POST", path: "/execute" },
  evaluationStructureKey: model?.evaluationStructureKey ?? "alternativeCriteriaMatrix",
  resultStructureKey: model?.resultStructureKey ?? "ranking",
  resultStructureVersion: model?.resultStructureVersion ?? 1,
  supportsConsensus: model?.supportsConsensus ?? false,
  simulateConsensus: false,
  ...overrides,
});

describe("result structure selection in model execution", () => {
  beforeEach(() => {
    executionState.executeTrackedDecisionModelRequest.mockReset();
    executionState.buildIssueModelRequestPayload.mockReset();
    executionState.buildIssueResultStructureContextOrThrow.mockReset();
    executionState.buildIssueModelRequestPayload.mockResolvedValue({
      context: { alternatives: [{ id: "alternative-1" }] },
      evaluations: [],
      modelParameters: {},
    });
    executionState.buildIssueResultStructureContextOrThrow.mockResolvedValue({});
    executionState.executeTrackedDecisionModelRequest.mockImplementation(
      async ({ normalize }) => ({
        result: await normalize(standardRankingResult()),
        attempt: {
          _id: "attempt-1",
          startedAt: new Date("2026-01-01T00:00:00.000Z"),
          completedAt: new Date("2026-01-01T00:00:01.000Z"),
          durationMs: 1000,
        },
      })
    );
  });

  it("normalizes issue execution using issue metadata, with legacy ranking fallback", () => {
    const result = buildIssueModelExecutionResult({
      issue: {
        apiModelKey: "demo-model",
        apiEndpoint: { path: "/execute" },
      },
      message: "Completed",
      result: standardRankingResult(),
      structureKey: "alternativeCriteriaMatrix",
      issueUpdates: { completed: true },
      nextCurrentStage: "finished",
    });

    expect(result).toMatchObject({
      message: "Completed",
      resultStructureKey: "ranking",
      resultStructureVersion: 1,
      standardResult: {
        consensusMeasure: 0.75,
        rankedAlternatives: [
          {
            alternativeId: "alternative-1",
            name: "Alternative A",
            score: 0.9,
            rank: 1,
          },
        ],
        collectiveEvaluations: { expertA: { value: 0.9 } },
        plotsGraphic: { scores: [0.9] },
        consensusLifecycle: { phase: 1 },
        rawOutput: { source: "model" },
      },
      modelExecution: {
        kind: "decisionModelsService",
        structureKey: "alternativeCriteriaMatrix",
        apiModelKey: "demo-model",
        apiEndpointPath: "/execute",
      },
      rawOutput: { source: "model" },
      issueUpdates: { completed: true },
      nextCurrentStage: "finished",
    });
  });

  it("rejects a result structure from issue metadata even if output claims a supported key", () => {
    expect(() =>
      buildIssueModelExecutionResult({
        issue: {
          apiModelKey: "demo-model",
          apiEndpoint: { path: "/execute" },
          resultStructureKey: "unsupported-structure",
          resultStructureVersion: 1,
        },
        result: standardRankingResult({ resultStructureKey: "ranking" }),
        structureKey: "alternativeCriteriaMatrix",
      })
    ).toThrow("Unsupported resultStructureKey 'unsupported-structure'");
  });

  it("allows a populated ready model when its issueExecution capability is enabled", async () => {
    const httpClient = { post: vi.fn() };
    const issue = makeIssueUsingModel(makeUsableIssueModel());

    const result = await executeAlternativeEvaluationModel({
      issue,
      structureKey: "alternativeCriteriaMatrix",
      evaluations: [],
      phase: 0,
      decisionModelsServiceBaseUrl: "http://decision-models.test",
      httpClient,
    });

    expect(result.standardResult.rankedAlternatives[0].alternativeId).toBe(
      "alternative-1"
    );
    expect(executionState.executeTrackedDecisionModelRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        apiEndpointPath: "/execute",
        decisionModelsServiceBaseUrl: "http://decision-models.test",
      })
    );
    expect(httpClient.post).not.toHaveBeenCalled();
  });

  it("prevents individually unauthorized sorting models from reaching DecisionModelsService", async () => {
    expect(() => buildTargetModelRuntimeSnapshotOrThrow({
      apiModelKey: "sorting-contract-only",
      modelKind: "issue",
      implementationStatus: "ready",
      publicUsable: true,
      issueExecutionAuthorized: false,
      apiEndpoint: { method: "POST", path: "/sorting" },
      evaluationStructureKey: "alternativeCriteriaMatrix",
      resultStructureKey: "sorting",
      resultStructureVersion: 1,
      supportsConsensus: false,
    })).toThrow("not authorized for issue execution");

    const sortingModel = makeUsableIssueModel({
      apiModelKey: "sorting-contract-only",
      issueExecutionAuthorized: false,
      apiEndpoint: { method: "POST", path: "/sorting" },
      resultStructureKey: "sorting",
      resultStructureVersion: 1,
    });
    await expect(executeAlternativeEvaluationModel({
      issue: makeIssueUsingModel(sortingModel),
    })).rejects.toThrow("not authorized for issue execution");
    expect(executionState.executeTrackedDecisionModelRequest).not.toHaveBeenCalled();

    await expect(executeScenarioModel({
      requestPayload: { context: { alternatives: [] } },
      targetRuntimeSnapshot: {
        issueExecutionAuthorized: false,
        targetResultStructureKey: "sorting",
        targetResultStructureVersion: 1,
      },
    })).rejects.toThrow("not authorized for issue execution");
    expect(executionState.executeTrackedDecisionModelRequest).not.toHaveBeenCalled();
  });

  it("keeps scaffold AHPSort I from reaching DecisionModelsService even with a historical Issue", async () => {
    const httpClient = { post: vi.fn() };
    const scaffoldAHPSortModel = makeUsableIssueModel({
      _id: "ahpsort-scaffold-model",
      apiModelKey: "ahp_sort_i",
      apiEndpoint: { method: "POST", path: "/ahp_sort_i" },
      evaluationStructureKey: "ahpSortAlternativeProfiles",
      resultStructureKey: "sorting",
      resultStructureVersion: 1,
      implementationStatus: "scaffold",
      publicUsable: false,
      issueExecutionAuthorized: false,
      usesCriteriaWeights: true,
    });

    await expect(executeAlternativeEvaluationModel({
      issue: makeIssueUsingModel(scaffoldAHPSortModel),
      structureKey: "ahpSortAlternativeProfiles",
      evaluations: [{ payload: { alternativeProfileComparisons: [], profileComparisons: [] } }],
      phase: 0,
      httpClient,
    })).rejects.toMatchObject({
      code: "ISSUE_MODEL_NOT_USABLE",
      field: "resultStructureKey",
    });

    expect(executionState.buildIssueModelRequestPayload).not.toHaveBeenCalled();
    expect(executionState.executeTrackedDecisionModelRequest).not.toHaveBeenCalled();
    expect(httpClient.post).not.toHaveBeenCalled();
  });

  it("rejects AHPSort I with no completed evaluations before building or sending a request", async () => {
    const model = makeUsableIssueModel({
      apiModelKey: "ahp_sort_i",
      apiEndpoint: { method: "POST", path: "/ahp_sort_i" },
      evaluationStructureKey: "ahpSortAlternativeProfiles",
      resultStructureKey: "sorting",
      resultStructureVersion: 1,
      usesCriteriaWeights: true,
    });
    const httpClient = { post: vi.fn() };

    await expect(executeAlternativeEvaluationModel({
      issue: makeIssueUsingModel(model),
      structureKey: "ahpSortAlternativeProfiles",
      evaluations: [],
      phase: 0,
      httpClient,
    })).rejects.toMatchObject({
      code: "AHPSORT_I_EXPERT_EVALUATION_REQUIRED",
      field: "evaluations",
      details: {
        minimumEvaluationCount: 1,
        receivedEvaluationCount: 0,
      },
    });

    expect(executionState.buildIssueModelRequestPayload).not.toHaveBeenCalled();
    expect(executionState.executeTrackedDecisionModelRequest).not.toHaveBeenCalled();
    expect(httpClient.post).not.toHaveBeenCalled();
  });

  it("rejects missing AHPSort I evaluation arrays before building or sending a request", async () => {
    const model = makeUsableIssueModel({
      apiModelKey: "ahp_sort_i",
      apiEndpoint: { method: "POST", path: "/ahp_sort_i" },
      evaluationStructureKey: "ahpSortAlternativeProfiles",
      resultStructureKey: "sorting",
      resultStructureVersion: 1,
      usesCriteriaWeights: true,
    });
    const httpClient = { post: vi.fn() };

    await expect(executeAlternativeEvaluationModel({
      issue: makeIssueUsingModel(model),
      structureKey: "ahpSortAlternativeProfiles",
      phase: 0,
      httpClient,
    })).rejects.toMatchObject({
      code: "AHPSORT_I_EXPERT_EVALUATION_REQUIRED",
      field: "evaluations",
      details: {
        minimumEvaluationCount: 1,
        receivedEvaluationCount: null,
      },
    });

    expect(executionState.buildIssueModelRequestPayload).not.toHaveBeenCalled();
    expect(executionState.executeTrackedDecisionModelRequest).not.toHaveBeenCalled();
    expect(httpClient.post).not.toHaveBeenCalled();
  });

  it("allows one AHPSort I evaluation through the Backend request boundary", async () => {
    const categories = [
      { categoryId: "low", label: "Low", order: 0 },
      { categoryId: "high", label: "High", order: 1 },
    ];
    const model = makeUsableIssueModel({
      apiModelKey: "ahp_sort_i",
      apiEndpoint: { method: "POST", path: "/ahp_sort_i" },
      evaluationStructureKey: "ahpSortAlternativeProfiles",
      resultStructureKey: "sorting",
      resultStructureVersion: 1,
      usesCriteriaWeights: true,
    });
    const modelParameters = {
      orderedCategories: categories,
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
      weights: { "criterion-1": 1 },
    };
    const evaluation = {
      expert: {
        _id: "expert-1",
        name: "Expert One",
        email: "expert-1@example.test",
      },
      payload: {
        alternativeProfileComparisons: [
          {
            alternativeId: "alternative-1",
            criterionId: "criterion-1",
            profileId: "low-high",
            alternativeToProfile: 3,
          },
        ],
        profileComparisons: [],
      },
    };
    executionState.buildIssueModelRequestPayload.mockResolvedValue({
      context: { alternatives: [{ id: "alternative-1" }] },
      evaluations: [evaluation],
      modelParameters,
    });
    executionState.buildIssueResultStructureContextOrThrow.mockResolvedValue({
      authorizedCategories: categories,
    });
    executionState.executeTrackedDecisionModelRequest.mockImplementation(
      async ({ normalize }) => ({
        result: await normalize({
          categories,
          categoryOrderSemantics: "lower-order-is-less-preferred",
          assignments: [
            { alternativeId: "alternative-1", categoryId: "high" },
          ],
          diagnostics: { modelKey: "ahp_sort_i", profileMode: "limiting" },
        }),
        attempt: { _id: "ahpsort-attempt-1" },
      })
    );

    const result = await executeAlternativeEvaluationModel({
      issue: makeIssueUsingModel(model),
      structureKey: "ahpSortAlternativeProfiles",
      evaluations: [evaluation],
      phase: 0,
      httpClient: { post: vi.fn() },
    });

    expect(executionState.buildIssueModelRequestPayload).toHaveBeenCalledWith(
      expect.objectContaining({ evaluations: [evaluation] })
    );
    expect(result.standardResult.assignments).toEqual([
      { alternativeId: "alternative-1", categoryId: "high" },
    ]);
    expect(result.standardResult.diagnostics.profileMode).toBe("limiting");
  });

  it("allows a multi-expert AHPSort I request only with an explicit valid group policy", async () => {
    const categories = [
      { categoryId: "low", label: "Low", order: 0 },
      { categoryId: "high", label: "High", order: 1 },
    ];
    const model = makeUsableIssueModel({
      apiModelKey: "ahp_sort_i",
      apiEndpoint: { method: "POST", path: "/ahp_sort_i" },
      evaluationStructureKey: "ahpSortAlternativeProfiles",
      resultStructureKey: "sorting",
      resultStructureVersion: 1,
      usesCriteriaWeights: true,
    });
    const modelParameters = { ahpSortGroup: { tiePolicy: "optimistic" } };
    const evaluations = ["expert-1", "expert-2", "expert-3", "expert-4"].map(
      (id) => ({
        expert: { _id: id, name: id, email: `${id}@example.test` },
        payload: { alternativeProfileComparisons: [], profileComparisons: [] },
      })
    );
    executionState.buildIssueModelRequestPayload.mockResolvedValue({
      context: { alternatives: [{ id: "alternative-1" }] },
      evaluations: evaluations.map(({ expert, payload }) => ({
        expert: { id: expert._id, name: expert.name, email: expert.email },
        payload,
      })),
      modelParameters,
    });
    executionState.buildIssueResultStructureContextOrThrow.mockResolvedValue({
      authorizedCategories: categories,
    });
    executionState.executeTrackedDecisionModelRequest.mockImplementation(
      async ({ normalize }) => ({
        result: await normalize({
          categories,
          categoryOrderSemantics: "lower-order-is-less-preferred",
          assignments: [{ alternativeId: "alternative-1", categoryId: "low" }],
          diagnostics: { aggregationMethod: "unweighted_plurality_vote" },
        }),
        attempt: { _id: "ahpsort-group-attempt" },
      })
    );

    await executeAlternativeEvaluationModel({
      issue: makeIssueUsingModel(model, { modelParameters }),
      structureKey: "ahpSortAlternativeProfiles",
      evaluations,
      phase: 0,
      httpClient: { post: vi.fn() },
    });

    expect(executionState.buildIssueModelRequestPayload).toHaveBeenCalledWith(
      expect.objectContaining({ evaluations })
    );
    expect(executionState.executeTrackedDecisionModelRequest).toHaveBeenCalledOnce();
  });

  it("rejects multi-expert AHPSort I scenario replays without a group policy before sending a request", async () => {
    const httpClient = { post: vi.fn() };
    const targetRuntimeSnapshot = {
      issueExecutionAuthorized: true,
      targetApiModelKey: "ahp_sort_i",
      targetApiEndpoint: { method: "POST", path: "/ahp_sort_i" },
      targetEvaluationStructureKey: "ahpSortAlternativeProfiles",
      targetResultStructureKey: "sorting",
      targetResultStructureVersion: 1,
    };
    const requestPayload = {
      context: { alternatives: [{ id: "alternative-1" }] },
      evaluations: [
        { expert: { id: "expert-1" }, payload: { alternativeProfileComparisons: [], profileComparisons: [] } },
        { expert: { id: "expert-2" }, payload: { alternativeProfileComparisons: [], profileComparisons: [] } },
      ],
    };

    await expect(executeScenarioModel({
      requestPayload,
      targetRuntimeSnapshot,
      httpClient,
    })).rejects.toMatchObject({
      code: "AHPSORT_I_GROUP_POLICY_REQUIRED",
      field: "modelParameters.ahpSortGroup",
    });

    expect(executionState.executeTrackedDecisionModelRequest).not.toHaveBeenCalled();
    expect(httpClient.post).not.toHaveBeenCalled();
  });

  it("allows an AHPSort I scenario replay with an explicit group policy and without expert weights", async () => {
    const categories = [
      { categoryId: "low", label: "Low", order: 0 },
      { categoryId: "high", label: "High", order: 1 },
    ];
    const targetRuntimeSnapshot = {
      issueExecutionAuthorized: true,
      targetApiModelKey: "ahp_sort_i",
      targetApiEndpoint: { method: "POST", path: "/ahp_sort_i" },
      targetEvaluationStructureKey: "ahpSortAlternativeProfiles",
      targetResultStructureKey: "sorting",
      targetResultStructureVersion: 1,
    };
    const requestPayload = {
      modelParameters: { ahpSortGroup: { tiePolicy: "pessimistic" } },
      context: { alternatives: [{ id: "alternative-1" }] },
      evaluations: ["expert-1", "expert-2"].map((id) => ({
        expert: { id, name: id, email: `${id}@example.test` },
        payload: { alternativeProfileComparisons: [], profileComparisons: [] },
      })),
    };
    executionState.executeTrackedDecisionModelRequest.mockImplementation(
      async ({ normalize }) => ({
        result: await normalize({
          categories,
          categoryOrderSemantics: "lower-order-is-less-preferred",
          assignments: [{ alternativeId: "alternative-1", categoryId: "low" }],
          diagnostics: {
            aggregationMethod: "unweighted_plurality_vote",
            groupTiePolicy: "pessimistic",
          },
        }),
        attempt: { _id: "ahpsort-scenario-attempt" },
      })
    );

    const result = await executeScenarioModel({
      requestPayload,
      targetRuntimeSnapshot,
      resultStructureContext: { authorizedCategories: categories },
      decisionModelsServiceBaseUrl: "http://decision-models.test",
      httpClient: { post: vi.fn() },
      executionAttemptInput: {},
    });

    expect(executionState.executeTrackedDecisionModelRequest).toHaveBeenCalledWith(
      expect.objectContaining({ requestPayload })
    );
    expect(requestPayload.evaluations).toHaveLength(2);
    expect(requestPayload.evaluations.map((evaluation) => Object.keys(evaluation).sort())).toEqual(
      Array.from({ length: 2 }, () => ["expert", "payload"])
    );
    expect(result.standardResult.diagnostics).toEqual({
      aggregationMethod: "unweighted_plurality_vote",
      groupTiePolicy: "pessimistic",
    });
  });

  it("blocks unauthorized Decision Plugins in issue and scenario execution before dispatch", async () => {
    const httpClient = { post: vi.fn() };
    const unauthorizedModel = makeUsableIssueModel({
      apiModelKey: "synthetic-sorting-plugin",
      issueExecutionAuthorized: false,
      resultStructureKey: "sorting",
      resultStructureVersion: 1,
    });

    await expect(executeAlternativeEvaluationModel({
      issue: makeIssueUsingModel(unauthorizedModel),
      httpClient,
    })).rejects.toMatchObject({
      code: "ISSUE_MODEL_EXECUTION_NOT_AUTHORIZED",
    });
    expect(executionState.buildIssueModelRequestPayload).not.toHaveBeenCalled();
    expect(executionState.executeTrackedDecisionModelRequest).not.toHaveBeenCalled();
    expect(httpClient.post).not.toHaveBeenCalled();

    expect(() => buildTargetModelRuntimeSnapshotOrThrow(unauthorizedModel)).toThrow(
      expect.objectContaining({
        code: "ISSUE_MODEL_EXECUTION_NOT_AUTHORIZED",
      })
    );
    await expect(executeScenarioModel({
      requestPayload: { context: { alternatives: [] } },
      targetRuntimeSnapshot: {
        issueExecutionAuthorized: false,
        targetResultStructureKey: "sorting",
        targetResultStructureVersion: 1,
      },
      httpClient,
    })).rejects.toMatchObject({
      code: "ISSUE_MODEL_EXECUTION_NOT_AUTHORIZED",
    });
    expect(executionState.executeTrackedDecisionModelRequest).not.toHaveBeenCalled();
    expect(httpClient.post).not.toHaveBeenCalled();
  });

  it("blocks scaffold, non-public, and stale models despite visibility metadata", async () => {
    const blockedModels = [
      makeUsableIssueModel({
        _id: "scaffold-model-id",
        implementationStatus: "scaffold",
        publicUsable: true,
        visibleInIssueCreation: true,
      }),
      makeUsableIssueModel({
        _id: "non-public-model-id",
        implementationStatus: "ready",
        publicUsable: false,
        visibleInIssueCreation: true,
      }),
      makeUsableIssueModel({
        _id: "stale-model-id",
        manifestSync: { source: "DecisionModelsService", isStale: true },
      }),
    ];

    for (const model of blockedModels) {
      await expect(executeAlternativeEvaluationModel({
        issue: makeIssueUsingModel(model),
      })).rejects.toMatchObject({
        code: "ISSUE_MODEL_NOT_USABLE",
        field: "resultStructureKey",
      });
    }
    expect(executionState.executeTrackedDecisionModelRequest).not.toHaveBeenCalled();

    expect(() => buildTargetModelRuntimeSnapshotOrThrow({
      _id: "scenario-scaffold-model-id",
      implementationStatus: "scaffold",
      publicUsable: false,
      apiModelKey: "scaffold-model",
      apiEndpoint: { method: "POST", path: "/execute" },
      evaluationStructureKey: "alternativeCriteriaMatrix",
      resultStructureKey: "ranking",
      resultStructureVersion: 1,
      supportsConsensus: false,
    })).toThrow("not ready for issue execution");
  });

  it("fails closed for an unpopulated, missing, or unresolved model reference", async () => {
    const unpopulatedIssue = makeIssueUsingModel("issue-model-1", {
      populated: () => undefined,
    });
    const missingModelIssues = [
      makeIssueUsingModel(null),
      makeIssueUsingModel(undefined),
    ];

    for (const issue of [unpopulatedIssue, ...missingModelIssues]) {
      await expect(executeAlternativeEvaluationModel({ issue })).rejects.toMatchObject({
        code: "ISSUE_MODEL_NOT_USABLE",
        field: "resultStructureKey",
      });
    }
    expect(executionState.executeTrackedDecisionModelRequest).not.toHaveBeenCalled();
    expect(executionState.buildIssueModelRequestPayload).not.toHaveBeenCalled();
  });

  it("blocks models with incomplete runtime metadata before dispatch", async () => {
    const model = makeUsableIssueModel({ apiModelKey: "" });

    await expect(executeAlternativeEvaluationModel({
      issue: makeIssueUsingModel(model),
    })).rejects.toThrow("apiModelKey must be a non-empty string");

    expect(executionState.executeTrackedDecisionModelRequest).not.toHaveBeenCalled();
    expect(executionState.buildIssueModelRequestPayload).not.toHaveBeenCalled();
  });

  it("blocks when persisted issue runtime metadata no longer matches its loaded model", async () => {
    const model = makeUsableIssueModel();

    await expect(executeAlternativeEvaluationModel({
      issue: makeIssueUsingModel(model, { apiEndpoint: { method: "POST", path: "/stale" } }),
    })).rejects.toMatchObject({
      code: "ISSUE_MODEL_RUNTIME_MISMATCH",
      field: "modelId",
      details: { mismatchedFields: ["apiEndpoint.path"] },
    });

    expect(executionState.executeTrackedDecisionModelRequest).not.toHaveBeenCalled();
    expect(executionState.buildIssueModelRequestPayload).not.toHaveBeenCalled();
  });

  it("rejects partial result-structure metadata on the issue before dispatch", async () => {
    const model = makeUsableIssueModel();

    await expect(executeAlternativeEvaluationModel({
      issue: makeIssueUsingModel(model, { resultStructureVersion: undefined }),
    })).rejects.toMatchObject({
      code: "ISSUE_MODEL_RUNTIME_MISMATCH",
      field: "modelId",
      details: { mismatchedFields: ["resultStructure"] },
    });

    expect(executionState.executeTrackedDecisionModelRequest).not.toHaveBeenCalled();
    expect(executionState.buildIssueModelRequestPayload).not.toHaveBeenCalled();
  });

  it("transports and projects a synthetic result structure without ranking fields", () => {
    const resultStructureRegistry = buildResultStructureRegistry([
      {
        key: "clusterSummary",
        version: 3,
        validateAndNormalize: ({ result }) => ({
          clusters: result.clusters,
          summary: result.summary,
          rawOutput: result.rawOutput,
        }),
        projectNormalizedResult: ({ result, target }) => {
          if (target === "stagePersistence") {
            return {
              clusters: result.clusters,
              summary: result.summary,
              rawOutput: result.rawOutput,
            };
          }
          if (target === "executionResponse") {
            return { clusters: result.clusters, summary: result.summary };
          }
          throw new TypeError(`Unsupported projection '${target}'`);
        },
      },
    ]);
    const result = buildIssueModelExecutionResult({
      issue: {
        apiModelKey: "cluster-model",
        apiEndpoint: { path: "/execute" },
        resultStructureKey: "clusterSummary",
        resultStructureVersion: 3,
      },
      result: {
        clusters: [{ alternativeIds: ["a", "b"] }],
        summary: { count: 2 },
        rawOutput: { trace: [1, 2] },
      },
      structureKey: "clusterEvaluation",
      resultStructureRegistry,
    });

    expect(result).toMatchObject({
      resultStructureKey: "clusterSummary",
      resultStructureVersion: 3,
      standardResult: {
        clusters: [{ alternativeIds: ["a", "b"] }],
        summary: { count: 2 },
        rawOutput: { trace: [1, 2] },
      },
      rawOutput: { trace: [1, 2] },
    });
    expect(result.standardResult).not.toHaveProperty("rankedAlternatives");
    expect(
      projectNormalizedResultOrThrow({
        resultStructureKey: "clusterSummary",
        resultStructureVersion: 3,
        result: result.standardResult,
        target: "stagePersistence",
        registry: resultStructureRegistry,
      })
    ).toEqual(result.standardResult);
    expect(
      projectNormalizedResultOrThrow({
        resultStructureKey: "clusterSummary",
        resultStructureVersion: 3,
        result: result.standardResult,
        target: "executionResponse",
        registry: resultStructureRegistry,
      })
    ).toEqual({
      clusters: [{ alternativeIds: ["a", "b"] }],
      summary: { count: 2 },
    });
  });

  it("preserves scenario-specific options while selecting the target model structure", async () => {
    const targetRuntimeSnapshot = buildTargetModelRuntimeSnapshotOrThrow({
      apiModelKey: "scenario-model",
      modelKind: "issue",
      implementationStatus: "ready",
      publicUsable: true,
      issueExecutionAuthorized: true,
      apiEndpoint: { method: "POST", path: "/scenario" },
      evaluationStructureKey: "alternativeCriteriaMatrix",
    });
    executionState.executeTrackedDecisionModelRequest.mockImplementation(
      async ({ normalize }) => ({
        result: await normalize({
          rankedAlternatives: [
            { alternativeId: 42, name: "Second", score: 0.5, rank: 2 },
            { alternativeId: 41, name: "First", score: 0.9, rank: 1 },
          ],
          collectiveEvaluations: {},
          plotsGraphic: {},
          consensusMeasure: null,
          rawOutput: {},
          resultStructureKey: "untrusted-output-value",
        }),
        attempt: {
          _id: "scenario-attempt",
          startedAt: new Date("2026-01-01T00:00:00.000Z"),
          completedAt: new Date("2026-01-01T00:00:01.000Z"),
          durationMs: 1000,
        },
      })
    );

    const result = await executeScenarioModel({
      requestPayload: {},
      targetRuntimeSnapshot,
      decisionModelsServiceBaseUrl: "http://decision-models.test",
      httpClient: {},
      executionAttemptInput: {},
    });

    expect(targetRuntimeSnapshot).toMatchObject({
      issueExecutionAuthorized: true,
      targetResultStructureKey: "ranking",
      targetResultStructureVersion: 1,
    });
    expect(result.standardResult).toEqual({
      rankedAlternatives: [
        { alternativeId: 42, name: "Second", score: 0.5, rank: 2 },
        { alternativeId: 41, name: "First", score: 0.9, rank: 1 },
      ],
      collectiveEvaluations: {},
      plotsGraphic: {},
      consensusMeasure: null,
      consensusLifecycle: null,
      rawOutput: {},
    });
    expect(result.standardResult).not.toHaveProperty("resultStructureKey");
  });

  it("preserves arbitrary normalized scenario data and records trusted metadata", async () => {
    const resultStructureRegistry = buildResultStructureRegistry([
      {
        key: "clusterSummary",
        version: 3,
        validateAndNormalize: ({ result }) => ({
          clusterMap: result.clusterMap,
          summary: result.summary,
        }),
      },
    ]);
    const modelOutput = {
      clusterMap: { a: "group-1", b: "group-1" },
      summary: { count: 2 },
      resultStructureKey: "untrusted",
      resultStructureVersion: 999,
    };
    let executionAttemptResult;
    executionState.executeTrackedDecisionModelRequest.mockImplementation(
      async ({ normalize }) => {
        executionAttemptResult = await normalize(modelOutput);
        return {
          result: executionAttemptResult,
          attempt: {
            _id: "scenario-attempt",
            startedAt: new Date("2026-01-01T00:00:00.000Z"),
            completedAt: new Date("2026-01-01T00:00:01.000Z"),
            durationMs: 1000,
          },
        };
      }
    );
    const result = await executeScenarioModel({
      requestPayload: {},
      targetRuntimeSnapshot: {
        targetApiModelKey: "cluster-model",
        targetApiEndpoint: { path: "/scenario" },
        targetEvaluationStructureKey: "alternativeCriteriaMatrix",
        issueExecutionAuthorized: true,
        targetResultStructureKey: "clusterSummary",
        targetResultStructureVersion: 3,
      },
      decisionModelsServiceBaseUrl: "http://decision-models.test",
      httpClient: {},
      executionAttemptInput: {},
      resultStructureRegistry,
    });

    expect(executionAttemptResult).toEqual({
      resultStructureKey: "clusterSummary",
      resultStructureVersion: 3,
      standardResult: {
        clusterMap: { a: "group-1", b: "group-1" },
        summary: { count: 2 },
      },
      rawOutput: modelOutput,
    });
    expect(result).toMatchObject({
      resultStructureKey: "clusterSummary",
      resultStructureVersion: 3,
      standardResult: {
        clusterMap: { a: "group-1", b: "group-1" },
        summary: { count: 2 },
      },
      rawOutput: modelOutput,
    });
    expect(result.standardResult).not.toHaveProperty("rankedAlternatives");
  });

  it("keeps scenario-specific public validation messages", async () => {
    const targetRuntimeSnapshot = buildTargetModelRuntimeSnapshotOrThrow({
      apiModelKey: "scenario-model",
      modelKind: "issue",
      implementationStatus: "ready",
      publicUsable: true,
      issueExecutionAuthorized: true,
      apiEndpoint: { method: "POST", path: "/scenario" },
      evaluationStructureKey: "alternativeCriteriaMatrix",
    });
    executionState.executeTrackedDecisionModelRequest.mockImplementation(
      async ({ normalize }) => ({ result: await normalize(null) })
    );

    await expect(
      executeScenarioModel({
        requestPayload: {},
        targetRuntimeSnapshot,
        decisionModelsServiceBaseUrl: "http://decision-models.test",
        httpClient: {},
        executionAttemptInput: {},
      })
    ).rejects.toMatchObject({
      message: "Scenario model execution result is required",
      field: "result",
    });

    executionState.executeTrackedDecisionModelRequest.mockImplementation(
      async ({ normalize }) => ({
        result: await normalize({
          rankedAlternatives: [],
          collectiveEvaluations: {},
          plotsGraphic: {},
          consensusMeasure: null,
          rawOutput: {},
        }),
      })
    );
    await expect(
      executeScenarioModel({
        requestPayload: {},
        targetRuntimeSnapshot,
        decisionModelsServiceBaseUrl: "http://decision-models.test",
        httpClient: {},
        executionAttemptInput: {},
      })
    ).rejects.toMatchObject({
      message:
        "Scenario model execution result.rankedAlternatives must be a non-empty array",
      field: "result.rankedAlternatives",
    });
  });
});
