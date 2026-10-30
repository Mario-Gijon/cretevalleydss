import { describe, expect, it } from "vitest";

import {
  buildInitialExpressionDomainConfig,
  getSupportedDomainPools,
  resolveExpressionDomainOptions,
} from "../../src/utils/domainAssignments.utils.js";

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

  it("offers the AHP [1/9, 9] domain for AHPSort and remaps an old 0-1 draft", () => {
    const ahpSortModel = {
      apiModelKey: "ahp_sort_i",
      supportedExpressionDomains: [
        {
          typeKey: "numericContinuous",
          constraints: { min: 1 / 9, max: 9 },
        },
      ],
    };
    const globalDomains = [
      {
        _id: "domain-0-1",
        name: "Continuous 0-1",
        typeKey: "numericContinuous",
        definition: { min: 0, max: 1, step: null },
      },
      {
        _id: "domain-ahp",
        name: "Numerical AHP [1/9, 9]",
        typeKey: "numericContinuous",
        definition: { min: 1 / 9, max: 9, step: null },
      },
      {
        _id: "domain-ahp-legacy",
        name: "AHPSort I Saaty ratio scale",
        typeKey: "numericContinuous",
        definition: { min: 1 / 9, max: 9, step: null },
      },
    ];
    const options = resolveExpressionDomainOptions(ahpSortModel, globalDomains, []);

    expect(options.allDomains.map(({ _id }) => _id)).toEqual([
      "domain-ahp",
      "domain-ahp-legacy",
    ]);
    expect(options.defaultDomainId).toBe("domain-ahp");

    const nextConfig = buildInitialExpressionDomainConfig({
      selectedModel: ahpSortModel,
      leafCriteria: [
        { id: "quality", name: "Quality" },
        { id: "cost", name: "Cost" },
      ],
      currentConfig: { mode: "global", globalDomainId: "domain-0-1" },
      globalDomains,
      expressionDomains: [],
    });

    expect(nextConfig).toEqual({ mode: "global", globalDomainId: "domain-ahp" });
  });
});
