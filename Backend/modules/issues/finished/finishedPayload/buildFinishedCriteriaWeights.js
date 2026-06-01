import { IssueStageResult } from "../../../../models/IssueStageResults.js";
import {
  EVALUATION_STAGES,
} from "../../../decisionEngine/evaluations/evaluation.constants.js";
import { createInternalError } from "../../../../utils/common/errors.js";
import { toIdString } from "../../../../utils/common/ids.js";
import { isPlainObject } from "../../../../utils/common/objects.js";
import { normalizeConsensusPhaseOrThrow } from "./finishedPayloadValidation.js";
import { getEvaluationStructureOrThrow } from "../../../decisionEngine/evaluations/evaluation.registry.js";

export const resolveCriteriaWeightingPhase = async ({ issueId }) => {
  const latestCriteriaWeightingResult = await IssueStageResult.findOne({
    issue: issueId,
    stage: EVALUATION_STAGES.CRITERIA_WEIGHTING,
  })
    .sort({ consensusPhase: -1 })
    .lean();

  if (!latestCriteriaWeightingResult) {
    return null;
  }

  return normalizeConsensusPhaseOrThrow({
    value: latestCriteriaWeightingResult.consensusPhase,
    issueId,
    stage: EVALUATION_STAGES.CRITERIA_WEIGHTING,
  });
};

export const resolveFinalCriteriaWeightsFromStageResultOrNull = async ({
  issue,
  orderedLeafCriteria,
}) => {
  const stageResult = await IssueStageResult.findOne({
    issue: issue._id,
    stage: EVALUATION_STAGES.CRITERIA_WEIGHTING,
  })
    .sort({ consensusPhase: -1 })
    .lean();

  if (!stageResult) {
    return null;
  }

  const sourceWeightsByCriterion = isPlainObject(stageResult?.weightsByCriterion)
    ? stageResult.weightsByCriterion
    : isPlainObject(stageResult?.collectiveEvaluations?.weightsByCriterion)
      ? stageResult.collectiveEvaluations.weightsByCriterion
      : null;

  if (!isPlainObject(sourceWeightsByCriterion)) {
    return null;
  }

  const weights = orderedLeafCriteria.map((criterion) => {
    const criterionName = criterion.name;
    const rawWeight = sourceWeightsByCriterion[criterionName];
    const weight = Number(rawWeight);

    if (!Number.isFinite(weight)) {
      throw createInternalError(
        `Criteria weighting stage result has invalid weight for criterion '${criterionName}'`,
        {
          field: "collectiveEvaluations.weightsByCriterion",
          details: {
            issueId: toIdString(issue?._id),
            criterionName,
          },
        }
      );
    }

    return {
      criterionId: toIdString(criterion._id),
      criterionName,
      weight,
    };
  });

  const weightsByCriterion = weights.reduce((accumulator, entry) => {
    accumulator[entry.criterionName] = entry.weight;
    return accumulator;
  }, {});

  return {
    source: "criteriaWeightingStageResult",
    weightsByCriterion,
    weights,
  };
};

export const resolveFinalCriteriaWeightsFromModelParamsOrThrow = ({
  issue,
  orderedLeafCriteria,
  modelUsesWeights,
}) => {
  const leafCount = orderedLeafCriteria.length;
  const sourceWeights = Array.isArray(issue?.modelParameters?.weights)
    ? issue.modelParameters.weights
    : null;

  if (!sourceWeights) {
    if (leafCount === 1) {
      const criterion = orderedLeafCriteria[0];
      const weights = [
        {
          criterionId: toIdString(criterion._id),
          criterionName: criterion.name,
          weight: 1,
        },
      ];

      return {
        source: "modelParameters",
        weightsByCriterion: {
          [criterion.name]: 1,
        },
        weights,
      };
    }

    if (modelUsesWeights) {
      throw createInternalError("Finished issue is missing final criteria weights", {
        field: "modelParameters.weights",
        details: {
          issueId: toIdString(issue?._id),
          criteriaCount: leafCount,
        },
      });
    }

    return {
      source: "modelParameters",
      weightsByCriterion: {},
      weights: [],
    };
  }

  if (sourceWeights.length < leafCount) {
    throw createInternalError("Finished issue modelParameters.weights is incomplete", {
      field: "modelParameters.weights",
      details: {
        issueId: toIdString(issue?._id),
        expectedCount: leafCount,
        receivedCount: sourceWeights.length,
      },
    });
  }

  const weights = orderedLeafCriteria.map((criterion, index) => {
    const weight = Number(sourceWeights[index]);
    if (!Number.isFinite(weight)) {
      throw createInternalError("Finished issue modelParameters.weights is invalid", {
        field: `modelParameters.weights[${index}]`,
        details: {
          issueId: toIdString(issue?._id),
          criterionName: criterion.name,
        },
      });
    }

    return {
      criterionId: toIdString(criterion._id),
      criterionName: criterion.name,
      weight,
    };
  });

  const weightsByCriterion = weights.reduce((accumulator, entry) => {
    accumulator[entry.criterionName] = entry.weight;
    return accumulator;
  }, {});

  return {
    source: "modelParameters",
    weightsByCriterion,
    weights,
  };
};

