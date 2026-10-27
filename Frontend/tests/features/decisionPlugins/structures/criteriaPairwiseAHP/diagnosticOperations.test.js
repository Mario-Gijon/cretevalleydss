import { describe, expect, it } from "vitest";

import { explainDiagnosticTriad, formatAHPDiagnosticRatio } from "../../../../../src/features/decisionPlugins/evaluations/structures/criteriaPairwiseAHP/operations/explainDiagnosticTriad.js";
import { resolveRepresentativeRecommendations } from "../../../../../src/features/decisionPlugins/evaluations/structures/criteriaPairwiseAHP/operations/resolveRepresentativeRecommendations.js";
import { isReviewCandidatePair, resolveReviewCandidatePairs } from "../../../../../src/features/decisionPlugins/evaluations/structures/criteriaPairwiseAHP/operations/resolveReviewCandidatePairs.js";

describe("AHP diagnostic presentation operations", () => {
  it("narrates reciprocal judgments in the correct direction using criterion IDs", () => {
    const result = explainDiagnosticTriad({
      criteria: [
        { id: "quality", name: "Quality" },
        { id: "cost", name: "Cost" },
        { id: "safety", name: "Safety" },
      ],
      comparisons: [
        { fromCriterionId: "quality", toCriterionId: "cost", value: 1 / 3 },
        { fromCriterionId: "cost", toCriterionId: "safety", value: 3 },
        { fromCriterionId: "quality", toCriterionId: "safety", value: 1 / 3 },
      ],
      impliedRatio: 1,
      directRatio: 1 / 3,
      cycleRatio: 3,
    });

    expect(result.text).toBe(
      "You rated Cost as more important than Quality, and Cost as more important than Safety. " +
      "Taken together, those answers suggest Quality and Safety should be equally important. " +
      "However, you rated Safety as more important than Quality. There is a substantial mismatch between these views. " +
      "This does not mean any one answer is wrong.",
    );
    expect(result.strongContradiction).toBe(true);
  });

  it("explains equal comparisons in plain language", () => {
    const result = explainDiagnosticTriad({
      criteria: [
        { id: "quality", name: "Quality" },
        { id: "cost", name: "Cost" },
        { id: "safety", name: "Safety" },
      ],
      comparisons: [
        { fromCriterionId: "quality", toCriterionId: "cost", value: 1 },
        { fromCriterionId: "cost", toCriterionId: "safety", value: 2 },
        { fromCriterionId: "quality", toCriterionId: "safety", value: 1 / 3 },
      ],
      impliedRatio: 2,
      directRatio: 1 / 3,
      cycleRatio: 6,
    });

    expect(result.text).toContain("You rated Quality and Cost as equally important");
    expect(result.text).toContain("Taken together, those answers suggest Quality should be more important than Safety");
    expect(result.text).toContain("However, you rated Safety as more important than Quality");
  });

  it("describes an out-of-scale implied preference without presenting it as a selectable choice", () => {
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
      cycleRatio: 81,
    });

    expect(result.text).toContain("A would need to be far more important than C—beyond the available comparison scale");
    expect(result.text).not.toContain("81 times");
    expect(result.text).not.toContain("cycle");
    expect(result.outsideSaatyScale).toBe(true);
    expect(result.strongContradiction).toBe(true);
    expect(formatAHPDiagnosticRatio(1 / 9)).toBe("1/9");
  });

  it("explains a preference in the reverse orientation when the combined ratio is below one", () => {
    const result = explainDiagnosticTriad({
      criteria: [
        { id: "quality", name: "Quality" },
        { id: "cost", name: "Cost" },
        { id: "safety", name: "Safety" },
      ],
      comparisons: [
        { fromCriterionId: "quality", toCriterionId: "cost", value: 1 / 3 },
        { fromCriterionId: "cost", toCriterionId: "safety", value: 1 / 2 },
        { fromCriterionId: "quality", toCriterionId: "safety", value: 3 },
      ],
      impliedRatio: 1 / 6,
      directRatio: 3,
      cycleRatio: 1 / 18,
    });

    expect(result.text).toContain("Taken together, those answers suggest Safety should be more important than Quality");
    expect(result.text).toContain("However, you rated Quality as more important than Safety");
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

  it("highlights only the selected contradiction and all three of its pairs", () => {
    const selectedTriad = {
      comparisons: [
        { fromCriterionId: "quality", toCriterionId: "cost", value: 2 },
        { fromCriterionId: "cost", toCriterionId: "safety", value: 3 },
        { fromCriterionId: "quality", toCriterionId: "safety", value: 1 / 2 },
      ],
      candidateComparisons: [{ criterionId: "quality", comparedCriterionId: "cost" }],
    };
    const pairs = resolveReviewCandidatePairs({
      candidateComparisons: [{ criterionId: "quality", comparedCriterionId: "delivery" }],
      recommendations: [{ comparison: { criterionId: "safety", comparedCriterionId: "delivery" } }],
      triads: [{ candidateComparisons: [{ criterionId: "quality", comparedCriterionId: "delivery" }] }],
    }, { selectedTriad });

    expect([...pairs]).toHaveLength(3);
    expect(isReviewCandidatePair(pairs, "quality", "cost")).toBe(true);
    expect(isReviewCandidatePair(pairs, "cost", "safety")).toBe(true);
    expect(isReviewCandidatePair(pairs, "quality", "safety")).toBe(true);
    expect(isReviewCandidatePair(pairs, "quality", "delivery")).toBe(false);
    expect(isReviewCandidatePair(pairs, "quality", "quality")).toBe(false);
  });

  it("keeps one DMS-provided recommendation per criterion pair in response order", () => {
    const first = { comparison: { criterionId: "quality", comparedCriterionId: "cost" }, suggestedValue: 2 };
    const duplicateReverse = { comparison: { criterionId: "cost", comparedCriterionId: "quality" }, suggestedValue: 3 };
    const secondPair = { comparison: { criterionId: "safety", comparedCriterionId: "quality" }, suggestedValue: 4 };

    expect(resolveRepresentativeRecommendations([first, duplicateReverse, secondPair])).toEqual([first, secondPair]);
    expect(resolveRepresentativeRecommendations([first])).toEqual([first]);
  });
});
