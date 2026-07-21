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
  buildExpressionDomainAssignmentsByCriterionIdOrThrow,
} from "../../expressionDomains/buildIssueDomainConfig.js";
import { getExpressionDomainFamilyOrThrow } from "../../expressionDomains/expressionDomainTypeCatalog.js";
import {
  buildTargetModelRuntimeSnapshotOrThrow,
  validateScenarioModelCompatibilityOrThrow,
} from "./validateScenarioModelCompatibility.js";
import { EVALUATION_STAGES } from "../../decisionPlugins/evaluations/evaluationStages.js";
import { getTargetScenarioModelOrThrow } from "./loadScenarioTargetModel.js";
import { resolveAlternativeResultOrThrow } from "./loadScenarioEvaluationData.js";
import { validateEvaluationCoverageOrThrow } from "./validateScenarioEvaluationCoverage.js";
import { buildScenarioParametersOrThrow } from "./resolveScenarioModelParameters.js";
import { getIssueByIdOrThrow } from "../shared/queries.js";
import { buildExpertWeightSnapshotOrThrow } from "../shared/expertWeights.js";
import {
  getStageExpertWeights,
  serializePreviousStageResultForExecution,
} from "../stageResults/stageResultContract.js";

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

const serializeExpressionDomainDefinitionOrThrow = ({
  definition,
  issueId,
  criterionId,
  domainSnapshotId,
}) => {
  if (
    !definition ||
    typeof definition !== "object" ||
    Array.isArray(definition)
  ) {
    throw createInternalError(
      "Issue expression domain snapshot has invalid definition",
      {
        field: "expressionDomain.definition",
        details: { issueId, criterionId, domainSnapshotId },
      }
    );
  }

  try {
    return JSON.parse(JSON.stringify(definition));
  } catch {
    throw createInternalError(
      "Issue expression domain snapshot definition is not JSON-compatible",
      {
        field: "expressionDomain.definition",
        details: { issueId, criterionId, domainSnapshotId },
      }
    );
  }
};

export const buildScenarioCriteriaWithExpressionDomainsOrThrow = ({
  criteria,
  domainAssignmentsByCriterion,
  domainSnapshotsById,
  issueId,
}) => criteria.map((criterion) => {
  const criterionId = toIdString(criterion._id);
  const domainSnapshotId = toIdString(
    domainAssignmentsByCriterion[criterionId]
  );
  const domainSnapshot = domainSnapshotsById.get(domainSnapshotId);

  if (!criterionId || !domainSnapshotId || !domainSnapshot) {
    throw createInternalError(
      "Leaf criterion expression domain snapshot could not be resolved",
      {
        field: "expressionDomain",
        details: {
          issueId,
          criterionId,
          domainSnapshotId: domainSnapshotId || null,
        },
      }
    );
  }

  return {
    id: criterionId,
    name: criterion.name,
    type: criterion.type,
    expressionDomain: {
      id: domainSnapshotId,
      name: domainSnapshot.name,
      typeKey: domainSnapshot.typeKey,
      definition: serializeExpressionDomainDefinitionOrThrow({
        definition: domainSnapshot.definition,
        issueId,
        criterionId,
        domainSnapshotId,
      }),
    },
  };
});

const resolveScenarioParticipations = ({
  sourcePhase,
  latestAlternativeResult,
  currentParticipations,
  completedEvaluations,
  issueId,
}) => {
  if (sourcePhase === undefined) {
    return currentParticipations;
  }

  const currentParticipationByExpertId = new Map(
    currentParticipations.map((participation) => [
      toIdString(participation.expert?._id || participation.expert),
      participation,
    ])
  );
  const savedWeightByExpertId = new Map(
    getStageExpertWeights(latestAlternativeResult).map((entry) => [
      toIdString(entry?.expert),
      entry?.weight,
    ])
  );

  return completedEvaluations.map((evaluation) => {
    const { expertId } = requireEvaluationExpertOrThrow({ issueId, evaluation });
    const currentParticipation = currentParticipationByExpertId.get(expertId);

    return {
      ...(currentParticipation || {}),
      expert: evaluation.expert,
      ...(savedWeightByExpertId.has(expertId)
        ? { weight: savedWeightByExpertId.get(expertId) }
        : {}),
    };
  });
};

