import { describe, expect, it } from "vitest";

import { buildRows } from "../../../../../src/features/decisionPlugins/evaluations/structures/alternativeCriteriaMatrix/operations/buildRows.js";
import { resolveCollective } from "../../../../../src/features/decisionPlugins/evaluations/structures/alternativeCriteriaMatrix/operations/resolveCollective.js";
import { updateValue } from "../../../../../src/features/decisionPlugins/evaluations/structures/alternativeCriteriaMatrix/operations/updateValue.js";
import { validateValue } from "../../../../../src/features/decisionPlugins/evaluations/structures/alternativeCriteriaMatrix/operations/validateValue.js";

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
      buildRows({
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
    const result = updateValue({
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

  it("returns a validation message string or an empty string", () => {
    expect(
      validateValue({
        value: "",
        expressionDomain: criteria[0].expressionDomain,
      })
    ).toBe("");

    expect(
      validateValue({
        value: 12,
        expressionDomain: criteria[0].expressionDomain,
      })
    ).toBe("Value must be between 0 and 10.");
  });

  it("accepts null or a complete direct collective matrix", () => {
    expect(
      resolveCollective({
        alternatives,
        criteria,
        collectiveEvaluation: null,
      })
    ).toBeNull();

    expect(
      resolveCollective({
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
      resolveCollective({
        alternatives,
        criteria,
        collectiveEvaluation: {
          alternative1: { criterion1: 7.2 },
        },
      })
    ).toThrow("Collective payload is missing an alternative row.");

    expect(() =>
      resolveCollective({
        alternatives,
        criteria,
        collectiveEvaluation: {
          alternative1: {},
          alternative2: { criterion1: 6.2 },
        },
      })
    ).toThrow("Collective alternative row is missing a criterion cell.");

    expect(() =>
      resolveCollective({
        alternatives,
        criteria,
        collectiveEvaluation: {
          alternative1: { criterion1: "7.2" },
          alternative2: { criterion1: 6.2 },
        },
      })
    ).toThrow("must be a finite number or a non-empty array of finite numbers");

    expect(() =>
      resolveCollective({
        alternatives,
        criteria,
        collectiveEvaluation: {
          unknownAlternative: { criterion1: 7.2 },
        },
      })
    ).toThrow("Collective payload contains unknown alternative rows.");

    expect(() =>
      resolveCollective({
        alternatives,
        criteria,
        collectiveEvaluation: {
          alternative1: { unknownCriterion: 7.2 },
        },
      })
    ).toThrow("Collective alternative row contains unknown criterion cells.");
  });
});
