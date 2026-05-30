import { createInternalError } from "../../../../utils/common/errors.js";
import { toIdString } from "../../../../utils/common/ids.js";
import { buildParticipationsSummary, buildSummarySection } from "./buildFinishedSummary.js";
import { resolveFinalCriteriaWeightsOrThrow } from "./buildFinishedCriteriaWeights.js";
import { buildAvailableModelsPayload } from "./buildFinishedScenarioModels.js";
import { buildModelParamsPayloadOrThrow } from "./buildFinishedModelParams.js";

export const requireFinishedIssueModelOrThrow = ({ issue }) => {
  const populatedModel = issue?.model;

  const isPopulatedModelObject =
    populatedModel &&
    typeof populatedModel === "object" &&
    populatedModel !== null &&
    !Array.isArray(populatedModel);
  const hasRequiredFields =
    isPopulatedModelObject &&
    populatedModel._id !== undefined &&
    typeof populatedModel.name === "string" &&
    populatedModel.name.trim() &&
    populatedModel.parameters !== undefined &&
    typeof populatedModel.usesCriteriaWeights === "boolean";

  if (!hasRequiredFields) {
    throw createInternalError("Finished issue model must be populated", {
      field: "model",
      details: {
        issueId: toIdString(issue?._id),
      },
    });
  }

  return populatedModel;
};

export const validateFinishedAlternativesAndLeafCriteriaOrThrow = ({
  issue,
  alternatives,
  orderedLeafCriteria,
}) => {
  if (alternatives.length === 0) {
    throw createInternalError("Finished issue alternatives are required", {
      field: "alternatives",
      details: {
        issueId: toIdString(issue?._id),
      },
    });
  }

  if (orderedLeafCriteria.length === 0) {
    throw createInternalError("Finished issue leaf criteria are required", {
      field: "criteria",
      details: {
        issueId: toIdString(issue?._id),
      },
    });
  }
};

export const buildCriteriaWeightingEvaluationsByExpertId = ({
  criteriaWeightingEvaluations,
}) => {
  return new Map(
    criteriaWeightingEvaluations.map((evaluation) => [
      toIdString(evaluation?.expert?._id || evaluation?.expert),
      evaluation,
    ])
  );
};

export const buildFinishedPayloadContextOrThrow = async ({
  issue,
  alternatives,
  orderedLeafCriteria,
  criteria,
  participations,
  criteriaWeightingEvaluations,
  allModels,
  issueDomainSnapshots,
  completedEvaluationsForExpertsSummary,
}) => {
  validateFinishedAlternativesAndLeafCriteriaOrThrow({
    issue,
    alternatives,
    orderedLeafCriteria,
  });

  const acceptedParticipations = participations.filter(
    (participation) => participation.invitationStatus === "accepted"
  );

  const model = requireFinishedIssueModelOrThrow({ issue });
  const finalCriteriaWeights = await resolveFinalCriteriaWeightsOrThrow({
    issue,
    orderedLeafCriteria,
    modelUsesWeights: model?.usesCriteriaWeights === true,
  });

  const leafCount = orderedLeafCriteria.length;
  const criterionNames = orderedLeafCriteria.map((criterion) => criterion.name);
  const criteriaWeightingEvaluationsByExpertId =
    buildCriteriaWeightingEvaluationsByExpertId({
      criteriaWeightingEvaluations,
    });

  const experts = buildParticipationsSummary({
    participations,
    completedEvaluations: completedEvaluationsForExpertsSummary,
  });

  const availableModels = buildAvailableModelsPayload({
    issue,
    allModels,
    issueAlternativeEvaluationStructureKey:
      issue.alternativeEvaluationStructureKey,
    issueDomainSnapshots,
    leafCount,
  });

  const modelParams = buildModelParamsPayloadOrThrow({
    issue,
    model,
    orderedLeafCriteria,
    availableModels,
    domainType: null,
  });

  return {
    acceptedParticipations,
    model,
    finalCriteriaWeights,
    leafCount,
    criterionNames,
    criteriaWeightingEvaluationsByExpertId,
    experts,
    availableModels,
    modelParams,
    alternatives,
    orderedLeafCriteria,
    criteria,
    participations,
  };
};

export const buildFinishedSummaryFromContext = ({
  issue,
  context,
  consensusInfo,
}) => {
  return buildSummarySection({
    issue,
    model: context.model,
    criteria: context.criteria,
    orderedLeafCriteria: context.orderedLeafCriteria,
    alternatives: context.alternatives,
    experts: context.experts,
    consensusInfo,
  });
};
