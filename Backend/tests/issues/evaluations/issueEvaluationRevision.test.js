import { describe, expect, it, vi } from "vitest";

import { IssueEvaluation } from "../../../models/IssueEvaluations.js";
import { IssueEvaluationRevision } from "../../../models/IssueEvaluationRevisions.js";
import { Participation } from "../../../models/Participations.js";
import { cleanupIssueEvaluationsForExpertExit } from "../../../modules/issues/lifecycle/cleanupIssueEvaluationsForExpertExit.js";
import { deleteIssueCascade } from "../../../modules/issues/lifecycle/deleteIssueCascade.js";
import {
  saveIssueEvaluationDraftWorkflow,
  submitIssueEvaluationWorkflow,
} from "../../../modules/issues/evaluations/index.js";
import {
  createConfirmedUser,
  createIssueAlternativesFixture,
  createIssueCriteriaFixture,
  createIssueEvaluationFixture,
  createIssueExpressionDomainSnapshotFixture,
  createIssueFixture,
  createParticipationFixture,
} from "../../setup/fixtures.js";
import { setupMongoDbTestHooks } from "../../setup/database.js";

setupMongoDbTestHooks();

const createCriteriaEvaluation = async ({ consensusPhase = 0 } = {}) => {
  const owner = await createConfirmedUser();
  const expert = await createConfirmedUser();
  const issue = await createIssueFixture({
    ownerId: owner._id,
    createdBy: owner._id,
    currentStage: "criteriaWeighting",
    consensusPhase,
    criteriaWeightsStructureKey: "manualCriteriaWeights",
  });
  await createIssueAlternativesFixture({ issueId: issue._id });
  const domain = await createIssueExpressionDomainSnapshotFixture({
    issueId: issue._id,
  });
  const { leafCriteria } = await createIssueCriteriaFixture({
    issueId: issue._id,
    leafNames: ["Cost", "Quality"],
    expressionDomainId: domain._id,
  });
  await createParticipationFixture({
    issueId: issue._id,
    expertId: expert._id,
    invitationStatus: "accepted",
    entryStage: "criteriaWeighting",
    entryPhase: consensusPhase,
  });

  return { issue, expert, leafCriteria };
};

const createAlternativeEvaluation = async ({ consensusPhase = 0 } = {}) => {
  const owner = await createConfirmedUser();
  const expert = await createConfirmedUser();
  const issue = await createIssueFixture({
    ownerId: owner._id,
    createdBy: owner._id,
    currentStage: "alternativeEvaluation",
    consensusPhase,
    evaluationStructureKey: "alternativeCriteriaMatrix",
  });
  const domain = await createIssueExpressionDomainSnapshotFixture({
    issueId: issue._id,
    numericRange: { min: 0, max: 10, step: 1 },
  });
  const alternatives = await createIssueAlternativesFixture({ issueId: issue._id });
  const { leafCriteria } = await createIssueCriteriaFixture({
    issueId: issue._id,
    leafNames: ["Cost"],
    expressionDomainId: domain._id,
  });
  await createParticipationFixture({
    issueId: issue._id,
    expertId: expert._id,
    invitationStatus: "accepted",
    entryStage: "alternativeEvaluation",
    entryPhase: consensusPhase,
  });

  return { issue, expert, alternatives, leafCriteria };
};

const manualWeightsPayload = (leafCriteria, values) => ({
  weightsByCriterion: Object.fromEntries(
    leafCriteria.map((criterion, index) => [
      String(criterion._id),
      values[index],
    ])
  ),
});

