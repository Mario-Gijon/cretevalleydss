import {
  createBadRequestError,
} from "../../../utils/common/errors.js";
import { isPlainObject } from "../../../utils/common/objects.js";
import { validateAndNormalizeModelParametersOrThrow } from "../../decisionEngine/modelParameters/index.js";
import {
  buildDefaultsResolved,
  mergeParamsResolved,
} from "../../decisionEngine/modelParameters/resolveModelParameterValues.js";

const CRITERIA_WEIGHT_SUM_TOLERANCE = 0.001;

export const normalizeScenarioParamOverridesOrThrow = (paramOverrides) => {
  if (!isPlainObject(paramOverrides)) {
    throw createBadRequestError("paramOverrides must be an object", {
      field: "paramOverrides",
    });
  }

  return paramOverrides;
};

export const normalizeCrispWeightsOrThrow = ({ rawWeights, criteriaCount }) => {
  if (!Array.isArray(rawWeights) || rawWeights.length === 0) {
    throw createBadRequestError(
      "Scenario model parameters must include criteria weights as an array",
      {
        field: "paramOverrides.weights",
      }
    );
  }

  if (rawWeights.length !== criteriaCount) {
    throw createBadRequestError(
      "Scenario model weights length must match the number of leaf criteria",
      {
        field: "paramOverrides.weights",
        details: {
          expected: criteriaCount,
          received: rawWeights.length,
        },
      }
    );
  }

  const normalizedWeights = rawWeights.map((value, index) => {
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) {
      throw createBadRequestError(
        `Scenario weight [${index}] must be a finite number`,
        {
          field: "paramOverrides.weights",
        }
      );
    }

    if (numericValue < 0 || numericValue > 1) {
      throw createBadRequestError(
        `Scenario weight [${index}] must be between 0 and 1`,
        {
          field: "paramOverrides.weights",
        }
      );
    }

    return numericValue;
  });

  const total = normalizedWeights.reduce((sum, value) => sum + value, 0);
  if (
    Math.abs(total - 1) >
    CRITERIA_WEIGHT_SUM_TOLERANCE + Number.EPSILON
  ) {
    throw createBadRequestError(
      "Scenario manual weights must sum to 1 (tolerance 0.001)",
      {
        field: "paramOverrides.weights",
      }
    );
  }

  return normalizedWeights;
};

export const resolveScenarioWeightsOrThrow = ({
  targetModel,
  paramOverrides,
  criteria,
}) => {
  if (targetModel.usesCriteriaWeights !== true) {
    return null;
  }

  const criteriaCount = criteria.length;
  const rawWeights = paramOverrides.weights;

  return normalizeCrispWeightsOrThrow({
    rawWeights,
    criteriaCount,
  });
};

export const buildScenarioParametersOrThrow = ({
  targetModel,
  paramOverrides,
  criteria,
  alternatives,
}) => {
  const normalizedOverrides = normalizeScenarioParamOverridesOrThrow(paramOverrides);
  const rawScenarioParams = { ...normalizedOverrides };
  delete rawScenarioParams.weights;

  const normalizedScenarioParameters =
    validateAndNormalizeModelParametersOrThrow({
      model: targetModel,
      paramValues: rawScenarioParams,
      criteriaNodes: criteria,
      alternativesCount: alternatives.length,
    });

  const resolvedWeights = resolveScenarioWeightsOrThrow({
    targetModel,
    paramOverrides: normalizedOverrides,
    criteria,
  });

  if (Array.isArray(resolvedWeights)) {
    normalizedScenarioParameters.weights = resolvedWeights;
  }

  return {
    paramsUsed: normalizedScenarioParameters,
    normalizedParams: normalizedScenarioParameters,
    weightsUsed: Array.isArray(resolvedWeights) ? resolvedWeights : [],
  };
};
