// Models
import { Alternative } from "../../models/Alternatives.js";
import { CriteriaWeightEvaluation } from "../../models/CriteriaWeightEvaluation.js";
import { Criterion } from "../../models/Criteria.js";
import { Evaluation } from "../../models/Evaluations.js";
import { ExpressionDomain } from "../../models/ExpressionDomain.js";
import { Issue } from "../../models/Issues.js";
import { IssueModel } from "../../models/IssueModels.js";
import { Notification } from "../../models/Notificacions.js";
import { Participation } from "../../models/Participations.js";
import { User } from "../../models/Users.js";

// Modules
import {
  buildInitialCriteriaWeightEvaluationDocs,
  buildInitialEvaluationDocs,
  EVALUATION_STRUCTURES,
  resolveEvaluationStructure,
  resolveInitialIssueStage,
} from "./issue.evaluationStructure.js";
import { normalizeSingleWeight } from "./issue.weights.js";
import { createIssueDomainSnapshots } from "./issue.domainSnapshots.js";

// Utils
import { compareNameId } from "../../modules/issues/issue.ordering.js";
import {
  getUniqueTrimmedStrings,
  normalizeEmail,
  normalizeOptionalString,
  normalizeString,
} from "../../utils/common/strings.js";
import { toIdString } from "../../utils/common/ids.js";
import {
  createBadRequestError,
  createConflictError,
  createNotFoundError,
} from "../../utils/common/errors.js";

// External libraries
import dayjs from "dayjs";

/**
 * Normaliza y valida la entrada base para crear un issue.
 *
 * @param {Object} rawIssueInfo Datos recibidos en req.body.issueInfo.
 * @returns {Object}
 */
const normalizeCreateIssueInput = (rawIssueInfo) => {
  const issueInfo = rawIssueInfo || {};

  const issueName = normalizeString(issueInfo.issueName);
  const issueDescription = normalizeOptionalString(issueInfo.issueDescription);
  const selectedModelName = normalizeString(issueInfo.selectedModel?.name);
  const alternatives = Array.isArray(issueInfo.alternatives)
    ? issueInfo.alternatives
    : [];
  const withConsensus = Boolean(issueInfo.withConsensus);
  const criteria = Array.isArray(issueInfo.criteria) ? issueInfo.criteria : [];
  const addedExperts = Array.isArray(issueInfo.addedExperts)
    ? issueInfo.addedExperts
    : [];
  const domainAssignments = issueInfo.domainAssignments;
  const closureDate = issueInfo.closureDate;
  const consensusMaxPhases = issueInfo.consensusMaxPhases;
  const consensusThreshold = issueInfo.consensusThreshold;
  const paramValues = issueInfo.paramValues || {};
  const weightingMode = normalizeString(issueInfo.weightingMode || "manual");

  if (!issueName) {
    throw createBadRequestError("Issue name is required", {
      field: "issueName",
    });
  }

  if (!selectedModelName) {
    throw createBadRequestError("Model is required", {
      field: "selectedModel",
    });
  }

  const uniqueAlternativeNames = getUniqueTrimmedStrings(alternatives);
  if (uniqueAlternativeNames.length <= 1) {
    throw createBadRequestError("Must be at least two valid alternatives", {
      field: "alternatives",
    });
  }

  const uniqueExpertEmails = Array.from(
    new Set((addedExperts || []).map(normalizeEmail).filter(Boolean))
  );

  if (uniqueExpertEmails.length === 0) {
    throw createBadRequestError("Must be at least one expert", {
      field: "addedExperts",
    });
  }

  if (!criteria.length) {
    throw createBadRequestError("At least one criterion is required", {
      field: "criteria",
    });
  }

  if (
    !domainAssignments ||
    typeof domainAssignments !== "object" ||
    !domainAssignments.experts ||
    typeof domainAssignments.experts !== "object"
  ) {
    throw createBadRequestError("domainAssignments.experts is required", {
      field: "domainAssignments",
    });
  }

  const normalizedAssignmentsByExpert = Object.fromEntries(
    Object.entries(domainAssignments.experts).map(([email, value]) => [
      normalizeEmail(email),
      value,
    ])
  );

  return {
    issueName,
    issueDescription,
    selectedModelName,
    uniqueAlternativeNames,
    withConsensus,
    criteria,
    uniqueExpertEmails,
    normalizedAssignmentsByExpert,
    closureDate,
    consensusMaxPhases,
    consensusThreshold,
    paramValues,
    weightingMode,
  };
};

