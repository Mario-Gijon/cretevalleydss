import { describe, expect, it } from "vitest";

import { buildAlternativeCriteriaMatrixRows } from "../../../../../src/features/decisionPlugins/evaluations/structures/alternativeCriteriaMatrix/operations/buildAlternativeCriteriaMatrixRows.js";
import {
  resolveDecisionAlternatives,
  resolveDecisionCriteria,
} from "../../../../../src/features/decisionPlugins/evaluations/structures/alternativeCriteriaMatrix/operations/resolveAlternativeCriteriaMatrixContext.js";
import { resolveCollectiveAlternativeCriteriaMatrix } from "../../../../../src/features/decisionPlugins/evaluations/structures/alternativeCriteriaMatrix/operations/resolveCollectiveAlternativeCriteriaMatrix.js";
import { updateAlternativeCriteriaMatrixValue } from "../../../../../src/features/decisionPlugins/evaluations/structures/alternativeCriteriaMatrix/operations/updateAlternativeCriteriaMatrixValue.js";

const alternatives = [
  { id: "alternative1", name: "Alternative 1" },
  { id: "alternative2", name: "Alternative 2" },
];

const criteria = [
  {
    id: "criterion1",
    name: "Criterion 1",
    expressionDomain: {
      typeKey: "numericContinuous",
      definition: { min: 0, max: 10 },
    },
  },
];

const evaluation = {
  alternative1: { criterion1: 7.5 },
  alternative2: { criterion1: 6.5 },
};

describe("alternativeCriteriaMatrix operations", () => {
  it("builds rows from direct evaluation values", () => {
    expect(
      buildAlternativeCriteriaMatrixRows({
        alternatives,
        criteria,
        evaluation,
      })
    ).toEqual([
      {
        id: "alternative1",
        alternativeLabel: "Alternative 1",
        criterion1: 7.5,
      },
      {
        id: "alternative2",
        alternativeLabel: "Alternative 2",
        criterion1: 6.5,
      },
    ]);
  });

  it("clones the complete evaluation and updates one direct value", () => {
    const result = updateAlternativeCriteriaMatrixValue({
      evaluation,
      alternativeId: "alternative2",
      criterionId: "criterion1",
      nextValue: 9,
    });

    expect(result).toEqual({
      alternative1: { criterion1: 7.5 },
      alternative2: { criterion1: 9 },
    });
    expect(result).not.toBe(evaluation);
    expect(result.alternative1).not.toBe(evaluation.alternative1);
    expect(evaluation.alternative2.criterion1).toBe(6.5);
  });

  it("requires canonical context ids without _id fallbacks", () => {
    expect(() =>
      resolveDecisionAlternatives({
        alternatives: [{ _id: "alternative1", name: "Alternative 1" }],
      })
    ).toThrow("Decision context alternative 1 is invalid.");

    expect(() =>
      resolveDecisionCriteria({
        leafCriteria: [
          {
            _id: "criterion1",
            name: "Criterion 1",
            expressionDomain: criteria[0].expressionDomain,
          },
        ],
      })
    ).toThrow("Decision context criterion 1 is invalid.");
  });

  it("accepts null or direct sparse collective matrices", () => {
    expect(
      resolveCollectiveAlternativeCriteriaMatrix({
        alternatives,
        criteria,
        collectiveEvaluation: null,
      })
    ).toBeNull();

    expect(
      resolveCollectiveAlternativeCriteriaMatrix({
        alternatives,
        criteria,
        collectiveEvaluation: {
          alternative1: { criterion1: 7.2 },
        },
      })
    ).toEqual({
      alternative1: { criterion1: 7.2 },
    });
  });

  it("rejects invalid collective values and unknown ids", () => {
    expect(() =>
      resolveCollectiveAlternativeCriteriaMatrix({
        alternatives,
        criteria,
        collectiveEvaluation: {
          alternative1: { criterion1: "7.2" },
        },
      })
    ).toThrow("must be a finite number or a non-empty array of finite numbers");

    expect(() =>
      resolveCollectiveAlternativeCriteriaMatrix({
        alternatives,
        criteria,
        collectiveEvaluation: {
          unknownAlternative: { criterion1: 7.2 },
        },
      })
    ).toThrow("Collective payload contains unknown alternative rows.");

    expect(() =>
      resolveCollectiveAlternativeCriteriaMatrix({
        alternatives,
        criteria,
        collectiveEvaluation: {
          alternative1: { unknownCriterion: 7.2 },
        },
      })
    ).toThrow("Collective alternative row contains unknown criterion cells.");
  });
});
