import { Issue } from "../../../models/Issues.js";
import { normalizeCreateIssueInput } from "./issueCreation.input.js";
import { loadCreateIssueActorsAndModel } from "./issueCreation.context.js";
import {
  resolveExpressionDomainConfigByLeafCriteriaOrThrow,
  loadAccessibleExpressionDomains,
} from "./issueCreation.domains.js";
import { createIssueParticipationsAndNotifications } from "./issueCreation.participants.js";
import {
  createCriteriaRecursively,
  createIssueAlternatives,
} from "./issueCreation.documents.js";
import {
  EVALUATION_STAGES,
  getEvaluationStructureOrThrow,
} from "../../decisionEngine/evaluations/index.js";
import {
  resolveIssueConsensusConfigOrThrow,
  resolveIssueSimulationConfigOrThrow,
} from "./issueCreation.model.js";
import {
  resolveCriteriaWeightingConfigOrThrow,
  resolveFuzzyCriteriaWeightValueCountOrThrow,
} from "./issueCreation.criteriaWeights.js";
import {
  createBadRequestError,
  createConflictError,
} from "../../../utils/common/errors.js";
import axios from "axios";
import {
  applyResolvedCriteriaWeightingToIssue,
  buildIssueCreationDocument,
} from "./issueCreation.issue.js";
import { applyIssueCreationOrdering } from "./issueCreation.ordering.js";
import {
  assignIssueExpressionDomainSnapshotsOrThrow,
} from "./issueCreation.domainSnapshots.js";

export const createIssueFlow = async ({
  issueInfo,
  adminUserId,
  session,
  apiModelsBaseUrl = process.env.ORIGIN_APIMODELS || "http://localhost:7000",
  httpClient = axios,
}) => {
  const input = normalizeCreateIssueInput(issueInfo);

  const existingIssue = await Issue.findOne({ name: input.issueName }).session(
    session
  );
  if (existingIssue) {
    throw createConflictError("Issue name already exists", {
      field: "issueName",
    });
  }

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
    modelFamilyKey,
    modelVersion,
    versionLabel,
    normalizedModelParameters,
  } = await loadCreateIssueActorsAndModel({
    adminUserId,
    selectedModelId: input.selectedModelId,
    paramValues: input.paramValues,
    criteriaNodes: input.criteria,
    alternativesCount: input.uniqueAlternativeNames.length,
    uniqueExpertEmails: input.uniqueExpertEmails,
    session,
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

  const issue = buildIssueCreationDocument({
    adminUserId,
    model,
    apiModelKey,
    apiEndpoint,
    modelFamilyKey,
    modelVersion,
    versionLabel,
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

  if (!isMultiCriteria && leafCriteria.length > 1) {
    throw createBadRequestError(
      "Selected model does not support multiple criteria",
      {
        field: "criteria",
      }
    );
  }

  const { criterionNames, isSingleLeafCriterion } = applyIssueCreationOrdering({
    issue,
    createdAlternatives,
    leafCriteria,
  });

  const { usedDomainIds, domainIdByCriterionName } =
    resolveExpressionDomainConfigByLeafCriteriaOrThrow({
      expressionDomainConfig: input.expressionDomainConfig,
      leafCriteria,
    });

  const domainDocs = await loadAccessibleExpressionDomains({
    domainIdList: usedDomainIds,
    userId: adminUserId,
    modelSupportedDomains: model.supportedDomains,
    session,
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
      session,
    });

  applyResolvedCriteriaWeightingToIssue({
    issue,
    resolvedCriteriaWeighting,
  });

  const isCriteriaWeightingRequired =
    resolvedCriteriaWeighting.isCriteriaWeightingRequired;

  await issue.save({ session });

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

  return {
    issueName: input.issueName,
    emailsToSend,
  };
};
