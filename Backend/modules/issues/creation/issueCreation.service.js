import { Issue } from "../../../models/Issues.js";
import { createIssueDomainSnapshots } from "../expressionDomains/issueDomainSnapshots.js";
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
import { compareNameId } from "../issue.ordering.js";
import {
  EVALUATION_STAGES,
  getEvaluationStructureOrThrow,
} from "../evaluations/index.js";
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
import dayjs from "dayjs";
import axios from "axios";

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

  const issue = new Issue({
    admin: adminUserId,
    model: model._id,
    apiModelKey,
    apiEndpoint,
    modelFamilyKey,
    modelVersion,
    versionLabel,
    criteriaWeightingStructureKey: null,
    criteriaWeightingModel: null,
    criteriaWeightingApiModelKey: null,
    criteriaWeightingApiEndpoint: null,
    criteriaWeightingParameters: {},
    alternativeEvaluationStructureKey,
    supportsConsensus: modelSupportsConsensus,
    simulateConsensus,
    consensusPhase: 1,
    isConsensus,
    name: input.issueName,
    description: input.issueDescription,
    active: true,
    creationDate: dayjs().format("DD-MM-YYYY"),
    closureDate: input.closureDate
      ? dayjs(input.closureDate).format("DD-MM-YYYY")
      : null,
    currentStage:
      usesCriteriaWeights
        ? EVALUATION_STAGES.CRITERIA_WEIGHTING
        : EVALUATION_STAGES.ALTERNATIVE_EVALUATION,
    consensusMaxPhases,
    consensusThreshold,
    modelParameters: normalizedModelParameters,
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

  issue.alternativeOrder = createdAlternatives
    .slice()
    .sort((a, b) => compareNameId(a.name, a._id, b.name, b._id))
    .map((alternative) => alternative._id);

  issue.leafCriteriaOrder = leafCriteria
    .slice()
    .sort((a, b) => compareNameId(a.name, a._id, b.name, b._id))
    .map((criterion) => criterion._id);

  const orderedLeafCriteria = leafCriteria
    .slice()
    .sort((a, b) => compareNameId(a.name, a._id, b.name, b._id));
  const criterionNames = orderedLeafCriteria.map((criterion) => criterion.name);
  const isSingleLeafCriterion = criterionNames.length === 1;

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

  issue.criteriaWeightingStructureKey =
    resolvedCriteriaWeighting.criteriaWeightingStructureKey;
  issue.criteriaWeightingModel =
    resolvedCriteriaWeighting.criteriaWeightingModel
      ? resolvedCriteriaWeighting.criteriaWeightingModel._id
      : null;
  issue.criteriaWeightingApiModelKey =
    resolvedCriteriaWeighting.criteriaWeightingApiModelKey;
  issue.criteriaWeightingApiEndpoint =
    resolvedCriteriaWeighting.criteriaWeightingApiEndpoint;
  issue.criteriaWeightingParameters =
    resolvedCriteriaWeighting.criteriaWeightingParameters;
  issue.currentStage = resolvedCriteriaWeighting.currentStage;

  if (Array.isArray(resolvedCriteriaWeighting.modelWeights)) {
    issue.modelParameters = {
      ...issue.modelParameters,
      weights: resolvedCriteriaWeighting.modelWeights,
    };
  }

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

  const snapshotIdBySourceDomainId = await createIssueDomainSnapshots({
    issueId: issue._id,
    domainDocs,
    session,
  });

  for (const leafCriterion of leafCriteria) {
    const criterionName = leafCriterion.name;
    const sourceDomainId = domainIdByCriterionName.get(criterionName);
    const snapshotId = snapshotIdBySourceDomainId.get(sourceDomainId);

    if (!snapshotId) {
      throw createBadRequestError(
        `Missing IssueExpressionDomain snapshot for criterion '${criterionName}'`,
        {
          field: "expressionDomainConfig",
        }
      );
    }

    leafCriterion.expressionDomain = snapshotId;
    await leafCriterion.save({ session });
  }

  const missingExpressionDomain = leafCriteria.find(
    (leafCriterion) => !leafCriterion.expressionDomain
  );
  if (missingExpressionDomain) {
    throw createBadRequestError(
      "Each leaf criterion must have an expression domain snapshot",
      {
        field: "expressionDomainConfig",
        details: {
          criterionName: missingExpressionDomain.name,
        },
      }
    );
  }

  return {
    issueName: input.issueName,
    emailsToSend,
  };
};
