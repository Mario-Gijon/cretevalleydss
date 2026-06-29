import { describe, expect, it } from "vitest";

import { Participation } from "../../../models/Participations.js";
import {
  getIssueEvaluationPayload,
  saveIssueEvaluationDraft,
  submitIssueEvaluation,
} from "../../../modules/issues/evaluations/index.js";
import { loadIssueEvaluationContext } from "../../../modules/issues/evaluations/loadIssueEvaluationContext.js";
import {
  createConfirmedUser,
  createIssueAlternativesFixture,
  createIssueCriteriaFixture,
  createIssueExpressionDomainSnapshotFixture,
  createIssueFixture,
  createParticipationFixture,
} from "../../setup/fixtures.js";
import { setupMongoDbTestHooks } from "../../setup/database.js";

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

const createCriteriaWeightingFixture = async ({
  consensusPhase = 0,
  entryPhase = 0,
  entryStage = "criteriaWeighting",
  invitationStatus = "accepted",
} = {}) => {
  const owner = await createConfirmedUser();
  const expert = await createConfirmedUser();
  const issue = await createIssueFixture({
    ownerId: owner._id,
    createdBy: owner._id,
    currentStage: "criteriaWeighting",
    consensusPhase,
    criteriaWeightsStructureKey: "manualCriteriaWeights",
  });

  await createIssueAlternativesFixture({
    issueId: issue._id,
  });
  const domain = await createIssueExpressionDomainSnapshotFixture({
    issueId: issue._id,
  });
  const { leafCriteria } = await createIssueCriteriaFixture({
    issueId: issue._id,
    leafNames: ["Criterion A", "Criterion B"],
    expressionDomainId: domain._id,
  });

  await createParticipationFixture({
    issueId: issue._id,
    expertId: expert._id,
    invitationStatus,
    entryPhase,
    entryStage,
  });

  return {
    owner,
    expert,
    issue,
    leafCriteria,
  };
};

