import { describe, expect, it } from "vitest";

import { buildDashboardData } from "../../../../../src/features/finishedIssueDialog/sections/dashboard/logic/buildFinishedIssueDashboardData.js";

const payload = {
  alternatives: [{ id: "a", name: "Alternative A" }, { id: "b", name: "Alternative B" }],
  criteria: { nodes: [{ id: "parent", isLeaf: false }, { id: "leaf-a", isLeaf: true }, { id: "leaf-b", isLeaf: true }] },
  participants: [{ expert: { id: "e1", name: "Expert One" } }],
  participantHistory: { records: [
    { expert: { id: "e1", name: "Expert One" }, participated: true },
    { expert: { id: "e2", name: "Expert Two" }, participated: true },
  ], summary: { total: 2, participated: 2 } },
  models: { base: { name: "Base Model" } },
};

const execution = (ranking, modelName = "Scenario Model") => ({
  model: { name: modelName },
  standardizedOutput: { rankedAlternatives: ranking },
});

const buildPerformanceFinding = (scores) => {
  const alternatives = scores.map((_, index) => ({ id: `alternative-${index}`, name: `Alternative ${index + 1}` }));
  const ranking = scores.map((score, index) => ({ alternativeId: `alternative-${index}`, score }));
  const data = buildDashboardData({ payload: { ...payload, alternatives }, selectedExecution: execution(ranking) });
  return data.findings.find(({ kind }) => kind === "overview");
};

describe("buildDashboardData summary view model", () => {
  it("builds canonical counts, including leaf criteria and historical experts", () => {
    const data = buildDashboardData({ payload, selectedExecution: execution([]) });
    expect(data.issueSummary).toEqual({ alternativesCount: 2, criteriaCount: 2, expertsCount: 2, modelName: "Scenario Model" });
  });

  it("normalizes the complete selected execution ranking and selected model", () => {
    const ranking = Array.from({ length: 15 }, (_, index) => ({ alternativeId: `a${index}`, rank: index + 1, score: index }));
    const alternatives = ranking.map((item) => ({ id: item.alternativeId, name: `Alternative ${item.alternativeId}` }));
    const data = buildDashboardData({ payload: { ...payload, alternatives }, selectedExecution: execution(ranking, "Selected model") });
    expect(data.issueSummary.modelName).toBe("Selected model");
    expect(data.result.ranking).toHaveLength(15);
    expect(data.result.ranking[14]).toMatchObject({ position: 15, name: "Alternative a14", formattedScore: "14" });
  });

  it("falls back to the base model name and reports a simple empty state for a missing ranking", () => {
    const data = buildDashboardData({ payload, selectedExecution: { standardizedOutput: { rankedAlternatives: [] } } });
    expect(data.issueSummary.modelName).toBe("Base Model");
    expect(data.result).toEqual({ available: false, unavailableReason: "No final result is available.", ranking: [] });
    expect(data.findings).toEqual([]);
  });

  it("creates structured narrative findings for one alternative without inventing a last place", () => {
    const data = buildDashboardData({
      payload: { ...payload, alternatives: [{ id: "a", name: "Solo" }] },
      selectedExecution: execution([{ alternativeId: "a", score: 4 }]),
    });
    expect(data.findings).toEqual([
      {
        kind: "winner",
        title: "Recommended alternative",
        headline: "Solo",
        text: "Among the 1 ranked alternative, this option occupies first place with a final score of 4.",
      },
      {
        kind: "overview",
        title: "Performance overview",
        items: ["Final scores range from 4 to 4 across 1 ranked alternative."],
      },
    ]);
  });

  it("builds factual winner, score difference/range, and last-place findings", () => {
    const data = buildDashboardData({ payload, selectedExecution: execution([
      { alternativeId: "a", score: 3.0744 }, { alternativeId: "b", score: 2.9454 },
    ]) });
    expect(data.findings).toEqual([
      {
        kind: "winner",
        title: "Recommended alternative",
        headline: "Alternative A",
        text: "Among the 2 ranked alternatives, this option occupies first place with a final score of 3.0744.",
      },
      {
        kind: "overview",
        title: "Performance overview",
        items: [
          "The difference between the first and second alternatives is 0.1290 score units.",
          "Final scores range from 2.9454 to 3.0744 across 2 ranked alternatives.",
        ],
      },
      {
        kind: "last",
        title: "Lower-ranked alternative",
        headline: "Alternative B",
        text: "Among the 2 ranked alternatives, this option occupies the final position with a final score of 2.9454.",
      },
    ]);
  });

  it("adds a one-decimal share of the observed range for a normal five-item ranking", () => {
    const finding = buildPerformanceFinding([3.0744, 2.9454, 2.8, 2.6, 2.5169]);
    expect(finding.items[0]).toBe("The difference between the first and second alternatives is 0.1290 score units, representing 23.1% of the observed score range.");
    expect(finding.items[1]).toBe("Final scores range from 2.5169 to 3.0744 across 5 ranked alternatives.");
  });

  it("keeps the absolute gap only for exactly two alternatives", () => {
    const finding = buildPerformanceFinding([3.0744, 2.9454]);
    expect(finding.items[0]).toBe("The difference between the first and second alternatives is 0.1290 score units.");
    expect(finding.items[0]).not.toContain("%");
  });

  it("omits contextual percentage when the observed range is zero", () => {
    const finding = buildPerformanceFinding([4.5, 4.5, 4.5]);
    expect(finding.items[0]).toBe("The difference between the first and second alternatives is 0.0000 score units.");
    expect(finding.items[0]).not.toContain("%");
  });

  it.each([
    ["missing score", [3.5, 3, null, 2]],
    ["non-finite score", [3.5, 3, Number.POSITIVE_INFINITY]],
  ])("omits contextual percentage when the ranking has a %s", (_label, scores) => {
    const finding = buildPerformanceFinding(scores);
    expect(finding.items[0]).toBe("The difference between the first and second alternatives is 0.5000 score units.");
    expect(finding.items[0]).not.toContain("%");
  });

  it("does not report a score difference when either score is missing or non-numeric", () => {
    for (const scores of [[null, 2], ["bad", 2]]) {
      const data = buildDashboardData({ payload, selectedExecution: execution([
        { alternativeId: "a", score: scores[0] }, { alternativeId: "b", score: scores[1] },
      ]) });
      expect(data.findings.map(({ kind }) => kind)).toEqual(["winner", "last"]);
    }
  });
});
