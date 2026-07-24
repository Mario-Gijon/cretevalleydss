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
} from "../../../src/features/decisionPlugins/evaluations/shared/decisionContext.js";

const buildContext = () => ({
  alternatives: [
    { id: "a-2", name: "Second" },
    { id: "a-1", name: "First" },
  ],
  leafCriteria: [
    { id: 0, name: "Cost", expressionDomain: { typeKey: "numericContinuous" } },
    { id: "quality", name: "Quality" },
  ],
  experts: [
    { id: "e-2", name: "Expert Two" },
    { id: 3, name: "Expert Three" },
  ],
  criteriaWeights: { 0: 0, quality: "high" },
  expertWeights: { "e-2": 0, 3: 0.75 },
  modelParameters: { alpha: 0.4 },
  criteriaWeightingParameters: { method: "mean" },
});

describe("decision context helpers", () => {
  it("returns safe neutral values for absent or malformed context", () => {
    expect(getAlternatives()).toEqual([]);
    expect(getLeafCriteria()).toEqual([]);
    expect(getExperts()).toEqual([]);
    expect(getCriterionWeight(null, "missing")).toBeNull();
    expect(getExpertWeight(null, "missing")).toBeNull();
    expect(getCriterionExpressionDomain(null, "missing")).toBeNull();
    expect(getModelParameters({ modelParameters: [] })).toEqual({});
    expect(
      getCriteriaWeightingParameters({ criteriaWeightingParameters: "bad" })
    ).toEqual({});
  });

  it("preserves order, fields and source values without mutating context", () => {
    const context = buildContext();
    const snapshot = structuredClone(context);

    expect(getAlternatives(context).map((item) => item.id)).toEqual(["a-2", "a-1"]);
    expect(getLeafCriteriaWithWeights(context)).toEqual([
      {
        id: 0,
        name: "Cost",
        expressionDomain: { typeKey: "numericContinuous" },
        weight: 0,
      },
      { id: "quality", name: "Quality", weight: "high" },
    ]);
    expect(getExpertsWithWeights(context)).toEqual([
      { id: "e-2", name: "Expert Two", weight: 0 },
      { id: 3, name: "Expert Three", weight: 0.75 },
    ]);
    expect(context).toEqual(snapshot);
  });

  it("distinguishes zero from absence and compares numeric/text identifiers safely", () => {
    const context = buildContext();

    expect(getCriterionWeight(context, 0)).toBe(0);
    expect(getCriterionWeight(context, "0")).toBe(0);
    expect(getCriterionWeight(context, "missing")).toBeNull();
    expect(getCriterionWeight(context, "")).toBeNull();
    expect(getExpertWeight(context, "e-2")).toBe(0);
    expect(getExpertWeight(context, 3)).toBe(0.75);
    expect(getExpertWeight(context, null)).toBeNull();
    expect(getExpertWeight(context, Number.NaN)).toBeNull();
    expect(getCriterionExpressionDomain(context, "0")).toEqual({
      typeKey: "numericContinuous",
    });
    expect(getCriterionExpressionDomain(context, "quality")).toBeNull();
  });

  it("returns parameter objects unchanged", () => {
    const context = buildContext();

    expect(getModelParameters(context)).toBe(context.modelParameters);
    expect(getCriteriaWeightingParameters(context)).toBe(
      context.criteriaWeightingParameters
    );
  });
});
