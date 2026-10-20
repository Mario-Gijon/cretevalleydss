import { validateParameterValue } from "../../decisionPlugins/modelParameters";

export const validateModelParameterValues = ({
  parameters,
  values,
  parameterContext,
}) => {
  const errors = {};
  (Array.isArray(parameters) ? parameters : []).forEach((parameter) => {
    const key = typeof parameter?.key === "string" ? parameter.key : "";
    if (!key) return;
    const error = validateParameterValue(
      parameter,
      values && Object.hasOwn(values, key) ? values[key] : parameter.default,
      parameterContext
    );
    if (typeof error === "string" && error.trim()) errors[key] = error;
  });
  return errors;
};
