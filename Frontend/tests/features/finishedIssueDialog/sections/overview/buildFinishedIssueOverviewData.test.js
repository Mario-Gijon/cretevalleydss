import { describe, expect, it } from "vitest";
import { buildFinishedIssueOverviewData } from "../../../../../src/features/finishedIssueDialog/sections/overview/logic/buildFinishedIssueOverviewData.js";

describe("buildFinishedIssueOverviewData", () => {
  it("normalizes factual summary values and alternatives", () => {
    const data = buildFinishedIssueOverviewData({
      viewIssue: {
        summary: {
          name: "Issue", alternatives: [{ _id: "a", name: "A", description: "Detail" }, null], criteria: [{ id: "criterion" }],
          experts: { participated: ["one"], notAccepted: ["two"] },
          consensusInfo: { threshold: 0.8, maxPhases: 3, finalConsensusMeasure: 0.9, finalizationReason: "Reached" },
        },
      },
      selectedModelName: "Model",
      reachedPhaseLabel: "Phase 2",
    });
    expect(data.general).toMatchObject({ name: "Issue", model: "Model", closureDate: null });
    expect(data.alternatives).toEqual(expect.arrayContaining([expect.objectContaining({ id: "a", name: "A", description: "Detail" })]));
    expect(data.experts).toMatchObject({ total: 2, participated: ["one"], notAccepted: ["two"] });
    expect(data.criteria).toEqual([{ id: "criterion" }]);
    expect(data.consensus).toMatchObject({ threshold: 0.8, reachedPhaseLabel: "Phase 2", finalMeasure: 0.9 });
  });
});
