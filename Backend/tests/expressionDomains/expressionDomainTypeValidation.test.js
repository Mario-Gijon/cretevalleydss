import { describe, expect, it } from "vitest";

import { linguisticFuzzy } from "../../modules/expressionDomains/types/linguisticFuzzy/index.js";
import { linguisticOrdinal } from "../../modules/expressionDomains/types/linguisticOrdinal/index.js";
import { numericContinuous } from "../../modules/expressionDomains/types/numericContinuous/index.js";
import { numericDiscrete } from "../../modules/expressionDomains/types/numericDiscrete/index.js";

describe("expression domain type validation", () => {
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
