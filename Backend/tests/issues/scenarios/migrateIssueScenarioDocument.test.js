import mongoose from "mongoose";
import { describe, expect, it } from "vitest";

import {
  buildMigratedIssueScenarioFields,
  isIssueScenarioMigrated,
} from "../../../modules/issues/scenarios/migrateIssueScenarioDocument.js";

describe("IssueScenario legacy migration", () => {
  it("converts a representative legacy document without retaining duplicated fields", () => {
    const stageResultId = new mongoose.Types.ObjectId();
    const createdAt = new Date("2026-01-01T09:00:00.000Z");
    const updatedAt = new Date("2026-01-01T09:02:00.000Z");
    const legacyScenario = {
      domainType: "numeric",
      status: "done",
      createdAt,
      updatedAt,
      config: {
        modelParameters: { alpha: 0.4 },
        normalizedModelParameters: { alpha: 0.8 },
      },
      inputs: {
        consensusPhaseUsed: 3,
        evaluationPayloads: [{ expert: { id: "expert-1" }, payload: { score: 4 } }],
        context: { previousStageResult: { _id: stageResultId }, consensusPhase: 3 },
      },
      outputs: {
        standardResult: { rankedAlternatives: [] },
        modelExecution: { kind: "decisionModelsService" },
        rawOutput: { trace: "raw" },
      },
    };

    expect(isIssueScenarioMigrated(legacyScenario)).toBe(false);
    expect(buildMigratedIssueScenarioFields(legacyScenario)).toEqual({
      source: {
        consensusPhase: 3,
        stageResult: stageResultId,
        domainType: "numeric",
      },
      config: { parameterOverrides: {} },
      requestSnapshot: {
        modelParameters: { alpha: 0.8 },
        evaluations: [{ expert: { id: "expert-1" }, payload: { score: 4 } }],
        context: { previousStageResult: { _id: String(stageResultId) }, consensusPhase: 3 },
      },
      result: {
        standardResult: { rankedAlternatives: [] },
        modelExecution: { kind: "decisionModelsService" },
        rawOutput: { trace: "raw" },
      },
      execution: {
        status: "done",
        error: null,
        startedAt: createdAt,
        completedAt: updatedAt,
      },
    });
  });
});
