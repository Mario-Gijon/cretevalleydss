import { describe, expect, it } from "vitest";

import { getFinishedIssueGraphAvailability } from "../../../src/features/finishedIssueDialog/shared/logic/buildFinishedIssueGraphs.js";

describe("getFinishedIssueGraphAvailability", () => {
  it("recognizes direct and normalized performance maps", () => {
    expect(
      getFinishedIssueGraphAvailability({
        analyticalGraphs: { scatterPlot: [{ expertPoints: [] }] },
      }).hasPerformanceMap
    ).toBe(true);

    expect(
      getFinishedIssueGraphAvailability({
        consensusDetails: {
          plotsGraphic: {
            expert_points: [[0.1, 0.2]],
            collective_point: [0.3, 0.4],
          },
        },
      }).hasPerformanceMap
    ).toBe(true);
  });

  it("rejects invalid projections and requires two valid evolution points", () => {
    expect(
      getFinishedIssueGraphAvailability({
        analyticalGraphs: {
          plotsGraphic: { expert_points: [["bad", 0.2]] },
          consensusLevelLineChart: { data: [0.4] },
        },
      })
    ).toMatchObject({ hasPerformanceMap: false, hasConsensusEvolution: false });

    expect(
      getFinishedIssueGraphAvailability({
        analyticalGraphs: { consensusLevelLineChart: { data: [0.4, 0.8] } },
      }).hasConsensusEvolution
    ).toBe(true);
  });
});