export const resolveFinalCriteriaWeightsOrThrow = async ({
  issue,
  orderedLeafCriteria,
  modelUsesWeights,
}) => {
  const fromStageResult = await resolveFinalCriteriaWeightsFromStageResultOrNull({
    issue,
    orderedLeafCriteria,
  });

  if (fromStageResult) {
    return fromStageResult;
  }

  return resolveFinalCriteriaWeightsFromModelParamsOrThrow({
    issue,
    orderedLeafCriteria,
    modelUsesWeights,
  });
};

export const resolveExpertWeightingRequired = ({
  issue,
  participations,
  criteriaWeightingEvaluationsByExpertId,
}) => {
  if (!issue?.criteriaWeightingStructureKey) {
    return false;
  }

  if (
    criteriaWeightingEvaluationsByExpertId &&
    criteriaWeightingEvaluationsByExpertId.size > 0
  ) {
    return true;
  }

  return Array.isArray(participations)
    ? participations.some((participation) => participation?.weightsCompleted === true)
    : false;
};

const extractWeightsByCriterionFromDisplayPayload = ({ payload, criterionNames }) => {
  const sourceWeightsByCriterion = payload?.weightsByCriterion;
  if (!isPlainObject(sourceWeightsByCriterion)) {
    return null;
  }

  const normalizedWeightsByCriterion = {};
  for (const criterionName of criterionNames) {
    const numericValue = Number(sourceWeightsByCriterion[criterionName]);
    if (!Number.isFinite(numericValue)) {
      return null;
    }
    normalizedWeightsByCriterion[criterionName] = numericValue;
  }

  return normalizedWeightsByCriterion;
};

export const buildCriteriaWeightsEvaluationByExpert = async ({
  issue,
  participations,
  criteriaWeightingEvaluationsByExpertId,
  criterionNames,
}) => {
  const isRequired = resolveExpertWeightingRequired({
    issue,
    participations,
    criteriaWeightingEvaluationsByExpertId,
  });
  const criteriaWeightingStructure = isRequired
    ? getEvaluationStructureOrThrow(issue?.criteriaWeightingStructureKey)
    : null;

  if (isRequired && typeof criteriaWeightingStructure?.get !== "function") {
    throw createInternalError(
      "Criteria weighting structure must implement get({ storedEvaluation, issue })",
      {
        field: "criteriaWeightingStructureKey",
        details: {
          issueId: toIdString(issue?._id),
          criteriaWeightingStructureKey: issue?.criteriaWeightingStructureKey || null,
        },
      }
    );
  }

  const mapByExpertEmail = {};

  for (const participation of participations) {
    const expertId = toIdString(participation?.expert?._id || participation?.expert);
    const expertEmailRaw = participation?.expert?.email;
    const expertEmail =
      typeof expertEmailRaw === "string" && expertEmailRaw.trim()
        ? expertEmailRaw.trim()
        : `expert_${expertId || "unknown"}`;

    if (!isRequired) {
      mapByExpertEmail[expertEmail] = {
        status: "notRequired",
        structureKey: issue.criteriaWeightingStructureKey || null,
        payload: null,
        weightsByCriterion: null,
      };
      continue;
    }

    const evaluation = criteriaWeightingEvaluationsByExpertId.get(expertId);

    if (!evaluation) {
      mapByExpertEmail[expertEmail] = {
        status: "notSubmitted",
        structureKey: issue.criteriaWeightingStructureKey || null,
        payload: null,
        weightsByCriterion: null,
      };
      continue;
    }

    const status = evaluation.completed === true ? "submitted" : "draft";
    const displayPayload = await criteriaWeightingStructure.get({
      storedEvaluation: evaluation,
      issue,
    });
    const payload = isPlainObject(displayPayload) ? displayPayload : {};
    const weightsByCriterion = extractWeightsByCriterionFromDisplayPayload({
      payload: displayPayload,
      criterionNames,
    });

    mapByExpertEmail[expertEmail] = {
      status,
      structureKey: issue.criteriaWeightingStructureKey || null,
      payload,
      weightsByCriterion,
    };
  }

  return mapByExpertEmail;
};
