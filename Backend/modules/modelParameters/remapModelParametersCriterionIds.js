import { createBadRequestError } from "../../utils/common/errors.js";
import { hasOwnKey, isPlainObject } from "../../utils/common/objects.js";
import { extractLeafCriteriaMetadata } from "./criteriaMetadata.js";
import { getValueType, resolveParameterKey } from "./parameterValues.js";
import { throwInvalidModelParametersError } from "./modelParameterErrors.js";
import {
  MODEL_PARAMETER_STRUCTURE_REGISTRY,
  resolveParameterStructureKey,
} from "../decisionPlugins/modelParameters/parameterStructureRegistry.js";
import { buildCriterionIdMapOrThrow } from "../decisionPlugins/modelParameters/criterionParameterRemapping.js";

/**
 * Only structures with remapCriterionIds opt in. Their remapped values are
 * validated again against the persisted leaf criteria before being stored.
 */
export const remapModelParametersCriterionIdsOrThrow = ({
  model,
  modelParameters,
  criterionIdMappings,
  persistedLeafCriteria,
  alternatives = [],
}) => {
  if (!isPlainObject(modelParameters)) {
    throw createBadRequestError("modelParameters must be an object", {
      field: "modelParameters",
    });
  }

  const remappedParameters = { ...modelParameters };
  let criterionIdMap = null;
  const parameters = Array.isArray(model?.parameters) ? model.parameters : [];
  const parameterErrors = [];
  const leafCriteria = extractLeafCriteriaMetadata(persistedLeafCriteria);
  const modelName = normalizeModelName(model?.name);

  for (const parameter of parameters) {
    const parameterKey = resolveParameterKey(parameter);
    if (!parameterKey || !hasOwnKey(remappedParameters, parameterKey)) continue;

    const structureKey = resolveParameterStructureKey(parameter);
    const structure = structureKey
      ? MODEL_PARAMETER_STRUCTURE_REGISTRY.get(structureKey)
      : null;
    if (typeof structure?.remapCriterionIds !== "function") continue;

    if (criterionIdMap === null) {
      criterionIdMap = buildCriterionIdMapOrThrow({ criterionIdMappings });
    }

    const remappedValue = structure.remapCriterionIds({
      value: remappedParameters[parameterKey],
      criterionIdMap,
      parameter,
    });
    const result = structure.validateAndNormalize({
      value: remappedValue,
      parameter,
      context: { modelName, leafCriteria, alternatives },
    });
    if (!result?.ok) {
      parameterErrors.push({
        parameter: parameterKey,
        message: result?.message || "is invalid after criterion id remapping",
        receivedType: getValueType(result?.value ?? remappedValue),
        receivedValue: result?.value ?? remappedValue,
      });
      continue;
    }

    remappedParameters[parameterKey] = result.value;
  }

  if (parameterErrors.length > 0) {
    throwInvalidModelParametersError({ modelName, parameterErrors });
  }

  return remappedParameters;
};

const normalizeModelName = (value) =>
  typeof value === "string" && value.trim() ? value.trim() : "unknown";
