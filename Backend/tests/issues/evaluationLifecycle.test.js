import { describe, expect, it } from "vitest";

import { ExitUserIssue } from "../../models/ExitUserIssue.js";
import { IssueEvaluation } from "../../models/IssueEvaluations.js";
import { IssueStageResult } from "../../models/IssueStageResults.js";
import { Issue } from "../../models/Issues.js";
import { Participation } from "../../models/Participations.js";
import {
  getIssueEvaluationPayload,
  saveIssueEvaluationDraft,
  submitIssueEvaluation,
} from "../../modules/issues/evaluations/index.js";
import { loadIssueEvaluationContext } from "../../modules/issues/evaluations/loadIssueEvaluationContext.js";
import {
  createConfirmedUser,
  createIssueAlternativesFixture,
  createIssueCriteriaFixture,
  createIssueEvaluationFixture,
  createIssueExpressionDomainSnapshotFixture,
  createIssueFixture,
  createParticipationFixture,
} from "../setup/fixtures.js";
import { setupMongoDbTestHooks } from "../setup/database.js";

setupMongoDbTestHooks();

const buildManualWeightsPayload = (leafCriteria, values = []) => ({
  weightsByCriterion: Object.fromEntries(
    leafCriteria.map((criterion, index) => [
      String(criterion._id),
      values[index] ?? "",
    ])
  ),
});

const buildAlternativeMatrixPayload = ({
  alternatives,
  leafCriteria,
  valuesByAlternativeId = {},
}) => {
  const criterionId = String(leafCriteria[0]._id);

  return Object.fromEntries(
    alternatives.map((alternative) => {
      const alternativeId = String(alternative._id);
      const rawValue = valuesByAlternativeId[alternativeId];

      return [
        alternativeId,
        rawValue === undefined
          ? {}
          : {
              [criterionId]: {
                value: rawValue,
              },
            },
      ];
    })
  );
};

const createCriteriaWeightingEvaluationFixture = async ({
  owner = null,
  expert = null,
  leafNames = ["Criterion A", "Criterion B"],
  active = true,
  currentStage = "criteriaWeighting",
  consensusPhase = 0,
} = {}) => {
  const resolvedOwner = owner ?? (await createConfirmedUser());
  const resolvedExpert = expert ?? (await createConfirmedUser());
  const issue = await createIssueFixture({
    ownerId: resolvedOwner._id,
    createdBy: resolvedOwner._id,
    active,
    currentStage,
    consensusPhase,
    criteriaWeightsStructureKey: "manualCriteriaWeights",
  });
  const alternatives = await createIssueAlternativesFixture({
    issueId: issue._id,
  });
  const domain = await createIssueExpressionDomainSnapshotFixture({
    issueId: issue._id,
  });
  const { leafCriteria } = await createIssueCriteriaFixture({
    issueId: issue._id,
    leafNames,
    expressionDomainId: domain._id,
  });

  return {
    owner: resolvedOwner,
    expert: resolvedExpert,
    issue,
    alternatives,
    domain,
    leafCriteria,
  };
};

const createAlternativeEvaluationFixture = async ({
  owner = null,
  expert = null,
  active = true,
  currentStage = "alternativeEvaluation",
  consensusPhase = 0,
  entryPhase = 0,
  invitationStatus = "accepted",
} = {}) => {
  const resolvedOwner = owner ?? (await createConfirmedUser());
  const resolvedExpert = expert ?? (await createConfirmedUser());
  const issue = await createIssueFixture({
    ownerId: resolvedOwner._id,
    createdBy: resolvedOwner._id,
    active,
    currentStage,
    consensusPhase,
    evaluationStructureKey: "alternativeCriteriaMatrix",
  });
  const domain = await createIssueExpressionDomainSnapshotFixture({
    issueId: issue._id,
    numericRange: { min: 0, max: 10, step: 1 },
  });
  const alternatives = await createIssueAlternativesFixture({
    issueId: issue._id,
    names: ["Alternative A", "Alternative B"],
  });
  const { leafCriteria } = await createIssueCriteriaFixture({
    issueId: issue._id,
    leafNames: ["Criterion A"],
    expressionDomainId: domain._id,
  });

  await createParticipationFixture({
    issueId: issue._id,
    expertId: resolvedExpert._id,
    invitationStatus,
    entryPhase,
    entryStage: "alternativeEvaluation",
  });

  return {
    owner: resolvedOwner,
    expert: resolvedExpert,
    issue,
    domain,
    alternatives,
    leafCriteria,
  };
};

const expectEvaluationOpsRejected = async ({
  issueId,
  userId,
  stage,
  payload,
  expectedError,
}) => {
  await expect(
    saveIssueEvaluationDraft({
      issueId,
      userId,
      stage,
      payload,
    })
  ).rejects.toMatchObject(expectedError);

  await expect(
    getIssueEvaluationPayload({
      issueId,
      userId,
      stage,
    })
  ).rejects.toMatchObject(expectedError);

  await expect(
    submitIssueEvaluation({
      issueId,
      userId,
      stage,
      payload,
    })
  ).rejects.toMatchObject(expectedError);
};

