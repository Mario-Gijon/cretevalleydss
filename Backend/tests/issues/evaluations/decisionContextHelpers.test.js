import { describe, expect, it } from "vitest";

import {
  getAlternatives,
  getCriteriaWeightingParameters,
  getCriterionExpressionDomain,
  getCriterionWeight,
  getExpertWeight,
  getExperts,
  getExpertsWithWeights,
  getLeafCriteria,
  getLeafCriteriaWithWeights,
  getModelParameters,
} from "../../../modules/decisionPlugins/evaluations/shared/decisionContext.js";

const buildContext = () => ({
  alternatives: [{ id: "a-2" }, { id: "a-1" }],
  leafCriteria: [
    { id: 0, expressionDomain: { typeKey: "numericContinuous" } },
    { id: "quality" },
  ],
  experts: [{ id: "e-2" }, { id: 3 }],
  criteriaWeights: { 0: 0, quality: "high" },
  expertWeights: { "e-2": 0, 3: 0.75 },
  modelParameters: { alpha: 0.4 },
  criteriaWeightingParameters: { method: "mean" },
});

describe("decision context helpers", () => {
  it("returns neutral values for absent properties", () => {
    expect(getAlternatives()).toEqual([]);
    expect(getLeafCriteria()).toEqual([]);
    expect(getExperts()).toEqual([]);
    expect(getCriterionWeight(null, "missing")).toBeNull();
    expect(getExpertWeight(null, "missing")).toBeNull();
    expect(getCriterionExpressionDomain(null, "missing")).toBeNull();
    expect(getModelParameters({ modelParameters: [] })).toEqual({});
    expect(getCriteriaWeightingParameters({})).toEqual({});
  });

  it("preserves order and does not mutate the source", () => {
    const context = buildContext();
    const snapshot = structuredClone(context);

    expect(getAlternatives(context).map((item) => item.id)).toEqual(["a-2", "a-1"]);
    expect(getLeafCriteriaWithWeights(context).map((item) => item.weight)).toEqual([
      0,
      "high",
    ]);
    expect(getExpertsWithWeights(context).map((item) => item.weight)).toEqual([
      0,
      0.75,
    ]);
    expect(context).toEqual(snapshot);
  });

  it("supports numeric and text identifiers without losing zero weights", () => {
    const context = buildContext();

    expect(getCriterionWeight(context, "0")).toBe(0);
    expect(getCriterionWeight(context, "missing")).toBeNull();
    expect(getCriterionWeight(context, "")).toBeNull();
    expect(getExpertWeight(context, "e-2")).toBe(0);
    expect(getExpertWeight(context, "3")).toBe(0.75);
    expect(getExpertWeight(context, Number.NaN)).toBeNull();
    expect(getCriterionExpressionDomain(context, "0")).toEqual({
      typeKey: "numericContinuous",
    });
    expect(getCriterionExpressionDomain(context, "quality")).toBeNull();
  });

  it("returns valid parameter maps", () => {
    const context = buildContext();

    expect(getModelParameters(context)).toBe(context.modelParameters);
    expect(getCriteriaWeightingParameters(context)).toBe(
      context.criteriaWeightingParameters
    );
  });
});
