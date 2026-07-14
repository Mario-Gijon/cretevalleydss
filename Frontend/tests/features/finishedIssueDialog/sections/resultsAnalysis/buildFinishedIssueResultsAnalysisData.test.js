import { describe, expect, it } from "vitest";

import { buildFinishedIssueResultsAnalysisData } from "../../../../../src/features/finishedIssueDialog/sections/resultsAnalysis/logic/buildFinishedIssueResultsAnalysisData.js";

describe("buildFinishedIssueResultsAnalysisData", () => {
  it("keeps the complete factual ranking and excludes consensus evolution", () => {
    const data = buildFinishedIssueResultsAnalysisData({
      viewIssue: {
        summary: { alternatives: [{ id: "a", name: "A", description: "First" }, { id: "b", name: "B" }] },
        analyticalGraphs: {
          plotsGraphic: { expert_points: [[0.1, 0.2]], collective_point: [0.3, 0.4] },
          consensusLevelLineChart: { labels: ["Initial", "Final"], data: [0.4, 0.8] },
        },
      },
      ranking: [{ alternativeId: "a", name: "A", score: 0.7, rank: 1 }, { alternativeId: "b", name: "B", score: 0.3, rank: 2 }],
      formatScore: String,
      currentPhaseIndex: 0,
      currentPhaseLabel: "Final",
      executionLabel: "Base",
    });

    expect(data.context).toEqual({ executionLabel: "Base", phaseLabel: "Final" });
    expect(data.outcome.ranking).toHaveLength(2);
    expect(data.outcome.winner).toMatchObject({ id: "a", description: "First", position: 1 });
    expect(data.visualizations).toMatchObject({ hasPerformanceMap: true, selectedPhaseIndex: 0 });
    expect(data.visualizations).not.toHaveProperty("consensusEvolutionData");
    expect(data.interpretation).toEqual({ available: false });
  });
});