describe("evaluation context and permission guards", () => {
  it("accepted participant can load evaluation context for the issue current stage", async () => {
    const { issue, expert } = await createCriteriaWeightingEvaluationFixture();

    await createParticipationFixture({
      issueId: issue._id,
      expertId: expert._id,
      invitationStatus: "accepted",
      entryPhase: 0,
      entryStage: "criteriaWeighting",
    });

    const result = await loadIssueEvaluationContext({
      issueId: issue._id,
      userId: expert._id,
      stage: "criteriaWeighting",
    });

    expect(String(result.issue._id)).toBe(String(issue._id));
    expect(result.structure).toMatchObject({
      key: "manualCriteriaWeights",
      stage: "criteriaWeighting",
    });
  });

  it("pending participant cannot save, get, or submit evaluations", async () => {
    const { issue, expert, leafCriteria } =
      await createCriteriaWeightingEvaluationFixture();

    await createParticipationFixture({
      issueId: issue._id,
      expertId: expert._id,
      invitationStatus: "pending",
      entryPhase: 0,
      entryStage: "criteriaWeighting",
    });

    await expectEvaluationOpsRejected({
      issueId: issue._id,
      userId: expert._id,
      stage: "criteriaWeighting",
      payload: buildManualWeightsPayload(leafCriteria, [1, ""]),
      expectedError: {
        statusCode: 403,
        field: "userId",
        message: "You are not an accepted participant for this issue",
      },
    });
  });

  it("unrelated user cannot save, get, or submit evaluations", async () => {
    const { issue, expert, leafCriteria } =
      await createCriteriaWeightingEvaluationFixture();
    const outsider = await createConfirmedUser();

    await createParticipationFixture({
      issueId: issue._id,
      expertId: expert._id,
      invitationStatus: "accepted",
      entryPhase: 0,
      entryStage: "criteriaWeighting",
    });

    await expectEvaluationOpsRejected({
      issueId: issue._id,
      userId: outsider._id,
      stage: "criteriaWeighting",
      payload: buildManualWeightsPayload(leafCriteria, [1, ""]),
      expectedError: {
        statusCode: 403,
        field: "userId",
        message: "You are not an accepted participant for this issue",
      },
    });
  });

  it("expelled or removed user with no active participation cannot evaluate", async () => {
    const { issue, expert, leafCriteria } =
      await createCriteriaWeightingEvaluationFixture();

    const participation = await createParticipationFixture({
      issueId: issue._id,
      expertId: expert._id,
      invitationStatus: "accepted",
      entryPhase: 0,
      entryStage: "criteriaWeighting",
    });

    await Participation.deleteOne({ _id: participation._id });
    await ExitUserIssue.create({
      issue: issue._id,
      user: expert._id,
      hidden: true,
      phase: 1,
      stage: "criteriaWeighting",
      reason: "Expelled by owner",
      history: [
        {
          phase: 0,
          stage: "criteriaWeighting",
          action: "entered",
          reason: "Invited by owner",
        },
        {
          phase: 1,
          stage: "criteriaWeighting",
          action: "exited",
          reason: "Expelled by owner",
        },
      ],
    });

    await expectEvaluationOpsRejected({
      issueId: issue._id,
      userId: expert._id,
      stage: "criteriaWeighting",
      payload: buildManualWeightsPayload(leafCriteria, [1, ""]),
      expectedError: {
        statusCode: 403,
        field: "userId",
        message: "You are not an accepted participant for this issue",
      },
    });
  });

  it("owner cannot evaluate unless they also have accepted participation", async () => {
    const owner = await createConfirmedUser({
      email: "owner@example.com",
    });
    const { issue, leafCriteria } = await createCriteriaWeightingEvaluationFixture({
      owner,
      expert: await createConfirmedUser(),
    });

    await expectEvaluationOpsRejected({
      issueId: issue._id,
      userId: owner._id,
      stage: "criteriaWeighting",
      payload: buildManualWeightsPayload(leafCriteria, [1, ""]),
      expectedError: {
        statusCode: 403,
        field: "userId",
        message: "You are not an accepted participant for this issue",
      },
    });

    await createParticipationFixture({
      issueId: issue._id,
      expertId: owner._id,
      invitationStatus: "accepted",
      entryPhase: 0,
      entryStage: "criteriaWeighting",
    });

    const result = await loadIssueEvaluationContext({
      issueId: issue._id,
      userId: owner._id,
      stage: "criteriaWeighting",
    });

    expect(result.structure.key).toBe("manualCriteriaWeights");
  });

  it("unsupported or invalid stages are rejected", async () => {
    const { issue, expert } = await createCriteriaWeightingEvaluationFixture();

    await createParticipationFixture({
      issueId: issue._id,
      expertId: expert._id,
      invitationStatus: "accepted",
      entryPhase: 0,
      entryStage: "criteriaWeighting",
    });

    for (const stage of ["weightsFinished", "not-a-stage"]) {
      await expect(
        loadIssueEvaluationContext({
          issueId: issue._id,
          userId: expert._id,
          stage,
        })
      ).rejects.toMatchObject({
        statusCode: 400,
        code: "UNSUPPORTED_EVALUATION_STAGE",
        field: "stage",
      });
    }
  });

  it("requested stage different from the current stage is rejected with ISSUE_STAGE_NOT_ACCEPTING_EVALUATIONS", async () => {
    const { issue, expert } = await createCriteriaWeightingEvaluationFixture();

    await createParticipationFixture({
      issueId: issue._id,
      expertId: expert._id,
      invitationStatus: "accepted",
      entryPhase: 0,
      entryStage: "criteriaWeighting",
    });

    await expect(
      loadIssueEvaluationContext({
        issueId: issue._id,
        userId: expert._id,
        stage: "alternativeEvaluation",
      })
    ).rejects.toMatchObject({
      statusCode: 400,
      code: "ISSUE_STAGE_NOT_ACCEPTING_EVALUATIONS",
      field: "stage",
      details: {
        currentStage: "criteriaWeighting",
        requestedStage: "alternativeEvaluation",
      },
    });
  });

  it("inactive issues reject evaluation operations", async () => {
    const { issue, expert, leafCriteria } =
      await createCriteriaWeightingEvaluationFixture({
        active: false,
      });

    await createParticipationFixture({
      issueId: issue._id,
      expertId: expert._id,
      invitationStatus: "accepted",
      entryPhase: 0,
      entryStage: "criteriaWeighting",
    });

    await expectEvaluationOpsRejected({
      issueId: issue._id,
      userId: expert._id,
      stage: "criteriaWeighting",
      payload: buildManualWeightsPayload(leafCriteria, [1, ""]),
      expectedError: {
        statusCode: 400,
        code: "ISSUE_NOT_ACTIVE",
        field: "issueId",
        message: "Issue is not active",
      },
    });
  });
});

