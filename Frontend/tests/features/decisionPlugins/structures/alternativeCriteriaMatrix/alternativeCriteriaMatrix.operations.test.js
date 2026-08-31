import { describe, expect, it } from "vitest";

import { buildColumns } from "../../../../../src/features/decisionPlugins/evaluations/structures/alternativeCriteriaMatrix/operations/buildColumns.js";
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
  it("uses readable minimum widths for label and value columns", () => {
    const columns = buildColumns({ criteria, renderCell: () => null });

    expect(columns[0]).toMatchObject({ minWidth: 170, flex: 1 });
    expect(columns[1]).toMatchObject({ minWidth: 180, flex: 1 });
  });

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

  it("accepts valid linguistic 2-tuple collectives through expression-domain validation", () => {
    const linguisticCriteria = [{
      id: "criterion1",
      name: "Linguistic",
      expressionDomain: {
        typeKey: "linguistic2Tuple",
        definition: {
          labels: [
            { key: "low", label: "Low", index: 0 },
            { key: "high", label: "Medium", index: 1 },
          ],
        },
      },
    }];
    const collectiveEvaluation = {
      alternative1: { criterion1: { labelKey: "high", alpha: -0.5 } },
      alternative2: { criterion1: { labelKey: "high", alpha: 0 } },
    };

    expect(resolveCollective({ alternatives, criteria: linguisticCriteria, collectiveEvaluation })).toBe(collectiveEvaluation);
    expect(() => resolveCollective({
      alternatives,
      criteria: linguisticCriteria,
      collectiveEvaluation: {
        alternative1: { criterion1: { labelKey: "missing", alpha: 0 } },
        alternative2: { criterion1: { labelKey: "high", alpha: 0 } },
      },
    })).toThrow("Collective payload cell 'alternative1.criterion1' is invalid: Select a valid domain label.");
    expect(() => resolveCollective({
      alternatives,
      criteria: linguisticCriteria,
      collectiveEvaluation: {
        alternative1: { criterion1: { labelKey: "high", alpha: 0.5 } },
        alternative2: { criterion1: { labelKey: "high", alpha: 0 } },
      },
    })).toThrow("Collective payload cell 'alternative1.criterion1' is invalid: value.alpha must be greater than or equal to -0.5 and less than 0.5.");
  });

});
