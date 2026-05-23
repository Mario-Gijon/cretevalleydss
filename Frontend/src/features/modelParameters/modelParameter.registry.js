import { MODEL_PARAMETER_STRUCTURE_REGISTRY } from "./modelParameter.adapters";

export const getParameterStructureKey = (parameter) => {
  if (typeof parameter?.parameterStructureKey !== "string") return null;
  const normalized = parameter.parameterStructureKey.trim();
  return normalized || null;
};

export const getParameterExpectedLength = (parameter, leafCount) => {
  if (parameter?.scope === "perCriterion") return leafCount;
  const length = parameter?.restrictions?.length;
  return typeof length === "number" ? length : null;
};

export const resolveModelParameterAdapter = (parameter) => {
  const registryKey = getParameterStructureKey(parameter);
  const handler = registryKey
    ? MODEL_PARAMETER_STRUCTURE_REGISTRY[registryKey] || null
    : null;
  const isSupported = Boolean(handler?.FieldComponent);

  return { handler, adapter: handler, registryKey, isSupported };
};

export const resolveModelParameterStructure = (parameter) => {
  const { handler, registryKey, isSupported } = resolveModelParameterAdapter(parameter);
  return { handler, registryKey, isSupported };
};