describe("evaluation draft save behavior", () => {
  it("accepted expert can save a criteriaWeighting draft and it does not mark participation complete", async () => {
    const { issue, expert, leafCriteria } =
      await createCriteriaWeightingEvaluationFixture();

    await createParticipationFixture({
      issueId: issue._id,
      expertId: expert._id,
      invitationStatus: "accepted",
      entryPhase: 0,
      entryStage: "criteriaWeighting",
    });

    const result = await saveIssueEvaluationDraft({
      issueId: issue._id,
      userId: expert._id,
      stage: "criteriaWeighting",
      payload: buildManualWeightsPayload(leafCriteria, [0.6]),
    });

    const stored = await IssueEvaluation.findOne({
      issue: issue._id,
      expert: expert._id,
      stage: "criteriaWeighting",
      consensusPhase: 0,
    }).lean();
    const participation = await Participation.findOne({
      issue: issue._id,
      expert: expert._id,
    }).lean();

    expect(result).toMatchObject({
      message: "Evaluation draft saved successfully",
      stage: "criteriaWeighting",
      structureKey: "manualCriteriaWeights",
      consensusPhase: 0,
      completed: false,
    });
    expect(stored).toMatchObject({
      issue: issue._id,
      expert: expert._id,
      stage: "criteriaWeighting",
      consensusPhase: 0,
      completed: false,
      submittedAt: null,
      payload: {
        weightsByCriterion: {
          [String(leafCriteria[0]._id)]: 0.6,
          [String(leafCriteria[1]._id)]: "",
        },
      },
    });
    expect(participation).toMatchObject({
      weightsCompleted: false,
      evaluationCompleted: false,
    });
  });

  it("accepted expert can save an alternativeEvaluation draft with normalized flexible payload", async () => {
    const {
      issue,
      expert,
      alternatives,
      leafCriteria,
    } = await createAlternativeEvaluationFixture();

    const firstAlternativeId = String(alternatives[0]._id);

    const result = await saveIssueEvaluationDraft({
      issueId: issue._id,
      userId: expert._id,
      stage: "alternativeEvaluation",
      payload: buildAlternativeMatrixPayload({
        alternatives,
        leafCriteria,
        valuesByAlternativeId: {
          [firstAlternativeId]: "7.5",
        },
      }),
    });

    const stored = await IssueEvaluation.findOne({
      issue: issue._id,
      expert: expert._id,
      stage: "alternativeEvaluation",
      consensusPhase: 0,
    }).lean();
    const secondAlternativeId = String(alternatives[1]._id);
    const criterionId = String(leafCriteria[0]._id);

    expect(result).toMatchObject({
      stage: "alternativeEvaluation",
      structureKey: "alternativeCriteriaMatrix",
      consensusPhase: 0,
      completed: false,
    });
    expect(stored.completed).toBe(false);
    expect(stored.submittedAt).toBeNull();
    expect(stored.payload[firstAlternativeId][criterionId]).toMatchObject({
      value: 7.5,
      expressionDomain: expect.objectContaining({
        type: "numeric",
      }),
    });
    expect(stored.payload[secondAlternativeId][criterionId]).toMatchObject({
      value: "",
      expressionDomain: expect.objectContaining({
        type: "numeric",
      }),
    });
  });

  it("saving a draft twice updates the existing document and does not touch other experts or issues", async () => {
    const {
      issue,
      expert,
      leafCriteria,
    } = await createCriteriaWeightingEvaluationFixture();
    const otherExpert = await createConfirmedUser();
    const otherIssue = await createIssueFixture({
      ownerId: issue.ownerId,
      currentStage: "criteriaWeighting",
      criteriaWeightsStructureKey: "manualCriteriaWeights",
    });
    const { leafCriteria: otherLeafCriteria } = await createIssueCriteriaFixture({
      issueId: otherIssue._id,
      leafNames: ["Other Criterion A", "Other Criterion B"],
    });

    await createParticipationFixture({
      issueId: issue._id,
      expertId: expert._id,
      invitationStatus: "accepted",
      entryPhase: 0,
      entryStage: "criteriaWeighting",
    });
    await createParticipationFixture({
      issueId: issue._id,
      expertId: otherExpert._id,
      invitationStatus: "accepted",
      entryPhase: 0,
      entryStage: "criteriaWeighting",
    });
    await createParticipationFixture({
      issueId: otherIssue._id,
      expertId: expert._id,
      invitationStatus: "accepted",
      entryPhase: 0,
      entryStage: "criteriaWeighting",
    });

    const otherExpertEvaluation = await createIssueEvaluationFixture({
      issueId: issue._id,
      expertId: otherExpert._id,
      stage: "criteriaWeighting",
      consensusPhase: 0,
      payload: buildManualWeightsPayload(leafCriteria, [0.4, 0.6]),
      completed: false,
    });
    const otherIssueEvaluation = await createIssueEvaluationFixture({
      issueId: otherIssue._id,
      expertId: expert._id,
      stage: "criteriaWeighting",
      consensusPhase: 0,
      payload: buildManualWeightsPayload(otherLeafCriteria, [1, ""]),
      completed: false,
    });

    await saveIssueEvaluationDraft({
      issueId: issue._id,
      userId: expert._id,
      stage: "criteriaWeighting",
      payload: buildManualWeightsPayload(leafCriteria, [0.2, 0.8]),
    });

    await saveIssueEvaluationDraft({
      issueId: issue._id,
      userId: expert._id,
      stage: "criteriaWeighting",
      payload: buildManualWeightsPayload(leafCriteria, [0.3, 0.7]),
    });

    const evaluations = await IssueEvaluation.find({
      issue: issue._id,
      expert: expert._id,
      stage: "criteriaWeighting",
      consensusPhase: 0,
    }).lean();
    const untouchedOtherExpert = await IssueEvaluation.findById(
      otherExpertEvaluation._id
    ).lean();
    const untouchedOtherIssue = await IssueEvaluation.findById(
      otherIssueEvaluation._id
    ).lean();

    expect(evaluations).toHaveLength(1);
    expect(evaluations[0].payload).toEqual({
      weightsByCriterion: {
        [String(leafCriteria[0]._id)]: 0.3,
        [String(leafCriteria[1]._id)]: 0.7,
      },
    });
    expect(untouchedOtherExpert.payload).toEqual(otherExpertEvaluation.payload);
    expect(untouchedOtherIssue.payload).toEqual(otherIssueEvaluation.payload);
  });
});

