import { describe, expect, it } from "vitest";

import { getExpressionDomainTypeOrThrow } from "../../modules/decisionPlugins/expressionDomains/index.js";

const buildContinuousDomain = (definition = {}) => ({
  typeKey: "numericContinuous",
  definition,
});

const buildDiscreteDomain = (definition = {}) => ({
  typeKey: "numericDiscrete",
  definition,
});

describe("decisionPlugins expression-domain pairwiseComparison", () => {
  it("registers pairwiseComparison for numericContinuous", () => {
    const entry = getExpressionDomainTypeOrThrow("numericContinuous");

    expect(entry.pairwiseComparison).toMatchObject({
      assertSupported: expect.any(Function),
      getInverseValue: expect.any(Function),
    });
  });

  it("registers pairwiseComparison for numericDiscrete", () => {
    const entry = getExpressionDomainTypeOrThrow("numericDiscrete");

    expect(entry.pairwiseComparison).toMatchObject({
      assertSupported: expect.any(Function),
      getInverseValue: expect.any(Function),
    });
  });

  it("keeps linguistic domains without pairwiseComparison", () => {
    expect(getExpressionDomainTypeOrThrow("linguisticOrdinal").pairwiseComparison)
      .toBeUndefined();
    expect(getExpressionDomainTypeOrThrow("linguisticFuzzy").pairwiseComparison)
      .toBeUndefined();
  });

  it("returns the reflected inverse for a continuous 0..10 domain", () => {
    const entry = getExpressionDomainTypeOrThrow("numericContinuous");

    expect(
      entry.pairwiseComparison.getInverseValue({
        value: 2,
        expressionDomain: buildContinuousDomain({ min: 0, max: 10 }),
      })
    ).toBe(8);
  });

  it("returns the reflected inverse for a continuous -5..5 domain", () => {
    const entry = getExpressionDomainTypeOrThrow("numericContinuous");

    expect(
      entry.pairwiseComparison.getInverseValue({
        value: -2,
        expressionDomain: buildContinuousDomain({ min: -5, max: 5 }),
      })
    ).toBe(2);
  });

  it("keeps existing continuous validation errors for invalid input", () => {
    const entry = getExpressionDomainTypeOrThrow("numericContinuous");

    expect(() =>
      entry.pairwiseComparison.getInverseValue({
        value: 12,
        expressionDomain: buildContinuousDomain({ min: 0, max: 10 }),
      })
    ).toThrow(/between 0 and 10/i);
  });

  it("supports closed discrete domains and reflects values exactly", () => {
    const entry = getExpressionDomainTypeOrThrow("numericDiscrete");

    expect(() =>
      entry.pairwiseComparison.assertSupported({
        expressionDomain: buildDiscreteDomain({ min: 0, max: 10, step: 2 }),
      })
    ).not.toThrow();
    expect(
      entry.pairwiseComparison.getInverseValue({
        value: 2,
        expressionDomain: buildDiscreteDomain({ min: 0, max: 10, step: 2 }),
      })
    ).toBe(8);
  });

  it("reflects values in a closed discrete 1..5 step 1 domain", () => {
    const entry = getExpressionDomainTypeOrThrow("numericDiscrete");

    expect(
      entry.pairwiseComparison.getInverseValue({
        value: 2,
        expressionDomain: buildDiscreteDomain({ min: 1, max: 5, step: 1 }),
      })
    ).toBe(4);
  });

  it("rejects non-closed discrete domains for pairwise comparison", () => {
    const entry = getExpressionDomainTypeOrThrow("numericDiscrete");

    expect(() =>
      entry.pairwiseComparison.assertSupported({
        expressionDomain: buildDiscreteDomain({ min: 0, max: 10, step: 3 }),
      })
    ).toThrow(/not closed under pairwise reflection/i);
  });

  it("keeps ordinary discrete evaluation valid for non-closed domains", () => {
    const entry = getExpressionDomainTypeOrThrow("numericDiscrete");

    expect(
      entry.validateEvaluation({
        value: 9,
        expressionDomain: buildDiscreteDomain({ min: 0, max: 10, step: 3 }),
      })
    ).toBe(9);
  });
});
