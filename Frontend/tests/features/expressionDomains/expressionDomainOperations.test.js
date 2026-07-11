import { describe, expect, it } from "vitest";

import {
  assertPairwiseReflectionCompatible,
  findMatchingFuzzyLabel,
  reflectExpressionDomainValue,
} from "../../../src/features/expressionDomains/operations/index.js";

const buildNumericContinuousDomain = () => ({
  typeKey: "numericContinuous",
  definition: {
    min: 1,
    max: 5,
  },
});

const buildNumericDiscreteDomain = (step = 0.5) => ({
  typeKey: "numericDiscrete",
  definition: {
    min: 1,
    max: 5,
    step,
  },
});

const buildOrdinalDomain = () => ({
  typeKey: "linguisticOrdinal",
  definition: {
    labels: [
      { key: "very_low", label: "Very low", index: 0 },
      { key: "low", label: "Low", index: 1 },
      { key: "medium", label: "Medium", index: 2 },
      { key: "high", label: "High", index: 3 },
      { key: "very_high", label: "Very high", index: 4 },
    ],
  },
});

const buildTriangularFuzzyDomain = () => ({
  typeKey: "linguisticFuzzy",
  definition: {
    membershipFunction: "triangular",
    labels: [
      { key: "low", label: "Low", values: [0, 0, 0.3], index: 0 },
      { key: "mid", label: "Mid", values: [0.2, 0.5, 0.8], index: 1 },
      { key: "high", label: "High", values: [0.7, 1, 1], index: 2 },
    ],
  },
});

const buildTrapezoidalFuzzyDomain = () => ({
  typeKey: "linguisticFuzzy",
  definition: {
    membershipFunction: "trapezoidal",
    labels: [
      { key: "weak", label: "Weak", values: [0, 0, 0.2, 0.4], index: 0 },
      { key: "strong", label: "Strong", values: [0.6, 0.8, 1, 1], index: 1 },
    ],
  },
});

const buildHexagonalFuzzyDomain = () => ({
  typeKey: "linguisticFuzzy",
  definition: {
    membershipFunction: "hexagonal",
    labels: [
      {
        key: "left",
        label: "Left",
        values: [0, 0.1, 0.2, 0.3, 0.4, 0.5],
        index: 0,
      },
      {
        key: "right",
        label: "Right",
        values: [0.5, 0.6, 0.7, 0.8, 0.9, 1],
        index: 1,
      },
    ],
  },
});

