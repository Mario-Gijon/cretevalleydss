import { describe, expect, it } from "vitest";

import { IssueStageResult } from "../../../models/IssueStageResults.js";
import { getFinishedIssuesPayload } from "../../../modules/issues/finished/getFinishedIssuesPayload.js";
import {
  createConfirmedUser,
  createIssueFixture,
} from "../../setup/fixtures.js";
import { setupMongoDbTestHooks } from "../../setup/database.js";

setupMongoDbTestHooks();

const createStageResult = ({ issueId, stage = "alternativeEvaluation", phase = 0, rankedAlternatives }) =>
  IssueStageResult.create({
    issue: issueId,
    stage,
    consensusPhase: phase,
    inputSnapshot: { expertWeights: [] },
    result: {
      standardResult: { rankedAlternatives },
      modelExecution: {},
      rawOutput: {},
    },
  });

const createFinishedIssue = async ({ ownerId, name }) =>
  createIssueFixture({
    ownerId,
    createdBy: ownerId,
    name,
    active: false,
    currentStage: "finished",
  });

describe("getFinishedIssuesPayload", () => {
  it("returns the three best alternatives ordered by canonical rank", async () => {
    const owner = await createConfirmedUser();
    const issue = await createFinishedIssue({ ownerId: owner._id, name: "Five alternatives" });

    await createStageResult({
      issueId: issue._id,
      rankedAlternatives: [
        { alternativeId: "alternative-5", name: "Fifth", rank: 5, score: 0.1 },
        { alternativeId: "alternative-1", name: "First", rank: 1, score: 0.9 },
        { alternativeId: "alternative-4", name: "Fourth", rank: 4, score: 0.2 },
        { alternativeId: "alternative-3", name: "Third", rank: 3, score: 0.4 },
        { alternativeId: "alternative-2", name: "Second", rank: 2, score: 0.7 },
      ],
    });

    const payload = await getFinishedIssuesPayload({ userId: owner._id });

    expect(payload).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: String(issue._id),
        topAlternatives: [
          { alternativeId: "alternative-1", name: "First", rank: 1, score: 0.9 },
          { alternativeId: "alternative-2", name: "Second", rank: 2, score: 0.7 },
          { alternativeId: "alternative-3", name: "Third", rank: 3, score: 0.4 },
        ],
      }),
    ]));
  });

  it("uses each issue's highest alternative-evaluation phase and never a criteria result", async () => {
    const owner = await createConfirmedUser();
    const consensusIssue = await createFinishedIssue({ ownerId: owner._id, name: "Consensus issue" });
    const otherIssue = await createFinishedIssue({ ownerId: owner._id, name: "Other issue" });

    await createStageResult({
      issueId: consensusIssue._id,
      phase: 0,
      rankedAlternatives: [{ alternativeId: "old", name: "Earlier round", rank: 1, score: 0.4 }],
    });
    await createStageResult({
      issueId: consensusIssue._id,
      phase: 2,
      rankedAlternatives: [{ alternativeId: "final", name: "Final round", rank: 1, score: 0.9 }],
    });
    await createStageResult({
      issueId: consensusIssue._id,
      stage: "criteriaWeighting",
      rankedAlternatives: [{ alternativeId: "criteria", name: "Must not appear", rank: 1, score: 0.1 }],
    });
    await createStageResult({
      issueId: otherIssue._id,
      rankedAlternatives: [{ alternativeId: "other", name: "Other result", rank: 1, score: 0.8 }],
    });

    const payload = await getFinishedIssuesPayload({ userId: owner._id });
    const byId = new Map(payload.map((entry) => [entry.id, entry]));

    expect(byId.get(String(consensusIssue._id)).topAlternatives).toEqual([
      { alternativeId: "final", name: "Final round", rank: 1, score: 0.9 },
    ]);
    expect(byId.get(String(otherIssue._id)).topAlternatives).toEqual([
      { alternativeId: "other", name: "Other result", rank: 1, score: 0.8 },
    ]);
  });

  it("handles short, missing, and malformed legacy rankings without failing the list", async () => {
    const owner = await createConfirmedUser();
    const shortRanking = await createFinishedIssue({ ownerId: owner._id, name: "Short ranking" });
    const malformedRanking = await createFinishedIssue({ ownerId: owner._id, name: "Malformed ranking" });
    const noRanking = await createFinishedIssue({ ownerId: owner._id, name: "No ranking" });

    await createStageResult({
      issueId: shortRanking._id,
      rankedAlternatives: [{ alternativeId: "only", name: "Only alternative", rank: 1, score: 0.8 }],
    });
    await createStageResult({
      issueId: malformedRanking._id,
      rankedAlternatives: [
        { alternativeId: "missing-name", rank: 1, score: 0.9 },
        { name: "Missing identifier", rank: 2, score: 0.8 },
        { alternativeId: "invalid-rank", name: "Invalid rank", rank: "none", score: 0.7 },
        { alternativeId: "invalid-score", name: "Invalid score", rank: 2, score: "none" },
        { alternativeId: "usable", name: "Usable alternative", rank: 3, score: 0.5 },
      ],
    });
    await createStageResult({ issueId: noRanking._id, rankedAlternatives: null });

    const payload = await getFinishedIssuesPayload({ userId: owner._id });
    const byId = new Map(payload.map((entry) => [entry.id, entry.topAlternatives]));

    expect(byId.get(String(shortRanking._id))).toEqual([
      { alternativeId: "only", name: "Only alternative", rank: 1, score: 0.8 },
    ]);
    expect(byId.get(String(malformedRanking._id))).toEqual([
      { alternativeId: "usable", name: "Usable alternative", rank: 3, score: 0.5 },
    ]);
    expect(byId.get(String(noRanking._id))).toEqual([]);
  });
});
