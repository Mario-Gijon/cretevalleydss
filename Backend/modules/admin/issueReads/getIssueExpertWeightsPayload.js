import { IssueEvaluation } from "../../../models/IssueEvaluations.js";
import { Participation } from "../../../models/Participations.js";
import { User } from "../../../models/Users.js";

import { getOrderedLeafCriteriaDb } from "../../issues/shared/ordering.js";

import {
  createInternalError,
  createNotFoundError,
} from "../../../utils/common/errors.js";
import { toIdString } from "../../../utils/common/ids.js";
import {
  buildAdminExpertIdentityPayload,
  buildAdminExpertParticipationPayload,
  formatIssueSnapshotDomain,
} from "./adminIssueReadPayloads.js";
import {
  loadIssueForExpertWeightsOrThrow,
  validateIssueIdOrThrow,
  validateExpertIdOrThrow,
} from "./adminIssueReadLoaders.js";
import { getEvaluationStructureOrThrow } from "../../decisionEngine/evaluations/index.js";
import { buildEvaluationStructureContext } from "../../decisionEngine/evaluations/evaluationStructureContext.js";

const requireCriteriaWeightingStructureOrThrow = ({
  criteriaWeightingStructureKey,
  issueId,
}) => {
  const criteriaWeightingStructure = getEvaluationStructureOrThrow(
    criteriaWeightingStructureKey
  );

  if (
    typeof criteriaWeightingStructure.key !== "string" ||
    criteriaWeightingStructure.key.trim() === ""
  ) {
    throw createInternalError("Criteria weighting structure key is invalid", {
      field: "criteriaWeightingStructure.key",
      details: {
        issueId,
        criteriaWeightingStructureKey,
      },
    });
  }

  if (
    typeof criteriaWeightingStructure.label !== "string" ||
    criteriaWeightingStructure.label.trim() === ""
  ) {
    throw createInternalError("Criteria weighting structure label is invalid", {
      field: "criteriaWeightingStructure.label",
      details: {
        issueId,
        criteriaWeightingStructureKey,
      },
    });
  }

  if (typeof criteriaWeightingStructure.get !== "function") {
    throw createInternalError("Criteria weighting structure get is invalid", {
      field: "criteriaWeightingStructure.get",
      details: {
        issueId,
        criteriaWeightingStructureKey,
      },
    });
  }

  return criteriaWeightingStructure;
};

const resolveWeightsKind = ({
  leafNames,
  criteriaWeightingStructureKey,
  criteriaWeightingStructure,
}) => {
  if (leafNames.length === 1) {
    return "singleLeaf";
  }

  if (!criteriaWeightingStructureKey) {
    return "notRequired";
  }

  return criteriaWeightingStructure.key;
};

const resolveStructureLabel = ({ kind, criteriaWeightingStructure }) => {
  if (kind === "singleLeaf") {
    return "Single criterion weights";
  }

  if (kind === "notRequired") {
    return "Not required";
  }

  return criteriaWeightingStructure.label.trim();
};

export const getIssueExpertWeightsPayload = async ({
  issueId,
  expertId,
}) => {
  validateIssueIdOrThrow(issueId);
  validateExpertIdOrThrow(expertId);
  const issue = await loadIssueForExpertWeightsOrThrow({ issueId });

  const [expert, participation, orderedLeafCriteria, weightDoc] =
    await Promise.all([
      User.findById(expertId)
        .select("name email role university accountConfirm")
        .lean(),
      Participation.findOne({ issue: issueId, expert: expertId }).lean(),
      getOrderedLeafCriteriaDb({
        issueId,
        issueDoc: issue,
        select: "_id name type expressionDomain",
        lean: true,
      }),
      IssueEvaluation.findOne({
        issue: issueId,
        expert: expertId,
        stage: "criteriaWeighting",
      })
        .sort({ consensusPhase: -1 })
        .lean(),
    ]);

  if (!expert && !participation && !weightDoc) {
    throw createNotFoundError("Expert weight data for this issue not found", {
      field: "expertId",
    });
  }

  const leafNames = orderedLeafCriteria.map((criterion) => criterion.name);

  const resolvedWeights =
    Array.isArray(issue?.modelParameters?.weights) &&
    issue.modelParameters.weights.length
      ? leafNames.reduce((accumulator, name, index) => {
          accumulator[name] = issue.modelParameters.weights[index];
          return accumulator;
        }, {})
      : null;

  const criteriaWeightingStructureKey = issue.criteriaWeightingStructureKey || null;
  const criteriaWeightingStructure = criteriaWeightingStructureKey
    ? requireCriteriaWeightingStructureOrThrow({
        criteriaWeightingStructureKey,
        issueId: toIdString(issue._id),
      })
    : null;
  const criteriaWeightingStructureContext = criteriaWeightingStructure
    ? await buildEvaluationStructureContext({
        issue,
        leafCriteria: orderedLeafCriteria,
      })
    : null;
  const criteriaWeightingPayload = criteriaWeightingStructure
    ? await criteriaWeightingStructure.get({
        storedEvaluation: weightDoc,
        structureContext: criteriaWeightingStructureContext,
      })
    : null;

  const kind = resolveWeightsKind({
    leafNames,
    criteriaWeightingStructureKey,
    criteriaWeightingStructure,
  });

  const criteriaWeightsStatus = !criteriaWeightingStructureKey
    ? "notRequired"
    : !weightDoc
      ? "notSubmitted"
      : weightDoc.completed === true
        ? "submitted"
        : "draft";

  return {
    issue: {
      id: toIdString(issue._id),
      name: issue.name,
      currentStage: issue.currentStage,
      weightingMode: issue.weightingMode,
      active: issue.active,
      alternativeEvaluationStructureKey: issue.alternativeEvaluationStructureKey,
      criteriaWeightingStructureKey: issue.criteriaWeightingStructureKey,
      model: issue.model
        ? {
            id: toIdString(issue.model._id),
            name: issue.model.name,
            alternativeEvaluationStructureKey:
              issue.model.alternativeEvaluationStructureKey,
            criteriaWeightingStructureKey:
              issue.model.criteriaWeightingStructureKey,
          }
        : null,
    },
    expert: buildAdminExpertIdentityPayload(expert, expertId),
    participation: buildAdminExpertParticipationPayload(participation),
    weights: {
      kind,
      status: criteriaWeightsStatus,
      structureKey: issue.criteriaWeightingStructureKey || null,
      structureLabel: resolveStructureLabel({
        kind,
        criteriaWeightingStructure,
      }),
      payload: criteriaWeightingPayload,
      leafCriteria: leafNames,
      leafCriteriaDetailed: orderedLeafCriteria.map((criterion) => ({
        criterionId: toIdString(criterion._id),
        criterionName: criterion.name,
        type: criterion.type || null,
        expressionDomain: formatIssueSnapshotDomain(criterion.expressionDomain),
      })),
      singleLeafAutoWeights:
        leafNames.length === 1
          ? {
              [leafNames[0]]: resolvedWeights?.[leafNames[0]],
            }
          : null,
      resolvedWeights,
      manualWeights: null,
      bwm: null,
      bwmData: null,
      docMeta: weightDoc
        ? {
            completed: weightDoc.completed,
            consensusPhase: weightDoc.consensusPhase,
            updatedAt: weightDoc.updatedAt,
          }
        : null,
    },
  };
};