describe("get evaluation payload behavior", () => {
  it("returns the default structure payload when no evaluation exists", async () => {
    const { issue, expert, leafCriteria } =
      await createCriteriaWeightingEvaluationFixture({
        leafNames: ["Criterion A"],
      });

    await createParticipationFixture({
      issueId: issue._id,
      expertId: expert._id,
      invitationStatus: "accepted",
      entryPhase: 0,
      entryStage: "criteriaWeighting",
    });

    const result = await getIssueEvaluationPayload({
      issueId: issue._id,
      userId: expert._id,
      stage: "criteriaWeighting",
    });

    expect(result).toMatchObject({
      stage: "criteriaWeighting",
      structureKey: "manualCriteriaWeights",
      consensusPhase: 0,
      evaluationContext: {
        issue: {
          id: String(issue._id),
        },
      },
      payload: {
        weightsByCriterion: {
          [String(leafCriteria[0]._id)]: "",
        },
      },
      collectiveReference: null,
      completed: false,
      submittedAt: null,
    });
  });

  it("returns only the current user's stored evaluation for the current consensus phase", async () => {
    const {
      issue,
      expert,
      alternatives,
      leafCriteria,
    } = await createAlternativeEvaluationFixture({
      consensusPhase: 1,
    });
    const otherExpert = await createConfirmedUser();
    const criterionId = String(leafCriteria[0]._id);
    const firstAlternativeId = String(alternatives[0]._id);

    await createParticipationFixture({
      issueId: issue._id,
      expertId: otherExpert._id,
      invitationStatus: "accepted",
      entryPhase: 1,
      entryStage: "alternativeEvaluation",
    });

    await createIssueEvaluationFixture({
      issueId: issue._id,
      expertId: expert._id,
      stage: "alternativeEvaluation",
      consensusPhase: 0,
      payload: buildAlternativeMatrixPayload({
        alternatives,
        leafCriteria,
        valuesByAlternativeId: {
          [firstAlternativeId]: 4,
        },
      }),
      completed: true,
    });
    await createIssueEvaluationFixture({
      issueId: issue._id,
      expertId: otherExpert._id,
      stage: "alternativeEvaluation",
      consensusPhase: 1,
      payload: buildAlternativeMatrixPayload({
        alternatives,
        leafCriteria,
        valuesByAlternativeId: {
          [firstAlternativeId]: 9,
        },
      }),
      completed: true,
    });

    const result = await getIssueEvaluationPayload({
      issueId: issue._id,
      userId: expert._id,
      stage: "alternativeEvaluation",
    });

    expect(result.consensusPhase).toBe(1);
    expect(result.completed).toBe(false);
    expect(result.payload[firstAlternativeId][criterionId].value).toBe("");
  });

  it("includes collectiveReference only when a previous consensus phase result exists", async () => {
    const {
      issue,
      expert,
      alternatives,
      leafCriteria,
    } = await createAlternativeEvaluationFixture({
      consensusPhase: 1,
    });
    const firstAlternativeId = String(alternatives[0]._id);

    await createIssueEvaluationFixture({
      issueId: issue._id,
      expertId: expert._id,
      stage: "alternativeEvaluation",
      consensusPhase: 1,
      payload: buildAlternativeMatrixPayload({
        alternatives,
        leafCriteria,
        valuesByAlternativeId: {
          [firstAlternativeId]: 8,
        },
      }),
      completed: true,
    });
    await IssueStageResult.create({
      issue: issue._id,
      stage: "alternativeEvaluation",
      consensusPhase: 0,
      collectiveEvaluations: {
        rankedAlternatives: ["Alternative A"],
      },
    });

    const result = await getIssueEvaluationPayload({
      issueId: issue._id,
      userId: expert._id,
      stage: "alternativeEvaluation",
    });

    expect(result.collectiveReference).toEqual({
      consensusPhase: 0,
      collectiveEvaluations: {
        rankedAlternatives: ["Alternative A"],
      },
    });
  });
});

