import { IssueModel } from "../../../models/IssueModels.js";
import { createBadRequestError, createNotFoundError } from "../../../utils/common/errors.js";
import { toIdString } from "../../../utils/common/ids.js";
import { EVALUATION_STAGES } from "../../decisionPlugins/evaluations/evaluationStages.js";
import { validateCriteriaWeightingModelRuntimeConfigOrThrow } from "../creation/initialCriteriaWeights/validateCriteriaWeightModelRuntime.js";
import { buildCriteriaWeightingRequestPayload } from "../modelExecution/buildCriteriaWeightingRequestPayload.js";
import { loadIssueEvaluationContext } from "./loadIssueEvaluationContext.js";
import { buildDecisionContext } from "./buildDecisionContext.js";
import {
  AHP_DIAGNOSTIC_API_MODEL_KEY,
  AHP_DIAGNOSTIC_STRUCTURE_KEY,
  assertAHPDiagnosticResultOrThrow,
  assertDiagnosticCriteriaMatchOrThrow,
  assertAHPDiagnosticModelOrThrow,
} from "../criteriaWeightingDiagnostics/ahpDiagnosticContract.js";
import { resolveAuthenticatedDiagnosticActorOrThrow } from "../criteriaWeightingDiagnostics/resolveAuthenticatedActor.js";
import { requestDecisionModelsServiceDiagnostic } from "../../../services/modelApi/decisionModelsServiceDiagnosticsClient.js";

const loadConfiguredCriteriaWeightingModelOrThrow = async ({ issue }) => {
  const modelId = toIdString(issue?.criteriaWeightingModel);
  if (!modelId) {
    throw createBadRequestError(
      "The Issue does not have a configured criteria-weighting model",
      {
        code: "AHP_DIAGNOSTIC_NOT_SUPPORTED",
        field: "criteriaWeightingModel",
      }
    );
  }

  const model = await IssueModel.findById(modelId).lean();
  if (!model) {
    throw createNotFoundError(
      "The Issue criteria-weighting model is no longer available",
      {
        code: "AHP_DIAGNOSTIC_NOT_SUPPORTED",
        field: "criteriaWeightingModel",
      }
    );
  }
  return model;
};

export const diagnoseIssueCriteriaWeighting = async ({
  issueId,
  userId,
  payload,
  decisionModelsServiceBaseUrl,
  timeoutMs,
  httpClient,
}) => {
  const { issue, structure } = await loadIssueEvaluationContext({
    issueId,
    userId,
    stage: EVALUATION_STAGES.CRITERIA_WEIGHTING,
  });

  if (structure.key !== AHP_DIAGNOSTIC_STRUCTURE_KEY) {
    throw createBadRequestError(
      "AHP consistency diagnostics require the criteriaPairwiseAHP evaluation structure",
      {
        code: "AHP_DIAGNOSTIC_NOT_SUPPORTED",
        field: "criteriaWeightsStructureKey",
      }
    );
  }

  const model = await loadConfiguredCriteriaWeightingModelOrThrow({ issue });
  const runtime = validateCriteriaWeightingModelRuntimeConfigOrThrow(model);
  if (
    issue.criteriaWeightingApiModelKey !== model.apiModelKey ||
    issue.criteriaWeightsStructureKey !== runtime.criteriaWeightsStructureKey ||
    runtime.criteriaWeightsStructureKey !== AHP_DIAGNOSTIC_STRUCTURE_KEY ||
    model.apiModelKey !== AHP_DIAGNOSTIC_API_MODEL_KEY
  ) {
    throw createBadRequestError(
      "The Issue criteria-weighting metadata is incompatible with AHP diagnostics",
      {
        code: "AHP_DIAGNOSTIC_NOT_SUPPORTED",
        field: "criteriaWeightingModel",
      }
    );
  }

  assertAHPDiagnosticModelOrThrow({
    model,
    structureKey: structure.key,
    mode: "expert",
  });

  const decisionContext = await buildDecisionContext({
    issue,
    structure,
    stage: EVALUATION_STAGES.CRITERIA_WEIGHTING,
    consensusPhase: issue.consensusPhase,
  });
  const normalizedPayload = await structure.save({
    mode: "submit",
    payload,
    decisionContext,
  });
  const expert = await resolveAuthenticatedDiagnosticActorOrThrow({
    userId,
    fallbackName: "Expert",
  });
  const requestPayload = await buildCriteriaWeightingRequestPayload({
    issue,
    structureKey: structure.key,
    evaluations: [
      {
        expert: { _id: expert.id, name: expert.name },
        payload: normalizedPayload,
      },
    ],
    phase: issue.consensusPhase,
  });

  const upstreamDiagnostic = await requestDecisionModelsServiceDiagnostic({
    apiModelKey: model.apiModelKey,
    requestPayload,
    decisionModelsServiceBaseUrl,
    timeoutMs,
    httpClient,
  });
  const diagnostic = assertAHPDiagnosticResultOrThrow(upstreamDiagnostic);

  return assertDiagnosticCriteriaMatchOrThrow({
    diagnostic,
    criteria: requestPayload.context.criteria,
  });
};
