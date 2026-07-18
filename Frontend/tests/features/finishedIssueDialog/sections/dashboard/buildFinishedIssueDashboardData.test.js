import { describe, expect, it } from "vitest";

import { buildDashboardData } from "../../../../../src/features/finishedIssueDialog/sections/dashboard/logic/buildFinishedIssueDashboardData.js";

describe("buildDashboardData", () => {
  it("builds the three-KPI Dashboard contract without evaluation coverage", () => {
    const data = buildDashboardData({
      overview: { alternatives: [{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }] },
      evaluations: {},
      results: {
        context: { phaseLabel: "Final" },
        outcome: { winner: { id: "alternative-a", name: "Alternative A", score: -0.25, formattedScore: "-0.25" }, ranking: [] },
      },
      consensus: null,
      models: {},
    });

    expect(data.kpis).toMatchObject({
      winner: { name: "Alternative A", formattedScore: "-0.25" },
      consensus: { enabled: false, label: "Disabled" },
      phase: { label: "Final" },
    });
    expect(data.kpis).not.toHaveProperty("evaluationCoverage");
    expect(data).not.toHaveProperty("consensus");
    expect(data.resultsAnalysis).toMatchObject({
      alternativesCount: 4,
      rankingTitle: "Top 3 ranking",
      performanceTitle: "Top 3 performance overview",
    });
  });

  it("keeps full preview headings when three or fewer alternatives exist", () => {
    const data = buildDashboardData({
      overview: { alternatives: [{ id: "a" }, { id: "b" }, { id: "c" }] },
      evaluations: {},
      results: { context: {}, outcome: { winner: null, ranking: [] } },
      consensus: null,
      models: {},
    });

    expect(data.resultsAnalysis).toMatchObject({
      rankingTitle: "Ranking",
      performanceTitle: "Performance overview",
    });
  });
});
