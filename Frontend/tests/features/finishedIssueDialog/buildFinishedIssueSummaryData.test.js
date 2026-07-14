import { describe, expect, it } from "vitest";
import { buildFinishedIssueSummaryData } from "../../../src/features/finishedIssueDialog/logic/buildFinishedIssueSummaryData.js";

describe("buildFinishedIssueSummaryData", () => {
  it("normalizes factual summary values and alternatives", () => {
    const data = buildFinishedIssueSummaryData({
      viewIssue: { summary: { name: "Issue", alternatives: [{ _id: "a", name: "A", description: "Detail" }, null], experts: { participated: ["one"], notAccepted: ["two"] } } },
      selectedModelName: "Model",
    });
    expect(data.general).toMatchObject({ name: "Issue", model: "Model", closureDate: null });
    expect(data.alternatives).toEqual(expect.arrayContaining([expect.objectContaining({ id: "a", name: "A", description: "Detail" })]));
    expect(data.experts).toMatchObject({ total: 2, participated: ["one"], notAccepted: ["two"] });
  });
});
