import mongoose from "mongoose";
import { beforeEach, describe, expect, it, vi } from "vitest";

const scenarioExecutionState = vi.hoisted(() => ({
  buildScenarioExecutionContext: vi.fn(),
  executeScenarioModel: vi.fn(),
}));

vi.mock("../../modules/issues/scenarios/buildScenarioExecutionContext.js", () => ({
  buildScenarioExecutionContext:
    scenarioExecutionState.buildScenarioExecutionContext,
}));

vi.mock("../../modules/issues/modelExecution/index.js", () => ({
  executeScenarioModel: scenarioExecutionState.executeScenarioModel,
}));

import { IssueScenario } from "../../models/IssueScenarios.js";
import { createIssueScenario } from "../../modules/issues/scenarios/createIssueScenario.js";
import { setupMongoDbTestHooks } from "../setup/database.js";

setupMongoDbTestHooks();

const buildMockExecutionContext = () => {
  const issueId = new mongoose.Types.ObjectId();
  const targetModelId = new mongoose.Types.ObjectId();

  return {
    issue: {
      _id: issueId,
      evaluationStructureKey: "alternativeCriteriaMatrix",
      criteriaWeightsStructureKey: "manualCriteriaWeights",
    },
    targetModel: {
      _id: targetModelId,
      name: "Target Model",
    },
    targetRuntimeSnapshot: {
      targetApiModelKey: "target-model",
      targetApiEndpoint: {
        method: "POST",
        path: "/solve-target",
      },
      targetEvaluationStructureKey: "alternativeCriteriaMatrix",
      targetSupportsConsensus: false,
    },
    requestPayload: {
      modelParameters: {},
      evaluations: [],
    },
    paramsUsed: {
      alpha: 1,
    },
    normalizedParams: {
      alpha: 1,
    },
    domainType: "numeric",
    evaluationPhase: 0,
    expertsOrder: ["expert@example.com"],
    alternatives: [
      {
        _id: new mongoose.Types.ObjectId(),
        name: "Alternative A",
      },
    ],
    criteria: [
      {
        _id: new mongoose.Types.ObjectId(),
        name: "Criterion A",
        type: "benefit",
      },
    ],
    weightsUsed: {
      "criterion-a": 1,
    },
    evaluationPayloads: [
      {
        expert: {
          id: "expert-1",
          email: "expert@example.com",
          name: "Expert User",
        },
        payload: {
          value: 1,
        },
      },
    ],
    scenarioExecutionContext: {
      issue: {
        id: String(issueId),
      },
    },
  };
};

describe("createIssueScenario input normalization", () => {
  beforeEach(() => {
    scenarioExecutionState.buildScenarioExecutionContext.mockReset();
    scenarioExecutionState.executeScenarioModel.mockReset();
  });

  it("rejects an invalid targetModelId", async () => {
    await expect(
      createIssueScenario({
        userId: new mongoose.Types.ObjectId(),
        issueId: new mongoose.Types.ObjectId(),
        targetModelId: "   ",
      })
    ).rejects.toMatchObject({
      statusCode: 400,
      field: "targetModelId",
      message: "targetModelId is required",
    });
  });

  it("rejects a non-string scenarioName", async () => {
    await expect(
      createIssueScenario({
        userId: new mongoose.Types.ObjectId(),
        issueId: new mongoose.Types.ObjectId(),
        targetModelId: "target-model-id",
        scenarioName: 123,
      })
    ).rejects.toMatchObject({
      statusCode: 400,
      field: "scenarioName",
      message: "scenarioName must be a string",
    });
  });

  it("rejects invalid paramOverrides", async () => {
    await expect(
      createIssueScenario({
        userId: new mongoose.Types.ObjectId(),
        issueId: new mongoose.Types.ObjectId(),
        targetModelId: "target-model-id",
        paramOverrides: ["invalid"],
      })
    ).rejects.toMatchObject({
      statusCode: 400,
      field: "paramOverrides",
      message: "paramOverrides must be an object",
    });
  });

  it("normalizes a blank scenarioName to an empty string before persisting", async () => {
    const userId = new mongoose.Types.ObjectId();
    const context = buildMockExecutionContext();

    scenarioExecutionState.buildScenarioExecutionContext.mockResolvedValue(context);
    scenarioExecutionState.executeScenarioModel.mockResolvedValue({
      standardResult: {
        ranking: ["Alternative A"],
      },
      modelExecution: {
        ok: true,
      },
      rawOutput: {
        raw: true,
      },
    });

    const result = await createIssueScenario({
      userId,
      issueId: String(context.issue._id),
      targetModelId: "  target-model-id  ",
      scenarioName: "   ",
      paramOverrides: null,
    });

    const storedScenario = await IssueScenario.findById(result.scenarioId).lean();

    expect(scenarioExecutionState.buildScenarioExecutionContext).toHaveBeenCalledWith({
      issueId: String(context.issue._id),
      userId,
      targetModelId: "target-model-id",
      paramOverrides: {},
    });
    expect(scenarioExecutionState.executeScenarioModel).toHaveBeenCalledWith({
      requestPayload: context.requestPayload,
      targetRuntimeSnapshot: context.targetRuntimeSnapshot,
      decisionModelsServiceBaseUrl: "http://localhost:7000",
      httpClient: expect.any(Function),
    });
    expect(storedScenario).toMatchObject({
      name: "",
      createdBy: userId,
      issue: context.issue._id,
      targetModel: context.targetModel._id,
      targetModelName: "Target Model",
      domainType: "numeric",
      status: "done",
    });
  });
});
