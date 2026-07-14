import { describe, expect, it } from "vitest";
import { buildFinishedIssueOverviewData } from "../../../../../src/features/finishedIssueDialog/sections/overview/logic/buildFinishedIssueOverviewData.js";

describe("buildFinishedIssueOverviewData", () => {
  it("builds factual metadata, ranking, and execution data", () => {
    const data = buildFinishedIssueOverviewData({
      viewIssue: {
        summary: {
          name: "Issue", alternatives: [{ id: "a", name: "A", description: "Detail" }], criteria: [{}], experts: { participated: ["expert"] },
          consensusInfo: { threshold: 0.8, finalConsensusMeasure: 0.9, finalizationReason: "Reached" },
        },
        analyticalGraphs: { plotsGraphic: { expert_points: [[0.1, 0.2]], collective_point: [0.3, 0.4] }, consensusLevelLineChart: { data: [0.3, 0.9] } },
      },
      ranking: [{ alternativeId: "a", name: "A", score: 2 }], formatScore: String,
      currentPhaseLabel: "Final", currentPhaseIndex: 0, expertList: ["expert"],
      evaluationStructure: "alternativeCriteriaMatrix", canShowCollective: true,
      selectedModelName: "Model", selectedRunKey: "base", selectedRunLabel: "Base", runs: [], roundsCount: 1,
    });
    expect(data.issue).toMatchObject({ name: "Issue", alternativesCount: 1, criteriaCount: 1, participatingExpertsCount: 1 });
    expect(data.results.items[0]).toMatchObject({ name: "A", description: "Detail", formattedScore: "2" });
    expect(data.models).toMatchObject({ selectedExecutionIsBase: true, additionalRunsCount: 0 });
    expect(data.evaluations).toMatchObject({ expertsCount: 1, structure: "alternativeCriteriaMatrix", hasCollective: true });
    expect(data.graphs).toMatchObject({ hasPerformanceMap: true, hasConsensusEvolution: true });
    expect(data.consensus).toMatchObject({ threshold: 0.8, finalMeasure: 0.9 });
    expect(JSON.stringify(data)).not.toContain("function");
  });

  it("handles missing optional payload fields", () => {
    const data = buildFinishedIssueOverviewData({ viewIssue: {}, ranking: [] });

    expect(data.issue).toMatchObject({ alternativesCount: 0, criteriaCount: 0, participatingExpertsCount: 0, closureDate: null });
    expect(data.results).toMatchObject({ available: false, items: [] });
    expect(data.consensus).toBeNull();
  });
});
