export const updateScenarioParameterValues = (current, key, value) => ({
  ...(current || {}),
  [key]: value,
});
