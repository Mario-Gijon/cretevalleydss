import {
  createBadRequestError,
} from "../../../utils/common/errors.js";
import { toIdString } from "../../../utils/common/ids.js";
import { isPlainObject } from "../../../utils/common/objects.js";
import { validateAndNormalizeModelParametersOrThrow } from "../../decisionPlugins/modelParameters/index.js";
import {
  buildDefaultsResolved,
  mergeParamsResolved,
} from "../../decisionPlugins/modelParameters/resolveModelParameterValues.js";

const CRITERIA_WEIGHT_SUM_TOLERANCE = 0.001;

export const normalizeScenarioParamOverridesOrThrow = (paramOverrides) => {
  if (!isPlainObject(paramOverrides)) {
    throw createBadRequestError("paramOverrides must be an object", {
      field: "paramOverrides",
    });
  }

  return paramOverrides;
};

const getCriterionRowsOrThrow = ({ criteria }) => {
  const rows = Array.isArray(criteria)
    ? criteria.map((criterion, index) => {
        const criterionId = toIdString(criterion?._id ?? criterion?.id);
        const criterionName =
          typeof criterion?.name === "string" && criterion.name.trim()
            ? criterion.name.trim()
            : `Criterion ${index + 1}`;

        if (!criterionId) {
          throw createBadRequestError("Scenario criteria must include ids", {
            field: "criteria",
          });
        }

        return {
          id: criterionId,
          name: criterionName,
        };
      })
    : [];

  if (rows.length === 0) {
    throw createBadRequestError("Scenario criteria are required", {
      field: "criteria",
    });
  }

  return rows;
};

export const normalizeCrispWeightsOrThrow = ({ rawWeights, criteria }) => {
  if (!isPlainObject(rawWeights)) {
    throw createBadRequestError(
      "Scenario model parameters must include criteria weights as an id-keyed object",
      {
        field: "paramOverrides.weights",
      }
    );
  }

  const criterionRows = getCriterionRowsOrThrow({ criteria });
  const receivedKeys = Object.keys(rawWeights);

  if (receivedKeys.length !== criterionRows.length) {
    throw createBadRequestError(
      "Scenario model weights must match the number of leaf criteria",
      {
        field: "paramOverrides.weights",
        details: {
          expected: criterionRows.length,
          received: receivedKeys.length,
        },
      }
    );
  }

  const normalizedWeights = criterionRows.reduce((accumulator, criterion) => {
    if (!Object.prototype.hasOwnProperty.call(rawWeights, criterion.id)) {
      throw createBadRequestError(
        `Scenario model weights are missing '${criterion.name}'`,
        {
          field: `paramOverrides.weights.${criterion.id}`,
        }
      );
    }

    const value = rawWeights[criterion.id];
    if (typeof value !== "number" || !Number.isFinite(value)) {
      throw createBadRequestError(
        `Scenario weight for '${criterion.name}' must be a finite number`,
        {
          field: `paramOverrides.weights.${criterion.id}`,
        }
      );
    }

    if (value < 0 || value > 1) {
      throw createBadRequestError(
        `Scenario weight for '${criterion.name}' must be between 0 and 1`,
        {
          field: `paramOverrides.weights.${criterion.id}`,
        }
      );
    }

    accumulator[criterion.id] = value;
    return accumulator;
  }, {});

  const total = Object.values(normalizedWeights).reduce((sum, value) => sum + value, 0);
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

  const rawWeights = paramOverrides.weights;

  return normalizeCrispWeightsOrThrow({
    rawWeights,
    criteria,
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

  if (isPlainObject(resolvedWeights)) {
    normalizedScenarioParameters.weights = resolvedWeights;
  }

  return {
    paramsUsed: normalizedScenarioParameters,
    normalizedParams: normalizedScenarioParameters,
    weightsUsed: resolvedWeights,
  };
};
