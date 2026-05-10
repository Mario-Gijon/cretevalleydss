import { CriteriaWeightEvaluation } from "../../../models/CriteriaWeightEvaluation.js";
import { Evaluation } from "../../../models/Evaluations.js";
import { Issue } from "../../../models/Issues.js";
import {
  buildInitialCriteriaWeightEvaluationDocs,
  resolveInitialIssueStage,
} from "../weightEvaluations/weightEvaluation.initialDocs.js";
import { normalizeSingleWeight } from "../weightEvaluations/weightEvaluation.shared.js";
import { createIssueDomainSnapshots } from "../expressionDomains/issueDomainSnapshots.js";
import { normalizeCreateIssueInput } from "./issueCreation.input.js";
import { loadCreateIssueActorsAndModel } from "./issueCreation.context.js";
import {
  buildExpertAssignmentDomainMap,
  loadAccessibleExpressionDomains,
} from "./issueCreation.domains.js";
import { buildIssueEvaluationDocsWithSnapshots } from "./issueCreation.evaluations.js";
import { createIssueParticipationsAndNotifications } from "./issueCreation.participants.js";
import {
  createCriteriaRecursively,
  createIssueAlternatives,
} from "./issueCreation.documents.js";
import { compareNameId } from "../issue.ordering.js";
import {
  createBadRequestError,
  createConflictError,
} from "../../../utils/common/errors.js";
import dayjs from "dayjs";

/**
 * Crea un nuevo issue con alternativas, criterios, snapshots,
 * participaciones y evaluaciones iniciales.
 *
 * @param {object} params Parámetros de entrada.
 * @param {Object} params.issueInfo Payload issueInfo recibido.
 * @param {string} params.adminUserId Id del usuario actual.
 * @param {Object} params.session Sesión de mongoose.
 * @returns {Promise<Object>}
 */
export const createIssueFlow = async ({
  issueInfo,
  adminUserId,
  session,
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
    expertUsers,
    expertByEmail,
    modelEvaluationStructure,
    modelLifecycleKind,
    apiModelKey,
    apiEndpoint,
    inputKind,
    outputKind,
    modelFamilyKey,
    modelVersion,
    versionLabel,
    normalizedModelParameters,
  } = await loadCreateIssueActorsAndModel({
    adminUserId,
    selectedModelId: input.selectedModelId,
    requestedWithConsensus: input.withConsensus,
    weightingMode: input.weightingMode,
    paramValues: input.paramValues,
    criteriaNodes: input.criteria,
    alternativesCount: input.uniqueAlternativeNames.length,
    uniqueExpertEmails: input.uniqueExpertEmails,
    session,
  });

  const issue = new Issue({
    admin: adminUserId,
    model: model._id,
    apiModelKey,
    apiEndpoint,
    inputKind,
    outputKind,
    modelFamilyKey,
    modelVersion,
    versionLabel,
    evaluationStructure: modelEvaluationStructure,
    lifecycleKind: modelLifecycleKind,
    consensusPhase: 1,
    isConsensus: input.withConsensus,
    name: input.issueName,
    description: input.issueDescription,
    active: true,
    creationDate: dayjs().format("DD-MM-YYYY"),
    closureDate: input.closureDate
      ? dayjs(input.closureDate).format("DD-MM-YYYY")
      : null,
    weightingMode: input.weightingMode,
    currentStage: "criteriaWeighting",
    ...(model.isConsensus && {
      consensusMaxPhases: input.consensusMaxPhases,
      consensusThreshold: input.consensusThreshold,
    }),
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

  if (leafCriteria.length === 0) {
    throw createBadRequestError("At least one leaf criterion is required", {
      field: "criteria",
    });
  }

  issue.alternativeOrder = createdAlternatives
    .slice()
    .sort((a, b) => compareNameId(a.name, a._id, b.name, b._id))
    .map((alternative) => alternative._id);

  issue.leafCriteriaOrder = leafCriteria
    .slice()
    .sort((a, b) => compareNameId(a.name, a._id, b.name, b._id))
    .map((criterion) => criterion._id);

  const isSingleLeafCriterion = leafCriteria.length === 1;

  issue.currentStage = resolveInitialIssueStage({
    leafCriteriaCount: leafCriteria.length,
    weightingMode: input.weightingMode,
  });
  const isCriteriaWeightingRequired = issue.currentStage === "criteriaWeighting";

  if (isSingleLeafCriterion) {
    const previousParams = issue.modelParameters;

    issue.modelParameters = {
      ...previousParams,
      weights:
        previousParams.weights != null
          ? normalizeSingleWeight(previousParams.weights)
          : [1],
    };
  }

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

  const { usedDomainIds, sourceDomainByEvaluationKey } =
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
    session,
  });

  const snapshotMap = await createIssueDomainSnapshots({
    issueId: issue._id,
    domainDocs,
    session,
  });

  const evaluationDocs = buildIssueEvaluationDocsWithSnapshots({
    issueId: issue._id,
    expertUsers,
    createdAlternatives,
    leafCriteria,
    modelEvaluationStructure,
    sourceDomainByEvaluationKey,
    snapshotMap,
  });

  if (evaluationDocs.length > 0) {
    await Evaluation.insertMany(evaluationDocs, {
      session,
      ordered: true,
    });
  }

  const criteriaWeightDocs = buildInitialCriteriaWeightEvaluationDocs({
    issueId: issue._id,
    experts: expertUsers,
    leafCriteria,
    weightingMode: input.weightingMode,
    consensusPhase: 1,
    completed: false,
  });

  if (criteriaWeightDocs.length > 0) {
    await CriteriaWeightEvaluation.insertMany(criteriaWeightDocs, {
      session,
      ordered: true,
    });
  }

  return {
    issueName: input.issueName,
    emailsToSend,
  };
};
