import { describe, expect, it } from "vitest";
import { buildFinishedIssueOverviewData } from "../../../src/features/finishedIssueDialog/logic/buildFinishedIssueOverviewData.js";

describe("buildFinishedIssueOverviewData", () => {
  it("builds factual metadata, ranking, and execution data", () => {
    const data = buildFinishedIssueOverviewData({
      viewIssue: { summary: { name: "Issue", alternatives: [{ id: "a", name: "A", description: "Detail" }], criteria: [{}], experts: { participated: ["expert"] } }, analyticalGraphs: {} },
      ranking: [{ alternativeId: "a", name: "A", score: 2 }], formatScore: String,
      currentPhaseLabel: "Final", currentPhaseIndex: 0, expertList: ["expert"],
      evaluationStructure: "alternativeCriteriaMatrix", canShowCollective: true,
      selectedModelName: "Model", selectedRunKey: "base", selectedRunLabel: "Base", runs: [], roundsCount: 1,
    });
    expect(data.issue).toMatchObject({ name: "Issue", alternativesCount: 1, criteriaCount: 1, participatingExpertsCount: 1 });
    expect(data.results.items[0]).toMatchObject({ name: "A", description: "Detail", formattedScore: "2" });
    expect(data.models).toMatchObject({ selectedExecutionIsBase: true, additionalRunsCount: 0 });
  });
});
