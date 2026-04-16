import {
  getEvaluations,
  saveEvaluations,
  submitEvaluations,
} from "../../../services/issue.service.js";

/**
 * Obtiene el borrador de evaluación de alternativas del issue.
 *
 * @param {*} issueOrId
 * @returns {Promise<object|false>}
 */
export const getAlternativeEvaluationDraft = async (issueOrId) => {
  return getEvaluations(issueOrId);
};

/**
 * Guarda el borrador de evaluación de alternativas del issue.
 *
 * @param {*} issueOrId
 * @param {object} evaluations
 * @returns {Promise<object|false>}
 */
export const saveAlternativeEvaluationDraft = async (issueOrId, evaluations) => {
  return saveEvaluations(issueOrId, evaluations);
};

/**
 * Envía la evaluación de alternativas del issue.
 *
 * @param {object} issue
 * @param {object} evaluations
 * @returns {Promise<object|false>}
 */
export const submitAlternativeEvaluations = async (issue, evaluations) => {
  return submitEvaluations(issue, evaluations);
};