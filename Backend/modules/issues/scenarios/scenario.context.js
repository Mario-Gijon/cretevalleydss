import { Consensus } from "../../../models/Consensus.js";
import { Issue } from "../../../models/Issues.js";
import { IssueModel } from "../../../models/IssueModels.js";
import { Participation } from "../../../models/Participations.js";
import {
  ensureIssueOrdersDb,
  getOrderedAlternativesDb,
  getOrderedLeafCriteriaDb,
} from "../issue.ordering.js";
import {
  createBadRequestError,
  createForbiddenError,
  createNotFoundError,
} from "../../../utils/common/errors.js";
import { sameId } from "../../../utils/common/ids.js";
import { isValidObjectIdLike } from "../../../utils/common/mongoose.js";
import {
  normalizeScenarioParamOverridesOrThrow,
  resolveScenarioWeightsArray,
} from "./scenario.params.js";
import { validateAndNormalizeModelParametersOrThrow } from "../modelParameters/index.js";
import { detectIssueDomainTypeOrThrow } from "../expressionDomains/issueDomainDetection.js";
import {
  buildTargetModelRuntimeSnapshotOrThrow,
  buildTargetRuntimeModelFromSnapshot,
  validateScenarioModelCompatibilityOrThrow,
} from "./scenario.compatibility.js";

const getModelParameterKeys = (modelDoc) => {
  return new Set(
    (modelDoc?.parameters || [])
      .map((parameter) => {
        if (typeof parameter?.key !== "string") return null;
        const normalized = parameter.key.trim();
        return normalized.length > 0 ? normalized : null;
      })
      .filter(Boolean)
  );
};

const getTargetScenarioModelOrThrow = async ({
  targetModelId,
}) => {
  const cleanTargetModelId = String(targetModelId || "").trim();

  if (!cleanTargetModelId) {
    throw createBadRequestError("targetModelId is required", {
      field: "targetModelId",
    });
  }

  if (!isValidObjectIdLike(cleanTargetModelId)) {
    throw createBadRequestError("targetModelId must be a valid id", {
      field: "targetModelId",
      details: {
        targetModelId: cleanTargetModelId,
      },
    });
  }

  const targetModel = await IssueModel.findById(cleanTargetModelId);

  if (!targetModel) {
    throw createBadRequestError("Target model not found", {
      field: "targetModelId",
      details: {
        targetModelId: cleanTargetModelId,
      },
    });
  }

  return targetModel;
};

const resolveScenarioEvaluationPhaseOrThrow = ({ issue, consensusCount }) => {
  const phase = Number(issue?.consensusPhase);

  if (!Number.isInteger(phase) || phase < 1) {
    throw createBadRequestError("Issue consensusPhase is invalid", {
      field: "consensusPhase",
      details: {
        consensusPhase: issue?.consensusPhase ?? null,
      },
    });
  }

  if (Boolean(issue?.isConsensus) && Number(consensusCount) > 1) {
    throw createBadRequestError(
      "Simulation disabled: consensus issues with more than 1 saved phase are not supported yet."
    );
  }

  return phase;
};

export const getCreateScenarioContext = async ({
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
    throw createForbiddenError(
      "Not authorized: only admin can create scenarios"
    );
  }

  const [targetModel, consensusCount, pendingInvitations, participations] =
    await Promise.all([
      getTargetScenarioModelOrThrow({
        targetModelId,
      }),
      Consensus.countDocuments({ issue: issue._id }),
      Participation.countDocuments({
        issue: issue._id,
        invitationStatus: "pending",
      }),
      Participation.find({
        issue: issue._id,
        invitationStatus: "accepted",
      }).populate("expert", "email"),
    ]);

  const evaluationPhase = resolveScenarioEvaluationPhaseOrThrow({
    issue,
    consensusCount,
  });

  if (pendingInvitations > 0) {
    throw createBadRequestError(
      "Simulation requires no pending invitations."
    );
  }

  if (!participations.length) {
    throw createBadRequestError("No accepted experts found");
  }

  const issueEvaluationStructure = issue.evaluationStructure;

  const targetRuntimeSnapshot = buildTargetModelRuntimeSnapshotOrThrow(
    targetModel
  );
  const targetEvaluationStructure = targetRuntimeSnapshot.targetEvaluationStructure;
  validateScenarioModelCompatibilityOrThrow({
    issue,
    targetModel,
    targetRuntimeSnapshot,
  });

  await ensureIssueOrdersDb({ issueId: issue._id });

  const [alternatives, criteria] = await Promise.all([
    getOrderedAlternativesDb({
      issueId: issue._id,
      issueDoc: issue,
      select: "_id name",
      lean: true,
    }),
    getOrderedLeafCriteriaDb({
      issueId: issue._id,
      issueDoc: issue,
      select: "_id name type",
      lean: true,
    }),
  ]);

  if (!alternatives.length || !criteria.length) {
    throw createBadRequestError("Issue has no alternatives/leaf criteria");
  }

  const expertIds = participations
    .map((participation) => participation.expert?._id)
    .filter(Boolean);

  let domainType = null;
  try {
    const detected = await detectIssueDomainTypeOrThrow({
      issueId: issue._id,
      expertIds,
    });
    domainType = detected.domainType;
  } catch (error) {
    domainType = null;
  }

  if (domainType && targetModel?.supportedDomains) {
    const supportsDomain = Boolean(
      targetModel.supportedDomains?.[domainType]?.enabled
    );

    if (!supportsDomain) {
      throw createBadRequestError(
        `Target model does not support '${domainType}' domains. Pick a compatible model.`,
        {
          field: "targetModel",
        }
      );
    }
  }

  const normalizedOverrides = normalizeScenarioParamOverridesOrThrow(paramOverrides);
  const targetParameterKeys = getModelParameterKeys(targetModel);
  const baseIssueParameters = Object.fromEntries(
    Object.entries(issue.modelParameters || {}).filter(([key]) =>
      targetParameterKeys.has(key)
    )
  );
  const rawScenarioParams = {
    ...baseIssueParameters,
    ...normalizedOverrides,
  };
  const normalizedScenarioParameters =
    validateAndNormalizeModelParametersOrThrow({
      model: targetModel,
      paramValues: rawScenarioParams,
      criteriaNodes: criteria,
      alternativesCount: alternatives.length,
    });

  const resolvedWeights = resolveScenarioWeightsArray({
    paramsUsed: normalizedScenarioParameters,
    criteria,
  });

  if (resolvedWeights) {
    normalizedScenarioParameters.weights = resolvedWeights;
  }

  return {
    issue,
    targetModel,
    targetRuntimeModel: buildTargetRuntimeModelFromSnapshot({
      targetModelName: targetModel.name,
      targetRuntimeSnapshot,
    }),
    participations,
    alternatives,
    criteria,
    issueEvaluationStructure,
    targetEvaluationStructure,
    domainType,
    paramsUsed: normalizedScenarioParameters,
    normalizedParams: normalizedScenarioParameters,
    expertsOrder: participations.map(
      (participation) => participation.expert.email
    ),
    consensusThresholdUsed: 1,
    evaluationPhase,
    targetRuntimeSnapshot,
  };
};
