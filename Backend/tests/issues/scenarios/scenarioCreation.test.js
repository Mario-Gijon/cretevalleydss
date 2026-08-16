import mongoose from "mongoose";
import { beforeEach, describe, expect, it, vi } from "vitest";

const scenarioExecutionState = vi.hoisted(() => ({
  buildScenarioExecutionContext: vi.fn(),
  discoverScenarioReplayPhasesOrThrow: vi.fn(),
  executeScenarioModel: vi.fn(),
  markExecutionApplied: vi.fn(),
  markExecutionApplicationFailed: vi.fn(),
}));

vi.mock("../../../modules/issues/scenarios/buildScenarioExecutionContext.js", () => ({
  buildScenarioExecutionContext:
    scenarioExecutionState.buildScenarioExecutionContext,
}));

vi.mock("../../../modules/issues/scenarios/loadScenarioEvaluationData.js", () => ({
  discoverScenarioReplayPhasesOrThrow:
    scenarioExecutionState.discoverScenarioReplayPhasesOrThrow,
}));

vi.mock("../../../modules/issues/modelExecution/index.js", () => ({
  executeScenarioModel: scenarioExecutionState.executeScenarioModel,
  markExecutionApplied: scenarioExecutionState.markExecutionApplied,
  markExecutionApplicationFailed: scenarioExecutionState.markExecutionApplicationFailed,
}));

import { createIssueScenario } from "../../../modules/issues/scenarios/createIssueScenario.js";
import { buildScenarioParametersOrThrow } from "../../../modules/issues/scenarios/resolveScenarioModelParameters.js";
import { setupMongoDbTestHooks } from "../../setup/database.js";

setupMongoDbTestHooks();

