import { createInternalError } from "../../../utils/common/errors.js";
import { isPlainObject } from "../../../utils/common/objects.js";
import { normalizeNonEmptyString } from "../../../utils/common/strings.js";

const isFiniteOrNull = (value) =>
  value === null || (typeof value === "number" && Number.isFinite(value));

export const buildCriteriaWeightingExecutionResult = ({
  result,
  structureKey,
  message,
  apiModelKey,
  apiEndpointPath,
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

  const normalizedStructureKey = normalizeNonEmptyString(structureKey);
  if (!normalizedStructureKey) {
    throw createInternalError(
      "Criteria weighting structureKey is required",
      {
        field: "structureKey",
      }
    );
  }

  const normalizedApiModelKey = normalizeNonEmptyString(apiModelKey);
  if (!normalizedApiModelKey) {
    throw createInternalError(
      "Criteria weighting apiModelKey is required",
      {
        field: "apiModelKey",
      }
    );
  }

  const normalizedApiEndpointPath = normalizeNonEmptyString(apiEndpointPath);
  if (!normalizedApiEndpointPath) {
    throw createInternalError(
      "Criteria weighting apiEndpointPath is required",
      {
        field: "apiEndpointPath",
      }
    );
  }

  return {
    message: normalizedMessage,
    consensusMeasure: result.consensusMeasure ?? null,
    weightsByCriterion: result.weightsByCriterion,
    collectiveEvaluations: result.collectiveEvaluations,
    modelExecution: {
      kind: "decisionModelsService",
      structureKey: normalizedStructureKey,
      apiModelKey: normalizedApiModelKey,
      apiEndpointPath: normalizedApiEndpointPath,
      executedAt: new Date(),
    },
    rawOutput: result.rawOutput,
  };
};
