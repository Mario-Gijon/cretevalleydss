import { MODEL_PARAMETER_HANDLER_REGISTRY } from "./modelParameter.adapters";

export const getParameterHandlerKey = (parameter) => {
  if (typeof parameter?.handlerKey !== "string") return null;
  const normalized = parameter.handlerKey.trim();
  return normalized || null;
};

export const getParameterExpectedLength = (parameter, leafCount) => {
  if (parameter?.scope === "perCriterion") return leafCount;
  const length = parameter?.restrictions?.length;
  return typeof length === "number" ? length : null;
};

export const resolveModelParameterAdapter = (parameter) => {
  const registryKey = getParameterHandlerKey(parameter);
  const handler = registryKey
    ? MODEL_PARAMETER_HANDLER_REGISTRY[registryKey] || null
    : null;
  const isSupported = Boolean(handler?.FieldComponent);

  return { handler, adapter: handler, registryKey, isSupported };
};

export const resolveModelParameterHandler = (parameter) => {
  const { handler, registryKey, isSupported } = resolveModelParameterAdapter(parameter);
  return { handler, registryKey, isSupported };
};
