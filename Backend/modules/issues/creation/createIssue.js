import { Issue } from "../../../models/Issues.js";
import { normalizeCreateIssueInput } from "./normalizeCreateIssueInput.js";
import { loadCreateIssueActorsAndModel } from "./loadCreateIssueData.js";
import {
  resolveExpressionDomainConfigByLeafCriteriaOrThrow,
  loadAccessibleExpressionDomains,
} from "../../expressionDomains/resolveIssueDomainAssignments.js";
import { createIssueParticipationsAndNotifications } from "./createIssueParticipants.js";
import {
  createCriteriaRecursively,
  createIssueAlternatives,
} from "./createIssueDocuments.js";
import {
  EVALUATION_STAGES,
  getEvaluationStructureOrThrow,
} from "../../decisionPlugins/evaluations/index.js";
import {
  resolveIssueConsensusConfigOrThrow,
  resolveIssueSimulationConfigOrThrow,
} from "./resolveIssueCreationOptions.js";
import {
  remapCriteriaWeightIdsToMongoCriteriaOrThrow,
  resolveDeferredCriteriaWeightingAfterPersistenceOrThrow,
  resolveCriteriaWeightingConfigOrThrow,
  resolveFuzzyCriteriaWeightValueCountOrThrow,
} from "./initialCriteriaWeights/index.js";
import {
  createBadRequestError,
  createConflictError,
} from "../../../utils/common/errors.js";
import axios from "axios";
import {
  buildIssueCreationDocument,
} from "./buildIssueDocument.js";
import { applyInitialCriteriaWeightsToIssue } from "./initialCriteriaWeights/applyInitialCriteriaWeights.js";
import {
  assignIssueExpressionDomainSnapshotsOrThrow,
} from "../../expressionDomains/assignIssueDomainSnapshots.js";
import { getOrderedLeafCriterionNamesFromInputOrThrow } from "./getOrderedLeafCriterionNamesFromInput.js";
import {
  validateAndNormalizeExpertWeightsOrThrow,
} from "../shared/expertWeights.js";
import {
  createIssueEventOperationMetadata,
  ISSUE_EVENT_TYPES,
  snapshotIssueLifecycle,
  writeCriteriaWeightsChanged,
  writeConsensusEvent,
  writeIssueEvent,
} from "../events/index.js";
import { writeIssueStateSnapshot } from "../stateSnapshots/issueStateSnapshot.js";

const assertIssueNameAvailableOrThrow = async ({
  issueName,
  session = null,
}) => {
  const existingIssue = await Issue.findOne({ name: issueName }).session(session);

  if (existingIssue) {
    throw createConflictError("Issue name already exists", {
      field: "issueName",
    });
  }
};

