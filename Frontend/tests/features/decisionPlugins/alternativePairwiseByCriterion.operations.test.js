import { describe, expect, it } from "vitest";

import {
  describePairwiseCellValue,
  getUnmatchedFuzzyTooltipText,
} from "../../../src/features/decisionPlugins/evaluations/structures/alternativePairwiseByCriterion/operations/describeAlternativePairwiseValue.js";
import { requireCanonicalPairwiseEvaluations } from "../../../src/features/decisionPlugins/evaluations/structures/alternativePairwiseByCriterion/operations/validateAlternativePairwiseEvaluation.js";
import { updatePairwiseEvaluations } from "../../../src/features/decisionPlugins/evaluations/structures/alternativePairwiseByCriterion/operations/updateAlternativePairwiseComparison.js";

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

const canonicalEmptyEvaluations = {
  "alt-a": {
    "alt-b": { value: "" },
  },
  "alt-b": {
    "alt-a": { value: "" },
  },
};

describe("alternative pairwise operations", () => {
  it("requires a canonical empty matrix", () => {
    expect(
      requireCanonicalPairwiseEvaluations({
        alternatives,
        evaluations: canonicalEmptyEvaluations,
      })
    ).toBe(canonicalEmptyEvaluations);
  });

  it("rejects a missing row", () => {
    expect(() =>
      requireCanonicalPairwiseEvaluations({
        alternatives,
        evaluations: {
          "alt-a": {
            "alt-b": { value: "" },
          },
        },
      })
    ).toThrow('Pairwise evaluations are missing row "alt-b".');
  });

  it("rejects a missing directed cell", () => {
    expect(() =>
      requireCanonicalPairwiseEvaluations({
        alternatives,
        evaluations: {
          "alt-a": {},
          "alt-b": {
            "alt-a": { value: "" },
          },
        },
      })
    ).toThrow('Pairwise row "alt-a" is missing column "alt-b".');
  });

  it("rejects a primitive cell", () => {
    expect(() =>
      requireCanonicalPairwiseEvaluations({
        alternatives,
        evaluations: {
          "alt-a": {
            "alt-b": 1,
          },
          "alt-b": {
            "alt-a": { value: "" },
          },
        },
      })
    ).toThrow("evaluations.alt-a.alt-b must be a canonical pairwise cell object.");
  });

  it("rejects a cell with expressionDomain", () => {
    expect(() =>
      requireCanonicalPairwiseEvaluations({
        alternatives,
        evaluations: {
          "alt-a": {
            "alt-b": { value: "", expressionDomain: numericContinuousDomain },
          },
          "alt-b": {
            "alt-a": { value: "" },
          },
        },
      })
    ).toThrow('evaluations.alt-a.alt-b must contain exactly the key "value".');
  });

  it("rejects a cell with an extra metadata field", () => {
    expect(() =>
      requireCanonicalPairwiseEvaluations({
        alternatives,
        evaluations: {
          "alt-a": {
            "alt-b": { value: "", meta: true },
          },
          "alt-b": {
            "alt-a": { value: "" },
          },
        },
      })
    ).toThrow('evaluations.alt-a.alt-b must contain exactly the key "value".');
  });

  it("rejects a diagonal cell", () => {
    expect(() =>
      requireCanonicalPairwiseEvaluations({
        alternatives,
        evaluations: {
          "alt-a": {
            "alt-a": { value: "" },
            "alt-b": { value: "" },
          },
          "alt-b": {
            "alt-a": { value: "" },
          },
        },
      })
    ).toThrow('Pairwise row "alt-a" must not contain a diagonal cell.');
  });

  it("changing ordinal upper updates the reflected label", () => {
    const result = updatePairwiseEvaluations({
      alternatives,
      evaluations: canonicalEmptyEvaluations,
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
      evaluations: canonicalEmptyEvaluations,
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
      evaluations: canonicalEmptyEvaluations,
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

  it("rejects a lower-triangle update attempt", () => {
    expect(() =>
      updatePairwiseEvaluations({
        alternatives,
        evaluations: canonicalEmptyEvaluations,
        rowAlternativeId: "alt-b",
        columnAlternativeId: "alt-a",
        nextValue: 2,
        expressionDomain: numericContinuousDomain,
      })
    ).toThrow("Pairwise updates can only target upper-triangle cells.");
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
