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
