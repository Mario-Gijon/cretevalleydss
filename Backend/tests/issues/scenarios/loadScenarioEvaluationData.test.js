import { beforeEach, describe, expect, it, vi } from "vitest";

const stageResults = vi.hoisted(() => ({
  findOne: vi.fn(),
  find: vi.fn(),
}));

vi.mock("../../../models/IssueStageResults.js", () => ({
  IssueStageResult: stageResults,
}));

import { discoverScenarioReplayPhasesOrThrow, resolveAlternativeResultOrThrow } from "../../../modules/issues/scenarios/loadScenarioEvaluationData.js";

const queryFor = (result) => {
  const query = {
    sort: vi.fn(() => query),
    lean: vi.fn(async () => result),
  };
  return query;
};

describe("resolveAlternativeResultOrThrow", () => {
  beforeEach(() => { stageResults.findOne.mockReset(); stageResults.find.mockReset(); });

  it("loads the exact requested consensus phase", async () => {
    const query = queryFor({ consensusPhase: 2 });
    stageResults.findOne.mockReturnValue(query);

    const result = await resolveAlternativeResultOrThrow({
      issue: { _id: "issue-1", isConsensus: true },
      phase: 2,
    });

    expect(stageResults.findOne).toHaveBeenCalledWith({
      issue: "issue-1",
      stage: "alternativeEvaluation",
      consensusPhase: 2,
    });
    expect(query.sort).not.toHaveBeenCalled();
    expect(result.phase).toBe(2);
  });

  it("uses the latest phase only when no phase was supplied", async () => {
    const query = queryFor({ consensusPhase: 5 });
    stageResults.findOne.mockReturnValue(query);

    const result = await resolveAlternativeResultOrThrow({
      issue: { _id: "issue-1", isConsensus: true },
    });

    expect(query.sort).toHaveBeenCalledWith({ consensusPhase: -1 });
    expect(result.phase).toBe(5);
  });

  it("discovers every persisted alternative-evaluation phase in order", async () => {
    const query = queryFor([{ consensusPhase: 0 }, { consensusPhase: 2 }, { consensusPhase: 5 }]);
    stageResults.find.mockReturnValue(query);

    await expect(discoverScenarioReplayPhasesOrThrow({ issue: { _id: "issue-1" } })).resolves.toEqual([0, 2, 5]);
    expect(stageResults.find).toHaveBeenCalledWith({ issue: "issue-1", stage: "alternativeEvaluation" });
    expect(query.sort).toHaveBeenCalledWith({ consensusPhase: 1, _id: 1 });
  });
});
