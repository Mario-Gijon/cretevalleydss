import { describe, expect, it } from "vitest";

import { explainDiagnosticTriad, formatAHPDiagnosticRatio } from "../../../../../src/features/decisionPlugins/evaluations/structures/criteriaPairwiseAHP/operations/explainDiagnosticTriad.js";
import { isReviewCandidatePair, resolveReviewCandidatePairs } from "../../../../../src/features/decisionPlugins/evaluations/structures/criteriaPairwiseAHP/operations/resolveReviewCandidatePairs.js";

describe("AHP diagnostic presentation operations", () => {
  it("explains reciprocal judgments in the correct direction using criterion IDs", () => {
    const result = explainDiagnosticTriad({
      criteria: [
        { id: "quality", name: "Quality" },
        { id: "cost", name: "Cost" },
        { id: "safety", name: "Safety" },
      ],
      comparisons: [
        { fromCriterionId: "quality", toCriterionId: "cost", value: 1 / 3 },
        { fromCriterionId: "cost", toCriterionId: "safety", value: 3 },
        { fromCriterionId: "quality", toCriterionId: "safety", value: 1 },
      ],
      impliedRatio: 1,
      directRatio: 1,
    });

    expect(result.text).toContain("Cost was judged 3 times more important than Quality");
    expect(result.text).toContain("Cost was judged 3 times more important than Safety");
    expect(result.text).toContain("Quality and Safety are equally important");
  });

  it("describes implied ratios outside Saaty's scale without presenting them as choices", () => {
    const result = explainDiagnosticTriad({
      criteria: [
        { id: "a", name: "A" },
        { id: "b", name: "B" },
        { id: "c", name: "C" },
      ],
      comparisons: [
        { fromCriterionId: "a", toCriterionId: "b", value: 9 },
        { fromCriterionId: "b", toCriterionId: "c", value: 9 },
        { fromCriterionId: "a", toCriterionId: "c", value: 1 },
      ],
      impliedRatio: 81,
      directRatio: 1,
    });

    expect(result.text).toContain("A is 81 times more important than C");
    expect(result.outsideSaatyScale).toBe(true);
    expect(formatAHPDiagnosticRatio(1 / 9)).toBe("1/9");
  });

  it("highlights both orientations by criterion IDs, and leaves diagonal pairs out", () => {
    const pairs = resolveReviewCandidatePairs({
      candidateComparisons: [{ criterionId: "quality", comparedCriterionId: "cost" }],
      recommendations: [{ comparison: { criterionId: "safety", comparedCriterionId: "quality" } }],
      triads: [{ candidateComparisons: [{ criterionId: "cost", comparedCriterionId: "safety" }] }],
    });

    expect(isReviewCandidatePair(pairs, "quality", "cost")).toBe(true);
    expect(isReviewCandidatePair(pairs, "cost", "quality")).toBe(true);
    expect(isReviewCandidatePair(pairs, "cost", "safety")).toBe(true);
    expect(isReviewCandidatePair(pairs, "quality", "quality")).toBe(false);
    expect(isReviewCandidatePair(pairs, "unrelated", "pair")).toBe(false);
  });
});
