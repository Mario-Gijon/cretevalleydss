import { resolveModelParameterAdapter } from "./modelParameter.registry";
import { buildEqualWeights } from "./fields/criteriaWeights/criteriaWeights.defaults";

export { buildEqualWeights };

const buildUnsupportedParameterError = (parameter, registryKey, reason) => {
  if (!parameter?.key) {
    return new Error("[modelParameters] Missing parameter.key.");
  }
  const parameterName = parameter.key;
  return new Error(
    `[modelParameters] ${reason} for parameter "${parameterName}" (${registryKey}).`
  );
};

export const buildCreateIssueParameterDefaults = ({
  selectedModel,
  leafCriteria,
}) => {
  const defaults = {};
  const leafCount = Array.isArray(leafCriteria) ? leafCriteria.length : 0;

  (selectedModel?.parameters || []).forEach((parameter) => {
    const key = parameter?.key;
    if (!key) return;

    const { adapter, registryKey, isSupported } = resolveModelParameterAdapter(parameter);

    if (!isSupported || !adapter) {
      throw buildUnsupportedParameterError(
        parameter,
        registryKey,
        "Unsupported parameter adapter"
      );
    }

    if (typeof adapter.buildDefault === "function") {
      defaults[key] = adapter.buildDefault({ parameter, leafCount });
      return;
    }

    defaults[key] = parameter?.default;
  });

  return defaults;
};

export const updateCreateIssueParameterValues = ({
  previous,
  selectedModel,
  leafCriteria,
}) => {
  const next = { ...(previous || {}) };
  const leafCount = Array.isArray(leafCriteria) ? leafCriteria.length : 0;

  (selectedModel?.parameters || []).forEach((parameter) => {
    const key = parameter?.key;
    if (!key) return;

    const { adapter } = resolveModelParameterAdapter(parameter);
    if (!adapter?.updateValue) return;

    next[key] = adapter.updateValue({
      previousValue: next[key],
      parameter,
      leafCount,
    });
  });

  return next;
};
