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

  if (!Array.isArray(decisionContext.leafCriteria)) {
    throw new Error(
      "criteriaPreferenceOrder decisionContext.leafCriteria must be an array."
    );
  }

  const seenCriterionIds = new Set();

  return decisionContext.leafCriteria.map((criterion, index) => {
    const criterionId =
      typeof criterion?.id === "string"
        ? criterion.id.trim()
        : "";

    if (!criterionId) {
      throw new Error(
        `criteriaPreferenceOrder leaf criterion at index ${index} has an invalid id.`
      );
    }

    if (seenCriterionIds.has(criterionId)) {
      throw new Error(
        `criteriaPreferenceOrder leaf criterion id "${criterionId}" is duplicated.`
      );
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