import { describe, expect, it } from "vitest";

import { buildInitialEvaluation } from "../../../../../src/features/decisionPlugins/evaluations/structures/criteriaPairwiseAHP/operations/buildInitialEvaluation";
import { getOrientedComparisonValue, updateComparison } from "../../../../../src/features/decisionPlugins/evaluations/structures/criteriaPairwiseAHP/operations/updateComparison";
import { expectedComparisonCount, validateEvaluation } from "../../../../../src/features/decisionPlugins/evaluations/structures/criteriaPairwiseAHP/operations/validateEvaluation";
import { resolveCollective, isCollectiveEvaluationUsable } from "../../../../../src/features/decisionPlugins/evaluations/structures/criteriaPairwiseAHP/operations/resolveCollective";
import { resolveCriteria } from "../../../../../src/features/decisionPlugins/evaluations/structures/criteriaPairwiseAHP/operations/resolveCriteria";
import {
  formatNormalizedPreferenceOption,
  formatNormalizedPreference,
  normalizedPreferenceToSaatyValue,
  SAATY_NORMALIZED_PREFERENCE_OPTIONS,
  SAATY_SCALE_VALUES,
  saatyValueToNormalizedPreference,
} from "../../../../../src/features/decisionPlugins/evaluations/structures/criteriaPairwiseAHP/operations/saatyPreference";
import { getEvaluationStructureEntryForStage } from "../../../../../src/features/decisionPlugins/evaluations/registry";

const decisionContext = {
  leafCriteria: [
    { id: "quality", name: "Quality" },
    { id: "cost", name: "Cost" },
    { id: "delivery", name: "Delivery" },
  ],
};