describe("evaluation submit behavior", () => {
  it("accepted expert can submit criteriaWeighting and mark only their participation as weightsCompleted", async () => {
    const {
      issue,
      expert,
      leafCriteria,
    } = await createCriteriaWeightingEvaluationFixture();
    const otherExpert = await createConfirmedUser();

    await createParticipationFixture({
      issueId: issue._id,
      expertId: expert._id,
      invitationStatus: "accepted",
      entryPhase: 0,
      entryStage: "criteriaWeighting",
    });
    await createParticipationFixture({
      issueId: issue._id,
      expertId: otherExpert._id,
      invitationStatus: "accepted",
      entryPhase: 0,
      entryStage: "criteriaWeighting",
    });

    await saveIssueEvaluationDraft({
      issueId: issue._id,
      userId: expert._id,
      stage: "criteriaWeighting",
      payload: buildManualWeightsPayload(leafCriteria, [0.4, 0.6]),
    });

    const result = await submitIssueEvaluation({
      issueId: issue._id,
      userId: expert._id,
      stage: "criteriaWeighting",
      payload: buildManualWeightsPayload(leafCriteria, [0.4, 0.6]),
    });

    const stored = await IssueEvaluation.findOne({
      issue: issue._id,
      expert: expert._id,
      stage: "criteriaWeighting",
      consensusPhase: 0,
    }).lean();
    const currentUserEvaluationsCount = await IssueEvaluation.countDocuments({
      issue: issue._id,
      expert: expert._id,
      stage: "criteriaWeighting",
      consensusPhase: 0,
    });
    const updatedParticipation = await Participation.findOne({
      issue: issue._id,
      expert: expert._id,
    }).lean();
    const untouchedParticipation = await Participation.findOne({
      issue: issue._id,
      expert: otherExpert._id,
    }).lean();

    expect(result).toMatchObject({
      message: "Evaluation submitted successfully",
      stage: "criteriaWeighting",
      structureKey: "manualCriteriaWeights",
      consensusPhase: 0,
      completed: true,
    });
    expect(currentUserEvaluationsCount).toBe(1);
    expect(stored.completed).toBe(true);
    expect(stored.submittedAt).toBeInstanceOf(Date);
    expect(updatedParticipation).toMatchObject({
      weightsCompleted: true,
      evaluationCompleted: false,
    });
    expect(untouchedParticipation).toMatchObject({
      weightsCompleted: false,
      evaluationCompleted: false,
    });
  });

  it("accepted expert can submit alternativeEvaluation and mark only their participation as evaluationCompleted", async () => {
    const {
      issue,
      expert,
      alternatives,
      leafCriteria,
    } = await createAlternativeEvaluationFixture();
    const otherExpert = await createConfirmedUser();
    const firstAlternativeId = String(alternatives[0]._id);

    await createParticipationFixture({
      issueId: issue._id,
      expertId: otherExpert._id,
      invitationStatus: "accepted",
      entryPhase: 0,
      entryStage: "alternativeEvaluation",
    });

    const payload = buildAlternativeMatrixPayload({
      alternatives,
      leafCriteria,
      valuesByAlternativeId: {
        [firstAlternativeId]: 6,
        [String(alternatives[1]._id)]: 4,
      },
    });

    const result = await submitIssueEvaluation({
      issueId: issue._id,
      userId: expert._id,
      stage: "alternativeEvaluation",
      payload,
    });

    const stored = await IssueEvaluation.findOne({
      issue: issue._id,
      expert: expert._id,
      stage: "alternativeEvaluation",
      consensusPhase: 0,
    }).lean();
    const updatedParticipation = await Participation.findOne({
      issue: issue._id,
      expert: expert._id,
    }).lean();
    const untouchedParticipation = await Participation.findOne({
      issue: issue._id,
      expert: otherExpert._id,
    }).lean();

    expect(result).toMatchObject({
      stage: "alternativeEvaluation",
      structureKey: "alternativeCriteriaMatrix",
      consensusPhase: 0,
      completed: true,
      currentStage: "alternativeEvaluation",
    });
    expect(stored.completed).toBe(true);
    expect(stored.submittedAt).toBeInstanceOf(Date);
    expect(updatedParticipation).toMatchObject({
      weightsCompleted: false,
      evaluationCompleted: true,
    });
    expect(untouchedParticipation).toMatchObject({
      weightsCompleted: false,
      evaluationCompleted: false,
    });
  });

  it("submit updates an existing draft and does not overwrite another expert or previous consensus phase", async () => {
    const {
      issue,
      expert,
      alternatives,
      leafCriteria,
    } = await createAlternativeEvaluationFixture({
      consensusPhase: 1,
    });
    const otherExpert = await createConfirmedUser();
    const firstAlternativeId = String(alternatives[0]._id);
    const criterionId = String(leafCriteria[0]._id);

    await createParticipationFixture({
      issueId: issue._id,
      expertId: otherExpert._id,
      invitationStatus: "accepted",
      entryPhase: 1,
      entryStage: "alternativeEvaluation",
    });

    await createIssueEvaluationFixture({
      issueId: issue._id,
      expertId: expert._id,
      stage: "alternativeEvaluation",
      consensusPhase: 0,
      payload: buildAlternativeMatrixPayload({
        alternatives,
        leafCriteria,
        valuesByAlternativeId: {
          [firstAlternativeId]: 2,
        },
      }),
      completed: true,
    });
    const otherExpertEvaluation = await createIssueEvaluationFixture({
      issueId: issue._id,
      expertId: otherExpert._id,
      stage: "alternativeEvaluation",
      consensusPhase: 1,
      payload: buildAlternativeMatrixPayload({
        alternatives,
        leafCriteria,
        valuesByAlternativeId: {
          [firstAlternativeId]: 9,
        },
      }),
      completed: true,
    });

    await saveIssueEvaluationDraft({
      issueId: issue._id,
      userId: expert._id,
      stage: "alternativeEvaluation",
      payload: buildAlternativeMatrixPayload({
        alternatives,
        leafCriteria,
        valuesByAlternativeId: {
          [firstAlternativeId]: 5,
          [String(alternatives[1]._id)]: 4,
        },
      }),
    });

    await submitIssueEvaluation({
      issueId: issue._id,
      userId: expert._id,
      stage: "alternativeEvaluation",
      payload: buildAlternativeMatrixPayload({
        alternatives,
        leafCriteria,
        valuesByAlternativeId: {
          [firstAlternativeId]: 6,
          [String(alternatives[1]._id)]: 3,
        },
      }),
    });

    const currentPhaseDocs = await IssueEvaluation.find({
      issue: issue._id,
      expert: expert._id,
      stage: "alternativeEvaluation",
      consensusPhase: 1,
    }).lean();
    const previousPhaseDoc = await IssueEvaluation.findOne({
      issue: issue._id,
      expert: expert._id,
      stage: "alternativeEvaluation",
      consensusPhase: 0,
    }).lean();
    const untouchedOtherExpert = await IssueEvaluation.findById(
      otherExpertEvaluation._id
    ).lean();

    expect(currentPhaseDocs).toHaveLength(1);
    expect(currentPhaseDocs[0].completed).toBe(true);
    expect(currentPhaseDocs[0].payload[firstAlternativeId][criterionId].value).toBe(6);
    expect(previousPhaseDoc.payload[firstAlternativeId][criterionId].value).toBe(2);
    expect(untouchedOtherExpert.payload[firstAlternativeId][criterionId].value).toBe(9);
  });
});