const createAlternativeEvaluationFixture = async ({
  consensusPhase = 0,
  entryPhase = 0,
  entryStage = "alternativeEvaluation",
  invitationStatus = "accepted",
} = {}) => {
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
    expertId: expert._id,
    invitationStatus,
    entryPhase,
    entryStage,
  });

  return {
    owner,
    expert,
    issue,
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

describe("evaluation participation entry guards", () => {
  it("blocks accepted participants whose entryPhase is after the current issue phase", async () => {
    const { issue, expert, leafCriteria } = await createCriteriaWeightingFixture({
      consensusPhase: 1,
      entryPhase: 2,
      entryStage: "criteriaWeighting",
    });

    await expectEvaluationOpsRejected({
      issueId: issue._id,
      userId: expert._id,
      stage: "criteriaWeighting",
      payload: buildManualWeightsPayload(leafCriteria, [1, ""]),
      expectedError: {
        statusCode: 403,
        code: "PARTICIPATION_ENTRY_WINDOW_BLOCKS_EVALUATION",
        field: "stage",
      },
    });
  });

  it("blocks criteriaWeighting for same-phase participants who entered only at alternativeEvaluation", async () => {
    const { issue, expert, leafCriteria } = await createCriteriaWeightingFixture({
      consensusPhase: 0,
      entryPhase: 0,
      entryStage: "alternativeEvaluation",
    });

    await expectEvaluationOpsRejected({
      issueId: issue._id,
      userId: expert._id,
      stage: "criteriaWeighting",
      payload: buildManualWeightsPayload(leafCriteria, [1, ""]),
      expectedError: {
        statusCode: 403,
        code: "PARTICIPATION_ENTRY_WINDOW_BLOCKS_EVALUATION",
        field: "stage",
        details: {
          entryPhase: 0,
          entryStage: "alternativeEvaluation",
          currentConsensusPhase: 0,
          requestedStage: "criteriaWeighting",
        },
      },
    });
  });

  it("allows same-phase criteriaWeighting participants to evaluate criteriaWeighting", async () => {
    const { issue, expert, leafCriteria } = await createCriteriaWeightingFixture({
      consensusPhase: 0,
      entryPhase: 0,
      entryStage: "criteriaWeighting",
    });

    const result = await saveIssueEvaluationDraft({
      issueId: issue._id,
      userId: expert._id,
      stage: "criteriaWeighting",
      payload: buildManualWeightsPayload(leafCriteria, [0.6, ""]),
    });

    expect(result).toMatchObject({
      stage: "criteriaWeighting",
      structureKey: "manualCriteriaWeights",
      consensusPhase: 0,
      completed: false,
    });
  });

  it("allows participants who entered at criteriaWeighting to later evaluate alternativeEvaluation in the same phase", async () => {
    const { issue, expert, alternatives, leafCriteria } =
      await createAlternativeEvaluationFixture({
        consensusPhase: 1,
        entryPhase: 1,
        entryStage: "criteriaWeighting",
      });

    const result = await saveIssueEvaluationDraft({
      issueId: issue._id,
      userId: expert._id,
      stage: "alternativeEvaluation",
      payload: buildAlternativeMatrixPayload({
        alternatives,
        leafCriteria,
        valuesByAlternativeId: {
          [String(alternatives[0]._id)]: 7,
        },
      }),
    });

    expect(result).toMatchObject({
      stage: "alternativeEvaluation",
      structureKey: "alternativeCriteriaMatrix",
      consensusPhase: 1,
      completed: false,
    });
  });

  it("allows accepted participants from earlier phases to evaluate the current phase", async () => {
    const { issue, expert, alternatives, leafCriteria } =
      await createAlternativeEvaluationFixture({
        consensusPhase: 3,
        entryPhase: 1,
        entryStage: "alternativeEvaluation",
      });

    const context = await loadIssueEvaluationContext({
      issueId: issue._id,
      userId: expert._id,
      stage: "alternativeEvaluation",
    });

    expect(String(context.issue._id)).toBe(String(issue._id));
    expect(context.structure.key).toBe("alternativeCriteriaMatrix");

    const payload = await getIssueEvaluationPayload({
      issueId: issue._id,
      userId: expert._id,
      stage: "alternativeEvaluation",
    });

    expect(payload.payload[String(alternatives[0]._id)][String(leafCriteria[0]._id)].value).toBe("");
  });

  it("keeps legacy null entryPhase and entryStage participations backward compatible", async () => {
    const { issue, expert, alternatives, leafCriteria } =
      await createAlternativeEvaluationFixture({
        consensusPhase: 2,
        entryPhase: null,
        entryStage: null,
      });

    await Participation.updateOne(
      { issue: issue._id, expert: expert._id },
      {
        $set: {
          entryPhase: null,
          entryStage: null,
        },
      }
    );

    const result = await saveIssueEvaluationDraft({
      issueId: issue._id,
      userId: expert._id,
      stage: "alternativeEvaluation",
      payload: buildAlternativeMatrixPayload({
        alternatives,
        leafCriteria,
        valuesByAlternativeId: {
          [String(alternatives[1]._id)]: 4,
        },
      }),
    });

    expect(result).toMatchObject({
      stage: "alternativeEvaluation",
      consensusPhase: 2,
      completed: false,
    });
  });

  it("keeps pending, unrelated, and removed users on the existing accepted-participation rejection path", async () => {
    const outsider = await createConfirmedUser();
    const { issue, expert, leafCriteria } = await createCriteriaWeightingFixture({
      invitationStatus: "pending",
    });

    const removedParticipation = await createParticipationFixture({
      issueId: issue._id,
      expertId: outsider._id,
      invitationStatus: "accepted",
      entryPhase: 0,
      entryStage: "criteriaWeighting",
    });
    await Participation.deleteOne({ _id: removedParticipation._id });

    for (const userId of [expert._id, outsider._id, (await createConfirmedUser())._id]) {
      await expectEvaluationOpsRejected({
        issueId: issue._id,
        userId,
        stage: "criteriaWeighting",
        payload: buildManualWeightsPayload(leafCriteria, [1, ""]),
        expectedError: {
          statusCode: 403,
          field: "userId",
          message: "You are not an accepted participant for this issue",
        },
      });
    }
  });
});