export const prepareIssueCreation = async ({
  issueInfo,
  ownerUserId,
  decisionModelsServiceBaseUrl =
    process.env.DECISION_MODELS_SERVICE_BASE_URL || "http://localhost:7000",
  httpClient = axios,
}) => {
  const input = normalizeCreateIssueInput(issueInfo);

  await assertIssueNameAvailableOrThrow({
    issueName: input.issueName,
  });

  const {
    model,
    owner,
    ownerEmail,
    expertByEmail,
    apiModelKey,
    apiEndpoint,
    evaluationStructureKey,
    supportsConsensus: modelSupportsConsensus,
    supportsConsensusSimulation: modelSupportsConsensusSimulation,
    usesCriteriaWeights,
    usesExpertWeights,
    isMultiCriteria,
    normalizedModelParameters,
  } = await loadCreateIssueActorsAndModel({
    ownerUserId,
    selectedModelId: input.selectedModelId,
    paramValues: input.paramValues,
    criteriaNodes: input.criteria,
    alternatives: input.normalizedAlternatives.map((alternative) => ({
      id: null,
      name: alternative.name,
    })),
    uniqueExpertEmails: input.uniqueExpertEmails,
  });

  const alternativeEvaluationStructure = getEvaluationStructureOrThrow(
    evaluationStructureKey
  );

  if (alternativeEvaluationStructure.stage !== EVALUATION_STAGES.ALTERNATIVE_EVALUATION) {
    throw createBadRequestError(
      `Evaluation structure '${alternativeEvaluationStructure.key}' does not support stage '${EVALUATION_STAGES.ALTERNATIVE_EVALUATION}'`,
      {
        code: "EVALUATION_STRUCTURE_STAGE_MISMATCH",
        field: "evaluationStructureKey",
      }
    );
  }

  const {
    isConsensus,
    consensusThreshold,
    consensusMaxPhases,
  } = resolveIssueConsensusConfigOrThrow({
    requestedIsConsensus: input.isConsensus,
    supportsConsensus: modelSupportsConsensus,
    consensusThreshold: input.consensusThreshold,
    consensusMaxPhases: input.consensusMaxPhases,
  });
  const simulateConsensus = resolveIssueSimulationConfigOrThrow({
    simulateConsensus: input.simulateConsensus,
    isConsensus,
    supportsConsensus: modelSupportsConsensus,
    supportsConsensusSimulation: modelSupportsConsensusSimulation,
  });

  const { criterionNames, isSingleLeafCriterion, orderedLeafCriteria } =
    getOrderedLeafCriterionNamesFromInputOrThrow(input.criteria);

  if (!isMultiCriteria && criterionNames.length > 1) {
    throw createBadRequestError(
      "Selected model does not support multiple criteria",
      {
        field: "criteria",
      }
    );
  }

  const { usedDomainIds, domainIdByCriterionName } =
    resolveExpressionDomainConfigByLeafCriteriaOrThrow({
      expressionDomainConfig: input.expressionDomainConfig,
      leafCriteria: orderedLeafCriteria,
    });

  const domainDocs = await loadAccessibleExpressionDomains({
    domainIdList: usedDomainIds,
    userId: ownerUserId,
    modelSupportedExpressionDomains: model.supportedExpressionDomains,
  });

  const fuzzyCriteriaWeightValueCount = resolveFuzzyCriteriaWeightValueCountOrThrow({
    model,
    domainDocs,
  });

  const resolvedCriteriaWeighting =
    await resolveCriteriaWeightingConfigOrThrow({
      criteriaWeightingConfig: input.criteriaWeightingConfig,
      criteriaWeightingParameters: input.criteriaWeightingParameters,
      criterionNames,
      leafCriteria: orderedLeafCriteria,
      isSingleLeafCriterion,
      model,
      fuzzyValueCount: fuzzyCriteriaWeightValueCount,
      decisionModelsServiceBaseUrl,
      httpClient,
    });
  const normalizedExpertWeightsByEmail =
    validateAndNormalizeExpertWeightsOrThrow({
      model,
      expertEmails: input.uniqueExpertEmails,
      expertWeightsByEmail: input.expertWeightsByEmail,
    });

  return {
    input,
    ownerUserId,
    model,
    owner,
    ownerEmail,
    expertByEmail,
    apiModelKey,
    apiEndpoint,
    evaluationStructureKey,
    modelSupportsConsensus,
    simulateConsensus,
    isConsensus,
    consensusThreshold,
    consensusMaxPhases,
    usesCriteriaWeights,
    usesExpertWeights,
    normalizedModelParameters,
    domainDocs,
    domainIdByCriterionName,
    orderedLeafCriteria,
    resolvedCriteriaWeighting,
    normalizedExpertWeightsByEmail,
    decisionModelsServiceBaseUrl,
    httpClient,
  };
};

