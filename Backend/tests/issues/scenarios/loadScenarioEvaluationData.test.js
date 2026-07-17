import { beforeEach, describe, expect, it, vi } from "vitest";

const stageResults = vi.hoisted(() => ({
  findOne: vi.fn(),
}));

vi.mock("../../../models/IssueStageResults.js", () => ({
  IssueStageResult: stageResults,
}));

import { resolveAlternativeResultOrThrow } from "../../../modules/issues/scenarios/loadScenarioEvaluationData.js";

const queryFor = (result) => {
  const query = {
    sort: vi.fn(() => query),
    lean: vi.fn(async () => result),
  };
  return query;
};

describe("resolveAlternativeResultOrThrow", () => {
  beforeEach(() => stageResults.findOne.mockReset());

  it("loads the exact requested consensus phase", async () => {
    const query = queryFor({ consensusPhase: 2 });
    stageResults.findOne.mockReturnValue(query);

    const result = await resolveAlternativeResultOrThrow({
      issue: { _id: "issue-1", isConsensus: true },
      sourcePhase: 2,
    });

    expect(stageResults.findOne).toHaveBeenCalledWith({
      issue: "issue-1",
      stage: "alternativeEvaluation",
      consensusPhase: 2,
    });
    expect(query.sort).not.toHaveBeenCalled();
    expect(result.phase).toBe(2);
  });

  it("uses the latest phase only when no source phase was supplied", async () => {
    const query = queryFor({ consensusPhase: 5 });
    stageResults.findOne.mockReturnValue(query);

    const result = await resolveAlternativeResultOrThrow({
      issue: { _id: "issue-1", isConsensus: true },
    });

    expect(query.sort).toHaveBeenCalledWith({ consensusPhase: -1 });
    expect(result.phase).toBe(5);
  });

  it("rejects an explicit source phase for a non-consensus issue", async () => {
    await expect(
      resolveAlternativeResultOrThrow({
        issue: { _id: "issue-1", isConsensus: false },
        sourcePhase: 1,
      })
    ).rejects.toMatchObject({
      statusCode: 400,
      field: "sourcePhase",
    });
    expect(stageResults.findOne).not.toHaveBeenCalled();
  });
});
