import { describe, expect, it } from "vitest";

import { getSupportedDomainPools } from "../../src/utils/domainAssignments.utils.js";

describe("getSupportedDomainPools", () => {
  it("separates numeric and linguistic domains through typeKey/catalog metadata", () => {
    const selectedModel = {
      supportedExpressionDomains: [
        { typeKey: "numericContinuous", constraints: {} },
        { typeKey: "numericDiscrete", constraints: {} },
        { typeKey: "linguisticOrdinal", constraints: {} },
        { typeKey: "linguisticFuzzy", constraints: {} },
      ],
    };

    const globalDomains = [
      {
        _id: "domain-continuous",
        name: "Continuous 0-1",
        typeKey: "numericContinuous",
        definition: {
          min: 0,
          max: 1,
          step: null,
        },
      },
      {
        _id: "domain-ordinal",
        name: "Ordinal labels",
        typeKey: "linguisticOrdinal",
        definition: {
          labels: [
            { key: "low", label: "Low", index: 0 },
            { key: "high", label: "High", index: 1 },
          ],
        },
      },
    ];

    const expressionDomains = [
      {
        _id: "domain-discrete",
        name: "Discrete 0-9",
        typeKey: "numericDiscrete",
        definition: {
          min: 0,
          max: 9,
          step: 1,
        },
      },
      {
        _id: "domain-fuzzy",
        name: "Fuzzy labels",
        typeKey: "linguisticFuzzy",
        definition: {
          membershipFunction: "triangular",
          labelCount: 3,
          labels: [
            { key: "low", label: "Low", index: 0, values: [0, 0, 0.4] },
            { key: "mid", label: "Mid", index: 1, values: [0.2, 0.5, 0.8] },
            { key: "high", label: "High", index: 2, values: [0.6, 1, 1] },
          ],
        },
      },
    ];

    const result = getSupportedDomainPools(
      selectedModel,
      globalDomains,
      expressionDomains
    );

    expect(result.numericDomains.map((domain) => domain._id)).toEqual([
      "domain-continuous",
      "domain-discrete",
    ]);
    expect(result.linguisticDomains.map((domain) => domain._id)).toEqual([
      "domain-ordinal",
      "domain-fuzzy",
    ]);
  });
});
