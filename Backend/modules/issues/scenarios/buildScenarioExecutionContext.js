import { Issue } from "../../../models/Issues.js";
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
  createNotFoundError,
} from "../../../utils/common/errors.js";
import { sameId, toIdString } from "../../../utils/common/ids.js";
import { isValidObjectIdLike } from "../../../utils/common/mongoose.js";
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

export const buildScenarioExecutionContext = async ({
  issueId,
  userId,
  targetModelId,
  paramOverrides,
}) => {
  if (!issueId || !isValidObjectIdLike(issueId)) {
    throw createBadRequestError("Valid issue id is required", {
      field: "issueId",
    });
  }

  const issue = await Issue.findById(issueId).populate("model");
  if (!issue) {
    throw createNotFoundError("Issue not found", {
      field: "issueId",
    });
  }

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

  validateScenarioModelCompatibilityOrThrow({
    issue,
    targetRuntimeSnapshot,
    issueDomainSnapshots,
    targetModel,
    targetModelSupportedDomains: targetModel?.supportedDomains || null,
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

  const evaluationsByExpertId = new Map(
    completedEvaluations.map((evaluation) => [
      toIdString(evaluation?.expert?._id || evaluation?.expert),
      evaluation,
    ])
  );

  const sortedParticipations = [...participations].sort((left, right) => {
    const leftEmail = String(left?.expert?.email || "").trim();
    const rightEmail = String(right?.expert?.email || "").trim();
    return leftEmail.localeCompare(rightEmail);
  });

  const evaluationPayloads = sortedParticipations.map((participation) => {
    const expertId = toIdString(participation?.expert?._id || participation?.expert);
    const evaluation = evaluationsByExpertId.get(expertId);

    if (!evaluation) {
      throw createInternalError(
        "Completed alternative evaluation missing for accepted expert",
        {
          field: "evaluations",
          details: {
            issueId: toIdString(issue._id),
            expertId,
          },
        }
      );
    }

    return {
      expert: {
        id: expertId,
        name: evaluation?.expert?.name || "",
        email: evaluation?.expert?.email || "",
      },
      payload: evaluation?.payload || {},
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
    issueDomainSnapshots.map((domainSnapshot) => domainSnapshot?.type).filter(Boolean)
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
    expertsOrder: evaluationPayloads.map((entry) => entry.expert.email || entry.expert.id),
    evaluationPhase: phase,
    evaluationPayloads,
    scenarioExecutionContext,
    requestPayload,
  };
};