/**
 * Carga y valida el modelo, admin y expertos para la creación del issue.
 *
 * @param {object} params Parámetros de entrada.
 * @param {string} params.adminUserId Id del admin actual.
 * @param {string} params.selectedModelName Nombre del modelo elegido.
 * @param {string[]} params.uniqueExpertEmails Correos únicos de expertos.
 * @param {Object} params.session Sesión de mongoose.
 * @returns {Promise<Object>}
 */
const loadCreateIssueActorsAndModel = async ({
  adminUserId,
  selectedModelName,
  uniqueExpertEmails,
  session,
}) => {
  const existingModel = await IssueModel.findOne({ name: selectedModelName }).session(
    session
  );

  if (!existingModel) {
    throw createBadRequestError("Model does not exist", {
      field: "selectedModel",
    });
  }

  const admin = await User.findById(adminUserId).session(session);
  if (!admin) {
    throw createNotFoundError("Admin not found");
  }

  const expertUsers = await User.find({
    email: { $in: uniqueExpertEmails },
  }).session(session);

  const expertByEmail = new Map(
    expertUsers.map((user) => [normalizeEmail(user.email), user])
  );

  const missingExperts = uniqueExpertEmails.filter(
    (email) => !expertByEmail.has(email)
  );

  if (missingExperts.length > 0) {
    throw createBadRequestError(
      `Experts not found: ${missingExperts.join(", ")}`,
      {
        field: "addedExperts",
      }
    );
  }

  return {
    model: existingModel,
    admin,
    adminEmail: normalizeEmail(admin.email),
    expertUsers,
    expertByEmail,
    modelEvaluationStructure: resolveEvaluationStructure(existingModel),
  };
};

/**
 * Crea las alternativas del issue.
 *
 * @param {object} params Parámetros de entrada.
 * @param {string|Object} params.issueId Id del issue.
 * @param {string[]} params.uniqueAlternativeNames Nombres de alternativas.
 * @param {Object} params.session Sesión de mongoose.
 * @returns {Promise<Array<Object>>}
 */
const createIssueAlternatives = async ({
  issueId,
  uniqueAlternativeNames,
  session,
}) => {
  if (!uniqueAlternativeNames.length) {
    return [];
  }

  return Alternative.insertMany(
    uniqueAlternativeNames.map((name) => ({
      issue: issueId,
      name,
    })),
    { session, ordered: true }
  );
};

/**
 * Crea recursivamente la jerarquía de criterios del issue.
 *
 * @param {object} params Parámetros de entrada.
 * @param {string|Object} params.issueId Id del issue.
 * @param {Array<Object>} params.nodes Nodos de criterios.
 * @param {Array<Object>} params.leafCriteria Acumulador de criterios hoja.
 * @param {Object} params.session Sesión de mongoose.
 * @param {string|Object|null} [params.parentCriterionId=null] Id del criterio padre.
 * @returns {Promise<void>}
 */
const createCriteriaRecursively = async ({
  issueId,
  nodes,
  leafCriteria,
  session,
  parentCriterionId = null,
}) => {
  if (!Array.isArray(nodes)) return;

  for (const node of nodes) {
    const children = Array.isArray(node?.children) ? node.children : [];
    const isLeaf = children.length === 0;
    const criterionName = normalizeString(node?.name);
    const criterionType = normalizeString(node?.type);

    if (!criterionName) {
      throw createBadRequestError("Criterion name is required", {
        field: "criteria",
      });
    }

    const criterion = new Criterion({
      issue: issueId,
      parentCriterion: parentCriterionId,
      name: criterionName,
      type: criterionType,
      isLeaf,
    });

    await criterion.save({ session });

    if (isLeaf) {
      leafCriteria.push(criterion);
      continue;
    }

    await createCriteriaRecursively({
      issueId,
      nodes: children,
      leafCriteria,
      session,
      parentCriterionId: criterion._id,
    });
  }
};

