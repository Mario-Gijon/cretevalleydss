import { describe, expect, it } from "vitest";

import { buildAlternativeRelationshipsHeatmap } from "../../../../../src/features/finishedIssueDialog/sections/resultsAnalysis/logic/buildAlternativeRelationshipsHeatmap.js";

const alternatives = (count) =>
  Array.from({ length: count }, (_, index) => ({
    alternativeId: `a${index + 1}`,
    name: `Alternative ${index + 1}`,
    rank: index + 1,
  }));

const pair = (leftAlternativeId, rightAlternativeId, relativeSeparation) => ({
  leftAlternativeId,
  rightAlternativeId,
  relativeSeparation,
});

describe("buildAlternativeRelationshipsHeatmap", () => {
  it("adapts two alternatives into a symmetric heatmap with a non-comparison diagonal", () => {
    const result = buildAlternativeRelationshipsHeatmap({
      phase: 0,
      alternatives: alternatives(2),
      pairs: [pair("a1", "a2", 0.23)],
    });

    expect(result.type).toBe("heatmap");
    expect(result.phase).toBe(0);
    expect(result.scale).toEqual({ kind: "sequential", min: 0, max: 1, valuePrecision: 3 });
    expect(result.data.values).toEqual([[null, 0.23], [0.23, null]]);
    expect(result.data.details[0][0]).toEqual({ note: "Same alternative; no pairwise comparison." });
    expect(result.allScoresEqual).toBe(false);
  });

  it("builds readable named matrices for five and many alternatives", () => {
    const entries = alternatives(12);
    entries[0].name = "Alternative with a long name that remains available in full";
    const pairs = [];
    entries.forEach((left, index) => entries.slice(index + 1).forEach((right) => {
      pairs.push(pair(left.alternativeId, right.alternativeId, (index + 1) / entries.length));
    }));
    const result = buildAlternativeRelationshipsHeatmap({ alternatives: entries, pairs });

    const five = alternatives(5);
    const fivePairs = [];
    five.forEach((left, index) => five.slice(index + 1).forEach((right) => {
      fivePairs.push(pair(left.alternativeId, right.alternativeId, 0.25));
    }));
    const fiveResult = buildAlternativeRelationshipsHeatmap({ alternatives: five, pairs: fivePairs });

    expect(fiveResult.data.rows).toHaveLength(5);
    expect(fiveResult.data.values).toHaveLength(5);
    expect(result.data.rows).toHaveLength(12);
    expect(result.data.columns).toHaveLength(12);
    expect(result.data.rows[0].label).toBe("Alternative with a long name that remains available in full");
    expect(result.data.values).toHaveLength(12);
    expect(result.data.values[0]).toHaveLength(12);
  });

  it("keeps zero separation distinct from missing and non-finite pairs", () => {
    const result = buildAlternativeRelationshipsHeatmap({
      alternatives: alternatives(3),
      pairs: [
        pair("a1", "a2", 0),
        pair("a1", "a3", Number.NaN),
        pair("a2", "a3", 0.7),
      ],
    });

    expect(result.data.values).toEqual([[null, 0, null], [0, null, 0.7], [null, 0.7, null]]);
    expect(result.data.details[0][1]).toEqual({ valuePrecision: 3 });
    expect(result.data.details[0][2]).toEqual({ note: "No valid comparable score pair is available." });
    expect(result.hasMissingPairs).toBe(true);
  });

  it("supports reversed pair order and identifies equal-score phases", () => {
    const result = buildAlternativeRelationshipsHeatmap({
      alternatives: alternatives(3),
      pairs: [pair("a2", "a1", 0), pair("a3", "a1", 0), pair("a3", "a2", 0)],
    });

    expect(result.data.values).toEqual([[null, 0, 0], [0, null, 0], [0, 0, null]]);
    expect(result.allScoresEqual).toBe(true);
  });

  it.each([
    undefined,
    { alternatives: alternatives(1), pairs: [] },
    { alternatives: alternatives(2), pairs: [] },
    { alternatives: [{ alternativeId: "a1", name: "" }, { alternativeId: "a2", name: "Beta" }], pairs: [pair("a1", "a2", 0.2)] },
    { alternatives: alternatives(2), pairs: [pair("a1", "a2", 1.1)] },
  ])("returns no chart when there is no valid pairwise evidence", (phase) => {
    expect(buildAlternativeRelationshipsHeatmap(phase)).toBeNull();
  });
});