export const persistPreparedIssueCreation = async ({
  preparedIssueCreation,
  correlationId = null,
  occurredAt = null,
  session,
}) => {
  const {
    input,
    ownerUserId,
    model,
    owner,
    ownerEmail,
    expertByEmail,
    apiModelKey,
    apiEndpoint,
    evaluationStructureKey,
    modelSupportsConsensus,
    simulateConsensus,
    isConsensus,
    consensusThreshold,
    consensusMaxPhases,
    usesCriteriaWeights,
    usesExpertWeights,
    normalizedModelParameters,
    domainDocs,
    domainIdByCriterionName,
    orderedLeafCriteria,
    resolvedCriteriaWeighting,
    normalizedExpertWeightsByEmail,
    decisionModelsServiceBaseUrl,
    httpClient,
  } = preparedIssueCreation;
  const eventMetadata =
    correlationId && occurredAt
      ? { correlationId, occurredAt }
      : createIssueEventOperationMetadata();

  await assertIssueNameAvailableOrThrow({
    issueName: input.issueName,
    session,
  });

  const issue = buildIssueCreationDocument({
    ownerUserId,
    model,
    apiModelKey,
    apiEndpoint,
    evaluationStructureKey,
    supportsConsensus: modelSupportsConsensus,
    simulateConsensus,
    isConsensus,
    issueName: input.issueName,
    issueDescription: input.issueDescription,
    closureDate: input.closureDate,
    usesCriteriaWeights,
    consensusMaxPhases,
    consensusThreshold,
    normalizedModelParameters,
  });

  await issue.save({ session });

  await createIssueAlternatives({
    issueId: issue._id,
    normalizedAlternatives: input.normalizedAlternatives,
    session,
  });

  const leafCriteria = [];
  await createCriteriaRecursively({
    issueId: issue._id,
    nodes: input.criteria,
    leafCriteria,
    session,
  });

  await assignIssueExpressionDomainSnapshotsOrThrow({
    issueId: issue._id,
    domainDocs,
    leafCriteria,
    domainIdByCriterionName,
    session,
  });

  const remappedCriteriaWeighting = remapCriteriaWeightIdsToMongoCriteriaOrThrow({
    resolvedCriteriaWeighting,
    sourceLeafCriteria: orderedLeafCriteria,
    persistedLeafCriteria: leafCriteria,
  });
  const persistedCriteriaWeighting =
    await resolveDeferredCriteriaWeightingAfterPersistenceOrThrow({
      resolvedCriteriaWeighting: remappedCriteriaWeighting,
      persistedLeafCriteria: leafCriteria,
      decisionModelsServiceBaseUrl,
      httpClient,
      executionAttemptInput: { issue: null, scope: "issueCreation", actorType: "user", actorUser: ownerUserId, correlationId: eventMetadata.correlationId, evaluationStage: "criteriaWeighting", issueStage: issue.currentStage, consensusPhase: issue.consensusPhase, modelContext: { proposedIssueId: String(issue._id), issueName: input.issueName, modelId: remappedCriteriaWeighting.criteriaWeightingModel?._id ?? null, modelName: remappedCriteriaWeighting.criteriaWeightingModel?.name ?? null, apiModelKey: remappedCriteriaWeighting.criteriaWeightingApiModelKey ?? null, apiEndpointPath: remappedCriteriaWeighting.criteriaWeightingApiEndpoint?.path ?? null, evaluationStructureKey: remappedCriteriaWeighting.criteriaWeightsStructureKey ?? null, serviceBaseUrl: decisionModelsServiceBaseUrl ?? null, modelKind: "criteriaWeighting" } },
    });

  applyInitialCriteriaWeightsToIssue({
    issue,
    resolvedCriteriaWeighting: persistedCriteriaWeighting,
  });

  const initialLifecycleState = snapshotIssueLifecycle(issue);
  await writeIssueEvent({
    issueId: issue._id,
    eventType: ISSUE_EVENT_TYPES.ISSUE_STAGE_CHANGED,
    actorType: "user",
    actorUser: ownerUserId,
    stage: issue.currentStage,
    phase: issue.consensusPhase,
    occurredAt: eventMetadata.occurredAt,
    correlationId: eventMetadata.correlationId,
    previousState: { ...initialLifecycleState, currentStage: null },
    nextState: initialLifecycleState,
    details: {
      previousStage: null,
      nextStage: issue.currentStage,
      cause: "issueCreated",
    },
    session,
  });

  const initialWeights = issue?.modelParameters?.weights;
  if (initialWeights && typeof initialWeights === "object" && !Array.isArray(initialWeights)) {
    await writeCriteriaWeightsChanged({
      issue,
      previousWeightsByCriterionId: {},
      nextWeightsByCriterionId: initialWeights,
      actorType: "user",
      actorUser: ownerUserId,
      occurredAt: eventMetadata.occurredAt,
      correlationId: eventMetadata.correlationId,
      cause: "initialCriteriaWeights",
      structureKey: issue.criteriaWeightsStructureKey,
      session,
    });
  }

  let phaseStartEvent = null;
  if (issue.isConsensus === true && issue.currentStage === "alternativeEvaluation") {
    phaseStartEvent = await writeConsensusEvent({
      issue,
      eventType: ISSUE_EVENT_TYPES.CONSENSUS_PHASE_STARTED,
      phase: issue.consensusPhase,
      actorUser: ownerUserId,
      occurredAt: eventMetadata.occurredAt,
      correlationId: eventMetadata.correlationId,
      details: {
        threshold: issue.consensusThreshold,
        maxPhases: issue.consensusMaxPhases,
        simulated: issue.simulateConsensus === true,
      },
      session,
    });
  }

  const isCriteriaWeightingRequired =
    persistedCriteriaWeighting.isCriteriaWeightingRequired;

  const { emailsToSend } = await createIssueParticipationsAndNotifications({
    issue,
    input,
    expertByEmail,
    owner,
    ownerEmail,
    isCriteriaWeightingRequired,
    normalizedExpertWeightsByEmail:
      usesExpertWeights ? normalizedExpertWeightsByEmail : null,
    correlationId: eventMetadata.correlationId,
    occurredAt: eventMetadata.occurredAt,
    session,
  });

  await issue.save({ session });
  await writeIssueStateSnapshot({ issue, snapshotType: "creation", occurredAt: eventMetadata.occurredAt, correlationId: eventMetadata.correlationId, session });
  if (phaseStartEvent) await writeIssueStateSnapshot({ issue, snapshotType: "consensusPhaseStart", occurredAt: eventMetadata.occurredAt, correlationId: eventMetadata.correlationId, sourceEvent: phaseStartEvent._id, session });
  return {
    issueName: input.issueName,
    emailsToSend,
    ...(persistedCriteriaWeighting.executionAttempt ? { executionAttemptId: persistedCriteriaWeighting.executionAttempt._id, issueId: issue._id, initialWeights: issue.modelParameters.weights } : {}),
  };
};
