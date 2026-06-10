export const resolveAssignedDomainIds = ({
  expressionDomainConfig,
  leafCriteria,
}) => {
  const mode = String(expressionDomainConfig?.mode || "").trim();
  const leafNames = (Array.isArray(leafCriteria) ? leafCriteria : [])
    .map((criterion) => String(criterion?.name || "").trim())
    .filter(Boolean);
  const domainIds = new Set();

  if (mode === "global") {
    const globalDomainId = String(expressionDomainConfig?.globalDomainId || "").trim();
    if (globalDomainId) {
      domainIds.add(globalDomainId);
    }
    return Array.from(domainIds);
  }

  if (mode !== "byCriterion") {
    return [];
  }

  const domainsByCriterion =
    expressionDomainConfig?.domainsByCriterion &&
    typeof expressionDomainConfig.domainsByCriterion === "object" &&
    !Array.isArray(expressionDomainConfig.domainsByCriterion)
      ? expressionDomainConfig.domainsByCriterion
      : {};

  for (const criterionName of leafNames) {
    const domainId = String(domainsByCriterion[criterionName] || "").trim();
    if (domainId) {
      domainIds.add(domainId);
    }
  }

  return Array.from(domainIds);
};
