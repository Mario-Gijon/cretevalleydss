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

  it("creates only valid findings for a single alternative", () => {
    const data = buildDashboardData({
      payload: { ...payload, alternatives: [{ id: "a", name: "Solo" }] },
      selectedExecution: execution([{ alternativeId: "a", score: 4 }]),
    });
    expect(data.findings).toEqual([{ title: "Top-ranked alternative", text: "Solo ranks first with a score of 4." }]);
  });

  it("reports the absolute score difference without interpreting its size", () => {
    const data = buildDashboardData({ payload, selectedExecution: execution([
      { alternativeId: "a", score: 3.0744 }, { alternativeId: "b", score: 2.9454 },
    ]) });
    expect(data.findings[1]).toEqual({ title: "First and second", text: "The first two alternatives differ by 0.1290 score units." });
  });

  it("does not report a score difference when either score is missing or non-numeric", () => {
    for (const scores of [[null, 2], ["bad", 2]]) {
      const data = buildDashboardData({ payload, selectedExecution: execution([
        { alternativeId: "a", score: scores[0] }, { alternativeId: "b", score: scores[1] },
      ]) });
      expect(data.findings.map(({ title }) => title)).toEqual(["Top-ranked alternative", "Last-ranked alternative"]);
    }
  });
});
