import { resolveParameterFieldEntry } from "../../decisionPlugins/modelParameters";

export const reconcileModelParameterDependencyChange = ({
  changedParameter,
  parameters,
  nextValues,
  previousContext,
  nextContext,
}) => {
  const changedStructureKey = changedParameter?.parameterStructureKey;
  if (typeof changedStructureKey !== "string" || !changedStructureKey.trim()) {
    return nextValues;
  }

  let reconciledValues = nextValues;
  (Array.isArray(parameters) ? parameters : []).forEach((parameter) => {
    const entry = resolveParameterFieldEntry(parameter);
    if (
      !entry?.valueDependencyStructureKeys?.includes(changedStructureKey) ||
      typeof entry.reconcileDependencyChange !== "function"
    ) {
      return;
    }

    const nextValue = entry.reconcileDependencyChange({
      parameter,
      value: reconciledValues[parameter.key],
      previousContext,
      nextContext,
    });
    if (nextValue !== undefined) {
      if (reconciledValues === nextValues) reconciledValues = { ...nextValues };
      reconciledValues[parameter.key] = nextValue;
    }
  });

  return reconciledValues;
};
