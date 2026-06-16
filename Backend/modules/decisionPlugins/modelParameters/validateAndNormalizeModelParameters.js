import { createBadRequestError } from "../../../utils/common/errors.js";
import {
  extractLeafCriteriaMetadata,
} from "./criteriaMetadata.js";
import {
  getValueType,
  isMissingParameterValue,
  normalizeNonEmptyString,
  resolveParameterKey,
} from "./parameterValues.js";
import {
  throwInvalidModelParametersError,
  throwUnknownModelParametersError,
} from "./modelParameterErrors.js";
import {
  MODEL_PARAMETER_STRUCTURE_REGISTRY,
  resolveParameterStructureKey,
} from "./parameterStructureRegistry.js";
import { hasOwnKey } from "../../../utils/common/objects.js";

export const validateAndNormalizeModelParametersOrThrow = ({
  model,
  paramValues,
  criteriaNodes,
  alternativesCount = null,
  selectedExperts = null,
}) => {
  const modelName = normalizeNonEmptyString(model?.name) || "unknown";
  const modelParameters = Array.isArray(model?.parameters) ? model.parameters : [];
  const leafCriteria = extractLeafCriteriaMetadata(criteriaNodes);
  const leafCriteriaCount = leafCriteria.length;
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
    const parameterStructureKey = normalizeNonEmptyString(
      parameter?.parameterStructureKey
    );

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

    if (!parameterStructureKey) {
      addError({
        parameter: parameterKey,
        message: "manifest parameter is missing required 'parameterStructureKey'",
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
    const hasProvidedValue = hasOwnKey(rawParamValues, parameterKey);

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

    const parameterStructureKey = resolveParameterStructureKey(parameter);
    if (!parameterStructureKey) {
      addError({
        parameter: parameterKey,
        message: "cannot resolve parameterStructureKey from parameter manifest",
        value,
      });
      continue;
    }

    const handler = MODEL_PARAMETER_STRUCTURE_REGISTRY.get(parameterStructureKey);
    if (!handler) {
      addError({
        parameter: parameterKey,
        message: `uses unsupported parameter structure '${parameterStructureKey}'`,
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
        leafCriteria,
        alternativesCount: resolvedAlternativesCount,
        selectedExperts: Array.isArray(selectedExperts) ? selectedExperts : [],
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