describe("criteria weighting stage advancement", () => {
  it("advances from criteriaWeighting to weightsFinished only when all accepted participants submitted and there are no pending participants", async () => {
    const owner = await createConfirmedUser();
    const firstExpert = await createConfirmedUser();
    const secondExpert = await createConfirmedUser();
    const { issue, leafCriteria } =
      await createCriteriaWeightingEvaluationFixture({
        owner,
        expert: firstExpert,
      });

    await createParticipationFixture({
      issueId: issue._id,
      expertId: firstExpert._id,
      invitationStatus: "accepted",
      entryPhase: 0,
      entryStage: "criteriaWeighting",
    });
    await createParticipationFixture({
      issueId: issue._id,
      expertId: secondExpert._id,
      invitationStatus: "accepted",
      entryPhase: 0,
      entryStage: "criteriaWeighting",
    });

    await submitIssueEvaluation({
      issueId: issue._id,
      userId: firstExpert._id,
      stage: "criteriaWeighting",
      payload: buildManualWeightsPayload(leafCriteria, [0.5, 0.5]),
    });

    expect((await Issue.findById(issue._id)).currentStage).toBe("criteriaWeighting");

    const result = await submitIssueEvaluation({
      issueId: issue._id,
      userId: secondExpert._id,
      stage: "criteriaWeighting",
      payload: buildManualWeightsPayload(leafCriteria, [0.7, 0.3]),
    });

    expect(result.currentStage).toBe("weightsFinished");
    expect((await Issue.findById(issue._id)).currentStage).toBe("weightsFinished");
  });

  it("remains in criteriaWeighting if any accepted participant has not completed weights", async () => {
    const owner = await createConfirmedUser();
    const firstExpert = await createConfirmedUser();
    const secondExpert = await createConfirmedUser();
    const { issue, leafCriteria } =
      await createCriteriaWeightingEvaluationFixture({
        owner,
        expert: firstExpert,
      });

    await createParticipationFixture({
      issueId: issue._id,
      expertId: firstExpert._id,
      invitationStatus: "accepted",
      entryPhase: 0,
      entryStage: "criteriaWeighting",
    });
    await createParticipationFixture({
      issueId: issue._id,
      expertId: secondExpert._id,
      invitationStatus: "accepted",
      entryPhase: 0,
      entryStage: "criteriaWeighting",
    });

    await submitIssueEvaluation({
      issueId: issue._id,
      userId: firstExpert._id,
      stage: "criteriaWeighting",
      payload: buildManualWeightsPayload(leafCriteria, [0.4, 0.6]),
    });

    expect((await Issue.findById(issue._id)).currentStage).toBe("criteriaWeighting");
  });

  it("remains in criteriaWeighting when there is a pending participant", async () => {
    const owner = await createConfirmedUser();
    const acceptedExpert = await createConfirmedUser();
    const pendingExpert = await createConfirmedUser();
    const { issue, leafCriteria } =
      await createCriteriaWeightingEvaluationFixture({
        owner,
        expert: acceptedExpert,
      });

    await createParticipationFixture({
      issueId: issue._id,
      expertId: acceptedExpert._id,
      invitationStatus: "accepted",
      entryPhase: 0,
      entryStage: "criteriaWeighting",
    });
    await createParticipationFixture({
      issueId: issue._id,
      expertId: pendingExpert._id,
      invitationStatus: "pending",
      entryPhase: 0,
      entryStage: "criteriaWeighting",
    });

    const result = await submitIssueEvaluation({
      issueId: issue._id,
      userId: acceptedExpert._id,
      stage: "criteriaWeighting",
      payload: buildManualWeightsPayload(leafCriteria, [0.4, 0.6]),
    });

    expect(result.currentStage).toBe("criteriaWeighting");
    expect((await Issue.findById(issue._id)).currentStage).toBe("criteriaWeighting");
  });

  it("does not change stage when submitting alternativeEvaluation", async () => {
    const {
      issue,
      expert,
      alternatives,
      leafCriteria,
    } = await createAlternativeEvaluationFixture();
    const firstAlternativeId = String(alternatives[0]._id);

    const result = await submitIssueEvaluation({
      issueId: issue._id,
      userId: expert._id,
      stage: "alternativeEvaluation",
      payload: buildAlternativeMatrixPayload({
        alternatives,
        leafCriteria,
        valuesByAlternativeId: {
          [firstAlternativeId]: 6,
          [String(alternatives[1]._id)]: 5,
        },
      }),
    });

    expect(result.currentStage).toBe("alternativeEvaluation");
    expect((await Issue.findById(issue._id)).currentStage).toBe("alternativeEvaluation");
  });
});

