import axios from "axios";

import {
  createModelApiRequestError,
  unwrapModelApiResponse,
} from "./modelResponse.js";
import { AppError } from "../../utils/common/errors.js";

const ANALYSIS_RESULTS_PATH = "/analysis/results";

const joinUrl = (baseUrl, path) => {
  const cleanBaseUrl = String(baseUrl || "").trim().replace(/\/+$/, "");
  const cleanPath = String(path || "").trim().replace(/^\/+/, "");

  return `${cleanBaseUrl}/${cleanPath}`;
};

/**
 * Ejecuta el análisis de resultados en ApiModels.
 *
 * @param {object} params Parámetros de entrada.
 * @param {Object} params.analysisContext Contexto completo de análisis.
 * @param {Object} [params.httpClient=axios] Cliente HTTP compatible con axios.
 * @param {string} [params.apiModelsBaseUrl=process.env.ORIGIN_APIMODELS] Base URL de ApiModels.
 * @returns {Promise<Object>} ResultsAnalysis devuelto por ApiModels.
 */
export const requestResultsAnalysis = async ({
  analysisContext,
  httpClient = axios,
  apiModelsBaseUrl = process.env.ORIGIN_APIMODELS,
}) => {
  const baseUrl = String(apiModelsBaseUrl || "").trim();

  if (!baseUrl) {
    throw new AppError("ORIGIN_APIMODELS is not configured", {
      statusCode: 500,
      code: "MODEL_ANALYSIS_CONFIG_ERROR",
      field: "ORIGIN_APIMODELS",
    });
  }

  let response;

  try {
    response = await httpClient.post(
      joinUrl(baseUrl, ANALYSIS_RESULTS_PATH),
      analysisContext,
      {
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    throw createModelApiRequestError(error, "Results analysis request failed");
  }

  return unwrapModelApiResponse(response, "Results analysis failed");
};
