import { describe, expect, it } from "vitest";

import { buildAHPSortScenarioParticipationsOrThrow } from "../../../modules/issues/scenarios/buildScenarioExecutionContext.js";
import { validateEvaluationCoverageOrThrow } from "../../../modules/issues/scenarios/validateScenarioEvaluationCoverage.js";

describe("AHPSort I scenario expert roster", () => {
  it("uses the roster persisted with the applied base execution, independent of evaluation order", () => {
    const issue = { _id: "issue-1" };
    const latestAlternativeResult = {
      _id: "stage-result-1",
      inputSnapshot: { expertIds: ["expert-a", "expert-b"] },
    };
    const completedEvaluations = [
      { expert: { _id: "expert-b", email: "b@example.test", name: "B" } },
      { expert: { _id: "expert-a", email: "a@example.test", name: "A" } },
    ];

    const roster = buildAHPSortScenarioParticipationsOrThrow({
      issue,
      latestAlternativeResult,
      completedEvaluations,
      phase: 2,
    });

    expect(roster.map(({ expert }) => String(expert._id))).toEqual([
      "expert-a",
      "expert-b",
    ]);
    expect(() => validateEvaluationCoverageOrThrow({
      issue,
      phase: 2,
      acceptedParticipations: roster,
      completedEvaluations: completedEvaluations.map((evaluation) => ({
        ...evaluation,
        completed: true,
      })),
      requireExactCoverage: true,
    })).not.toThrow();
  });

  it("does not infer a historical roster from the evaluations being validated", () => {
    let error;
    try {
      buildAHPSortScenarioParticipationsOrThrow({
        issue: { _id: "issue-1" },
        latestAlternativeResult: { _id: "legacy-stage-result", inputSnapshot: { expertWeights: [] } },
        completedEvaluations: [
          { expert: { _id: "only-evaluation" } },
        ],
        phase: 0,
      });
    } catch (caughtError) {
      error = caughtError;
    }
    expect(error).toMatchObject({
      code: "AHPSORT_I_SCENARIO_ROSTER_UNVERIFIABLE",
      field: "stageResult.inputSnapshot.expertIds",
    });
  });

  it("rejects evaluations outside the persisted roster", () => {
    const issue = { _id: "issue-1" };
    const roster = buildAHPSortScenarioParticipationsOrThrow({
      issue,
      latestAlternativeResult: {
        _id: "stage-result-1",
        inputSnapshot: { expertIds: ["expected-a", "expected-b"] },
      },
      completedEvaluations: [],
      phase: 0,
    });

    let error;
    try {
      validateEvaluationCoverageOrThrow({
        issue,
        phase: 0,
        acceptedParticipations: roster,
        completedEvaluations: [
          { expert: { _id: "expected-a" }, completed: true },
          { expert: { _id: "foreign" }, completed: true },
        ],
        requireExactCoverage: true,
      });
    } catch (caughtError) {
      error = caughtError;
    }
    expect(error).toMatchObject({
      code: "AHPSORT_I_EVALUATION_COVERAGE_MISMATCH",
      details: {
        missingExpertIds: ["expected-b"],
        unexpectedExpertIds: ["foreign"],
      },
    });
  });
});
