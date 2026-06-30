import { describe, expect, it } from "vitest";

import { applyScenarioToIssueInfo } from "../../../src/features/finishedIssueDialog/logic/buildFinishedIssueView.js";
import {
  buildFinishedIssueBaseFixture,
  buildFinishedScenarioFixture,
} from "../../mocks/fixtures/finishedIssueDialog.fixtures.js";

describe("buildFinishedIssueView", () => {
  it("applies a scenario without mutating the base issue and replaces scenario-owned fields", () => {
    const baseIssue = buildFinishedIssueBaseFixture();
    const scenario = buildFinishedScenarioFixture();

    const viewIssue = applyScenarioToIssueInfo(baseIssue, scenario);

    expect(baseIssue.summary.modelName).toBe("Consensus Model");
    expect(baseIssue.alternativesRankings).toHaveLength(2);

    expect(viewIssue.summary.modelName).toBe("Weighted Scenario Model");
    expect(viewIssue.summary.targetModelName).toBe("Weighted Scenario Model");
    expect(viewIssue.modelParams.base.paramsResolved.threshold).toBe(0.7);
    expect(viewIssue.alternativesRankings).toEqual([
      {
        phase: 0,
        rankedAlternatives: [
          {
            alternativeId: "alt-alpha",
            name: "Alpha",
            score: 0.82,
            rank: 1,
          },
          {
            alternativeId: "alt-beta",
            name: "Beta",
            score: 0.18,
            rank: 2,
          },
        ],
      },
    ]);
    expect(viewIssue.consensusHistory).toEqual([]);
    expect(viewIssue.consensusRounds).toEqual([]);
    expect(viewIssue.consensus).toEqual([]);
    expect(viewIssue.modelExecution.rawOutput).toEqual({
      source: "scenario-model-execution",
    });
    expect(viewIssue.expertsRatings[0].collectiveEvaluations).toEqual({
      merged: "scenario-collective",
    });
  });

  it("handles partial scenario output safely while preserving stable summary fields", () => {
    const baseIssue = buildFinishedIssueBaseFixture();
    const scenario = buildFinishedScenarioFixture({
      targetModelName: "Catalog Model",
      outputs: {
        rawOutput: {
          source: "partial-scenario-output",
        },
        standardResult: {},
      },
    });

    const viewIssue = applyScenarioToIssueInfo(baseIssue, scenario);

    expect(viewIssue.summary.modelName).toBe("Catalog Model");
    expect(viewIssue.summary.experts).toEqual(baseIssue.summary.experts);
    expect(viewIssue.alternativesRankings).toEqual([
      {
        phase: 0,
        rankedAlternatives: [],
      },
    ]);
    expect(viewIssue.consensusDetails.rankedAlternatives).toEqual([]);
    expect(viewIssue.modelExecution).toEqual({
      rawOutput: {
        source: "partial-scenario-output",
      },
    });
  });

  it("does not crash when scenario output is missing", () => {
    const baseIssue = buildFinishedIssueBaseFixture();

    const viewIssue = applyScenarioToIssueInfo(baseIssue, {
      targetModelName: "No Output Model",
      outputs: null,
    });

    expect(viewIssue.summary.modelName).toBe("No Output Model");
    expect(viewIssue.selectedScenario.outputs).toEqual({});
    expect(viewIssue.consensusDetails.modelExecution).toBeNull();
    expect(viewIssue.modelExecution).toBeNull();
  });
});
