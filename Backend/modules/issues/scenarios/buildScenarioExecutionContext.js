import { IssueEvaluation } from "../../../models/IssueEvaluations.js";
import { IssueExpressionDomain } from "../../../models/IssueExpressionDomains.js";
import { Participation } from "../../../models/Participations.js";
import {
  getOrderedAlternativesDb,
  getOrderedLeafCriteriaDb,
} from "../shared/ordering.js";
import {
  createBadRequestError,
  createForbiddenError,
  createInternalError,
} from "../../../utils/common/errors.js";
import { sameId, toIdString } from "../../../utils/common/ids.js";
import {
  buildExpressionDomainAssignmentsByCriterionOrThrow,
} from "../../expressionDomains/buildIssueDomainConfig.js";
import {
  buildTargetModelRuntimeSnapshotOrThrow,
  validateScenarioModelCompatibilityOrThrow,
} from "./validateScenarioModelCompatibility.js";
import { EVALUATION_STAGES } from "../../decisionEngine/evaluations/evaluation.constants.js";
import { getTargetScenarioModelOrThrow } from "./loadScenarioTargetModel.js";
import { resolveLatestAlternativeResultOrThrow } from "./loadScenarioEvaluationData.js";
import { validateEvaluationCoverageOrThrow } from "./validateScenarioEvaluationCoverage.js";
import { buildScenarioParametersOrThrow } from "./resolveScenarioModelParameters.js";
import { getIssueByIdOrThrow } from "../shared/queries.js";

const requireParticipationExpertOrThrow = ({ issueId, participation }) => {
  const expert = participation.expert;
  const expertId = expert ? toIdString(expert._id) : null;
  const expertEmail =
    expert && typeof expert.email === "string" ? expert.email.trim() : "";

  if (!expertId) {
    throw createInternalError(
      "Accepted participation is missing populated expert data",
      {
        field: "participations.expert",
        details: {
          issueId,
          participationId: toIdString(participation._id),
        },
      }
    );
  }

  if (!expertEmail) {
    throw createInternalError(
      "Accepted participation is missing populated expert email",
      {
        field: "participations.expert.email",
        details: {
          issueId,
          participationId: toIdString(participation._id),
        },
      }
    );
  }

  return {
    expertId,
    expertEmail,
  };
};

const requireEvaluationExpertOrThrow = ({ issueId, evaluation }) => {
  const expert = evaluation.expert;
  const expertId = expert ? toIdString(expert._id) : null;
  const expertEmail =
    expert && typeof expert.email === "string" ? expert.email.trim() : "";
  const expertName =
    expert && typeof expert.name === "string" ? expert.name.trim() : "";

  if (!expertId || !expertEmail || !expertName) {
    throw createInternalError(
      "Completed alternative evaluation is missing populated expert data",
      {
        field: "evaluations.expert",
        details: {
          issueId,
          expertId,
          evaluationId: toIdString(evaluation._id),
        },
      }
    );
  }

  return {
    expertId,
    expertEmail,
    expertName,
  };
};

