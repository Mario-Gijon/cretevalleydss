import { resolveParameterFieldEntry } from "../../decisionPlugins/modelParameters";

const equalValue = (left, right) => JSON.stringify(left) === JSON.stringify(right);

const contextWithValues = (context, values) => {
  const definitions = Array.isArray(context?.parameterDefinitions)
    ? context.parameterDefinitions
    : [];
  const parameterValuesByStructureKey = {};
  definitions.forEach((definition) => {
    const currentValue = Object.hasOwn(values, definition.key)
      ? values[definition.key]
      : definition.default;
    if (currentValue === undefined) return;
    parameterValuesByStructureKey[definition.parameterStructureKey] ||= [];
    parameterValuesByStructureKey[definition.parameterStructureKey].push({
      key: definition.key,
      value: currentValue,
    });
  });
  return { ...context, parameterValues: values, parameterValuesByStructureKey };
};

/**
 * Preview the effects of changing a parameter on fields that declare a
 * dependency on its structure. Plugins can describe destructive effects in
 * human terms; callers do not need to know another plugin's value shape.
 */
export const inspectModelParameterDependencyChange = ({
  changedParameter,
  nextValue,
  parameterContext,
}) => {
  const changedStructureKey = changedParameter?.parameterStructureKey;
  if (!changedStructureKey) return [];

  const previousValues = parameterContext?.parameterValues || {};
  const nextValues = { ...previousValues, [changedParameter.key]: nextValue };
  const previousContext = contextWithValues(parameterContext, previousValues);
  const nextContext = contextWithValues(parameterContext, nextValues);
  const definitions = Array.isArray(parameterContext?.parameterDefinitions)
    ? parameterContext.parameterDefinitions
    : [];
  const warnings = [];

  definitions.forEach((parameter) => {
    const entry = resolveParameterFieldEntry(parameter);
    if (
      !entry?.valueDependencyStructureKeys?.includes(changedStructureKey) ||
      typeof entry.reconcileDependencyChange !== "function"
    ) {
      return;
    }

    const value = Object.hasOwn(previousValues, parameter.key)
      ? previousValues[parameter.key]
      : parameter.default;
    if (value === undefined) return;
    const reconciledValue = entry.reconcileDependencyChange({
      parameter,
      value,
      previousContext,
      nextContext,
    });
    if (reconciledValue === undefined || equalValue(value, reconciledValue)) return;

    const description = entry.describeDependencyChange?.({
      parameter,
      value,
      reconciledValue,
      previousContext,
      nextContext,
    });
    const messages = Array.isArray(description)
      ? description
      : typeof description === "string" && description.trim()
        ? [description]
        : [`Changing this setting will update ${parameter.label || "dependent settings"}.`];
    messages.forEach((message) => {
      if (typeof message === "string" && message.trim()) warnings.push(message.trim());
    });
  });

  return [...new Set(warnings)];
};

export default inspectModelParameterDependencyChange;
