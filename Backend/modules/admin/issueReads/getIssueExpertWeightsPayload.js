import { IssueEvaluation } from "../../../models/IssueEvaluations.js";
import { Participation } from "../../../models/Participations.js";
import { User } from "../../../models/Users.js";

import { getOrderedLeafCriteriaDb } from "../../issues/shared/ordering.js";

import { createNotFoundError } from "../../../utils/common/errors.js";
import { toIdString } from "../../../utils/common/ids.js";
import { isPlainObject } from "../../../utils/common/objects.js";
import {
  buildAdminExpertIdentityPayload,
  buildAdminExpertParticipationPayload,
  formatIssueSnapshotDomain,
  orderObjectByKeys,
} from "./adminIssueReadPayloads.js";
import {
  loadIssueForExpertWeightsOrThrow,
  validateIssueIdOrThrow,
  validateExpertIdOrThrow,
} from "./adminIssueReadLoaders.js";

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

  const manualWeights = weightDoc
    ? orderObjectByKeys(weightDoc.payload?.weightsByCriterion ?? {}, leafNames)
    : null;

  const weightBwmData = weightDoc?.payload || {};
  const bwm = {
    bestCriterion: weightBwmData?.bestCriterion,
    worstCriterion: weightBwmData?.worstCriterion,
    bestToOthers: orderObjectByKeys(weightBwmData?.bestToOthers ?? {}, leafNames),
    othersToWorst: orderObjectByKeys(weightBwmData?.othersToWorst ?? {}, leafNames),
  };

  let kind = "unknown";

  if (leafNames.length === 1) {
    kind = "singleLeaf";
  } else if (
    issue.criteriaWeightingStructureKey ===
    "manualCriteriaWeights"
  ) {
    kind = "manualCriteriaWeights";
  } else if (
    issue.criteriaWeightingStructureKey ===
    "bestWorstCriteria"
  ) {
    kind = "bestWorstCriteria";
  } else if (!issue.criteriaWeightingStructureKey) {
    kind = "notRequired";
  }

  const criteriaWeightsStatus = !issue.criteriaWeightingStructureKey
    ? "notRequired"
    : !weightDoc
      ? "notSubmitted"
      : weightDoc.completed === true
        ? "submitted"
        : "draft";

  const hasManualWeightsByCriterion = isPlainObject(
    weightDoc?.payload?.weightsByCriterion
  );

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
      structureLabel:
        kind === "manualCriteriaWeights"
          ? "Manual weights"
          : kind === "bestWorstCriteria"
            ? "Best-worst weights"
            : kind === "singleLeaf"
              ? "Single criterion weights"
              : kind === "notRequired"
                ? "Not required"
                : "Criteria weights",
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
      manualWeights: hasManualWeightsByCriterion ? manualWeights : null,
      bwm,
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
