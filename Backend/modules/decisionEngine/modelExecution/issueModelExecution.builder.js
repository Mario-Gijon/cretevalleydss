import { getOrderedAlternativeAndCriterionNames } from "../evaluations/structures/shared/alternativeEvaluation.helpers.js";
import { createInternalError } from "../../../utils/common/errors.js";
import { isPlainObject } from "../../../utils/common/objects.js";
import { normalizeNonEmptyString } from "../../../utils/common/strings.js";
import { normalizeModelExecutionResult } from "./normalizeModelExecutionResult.js";

const isFiniteOrNull = (value) =>
  value === null || (typeof value === "number" && Number.isFinite(value));

const normalizeModelParameters = (modelParameters) =>
  isPlainObject(modelParameters) ? modelParameters : {};

const normalizeEvaluationsPayload = (evaluations) =>
  evaluations.map((evaluation) => ({
    expert: {
      id: String(evaluation.expert._id),
      name: evaluation.expert.name,
      email: evaluation.expert.email,
    },
    payload: evaluation.payload,
  }));

export const buildIssueModelRequestPayload = async ({
  issue,
  structureKey,
  evaluations,
  phase,
}) => {
  const { alternatives, criteria } =
    await getOrderedAlternativeAndCriterionNames({ issue });

  return {
    modelParameters: normalizeModelParameters(issue.modelParameters),
    evaluations: normalizeEvaluationsPayload(evaluations),
    context: {
      issue: {
        id: String(issue._id),
        name: issue.name,
        consensusThreshold:
          typeof issue?.consensusThreshold === "number" &&
          Number.isFinite(issue.consensusThreshold)
            ? issue.consensusThreshold
            : null,
        consensusMaxPhases:
          Number.isInteger(issue?.consensusMaxPhases) && issue.consensusMaxPhases > 0
            ? issue.consensusMaxPhases
            : null,
      },
      alternatives: alternatives.map((alternative) => ({
        id: String(alternative._id),
        name: alternative.name,
      })),
      criteria: criteria.map((criterion) => ({
        id: String(criterion._id),
        name: criterion.name,
        type: criterion.type,
      })),
      weights: issue.modelParameters.weights ?? [],
      consensusPhase: phase,
      previousStageResult: null,
      structure: {
        key: structureKey,
        stage: "alternativeEvaluation",
      },
    },
  };
};

export const buildCriteriaWeightingRequestPayload = async ({
  issue,
  structureKey,
  evaluations,
  phase,
}) => {
  const { criteria } = await getOrderedAlternativeAndCriterionNames({ issue });

  return {
    modelParameters: normalizeModelParameters(issue.criteriaWeightingParameters),
    evaluations: normalizeEvaluationsPayload(evaluations),
    context: {
      issue: {
        id: String(issue._id),
        name: issue.name,
        consensusThreshold:
          typeof issue?.consensusThreshold === "number" &&
          Number.isFinite(issue.consensusThreshold)
            ? issue.consensusThreshold
            : null,
        consensusMaxPhases:
          Number.isInteger(issue?.consensusMaxPhases) && issue.consensusMaxPhases > 0
            ? issue.consensusMaxPhases
            : null,
      },
      criteria: criteria.map((criterion) => ({
        id: String(criterion._id),
        name: criterion.name,
        type: criterion.type,
      })),
      consensusPhase: phase,
      previousStageResult: null,
      structure: {
        key: structureKey,
        stage: "criteriaWeighting",
      },
    },
  };
};

export const buildIssueModelExecutionResult = ({
  issue,
  message,
  result,
  structureKey,
  issueUpdates,
  nextCurrentStage,
}) => {
  const normalizedResult = normalizeModelExecutionResult({ result });

  return {
    message,
    consensusMeasure: normalizedResult.consensusMeasure,
    rankedAlternatives: normalizedResult.rankedAlternatives,
    collectiveEvaluations: normalizedResult.collectiveEvaluations,
    plotsGraphic: normalizedResult.plotsGraphic,
    modelExecution: {
      kind: "apiModels",
      structureKey,
      apiModelKey: issue.apiModelKey,
      apiEndpointPath: issue.apiEndpoint.path,
      executedAt: new Date(),
    },
    rawOutput: normalizedResult.rawOutput,
    issueUpdates,
    nextCurrentStage,
  };
};

export const buildCriteriaWeightingExecutionResult = ({
  result,
  structureKey,
  message,
}) => {
  if (!isPlainObject(result)) {
    throw createInternalError("Criteria weighting execution result must be an object", {
      field: "result",
    });
  }

  const normalizedMessage = normalizeNonEmptyString(message ?? result.message);
  if (!normalizedMessage) {
    throw createInternalError("Criteria weighting execution message is required", {
      field: "message",
    });
  }

  if (!isPlainObject(result.weightsByCriterion)) {
    throw createInternalError(
      "Criteria weighting result.weightsByCriterion must be an object",
      {
        field: "result.weightsByCriterion",
      }
    );
  }

  if (!isPlainObject(result.collectiveEvaluations)) {
    throw createInternalError(
      "Criteria weighting result.collectiveEvaluations must be an object",
      {
        field: "result.collectiveEvaluations",
      }
    );
  }

  if (!isFiniteOrNull(result.consensusMeasure)) {
    throw createInternalError(
      "Criteria weighting result.consensusMeasure must be finite or null",
      {
        field: "result.consensusMeasure",
      }
    );
  }

  if (!isPlainObject(result.rawOutput)) {
    throw createInternalError(
      "Criteria weighting result.rawOutput must be an object",
      {
        field: "result.rawOutput",
      }
    );
  }

  if (!isPlainObject(result.modelExecution)) {
    throw createInternalError(
      "Criteria weighting result.modelExecution must be an object",
      {
        field: "result.modelExecution",
      }
    );
  }

  const normalizedExecutionKind = normalizeNonEmptyString(result.modelExecution.kind);
  if (!normalizedExecutionKind) {
    throw createInternalError(
      "Criteria weighting result.modelExecution.kind is required",
      {
        field: "result.modelExecution.kind",
      }
    );
  }

  if (normalizedExecutionKind === "apiModels") {
    const apiModelKey = normalizeNonEmptyString(result.modelExecution.apiModelKey);
    const apiEndpointPath = normalizeNonEmptyString(
      result.modelExecution.apiEndpointPath
    );

    if (!apiModelKey) {
      throw createInternalError(
        "Criteria weighting apiModels execution requires modelExecution.apiModelKey",
        {
          field: "result.modelExecution.apiModelKey",
        }
      );
    }

    if (!apiEndpointPath) {
      throw createInternalError(
        "Criteria weighting apiModels execution requires modelExecution.apiEndpointPath",
        {
          field: "result.modelExecution.apiEndpointPath",
        }
      );
    }
  }

  return {
    message: normalizedMessage,
    consensusMeasure: result.consensusMeasure ?? null,
    weightsByCriterion: result.weightsByCriterion,
    collectiveEvaluations: result.collectiveEvaluations,
    modelExecution: {
      ...result.modelExecution,
      kind: normalizedExecutionKind,
      structureKey,
      executedAt: result.modelExecution.executedAt || new Date(),
    },
    rawOutput: result.rawOutput,
  };
};
