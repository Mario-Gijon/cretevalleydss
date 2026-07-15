const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);

export const validateFinishedIssuePayload = (payload) => {
  if (!isObject(payload)) return { valid: false, error: "Finished Issue response does not contain a valid contract." };
  const requiredObjects = ["issue", "lifecycle", "configuration", "consensus", "models"];
  const requiredArrays = ["alternatives", "expressionDomains", "participants", "phaseResults", "scenarios"];
  if (requiredObjects.some((key) => !isObject(payload[key])) || requiredArrays.some((key) => !Array.isArray(payload[key]))) {
    return { valid: false, error: "Finished Issue response is missing required contract fields." };
  }
  if (!isObject(payload.criteria) || !Array.isArray(payload.criteria.nodes) || !Array.isArray(payload.criteria.rootIds)) {
    return { valid: false, error: "Finished Issue response has invalid criteria data." };
  }
  if (!isObject(payload.evaluations) || !Array.isArray(payload.evaluations.individual) || !Array.isArray(payload.evaluations.collective) || !Array.isArray(payload.evaluations.contexts)) {
    return { valid: false, error: "Finished Issue response has invalid evaluation data." };
  }
  if (!Object.prototype.hasOwnProperty.call(payload, "executionMetadata")) {
    return { valid: false, error: "Finished Issue response is missing execution metadata." };
  }
  return { valid: true, error: null };
};

export default validateFinishedIssuePayload;