/**
 * Construye el mapa experto+alternativa+criterio -> dominio fuente
 * y devuelve los ids de dominios utilizados.
 *
 * @param {object} params Parámetros de entrada.
 * @param {string[]} params.uniqueExpertEmails Correos de expertos.
 * @param {Object} params.normalizedAssignmentsByExpert Asignaciones por experto.
 * @param {Map<string, Object>} params.expertByEmail Usuarios por email.
 * @param {Array<Object>} params.createdAlternatives Alternativas creadas.
 * @param {Array<Object>} params.leafCriteria Criterios hoja creados.
 * @param {string[]} params.uniqueAlternativeNames Nombres de alternativas.
 * @returns {Object}
 */
const buildExpertAssignmentDomainMap = ({
  uniqueExpertEmails,
  normalizedAssignmentsByExpert,
  expertByEmail,
  createdAlternatives,
  leafCriteria,
  uniqueAlternativeNames,
}) => {
  const alternativeByName = new Map(
    createdAlternatives.map((alternative) => [alternative.name, alternative])
  );

  const sourceDomainByEvaluationKey = new Map();
  const usedDomainIds = new Set();

  for (const email of uniqueExpertEmails) {
    const expertUser = expertByEmail.get(email);
    const expertAssignments = normalizedAssignmentsByExpert[email];

    if (!expertAssignments || typeof expertAssignments !== "object") {
      throw createBadRequestError(
        `Missing domain assignments for expert '${email}'`,
        {
          field: "domainAssignments",
        }
      );
    }

    const alternativesBlock = expertAssignments.alternatives || {};
    const expertId = toIdString(expertUser?._id);

    for (const alternativeName of uniqueAlternativeNames) {
      const alternativeDoc = alternativeByName.get(alternativeName);
      const criteriaBlock = alternativesBlock[alternativeName]?.criteria || {};

      if (!alternativeDoc) {
        throw createBadRequestError(
          `Alternative '${alternativeName}' not found while building assignments`,
          {
            field: "domainAssignments",
          }
        );
      }

      const alternativeId = toIdString(alternativeDoc._id);

      for (const leafCriterion of leafCriteria) {
        const domainId = toIdString(criteriaBlock[leafCriterion.name]);

        if (!domainId) {
          throw createBadRequestError(
            `Missing domain assignment for criterion '${leafCriterion.name}' (expert ${email}, alternative ${alternativeName})`,
            {
              field: "domainAssignments",
            }
          );
        }

        const criterionId = toIdString(leafCriterion._id);
        const evaluationKey = `${expertId}_${alternativeId}_${criterionId}`;

        sourceDomainByEvaluationKey.set(evaluationKey, domainId);
        usedDomainIds.add(domainId);
      }
    }
  }

  return {
    usedDomainIds: Array.from(usedDomainIds),
    sourceDomainByEvaluationKey,
  };
};

/**
 * Carga y valida los dominios de expresión usados en el issue.
 *
 * @param {object} params Parámetros de entrada.
 * @param {string[]} params.domainIdList Ids de dominios requeridos.
 * @param {string} params.userId Id del usuario actual.
 * @param {Object} params.session Sesión de mongoose.
 * @returns {Promise<Array<Object>>}
 */
const loadAccessibleExpressionDomains = async ({
  domainIdList,
  userId,
  session,
}) => {
  const domainDocs = await ExpressionDomain.find({
    _id: { $in: domainIdList },
    $or: [
      { isGlobal: true, user: null },
      { isGlobal: false, user: userId },
    ],
  })
    .select("_id name type numericRange linguisticLabels")
    .session(session);

  const existingDomainIds = new Set(
    domainDocs.map((domain) => toIdString(domain._id)).filter(Boolean)
  );

  const missingDomains = domainIdList.filter(
    (domainId) => !existingDomainIds.has(domainId)
  );

  if (missingDomains.length > 0) {
    throw createBadRequestError(
      `ExpressionDomain not found or not accessible: ${missingDomains.join(", ")}`,
      {
        field: "domainAssignments",
      }
    );
  }

  return domainDocs;
};

