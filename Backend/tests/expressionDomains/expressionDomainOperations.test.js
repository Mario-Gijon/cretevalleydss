import { describe, expect, it } from "vitest";

import {
  assertPairwiseReflectionCompatible,
  findMatchingFuzzyLabel,
  reflectExpressionDomainValue,
} from "../../modules/expressionDomains/index.js";

const numericContinuousDomain = {
  typeKey: "numericContinuous",
  definition: {
    min: 0,
    max: 10,
  },
};

const numericDiscreteCompatibleDomain = {
  typeKey: "numericDiscrete",
  definition: {
    min: 1,
    max: 5,
    step: 0.5,
  },
};

const numericDiscreteIncompatibleDomain = {
  typeKey: "numericDiscrete",
  definition: {
    min: 0,
    max: 1,
    step: 0.3,
  },
};

const linguisticOrdinalDomain = {
  typeKey: "linguisticOrdinal",
  definition: {
    labels: [
      { key: "low", label: "Low", index: 0 },
      { key: "medium", label: "Medium", index: 1 },
      { key: "high", label: "High", index: 2 },
    ],
  },
};

const linguisticFuzzyDomain = {
  typeKey: "linguisticFuzzy",
  definition: {
    membershipFunction: "triangular",
    labels: [
      { key: "low", label: "Low", values: [0, 0, 0.4], index: 0 },
      { key: "medium", label: "Medium", values: [0.2, 0.5, 0.8], index: 1 },
      { key: "high", label: "High", values: [0.6, 1, 1], index: 2 },
    ],
  },
};

describe("expression domain operations", () => {
  it("reflects numericContinuous values across the configured range", () => {
    expect(
      reflectExpressionDomainValue({
        value: 2.5,
        expressionDomain: numericContinuousDomain,
      })
    ).toBe(7.5);
  });

  it("reflects compatible numericDiscrete values", () => {
    expect(
      reflectExpressionDomainValue({
        value: 2,
        expressionDomain: numericDiscreteCompatibleDomain,
      })
    ).toBe(4);
  });

  it("rejects incompatible numericDiscrete pairwise reflection domains", () => {
    try {
      assertPairwiseReflectionCompatible(numericDiscreteIncompatibleDomain);
      throw new Error("Expected incompatibility error.");
    } catch (error) {
      expect(error).toMatchObject({
        code: "PAIRWISE_REFLECTION_INCOMPATIBLE_DOMAIN",
        field: "expressionDomain.definition.step",
        message:
          "This discrete domain cannot be used for pairwise comparisons because some reflected values do not align with its step.",
      });
    }
  });

  it("reflects linguisticOrdinal values by reversed label order", () => {
    expect(
      reflectExpressionDomainValue({
        value: { labelKey: "low" },
        expressionDomain: linguisticOrdinalDomain,
      })
    ).toEqual({ labelKey: "high" });
  });

  it("reflects linguisticFuzzy values into a derived fuzzy value array", () => {
    expect(
      reflectExpressionDomainValue({
        value: { labelKey: "medium" },
        expressionDomain: linguisticFuzzyDomain,
      })
    ).toEqual({
      values: [0.19999999999999996, 0.5, 0.8],
    });
  });

  it("finds a matching configured fuzzy label by epsilon comparison", () => {
    expect(
      findMatchingFuzzyLabel({
        values: [0.6000000001, 1, 1],
        expressionDomain: linguisticFuzzyDomain,
      })
    ).toMatchObject({
      key: "high",
      label: "High",
    });
  });

  it("returns null when no fuzzy label matches", () => {
    expect(
      findMatchingFuzzyLabel({
        values: [0.1, 0.2, 0.3],
        expressionDomain: linguisticFuzzyDomain,
      })
    ).toBeNull();
  });
});
