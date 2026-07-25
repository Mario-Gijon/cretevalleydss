import { describe, expect, it } from "vitest";

import { updateManualCriterionWeight } from "../../../src/features/decisionPlugins/evaluations/structures/manualCriteriaWeights/operations/updateManualCriterionWeight.js";

describe("evaluation structure operations", () => {
  it("updates one manual weight without mutating the original evaluation", () => {
    const evaluation = {
      weightsByCriterion: { cost: 0.4, quality: 0.6 },
    };

    const next = updateManualCriterionWeight({
      evaluation,
      criterionId: "cost",
      rawValue: "0.5",
    });

    expect(next).toEqual({
      weightsByCriterion: { cost: 0.5, quality: 0.6 },
    });
    expect(evaluation.weightsByCriterion.cost).toBe(0.4);
  });
});