export const buildScenarioExecutionContext = async ({
  issueId,
  userId,
  targetModelId,
  paramOverrides,
}) => {
  const issue = await getIssueByIdOrThrow(issueId, {
    populate: "model",
    lean: false,
  });

  if (!sameId(issue.admin, userId)) {
    throw createForbiddenError("Not authorized: only admin can create scenarios");
  }

  const targetModel = await getTargetScenarioModelOrThrow({ targetModelId });
  const targetRuntimeSnapshot = buildTargetModelRuntimeSnapshotOrThrow(targetModel);
  const { latestAlternativeResult, phase } =
    await resolveLatestAlternativeResultOrThrow({ issue });

  const [participations, completedEvaluations, alternatives, criteria] =
    await Promise.all([
      Participation.find({
        issue: issue._id,
        invitationStatus: "accepted",
      })
        .populate("expert", "email name")
        .lean(),
      IssueEvaluation.find({
        issue: issue._id,
        stage: EVALUATION_STAGES.ALTERNATIVE_EVALUATION,
        consensusPhase: phase,
        completed: true,
      })
        .populate("expert", "email name")
        .lean(),
      getOrderedAlternativesDb({
        issueId: issue._id,
        issueDoc: issue,
        select: "_id name",
        lean: true,
      }),
      getOrderedLeafCriteriaDb({
        issueId: issue._id,
        issueDoc: issue,
        select: "_id name type expressionDomain",
        lean: true,
      }),
    ]);

  if (!alternatives.length) {
    throw createBadRequestError("Issue has no alternatives", {
      field: "alternatives",
    });
  }

  if (!criteria.length) {
    throw createBadRequestError("Issue has no leaf criteria", {
      field: "criteria",
    });
  }

  const domainAssignmentsByCriterion =
    buildExpressionDomainAssignmentsByCriterionOrThrow({
      leafCriteria: criteria,
      field: "expressionDomain",
    });
  const issueDomainSnapshotIds = Array.from(
    new Set(Object.values(domainAssignmentsByCriterion))
  );
  const issueDomainSnapshots = await IssueExpressionDomain.find({
    _id: { $in: issueDomainSnapshotIds },
  })
    .select("_id name type numericRange membershipFunction valueCount")
    .lean();

  const existingSnapshotIds = new Set(
    issueDomainSnapshots.map((snapshot) => toIdString(snapshot._id))
  );
  const missingSnapshotIds = issueDomainSnapshotIds.filter(
    (snapshotId) => !existingSnapshotIds.has(toIdString(snapshotId))
  );

  if (missingSnapshotIds.length > 0) {
    throw createInternalError("Issue expression domain snapshots are missing", {
      field: "expressionDomain",
      details: {
        issueId: toIdString(issue._id),
        missingSnapshotIds,
      },
    });
  }

  const invalidTypeSnapshotIds = issueDomainSnapshots
    .filter((snapshot) => typeof snapshot.type !== "string" || snapshot.type.trim() === "")
    .map((snapshot) => toIdString(snapshot._id));

  if (invalidTypeSnapshotIds.length > 0) {
    throw createInternalError("Issue expression domain snapshots have invalid type", {
      field: "expressionDomain.type",
      details: {
        issueId: toIdString(issue._id),
        snapshotIds: invalidTypeSnapshotIds,
      },
    });
  }

  validateScenarioModelCompatibilityOrThrow({
    issue,
    targetRuntimeSnapshot,
    issueDomainSnapshots,
    targetModel,
    targetModelSupportedDomains: targetModel.supportedDomains,
  });

  validateEvaluationCoverageOrThrow({
    issue,
    phase,
    acceptedParticipations: participations,
    completedEvaluations,
  });

  const { paramsUsed, normalizedParams, weightsUsed } =
    buildScenarioParametersOrThrow({
      targetModel,
      paramOverrides,
      criteria,
      alternatives,
    });
  const normalizedIssueId = toIdString(issue._id);

  const evaluationsByExpertId = new Map(
    completedEvaluations.map((evaluation) => {
      const { expertId } = requireEvaluationExpertOrThrow({
        issueId: normalizedIssueId,
        evaluation,
      });

      return [expertId, evaluation];
    })
  );

  const sortedParticipations = [...participations].sort((left, right) => {
    const leftExpert = requireParticipationExpertOrThrow({
      issueId: normalizedIssueId,
      participation: left,
    });
    const rightExpert = requireParticipationExpertOrThrow({
      issueId: normalizedIssueId,
      participation: right,
    });

    return leftExpert.expertEmail.localeCompare(rightExpert.expertEmail);
  });

  const evaluationPayloads = sortedParticipations.map((participation) => {
    const { expertId } = requireParticipationExpertOrThrow({
      issueId: normalizedIssueId,
      participation,
    });
    const evaluation = evaluationsByExpertId.get(expertId);

    if (!evaluation) {
      throw createInternalError(
        "Completed alternative evaluation missing for accepted expert",
        {
          field: "evaluations",
          details: {
            issueId: normalizedIssueId,
            expertId,
          },
        }
      );
    }

    const evaluationExpert = requireEvaluationExpertOrThrow({
      issueId: normalizedIssueId,
      evaluation,
    });

    if (!evaluation.payload) {
      throw createInternalError(
        "Completed alternative evaluation is missing payload",
        {
          field: "evaluations.payload",
          details: {
            issueId: normalizedIssueId,
            expertId,
            evaluationId: toIdString(evaluation._id),
          },
        }
      );
    }

    return {
      expert: {
        id: expertId,
        name: evaluationExpert.expertName,
        email: evaluationExpert.expertEmail,
      },
      payload: evaluation.payload,
    };
  });

  const scenarioExecutionContext = {
    issue: {
      id: toIdString(issue._id),
      name: issue.name,
    },
    alternatives: alternatives.map((alternative) => ({
      id: toIdString(alternative._id),
      name: alternative.name,
    })),
    criteria: criteria.map((criterion) => ({
      id: toIdString(criterion._id),
      name: criterion.name,
      type: criterion.type,
    })),
    weights: weightsUsed,
    consensusPhase: phase,
    previousStageResult: latestAlternativeResult,
  };

  const requestPayload = {
    modelParameters: normalizedParams,
    evaluations: evaluationPayloads,
    context: scenarioExecutionContext,
  };

  const usedDomainTypes = new Set(
    issueDomainSnapshots.map((domainSnapshot) => domainSnapshot.type)
  );
  const domainType =
    usedDomainTypes.size === 1 ? Array.from(usedDomainTypes)[0] : null;

  return {
    issue,
    targetModel,
    targetRuntimeSnapshot,
    alternatives,
    criteria,
    participations,
    completedEvaluations,
    latestAlternativeResult,
    domainType,
    paramsUsed,
    normalizedParams,
    weightsUsed,
    expertsOrder: evaluationPayloads.map((entry) => entry.expert.email),
    evaluationPhase: phase,
    evaluationPayloads,
    scenarioExecutionContext,
    requestPayload,
  };
};