const buildMockExecutionContext = () => {
  const issueId = new mongoose.Types.ObjectId();
  const targetModelId = new mongoose.Types.ObjectId();

  return {
    issue: {
      _id: issueId,
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
    domainType: "numeric",
    evaluationPhase: 0,
    stageResultId: new mongoose.Types.ObjectId(),
    requestPayload: {
      modelParameters: { alpha: 1 },
      evaluations: [
        {
          expert: { id: "expert-1" },
          payload: { alternative1: { criterion1: 1 } },
        },
      ],
      context: { issue: { id: String(issueId) }, consensusPhase: 0 },
    },
  };
};

const buildIntervalParameter = (overrides = {}) => ({
  key: "agreement",
  label: "Agreement interval",
  parameterStructureKey: "intervalGlobal",
  required: true,
  default: [0.3, 0.8],
  restrictions: { min: 0, max: 1, ordered: "strictIncreasing" },
  ...overrides,
});

const buildIntervalScenarioModel = (parameter = buildIntervalParameter()) => ({
  name: "Interval model",
  parameters: [parameter],
  usesCriteriaWeights: false,
});

describe("createIssueScenario input normalization", () => {
  beforeEach(() => {
    scenarioExecutionState.buildScenarioExecutionContext.mockReset();
    scenarioExecutionState.discoverScenarioReplayPhasesOrThrow.mockReset();
    scenarioExecutionState.discoverScenarioReplayPhasesOrThrow.mockResolvedValue([0]);
    scenarioExecutionState.executeScenarioModel.mockReset();
    scenarioExecutionState.markExecutionApplied.mockReset();
    scenarioExecutionState.markExecutionApplicationFailed.mockReset();
  });

  it("returns only normalized parameters and resolved weights", () => {
    const result = buildScenarioParametersOrThrow({
      targetModel: { name: "Parameter-free model", parameters: [], usesCriteriaWeights: false },
      paramOverrides: {},
      criteria: [],
      alternatives: [],
    });

    expect(result).toEqual({ normalizedParams: {}, weightsUsed: null });
    expect(result).not.toHaveProperty("paramsUsed");
  });

  it("normalizes raw interval drafts through the registered Backend structure", () => {
    expect(
      buildScenarioParametersOrThrow({
        targetModel: buildIntervalScenarioModel(),
        paramOverrides: { agreement: ["0.125", "0.987654"] },
        criteria: [],
        alternatives: [],
      })
    ).toEqual({
      normalizedParams: { agreement: [0.125, 0.987654] },
      weightsUsed: null,
    });
  });

  it("rejects reversed strict-increasing intervals through the Backend structure", () => {
    expect(() =>
      buildScenarioParametersOrThrow({
        targetModel: buildIntervalScenarioModel(),
        paramOverrides: { agreement: [0.8, 0.3] },
        criteria: [],
        alternatives: [],
      })
    ).toThrow("agreement must satisfy ordered rule 'strictIncreasing'");
  });

  it("uses declared defaults and preserves required or optional omission semantics", () => {
    expect(
      buildScenarioParametersOrThrow({
        targetModel: buildIntervalScenarioModel(),
        paramOverrides: {},
        criteria: [],
        alternatives: [],
      }).normalizedParams
    ).toEqual({ agreement: [0.3, 0.8] });

    const requiredWithoutDefault = buildIntervalParameter();
    delete requiredWithoutDefault.default;
    expect(() =>
      buildScenarioParametersOrThrow({
        targetModel: buildIntervalScenarioModel(requiredWithoutDefault),
        paramOverrides: {},
        criteria: [],
        alternatives: [],
      })
    ).toThrow("agreement is required");

    const optionalWithoutDefault = buildIntervalParameter({ required: false });
    delete optionalWithoutDefault.default;
    expect(
      buildScenarioParametersOrThrow({
        targetModel: buildIntervalScenarioModel(optionalWithoutDefault),
        paramOverrides: {},
        criteria: [],
        alternatives: [],
      }).normalizedParams
    ).toEqual({});
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
        scenarioName: "Invalid parameters",
        scenarioDescription: "A valid description",
        paramOverrides: ["invalid"],
      })
    ).rejects.toMatchObject({
      statusCode: 400,
      field: "paramOverrides",
      message: "paramOverrides must be an object",
    });
  });

  it("requires a non-blank scenarioName", async () => {
    await expect(
      createIssueScenario({
        userId: new mongoose.Types.ObjectId(),
        issueId: new mongoose.Types.ObjectId(),
        targetModelId: "target-model-id",
        scenarioName: "   ",
      })
    ).rejects.toMatchObject({
      statusCode: 400,
      field: "scenarioName",
      message: "scenarioName is required",
    });
  });

  it("normalizes optional scenario descriptions while retaining type and length validation", async () => {
    const input = {
      userId: new mongoose.Types.ObjectId(),
      issueId: new mongoose.Types.ObjectId(),
      targetModelId: "target-model-id",
      scenarioName: "Valid name",
    };

    const context = buildMockExecutionContext();
    scenarioExecutionState.buildScenarioExecutionContext.mockResolvedValue(context);
    scenarioExecutionState.executeScenarioModel.mockResolvedValue({ standardResult: {}, modelExecution: {}, rawOutput: {}, executionAttempt: { _id: new mongoose.Types.ObjectId(), startedAt: new Date(), completedAt: new Date() } });

    for (const scenarioDescription of [undefined, null, "", "   "]) {
      await createIssueScenario({ ...input, scenarioDescription });
    }

    const { IssueScenario } = await import("../../../models/IssueScenarios.js");
    expect((await IssueScenario.find().lean()).map((scenario) => scenario.description)).toEqual(["", "", "", ""]);
    await expect(createIssueScenario({ ...input, scenarioDescription: 42 })).rejects.toMatchObject({ field: "scenarioDescription", message: "scenarioDescription must be a string" });
    await expect(createIssueScenario({ ...input, scenarioDescription: "x".repeat(321) })).rejects.toMatchObject({ field: "scenarioDescription", message: "scenarioDescription must not exceed 320 characters" });
  });

  it("replays every discovered phase and persists one aggregate scenario", async () => {
    const userId = new mongoose.Types.ObjectId();
    const generateAnalysis = vi.fn().mockRejectedValue(new Error("Analysis unavailable"));
    const context = buildMockExecutionContext();
    scenarioExecutionState.discoverScenarioReplayPhasesOrThrow.mockResolvedValue([0, 2]);
    scenarioExecutionState.buildScenarioExecutionContext.mockImplementation(async ({ phase }) => ({ ...context, evaluationPhase: phase }));
    scenarioExecutionState.executeScenarioModel.mockResolvedValue({
      standardResult: { ranking: ["Alternative A"] },
      modelExecution: { ok: true },
      rawOutput: { raw: true },
      executionAttempt: { _id: new mongoose.Types.ObjectId(), startedAt: new Date(), completedAt: new Date() },
    });

    await createIssueScenario({
      userId,
      issueId: String(context.issue._id),
      targetModelId: "  target-model-id  ",
      scenarioName: "Historical run",
      scenarioDescription: "  Replays the stored phase.  ",
      paramOverrides: { alpha: 0.4 },
      generateAnalysis,
    });

    expect(scenarioExecutionState.buildScenarioExecutionContext).toHaveBeenNthCalledWith(1, {
      issueId: String(context.issue._id),
      userId,
      targetModelId: "target-model-id",
      phase: 0,
      paramOverrides: { alpha: 0.4 },
    });
    expect(scenarioExecutionState.buildScenarioExecutionContext).toHaveBeenNthCalledWith(2, expect.objectContaining({ phase: 2 }));
    const { IssueScenario } = await import("../../../models/IssueScenarios.js");
    const scenario = await IssueScenario.findOne().lean();
    const executionRequest =
      scenarioExecutionState.executeScenarioModel.mock.calls[0][0].requestPayload;

    expect(executionRequest).toEqual(scenario.phaseResults[0].requestSnapshot);
    expect(executionRequest).not.toBe(context.requestPayload);
    expect(scenario).toMatchObject({
      description: "Replays the stored phase.",
      config: { parameterOverrides: { alpha: 0.4 } },
    });
    expect(scenario.phaseResults).toHaveLength(2);
    expect(scenario.phaseResults.map((entry) => entry.phase)).toEqual([0, 2]);
    expect(scenario.phaseResults[0]).toMatchObject({
      source: { domainType: "numeric" }, requestSnapshot: context.requestPayload,
      result: { standardResult: { ranking: ["Alternative A"] }, modelExecution: { ok: true }, rawOutput: { raw: true } },
    });
    expect(scenario.phaseResults[0].execution.startedAt).toBeInstanceOf(Date);
    expect(scenario.phaseResults[0].execution.completedAt).toBeInstanceOf(Date);
    expect(scenario).not.toHaveProperty("inputs");
    expect(scenario).not.toHaveProperty("outputs");
    expect(scenario).not.toHaveProperty("targetModelName");
    expect(generateAnalysis).toHaveBeenCalledWith(expect.objectContaining({
      issueId: context.issue._id,
      userId,
      executionKey: String(scenario._id),
    }));
  });

  it("does not persist a scenario when model execution fails", async () => {
    const context = buildMockExecutionContext();
    scenarioExecutionState.buildScenarioExecutionContext.mockResolvedValue(context);
    scenarioExecutionState.executeScenarioModel.mockRejectedValue(
      new Error("Decision model unavailable")
    );

    await expect(
      createIssueScenario({
        userId: new mongoose.Types.ObjectId(),
        issueId: String(context.issue._id),
        targetModelId: "target-model-id",
        scenarioName: "Unpersisted failure",
        scenarioDescription: "Execution failure preserves synchronous semantics.",
      })
    ).rejects.toThrow("Decision model unavailable");

    const { IssueScenario } = await import("../../../models/IssueScenarios.js");
    expect(await IssueScenario.countDocuments()).toBe(0);
  });

  it("does not persist a partial scenario when a later phase fails", async () => {
    const context = buildMockExecutionContext();
    scenarioExecutionState.discoverScenarioReplayPhasesOrThrow.mockResolvedValue([0, 1]);
    scenarioExecutionState.buildScenarioExecutionContext.mockImplementation(async ({ phase }) => ({ ...context, evaluationPhase: phase }));
    scenarioExecutionState.executeScenarioModel
      .mockResolvedValueOnce({ standardResult: {}, modelExecution: {}, rawOutput: {}, executionAttempt: { _id: new mongoose.Types.ObjectId(), startedAt: new Date(), completedAt: new Date() } })
      .mockRejectedValueOnce(new Error("phase one failed"));

    await expect(createIssueScenario({ userId: new mongoose.Types.ObjectId(), issueId: String(context.issue._id), targetModelId: "target-model-id", scenarioName: "Atomic scenario" })).rejects.toThrow("phase one failed");
    const { IssueScenario } = await import("../../../models/IssueScenarios.js");
    expect(await IssueScenario.countDocuments()).toBe(0);
    expect(scenarioExecutionState.markExecutionApplicationFailed).toHaveBeenCalledTimes(1);
  });
});
