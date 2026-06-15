import { createInternalError } from "../../../utils/common/errors.js";
import { isPlainObject } from "../../../utils/common/objects.js";
import { normalizeNonEmptyString } from "../../../utils/common/strings.js";

const isFiniteOrNull = (value) =>
  value === null || (typeof value === "number" && Number.isFinite(value));

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