/**
 * Construye los documentos iniciales de Evaluation con snapshots ya resueltos.
 *
 * @param {object} params Parámetros de entrada.
 * @param {string|Object} params.issueId Id del issue.
 * @param {Array<Object>} params.expertUsers Expertos participantes.
 * @param {Array<Object>} params.createdAlternatives Alternativas creadas.
 * @param {Array<Object>} params.leafCriteria Criterios hoja creados.
 * @param {string} params.modelEvaluationStructure Estructura de evaluación del modelo.
 * @param {Map<string, string>} params.sourceDomainByEvaluationKey Dominio fuente por triple experto/alternativa/criterio.
 * @param {Map<string, Object>} params.snapshotMap Snapshot por dominio fuente.
 * @returns {Array<Object>}
 */
const buildIssueEvaluationDocsWithSnapshots = ({
  issueId,
  expertUsers,
  createdAlternatives,
  leafCriteria,
  modelEvaluationStructure,
  sourceDomainByEvaluationKey,
  snapshotMap,
}) => {
  const baseEvaluationDocs = buildInitialEvaluationDocs({
    issueId,
    experts: expertUsers,
    leafCriteria,
    alternatives: createdAlternatives,
    isPairwise:
      modelEvaluationStructure === EVALUATION_STRUCTURES.PAIRWISE_ALTERNATIVES,
    consensusPhase: null,
    includeReciprocal: true,
  });

  return baseEvaluationDocs.map((doc) => {
    const evaluationKey = `${toIdString(doc.expert)}_${toIdString(
      doc.alternative
    )}_${toIdString(doc.criterion)}`;

    const sourceDomainId = sourceDomainByEvaluationKey.get(evaluationKey);
    const issueSnapshotId = snapshotMap.get(toIdString(sourceDomainId));

    if (!issueSnapshotId) {
      throw createBadRequestError(
        `Snapshot not found for domain ${String(sourceDomainId)}`,
        {
          field: "domainAssignments",
        }
      );
    }

    const { completed, ...persistableDoc } = doc;

    return {
      ...persistableDoc,
      expressionDomain: issueSnapshotId,
      value: null,
      timestamp: null,
      history: [],
      consensusPhase: null,
    };
  });
};

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
  } = await loadCreateIssueActorsAndModel({
    adminUserId,
    selectedModelName: input.selectedModelName,
    uniqueExpertEmails: input.uniqueExpertEmails,
    session,
  });

  const issue = new Issue({
    admin: adminUserId,
    model: model._id,
    evaluationStructure: modelEvaluationStructure,
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
    ...(Boolean(model.isConsensus) && {
      consensusMaxPhases: input.consensusMaxPhases,
      consensusThreshold: input.consensusThreshold,
    }),
    modelParameters: { ...input.paramValues },
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

  if (isSingleLeafCriterion) {
    const previousParams = issue.modelParameters || {};

    issue.modelParameters = {
      ...previousParams,
      weights:
        previousParams.weights != null
          ? normalizeSingleWeight(previousParams.weights)
          : [1],
    };
  }

  await issue.save({ session });

  const participationDocs = [];
  const notificationDocs = [];
  const emailsToSend = [];

  for (const email of input.uniqueExpertEmails) {
    const expertUser = expertByEmail.get(email);
    const isAdminExpert = email === adminEmail;

    participationDocs.push({
      issue: issue._id,
      expert: expertUser._id,
      invitationStatus: isAdminExpert ? "accepted" : "pending",
      evaluationCompleted: false,
      weightsCompleted: isSingleLeafCriterion,
      entryPhase: null,
      entryStage: null,
      joinedAt: new Date(),
    });

    if (!isAdminExpert) {
      notificationDocs.push({
        expert: expertUser._id,
        issue: issue._id,
        type: "invitation",
        message: `You have been invited by ${admin.name} to participate in ${input.issueName}.`,
        read: false,
        requiresAction: true,
      });

      emailsToSend.push({
        expertEmail: email,
        issueName: input.issueName,
        issueDescription: input.issueDescription,
        adminEmail,
      });
    }
  }

  if (participationDocs.length > 0) {
    await Participation.insertMany(participationDocs, {
      session,
      ordered: true,
    });
  }

  if (notificationDocs.length > 0) {
    await Notification.insertMany(notificationDocs, {
      session,
      ordered: true,
    });
  }

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
