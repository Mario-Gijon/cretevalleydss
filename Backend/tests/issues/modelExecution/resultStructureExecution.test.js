import { beforeEach, describe, expect, it, vi } from "vitest";

const executionState = vi.hoisted(() => ({
  executeTrackedDecisionModelRequest: vi.fn(),
}));

vi.mock("../../../modules/issues/modelExecution/executionEvidence.js", () => ({
  executeTrackedDecisionModelRequest:
    executionState.executeTrackedDecisionModelRequest,
}));

import { buildIssueModelExecutionResult } from "../../../modules/issues/modelExecution/buildIssueModelExecutionResult.js";
import { executeScenarioModel } from "../../../modules/issues/modelExecution/executeScenarioModel.js";
import { buildTargetModelRuntimeSnapshotOrThrow } from "../../../modules/issues/scenarios/validateScenarioModelCompatibility.js";

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

describe("result structure selection in model execution", () => {
  beforeEach(() => {
    executionState.executeTrackedDecisionModelRequest.mockReset();
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
          resultStructureKey: "sorting",
          resultStructureVersion: 1,
        },
        result: standardRankingResult({ resultStructureKey: "ranking" }),
        structureKey: "alternativeCriteriaMatrix",
      })
    ).toThrow("Unsupported resultStructureKey 'sorting'");
  });

  it("preserves scenario-specific options while selecting the target model structure", async () => {
    const targetRuntimeSnapshot = buildTargetModelRuntimeSnapshotOrThrow({
      apiModelKey: "scenario-model",
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

  it("keeps scenario-specific public validation messages", async () => {
    const targetRuntimeSnapshot = buildTargetModelRuntimeSnapshotOrThrow({
      apiModelKey: "scenario-model",
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
  });
});