describe("IssueEvaluationRevision", () => {
  it("keeps every draft and submission immutable while one evaluation remains the current projection", async () => {
    const { issue, expert, leafCriteria } = await createCriteriaEvaluation();
    const firstPayload = manualWeightsPayload(leafCriteria, ["0.2", "0.8"]);
    const secondPayload = manualWeightsPayload(leafCriteria, ["0.3", "0.7"]);
    const submissionPayload = manualWeightsPayload(leafCriteria, ["0.4", "0.6"]);

    await saveIssueEvaluationDraftWorkflow({
      issueId: issue._id,
      userId: expert._id,
      stage: "criteriaWeighting",
      payload: firstPayload,
    });
    const firstRevision = await IssueEvaluationRevision.findOne({
      issue: issue._id,
      expert: expert._id,
    }).lean();

    await saveIssueEvaluationDraftWorkflow({
      issueId: issue._id,
      userId: expert._id,
      stage: "criteriaWeighting",
      payload: secondPayload,
    });
    await submitIssueEvaluationWorkflow({
      issueId: issue._id,
      userId: expert._id,
      stage: "criteriaWeighting",
      payload: submissionPayload,
    });
    const [projection] = await IssueEvaluation.find({
      issue: issue._id,
      expert: expert._id,
      stage: "criteriaWeighting",
      consensusPhase: 0,
    }).lean();
    const revisions = await IssueEvaluationRevision.find({
      issue: issue._id,
      expert: expert._id,
      stage: "criteriaWeighting",
      consensusPhase: 0,
    })
      .sort({ createdAt: 1, _id: 1 })
      .lean();

    expect(projection.completed).toBe(true);
    expect(projection.payload).toEqual({
      weightsByCriterion: {
        [String(leafCriteria[0]._id)]: 0.4,
        [String(leafCriteria[1]._id)]: 0.6,
      },
    });
    expect(revisions).toHaveLength(3);
    expect(firstRevision).toMatchObject({
      evaluation: projection._id,
      actor: expert._id,
      action: "draftSaved",
      rawPayload: firstPayload,
      normalizedPayload: {
        weightsByCriterion: {
          [String(leafCriteria[0]._id)]: 0.2,
          [String(leafCriteria[1]._id)]: 0.8,
        },
      },
      submittedAt: null,
      previousRevision: null,
      schemaVersion: 1,
    });
    expect(Object.keys(firstRevision).sort()).toEqual(
      [
        "__v",
        "_id",
        "action",
        "actor",
        "consensusPhase",
        "createdAt",
        "decisionContext",
        "evaluation",
        "expert",
        "issue",
        "normalizedPayload",
        "previousRevision",
        "rawPayload",
        "schemaVersion",
        "stage",
        "structureKey",
        "submittedAt",
      ].sort()
    );
    expect(revisions.map((revision) => revision.action)).toEqual([
      "draftSaved",
      "draftSaved",
      "submitted",
    ]);
    expect(String(revisions[1].previousRevision)).toBe(String(revisions[0]._id));
    expect(String(revisions[2].previousRevision)).toBe(String(revisions[1]._id));
    expect(revisions[2].rawPayload).toEqual(submissionPayload);
    expect(revisions[2].normalizedPayload).toEqual({
      weightsByCriterion: {
        [String(leafCriteria[0]._id)]: 0.4,
        [String(leafCriteria[1]._id)]: 0.6,
      },
    });
    expect(revisions[2].submittedAt.getTime()).toBe(
      projection.submittedAt.getTime()
    );
    expect(revisions[0].decisionContext.issue.currentStage).toBe(
      "criteriaWeighting"
    );

    issue.name = "Changed after the saved revision";
    await issue.save();
    const unchangedFirstRevision = await IssueEvaluationRevision.findById(
      revisions[0]._id
    ).lean();
    expect(unchangedFirstRevision.decisionContext.issue.name).not.toBe(issue.name);
  });

  it("starts independent chains for consensus phases and records alternative evaluations through the same boundary", async () => {
    const { issue, expert, alternatives, leafCriteria } =
      await createAlternativeEvaluation({ consensusPhase: 0 });
    const payload = Object.fromEntries(
      alternatives.map((alternative, index) => [
        String(alternative._id),
        { [String(leafCriteria[0]._id)]: index + 1 },
      ])
    );

    await saveIssueEvaluationDraftWorkflow({
      issueId: issue._id,
      userId: expert._id,
      stage: "alternativeEvaluation",
      payload,
    });
    await submitIssueEvaluationWorkflow({
      issueId: issue._id,
      userId: expert._id,
      stage: "alternativeEvaluation",
      payload,
    });
    await submitIssueEvaluationWorkflow({
      issueId: issue._id,
      userId: expert._id,
      stage: "alternativeEvaluation",
      payload,
    });
    issue.consensusPhase = 1;
    await issue.save();

    await saveIssueEvaluationDraftWorkflow({
      issueId: issue._id,
      userId: expert._id,
      stage: "alternativeEvaluation",
      payload,
    });

    const revisions = await IssueEvaluationRevision.find({
      issue: issue._id,
      expert: expert._id,
    })
      .sort({ consensusPhase: 1, createdAt: 1, _id: 1 })
      .lean();

    expect(revisions).toHaveLength(4);
    expect(revisions[0]).toMatchObject({
      stage: "alternativeEvaluation",
      consensusPhase: 0,
      previousRevision: null,
    });
    expect(revisions[1]).toMatchObject({
      stage: "alternativeEvaluation",
      consensusPhase: 0,
      action: "submitted",
      previousRevision: revisions[0]._id,
    });
    expect(revisions[2]).toMatchObject({
      stage: "alternativeEvaluation",
      consensusPhase: 0,
      action: "submitted",
      previousRevision: revisions[1]._id,
    });
    expect(revisions[3]).toMatchObject({
      stage: "alternativeEvaluation",
      consensusPhase: 1,
      previousRevision: null,
    });
  });

  it("does not backfill an existing projection and retains revisions when participant cleanup removes it", async () => {
    const { issue, expert, leafCriteria } = await createCriteriaEvaluation();
    await createIssueEvaluationFixture({
      issueId: issue._id,
      expertId: expert._id,
      stage: "criteriaWeighting",
      payload: manualWeightsPayload(leafCriteria, [0.1, 0.9]),
    });

    await saveIssueEvaluationDraftWorkflow({
      issueId: issue._id,
      userId: expert._id,
      stage: "criteriaWeighting",
      payload: manualWeightsPayload(leafCriteria, [0.2, 0.8]),
    });

    const revision = await IssueEvaluationRevision.findOne({
      issue: issue._id,
      expert: expert._id,
    }).lean();
    expect(revision.previousRevision).toBeNull();

    await cleanupIssueEvaluationsForExpertExit({ issue, expertId: expert._id });

    expect(
      await IssueEvaluation.findOne({ issue: issue._id, expert: expert._id })
    ).toBeNull();
    expect(await IssueEvaluationRevision.countDocuments({ issue: issue._id })).toBe(1);

    await deleteIssueCascade({ issueId: issue._id });
    expect(await IssueEvaluationRevision.countDocuments({ issue: issue._id })).toBe(0);
  });

  it("rolls back both the projection and revision when revision insertion fails", async () => {
    const { issue, expert, leafCriteria } = await createCriteriaEvaluation();
    const createSpy = vi
      .spyOn(IssueEvaluationRevision, "create")
      .mockRejectedValueOnce(new Error("revision persistence failed"));

    await expect(
      saveIssueEvaluationDraftWorkflow({
        issueId: issue._id,
        userId: expert._id,
        stage: "criteriaWeighting",
        payload: manualWeightsPayload(leafCriteria, [0.2, 0.8]),
      })
    ).rejects.toThrow("revision persistence failed");

    createSpy.mockRestore();
    expect(await IssueEvaluation.countDocuments({ issue: issue._id })).toBe(0);
    expect(await IssueEvaluationRevision.countDocuments({ issue: issue._id })).toBe(0);
  });

  it("rolls back submission projection, revision, and completion state together", async () => {
    const { issue, expert, leafCriteria } = await createCriteriaEvaluation();
    const createSpy = vi
      .spyOn(IssueEvaluationRevision, "create")
      .mockRejectedValueOnce(new Error("revision persistence failed"));

    await expect(
      submitIssueEvaluationWorkflow({
        issueId: issue._id,
        userId: expert._id,
        stage: "criteriaWeighting",
        payload: manualWeightsPayload(leafCriteria, [0.2, 0.8]),
      })
    ).rejects.toThrow("revision persistence failed");

    createSpy.mockRestore();
    expect(await IssueEvaluation.countDocuments({ issue: issue._id })).toBe(0);
    expect(await IssueEvaluationRevision.countDocuments({ issue: issue._id })).toBe(0);
    expect(
      await Participation.findOne({ issue: issue._id, expert: expert._id }).lean()
    ).toMatchObject({ weightsCompleted: false });
  });
});
