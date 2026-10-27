import mongoose from "mongoose";

import { getEvaluationStructureOrThrow } from "../../../decisionPlugins/evaluations/index.js";
import {
  createBadRequestError,
  createUnauthorizedError,
} from "../../../../utils/common/errors.js";
import { isPlainObject } from "../../../../utils/common/objects.js";
import { normalizeNonEmptyString } from "../../../../utils/common/strings.js";
import { toIdString } from "../../../../utils/common/ids.js";
import { buildCreatorDecisionContext } from "./buildCreatorDecisionContext.js";
import {
  loadCriteriaWeightingApiModelContextOrThrow,
  normalizeCreatorApiCriteriaWeightingPayloadOrThrow,
} from "./runCriteriaWeightApiModel.js";
import {
  AHP_DIAGNOSTIC_STRUCTURE_KEY,
  assertAHPDiagnosticResultOrThrow,
  assertDiagnosticCriteriaMatchOrThrow,
  assertAHPDiagnosticModelOrThrow,
} from "../../criteriaWeightingDiagnostics/ahpDiagnosticContract.js";
import { resolveAuthenticatedDiagnosticActorOrThrow } from "../../criteriaWeightingDiagnostics/resolveAuthenticatedActor.js";
import { requestDecisionModelsServiceDiagnostic } from "../../../../services/modelApi/decisionModelsServiceDiagnosticsClient.js";

const MAX_AHP_CRITERIA = 15;
const ALLOWED_FIELDS = new Set([
  "criteriaWeightingModelId",
  "criteriaWeightingModelKey",
  "criteriaWeightingParameters",
  "criteria",
  "payload",
]);

const normalizeCreatorCriteriaOrThrow = (rawCriteria) => {
  if (!Array.isArray(rawCriteria) || rawCriteria.length === 0) {
    throw createBadRequestError("criteria must contain at least one criterion", {
      field: "criteria",
    });
  }
  if (rawCriteria.length > MAX_AHP_CRITERIA) {
    throw createBadRequestError(
      `AHP consistency diagnostics support at most ${MAX_AHP_CRITERIA} criteria`,
      { field: "criteria" }
    );
  }

  const seenIds = new Set();
  return rawCriteria.map((source, index) => {
    const id = typeof source?.id === "string" ? source.id.trim() : "";
    const name = typeof source?.name === "string" ? source.name.trim() : "";
    if (!isPlainObject(source) || !id || !name) {
      throw createBadRequestError(
        "Each criterion must have a non-empty provisional id and name",
        { field: `criteria[${index}]` }
      );
    }
    if (seenIds.has(id)) {
      throw createBadRequestError("Criterion ids must be unique", {
        field: `criteria[${index}].id`,
      });
    }
    seenIds.add(id);
    return { id, name };
  });
};

const resolveSelectedModelConfigOrThrow = (input) => {
  const modelId = normalizeNonEmptyString(input.criteriaWeightingModelId);
  const modelKey = normalizeNonEmptyString(input.criteriaWeightingModelKey);

  if (Boolean(modelId) === Boolean(modelKey)) {
    throw createBadRequestError(
      "Provide exactly one criteriaWeightingModelId or criteriaWeightingModelKey",
      { field: "criteriaWeightingModelId" }
    );
  }
  if (modelId && !mongoose.isValidObjectId(modelId)) {
    throw createBadRequestError("criteriaWeightingModelId is invalid", {
      field: "criteriaWeightingModelId",
    });
  }

  return {
    mode: "creatorApiModel",
    ...(modelId
      ? { criteriaWeightingModelId: modelId }
      : { criteriaWeightingModelKey: modelKey }),
  };
};

const validateInputObjectOrThrow = (input) => {
  if (!isPlainObject(input)) {
    throw createBadRequestError("Diagnostic request body must be an object", {
      field: "body",
    });
  }

  const unsupportedFields = Object.keys(input).filter(
    (field) => !ALLOWED_FIELDS.has(field)
  );
  if (unsupportedFields.length > 0) {
    throw createBadRequestError("Diagnostic request contains unsupported fields", {
      field: "body",
      details: { unsupportedFields },
    });
  }
};

export const diagnoseCreatorCriteriaWeighting = async ({
  userId,
  input,
  decisionModelsServiceBaseUrl,
  timeoutMs,
  httpClient,
}) => {
  const creatorId = toIdString(userId);
  if (!creatorId) {
    throw createUnauthorizedError("Authenticated creator identity is required", {
      field: "userId",
    });
  }

  validateInputObjectOrThrow(input);
  const criteria = normalizeCreatorCriteriaOrThrow(input.criteria);
  const resolvedConfig = resolveSelectedModelConfigOrThrow(input);
  const criteriaWeightingParameters =
    input.criteriaWeightingParameters === undefined
      ? {}
      : input.criteriaWeightingParameters;
  if (!isPlainObject(criteriaWeightingParameters)) {
    throw createBadRequestError(
      "criteriaWeightingParameters must be an object",
      { field: "criteriaWeightingParameters" }
    );
  }

  const apiModelContext = await loadCriteriaWeightingApiModelContextOrThrow({
    resolvedConfig,
    criteriaWeightingParameters,
    leafCriteria: criteria,
  });
  const {
    criteriaWeightingModel,
    criteriaWeightingRuntime,
    normalizedCriteriaWeightingParameters,
  } = apiModelContext;

  assertAHPDiagnosticModelOrThrow({
    model: criteriaWeightingModel,
    structureKey: criteriaWeightingRuntime.criteriaWeightsStructureKey,
    mode: "creator",
  });

  const structure = getEvaluationStructureOrThrow(
    AHP_DIAGNOSTIC_STRUCTURE_KEY
  );
  const creatorDecisionContext = buildCreatorDecisionContext({
    criteriaWeightingStructure: structure,
    criteriaWeightingModel,
    normalizedCriteriaWeightingParameters,
    leafCriteria: criteria,
  });
  const normalizedPayload =
    await normalizeCreatorApiCriteriaWeightingPayloadOrThrow({
      payload: input.payload,
      leafCriteria: criteria,
      criteriaWeightingModel,
      criteriaWeightingRuntime,
      criteriaWeightingParameters: normalizedCriteriaWeightingParameters,
      creatorDecisionContext,
    });
  const creator = await resolveAuthenticatedDiagnosticActorOrThrow({
    userId: creatorId,
    fallbackName: "Creator",
  });

  const requestPayload = {
    modelParameters: normalizedCriteriaWeightingParameters,
    evaluations: [
      {
        expert: creator,
        payload: normalizedPayload,
      },
    ],
    context: {
      issue: creatorDecisionContext.issue,
      criteria: criteria.map(({ id, name }) => ({ id, name })),
      consensusPhase: 0,
      previousStageResult: null,
      structure: {
        key: AHP_DIAGNOSTIC_STRUCTURE_KEY,
        stage: creatorDecisionContext.structure.stage,
      },
    },
  };

  const upstreamDiagnostic = await requestDecisionModelsServiceDiagnostic({
    apiModelKey: criteriaWeightingModel.apiModelKey,
    requestPayload,
    decisionModelsServiceBaseUrl,
    timeoutMs,
    httpClient,
  });
  const diagnostic = assertAHPDiagnosticResultOrThrow(upstreamDiagnostic);

  return assertDiagnosticCriteriaMatchOrThrow({
    diagnostic,
    criteria,
  });
};
