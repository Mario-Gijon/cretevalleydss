import { describe, expect, it } from "vitest";

import {
  EVALUATION_STRUCTURE_REGISTRY,
} from "../../modules/decisionPlugins/evaluations/evaluationStructureRegistry.js";

describe("evaluation structure registry", () => {
  it("accepts structures without the optional criterion-id remapping operation", () => {
    expect(
      EVALUATION_STRUCTURE_REGISTRY.manualCriteriaWeights.remapCriterionIds
    ).toBeUndefined();
  });

  it("keeps an optional criterion-id remapping operation when it is a function", () => {
    expect(
      EVALUATION_STRUCTURE_REGISTRY.bestWorstCriteria.remapCriterionIds
    ).toEqual(expect.any(Function));
  });
});