describe("consensus phase and re-entry behavior", () => {
  it("evaluations are isolated by issue, expert, stage, and consensusPhase", async () => {
    const {
      issue,
      expert,
      alternatives,
      leafCriteria,
    } = await createAlternativeEvaluationFixture({
      consensusPhase: 1,
    });
    const firstAlternativeId = String(alternatives[0]._id);
    const secondAlternativeId = String(alternatives[1]._id);
    const criterionId = String(leafCriteria[0]._id);

    await createIssueEvaluationFixture({
      issueId: issue._id,
      expertId: expert._id,
      stage: "alternativeEvaluation",
      consensusPhase: 0,
      payload: buildAlternativeMatrixPayload({
        alternatives,
        leafCriteria,
        valuesByAlternativeId: {
          [firstAlternativeId]: 3,
          [secondAlternativeId]: 2,
        },
      }),
      completed: true,
    });

    await saveIssueEvaluationDraft({
      issueId: issue._id,
      userId: expert._id,
      stage: "alternativeEvaluation",
      payload: buildAlternativeMatrixPayload({
        alternatives,
        leafCriteria,
        valuesByAlternativeId: {
          [firstAlternativeId]: 7,
          [secondAlternativeId]: 1,
        },
      }),
    });

    const previousPhase = await IssueEvaluation.findOne({
      issue: issue._id,
      expert: expert._id,
      stage: "alternativeEvaluation",
      consensusPhase: 0,
    }).lean();
    const currentPhase = await IssueEvaluation.findOne({
      issue: issue._id,
      expert: expert._id,
      stage: "alternativeEvaluation",
      consensusPhase: 1,
    }).lean();

    expect(previousPhase.payload[firstAlternativeId][criterionId].value).toBe(3);
    expect(currentPhase.payload[firstAlternativeId][criterionId].value).toBe(7);
  });

  it("a re-added expert evaluates only the current consensus phase and older drafts are not resurrected", async () => {
    const owner = await createConfirmedUser();
    const expert = await createConfirmedUser();
    const {
      issue,
      alternatives,
      leafCriteria,
    } = await createAlternativeEvaluationFixture({
      owner,
      expert,
      consensusPhase: 2,
      entryPhase: 2,
    });
    const firstAlternativeId = String(alternatives[0]._id);

    await IssueEvaluation.deleteMany({
      issue: issue._id,
      expert: expert._id,
    });

    await createIssueEvaluationFixture({
      issueId: issue._id,
      expertId: expert._id,
      stage: "alternativeEvaluation",
      consensusPhase: 0,
      payload: buildAlternativeMatrixPayload({
        alternatives,
        leafCriteria,
        valuesByAlternativeId: {
          [firstAlternativeId]: 2,
        },
      }),
      completed: false,
    });
    await ExitUserIssue.create({
      issue: issue._id,
      user: expert._id,
      hidden: false,
      phase: 2,
      stage: "alternativeEvaluation",
      reason: "Invited by owner",
      history: [
        {
          phase: 0,
          stage: "alternativeEvaluation",
          action: "entered",
          reason: "Invited by owner",
        },
        {
          phase: 1,
          stage: "alternativeEvaluation",
          action: "exited",
          reason: "Expelled by owner",
        },
        {
          phase: 2,
          stage: "alternativeEvaluation",
          action: "entered",
          reason: "Invited by owner",
        },
      ],
    });

    const beforeSave = await getIssueEvaluationPayload({
      issueId: issue._id,
      userId: expert._id,
      stage: "alternativeEvaluation",
    });

    expect(beforeSave.consensusPhase).toBe(2);
    expect(beforeSave.completed).toBe(false);
    expect(beforeSave.payload[firstAlternativeId][String(leafCriteria[0]._id)].value).toBe("");

    const currentPhasePayload = buildAlternativeMatrixPayload({
      alternatives,
      leafCriteria,
      valuesByAlternativeId: {
        [firstAlternativeId]: 9,
        [String(alternatives[1]._id)]: 1,
      },
    });

    await saveIssueEvaluationDraft({
      issueId: issue._id,
      userId: expert._id,
      stage: "alternativeEvaluation",
      payload: currentPhasePayload,
    });
    const afterSave = await getIssueEvaluationPayload({
      issueId: issue._id,
      userId: expert._id,
      stage: "alternativeEvaluation",
    });

    expect(afterSave.consensusPhase).toBe(2);
    expect(afterSave.payload[firstAlternativeId][String(leafCriteria[0]._id)].value).toBe(9);

    await submitIssueEvaluation({
      issueId: issue._id,
      userId: expert._id,
      stage: "alternativeEvaluation",
      payload: currentPhasePayload,
    });

    const evaluations = await IssueEvaluation.find({
      issue: issue._id,
      expert: expert._id,
      stage: "alternativeEvaluation",
    })
      .sort({ consensusPhase: 1 })
      .lean();

    expect(evaluations).toHaveLength(2);
    expect(evaluations[0]).toMatchObject({
      consensusPhase: 0,
      completed: false,
    });
    expect(evaluations[1]).toMatchObject({
      consensusPhase: 2,
      completed: true,
    });
  });
});
