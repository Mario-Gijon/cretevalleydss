import axios from "axios";
import {
  createModelApiRequestError,
  unwrapModelApiResponse,
} from "../../../services/modelApi/modelResponse.js";

const DEFAULT_APIMODELS_BASE_URL =
  process.env.DECISION_MODELS_SERVICE_BASE_URL || "http://localhost:7000";

export const executeApiModelRequest = async ({
  apiEndpointPath,
  requestPayload,
  errorMessage = "Model execution failed",
  apiModelsBaseUrl = DEFAULT_APIMODELS_BASE_URL,
  httpClient = axios,
}) => {
  let response;
  try {
    response = await httpClient.post(
      `${apiModelsBaseUrl}${apiEndpointPath}`,
      requestPayload
    );
  } catch (error) {
    throw createModelApiRequestError(error, errorMessage);
  }

  return unwrapModelApiResponse(response, errorMessage);
};
