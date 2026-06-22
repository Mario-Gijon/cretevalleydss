import { IssueStageResult } from "../../../../models/IssueStageResults.js";
import {
  EVALUATION_STAGES,
} from "../../../decisionPlugins/evaluations/evaluationStages.js";
import { createInternalError } from "../../../../utils/common/errors.js";
import { toIdString } from "../../../../utils/common/ids.js";
import { isPlainObject } from "../../../../utils/common/objects.js";
import { normalizeConsensusPhaseOrThrow } from "./finishedPayloadValidation.js";
import { getEvaluationStructureOrThrow } from "../../../decisionPlugins/evaluations/evaluationStructureRegistry.js";
import { buildEvaluationStructureContext } from "../../evaluations/index.js";

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

const normalizeCriteriaWeightValueOrThrow = ({
  value,
  field,
  issueId,
  criterionName,
}) => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (Array.isArray(value)) {
    const normalized = value.map((entry) => Number(entry));

    if (
      normalized.length === 0 ||
      normalized.some((entry) => !Number.isFinite(entry))
    ) {
      throw createInternalError("Finished issue criteria weight array is invalid", {
        field,
        details: { issueId, criterionName },
      });
    }

    return normalized;
  }

  throw createInternalError("Finished issue criteria weight is invalid", {
    field,
    details: { issueId, criterionName },
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

  if (!isPlainObject(stageResult.collectiveEvaluations)) {
    throw createInternalError(
      "Criteria weighting stage result collectiveEvaluations must be an object",
      {
        field: "collectiveEvaluations",
        details: {
          issueId: toIdString(issue._id),
          stageResultId: toIdString(stageResult._id) || null,
        },
      }
    );
  }

  const sourceWeightsByCriterion = stageResult.collectiveEvaluations.weightsByCriterion;

  if (!isPlainObject(sourceWeightsByCriterion)) {
    throw createInternalError(
      "Criteria weighting stage result weightsByCriterion must be an object",
      {
        field: "collectiveEvaluations.weightsByCriterion",
        details: {
          issueId: toIdString(issue._id),
          stageResultId: toIdString(stageResult._id) || null,
        },
      }
    );
  }

  const weights = orderedLeafCriteria.map((criterion) => {
    const criterionId = toIdString(criterion._id);
    const criterionName = criterion.name;
    const rawWeight = sourceWeightsByCriterion[criterionId];
    const weight = normalizeCriteriaWeightValueOrThrow({
      value: rawWeight,
      field: `collectiveEvaluations.weightsByCriterion.${criterionId}`,
      issueId: toIdString(issue._id),
      criterionName,
    });

    return {
      criterionId,
      criterionName,
      weight,
    };
  });

  const weightsByCriterion = weights.reduce((accumulator, entry) => {
    accumulator[entry.criterionId] = entry.weight;
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
  const modelParameters = issue.modelParameters;
  const sourceWeights = modelParameters.weights;

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
          [toIdString(criterion._id)]: 1,
        },
        weights,
      };
    }

    if (modelUsesWeights) {
      throw createInternalError("Finished issue is missing final criteria weights", {
        field: "modelParameters.weights",
        details: {
          issueId: toIdString(issue._id),
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

  if (!isPlainObject(sourceWeights)) {
    throw createInternalError("Finished issue modelParameters.weights is invalid", {
      field: "modelParameters.weights",
      details: {
        issueId: toIdString(issue._id),
        criteriaCount: leafCount,
      },
    });
  }

  const weights = orderedLeafCriteria.map((criterion) => {
    const criterionId = toIdString(criterion._id);
    if (!Object.prototype.hasOwnProperty.call(sourceWeights, criterionId)) {
      throw createInternalError("Finished issue modelParameters.weights is incomplete", {
        field: "modelParameters.weights",
        details: {
          issueId: toIdString(issue._id),
          criterionId,
        },
      });
    }

    const weight = normalizeCriteriaWeightValueOrThrow({
      value: sourceWeights[criterionId],
      field: `modelParameters.weights.${criterionId}`,
      issueId: toIdString(issue._id),
      criterionName: criterion.name,
    });

    return {
      criterionId,
      criterionName: criterion.name,
      weight,
    };
  });

  const weightsByCriterion = weights.reduce((accumulator, entry) => {
    accumulator[entry.criterionId] = entry.weight;
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
  if (!issue.criteriaWeightsStructureKey) {
    return false;
  }

  if (criteriaWeightingEvaluationsByExpertId.size > 0) {
    return true;
  }

  return participations.some(
    (participation) => participation.weightsCompleted === true
  );
};

const extractWeightsByCriterionFromDisplayPayload = ({ payload, orderedLeafCriteria }) => {
  const sourceWeightsByCriterion = payload.weightsByCriterion;
  if (!isPlainObject(sourceWeightsByCriterion)) {
    return null;
  }

  const normalizedWeightsByCriterion = {};
  for (const criterion of orderedLeafCriteria) {
    const criterionId = toIdString(criterion._id);
    const numericValue = Number(sourceWeightsByCriterion[criterionId]);
    if (!Number.isFinite(numericValue)) {
      return null;
    }
    normalizedWeightsByCriterion[criterionId] = numericValue;
  }

  return normalizedWeightsByCriterion;
};

export const buildCriteriaWeightsEvaluationByExpert = async ({
  issue,
  participations,
  criteriaWeightingEvaluationsByExpertId,
  orderedLeafCriteria,
}) => {
  const isRequired = resolveExpertWeightingRequired({
    issue,
    participations,
    criteriaWeightingEvaluationsByExpertId,
  });
  const criteriaWeightingStructure = isRequired
    ? getEvaluationStructureOrThrow(issue.criteriaWeightsStructureKey)
    : null;

  if (isRequired && typeof criteriaWeightingStructure.get !== "function") {
    throw createInternalError(
      "Criteria weighting structure must implement get({ payload, evaluationContext })",
      {
        field: "criteriaWeightsStructureKey",
        details: {
          issueId: toIdString(issue._id),
          criteriaWeightsStructureKey: issue.criteriaWeightsStructureKey,
        },
      }
    );
  }

  const mapByExpertEmail = {};
  const evaluationContext = isRequired
    ? await buildEvaluationStructureContext({
        issue,
        structure: criteriaWeightingStructure,
        stage: EVALUATION_STAGES.CRITERIA_WEIGHTING,
        leafCriteria: orderedLeafCriteria,
      })
    : null;

  for (const participation of participations) {
    const expert = participation.expert;
    const expertId = expert ? toIdString(expert._id) : null;
    const expertEmail =
      expert && typeof expert.email === "string" ? expert.email.trim() : "";

    if (!expertId) {
      throw createInternalError("Finished participation expert id is invalid", {
        field: "participations.expert",
        details: {
          issueId: toIdString(issue._id),
          participationId: toIdString(participation._id),
        },
      });
    }

    if (!expertEmail) {
      throw createInternalError("Finished participation expert email is invalid", {
        field: "participations.expert.email",
        details: {
          issueId: toIdString(issue._id),
          participationId: toIdString(participation._id),
        },
      });
    }

    if (!isRequired) {
      mapByExpertEmail[expertEmail] = {
        status: "notRequired",
        structureKey: issue.criteriaWeightsStructureKey,
        payload: null,
        weightsByCriterion: null,
      };
      continue;
    }

    const evaluation = criteriaWeightingEvaluationsByExpertId.get(expertId);

    if (!evaluation) {
      mapByExpertEmail[expertEmail] = {
        status: "notSubmitted",
        structureKey: issue.criteriaWeightsStructureKey,
        payload: null,
        weightsByCriterion: null,
      };
      continue;
    }

    const status = evaluation.completed === true ? "submitted" : "draft";
    const displayPayload = await criteriaWeightingStructure.get({
      payload: evaluation?.payload ?? {},
      evaluationContext,
    });
    if (!isPlainObject(displayPayload)) {
      throw createInternalError(
        "Criteria weighting structure display payload must be an object",
        {
          field: "payload",
          details: {
            issueId: toIdString(issue._id),
            evaluationId: toIdString(evaluation._id),
            criteriaWeightsStructureKey: issue.criteriaWeightsStructureKey,
          },
        }
      );
    }

    const payload = displayPayload;
    const weightsByCriterion = extractWeightsByCriterionFromDisplayPayload({
      payload,
      orderedLeafCriteria,
    });

    mapByExpertEmail[expertEmail] = {
      status,
      structureKey: issue.criteriaWeightsStructureKey,
      payload,
      weightsByCriterion,
    };
  }

  return mapByExpertEmail;
};
