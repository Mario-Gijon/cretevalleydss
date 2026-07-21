import { describe, expect, it } from "vitest";

import {
  getStageExpertWeights,
  getStageStandardResult,
  serializePreviousStageResultForExecution,
} from "../../../modules/issues/stageResults/stageResultContract.js";

describe("IssueStageResult contract adapter", () => {
  it("adapts the nested persisted result to the established model-execution input", () => {
    const stageResult = {
      _id: "stage-result-1",
      issue: "issue-1",
      stage: "alternativeEvaluation",
      consensusPhase: 2,
      inputSnapshot: { expertWeights: [{ expert: "expert-1", weight: 0.75 }] },
      result: {
        standardResult: {
          consensusMeasure: 0.9,
          rankedAlternatives: [{ alternativeId: "alternative-1", rank: 1, score: 0.8 }],
          collectiveEvaluations: { matrix: true },
          plotsGraphic: { plot: true },
        },
        modelExecution: { kind: "decisionModelsService" },
        rawOutput: { trace: "raw" },
      },
    };

    expect(getStageStandardResult(stageResult)).toEqual(stageResult.result.standardResult);
    expect(getStageExpertWeights(stageResult)).toEqual(
      stageResult.inputSnapshot.expertWeights
    );
    expect(serializePreviousStageResultForExecution(stageResult)).toEqual({
      _id: "stage-result-1",
      issue: "issue-1",
      stage: "alternativeEvaluation",
      consensusPhase: 2,
      consensusMeasure: 0.9,
      rankedAlternatives: [{ alternativeId: "alternative-1", rank: 1, score: 0.8 }],
      collectiveEvaluations: { matrix: true },
      plotsGraphic: { plot: true },
      modelExecution: { kind: "decisionModelsService" },
      rawOutput: { trace: "raw" },
      expertWeights: [{ expert: "expert-1", weight: 0.75 }],
    });
  });
});
