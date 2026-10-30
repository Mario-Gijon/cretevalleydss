import { describe, expect, it } from "vitest";

import { linguisticFuzzy } from "../../modules/expressionDomains/types/linguisticFuzzy/index.js";
import { linguistic2Tuple } from "../../modules/expressionDomains/types/linguistic2Tuple/index.js";
import { linguisticOrdinal } from "../../modules/expressionDomains/types/linguisticOrdinal/index.js";
import { numericContinuous } from "../../modules/expressionDomains/types/numericContinuous/index.js";
import { numericDiscrete } from "../../modules/expressionDomains/types/numericDiscrete/index.js";
import { numericSaaty } from "../../modules/expressionDomains/types/numericSaaty/index.js";
import { AHP_SAATY_SCALE_VALUES } from "../../modules/expressionDomains/types/numericSaaty/saatyScale.js";
import { normalizeNewExpressionDomainPayload } from "../../modules/expressionDomains/normalizeExpressionDomainPayload.js";

describe("expression domain type validation", () => {
  it("validates only the 17 fixed AHP Saaty values and rejects user creation", () => {
    const domain = {
      name: "AHP Saaty Scale",
      typeKey: "numericSaaty",
      definition: { scale: "saaty-fundamental-1-9" },
    };

    for (const value of AHP_SAATY_SCALE_VALUES) {
      expect(numericSaaty.validateEvaluation({ value, expressionDomain: domain })).toBe(value);
    }
    expect(numericSaaty.validateEvaluation({ value: 1 / 3 + 1e-13, expressionDomain: domain })).toBe(1 / 3);
    for (const invalid of [1.7, 2.5, 0.7]) {
      expect(() => numericSaaty.validateEvaluation({ value: invalid, expressionDomain: domain })).toThrow(/17 fundamental/);
    }
    for (const invalid of [true, Number.NaN]) {
      expect(() => numericSaaty.validateEvaluation({ value: invalid, expressionDomain: domain })).toThrow(/finite number/);
    }
    expect(() => numericSaaty.validateEvaluation({
      value: 3,
      expressionDomain: { ...domain, definition: { scale: "other" } },
    })).toThrow(/definition is invalid/);
    for (const payload of [domain, { ...domain, typeKey: " numericSaaty " }]) {
      let creationError;
      try {
        normalizeNewExpressionDomainPayload(payload);
      } catch (error) {
        creationError = error;
      }
      expect(creationError).toMatchObject({ code: "FORBIDDEN", statusCode: 403 });
    }
  });

  it("validates numericContinuous creation and evaluation", () => {
    const expressionDomain = numericContinuous.validateCreation({
      name: "Numeric continuous",
      definition: {
        min: 0,
        max: 10,
      },
    });

    expect(expressionDomain).toEqual({
      name: "Numeric continuous",
      typeKey: "numericContinuous",
      definition: {
        min: 0,
        max: 10,
        step: null,
      },
    });
    expect(
      numericContinuous.validateEvaluation({
        value: 4.5,
        expressionDomain,
      })
    ).toBe(4.5);
  });

  it("validates numericDiscrete creation and evaluation", () => {
    const expressionDomain = numericDiscrete.validateCreation({
      name: "Numeric discrete",
      definition: {
        min: 1,
        max: 5,
        step: 1,
      },
    });

    expect(expressionDomain).toEqual({
      name: "Numeric discrete",
      typeKey: "numericDiscrete",
      definition: {
        min: 1,
        max: 5,
        step: 1,
      },
    });
    expect(
      numericDiscrete.validateEvaluation({
        value: 3,
        expressionDomain,
      })
    ).toBe(3);
  });

  it("validates linguisticOrdinal creation and evaluation", () => {
    const expressionDomain = linguisticOrdinal.validateCreation({
      name: "Ordinal domain",
      definition: {
        labels: ["Low", "Medium", "High"],
      },
    });

    expect(expressionDomain).toEqual({
      name: "Ordinal domain",
      typeKey: "linguisticOrdinal",
      definition: {
        labelCount: 3,
        labels: [
          { key: "low", label: "Low", index: 0 },
          { key: "medium", label: "Medium", index: 1 },
          { key: "high", label: "High", index: 2 },
        ],
      },
    });
    expect(
      linguisticOrdinal.validateEvaluation({
        value: { labelKey: "medium" },
        expressionDomain,
      })
    ).toEqual({ labelKey: "medium" });
  });

  it("validates linguistic2Tuple creation and evaluation", () => {
    const expressionDomain = linguistic2Tuple.validateCreation({
      name: "2-tuple domain",
      definition: {
        labels: ["Low", "Medium", "High"],
      },
    });

    expect(expressionDomain).toEqual({
      name: "2-tuple domain",
      typeKey: "linguistic2Tuple",
      definition: {
        labelCount: 3,
        labels: [
          { key: "low", label: "Low", index: 0 },
          { key: "medium", label: "Medium", index: 1 },
          { key: "high", label: "High", index: 2 },
        ],
      },
    });
    expect(
      linguistic2Tuple.validateEvaluation({
        value: { labelKey: "medium", alpha: 0 },
        expressionDomain,
      })
    ).toEqual({ labelKey: "medium", alpha: 0 });
  });

  it("validates linguisticFuzzy creation and evaluation", () => {
    const expressionDomain = linguisticFuzzy.validateCreation({
      name: "Fuzzy domain",
      definition: {
        membershipFunction: "triangular",
        labels: [
          { label: "Low", values: [0, 0, 0.4] },
          { label: "Medium", values: [0.2, 0.5, 0.8] },
          { label: "High", values: [0.6, 1, 1] },
        ],
      },
    });

    expect(expressionDomain).toEqual({
      name: "Fuzzy domain",
      typeKey: "linguisticFuzzy",
      definition: {
        membershipFunction: "triangular",
        labelCount: 3,
        labels: [
          { key: "low", label: "Low", values: [0, 0, 0.4], index: 0 },
          { key: "medium", label: "Medium", values: [0.2, 0.5, 0.8], index: 1 },
          { key: "high", label: "High", values: [0.6, 1, 1], index: 2 },
        ],
      },
    });
    expect(
      linguisticFuzzy.validateEvaluation({
        value: { labelKey: "medium" },
        expressionDomain,
      })
    ).toEqual({ labelKey: "medium" });
  });
});
