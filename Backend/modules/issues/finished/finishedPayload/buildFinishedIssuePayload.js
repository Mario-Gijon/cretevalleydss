import { loadFinishedIssueData } from "./loaders/loadFinishedIssueData.js";
import { serializeAlternatives } from "./serializers/serializeAlternatives.js";
import { serializeConfiguration } from "./serializers/serializeConfiguration.js";
import { serializeConsensus } from "./serializers/serializeConsensus.js";
import {
  serializeCriteria,
  serializeFinalWeights,
} from "./serializers/serializeCriteria.js";
import { serializeEvaluations } from "./serializers/serializeEvaluations.js";
import { serializeExecutionMetadata } from "./serializers/serializeExecutionMetadata.js";
import { serializeExpressionDomains } from "./serializers/serializeExpressionDomains.js";
import { serializeIssue, serializeLifecycle } from "./serializers/serializeIssue.js";
import { serializeModels } from "./serializers/serializeModels.js";
import { serializeParticipants } from "./serializers/serializeParticipants.js";
import { serializeParticipantHistory } from "./serializers/serializeParticipantHistory.js";
import { serializePhaseResults } from "./serializers/serializePhaseResults.js";
import { serializeScenarios } from "./serializers/serializeScenarios.js";
import {
  isFinishedIssue,
  validateFinishedEvidenceOrThrow,
  validateFinishedIssueOrThrow,
} from "./validation/validateFinishedIssuePayload.js";

export const supportsFinishedIssuePayload = (issue) => {
  if (!isFinishedIssue(issue)) return false;

  try {
    validateFinishedIssueOrThrow({ issue });
    return true;
  } catch {
    return false;
  }
};

export const buildFinishedIssuePayload = async ({ issue }) => {
  validateFinishedIssueOrThrow({ issue });

  const loaded = await loadFinishedIssueData({ issue });
  validateFinishedEvidenceOrThrow(loaded);

  const alternatives = serializeAlternatives(loaded);
  const expressionDomains = serializeExpressionDomains(loaded);
  const criteria = serializeCriteria({
    criteria: loaded.criteria,
    expressionDomains: loaded.expressionDomains,
  });
  const finalWeights = serializeFinalWeights({
    issue,
    criteria,
    phaseResults: loaded.phaseResults,
  });
  criteria.finalWeights = finalWeights;
  const phaseResults = serializePhaseResults({
    phaseResults: loaded.phaseResults,
    alternatives,
  });
  const evaluations = await serializeEvaluations({
    issue,
    evaluations: loaded.evaluations,
    phaseResults,
    rawPhaseResults: loaded.phaseResults,
    alternatives,
    criteria,
    expressionDomains,
    participants: loaded.participations,
  });
  const models = serializeModels({
    issue,
    compatibleModels: loaded.compatibleModels,
    expressionDomains: loaded.expressionDomains,
    criteria,
  });

  return {
    issue: serializeIssue({ issue }),
    lifecycle: serializeLifecycle({ issue }),
    configuration: serializeConfiguration({
      issue,
      evaluations: loaded.evaluations,
      finalWeights,
      criteriaWeightingEffectiveParameters:
        models.criteriaWeighting?.effectiveParameters ?? null,
    }),
    alternatives,
    criteria,
    expressionDomains,
    participants: serializeParticipants(loaded),
    participantHistory: serializeParticipantHistory(loaded),
    evaluations,
    phaseResults,
    consensus: serializeConsensus({ issue, phaseResults }),
    models,
    scenarios: serializeScenarios(loaded),
    executionMetadata: serializeExecutionMetadata({ scenarios: loaded.scenarios }),
  };
};