describe("expressionDomain operations", () => {
  it("reflects numericContinuous 1..5 so 2 becomes 4", () => {
    expect(
      reflectExpressionDomainValue({
        value: 2,
        expressionDomain: buildNumericContinuousDomain(),
      })
    ).toBe(4);
  });

  it("keeps the numericContinuous midpoint fixed", () => {
    expect(
      reflectExpressionDomainValue({
        value: 3,
        expressionDomain: buildNumericContinuousDomain(),
      })
    ).toBe(3);
  });

  it("reflects numericDiscrete 1..5 step 0.5 so 1.5 becomes 4.5", () => {
    expect(
      reflectExpressionDomainValue({
        value: 1.5,
        expressionDomain: buildNumericDiscreteDomain(0.5),
      })
    ).toBe(4.5);
  });

  it("accepts numericDiscrete compatibility for 0..1 step 0.25", () => {
    expect(
      assertPairwiseReflectionCompatible({
        typeKey: "numericDiscrete",
        definition: { min: 0, max: 1, step: 0.25 },
      })
    ).toEqual({
      typeKey: "numericDiscrete",
      definition: { min: 0, max: 1, step: 0.25 },
    });
  });

  it("rejects numericDiscrete compatibility for 0..1 step 0.3", () => {
    expect(() =>
      assertPairwiseReflectionCompatible({
        typeKey: "numericDiscrete",
        definition: { min: 0, max: 1, step: 0.3 },
      })
    ).toThrow(
      "This discrete domain cannot be used for pairwise comparisons because some reflected values do not align with its step."
    );
  });

  it("does not snap or round numericDiscrete reflected results", () => {
    expect(
      reflectExpressionDomainValue({
        value: 0.125,
        expressionDomain: {
          typeKey: "numericDiscrete",
          definition: { min: 0, max: 1, step: 0.125 },
        },
      })
    ).toBe(0.875);
  });

  it("reflects five-label ordinals first to last and back", () => {
    const domain = buildOrdinalDomain();

    expect(
      reflectExpressionDomainValue({
        value: { labelKey: "very_low" },
        expressionDomain: domain,
      })
    ).toEqual({ labelKey: "very_high" });

    expect(
      reflectExpressionDomainValue({
        value: { labelKey: "very_high" },
        expressionDomain: domain,
      })
    ).toEqual({ labelKey: "very_low" });
  });

  it("reflects five-label ordinals second to fourth", () => {
    expect(
      reflectExpressionDomainValue({
        value: { labelKey: "low" },
        expressionDomain: buildOrdinalDomain(),
      })
    ).toEqual({ labelKey: "high" });
  });

  it("keeps the five-label ordinal middle fixed", () => {
    expect(
      reflectExpressionDomainValue({
        value: { labelKey: "medium" },
        expressionDomain: buildOrdinalDomain(),
      })
    ).toEqual({ labelKey: "medium" });
  });

  it("reflects triangular fuzzy values", () => {
    expect(
      reflectExpressionDomainValue({
        value: { labelKey: "mid" },
        expressionDomain: buildTriangularFuzzyDomain(),
      })
    ).toEqual({
      values: [0.19999999999999996, 0.5, 0.8],
    });
  });

  it("reflects trapezoidal fuzzy values", () => {
    expect(
      reflectExpressionDomainValue({
        value: { labelKey: "weak" },
        expressionDomain: buildTrapezoidalFuzzyDomain(),
      })
    ).toEqual({
      values: [0.6, 0.8, 1, 1],
    });
  });

  it("reflects hexagonal fuzzy values", () => {
    expect(
      reflectExpressionDomainValue({
        value: { labelKey: "left" },
        expressionDomain: buildHexagonalFuzzyDomain(),
      })
    ).toEqual({
      values: [0.5, 0.6, 0.7, 0.8, 0.9, 1],
    });
  });

  it("finds a configured inverse fuzzy label match", () => {
    const domain = buildTrapezoidalFuzzyDomain();
    const reflected = reflectExpressionDomainValue({
      value: { labelKey: "weak" },
      expressionDomain: domain,
    });

    expect(
      findMatchingFuzzyLabel({
        values: reflected.values,
        expressionDomain: domain,
      })
    ).toMatchObject({
      key: "strong",
    });
  });

  it("returns null for a valid unmatched inverse fuzzy vector", () => {
    expect(
      findMatchingFuzzyLabel({
        values: [0.1, 0.3, 0.7],
        expressionDomain: buildTriangularFuzzyDomain(),
      })
    ).toBeNull();
  });

  it("matches fuzzy labels with epsilon tolerance", () => {
    expect(
      findMatchingFuzzyLabel({
        values: [0.7000000001, 1, 1],
        expressionDomain: buildTriangularFuzzyDomain(),
      })
    ).toMatchObject({
      key: "high",
    });
  });

  it("rejects numericContinuous without min", () => {
    expect(() =>
      reflectExpressionDomainValue({
        value: 1,
        expressionDomain: {
          typeKey: "numericContinuous",
          definition: { max: 5 },
        },
      })
    ).toThrow("Expression domain definition is invalid.");
  });

  it("rejects numericContinuous with min === max", () => {
    expect(() =>
      reflectExpressionDomainValue({
        value: 1,
        expressionDomain: {
          typeKey: "numericContinuous",
          definition: { min: 2, max: 2 },
        },
      })
    ).toThrow("Expression domain definition is invalid.");
  });

  it("rejects numericDiscrete without step", () => {
    expect(() =>
      reflectExpressionDomainValue({
        value: 0.5,
        expressionDomain: {
          typeKey: "numericDiscrete",
          definition: { min: 0, max: 1 },
        },
      })
    ).toThrow("Expression domain definition is invalid.");
  });

  it("rejects numericDiscrete with min === max", () => {
    expect(() =>
      reflectExpressionDomainValue({
        value: 0.5,
        expressionDomain: {
          typeKey: "numericDiscrete",
          definition: { min: 1, max: 1, step: 0.5 },
        },
      })
    ).toThrow("Expression domain definition is invalid.");
  });

  it("rejects a malformed configured fuzzy label even when an earlier label matches", () => {
    expect(() =>
      findMatchingFuzzyLabel({
        values: [0, 0.5, 1],
        expressionDomain: {
          typeKey: "linguisticFuzzy",
          definition: {
            membershipFunction: "triangular",
            labels: [
              { key: "matching", label: "Matching", values: [0, 0.5, 1], index: 0 },
              { key: "broken", label: "Broken", values: [0.8, 0.2, 1], index: 1 },
            ],
          },
        },
      })
    ).toThrow("definition.labels[1].values must be non-decreasing.");
  });

  it("rejects input fuzzy vectors outside [0, 1]", () => {
    expect(() =>
      findMatchingFuzzyLabel({
        values: [0, 1.2, 1.2],
        expressionDomain: buildTriangularFuzzyDomain(),
      })
    ).toThrow("values[1] must be between 0 and 1.");
  });

  it("rejects decreasing input fuzzy vectors", () => {
    expect(() =>
      findMatchingFuzzyLabel({
        values: [0.2, 0.1, 0.3],
        expressionDomain: buildTriangularFuzzyDomain(),
      })
    ).toThrow("values must be non-decreasing.");
  });

  it("fails on unknown type keys", () => {
    expect(() =>
      reflectExpressionDomainValue({
        value: 1,
        expressionDomain: {
          typeKey: "unknownType",
          definition: {},
        },
      })
    ).toThrow('[expressionDomains] Unsupported expression domain type key "unknownType".');
  });

  it("does not mutate source fuzzy arrays", () => {
    const domain = buildTriangularFuzzyDomain();
    const originalValues = [...domain.definition.labels[1].values];

    reflectExpressionDomainValue({
      value: { labelKey: "mid" },
      expressionDomain: domain,
    });

    expect(domain.definition.labels[1].values).toEqual(originalValues);
  });

  it("does not mutate expression-domain definitions", () => {
    const domain = buildOrdinalDomain();
    const originalDefinition = structuredClone(domain.definition);

    reflectExpressionDomainValue({
      value: { labelKey: "low" },
      expressionDomain: domain,
    });

    expect(domain.definition).toEqual(originalDefinition);
  });
});
