import { createBadRequestError } from "../../../utils/common/errors.js";
import {
  countLeafCriteriaNodes,
  getValueType,
  isMissingParameterValue,
  normalizeNonEmptyString,
  resolveParameterKey,
} from "./modelParameter.shared.js";
import {
  throwInvalidModelParametersError,
  throwUnknownModelParametersError,
} from "./modelParameter.errors.js";
import {
  MODEL_PARAMETER_HANDLER_REGISTRY,
  resolveHandlerKey,
} from "./modelParameter.registry.js";

export const validateAndNormalizeModelParametersOrThrow = ({
  model,
  paramValues,
  criteriaNodes,
  alternativesCount = null,
}) => {
  const modelName = normalizeNonEmptyString(model?.name) || "unknown";
  const modelParameters = Array.isArray(model?.parameters) ? model.parameters : [];
  const leafCriteriaCount = countLeafCriteriaNodes(criteriaNodes);
  const resolvedAlternativesCount =
    Number.isInteger(alternativesCount) && alternativesCount >= 0
      ? alternativesCount
      : null;

  const rawParamValues =
    paramValues && typeof paramValues === "object" && !Array.isArray(paramValues)
      ? paramValues
      : null;

  if (!rawParamValues) {
    throw createBadRequestError("paramValues must be an object", {
      field: "paramValues",
    });
  }

  const parameterByKey = new Map();
  const parameterErrors = [];

  const addError = ({ parameter, message, value }) => {
    parameterErrors.push({
      parameter,
      message,
      receivedType: getValueType(value),
      receivedValue: value ?? null,
    });
  };

  for (const parameter of modelParameters) {
    const parameterKey = resolveParameterKey(parameter);
    const parameterType = normalizeNonEmptyString(parameter?.type);
    const parameterScope = normalizeNonEmptyString(parameter?.scope);
    const semanticRole = normalizeNonEmptyString(parameter?.semanticRole);

    if (!parameterKey) {
      addError({
        parameter: "<unknown>",
        message: "manifest parameter is missing required 'key'",
        value: parameter,
      });
      continue;
    }

    parameterByKey.set(parameterKey, parameter);

    if (!parameterType) {
      addError({
        parameter: parameterKey,
        message: "manifest parameter is missing required 'type'",
        value: parameter,
      });
      continue;
    }

    if (semanticRole !== "criteriaWeights" && !parameterScope) {
      addError({
        parameter: parameterKey,
        message: "manifest parameter is missing required 'scope'",
        value: parameter,
      });
      continue;
    }
  }

  const unknownParameters = Object.keys(rawParamValues).filter(
    (parameterKey) => !parameterByKey.has(parameterKey)
  );

  if (unknownParameters.length > 0) {
    throwUnknownModelParametersError({
      modelName,
      unknownParameters,
      allowedParameters: Array.from(parameterByKey.keys()),
    });
  }

  const normalizedModelParameters = {};

  for (const [parameterKey, parameter] of parameterByKey.entries()) {
    const isRequired = parameter?.required === true;
    const hasProvidedValue = Object.prototype.hasOwnProperty.call(
      rawParamValues,
      parameterKey
    );

    let value = hasProvidedValue ? rawParamValues[parameterKey] : undefined;

    if (isMissingParameterValue(value)) {
      if (parameter?.default !== undefined) {
        value = parameter.default;
      } else if (isRequired) {
        addError({ parameter: parameterKey, message: "is required", value });
      } else if (hasProvidedValue) {
        addError({ parameter: parameterKey, message: "cannot be empty", value });
      }

      if (isMissingParameterValue(value)) {
        continue;
      }
    }

    const handlerKey = resolveHandlerKey(parameter);
    if (!handlerKey) {
      addError({
        parameter: parameterKey,
        message: "cannot resolve handler key from parameter manifest",
        value,
      });
      continue;
    }

    const handler = MODEL_PARAMETER_HANDLER_REGISTRY.get(handlerKey);
    if (!handler) {
      addError({
        parameter: parameterKey,
        message: `uses unsupported parameter handler '${handlerKey}'`,
        value,
      });
      continue;
    }

    const result = handler({
      value,
      parameter,
      context: {
        modelName,
        leafCriteriaCount,
        alternativesCount: resolvedAlternativesCount,
      },
    });

    if (!result?.ok) {
      addError({
        parameter: parameterKey,
        message: result?.message || "is invalid",
        value: result?.value ?? value,
      });
      continue;
    }

    normalizedModelParameters[parameterKey] = result.value;
  }

  if (parameterErrors.length > 0) {
    throwInvalidModelParametersError({ modelName, parameterErrors });
  }

  return normalizedModelParameters;
};
