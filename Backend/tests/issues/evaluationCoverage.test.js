import { describe, expect, it } from "vitest";

import { assertExactEvaluationCoverageOrThrow } from "../../modules/issues/shared/evaluationCoverage.js";

const participation = (id) => ({ expert: { _id: id } });
const evaluation = (id, completed = true) => ({ expert: { _id: id }, completed });

describe("exact AHPSort evaluation coverage", () => {
  it("matches expert IDs independent of array order", () => {
    expect(assertExactEvaluationCoverageOrThrow({
      acceptedParticipations: [participation("expert-a"), participation("expert-b")],
      completedEvaluations: [evaluation("expert-b"), evaluation("expert-a")],
      issueId: "issue-1",
      phase: 2,
    })).toEqual({
      expectedExpertIds: ["expert-a", "expert-b"],
      receivedExpertIds: ["expert-b", "expert-a"],
    });
  });

  it.each([
    {
      evaluations: [evaluation("expert-a")],
      fields: { missingExpertIds: ["expert-b"], unexpectedExpertIds: [] },
    },
    {
      evaluations: [evaluation("expert-a"), evaluation("foreign")],
      fields: { missingExpertIds: ["expert-b"], unexpectedExpertIds: ["foreign"] },
    },
    {
      evaluations: [evaluation("expert-a"), evaluation("expert-a")],
      fields: { missingExpertIds: ["expert-b"], duplicateEvaluationExpertIds: ["expert-a"] },
    },
    {
      evaluations: [evaluation("expert-a"), evaluation("expert-b", false)],
      fields: { incompleteExpertIds: ["expert-b"] },
    },
  ])("rejects incomplete, duplicate, or foreign evaluation sets: $fields", ({ evaluations, fields }) => {
    try {
      assertExactEvaluationCoverageOrThrow({
        acceptedParticipations: [participation("expert-a"), participation("expert-b")],
        completedEvaluations: evaluations,
        issueId: "issue-1",
        phase: 2,
      });
      throw new Error("expected coverage validation to fail");
    } catch (error) {
      expect(error).toMatchObject({
        code: "AHPSORT_I_EVALUATION_COVERAGE_MISMATCH",
        details: fields,
      });
    }
  });

  it("rejects duplicate accepted participant IDs", () => {
    expect(() => assertExactEvaluationCoverageOrThrow({
      acceptedParticipations: [participation("expert-a"), participation("expert-a")],
      completedEvaluations: [evaluation("expert-a"), evaluation("expert-a")],
    })).toThrow(/exactly one completed evaluation/);
  });
});
