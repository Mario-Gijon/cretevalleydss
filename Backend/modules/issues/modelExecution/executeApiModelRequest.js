import axios from "axios";
import {
  createModelApiRequestError,
  unwrapModelApiResponse,
} from "../../../services/modelApi/modelResponse.js";

export const executeDecisionModelRequest = async ({
  apiEndpointPath,
  requestPayload,
  errorMessage = "Model execution failed",
  decisionModelsServiceBaseUrl =
    process.env.DECISION_MODELS_SERVICE_BASE_URL || "http://localhost:7000",
  httpClient = axios,
}) => {
  let response;
  try {
    response = await httpClient.post(
      `${decisionModelsServiceBaseUrl}${apiEndpointPath}`,
      requestPayload
    );
  } catch (error) {
    throw createModelApiRequestError(error, errorMessage);
  }

  return unwrapModelApiResponse(response, errorMessage);
};
