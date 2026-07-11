import { describe, expect, it } from "vitest";

import {
  describePairwiseCellValue,
  getUnmatchedFuzzyTooltipText,
  updatePairwiseEvaluations,
} from "../../../src/features/decisionPlugins/evaluations/structures/alternativePairwiseByCriterion/components/pairwiseGrid.helpers.js";

const alternatives = [
  { id: "alt-a", name: "Alternative A" },
  { id: "alt-b", name: "Alternative B" },
];

const numericContinuousDomain = {
  typeKey: "numericContinuous",
  definition: {
    min: 1,
    max: 5,
  },
};

const ordinalDomain = {
  typeKey: "linguisticOrdinal",
  definition: {
    labels: [
      { key: "low", label: "Low", index: 0 },
      { key: "medium", label: "Medium", index: 1 },
      { key: "high", label: "High", index: 2 },
    ],
  },
};

const fuzzyDomain = {
  typeKey: "linguisticFuzzy",
  definition: {
    membershipFunction: "triangular",
    labels: [
      { key: "low", label: "Low", values: [0, 0, 0.2], index: 0 },
      { key: "custom", label: "Custom", values: [0.1, 0.3, 0.9], index: 1 },
      { key: "high", label: "High", values: [0.8, 1, 1], index: 2 },
    ],
  },
};

describe("pairwiseGrid helpers", () => {
  it("changing ordinal upper updates the reflected label", () => {
    const result = updatePairwiseEvaluations({
      alternatives,
      evaluations: {},
      rowAlternativeId: "alt-a",
      columnAlternativeId: "alt-b",
      nextValue: { labelKey: "low" },
      expressionDomain: ordinalDomain,
    });

    expect(result["alt-a"]["alt-b"]).toEqual({
      value: { labelKey: "low" },
    });
    expect(result["alt-b"]["alt-a"]).toEqual({
      value: { labelKey: "high" },
    });
  });

  it("changing fuzzy upper stores labelKey above and values below", () => {
    const result = updatePairwiseEvaluations({
      alternatives,
      evaluations: {},
      rowAlternativeId: "alt-a",
      columnAlternativeId: "alt-b",
      nextValue: { labelKey: "high" },
      expressionDomain: fuzzyDomain,
    });

    expect(result["alt-a"]["alt-b"]).toEqual({
      value: { labelKey: "high" },
    });
    expect(result["alt-b"]["alt-a"]).toEqual({
      value: { values: [0, 0, 0.19999999999999996] },
    });
  });

  it("clearing the upper cell clears both directions", () => {
    const result = updatePairwiseEvaluations({
      alternatives,
      evaluations: {
        "alt-a": {
          "alt-b": { value: 2 },
        },
        "alt-b": {
          "alt-a": { value: 4 },
        },
      },
      rowAlternativeId: "alt-a",
      columnAlternativeId: "alt-b",
      nextValue: "",
      expressionDomain: numericContinuousDomain,
    });

    expect(result["alt-a"]["alt-b"]).toEqual({ value: "" });
    expect(result["alt-b"]["alt-a"]).toEqual({ value: "" });
  });

  it("invalid values never produce a fallback or snapped lower value", () => {
    const result = updatePairwiseEvaluations({
      alternatives,
      evaluations: {},
      rowAlternativeId: "alt-a",
      columnAlternativeId: "alt-b",
      nextValue: 0.2,
      expressionDomain: {
        typeKey: "numericDiscrete",
        definition: { min: 0, max: 1, step: 0.25 },
      },
    });

    expect(result["alt-a"]["alt-b"]).toEqual({ value: 0.2 });
    expect(result["alt-b"]["alt-a"]).toEqual({ value: "" });
  });

  it("matching fuzzy inverses display the configured label", () => {
    expect(
      describePairwiseCellValue({
        cell: { value: { values: [0, 0, 0.2] } },
        expressionDomain: fuzzyDomain,
      })
    ).toEqual({
      text: "Low",
      tooltip: null,
    });
  });

  it("unmatched fuzzy inverses display the vector and tooltip", () => {
    expect(
      describePairwiseCellValue({
        cell: { value: { values: [0.09999999999999998, 0.7, 0.9] } },
        expressionDomain: fuzzyDomain,
      })
    ).toEqual({
      text: "[0.1, 0.7, 0.9]",
      tooltip: getUnmatchedFuzzyTooltipText(),
    });
  });
});
