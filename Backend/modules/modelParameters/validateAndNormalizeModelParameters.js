import { createBadRequestError } from "../../utils/common/errors.js";
import {
  extractLeafCriteriaMetadata,
} from "./criteriaMetadata.js";
import {
  getValueType,
  isMissingParameterValue,
  resolveParameterKey,
} from "./parameterValues.js";
import { normalizeNonEmptyString } from "../../utils/common/strings.js";
import {
  throwInvalidModelParametersError,
  throwUnknownModelParametersError,
} from "./modelParameterErrors.js";
import {
  MODEL_PARAMETER_STRUCTURE_REGISTRY,
  resolveParameterStructureKey,
} from "../decisionPlugins/modelParameters/parameterStructureRegistry.js";
import { hasOwnKey } from "../../utils/common/objects.js";

export const validateAndNormalizeModelParametersOrThrow = ({
  model,
  paramValues,
  criteriaNodes,
  alternatives = [],
  criterionDomainsById = {},
}) => {
  const modelName = normalizeNonEmptyString(model?.name) || "unknown";
  const modelParameters = Array.isArray(model?.parameters) ? model.parameters : [];
  const leafCriteria = extractLeafCriteriaMetadata(criteriaNodes);

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

    const structure = MODEL_PARAMETER_STRUCTURE_REGISTRY.get(parameterStructureKey);
    if (!structure) {
      addError({
        parameter: parameterKey,
        message: `uses unsupported parameter structure '${parameterStructureKey}'`,
        value,
      });
      continue;
    }

    const result = structure.validateAndNormalize({
      value,
      parameter,
      context: {
        modelName,
        leafCriteria,
        alternatives,
        criterionDomainsById,
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

  for (const parameter of modelParameters) {
    const parameterKey = resolveParameterKey(parameter);
    if (!parameterKey || !hasOwnKey(normalizedModelParameters, parameterKey)) continue;

    const structureKey = resolveParameterStructureKey(parameter);
    const structure = structureKey
      ? MODEL_PARAMETER_STRUCTURE_REGISTRY.get(structureKey)
      : null;
    if (typeof structure?.validateWithParameters !== "function") continue;

    const dependencies = {};
    let dependencyError = null;
    for (const dependency of structure.parameterDependencies || []) {
      const matches = modelParameters.filter(
        (candidate) =>
          resolveParameterStructureKey(candidate) ===
          dependency.parameterStructureKey
      );
      if (matches.length !== 1) {
        dependencyError = `requires exactly one configured '${dependency.parameterStructureKey}' parameter`;
        break;
      }

      const dependencyKey = resolveParameterKey(matches[0]);
      if (
        !dependencyKey ||
        !hasOwnKey(normalizedModelParameters, dependencyKey)
      ) {
        dependencyError = `requires a value for '${dependency.parameterStructureKey}'`;
        break;
      }
      dependencies[dependency.key] = normalizedModelParameters[dependencyKey];
    }

    if (dependencyError) {
      addError({
        parameter: parameterKey,
        message: dependencyError,
        value: normalizedModelParameters[parameterKey],
      });
      continue;
    }

    const result = structure.validateWithParameters({
      value: normalizedModelParameters[parameterKey],
      parameter,
      context: {
        modelName,
        leafCriteria,
        alternatives,
        criterionDomainsById,
      },
      dependencies,
    });
    if (!result?.ok) {
      addError({
        parameter: parameterKey,
        message: result?.message || "is invalid in the configured parameter context",
        value: result?.value ?? normalizedModelParameters[parameterKey],
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
