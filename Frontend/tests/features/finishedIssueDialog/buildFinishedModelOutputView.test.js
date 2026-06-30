import { describe, expect, it } from "vitest";

import { buildFinishedModelOutputView } from "../../../src/features/finishedIssueDialog/logic/buildFinishedModelOutputView.js";
import { applyScenarioToIssueInfo } from "../../../src/features/finishedIssueDialog/logic/buildFinishedIssueView.js";
import {
  buildFinishedIssueBaseFixture,
  buildFinishedScenarioFixture,
} from "../../mocks/fixtures/finishedIssueDialog.fixtures.js";

describe("buildFinishedModelOutputView", () => {
  it("selects phase-specific raw output without mixing consensus phases", () => {
    const issue = buildFinishedIssueBaseFixture();

    const phaseZero = buildFinishedModelOutputView({
      viewIssue: issue,
      currentPhaseIndex: 0,
    });
    const phaseOne = buildFinishedModelOutputView({
      viewIssue: issue,
      currentPhaseIndex: 1,
    });

    expect(phaseZero.rawOutput).toEqual({
      phase: 0,
      token: "phase-0-output",
    });
    expect(phaseOne.rawOutput).toEqual({
      phase: 1,
      token: "phase-1-output",
    });
    expect(phaseZero.rawOutput).not.toEqual(phaseOne.rawOutput);
    expect(phaseOne.rawOutputExists).toBe(true);
  });

  it("falls back to scenario execution output for non-consensus views", () => {
    const viewIssue = applyScenarioToIssueInfo(
      buildFinishedIssueBaseFixture(),
      buildFinishedScenarioFixture()
    );

    const output = buildFinishedModelOutputView({
      viewIssue,
      currentPhaseIndex: 0,
    });

    expect(output.rawOutput).toEqual({
      source: "scenario-model-execution",
    });
    expect(output.rawOutputExists).toBe(true);
    expect(output.modelExecution).toMatchObject({
      modelName: "Weighted Scenario Model",
      modelKey: "weighted-model",
    });
  });

  it("returns a stable empty state when output is missing or malformed", () => {
    const output = buildFinishedModelOutputView({
      viewIssue: {
        consensusHistory: [{}],
        modelExecution: null,
        selectedScenario: {
          outputs: {
            standardResult: {},
          },
        },
      },
      currentPhaseIndex: 5,
    });

    expect(output.rawOutput).toBeNull();
    expect(output.rawOutputExists).toBe(false);
    expect(output.modelExecution).toBeNull();
  });
});
