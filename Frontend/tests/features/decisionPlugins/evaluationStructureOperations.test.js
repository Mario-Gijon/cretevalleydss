import { describe, expect, it } from "vitest";

import { buildEmptyBestWorstCriteriaPayload } from "../../../src/features/decisionPlugins/evaluations/structures/bestWorstCriteria/operations/buildEmptyBestWorstCriteriaEvaluation.js";
import {
  updateBestCriterionSelection,
  updateBestWorstComparison,
} from "../../../src/features/decisionPlugins/evaluations/structures/bestWorstCriteria/operations/updateBestWorstCriteriaEvaluation.js";
import { updateManualCriterionWeight } from "../../../src/features/decisionPlugins/evaluations/structures/manualCriteriaWeights/operations/updateManualCriterionWeight.js";

describe("evaluation structure operations", () => {
  it("builds and updates best-worst evaluations without mutating the input", () => {
    const criteria = [
      { id: "cost", name: "Cost" },
      { id: "quality", name: "Quality" },
      { id: "speed", name: "Speed" },
    ];
    const initial = buildEmptyBestWorstCriteriaPayload(criteria);
    const nextSelection = updateBestCriterionSelection({
      payload: initial,
      criterionIds: criteria.map((criterion) => criterion.id),
      bestCriterion: "quality",
    });
    const nextComparison = updateBestWorstComparison({
      payload: nextSelection,
      comparisonKey: "bestToOthers",
      criterionId: "cost",
      rawValue: "4",
    });

    expect(initial.bestCriterion).toBe("cost");
    expect(nextSelection.bestCriterion).toBe("quality");
    expect(nextComparison.bestToOthers.cost).toBe(4);
    expect(nextComparison).not.toBe(nextSelection);
  });

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
