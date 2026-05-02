/**
 * Resolves the active evaluation structure from finished issue DTO.
 *
 * The evaluation structure is canonical at viewIssue.summary.evaluationStructure.
 * This location is maintained by applyScenarioToIssueInfo() during scenario loads.
 *
 * @param {Object} viewIssue - Active finished issue view.
 * @returns {string|null} Evaluation structure key, or null if unresolvable.
 */
export const resolveFinishedIssueEvaluationStructure = (viewIssue) =>
  viewIssue?.summary?.evaluationStructure || null;
