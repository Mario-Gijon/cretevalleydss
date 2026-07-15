import { describe, expect, it } from "vitest";

import { buildDashboardData } from "../../../../../src/features/finishedIssueDialog/sections/dashboard/logic/buildFinishedIssueDashboardData.js";

describe("buildDashboardData", () => {
  it("builds a slim KPI contract without a standalone consensus preview", () => {
    const data = buildDashboardData({
      overview: { acceptedParticipantsCount: 2, completedAlternativeEvaluationsCount: 1 },
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
      evaluationCoverage: { completed: 1, total: 2, formattedPercentage: "50%" },
      consensus: { enabled: false, label: "Disabled" },
      phase: { label: "Final" },
    });
    expect(data).not.toHaveProperty("consensus");
  });
});
