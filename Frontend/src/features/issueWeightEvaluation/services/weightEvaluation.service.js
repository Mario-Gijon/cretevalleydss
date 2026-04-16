import {
  getManualWeights,
  saveManualWeights,
  sendManualWeights,
  getBwmWeights,
  saveBwmWeights,
  sendBwmWeights,
} from "../../../services/issue.service.js";

/**
 * Obtiene el borrador manual de pesos del issue.
 *
 * @param {*} issueOrId
 * @returns {Promise<object|false>}
 */
export const getManualWeightDraft = async (issueOrId) => {
  return getManualWeights(issueOrId);
};

/**
 * Guarda el borrador manual de pesos del issue.
 *
 * @param {*} issueOrId
 * @param {object} manualWeights
 * @returns {Promise<object|false>}
 */
export const saveManualWeightDraft = async (issueOrId, manualWeights) => {
  return saveManualWeights(issueOrId, manualWeights);
};

/**
 * Envía los pesos manuales del issue.
 *
 * @param {*} issueOrId
 * @param {object} manualWeights
 * @returns {Promise<object|false>}
 */
export const submitManualWeights = async (issueOrId, manualWeights) => {
  return sendManualWeights(issueOrId, manualWeights);
};

/**
 * Obtiene el borrador BWM de pesos del issue.
 *
 * @param {*} issueOrId
 * @returns {Promise<object|false>}
 */
export const getBwmWeightDraft = async (issueOrId) => {
  return getBwmWeights(issueOrId);
};

/**
 * Guarda el borrador BWM de pesos del issue.
 *
 * @param {*} issueOrId
 * @param {object} bwmData
 * @returns {Promise<object|false>}
 */
export const saveBwmWeightDraft = async (issueOrId, bwmData) => {
  return saveBwmWeights(issueOrId, bwmData);
};

/**
 * Envía los pesos BWM del issue.
 *
 * @param {*} issueOrId
 * @param {object} bwmData
 * @returns {Promise<object|false>}
 */
export const submitBwmWeights = async (issueOrId, bwmData) => {
  return sendBwmWeights(issueOrId, bwmData);
};