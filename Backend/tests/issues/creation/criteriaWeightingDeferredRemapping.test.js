import { beforeEach, describe, expect, it, vi } from "vitest";

const evaluationStructureState = vi.hoisted(() => ({
  getEvaluationStructureOrThrow: vi.fn(),
}));

vi.mock("../../../modules/decisionPlugins/evaluations/index.js", () => ({
  EVALUATION_STAGES: {
    CRITERIA_WEIGHTING: "criteriaWeighting",
    ALTERNATIVE_EVALUATION: "alternativeEvaluation",
  },
  getEvaluationStructureOrThrow:
    evaluationStructureState.getEvaluationStructureOrThrow,
}));

import {
  remapCriteriaWeightIdsToMongoCriteriaOrThrow,
} from "../../../modules/issues/creation/initialCriteriaWeights/resolveInitialCriteriaWeights.js";

const sourceLeafCriteria = [
  { id: "temporary-cost" },
  { id: "temporary-quality" },
];
const persistedLeafCriteria = [
  { id: "persisted-cost" },
  { id: "persisted-quality" },
];

describe("deferred criteria-weighting payload remapping", () => {
  beforeEach(() => {
    evaluationStructureState.getEvaluationStructureOrThrow.mockReset();
  });

  it("delegates deferred payload remapping to the selected structure", () => {
    const deferredPayload = { pluginOwned: "payload" };
    const remappedPayload = { pluginOwned: "remapped" };
    const remapCriterionIds = vi.fn(() => remappedPayload);
    evaluationStructureState.getEvaluationStructureOrThrow.mockReturnValue({
      key: "testDeferredCriteriaWeights",
      remapCriterionIds,
    });

    const result = remapCriteriaWeightIdsToMongoCriteriaOrThrow({
      resolvedCriteriaWeighting: {
        criteriaWeightsStructureKey: "testDeferredCriteriaWeights",
        isDeferredApiCriteriaWeighting: true,
        modelWeights: null,
        deferredPayload,
      },
      sourceLeafCriteria,
      persistedLeafCriteria,
    });

    expect(evaluationStructureState.getEvaluationStructureOrThrow).toHaveBeenCalledWith(
      "testDeferredCriteriaWeights"
    );
    expect(remapCriterionIds).toHaveBeenCalledWith({
      payload: deferredPayload,
      criterionIdMap: new Map([
        ["temporary-cost", "persisted-cost"],
        ["temporary-quality", "persisted-quality"],
      ]),
    });
    expect(result.deferredPayload).toBe(remappedPayload);
  });

  it("fails explicitly when a deferred structure lacks the optional operation", () => {
    evaluationStructureState.getEvaluationStructureOrThrow.mockReturnValue({
      key: "testDeferredCriteriaWeights",
    });

    expect(() =>
      remapCriteriaWeightIdsToMongoCriteriaOrThrow({
        resolvedCriteriaWeighting: {
          criteriaWeightsStructureKey: "testDeferredCriteriaWeights",
          isDeferredApiCriteriaWeighting: true,
          modelWeights: null,
          deferredPayload: {},
        },
        sourceLeafCriteria,
        persistedLeafCriteria,
      })
    ).toThrow("does not support deferred criterion-ID remapping");
  });

  it("does not resolve a structure for non-deferred flows", () => {
    const resolvedCriteriaWeighting = {
      criteriaWeightsStructureKey: "testDeferredCriteriaWeights",
      isDeferredApiCriteriaWeighting: false,
      modelWeights: null,
      deferredPayload: null,
    };

    expect(
      remapCriteriaWeightIdsToMongoCriteriaOrThrow({
        resolvedCriteriaWeighting,
        sourceLeafCriteria,
        persistedLeafCriteria,
      })
    ).toBe(resolvedCriteriaWeighting);
    expect(evaluationStructureState.getEvaluationStructureOrThrow).not.toHaveBeenCalled();
  });
});
