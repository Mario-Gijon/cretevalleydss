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
import { applyIssueCreationOrdering } from "./applyIssueOrdering.js";
import {
  assignIssueExpressionDomainSnapshotsOrThrow,
} from "../../expressionDomains/assignIssueDomainSnapshots.js";
import { getOrderedLeafCriterionNamesFromInputOrThrow } from "./getOrderedLeafCriterionNamesFromInput.js";

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
  adminUserId,
  apiModelsBaseUrl = process.env.ORIGIN_APIMODELS || "http://localhost:7000",
  httpClient = axios,
}) => {
  const input = normalizeCreateIssueInput(issueInfo);

  await assertIssueNameAvailableOrThrow({
    issueName: input.issueName,
  });

  const {
    model,
    admin,
    adminEmail,
    expertByEmail,
    apiModelKey,
    apiEndpoint,
    alternativeEvaluationStructureKey,
    supportsConsensus: modelSupportsConsensus,
    supportsConsensusSimulation: modelSupportsConsensusSimulation,
    usesCriteriaWeights,
    isMultiCriteria,
    normalizedModelParameters,
  } = await loadCreateIssueActorsAndModel({
    adminUserId,
    selectedModelId: input.selectedModelId,
    paramValues: input.paramValues,
    criteriaNodes: input.criteria,
    alternativesCount: input.uniqueAlternativeNames.length,
    uniqueExpertEmails: input.uniqueExpertEmails,
  });

  const alternativeEvaluationStructure = getEvaluationStructureOrThrow(
    alternativeEvaluationStructureKey
  );

  if (alternativeEvaluationStructure.stage !== EVALUATION_STAGES.ALTERNATIVE_EVALUATION) {
    throw createBadRequestError(
      `Evaluation structure '${alternativeEvaluationStructure.key}' does not support stage '${EVALUATION_STAGES.ALTERNATIVE_EVALUATION}'`,
      {
        code: "EVALUATION_STRUCTURE_STAGE_MISMATCH",
        field: "alternativeEvaluationStructureKey",
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
    userId: adminUserId,
    modelSupportedDomains: model.supportedDomains,
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
      isSingleLeafCriterion,
      model,
      fuzzyValueCount: fuzzyCriteriaWeightValueCount,
      apiModelsBaseUrl,
      httpClient,
    });

  return {
    input,
    adminUserId,
    model,
    admin,
    adminEmail,
    expertByEmail,
    apiModelKey,
    apiEndpoint,
    alternativeEvaluationStructureKey,
    modelSupportsConsensus,
    simulateConsensus,
    isConsensus,
    consensusThreshold,
    consensusMaxPhases,
    usesCriteriaWeights,
    normalizedModelParameters,
    domainDocs,
    domainIdByCriterionName,
    resolvedCriteriaWeighting,
  };
};

export const persistPreparedIssueCreation = async ({
  preparedIssueCreation,
  session,
}) => {
  const {
    input,
    adminUserId,
    model,
    admin,
    adminEmail,
    expertByEmail,
    apiModelKey,
    apiEndpoint,
    alternativeEvaluationStructureKey,
    modelSupportsConsensus,
    simulateConsensus,
    isConsensus,
    consensusThreshold,
    consensusMaxPhases,
    usesCriteriaWeights,
    normalizedModelParameters,
    domainDocs,
    domainIdByCriterionName,
    resolvedCriteriaWeighting,
  } = preparedIssueCreation;

  await assertIssueNameAvailableOrThrow({
    issueName: input.issueName,
    session,
  });

  const issue = buildIssueCreationDocument({
    adminUserId,
    model,
    apiModelKey,
    apiEndpoint,
    alternativeEvaluationStructureKey,
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

  const createdAlternatives = await createIssueAlternatives({
    issueId: issue._id,
    uniqueAlternativeNames: input.uniqueAlternativeNames,
    session,
  });

  const leafCriteria = [];
  await createCriteriaRecursively({
    issueId: issue._id,
    nodes: input.criteria,
    leafCriteria,
    session,
  });
  applyIssueCreationOrdering({
    issue,
    createdAlternatives,
    leafCriteria,
  });

  applyInitialCriteriaWeightsToIssue({
    issue,
    resolvedCriteriaWeighting,
  });

  const isCriteriaWeightingRequired =
    resolvedCriteriaWeighting.isCriteriaWeightingRequired;

  const { emailsToSend } = await createIssueParticipationsAndNotifications({
    issue,
    input,
    expertByEmail,
    admin,
    adminEmail,
    isCriteriaWeightingRequired,
    session,
  });

  await assignIssueExpressionDomainSnapshotsOrThrow({
    issueId: issue._id,
    domainDocs,
    leafCriteria,
    domainIdByCriterionName,
    session,
  });

  await issue.save({ session });

  return {
    issueName: input.issueName,
    emailsToSend,
  };
};
