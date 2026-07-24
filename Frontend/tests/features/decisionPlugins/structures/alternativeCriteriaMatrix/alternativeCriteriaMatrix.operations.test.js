import { describe, expect, it } from "vitest";

import { buildAlternativeCriteriaMatrixRows } from "../../../../../src/features/decisionPlugins/evaluations/structures/alternativeCriteriaMatrix/operations/buildAlternativeCriteriaMatrixRows.js";
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

  it("accepts null or a complete direct collective matrix", () => {
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
          alternative2: { criterion1: 6.2 },
        },
      })
    ).toEqual({
      alternative1: { criterion1: 7.2 },
      alternative2: { criterion1: 6.2 },
    });
  });

  it("rejects incomplete, invalid, and unknown collective values", () => {
    expect(() =>
      resolveCollectiveAlternativeCriteriaMatrix({
        alternatives,
        criteria,
        collectiveEvaluation: {
          alternative1: { criterion1: 7.2 },
        },
      })
    ).toThrow("Collective payload is missing an alternative row.");

    expect(() =>
      resolveCollectiveAlternativeCriteriaMatrix({
        alternatives,
        criteria,
        collectiveEvaluation: {
          alternative1: {},
          alternative2: { criterion1: 6.2 },
        },
      })
    ).toThrow("Collective alternative row is missing a criterion cell.");

    expect(() =>
      resolveCollectiveAlternativeCriteriaMatrix({
        alternatives,
        criteria,
        collectiveEvaluation: {
          alternative1: { criterion1: "7.2" },
          alternative2: { criterion1: 6.2 },
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
