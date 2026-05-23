/**
 * Resolves the active evaluation structure from finished issue DTO.
 *
 * @param {Object} viewIssue - Active finished issue view.
 * @returns {string|null} Evaluation structure key, or null if unresolvable.
 */
export const resolveFinishedIssueEvaluationStructure = (viewIssue) =>
  viewIssue?.summary?.alternativeEvaluationStructureKey ||
  viewIssue?.modelParams?.base?.alternativeEvaluationStructureKey ||
  null;
