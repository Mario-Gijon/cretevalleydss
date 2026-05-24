import { numberGlobalParameterStructure } from "./structures/numberGlobal";
import { selectGlobalParameterStructure } from "./structures/selectGlobal";
import { intervalGlobalParameterStructure } from "./structures/intervalGlobal";

const STRUCTURES = [
  numberGlobalParameterStructure,
  selectGlobalParameterStructure,
  intervalGlobalParameterStructure,
];

export const PARAMETER_STRUCTURE_REGISTRY = Object.freeze(
  STRUCTURES.reduce((accumulator, structure) => {
    accumulator[structure.key] = structure;
    return accumulator;
  }, {})
);

export const resolveParameterStructureKey = (parameter) => {
  if (typeof parameter?.parameterStructureKey !== "string") {
    return null;
  }

  const normalized = parameter.parameterStructureKey.trim();
  return normalized.length > 0 ? normalized : null;
};

export const resolveParameterStructure = (parameter) => {
  const structureKey = resolveParameterStructureKey(parameter);

  if (!structureKey) {
    const parameterKey = parameter?.key || "unknown";
    throw new Error(
      `[modelParameters] Missing parameter.parameterStructureKey for parameter "${parameterKey}".`
    );
  }

  const structure = PARAMETER_STRUCTURE_REGISTRY[structureKey];
  if (!structure) {
    const parameterKey = parameter?.key || "unknown";
    throw new Error(
      `[modelParameters] Unsupported parameter structure "${structureKey}" for parameter "${parameterKey}".`
    );
  }

  return structure;
};