describe("criteriaPairwiseAHP payload operations", () => {
  it("initializes pending comparisons without treating missing judgments as equal", () => {
    expect(buildInitialEvaluation({ decisionContext })).toEqual({ comparisons: [] });
    expect(getEvaluationStructureEntryForStage({
      structureKey: "criteriaPairwiseAHP",
      stage: "criteriaWeighting",
    })).toMatchObject({ key: "criteriaPairwiseAHP", stage: "criteriaWeighting" });
  });

  it("counts the independent pairwise judgments", () => {
    expect(expectedComparisonCount(1)).toBe(0);
    expect(expectedComparisonCount(2)).toBe(1);
    expect(expectedComparisonCount(6)).toBe(15);
  });

  it("maps the normalized UI scale exactly to supported reciprocal Saaty values", () => {
    expect(SAATY_NORMALIZED_PREFERENCE_OPTIONS).toHaveLength(17);
    expect(new Set(SAATY_NORMALIZED_PREFERENCE_OPTIONS.map(({ normalizedValue }) => normalizedValue)).size).toBe(17);
    expect(SAATY_NORMALIZED_PREFERENCE_OPTIONS.map(({ saatyValue }) => saatyValue)).toEqual(SAATY_SCALE_VALUES);
    expect(SAATY_NORMALIZED_PREFERENCE_OPTIONS.map(({ normalizedValue }) => normalizedValue)).toEqual(
      SAATY_SCALE_VALUES.map((value) => formatNormalizedPreferenceOption(value))
    );
    expect(saatyValueToNormalizedPreference(3)).toBe(0.75);
    expect(saatyValueToNormalizedPreference(1 / 3)).toBe(0.25);
    expect(formatNormalizedPreferenceOption(3)).toBe("0.750");
    expect(formatNormalizedPreferenceOption(1 / 3)).toBe("0.250");
    expect(formatNormalizedPreference(3)).toBe("0.7500");
    expect(formatNormalizedPreference(1 / 3)).toBe("0.2500");
    expect(normalizedPreferenceToSaatyValue("0.7500")).toBe(3);
    expect(normalizedPreferenceToSaatyValue("0.2500")).toBe(1 / 3);
    expect(normalizedPreferenceToSaatyValue("0.7400")).toBeNull();
    for (const value of SAATY_SCALE_VALUES) {
      const normalized = formatNormalizedPreference(value);
      expect(normalizedPreferenceToSaatyValue(normalized)).toBe(value);
      expect(
        saatyValueToNormalizedPreference(1 / value)
        + saatyValueToNormalizedPreference(value)
      ).toBeCloseTo(1, 12);
    }
  });

  it("stores one judgment and derives its reciprocal by stable criterion IDs", () => {
    const evaluation = updateComparison({
      evaluation: { comparisons: [] },
      criterionId: "quality",
      comparedCriterionId: "cost",
      value: 7,
    });
    expect(evaluation).toEqual({
      comparisons: [
        { criterionId: "quality", comparedCriterionId: "cost", value: 7 },
      ],
    });
    expect(getOrientedComparisonValue({
      comparisons: evaluation.comparisons,
      criterionId: "cost",
      comparedCriterionId: "quality",
    })).toBe(1 / 7);
    expect(getOrientedComparisonValue({
      comparisons: evaluation.comparisons,
      criterionId: "quality",
      comparedCriterionId: "cost",
    })).toBe(7);
  });

  it("removes a cleared judgment and preserves unrelated pairs", () => {
    const evaluation = {
      comparisons: [
        { criterionId: "quality", comparedCriterionId: "cost", value: 3 },
        { criterionId: "quality", comparedCriterionId: "delivery", value: 5 },
      ],
    };
    expect(updateComparison({
      evaluation,
      criterionId: "quality",
      comparedCriterionId: "cost",
      value: null,
    })).toEqual({
      comparisons: [
        { criterionId: "quality", comparedCriterionId: "delivery", value: 5 },
      ],
    });
  });

  it("validates incomplete and complete drafts without mutating them", () => {
    const evaluation = {
      comparisons: [
        { criterionId: "cost", comparedCriterionId: "quality", value: 1 / 3 },
      ],
    };
    expect(validateEvaluation({ decisionContext, evaluation })).toEqual(evaluation);
    expect(evaluation.comparisons).toHaveLength(1);
    expect(() => validateEvaluation({ decisionContext, evaluation: { comparisons: [
      ...evaluation.comparisons,
      { criterionId: "quality", comparedCriterionId: "cost", value: 3 },
    ] } })).toThrow("duplicate criterion pair");
  });

  it("rejects unknown IDs, self comparisons, invalid scale values and excessive criteria", () => {
    expect(() => validateEvaluation({ decisionContext, evaluation: { comparisons: [
      { criterionId: "missing", comparedCriterionId: "cost", value: 3 },
    ] } })).toThrow("unknown criterion");
    expect(() => validateEvaluation({ decisionContext, evaluation: { comparisons: [
      { criterionId: "quality", comparedCriterionId: "quality", value: 1 },
    ] } })).toThrow("cannot compare");
    expect(() => validateEvaluation({ decisionContext, evaluation: { comparisons: [
      { criterionId: "quality", comparedCriterionId: "cost", value: 1.5 },
    ] } })).toThrow("outside Saaty's scale");
    const tooMany = Array.from({ length: 16 }, (_, index) => ({ id: `c${index}`, name: `C${index}` }));
    expect(() => validateEvaluation({ decisionContext: { leafCriteria: tooMany }, evaluation: { comparisons: [] } })).toThrow("at most 15");
  });

  it("uses only the selected hierarchy level and preserves its order", () => {
    expect(resolveCriteria({ decisionContext: {
      issue: { criteriaWeightingLevel: "parent" },
      criteriaWeightingCriteria: [
        { id: "parent-a", name: "Parent A" },
        { id: "parent-b", name: "Parent B" },
      ],
      leafCriteria: [
        { id: "leaf-a1", name: "A1" }, { id: "leaf-a2", name: "A2" },
        { id: "leaf-b1", name: "B1" }, { id: "leaf-b2", name: "B2" },
      ],
    } })).toEqual([
      { id: "parent-a", name: "Parent A", index: 0 },
      { id: "parent-b", name: "Parent B", index: 1 },
    ]);
  });

  it("validates collective weights and keeps individual AHP diagnostics", () => {
    const result = {
      weightsByCriterion: { quality: 0.6, cost: 0.3, delivery: 0.1 },
      expertWeightsByExpert: { expert1: { quality: 0.6, cost: 0.3, delivery: 0.1 } },
      expertDiagnosticsByExpert: {
        expert1: { consistencyIndex: 0, consistencyRatio: 0, consistencyStatus: "consistent" },
      },
    };
    expect(resolveCollective({ criteria: decisionContext.leafCriteria, collectiveEvaluation: result })).toBe(result);
    expect(isCollectiveEvaluationUsable({ decisionContext, collectiveEvaluation: result })).toBe(true);
    expect(isCollectiveEvaluationUsable({ decisionContext, collectiveEvaluation: { weightsByCriterion: { quality: 0.7 } } })).toBe(false);
  });
});