export const buildScenarioExecutionContext = async ({
  issueId,
  userId,
  targetModelId,
  sourcePhase,
  paramOverrides,
}) => {
  const issue = await getIssueByIdOrThrow(issueId, {
    populate: "model",
    lean: false,
  });

  if (!sameId(issue.ownerId, userId)) {
    throw createForbiddenError("Not authorized: only owner can create scenarios");
  }

  const targetModel = await getTargetScenarioModelOrThrow({ targetModelId });
  const targetRuntimeSnapshot = buildTargetModelRuntimeSnapshotOrThrow(targetModel);
  const { latestAlternativeResult, phase } =
    await resolveAlternativeResultOrThrow({ issue, sourcePhase });

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
    buildExpressionDomainAssignmentsByCriterionIdOrThrow({
      leafCriteria: criteria,
      field: "expressionDomain",
    });
  const issueDomainSnapshotIds = Array.from(
    new Set(Object.values(domainAssignmentsByCriterion))
  );
  const issueDomainSnapshots = await IssueExpressionDomain.find({
    _id: { $in: issueDomainSnapshotIds },
  })
    .select("_id name typeKey definition")
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
    .filter(
      (snapshot) =>
        typeof snapshot.typeKey !== "string" || snapshot.typeKey.trim() === ""
    )
    .map((snapshot) => toIdString(snapshot._id));

  if (invalidTypeSnapshotIds.length > 0) {
    throw createInternalError("Issue expression domain snapshots have invalid typeKey", {
      field: "expressionDomain.typeKey",
      details: {
        issueId: toIdString(issue._id),
        snapshotIds: invalidTypeSnapshotIds,
      },
    });
  }

  const domainSnapshotsById = new Map(
    issueDomainSnapshots.map((snapshot) => [
      toIdString(snapshot._id),
      snapshot,
    ])
  );
  const scenarioCriteria = buildScenarioCriteriaWithExpressionDomainsOrThrow({
    criteria,
    domainAssignmentsByCriterion,
    domainSnapshotsById,
    issueId: toIdString(issue._id),
  });

  validateScenarioModelCompatibilityOrThrow({
    issue,
    targetRuntimeSnapshot,
    issueDomainSnapshots,
    targetModel,
    targetModelSupportedExpressionDomains:
      targetModel.supportedExpressionDomains,
  });

  const scenarioParticipations = resolveScenarioParticipations({
    sourcePhase,
    latestAlternativeResult,
    currentParticipations: participations,
    completedEvaluations,
    issueId: toIdString(issue._id),
  });

  validateEvaluationCoverageOrThrow({
    issue,
    phase,
    acceptedParticipations: scenarioParticipations,
    completedEvaluations,
  });

  const { normalizedParams, weightsUsed } =
    buildScenarioParametersOrThrow({
      targetModel,
      paramOverrides,
      criteria,
      alternatives,
    });
  const { weightsByExpertId } = buildExpertWeightSnapshotOrThrow({
    model: targetModel,
    participations: scenarioParticipations,
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

  const sortedParticipations = [...scenarioParticipations].sort((left, right) => {
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

    const payload = {
      expert: {
        id: expertId,
        name: evaluationExpert.expertName,
        email: evaluationExpert.expertEmail,
      },
      payload: evaluation.payload,
    };

    if (weightsByExpertId instanceof Map) {
      payload.weight = weightsByExpertId.get(expertId);
    }

    return payload;
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
    criteria: scenarioCriteria,
    weights: weightsUsed,
    consensusPhase: phase,
    previousStageResult: serializePreviousStageResultForExecution(
      latestAlternativeResult
    ),
  };

  const requestPayload = {
    modelParameters: normalizedParams,
    evaluations: evaluationPayloads,
    context: scenarioExecutionContext,
  };

  const usedDomainTypes = new Set(
    issueDomainSnapshots.map((domainSnapshot) =>
      getExpressionDomainFamilyOrThrow(domainSnapshot.typeKey)
    )
  );
  const domainType =
    usedDomainTypes.size === 1 ? Array.from(usedDomainTypes)[0] : null;

  return {
    issue,
    targetModel,
    targetRuntimeSnapshot,
    alternatives,
    criteria,
    participations: scenarioParticipations,
    completedEvaluations,
    latestAlternativeResult,
    stageResultId: latestAlternativeResult._id,
    domainType,
    evaluationPhase: phase,
    requestPayload,
  };
};
