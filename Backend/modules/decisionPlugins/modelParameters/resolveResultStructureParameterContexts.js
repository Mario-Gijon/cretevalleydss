import { createInternalError } from "../../../utils/common/errors.js";
import { hasOwnKey } from "../../../utils/common/objects.js";
import { getResultStructureOrThrow } from "../resultStructures/resultStructureRegistry.js";
import { MODEL_PARAMETER_STRUCTURE_REGISTRY } from "./parameterStructureRegistry.js";

const parameterStructureKeyOf = (parameter) =>
  typeof parameter?.parameterStructureKey === "string"
    ? parameter.parameterStructureKey.trim()
    : "";

/**
 * Resolve trusted result-validation context from a model's persisted parameter
 * definitions and normalized values, as declared by its result structure.
 */
export const resolveResultStructureParameterContextsOrThrow = ({
  resultStructureKey,
  resultStructureVersion,
  parameterDefinitions,
  parameterValues,
}) => {
  const resultStructure = getResultStructureOrThrow(
    resultStructureKey,
    resultStructureVersion
  );
  const requirements = resultStructure.modelParameterContexts ?? {};
  const definitions = Array.isArray(parameterDefinitions)
    ? parameterDefinitions
    : [];
  const values = parameterValues && typeof parameterValues === "object"
    ? parameterValues
    : {};
  const resolved = {};

  for (const [contextKey, parameterStructureKey] of Object.entries(requirements)) {
    const matchingParameters = definitions.filter(
      (parameter) => parameterStructureKeyOf(parameter) === parameterStructureKey
    );
    if (matchingParameters.length !== 1) {
      throw createInternalError(
        `Result structure '${resultStructureKey}@${resultStructureVersion}' requires exactly one model parameter using '${parameterStructureKey}'`,
        { field: `model.parameters.${parameterStructureKey}` }
      );
    }

    const parameter = matchingParameters[0];
    const parameterKey = typeof parameter.key === "string" ? parameter.key.trim() : "";
    if (!parameterKey || !hasOwnKey(values, parameterKey)) {
      throw createInternalError(
        `Required result context parameter '${parameterKey || parameterStructureKey}' is missing from persisted model parameters`,
        { field: `issue.modelParameters.${parameterKey || parameterStructureKey}` }
      );
    }

    const parameterStructure = MODEL_PARAMETER_STRUCTURE_REGISTRY.get(
      parameterStructureKey
    );
    if (!parameterStructure) {
      throw createInternalError(
        `Result structure context uses unsupported parameter structure '${parameterStructureKey}'`,
        { field: `model.parameters.${parameterKey}` }
      );
    }

    const normalized = parameterStructure.validateAndNormalize({
      value: values[parameterKey],
      parameter,
      context: {},
    });
    if (!normalized?.ok) {
      throw createInternalError(
        `Persisted model parameter '${parameterKey}' cannot provide valid result context: ${normalized?.message || "invalid value"}`,
        { field: `issue.modelParameters.${parameterKey}` }
      );
    }
    resolved[contextKey] = normalized.value;
  }

  return resolved;
};
