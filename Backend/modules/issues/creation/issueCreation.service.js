import { Issue } from "../../../models/Issues.js";
import { createIssueDomainSnapshots } from "../expressionDomains/issueDomainSnapshots.js";
import { normalizeCreateIssueInput } from "./issueCreation.input.js";
import { loadCreateIssueActorsAndModel } from "./issueCreation.context.js";
import {
  buildExpertAssignmentDomainMap,
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
} from "./issueCreation.model.js";
import { resolveCriteriaWeightingConfigOrThrow } from "./issueCreation.criteriaWeights.js";
import {
  createBadRequestError,
  createConflictError,
} from "../../../utils/common/errors.js";
import dayjs from "dayjs";
import axios from "axios";

const resolveFuzzyCriteriaWeightValueCountOrThrow = ({
  model,
  domainDocs,
}) => {
  if (model?.usesFuzzyCriteriaWeights !== true) {
    return null;
  }

  const linguisticDomains = (Array.isArray(domainDocs) ? domainDocs : []).filter(
    (domain) => domain?.type === "linguistic"
  );

  if (linguisticDomains.length === 0) {
    throw createBadRequestError(
      "Fuzzy criteria weights require linguistic expression domains",
      {
        field: "domainAssignments",
      }
    );
  }

  const valueCounts = new Set();

  for (const domain of linguisticDomains) {
    const valueCount = Number(domain?.valueCount);
    if (!Number.isInteger(valueCount) || valueCount < 2) {
      throw createBadRequestError(
        "Fuzzy criteria weights require a valid linguistic valueCount",
        {
          field: "domainAssignments",
        }
      );
    }

    valueCounts.add(valueCount);
  }

  if (valueCounts.size !== 1) {
    throw createBadRequestError(
      "Fuzzy criteria weights require consistent linguistic valueCount across issue domains",
      {
        field: "domainAssignments",
      }
    );
  }

  return Array.from(valueCounts)[0];
};

/**
 * Crea un nuevo issue con alternativas, criterios, snapshots y participaciones.
 *
 * @param {object} params Parámetros de entrada.
 * @param {Object} params.issueInfo Payload issueInfo recibido.
 * @param {string} params.adminUserId Id del usuario actual.
 * @param {Object} params.session Sesión de mongoose.
 * @param {string} [params.apiModelsBaseUrl] Base URL del servicio ApiModels.
 * @param {Object} [params.httpClient] Cliente HTTP compatible con axios.
 * @returns {Promise<Object>}
 */
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

  const baseModelParameters =
    normalizedModelParameters &&
    typeof normalizedModelParameters === "object" &&
    !Array.isArray(normalizedModelParameters)
      ? normalizedModelParameters
      : {};

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
    supportsConsensus: modelSupportsConsensus,
    consensusThreshold: input.consensusThreshold,
    consensusMaxPhases: input.consensusMaxPhases,
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
    criteriaWeightingAggregationMode: "none",
    alternativeEvaluationStructureKey,
    supportsConsensus: modelSupportsConsensus,
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
      model?.usesCriteriaWeights === true
        ? EVALUATION_STAGES.CRITERIA_WEIGHTING
        : EVALUATION_STAGES.ALTERNATIVE_EVALUATION,
    consensusMaxPhases,
    consensusThreshold,
    modelParameters: baseModelParameters,
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

  if (leafCriteria.length === 0) {
    throw createBadRequestError("At least one leaf criterion is required", {
      field: "criteria",
    });
  }

  if (model?.isMultiCriteria !== true && leafCriteria.length > 1) {
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

  const { usedDomainIds } =
    buildExpertAssignmentDomainMap({
      uniqueExpertEmails: input.uniqueExpertEmails,
      normalizedAssignmentsByExpert: input.normalizedAssignmentsByExpert,
      expertByEmail,
      createdAlternatives,
      leafCriteria,
      uniqueAlternativeNames: input.uniqueAlternativeNames,
    });

  const domainDocs = await loadAccessibleExpressionDomains({
    domainIdList: usedDomainIds,
    userId: adminUserId,
    modelSupportedDomains: model?.supportedDomains || null,
    session,
  });

  const fuzzyCriteriaWeightValueCount = resolveFuzzyCriteriaWeightValueCountOrThrow({
    model,
    domainDocs,
  });

  const resolvedCriteriaWeighting =
    await resolveCriteriaWeightingConfigOrThrow({
      criteriaWeightingConfig: input.criteriaWeightingConfig,
      criterionNames,
      isSingleLeafCriterion,
      model,
      fuzzyValueCount: fuzzyCriteriaWeightValueCount,
      apiModelsBaseUrl,
      httpClient,
    });

  issue.criteriaWeightingStructureKey =
    resolvedCriteriaWeighting.criteriaWeightingStructureKey;
  issue.criteriaWeightingAggregationMode =
    resolvedCriteriaWeighting.criteriaWeightingAggregationMode;
  issue.currentStage = resolvedCriteriaWeighting.currentStage;

  if (Array.isArray(resolvedCriteriaWeighting.modelWeights)) {
    issue.modelParameters = {
      ...issue.modelParameters,
      weights: resolvedCriteriaWeighting.modelWeights,
    };
  }

  const isCriteriaWeightingRequired =
    resolvedCriteriaWeighting.isCriteriaWeightingRequired === true;

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

  await createIssueDomainSnapshots({
    issueId: issue._id,
    domainDocs,
    session,
  });

  return {
    issueName: input.issueName,
    emailsToSend,
  };
};
