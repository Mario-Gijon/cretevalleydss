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

  it("offers only the fixed global Saaty scale for AHPSort and remaps an old draft", () => {
    const ahpSortModel = {
      apiModelKey: "ahp_sort_i",
      requiresHomogeneousExpressionDomains: true,
      supportedExpressionDomains: [
        {
          typeKey: "numericSaaty",
          constraints: { scale: "saaty-fundamental-1-9" },
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
        name: "AHP Saaty Scale",
        typeKey: "numericSaaty",
        definition: { scale: "saaty-fundamental-1-9" },
      },
      {
        _id: "domain-ahp-legacy",
        name: "Deprecated AHP range",
        typeKey: "numericContinuous",
        definition: { min: 1 / 9, max: 9, step: null },
      },
    ];
    const options = resolveExpressionDomainOptions(ahpSortModel, globalDomains, []);

    expect(options.allDomains.map(({ _id }) => _id)).toEqual([
      "domain-ahp",
    ]);
    expect(options.defaultDomainId).toBe("domain-ahp");

    const nextConfig = buildInitialExpressionDomainConfig({
      selectedModel: ahpSortModel,
      leafCriteria: [
        { id: "quality", name: "Quality" },
        { id: "cost", name: "Cost" },
      ],
      currentConfig: {
        mode: "byCriterion",
        domainsByCriterion: {
          Quality: "domain-0-1",
          Cost: "domain-ahp-legacy",
        },
      },
      globalDomains,
      expressionDomains: [],
    });

    expect(nextConfig).toEqual({ mode: "global", globalDomainId: "domain-ahp" });
  });
});
