import {
  API,
  buildNetworkErrorResponse,
  jsonRequest,
  normalizeApiResponse,
} from "./httpRequest.service.js";
import { authFetch } from "../utils/authFetch.js";

const isAbortError = (error) => error?.name === "AbortError";

const isEnvelope = (payload) =>
  payload !== null &&
  typeof payload === "object" &&
  !Array.isArray(payload) &&
  typeof payload.success === "boolean" &&
  typeof payload.message === "string" &&
  Object.hasOwn(payload, "data");

const readJson = async (response) => {
  try {
    return await response.json();
  } catch (error) {
    if (isAbortError(error)) throw error;
    return null;
  }
};

const requestAHPDiagnostic = async ({ path, payload, signal }) => {
  let response;
  try {
    response = await authFetch(
      `${API}${path}`,
      { ...jsonRequest("POST", payload), signal },
    );
  } catch (error) {
    if (isAbortError(error)) throw error;
    return buildNetworkErrorResponse("AHP consistency diagnostic is unavailable.");
  }

  const body = await readJson(response);
  if (!isEnvelope(body)) {
    return {
      success: false,
      message: "AHP consistency diagnostic returned an invalid response.",
      data: null,
      error: { code: "INVALID_RESPONSE", field: null, details: null },
      status: response?.status ?? 0,
    };
  }

  return normalizeApiResponse(
    body,
    response,
    "AHP consistency diagnostic is unavailable.",
  );
};

const isMongoObjectId = (value) => /^[a-f\d]{24}$/i.test(String(value || "").trim());

export const buildCreatorAHPDiagnosticRequest = ({
  criteriaWeightingModelId,
  criteriaWeightingModelKey,
  criteriaWeightingParameters,
  criteria,
  evaluation,
}) => {
  const modelId = String(criteriaWeightingModelId || "").trim();
  const modelKey = String(criteriaWeightingModelKey || "").trim();
  const modelReference = isMongoObjectId(modelId)
    ? { criteriaWeightingModelId: modelId }
    : modelKey
      ? { criteriaWeightingModelKey: modelKey }
      : null;

  if (!modelReference) return null;

  return {
    ...modelReference,
    criteriaWeightingParameters:
      criteriaWeightingParameters &&
      typeof criteriaWeightingParameters === "object" &&
      !Array.isArray(criteriaWeightingParameters)
        ? criteriaWeightingParameters
        : {},
    criteria: (Array.isArray(criteria) ? criteria : []).map((criterion) => ({
      id: String(criterion?.id ?? "").trim(),
      name: String(criterion?.name ?? "").trim(),
    })),
    payload: evaluation,
  };
};

export const diagnoseCreatorAHPConsistency = async ({ signal, ...input }) => {
  const payload = buildCreatorAHPDiagnosticRequest(input);
  if (!payload) {
    return {
      success: false,
      message: "The selected AHP model is unavailable for diagnostics.",
      data: null,
      error: { code: "MODEL_UNAVAILABLE", field: null, details: null },
      status: 0,
    };
  }
  return requestAHPDiagnostic({
    path: "/issues/criteria-weighting/diagnostics",
    payload,
    signal,
  });
};

export const diagnoseExpertAHPConsistency = ({
  issueId,
  evaluation,
  signal,
}) => {
  const normalizedIssueId = String(issueId ?? "").trim();
  if (!normalizedIssueId) {
    return Promise.resolve({
      success: false,
      message: "The active Issue is unavailable for diagnostics.",
      data: null,
      error: { code: "ISSUE_UNAVAILABLE", field: null, details: null },
      status: 0,
    });
  }
  return requestAHPDiagnostic({
    path: `/issues/${encodeURIComponent(normalizedIssueId)}/evaluations/criteriaWeighting/diagnostics`,
    payload: { payload: evaluation },
    signal,
  });
};
