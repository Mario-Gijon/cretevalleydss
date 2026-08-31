export const resolveCriteria = ({ decisionContext }) => {
  if (
    decisionContext === null ||
    typeof decisionContext !== "object" ||
    Array.isArray(decisionContext)
  ) {
    throw new Error(
      "criteriaPreferenceOrder decisionContext must be an object."
    );
  }

  const criteria = Array.isArray(decisionContext.criteriaWeightingCriteria)
    ? decisionContext.criteriaWeightingCriteria
    : decisionContext.leafCriteria;
  if (!Array.isArray(criteria)) {
    throw new Error(
      "criteriaPreferenceOrder decisionContext criteria must be an array."
    );
  }

  const seenCriterionIds = new Set();

  return criteria.map((criterion, index) => {
    const criterionId =
      typeof criterion?.id === "string"
        ? criterion.id.trim()
        : "";

    if (!criterionId) {
      throw new Error(
        `criteriaPreferenceOrder criterion at index ${index} has an invalid id.`
      );
    }

    if (seenCriterionIds.has(criterionId)) {
      throw new Error(`criteriaPreferenceOrder criterion id "${criterionId}" is duplicated.`);
    }

    seenCriterionIds.add(criterionId);

    const criterionName =
      typeof criterion?.name === "string"
        ? criterion.name.trim()
        : "";

    return {
      id: criterionId,
      name: criterionName,
    };
  });
};
