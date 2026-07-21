import { describe, expect, it } from "vitest";

import {
  buildMigratedIssueStageResultFields,
  isIssueStageResultMigrated,
} from "../../../modules/issues/stageResults/migrateIssueStageResultDocument.js";

describe("IssueStageResult migration", () => {
  it("moves a legacy criteria result into the nested contract without alternative-only fields", () => {
    const legacyResult = {
      stage: "criteriaWeighting",
      consensusMeasure: 0.74,
      collectiveEvaluations: {
        collective: true,
        weightsByCriterion: { criterionA: 0.6, criterionB: 0.4 },
      },
      expertWeights: [{ expert: "expert-1", weight: 1 }],
      modelExecution: { kind: "criteria" },
      rawOutput: { trace: "raw" },
    };

    expect(isIssueStageResultMigrated(legacyResult)).toBe(false);
    expect(buildMigratedIssueStageResultFields(legacyResult)).toEqual({
      inputSnapshot: { expertWeights: [{ expert: "expert-1", weight: 1 }] },
      result: {
        standardResult: {
          consensusMeasure: 0.74,
          collectiveEvaluations: {
            collective: true,
            weightsByCriterion: { criterionA: 0.6, criterionB: 0.4 },
          },
          weightsByCriterion: { criterionA: 0.6, criterionB: 0.4 },
        },
        modelExecution: { kind: "criteria" },
        rawOutput: { trace: "raw" },
      },
    });
    const standardResult = buildMigratedIssueStageResultFields(legacyResult).result
      .standardResult;
    expect(standardResult).not.toHaveProperty("rankedAlternatives");
    expect(standardResult).not.toHaveProperty("plotsGraphic");
  });

  it("moves a legacy alternative result into the nested contract", () => {
    const legacyResult = {
      stage: "alternativeEvaluation",
      consensusMeasure: 0.91,
      rankedAlternatives: [{ alternativeId: "alternative-1", rank: 1, score: 0.8 }],
      collectiveEvaluations: { collective: true },
      plotsGraphic: { chart: true },
      expertWeights: [],
      modelExecution: { kind: "alternative" },
      rawOutput: { trace: "raw" },
    };

    expect(buildMigratedIssueStageResultFields(legacyResult)).toEqual({
      inputSnapshot: { expertWeights: [] },
      result: {
        standardResult: {
          consensusMeasure: 0.91,
          rankedAlternatives: [{ alternativeId: "alternative-1", rank: 1, score: 0.8 }],
          collectiveEvaluations: { collective: true },
          plotsGraphic: { chart: true },
        },
        modelExecution: { kind: "alternative" },
        rawOutput: { trace: "raw" },
      },
    });
  });

  it("does not invent criteria weights that cannot be recovered", () => {
    const fields = buildMigratedIssueStageResultFields({
      stage: "criteriaWeighting",
      collectiveEvaluations: {},
      rawOutput: {},
    });

    expect(fields.result.standardResult).not.toHaveProperty("weightsByCriterion");
  });

  it("is idempotent and cleans legacy fields from an otherwise migrated document", () => {
    const hybridResult = {
      inputSnapshot: { expertWeights: [{ expert: "expert-1", weight: 1 }] },
      result: {
        standardResult: { consensusMeasure: null, collectiveEvaluations: {} },
        modelExecution: {},
        rawOutput: {},
      },
      consensusMeasure: 0.99,
    };

    expect(isIssueStageResultMigrated(hybridResult)).toBe(false);
    expect(buildMigratedIssueStageResultFields(hybridResult)).toEqual({
      inputSnapshot: hybridResult.inputSnapshot,
      result: hybridResult.result,
    });
    expect(isIssueStageResultMigrated(buildMigratedIssueStageResultFields(hybridResult))).toBe(true);
  });
});
