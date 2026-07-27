import { describe, expect, it } from "vitest";

import { resolveCollective } from "../../../../../src/features/decisionPlugins/evaluations/structures/manualCriteriaWeights/operations/resolveCollective.js";
import { resolveCriteria } from "../../../../../src/features/decisionPlugins/evaluations/structures/manualCriteriaWeights/operations/resolveCriteria.js";
import { updateWeight } from "../../../../../src/features/decisionPlugins/evaluations/structures/manualCriteriaWeights/operations/updateWeight.js";
import { validateEvaluation } from "../../../../../src/features/decisionPlugins/evaluations/structures/manualCriteriaWeights/operations/validateEvaluation.js";

const criteria = [
  { id: "cost", name: "Cost", index: 0 },
  { id: "quality", name: "Quality", index: 1 },
  { id: "delivery", name: "Delivery", index: 2 },
];

const completeEvaluation = {
  weightsByCriterion: { cost: 0.3, quality: 0.5, delivery: 0.2 },
};

describe("manualCriteriaWeights operations", () => {
  it("resolves ordered criteria without owning creator initialization", () => {
    expect(
      resolveCriteria({
        decisionContext: {
          leafCriteria: criteria.map(({ id, name }) => ({ id, name })),
        },
      })
    ).toEqual(criteria);
  });

  it("validates exact canonical draft state", () => {
    expect(
      validateEvaluation({ criteria, evaluation: completeEvaluation })
    ).toBe(completeEvaluation);

    expect(() =>
      validateEvaluation({
        criteria,
        evaluation: {
          ...completeEvaluation,
          unknown: true,
        },
      })
    ).toThrow("contain only weightsByCriterion");

    const missing = structuredClone(completeEvaluation);
    delete missing.weightsByCriterion.delivery;
    expect(() =>
      validateEvaluation({ criteria, evaluation: missing })
    ).toThrow("exactly all leaf criteria");

    const invalid = structuredClone(completeEvaluation);
    invalid.weightsByCriterion.cost = null;
    expect(() =>
      validateEvaluation({ criteria, evaluation: invalid })
    ).toThrow("finite number between 0 and 1");
  });

  it("updates valid decimal, zero, one, and cleared values immutably", () => {
    const decimal = updateWeight({
      evaluation: completeEvaluation,
      criteria,
      criterionId: "cost",
      rawValue: "0.25",
    });
    const zero = updateWeight({
      evaluation: completeEvaluation,
      criteria,
      criterionId: "cost",
      rawValue: "0",
    });
    const one = updateWeight({
      evaluation: completeEvaluation,
      criteria,
      criterionId: "cost",
      rawValue: 1,
    });
    const cleared = updateWeight({
      evaluation: completeEvaluation,
      criteria,
      criterionId: "cost",
      rawValue: "",
    });

    expect(decimal.weightsByCriterion.cost).toBe(0.25);
    expect(zero.weightsByCriterion.cost).toBe(0);
    expect(one.weightsByCriterion.cost).toBe(1);
    expect(cleared.weightsByCriterion.cost).toBe("");
    expect(completeEvaluation.weightsByCriterion.cost).toBe(0.3);
  });

  it("preserves state for invalid input and rejects programming errors", () => {
    expect(
      updateWeight({
        evaluation: completeEvaluation,
        criteria,
        criterionId: "cost",
        rawValue: "-0.1",
      })
    ).toBe(completeEvaluation);
    expect(
      updateWeight({
        evaluation: completeEvaluation,
        criteria,
        criterionId: "cost",
        rawValue: "1.1",
      })
    ).toBe(completeEvaluation);
    expect(
      updateWeight({
        evaluation: completeEvaluation,
        criteria,
        criterionId: "cost",
        rawValue: "not-a-number",
      })
    ).toBe(completeEvaluation);
    expect(() =>
      updateWeight({
        evaluation: completeEvaluation,
        criteria,
        criterionId: "unknown",
        rawValue: "0.5",
      })
    ).toThrow("unknown criterion");
    expect(() =>
      updateWeight({
        evaluation: {},
        criteria,
        criterionId: "cost",
        rawValue: "0.5",
      })
    ).toThrow("contain only weightsByCriterion");
  });

  it("resolves complete collective weights with the canonical tolerance", () => {
    const collectiveEvaluation = {
      weightsByCriterion: { cost: 0.3005, quality: 0.5, delivery: 0.2 },
    };

    expect(
      resolveCollective({ criteria, collectiveEvaluation })
    ).toBe(collectiveEvaluation);
    expect(resolveCollective({ criteria, collectiveEvaluation: null })).toBeNull();
    expect(() =>
      resolveCollective({
        criteria,
        collectiveEvaluation: {
          weightsByCriterion: { cost: 0.31, quality: 0.5, delivery: 0.2 },
        },
      })
    ).toThrow("must sum to 1");
  });
});
