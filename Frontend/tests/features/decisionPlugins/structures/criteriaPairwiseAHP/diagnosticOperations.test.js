import { describe, expect, it } from "vitest";

import { explainDiagnosticTriad, formatAHPDiagnosticRatio } from "../../../../../src/features/decisionPlugins/evaluations/structures/criteriaPairwiseAHP/operations/explainDiagnosticTriad.js";
import { isReviewCandidatePair, resolveReviewCandidatePairs } from "../../../../../src/features/decisionPlugins/evaluations/structures/criteriaPairwiseAHP/operations/resolveReviewCandidatePairs.js";

const makeTriad = (firstToSecond, secondToThird, firstToThird) => ({
  criteria: [
    { id: "quality", name: "Quality" },
    { id: "cost", name: "Cost" },
    { id: "sustainability", name: "Sustainability" },
  ],
  comparisons: [
    { fromCriterionId: "quality", toCriterionId: "cost", value: firstToSecond },
    { fromCriterionId: "cost", toCriterionId: "sustainability", value: secondToThird },
    { fromCriterionId: "quality", toCriterionId: "sustainability", value: firstToThird },
  ],
  impliedRatio: firstToSecond * secondToThird,
  directRatio: firstToThird,
});

describe("AHP diagnostic presentation operations", () => {
  it("describes a real preference-direction contradiction without naming a wrong judgment", () => {
    const result = explainDiagnosticTriad(makeTriad(5, 4, 1 / 3));

    expect(result).toEqual({
      type: "direction",
      text: "You rated Quality as more important than Cost, and Cost as more important than Sustainability, but also Sustainability as more important than Quality.",
    });
    expect(result.text).not.toMatch(/wrong|should change|correct/i);
  });

  it("explains intensity mismatch with values when all three judgments point in the same direction", () => {
    const result = explainDiagnosticTriad(makeTriad(3, 2, 4));

    expect(result.type).toBe("intensity");
    expect(result.text).toBe(
      "You rated Quality as 3 times as important as Cost, and Cost as 2 times as important as Sustainability. " +
      "Together, those comparisons imply Quality is 6 times as important as Sustainability, while you rated Quality as 4 times as important as Sustainability.",
    );
  });

  it("describes an implied equality and a direct preference without inventing an opposing direction", () => {
    const result = explainDiagnosticTriad(makeTriad(1 / 3, 3, 1 / 3));

    expect(result.type).toBe("intensity");
    expect(result.text).toContain("Together, those comparisons imply Quality and Sustainability are equally important");
    expect(result.text).toContain("while you rated Sustainability as 3 times as important as Quality");
  });

  it("describes reciprocal intensities in natural language", () => {
    const result = explainDiagnosticTriad(makeTriad(1 / 3, 1 / 2, 1 / 4));

    expect(result.type).toBe("intensity");
    expect(result.text).toContain("Cost as 3 times as important as Quality");
    expect(result.text).toContain("Sustainability as 2 times as important as Cost");
    expect(result.text).toContain("Sustainability is 6 times as important as Quality");
    expect(result.text).toContain("Sustainability as 4 times as important as Quality");
  });

  it("keeps numerical detail concise for a large intensity mismatch", () => {
    const result = explainDiagnosticTriad(makeTriad(9, 9, 1));

    expect(result.type).toBe("intensity");
    expect(result.text).toContain("Quality is 81 times as important as Sustainability");
    expect(result.text).toContain("Quality and Sustainability as equally important");
    expect(result.text).not.toMatch(/cycle|discrepancy|scale|simulation/i);
    expect(formatAHPDiagnosticRatio(1 / 9)).toBe("1/9");
  });

  it("highlights both cell orientations by criterion IDs, and leaves diagonal pairs out", () => {
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

  it("highlights only the selected inconsistency and all three of its pairs", () => {
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
});
