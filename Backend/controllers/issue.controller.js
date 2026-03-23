// Models
import { Alternative } from "../models/Alternatives.js";
import { Consensus } from "../models/Consensus.js";
import { createIssueDomainSnapshots } from "../models/createIssueDomainSnapshots.js";
import { CriteriaWeightEvaluation } from "../models/CriteriaWeightEvaluation.js";
import { Criterion } from "../models/Criteria.js";
import { Evaluation } from "../models/Evaluations.js";
import { ExitUserIssue } from "../models/ExitUserIssue.js";
import { ExpressionDomain } from "../models/ExpressionDomain.js";
import { IssueExpressionDomain } from "../models/IssueExpressionDomains.js";
import { Issue } from "../models/Issues.js";
import { IssueModel } from "../models/IssueModels.js";
import { IssueScenario } from "../models/IssueScenarios.js";
import { Notification } from "../models/Notificacions.js";
import { Participation } from "../models/Participations.js";
import { User } from "../models/Users.js";

// Utils
import { cleanupExpertDraftsOnExit } from "../utils/cleanupExpertDraftsOnExit.js";
import {
  createAlternativesRankingsSection,
  createAnalyticalGraphsSection,
  createExpertsPairwiseRatingsSection,
  createExpertsRatingsSection,
  createSummarySection,
} from "../utils/finishedIssueInfoUtils.js";
import { getUserFinishedIssueIds } from "../utils/getUserFinishedIssueIds.js";
import {
  compareNameId,
  ensureIssueOrdersDb,
  getOrderedAlternativesDb,
  getOrderedLeafCriteriaDb,
  orderDocsByIdList,
} from "../utils/issueOrdering.js";
import { normalizeParams } from "../utils/normalizeParams.js";
import {
  detectIssueDomainTypeOrThrow,
  getModelEndpointKey,
} from "../utils/ScenarioUtils.js";
import { sendExpertInvitationEmail } from "../utils/sendEmails.js";
import {
  validateFinalEvaluations,
  validateFinalPairwiseEvaluations,
} from "../utils/validateFinalEvaluations.js";

import { validateFinalWeights } from "../utils/validateFinalWeights.js";

// Modules
import {
  ACTIVE_ACTION_META,
  ACTIVE_STAGE_META,
  ACTIVE_TASK_ACTION_KEYS,
  buildDeadlineInfo,
  buildIssueCriteriaTree,
  buildWorkflowStepsStable,
  cleanModelParameters,
  decorateCriteriaTree,
  detectHasAlternativeConsensusEnabled,
  detectHasDirectWeights,
  getEmptyTasksByType,
  incrementCounter,
} from "../modules/issues/issue.active.js";

import {
  getAcceptedParticipation,
  getDefaultIssueSnapshot,
  getNextConsensusPhase,
  getOrderedLeafCriteriaForIssue,
} from "../modules/issues/issue.queries.js";

import {
  mapIssueStageToExitStage,
  registerUserExit,
} from "../modules/issues/issue.lifecycle.js";

import {
  formatExpressionDomainForClient,
  formatPairwiseEvaluationsByCriterion,
} from "../modules/issues/issue.mappers.js";

import {
  buildDefaultsResolved,
  buildScenarioDirectMatrices,
  buildScenarioPairwiseMatrices,
  mergeParamsResolved,
  resolveScenarioWeightsArray,
} from "../modules/issues/issue.scenarios.js";

import {
  buildBwmEvaluationPayload,
  buildOrderedManualWeights,
  computeNormalizedCollectiveManualWeights,
  getRawManualWeightsPayload,
  markParticipationWeightsCompleted,
  normalizeSingleWeight,
  syncIssueStageAfterWeightsCompletion,
} from "../modules/issues/issue.weights.js";

// External libraries
import axios from "axios";
import dayjs from "dayjs";
import mongoose from "mongoose";
import { Resend } from "resend";

const resend = new Resend(process.env.APIKEY_RESEND);

const getIssueStructureHandler = (evaluationStructure, handlers) => {
  switch (evaluationStructure) {
    case EVALUATION_STRUCTURES.DIRECT:
      return handlers.direct;

    case EVALUATION_STRUCTURES.PAIRWISE_ALTERNATIVES:
      return handlers.pairwise;

    default:
      return null;
  }
};

const resolveIssueEvaluationStructureById = async (id) => {
  const issue = await Issue.findById(id).lean();

  if (!issue) {
    return {
      success: false,
      status: 404,
      msg: "Issue not found",
      issue: null,
      evaluationStructure: null,
    };
  }

  return {
    success: true,
    status: 200,
    msg: null,
    issue,
    evaluationStructure: resolveEvaluationStructure(issue),
  };
};

/**
 * Crea un error HTTP enriquecido con status y metadata opcional.
 *
 * @param {number} status Código HTTP.
 * @param {string} message Mensaje del error.
 * @param {string} [obj] Campo relacionado con el error.
 * @returns {Error}
 */
const createHttpError = (status, message, obj) => {
  const error = new Error(message);
  error.status = status;
  if (obj) {
    error.obj = obj;
  }
  return error;
};

/**
 * Finaliza una sesión de mongoose de forma segura.
 *
 * @param {mongoose.ClientSession | null | undefined} session Sesión activa.
 * @returns {Promise<void>}
 */
const endSessionSafely = async (session) => {
  if (!session) return;

  try {
    await session.endSession();
  } catch (error) {
    console.error("Error ending mongoose session:", error);
  }
};

/**
 * Aborta una transacción de mongoose de forma segura.
 *
 * @param {mongoose.ClientSession | null | undefined} session Sesión activa.
 * @returns {Promise<void>}
 */
const abortTransactionSafely = async (session) => {
  if (!session?.inTransaction?.()) return;

  try {
    await session.abortTransaction();
  } catch (error) {
    console.error("Error aborting mongoose transaction:", error);
  }
};

/**
 * Convierte un valor en string seguro para comparaciones de ids.
 *
 * @param {unknown} value Valor a convertir.
 * @returns {string}
 */
const asId = (value) => (value ? String(value) : "");

/**
 * Devuelve una lista de strings únicos, trimmeados y no vacíos.
 *
 * @param {unknown[]} values Valores de entrada.
 * @returns {string[]}
 */
const getUniqueTrimmedStrings = (values) =>
  Array.from(
    new Set(
      (Array.isArray(values) ? values : [])
        .map((value) => String(value || "").trim())
        .filter(Boolean)
    )
  );

const EVALUATION_STRUCTURES = {
  DIRECT: "direct",
  PAIRWISE_ALTERNATIVES: "pairwiseAlternatives",
};

/**
 * Resuelve la estructura de evaluación de un documento, manteniendo compatibilidad
 * con el campo antiguo isPairwise.
 *
 * @param {Record<string, any> | null | undefined} doc Documento a inspeccionar.
 * @returns {string}
 */
const resolveEvaluationStructure = (doc) => {
  if (doc?.evaluationStructure) {
    return doc.evaluationStructure;
  }

  if (doc?.isPairwise === true) {
    return EVALUATION_STRUCTURES.PAIRWISE_ALTERNATIVES;
  }

  return EVALUATION_STRUCTURES.DIRECT;
};

/**
 * Normaliza y valida los datos de un dominio de expresión a crear.
 *
 * @param {Record<string, any>} body Cuerpo recibido.
 * @returns {{
 *   name: string,
 *   type: string,
 *   numericRange?: { min: number, max: number },
 *   linguisticLabels?: Array<{ label: string, values: number[] }>,
 * }}
 */
const normalizeNewExpressionDomainPayload = (body) => {
  let {
    name,
    type,
    numericRange,
    linguisticLabels,
    isGlobal,
  } = body || {};

  name = String(name || "").trim();
  type = String(type || "").trim();

  if (Boolean(isGlobal)) {
    throw createHttpError(
      403,
      "Global domains are not creatable. They are predefined and non-modifiable."
    );
  }

  if (!name) {
    throw createHttpError(400, "Name is required");
  }

  if (!["numeric", "linguistic"].includes(type)) {
    throw createHttpError(400, "Invalid type");
  }

  if (type === "numeric") {
    if (!numericRange || numericRange.min == null || numericRange.max == null) {
      throw createHttpError(
        400,
        "numericRange.min and numericRange.max are required for numeric domains"
      );
    }

    const min = Number(numericRange.min);
    const max = Number(numericRange.max);

    if (!Number.isFinite(min) || !Number.isFinite(max)) {
      throw createHttpError(400, "min/max must be numbers");
    }

    if (min >= max) {
      throw createHttpError(400, "min must be < max");
    }

    return {
      name,
      type,
      numericRange: { min, max },
      linguisticLabels: [],
    };
  }

  if (!Array.isArray(linguisticLabels) || linguisticLabels.length === 0) {
    throw createHttpError(
      400,
      "linguisticLabels is required for linguistic domains"
    );
  }

  const seenLabels = new Set();
  const normalizedLabels = linguisticLabels.map((labelItem) => {
    const label = String(labelItem?.label || "").trim();
    const values = labelItem?.values;

    if (!label) {
      throw createHttpError(400, "Label is required");
    }

    if (seenLabels.has(label)) {
      throw createHttpError(400, `Duplicated label '${label}'`);
    }
    seenLabels.add(label);

    if (!Array.isArray(values) || values.length < 2) {
      throw createHttpError(
        400,
        "values must be an array with at least 2 numbers"
      );
    }

    const numericValues = values.map(Number);
    if (!numericValues.every(Number.isFinite)) {
      throw createHttpError(400, "values must be numbers");
    }

    for (let index = 1; index < numericValues.length; index += 1) {
      if (numericValues[index] < numericValues[index - 1]) {
        throw createHttpError(400, "values must be ordered (non-decreasing)");
      }
    }

    return {
      ...labelItem,
      label,
      values: numericValues,
    };
  });

  return {
    name,
    type,
    linguisticLabels: normalizedLabels,
  };
};

/**
 * Obtiene la información de modelos disponibles.
 *
 * @param {import("express").Request} req Request de Express.
 * @param {import("express").Response} res Response de Express.
 * @returns {Promise<void>}
 */
export const modelsInfo = async (req, res) => {
  try {
    const models = await IssueModel.find().select("-__v").lean();

    return res.status(200).json({
      success: true,
      data: models,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      msg: "Server error",
    });
  }
};

/**
 * Obtiene todos los usuarios visibles para la creación de issues.
 *
 * @param {import("express").Request} req Request de Express.
 * @param {import("express").Response} res Response de Express.
 * @returns {Promise<void>}
 */
export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({ accountConfirm: true })
      .select("name university email")
      .lean();

    return res.status(200).json({
      success: true,
      data: users,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      msg: "Server error",
    });
  }
};

/**
 * Obtiene los dominios de expresión globales y del usuario actual.
 *
 * @param {import("express").Request} req Request de Express.
 * @param {import("express").Response} res Response de Express.
 * @returns {Promise<void>}
 */
export const getExpressionsDomain = async (req, res) => {
  try {
    const userId = req.uid;

    const [globals, userDomains] = await Promise.all([
      ExpressionDomain.find({ isGlobal: true, user: null }).sort({ name: 1 }).lean(),
      ExpressionDomain.find({ isGlobal: false, user: userId }).sort({ name: 1 }).lean(),
    ]);

    return res.json({
      success: true,
      data: {
        globals,
        userDomains,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      msg: "Error fetching domains",
    });
  }
};

/**
 * Crea un nuevo dominio de expresión de usuario.
 *
 * @param {import("express").Request} req Request de Express.
 * @param {import("express").Response} res Response de Express.
 * @returns {Promise<void>}
 */
export const createExpressionDomain = async (req, res) => {
  try {
    const normalizedDomain = normalizeNewExpressionDomainPayload(req.body);

    const newDomain = new ExpressionDomain({
      name: normalizedDomain.name,
      type: normalizedDomain.type,
      isGlobal: false,
      user: req.uid,
      ...(normalizedDomain.type === "numeric"
        ? { numericRange: normalizedDomain.numericRange }
        : {}),
      ...(normalizedDomain.type === "linguistic"
        ? { linguisticLabels: normalizedDomain.linguisticLabels }
        : {}),
    });

    await newDomain.save();

    return res.status(201).json({
      success: true,
      msg: `Domain ${newDomain.name} created successfully`,
      data: newDomain,
    });
  } catch (error) {
    console.error(error);

    if (error?.status) {
      return res.status(error.status).json({
        success: false,
        msg: error.message,
      });
    }

    if (error?.code === 11000) {
      return res.status(409).json({
        success: false,
        msg: "A domain with the same name already exists (for this user).",
      });
    }

    return res.status(500).json({
      success: false,
      msg: "Error creating domain",
    });
  }
};

/**
 * Crea un nuevo issue con alternativas, criterios, participaciones,
 * snapshots de dominios y evaluaciones iniciales.
 *
 * @param {import("express").Request} req Request de Express.
 * @param {import("express").Response} res Response de Express.
 * @returns {Promise<void>}
 */
export const createIssue = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const issueInfo = req.body?.issueInfo || {};
    const {
      issueName,
      issueDescription,
      selectedModel,
      alternatives = [],
      withConsensus,
      criteria = [],
      addedExperts = [],
      domainAssignments,
      closureDate,
      consensusMaxPhases,
      consensusThreshold,
      paramValues = {},
      weightingMode,
    } = issueInfo;

    const cleanIssueName = String(issueName || "").trim();

    if (!cleanIssueName) {
      throw createHttpError(400, "Issue name is required", "issueName");
    }

    if (!Array.isArray(alternatives) || alternatives.length <= 1) {
      throw createHttpError(
        400,
        "Must be at least two alternatives",
        "alternatives"
      );
    }

    if (!Array.isArray(addedExperts) || addedExperts.length <= 0) {
      throw createHttpError(
        400,
        "Must be at least one expert",
        "addedExperts"
      );
    }

    if (!selectedModel?.name) {
      throw createHttpError(400, "Model is required", "selectedModel");
    }

    const emailsToSend = [];

    await session.withTransaction(async () => {
      const existingIssue = await Issue.findOne({ name: cleanIssueName }).session(session);
      if (existingIssue) {
        throw createHttpError(400, "Issue name already exists", "issueName");
      }

      const model = await IssueModel.findOne({ name: selectedModel.name }).session(session);
      if (!model) {
        throw createHttpError(400, "Model does not exist", "selectedModel");
      }

      const modelEvaluationStructure = resolveEvaluationStructure(model);

      const admin = await User.findById(req.uid).session(session);
      if (!admin) {
        throw createHttpError(400, "Admin not found");
      }

      const adminEmail = admin.email;
      const uniqueEmails = getUniqueTrimmedStrings(addedExperts);

      const expertUsers = await User.find({ email: { $in: uniqueEmails } }).session(session);
      const expertByEmail = new Map(expertUsers.map((user) => [user.email, user]));

      const missingExperts = uniqueEmails.filter((email) => !expertByEmail.has(email));
      if (missingExperts.length > 0) {
        throw createHttpError(
          400,
          `Experts not found: ${missingExperts.join(", ")}`,
          "addedExperts"
        );
      }

      const issue = new Issue({
        admin: req.uid,
        model: model._id,
        evaluationStructure: modelEvaluationStructure,
        isConsensus: withConsensus,
        name: cleanIssueName,
        description: issueDescription,
        active: true,
        creationDate: dayjs().format("DD-MM-YYYY"),
        closureDate: closureDate ? dayjs(closureDate).format("DD-MM-YYYY") : null,
        weightingMode,
        currentStage: "criteriaWeighting",
        ...(Boolean(model.isConsensus) && { consensusMaxPhases, consensusThreshold }),
        modelParameters: paramValues,
      });

      await issue.save({ session });

      const uniqueAlternativeNames = getUniqueTrimmedStrings(alternatives);
      if (uniqueAlternativeNames.length <= 1) {
        throw createHttpError(
          400,
          "Must be at least two valid alternatives",
          "alternatives"
        );
      }

      const createdAlternatives = [];
      for (const alternativeName of uniqueAlternativeNames) {
        const alternative = new Alternative({
          issue: issue._id,
          name: alternativeName,
        });

        await alternative.save({ session });
        createdAlternatives.push(alternative);
      }

      const leafCriteria = [];

      const createCriteriaRecursively = async (nodes, parentCriterionId = null) => {
        if (!Array.isArray(nodes)) return;

        for (const node of nodes) {
          const children = Array.isArray(node?.children) ? node.children : [];
          const isLeaf = children.length === 0;

          const criterion = new Criterion({
            issue: issue._id,
            parentCriterion: parentCriterionId,
            name: String(node?.name || "").trim(),
            type: String(node?.type || "").trim(),
            isLeaf,
          });

          if (!criterion.name) {
            throw createHttpError(400, "Criterion name is required", "criteria");
          }

          await criterion.save({ session });

          if (isLeaf) {
            leafCriteria.push(criterion);
          } else {
            await createCriteriaRecursively(children, criterion._id);
          }
        }
      };

      await createCriteriaRecursively(criteria);

      if (leafCriteria.length === 0) {
        throw createHttpError(
          400,
          "At least one leaf criterion is required",
          "criteria"
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

      const isSingleLeafCriterion = leafCriteria.length === 1;

      const weightingModesThatNeedWeightsStage = new Set([
        "simulatedConsensusBwm",
        "consensus",
        "bwm",
        "consensusBwm",
      ]);

      const needsWeightsStage =
        !isSingleLeafCriterion &&
        weightingModesThatNeedWeightsStage.has(weightingMode);

      issue.currentStage = needsWeightsStage
        ? "criteriaWeighting"
        : "alternativeEvaluation";

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

      for (const email of uniqueEmails) {
        const expert = expertByEmail.get(email);
        const isAdminExpert = email === adminEmail;

        const participation = new Participation({
          issue: issue._id,
          expert: expert._id,
          invitationStatus: isAdminExpert ? "accepted" : "pending",
          evaluationCompleted: false,
          weightsCompleted: isSingleLeafCriterion,
          entryPhase: null,
          entryStage: null,
          joinedAt: new Date(),
        });

        await participation.save({ session });

        if (!isAdminExpert) {
          const notification = new Notification({
            expert: expert._id,
            issue: issue._id,
            type: "invitation",
            message: `You have been invited by ${admin.name} to participate in ${cleanIssueName}.`,
            read: false,
            requiresAction: true,
          });

          await notification.save({ session });

          emailsToSend.push({
            expertEmail: email,
            issueName: cleanIssueName,
            issueDescription,
            adminEmail,
          });
        }
      }

      if (!domainAssignments?.experts || typeof domainAssignments.experts !== "object") {
        throw createHttpError(
          400,
          "domainAssignments.experts is required",
          "domainAssignments"
        );
      }

      const initialConsensusPhase = null;
      const usedDomainIds = new Set();

      for (const email of Object.keys(domainAssignments.experts)) {
        if (!expertByEmail.has(email)) continue;

        const alternativesBlock = domainAssignments.experts[email]?.alternatives || {};

        for (const alternativeName of uniqueAlternativeNames) {
          const criteriaBlock = alternativesBlock[alternativeName]?.criteria || {};

          for (const leafCriterion of leafCriteria) {
            const domainId = criteriaBlock[leafCriterion.name];

            if (!domainId) {
              throw createHttpError(
                400,
                `Missing domain assignment for criterion '${leafCriterion.name}' (expert ${email}, alternative ${alternativeName})`,
                "domainAssignments"
              );
            }

            usedDomainIds.add(String(domainId));
          }
        }
      }

      const domainIdList = Array.from(usedDomainIds);

      const domainDocs = await ExpressionDomain.find({
        _id: { $in: domainIdList },
        $or: [
          { isGlobal: true, user: null },
          { isGlobal: false, user: req.uid },
        ],
      })
        .select("_id name type numericRange linguisticLabels")
        .session(session);

      const existingDomainIds = new Set(domainDocs.map((domain) => String(domain._id)));
      const missingDomains = domainIdList.filter((id) => !existingDomainIds.has(id));

      if (missingDomains.length > 0) {
        throw createHttpError(
          400,
          `ExpressionDomain not found or not accessible: ${missingDomains.join(", ")}`,
          "domainAssignments"
        );
      }

      const snapshotMap = await createIssueDomainSnapshots({
        issueId: issue._id,
        domainDocs,
        session,
      });

      const alternativeByName = new Map(
        createdAlternatives.map((alternative) => [alternative.name, alternative])
      );

      const usesPairwiseAlternatives =
        modelEvaluationStructure === EVALUATION_STRUCTURES.PAIRWISE_ALTERNATIVES;

      for (const email of Object.keys(domainAssignments.experts)) {
        const expertUser = expertByEmail.get(email);
        if (!expertUser) continue;

        const alternativesBlock = domainAssignments.experts[email]?.alternatives || {};

        for (const alternativeName of uniqueAlternativeNames) {
          const alternativeDoc = alternativeByName.get(alternativeName);
          if (!alternativeDoc) continue;

          const criteriaBlock = alternativesBlock[alternativeName]?.criteria || {};

          for (const leafCriterion of leafCriteria) {
            const sourceDomainId = criteriaBlock[leafCriterion.name];
            const issueSnapshotId = snapshotMap.get(String(sourceDomainId));

            if (!issueSnapshotId) {
              throw createHttpError(
                400,
                `Snapshot not found for domain ${String(sourceDomainId)}`,
                "domainAssignments"
              );
            }

            if (usesPairwiseAlternatives) {
              for (const comparedAlternative of createdAlternatives) {
                if (String(comparedAlternative._id) === String(alternativeDoc._id)) {
                  continue;
                }

                await new Evaluation({
                  issue: issue._id,
                  expert: expertUser._id,
                  alternative: alternativeDoc._id,
                  comparedAlternative: comparedAlternative._id,
                  criterion: leafCriterion._id,
                  expressionDomain: issueSnapshotId,
                  value: null,
                  timestamp: null,
                  history: [],
                  consensusPhase: initialConsensusPhase,
                }).save({ session });
              }
            } else {
              await new Evaluation({
                issue: issue._id,
                expert: expertUser._id,
                alternative: alternativeDoc._id,
                comparedAlternative: null,
                criterion: leafCriterion._id,
                expressionDomain: issueSnapshotId,
                value: null,
                timestamp: null,
                history: [],
                consensusPhase: initialConsensusPhase,
              }).save({ session });
            }
          }
        }
      }
    });

    for (const emailPayload of emailsToSend) {
      try {
        await sendExpertInvitationEmail(emailPayload);
      } catch (error) {
        console.error(
          "Failed sending invitation email:",
          emailPayload.expertEmail,
          error
        );
      }
    }

    return res.status(201).json({
      success: true,
      msg: `Issue ${String(req.body?.issueInfo?.issueName || "").trim()} created successfully`,
    });
  } catch (error) {
    console.error(error);

    if (error?.status) {
      return res.status(error.status).json({
        success: false,
        obj: error.obj,
        msg: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      msg: "Server error creating issue",
    });
  } finally {
    await endSessionSafely(session);
  }
};

/**
 * Obtiene todos los issues activos visibles para el usuario actual.
 *
 * @param {import("express").Request} req Request de Express.
 * @param {import("express").Response} res Response de Express.
 * @returns {Promise<void>}
 */
export const getAllActiveIssues = async (req, res) => {
  const userId = asId(req.uid);

  try {
    const [adminIssues, acceptedParticipations] = await Promise.all([
      Issue.find({ admin: userId, active: true }).select("_id").lean(),
      Participation.find({
        expert: userId,
        invitationStatus: "accepted",
      })
        .populate({
          path: "issue",
          match: { active: true },
          select: "_id",
        })
        .lean(),
    ]);

    const adminIssueIds = adminIssues.map((issue) => asId(issue._id));
    const adminIssueIdSet = new Set(adminIssueIds);

    const expertIssueIds = acceptedParticipations
      .filter((participation) => participation.issue)
      .map((participation) => asId(participation.issue._id));

    const issueIds = Array.from(new Set([...adminIssueIds, ...expertIssueIds]));
    const emptyTasksByType = getEmptyTasksByType();

    if (issueIds.length === 0) {
      return res.json({
        success: true,
        issues: [],
        tasks: {
          total: 0,
          byType: emptyTasksByType,
        },
        taskCenter: {
          total: 0,
          sections: [],
        },
        filtersMeta: {
          defaults: {
            role: "all",
            stage: "all",
            action: "all",
            sort: "smart",
            q: "",
          },
          roleOptions: [
            { value: "all", label: "All roles" },
            { value: "admin", label: "Admin" },
            { value: "expert", label: "Expert" },
            { value: "both", label: "Admin & Expert" },
            { value: "viewer", label: "Viewer" },
          ],
          stageOptions: [
            { value: "all", label: "All stages" },
            ...Object.values(ACTIVE_STAGE_META).map((stage) => ({
              value: stage.key,
              label: stage.label,
            })),
          ],
          actionOptions: [
            { value: "all", label: "All actions" },
            { value: "waitingExperts", label: "Waiting experts" },
            ...Object.values(ACTIVE_ACTION_META)
              .sort((a, b) => a.sortPriority - b.sortPriority)
              .map((action) => ({
                value: action.key,
                label: action.label,
              })),
            { value: "none", label: "No pending action" },
          ],
          sortOptions: [
            { value: "smart", label: "Smart" },
            { value: "nameAsc", label: "Name (A→Z)" },
            { value: "nameDesc", label: "Name (Z→A)" },
            { value: "deadlineSoon", label: "Deadline (soonest)" },
          ],
          counts: {
            roles: {},
            stages: {},
            actions: {},
          },
        },
      });
    }

    const [issues, allParticipations, alternatives, criteria, consensusPhases] =
      await Promise.all([
        Issue.find({ _id: { $in: issueIds } })
          .populate("model")
          .populate("admin", "email name")
          .lean(),
        Participation.find({ issue: { $in: issueIds } })
          .populate("expert", "email")
          .lean(),
        Alternative.find({ issue: { $in: issueIds } }).lean(),
        Criterion.find({ issue: { $in: issueIds } }).lean(),
        Consensus.find({ issue: { $in: issueIds } }, "issue phase").lean(),
      ]);

    const consensusPhaseCountMap = consensusPhases.reduce((acc, phaseDoc) => {
      const issueId = asId(phaseDoc.issue);
      acc[issueId] = (acc[issueId] || 0) + 1;
      return acc;
    }, {});

    const participationMap = allParticipations.reduce((acc, participation) => {
      const issueId = asId(participation.issue);
      if (!acc[issueId]) acc[issueId] = [];
      acc[issueId].push(participation);
      return acc;
    }, {});

    const alternativesMap = alternatives.reduce((acc, alternative) => {
      const issueId = asId(alternative.issue);
      if (!acc[issueId]) acc[issueId] = [];
      acc[issueId].push(alternative);
      return acc;
    }, {});

    const tasksByType = getEmptyTasksByType();

    const formattedIssues = issues.map((issue) => {
      const issueId = asId(issue._id);
      const issueParticipations = participationMap[issueId] || [];
      const evaluationStructure =
        issue.evaluationStructure || resolveEvaluationStructure(issue.model);

      const isValidUserId =
        Boolean(userId) &&
        userId !== "undefined" &&
        userId !== "null" &&
        userId !== "[object Object]";

      const adminId =
        typeof issue?.admin === "string"
          ? issue.admin
          : issue?.admin?._id
            ? asId(issue.admin._id)
            : "";

      const isAdminUser =
        isValidUserId &&
        ((adminId && adminId === userId) || adminIssueIdSet.has(issueId));

      const acceptedExperts = issueParticipations.filter(
        (participation) => participation.invitationStatus === "accepted"
      );
      const pendingExperts = issueParticipations.filter(
        (participation) => participation.invitationStatus === "pending"
      );
      const declinedExperts = issueParticipations.filter(
        (participation) => participation.invitationStatus === "declined"
      );

      const hasPending = pendingExperts.length > 0;
      const realParticipants = acceptedExperts;

      const totalAccepted = acceptedExperts.length;
      const weightsDone = acceptedExperts.filter(
        (participation) => participation.weightsCompleted
      ).length;
      const evalsDone = acceptedExperts.filter(
        (participation) => participation.evaluationCompleted
      ).length;

      const realWeightsDone = realParticipants.filter(
        (participation) => participation.weightsCompleted
      ).length;
      const realEvalsDone = realParticipants.filter(
        (participation) => participation.evaluationCompleted
      ).length;

      const isExpertAccepted = acceptedExperts.some(
        (participation) => asId(participation.expert?._id) === userId
      );

      const myParticipation =
        issueParticipations.find(
          (participation) => asId(participation.expert?._id) === userId
        ) || null;

      const issueAlternativeDocs = alternativesMap[issueId] || [];
      const orderedAlternativeDocs = orderDocsByIdList(
        issueAlternativeDocs,
        issue.alternativeOrder
      );
      const alternativeNames = orderedAlternativeDocs.map(
        (alternative) => alternative.name
      );

      const issueCriteriaDocs = criteria.filter(
        (criterion) => asId(criterion.issue) === issueId
      );

      const { criteriaTree, orderedLeafNodes } = buildIssueCriteriaTree(
        issueCriteriaDocs,
        issue
      );

      const weightsArray = issue.modelParameters?.weights || [];

      const finalWeightsById = orderedLeafNodes.reduce((acc, node, index) => {
        acc[node.id] = weightsArray[index] ?? null;
        return acc;
      }, {});

      const finalWeightsMap = orderedLeafNodes.reduce((acc, node, index) => {
        acc[node.name] = weightsArray[index] ?? null;
        return acc;
      }, {});

      decorateCriteriaTree(criteriaTree, finalWeightsById);

      const savedPhasesCount = consensusPhaseCountMap[issueId] || 0;
      const consensusCurrentPhase = savedPhasesCount + 1;

      const deadline = buildDeadlineInfo(issue.closureDate, dayjs);
      const stage = issue.currentStage;

      const allWeightsDone =
        realParticipants.length > 0 &&
        realWeightsDone === realParticipants.length;

      const allEvalsDone =
        realParticipants.length > 0 &&
        realEvalsDone === realParticipants.length;

      const waitingAdmin =
        !isAdminUser &&
        !hasPending &&
        ((stage === "weightsFinished" && allWeightsDone) ||
          (stage === "alternativeEvaluation" && allEvalsDone));

      const canComputeWeights =
        stage === "weightsFinished" &&
        isAdminUser &&
        !hasPending &&
        realParticipants.length > 0 &&
        allWeightsDone;

      const canResolveIssue =
        stage === "alternativeEvaluation" &&
        isAdminUser &&
        !hasPending &&
        realParticipants.length > 0 &&
        allEvalsDone;

      const canEvaluateWeights =
        stage === "criteriaWeighting" &&
        isExpertAccepted &&
        realParticipants.some(
          (participation) =>
            asId(participation.expert?._id) === userId &&
            !participation.weightsCompleted
        );

      const canEvaluateAlternatives =
        stage === "alternativeEvaluation" &&
        isExpertAccepted &&
        realParticipants.some(
          (participation) =>
            asId(participation.expert?._id) === userId &&
            !participation.evaluationCompleted
        );

      const waitingExperts =
        (hasPending && stage !== "finished") ||
        (!waitingAdmin &&
          !canResolveIssue &&
          !canComputeWeights &&
          !canEvaluateWeights &&
          !canEvaluateAlternatives &&
          stage !== "finished");

      const statusFlags = {
        canEvaluateWeights,
        canComputeWeights,
        canEvaluateAlternatives,
        canResolveIssue,
        waitingAdmin,
        waitingExperts,
      };

      const actions = [];
      if (canResolveIssue) actions.push(ACTIVE_ACTION_META.resolveIssue);
      if (canComputeWeights) actions.push(ACTIVE_ACTION_META.computeWeights);
      if (canEvaluateWeights) actions.push(ACTIVE_ACTION_META.evaluateWeights);
      if (canEvaluateAlternatives) {
        actions.push(ACTIVE_ACTION_META.evaluateAlternatives);
      }

      actions.sort((a, b) => a.sortPriority - b.sortPriority);

      const nextAction = actions[0] ?? null;

      let statusLabel = ACTIVE_STAGE_META[stage]?.label ?? stage;
      let statusKey = stage;

      if (stage === "finished") {
        statusLabel = "Finished";
        statusKey = "finished";
      } else if (waitingAdmin) {
        statusLabel = "Waiting for admin";
        statusKey = "waitingAdmin";
      } else if (nextAction) {
        statusLabel = nextAction.label;
        statusKey = nextAction.key;
      } else {
        statusLabel = "Waiting experts";
        statusKey = "waitingExperts";
      }

      const sortPriority = waitingAdmin
        ? ACTIVE_ACTION_META.waitingAdmin?.sortPriority ?? 60
        : nextAction
          ? nextAction.sortPriority
          : 80;

      for (const action of actions) {
        if (!ACTIVE_TASK_ACTION_KEYS.includes(action.key)) continue;
        if (action.role === "admin" && !isAdminUser) continue;
        if (action.role === "expert" && !isExpertAccepted) continue;

        tasksByType[action.key].push({
          issueId,
          issueName: issue.name,
          stage,
          role: action.role,
          severity: action.severity,
          actionKey: action.key,
          actionLabel: action.label,
          sortPriority: action.sortPriority,
          deadline,
        });
      }

      const participatedExperts =
        stage === "criteriaWeighting" || stage === "weightsFinished"
          ? acceptedExperts.filter((participation) => participation.weightsCompleted === true)
          : acceptedExperts.filter((participation) => participation.evaluationCompleted === true);

      const acceptedButNotEvaluated =
        stage === "criteriaWeighting" || stage === "weightsFinished"
          ? acceptedExperts.filter((participation) => !participation.weightsCompleted)
          : acceptedExperts.filter((participation) => !participation.evaluationCompleted);

      const evaluated = participatedExperts
        .map((participation) => asId(participation.expert?._id))
        .includes(userId);

      const role =
        isAdminUser && isExpertAccepted
          ? "both"
          : isAdminUser
            ? "admin"
            : isExpertAccepted
              ? "expert"
              : "viewer";

      const responseModelParameters = cleanModelParameters(issue.modelParameters);

      const hasDirectWeights = detectHasDirectWeights(issue);
      const hasAlternativeConsensus =
        detectHasAlternativeConsensusEnabled(issue);

      const workflowSteps = buildWorkflowStepsStable({
        hasDirectWeights,
        hasAlternativeConsensus,
      });

      return {
        id: issueId,
        name: issue.name,
        creator: issue.admin?.email,
        description: issue.description,
        model: issue.model,
        evaluationStructure,
        isPairwise:
          evaluationStructure ===
          EVALUATION_STRUCTURES.PAIRWISE_ALTERNATIVES,
        isConsensus: Boolean(issue.isConsensus),
        currentStage: stage,
        weightingMode: issue.weightingMode,
        ...(issue.model?.isConsensus && {
          consensusMaxPhases: issue.consensusMaxPhases || "Unlimited",
          consensusThreshold: issue.consensusThreshold,
          consensusCurrentPhase,
        }),
        creationDate: issue.creationDate || null,
        closureDate: issue.closureDate || null,
        isAdmin: isAdminUser,
        isExpert: isExpertAccepted,
        role,
        alternatives: alternativeNames,
        criteria: criteriaTree,
        evaluated,
        totalExperts:
          participatedExperts.length +
          pendingExperts.length +
          declinedExperts.length +
          acceptedButNotEvaluated.length,
        participatedExperts: participatedExperts.map((p) => p.expert.email).sort(),
        pendingExperts: pendingExperts.map((p) => p.expert.email).sort(),
        notAcceptedExperts: declinedExperts.map((p) => p.expert.email).sort(),
        acceptedButNotEvaluatedExperts: acceptedButNotEvaluated
          .map((p) => p.expert.email)
          .sort(),
        statusFlags,
        progress: {
          weightsDone,
          evalsDone,
          totalAccepted,
        },
        finalWeights: finalWeightsMap,
        modelParameters: responseModelParameters,
        myParticipation: myParticipation
          ? {
            invitationStatus: myParticipation.invitationStatus,
            weightsCompleted: Boolean(myParticipation.weightsCompleted),
            evaluationCompleted: Boolean(myParticipation.evaluationCompleted),
            joinedAt: myParticipation.joinedAt || null,
          }
          : null,
        actions,
        nextAction,
        ui: {
          stage,
          stageLabel: ACTIVE_STAGE_META[stage]?.label ?? stage,
          stageColorKey: ACTIVE_STAGE_META[stage]?.colorKey ?? "default",
          statusKey,
          statusLabel,
          sortPriority,
          deadline,
          hasDirectWeights,
          hasAlternativeConsensus,
          workflowSteps,
          permissions: {
            evaluateWeights: canEvaluateWeights,
            evaluateAlternatives: canEvaluateAlternatives,
            computeWeights: canComputeWeights,
            resolveIssue: canResolveIssue,
            waitingAdmin,
            waitingExperts: statusKey === "waitingExperts",
          },
          modelParameters: responseModelParameters,
        },
      };
    });

    formattedIssues.sort((a, b) => {
      const aPriority = a.ui?.sortPriority ?? 90;
      const bPriority = b.ui?.sortPriority ?? 90;
      if (aPriority !== bPriority) return aPriority - bPriority;

      const aDeadline = a.ui?.deadline?.hasDeadline
        ? a.ui.deadline.daysLeft
        : 999999;
      const bDeadline = b.ui?.deadline?.hasDeadline
        ? b.ui.deadline.daysLeft
        : 999999;
      if (aDeadline !== bDeadline) return aDeadline - bDeadline;

      return String(a.name).localeCompare(String(b.name));
    });

    for (const actionKey of ACTIVE_TASK_ACTION_KEYS) {
      (tasksByType[actionKey] || []).sort((a, b) => {
        if (a.sortPriority !== b.sortPriority) {
          return a.sortPriority - b.sortPriority;
        }

        const aDeadline = a.deadline?.hasDeadline ? a.deadline.daysLeft : 999999;
        const bDeadline = b.deadline?.hasDeadline ? b.deadline.daysLeft : 999999;
        if (aDeadline !== bDeadline) return aDeadline - bDeadline;

        return String(a.issueName).localeCompare(String(b.issueName));
      });
    }

    const totalTasks = ACTIVE_TASK_ACTION_KEYS.reduce(
      (acc, key) => acc + (tasksByType[key]?.length || 0),
      0
    );

    const taskCenterSections = Object.values(ACTIVE_ACTION_META)
      .filter((action) => ACTIVE_TASK_ACTION_KEYS.includes(action.key))
      .sort((a, b) => a.sortPriority - b.sortPriority)
      .map((action) => {
        const items = tasksByType[action.key] || [];

        return {
          key: action.key,
          title: action.label,
          role: action.role,
          severity: action.severity,
          sortPriority: action.sortPriority,
          count: items.length,
          items,
        };
      })
      .filter((section) => section.count > 0);

    const taskCenter = {
      total: totalTasks,
      sections: taskCenterSections,
    };

    const roleCounts = {};
    const stageCounts = {};
    const actionCounts = {};

    for (const issue of formattedIssues) {
      incrementCounter(roleCounts, issue.role || "viewer");
      incrementCounter(stageCounts, issue.ui?.stage || issue.currentStage || "unknown");

      const actionKey = issue.ui?.statusKey || issue.nextAction?.key || "none";
      incrementCounter(actionCounts, actionKey);
    }

    const filtersMeta = {
      defaults: {
        role: "all",
        stage: "all",
        action: "all",
        q: "",
      },
      roleOptions: [
        { value: "all", label: "All roles" },
        { value: "admin", label: "Admin" },
        { value: "expert", label: "Expert" },
        { value: "both", label: "Admin & Expert" },
        { value: "viewer", label: "Viewer" },
      ],
      stageOptions: [
        { value: "all", label: "All stages" },
        ...Object.values(ACTIVE_STAGE_META).map((stage) => ({
          value: stage.key,
          label: stage.label,
        })),
      ],
      actionOptions: [
        { value: "all", label: "All actions" },
        { value: "waitingExperts", label: "Waiting experts" },
        ...Object.values(ACTIVE_ACTION_META)
          .sort((a, b) => a.sortPriority - b.sortPriority)
          .map((action) => ({
            value: action.key,
            label: action.label,
          })),
        { value: "none", label: "No pending action" },
      ],
      sortOptions: [
        { value: "nameAsc", label: "Name (A→Z)" },
        { value: "nameDesc", label: "Name (Z→A)" },
        { value: "deadlineSoon", label: "Deadline (soonest)" },
      ],
      counts: {
        roles: roleCounts,
        stages: stageCounts,
        actions: actionCounts,
      },
    };

    return res.json({
      success: true,
      issues: formattedIssues,
      tasks: {
        total: totalTasks,
        byType: tasksByType,
      },
      taskCenter,
      filtersMeta,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      msg: "Error fetching active issues",
    });
  }
};

/**
 * Elimina un issue activo y todos sus datos relacionados.
 *
 * @param {import("express").Request} req Request de Express.
 * @param {import("express").Response} res Response de Express.
 * @returns {Promise<void>}
 */
export const removeIssue = async (req, res) => {
  const { id } = req.body;
  const userId = req.uid;

  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      const issue = await Issue.findById(id).session(session);

      if (!issue) {
        throw createHttpError(404, "Issue not found");
      }

      if (issue.admin.toString() !== userId) {
        throw createHttpError(403, "You are not the admin of this issue");
      }

      if (!issue.active) {
        throw createHttpError(
          400,
          "Issue is not active and cannot be deleted"
        );
      }

      await Promise.all([
        Evaluation.deleteMany({ issue: issue._id }).session(session),
        Alternative.deleteMany({ issue: issue._id }).session(session),
        Criterion.deleteMany({ issue: issue._id }).session(session),
        Participation.deleteMany({ issue: issue._id }).session(session),
        Consensus.deleteMany({ issue: issue._id }).session(session),
        Notification.deleteMany({ issue: issue._id }).session(session),
        IssueExpressionDomain.deleteMany({ issue: issue._id }).session(session),
      ]);

      await Issue.deleteOne({ _id: issue._id }).session(session);
    });

    return res.status(200).json({
      success: true,
      msg: `Issue ${(await Issue.findById(id).select("name").lean())?.name || ""} removed`,
    });
  } catch (error) {
    await abortTransactionSafely(session);
    console.error(error);

    if (error?.status) {
      return res.status(error.status).json({
        success: false,
        msg: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      msg: "An error occurred while deleting the issue",
      error: error.message,
    });
  } finally {
    await endSessionSafely(session);
  }
};

/**
 * Elimina un dominio de expresión del usuario actual.
 *
 * @param {import("express").Request} req Request de Express.
 * @param {import("express").Response} res Response de Express.
 * @returns {Promise<void>}
 */
export const removeExpressionDomain = async (req, res) => {
  const { id } = req.body;

  try {
    const domain = await ExpressionDomain.findById(id);

    if (!domain) {
      return res.status(404).json({
        success: false,
        msg: "Domain not found",
      });
    }

    if (domain.isGlobal || domain.user === null) {
      return res.status(403).json({
        success: false,
        msg: "Global domains are predefined and cannot be deleted.",
      });
    }

    if (String(domain.user) !== req.uid) {
      return res.status(403).json({
        success: false,
        msg: "Not authorized to delete this domain",
      });
    }

    await domain.deleteOne();

    return res.status(200).json({
      success: true,
      msg: "Domain deleted",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      msg: "Error deleting domain",
    });
  }
};

/**
 * Actualiza un dominio de expresión del usuario actual.
 *
 * @param {import("express").Request} req Request de Express.
 * @param {import("express").Response} res Response de Express.
 * @returns {Promise<void>}
 */
export const updateExpressionDomain = async (req, res) => {
  const { id, updatedDomain } = req.body;
  const userId = req.uid;

  if (!id || !updatedDomain) {
    return res.status(400).json({
      success: false,
      msg: "Missing required fields",
    });
  }

  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      const domain = await ExpressionDomain.findById(id).session(session);

      if (!domain) {
        throw createHttpError(404, "Domain not found");
      }

      if (domain.isGlobal || domain.user === null) {
        throw createHttpError(
          403,
          "Global domains are predefined and cannot be edited."
        );
      }

      if (String(domain.user) !== userId) {
        throw createHttpError(403, "Not authorized");
      }

      if (updatedDomain.name) {
        domain.name = String(updatedDomain.name).trim();
      }

      if (updatedDomain.type) {
        domain.type = String(updatedDomain.type).trim();
      }

      if (updatedDomain.numericRange) {
        domain.numericRange = updatedDomain.numericRange;
      }

      if (updatedDomain.linguisticLabels) {
        domain.linguisticLabels = updatedDomain.linguisticLabels;
      }

      await domain.save({ session });
    });

    const updated = await ExpressionDomain.findById(id);

    return res.status(200).json({
      success: true,
      msg: "Domain updated successfully",
      data: updated,
    });
  } catch (error) {
    await abortTransactionSafely(session);
    console.error(error);

    if (error?.status) {
      return res.status(error.status).json({
        success: false,
        msg: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      msg: "An error occurred while updating the domain",
      error: error.message,
    });
  } finally {
    await endSessionSafely(session);
  }
};

/**
 * Obtiene todos los issues finalizados visibles para el usuario actual.
 *
 * @param {import("express").Request} req Request de Express.
 * @param {import("express").Response} res Response de Express.
 * @returns {Promise<void>}
 */
export const getAllFinishedIssues = async (req, res) => {
  try {
    const userId = req.uid;
    const issueIds = await getUserFinishedIssueIds(userId);

    if (issueIds.length === 0) {
      return res.json({
        success: true,
        issues: [],
      });
    }

    const issues = await Issue.find({ _id: { $in: issueIds } })
      .populate("model", "name")
      .populate("admin", "email")
      .lean();

    const formattedIssues = issues.map((issue) => ({
      id: issue._id.toString(),
      name: issue.name,
      description: issue.description,
      creationDate: issue.creationDate,
      closureDate: issue.closureDate ?? null,
      isAdmin: issue.admin._id.toString() === userId,
    }));

    return res.json({
      success: true,
      issues: formattedIssues,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      msg: "Error fetching finished issues",
    });
  }
};

/**
 * Obtiene las notificaciones del usuario actual.
 *
 * @param {import("express").Request} req Request de Express.
 * @param {import("express").Response} res Response de Express.
 * @returns {Promise<void>}
 */
export const getNotifications = async (req, res) => {
  const userId = req.uid;

  try {
    const [notifications, participations] = await Promise.all([
      Notification.find({ expert: userId })
        .sort({ createdAt: -1 })
        .populate("expert", "email")
        .populate("issue", "name"),
      Participation.find({ expert: userId }),
    ]);

    const formattedNotifications = notifications.map((notification) => {
      const participation = participations.find(
        (item) =>
          item.issue.toString() === notification.issue?._id?.toString()
      );

      let responseStatus = false;

      if (participation) {
        if (participation.invitationStatus === "accepted") {
          responseStatus = "Invitation accepted";
        } else if (participation.invitationStatus === "declined") {
          responseStatus = "Invitation declined";
        }
      }

      return {
        _id: notification._id,
        header:
          notification.type === "invitation"
            ? "Invitation"
            : notification.issue?.name,
        message: notification.message,
        userEmail: notification.expert
          ? notification.expert.email
          : "Usuario eliminado",
        issueName: notification.issue
          ? notification.issue.name
          : "Problema eliminado",
        issueId: notification.issue ? notification.issue._id : null,
        requiresAction: notification.requiresAction,
        read: notification.read ?? false,
        createdAt: notification.createdAt,
        responseStatus,
      };
    });

    return res.status(200).json({
      success: true,
      notifications: formattedNotifications,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      msg: "An error occurred while getting notifications",
    });
  }
};

/**
 * Marca como leídas todas las notificaciones no leídas del usuario actual.
 *
 * @param {import("express").Request} req Request de Express.
 * @param {import("express").Response} res Response de Express.
 * @returns {Promise<void>}
 */
export const markAllNotificationsAsRead = async (req, res) => {
  const userId = req.uid;

  try {
    await Notification.updateMany(
      { expert: userId, read: false },
      { read: true }
    );

    return res.status(200).json({
      success: true,
      msg: "Notifications marked as read",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      msg: "An error occurred while updating notifications",
    });
  }
};

/**
 * Cambia el estado de invitación del usuario actual para un issue.
 *
 * @param {import("express").Request} req Request de Express.
 * @param {import("express").Response} res Response de Express.
 * @returns {Promise<void>}
 */
export const changeInvitationStatus = async (req, res) => {
  const userId = req.uid;
  const { id, action } = req.body;

  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      const issue = await Issue.findById(id).session(session);
      if (!issue) {
        throw createHttpError(404, "Issue not found");
      }

      const participation = await Participation.findOne({
        issue: issue._id,
        expert: userId,
      }).session(session);

      if (!participation) {
        throw createHttpError(
          404,
          "No participation found for the user in this issue"
        );
      }

      participation.invitationStatus = action;

      if (action === "accepted") {
        participation.evaluationCompleted = false;
      }

      await participation.save({ session });
    });

    const issue = await Issue.findById(id).select("name").lean();

    const message =
      action === "accepted"
        ? `Invitation to issue ${issue?.name} accepted`
        : `Invitation to issue ${issue?.name} declined`;

    return res.status(200).json({
      success: true,
      msg: message,
    });
  } catch (error) {
    await abortTransactionSafely(session);
    console.error(error);

    if (error?.status) {
      return res.status(error.status).json({
        success: false,
        msg: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      msg: "An error occurred while updating invitation status",
    });
  } finally {
    await endSessionSafely(session);
  }
};

/**
 * Elimina una notificación concreta del usuario actual.
 *
 * @param {import("express").Request} req Request de Express.
 * @param {import("express").Response} res Response de Express.
 * @returns {Promise<void>}
 */
export const removeNotificationById = async (req, res) => {
  const userId = req.uid;
  const { notificationId } = req.body;

  try {
    const notification = await Notification.findOne({
      _id: notificationId,
      expert: userId,
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        msg: "Notification not found",
      });
    }

    await Notification.deleteOne({ _id: notificationId });

    return res.status(200).json({
      success: true,
      msg: "Message removed",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      msg: "An error occurred while removing notification",
    });
  }
};


/**
 * Construye las matrices pairwise por experto y criterio para resolver un issue.
 *
 * @param {object} params Parámetros de entrada.
 * @param {mongoose.Types.ObjectId | string} params.issueId Id del issue.
 * @param {Array<Record<string, any>>} params.alternatives Alternativas ordenadas.
 * @param {Array<Record<string, any>>} params.criteria Criterios hoja ordenados.
 * @param {Array<Record<string, any>>} params.participations Participaciones aceptadas con expert populado.
 * @returns {Promise<Record<string, Record<string, Array<Array<any>>>>>>}
 */
const buildPairwiseMatrices = async ({
  issueId,
  alternatives,
  criteria,
  participations,
}) => {
  const matrices = {};

  await Promise.all(
    participations.map(async (participation) => {
      const expertEmail = participation.expert.email;
      matrices[expertEmail] = {};

      await Promise.all(
        criteria.map(async (criterion) => {
          const matrixSize = alternatives.length;

          const pairwiseMatrix = Array.from({ length: matrixSize }, (_, i) =>
            Array.from({ length: matrixSize }, (_, j) => (i === j ? 0.5 : null))
          );

          const evaluations = await Evaluation.find({
            issue: issueId,
            expert: participation.expert._id,
            criterion: criterion._id,
          }).populate("alternative comparedAlternative");

          for (const evaluation of evaluations) {
            if (!evaluation.comparedAlternative) {
              continue;
            }

            const rowIndex = alternatives.findIndex((alternative) =>
              alternative._id.equals(evaluation.alternative._id)
            );
            const colIndex = alternatives.findIndex((alternative) =>
              alternative._id.equals(evaluation.comparedAlternative._id)
            );

            if (rowIndex !== -1 && colIndex !== -1) {
              pairwiseMatrix[rowIndex][colIndex] = evaluation.value;
            }
          }

          matrices[expertEmail][criterion.name] = pairwiseMatrix;
        })
      );
    })
  );

  return matrices;
};

/**
 * Guarda borradores de evaluaciones pairwise del experto actual.
 *
 * @param {import("express").Request} req Request de Express.
 * @param {import("express").Response} [res] Response de Express.
 * @returns {Promise<object | void>}
 */
export const savePairwiseEvaluations = async (req, res) => {
  const userId = req.uid;

  try {
    const { id, evaluations } = req.body;

    const issue = await Issue.findById(id).lean();
    if (!issue) {
      const response = { success: false, msg: "Issue not found" };
      return res ? res.status(404).json(response) : response;
    }

    const evaluationStructure = resolveEvaluationStructure(issue);

    if (evaluationStructure !== EVALUATION_STRUCTURES.PAIRWISE_ALTERNATIVES) {
      const response = {
        success: false,
        msg: "This issue does not use pairwise alternative evaluation",
      };
      return res ? res.status(400).json(response) : response;
    }

    const defaultSnapshot = await getDefaultIssueSnapshot(issue._id);
    if (!defaultSnapshot) {
      const response = {
        success: false,
        msg: "This issue has no IssueExpressionDomain snapshots.",
      };
      return res ? res.status(400).json(response) : response;
    }

    const participation = await Participation.findOne({
      issue: issue._id,
      expert: userId,
      invitationStatus: "accepted",
    });

    if (!participation) {
      const response = {
        success: false,
        msg: "You are no longer a participant in this issue",
      };
      return res ? res.status(403).json(response) : response;
    }

    const [alternatives, criteria, currentPhase] = await Promise.all([
      Alternative.find({ issue: issue._id }).sort({ name: 1 }).lean(),
      Criterion.find({ issue: issue._id }).lean(),
      getNextConsensusPhase(issue._id),
    ]);

    const alternativeMap = new Map(
      alternatives.map((alternative) => [alternative.name, alternative._id])
    );
    const criterionMap = new Map(
      criteria.map((criterion) => [criterion.name, criterion._id])
    );

    const bulkOperations = [];
    const usedSnapshotIds = new Set();

    for (const [criterionName, evaluationsByAlternative] of Object.entries(
      evaluations || {}
    )) {
      const criterionId = criterionMap.get(criterionName);
      if (!criterionId) continue;

      for (const evaluationData of evaluationsByAlternative || []) {
        const { id: alternativeName, ...rest } = evaluationData || {};
        const alternativeId = alternativeMap.get(alternativeName);
        if (!alternativeId) continue;

        const snapshotId =
          rest?.expressionDomain?.id ||
          rest?.domain?.id ||
          String(defaultSnapshot._id);

        if (snapshotId) {
          usedSnapshotIds.add(String(snapshotId));
        }

        const comparisons = { ...rest };
        delete comparisons.expressionDomain;
        delete comparisons.domain;

        for (const [comparedAlternativeName, valueOrObj] of Object.entries(
          comparisons
        )) {
          if (comparedAlternativeName === alternativeName) continue;

          const comparedAlternativeId =
            alternativeMap.get(comparedAlternativeName);
          if (!comparedAlternativeId) continue;

          const value =
            valueOrObj &&
            typeof valueOrObj === "object" &&
            "value" in valueOrObj
              ? valueOrObj.value
              : valueOrObj;

          bulkOperations.push({
            updateOne: {
              filter: {
                expert: userId,
                alternative: alternativeId,
                comparedAlternative: comparedAlternativeId,
                criterion: criterionId,
              },
              update: {
                $set: {
                  value,
                  expressionDomain: snapshotId,
                  timestamp: new Date(),
                  issue: issue._id,
                  consensusPhase: currentPhase,
                },
              },
              upsert: true,
            },
          });
        }
      }
    }

    if (usedSnapshotIds.size > 0) {
      const snapshotIds = Array.from(usedSnapshotIds);

      const count = await IssueExpressionDomain.countDocuments({
        _id: { $in: snapshotIds },
        issue: issue._id,
      });

      if (count !== snapshotIds.length) {
        const response = {
          success: false,
          msg: "Invalid expressionDomain snapshot for this issue",
        };
        return res ? res.status(400).json(response) : response;
      }
    }

    if (bulkOperations.length > 0) {
      await Evaluation.bulkWrite(bulkOperations);
    }

    const successResponse = {
      success: true,
      msg: "Evaluations saved successfully",
    };

    return res ? res.status(200).json(successResponse) : successResponse;
  } catch (error) {
    console.error(error);

    const errorResponse = {
      success: false,
      msg: "An error occurred while saving evaluations",
    };

    return res ? res.status(500).json(errorResponse) : errorResponse;
  }
};

/**
 * Obtiene las evaluaciones pairwise del experto actual para un issue.
 *
 * @param {import("express").Request} req Request de Express.
 * @param {import("express").Response} res Response de Express.
 * @returns {Promise<void>}
 */
export const getPairwiseEvaluations = async (req, res) => {
  const userId = req.uid;

  try {
    const { id } = req.body;

    const issue = await Issue.findById(id);
    if (!issue) {
      return res.status(404).json({
        success: false,
        msg: "Issue not found",
      });
    }

    const evaluationStructure = resolveEvaluationStructure(issue);

    if (evaluationStructure !== EVALUATION_STRUCTURES.PAIRWISE_ALTERNATIVES) {
      return res.status(400).json({
        success: false,
        msg: "This issue does not use pairwise alternative evaluation",
      });
    }

    const [evaluations, latestConsensus] = await Promise.all([
      Evaluation.find({
        issue: issue._id,
        expert: userId,
        value: { $ne: null },
      })
        .populate("alternative")
        .populate("comparedAlternative")
        .populate("criterion")
        .populate("expressionDomain"),
      Consensus.findOne({ issue: issue._id }).sort({ phase: -1 }),
    ]);

    const formattedEvaluations = formatPairwiseEvaluationsByCriterion(evaluations);

    return res.status(200).json({
      success: true,
      evaluations: formattedEvaluations,
      collectiveEvaluations: latestConsensus?.collectiveEvaluations || null,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      msg: "An error occurred while fetching evaluations",
    });
  }
};

/**
 * Valida, guarda y envía las evaluaciones pairwise del experto actual.
 *
 * @param {import("express").Request} req Request de Express.
 * @param {import("express").Response} res Response de Express.
 * @returns {Promise<void>}
 */
export const submitPairwiseEvaluations = async (req, res) => {
  const userId = req.uid;

  try {
    const { id, evaluations } = req.body;

    const validation = validateFinalPairwiseEvaluations(evaluations);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        criterion: validation.error.criterion,
        msg: validation.error.message,
      });
    }

    const saveResult = await savePairwiseEvaluations(req);
    if (!saveResult.success) {
      return res.status(500).json({
        success: false,
        msg: saveResult.msg,
      });
    }

    const issue = await Issue.findById(id).lean();
    if (!issue) {
      return res.status(404).json({
        success: false,
        msg: "Issue not found",
      });
    }

    const participation = await Participation.findOneAndUpdate(
      { issue: issue._id, expert: userId },
      { $set: { evaluationCompleted: true } },
      { new: true }
    );

    if (!participation) {
      return res.status(404).json({
        success: false,
        msg: "Participation not found",
      });
    }

    return res.status(200).json({
      success: true,
      msg: "Evaluations submitted successfully",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      msg: "An error occurred while sending evaluations",
    });
  }
};

/**
 * Resuelve un issue pairwise y gestiona el flujo de consenso si aplica.
 *
 * @param {import("express").Request} req Request de Express.
 * @param {import("express").Response} res Response de Express.
 * @returns {Promise<void>}
 */
export const resolvePairwiseIssue = async (req, res) => {
  const userId = req.uid;

  try {
    const { id, forceFinalize = false } = req.body;

    const issue = await Issue.findById(id);
    if (!issue) {
      return res.status(404).json({
        success: false,
        msg: "Issue not found",
      });
    }

    const evaluationStructure = resolveEvaluationStructure(issue);

    if (evaluationStructure !== EVALUATION_STRUCTURES.PAIRWISE_ALTERNATIVES) {
      return res.status(400).json({
        success: false,
        msg: "This issue must be resolved with the direct resolver",
      });
    }

    if (issue.admin.toString() !== userId) {
      return res.status(403).json({
        success: false,
        msg: "Unauthorized: Only the issue creator can resolve it",
      });
    }

    const pendingEvaluations = await Participation.find({
      issue: issue._id,
      evaluationCompleted: false,
      invitationStatus: "accepted",
    });

    if (pendingEvaluations.length > 0) {
      return res.status(400).json({
        success: false,
        msg: "Not all experts have completed their evaluations",
      });
    }

    await ensureIssueOrdersDb({ issueId: issue._id });

    const [alternatives, criteria, participations] = await Promise.all([
      getOrderedAlternativesDb({
        issueId: issue._id,
        issueDoc: issue,
        select: "_id name",
        lean: true,
      }),
      getOrderedLeafCriteriaDb({
        issueId: issue._id,
        issueDoc: issue,
        select: "_id name",
        lean: true,
      }),
      Participation.find({
        issue: issue._id,
        invitationStatus: "accepted",
      }).populate("expert"),
    ]);

    const matrices = await buildPairwiseMatrices({
      issueId: issue._id,
      alternatives,
      criteria,
      participations,
    });

    const apimodelsUrl =
      process.env.ORIGIN_APIMODELS || "http://localhost:7000";
    const normalizedParams = normalizeParams(issue.modelParameters);

    const response = await axios.post(
      `${apimodelsUrl}/herrera_viedma_crp`,
      {
        matrices,
        consensusThreshold: issue.consensusThreshold,
        modelParameters: normalizedParams,
      },
      {
        headers: { "Content-Type": "application/json" },
      }
    );

    console.log("Response from API:", response.data);

    const {
      success,
      msg,
      results: {
        alternatives_rankings,
        cm,
        collective_evaluations,
        plots_graphic,
        collective_scores,
      } = {},
    } = response.data;

    if (!success) {
      return res.status(400).json({
        success: false,
        msg,
      });
    }

    const expertPointsMap = {};
    participations.forEach((participation, index) => {
      expertPointsMap[participation.expert.email] =
        plots_graphic?.expert_points?.[index];
    });

    const plotsGraphicWithEmails = {
      expert_points: expertPointsMap,
      collective_point: plots_graphic?.collective_point,
    };

    const alternativeNames = alternatives.map((alternative) => alternative.name);

    const rankedWithScores = alternatives_rankings.map((index) => ({
      name: alternativeNames[index],
      score: collective_scores?.[index] ?? null,
    }));

    const transformedCollectiveEvaluations = {};

    criteria.forEach((criterion) => {
      const matrix = collective_evaluations?.[criterion.name];
      if (!matrix) return;

      transformedCollectiveEvaluations[criterion.name] = matrix.map(
        (row, rowIndex) => {
          const formattedRow = { id: alternatives[rowIndex].name };

          row.forEach((value, colIndex) => {
            formattedRow[alternatives[colIndex].name] = value;
          });

          return formattedRow;
        }
      );
    });

    const currentPhase = await getNextConsensusPhase(issue._id);

    const consensus = new Consensus({
      issue: issue._id,
      phase: currentPhase,
      level: cm,
      timestamp: new Date(),
      collectiveEvaluations: transformedCollectiveEvaluations,
      details: {
        rankedAlternatives: rankedWithScores,
        matrices,
        collective_scores: Object.fromEntries(
          alternativeNames.map((name, index) => [
            name,
            collective_scores?.[index] ?? null,
          ])
        ),
        collective_ranking: rankedWithScores.map((item) => item.name),
        plotsGraphic: plotsGraphicWithEmails,
      },
    });

    await consensus.save();

    await Promise.all(
      participations.map(async (participation) => {
        await Promise.all(
          criteria.map(async (criterion) => {
            const evaluations = await Evaluation.find({
              issue: issue._id,
              expert: participation.expert._id,
              criterion: criterion._id,
            });

            for (const evaluation of evaluations) {
              if (evaluation.consensusPhase !== null) {
                evaluation.history.push({
                  phase: evaluation.consensusPhase,
                  value: evaluation.value,
                  timestamp: evaluation.timestamp,
                });
              }

              evaluation.consensusPhase = currentPhase + 1;
              evaluation.timestamp = new Date();

              await evaluation.save();
            }
          })
        );
      })
    );

    if (issue.isConsensus && forceFinalize) {
      issue.active = false;
      await issue.save();

      return res.status(200).json({
        success: true,
        finished: true,
        msg: `Issue '${issue.name}' resolved as final round due to closure date.`,
        rankedAlternatives: rankedWithScores,
      });
    }

    if (issue.consensusMaxPhases && currentPhase >= issue.consensusMaxPhases) {
      issue.active = false;
      await issue.save();

      return res.status(200).json({
        success: true,
        finished: true,
        msg: `Issue '${issue.name}' resolved: maximum number of consensus rounds reached.`,
        rankedAlternatives: rankedWithScores,
      });
    }

    if (cm >= issue.consensusThreshold) {
      issue.active = false;
      issue.currentStage = "finished";
      await issue.save();

      return res.status(200).json({
        success: true,
        finished: true,
        msg: `Issue '${issue.name}' resolved: consensus threshold ${issue.consensusThreshold} reached.`,
        rankedAlternatives: rankedWithScores,
      });
    }

    await Participation.updateMany(
      { issue: issue._id },
      { $set: { evaluationCompleted: false } }
    );

    return res.status(200).json({
      success: true,
      finished: false,
      msg: `Issue '${issue.name}' conensus threshold not reached. Another round is needed.`,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      msg: "An error occurred while resolving the issue",
    });
  }
};

/**
 * Oculta un issue finalizado para el usuario actual y elimina sus datos
 * si todos los participantes ya lo han ocultado.
 *
 * @param {import("express").Request} req Request de Express.
 * @param {import("express").Response} res Response de Express.
 * @returns {Promise<void>}
 */
export const removeFinishedIssue = async (req, res) => {
  const { id } = req.body;
  const userId = req.uid;

  try {
    const issue = await Issue.findById(id);

    if (!issue) {
      return res.status(404).json({
        success: false,
        msg: "Issue not found",
      });
    }

    if (issue.active) {
      return res.status(400).json({
        success: false,
        msg: "Issue is still active",
      });
    }

    const currentPhase = await getNextConsensusPhase(issue._id);
    const stageForLog = mapIssueStageToExitStage(issue.currentStage);

    await registerUserExit({
      issueId: issue._id,
      userId,
      phase: currentPhase,
      stage: stageForLog,
      reason: "Issue finished and removed for user",
    });

    const [participants, exits] = await Promise.all([
      Participation.find({ issue: issue._id }),
      ExitUserIssue.find({ issue: issue._id, hidden: true }),
    ]);

    const allUsersHaveHidden = participants.every((participation) =>
      exits.some(
        (exit) => exit.user.toString() === participation.expert.toString()
      )
    );

    if (allUsersHaveHidden) {
      await Promise.all([
        Evaluation.deleteMany({ issue: issue._id }),
        Alternative.deleteMany({ issue: issue._id }),
        Criterion.deleteMany({ issue: issue._id }),
        Participation.deleteMany({ issue: issue._id }),
        Consensus.deleteMany({ issue: issue._id }),
        Notification.deleteMany({ issue: issue._id }),
        ExitUserIssue.deleteMany({ issue: issue._id }),
        IssueExpressionDomain.deleteMany({ issue: issue._id }),
      ]);

      await Issue.deleteOne({ _id: issue._id });
    }

    return res.status(200).json({
      success: true,
      msg: `Issue ${issue.name} removed`,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      msg: "An error occurred while removing the issue",
      error: error.message,
    });
  }
};

/**
 * Añade o expulsa expertos de un issue activo.
 *
 * @param {import("express").Request} req Request de Express.
 * @param {import("express").Response} res Response de Express.
 * @returns {Promise<void>}
 */
export const editExperts = async (req, res) => {
  const { id, expertsToAdd, expertsToRemove } = req.body;
  const userId = req.uid;

  try {
    const issue = await Issue.findById(id).populate("model");

    if (!issue) {
      return res.status(404).json({
        success: false,
        msg: "Issue not found",
      });
    }

    if (!issue.admin.equals(userId)) {
      return res.status(403).json({
        success: false,
        msg: "Not authorized to edit this issue's experts.",
      });
    }

    const [alternatives, criteria, latestConsensus, snapshots] = await Promise.all([
      Alternative.find({ issue: issue._id }).sort({ name: 1 }),
      Criterion.find({ issue: issue._id }),
      Consensus.findOne({ issue: issue._id }).sort({ phase: -1 }),
      IssueExpressionDomain.find({ issue: issue._id })
        .sort({ createdAt: 1 })
        .lean(),
    ]);

    const currentPhase = latestConsensus ? latestConsensus.phase + 1 : 1;
    const stageForLog = mapIssueStageToExitStage(issue.currentStage);

    const defaultSnapshot =
      snapshots.find((snapshot) => snapshot.type === "numeric") ||
      snapshots[0] ||
      null;

    if (!defaultSnapshot) {
      return res.status(400).json({
        success: false,
        msg: "This issue has no IssueExpressionDomain snapshots. Cannot add experts until domains are snapshotted.",
      });
    }

    const leafCriteria = criteria.filter((criterion) => criterion.isLeaf);
    const evaluationStructure =
      issue.evaluationStructure || resolveEvaluationStructure(issue.model);

    for (const emailRaw of expertsToAdd || []) {
      const email = String(emailRaw || "").trim();
      if (!email) continue;

      const expertUser = await User.findOne({ email });
      if (!expertUser) continue;

      const existingParticipation = await Participation.findOne({
        issue: issue._id,
        expert: expertUser._id,
      });

      if (existingParticipation) continue;

      const isAdminExpert = expertUser._id.equals(userId);
      const weightsCompleted = stageForLog !== "criteriaWeighting";

      await Participation.create({
        issue: issue._id,
        expert: expertUser._id,
        invitationStatus: isAdminExpert ? "accepted" : "pending",
        evaluationCompleted: false,
        weightsCompleted,
        entryPhase: currentPhase,
        entryStage: stageForLog,
        joinedAt: new Date(),
      });

      if (!isAdminExpert) {
        const admin = await User.findById(userId);

        await resend.emails.send({
          from: "onboarding@resend.dev",
          to: email,
          subject: "You have been invited to an issue",
          html: `
            <html>
              <body>
                <h2>You have been invited to the issue "${issue.name}"</h2>
                <p>${admin.email} has invited you as an expert for the issue ${issue.name}. The issue description is:</p>
                <p>${issue.description}</p>
                <p>Accept the invitation to participate.</p>
              </body>
            </html>
          `,
        });

        await Notification.create({
          expert: expertUser._id,
          issue: issue._id,
          type: "invitation",
          message: `You have been invited by ${admin.name} to participate in ${issue.name}.`,
          read: false,
          requiresAction: true,
        });
      }

      const evaluationExists = await Evaluation.exists({
        issue: issue._id,
        expert: expertUser._id,
      });

      if (!evaluationExists) {
        const evaluationDocs = [];

        for (const alternative of alternatives) {
          for (const criterion of leafCriteria) {
            if (
              evaluationStructure ===
              EVALUATION_STRUCTURES.PAIRWISE_ALTERNATIVES
            ) {
              for (const comparedAlternative of alternatives) {
                if (String(comparedAlternative._id) === String(alternative._id)) {
                  continue;
                }

                evaluationDocs.push({
                  issue: issue._id,
                  expert: expertUser._id,
                  alternative: alternative._id,
                  comparedAlternative: comparedAlternative._id,
                  criterion: criterion._id,
                  expressionDomain: defaultSnapshot._id,
                  value: null,
                  timestamp: null,
                  history: [],
                  consensusPhase: currentPhase,
                });
              }
            } else {
              evaluationDocs.push({
                issue: issue._id,
                expert: expertUser._id,
                alternative: alternative._id,
                comparedAlternative: null,
                criterion: criterion._id,
                expressionDomain: defaultSnapshot._id,
                value: null,
                timestamp: null,
                history: [],
                consensusPhase: currentPhase,
              });
            }
          }
        }

        if (evaluationDocs.length > 0) {
          await Evaluation.insertMany(evaluationDocs);
        }
      }
    }

    for (const emailRaw of expertsToRemove || []) {
      const email = String(emailRaw || "").trim();
      if (!email) continue;

      const expertUser = await User.findOne({ email });
      if (!expertUser) continue;

      if (expertUser._id.equals(issue.admin)) continue;

      const participation = await Participation.findOne({
        issue: issue._id,
        expert: expertUser._id,
      });

      if (!participation) continue;

      await cleanupExpertDraftsOnExit({
        issueId: issue._id,
        expertId: expertUser._id,
      });

      await Participation.deleteOne({ _id: participation._id });

      await registerUserExit({
        issueId: issue._id,
        userId: expertUser._id,
        phase: currentPhase,
        stage: stageForLog,
        reason: "Expelled by admin",
      });
    }

    return res.status(200).json({
      success: true,
      msg: "Experts updated successfully.",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      msg: "An error occurred while editing experts.",
      error: error.message,
    });
  }
};

/**
 * Permite a un experto abandonar un issue activo.
 *
 * @param {import("express").Request} req Request de Express.
 * @param {import("express").Response} res Response de Express.
 * @returns {Promise<void>}
 */
export const leaveIssue = async (req, res) => {
  const { id } = req.body;
  const userId = req.uid;

  try {
    const issue = await Issue.findById(id);

    if (!issue) {
      return res.status(404).json({
        success: false,
        msg: "Issue not found",
      });
    }

    if (issue.admin.equals(userId)) {
      return res.status(403).json({
        success: false,
        msg: "An admin can not leave an issue",
      });
    }

    const participation = await Participation.findOne({
      issue: issue._id,
      expert: userId,
    });

    if (!participation) {
      return res.status(400).json({
        success: false,
        msg: "You are not a participant of this issue",
      });
    }

    await cleanupExpertDraftsOnExit({
      issueId: issue._id,
      expertId: userId,
    });

    await Participation.deleteOne({ _id: participation._id });

    const currentPhase = await getNextConsensusPhase(issue._id);
    const stageForLog = mapIssueStageToExitStage(issue.currentStage);

    await registerUserExit({
      issueId: issue._id,
      userId,
      phase: currentPhase,
      stage: stageForLog,
      reason: "Left by user",
    });

    return res.status(200).json({
      success: true,
      msg: "You have left the issue successfully",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      msg: "An error occurred while leaving issue",
      error: error.message,
    });
  }
};

/**
 * Construye la matriz de evaluaciones directas por experto.
 *
 * @param {object} params Parámetros de entrada.
 * @param {mongoose.Types.ObjectId | string} params.issueId Id del issue.
 * @param {Array<Record<string, any>>} params.alternatives Alternativas ordenadas.
 * @param {Array<Record<string, any>>} params.criteria Criterios hoja ordenados.
 * @param {Array<Record<string, any>>} params.participations Participaciones aceptadas con expert populado.
 * @returns {Promise<Record<string, Array<Array<any>>>>}
 */
const buildDirectMatrices = async ({
  issueId,
  alternatives,
  criteria,
  participations,
}) => {
  const expertIds = participations.map((participation) => participation.expert._id);

  const evaluations = await Evaluation.find({
    issue: issueId,
    expert: { $in: expertIds },
    comparedAlternative: null,
  }).populate("expressionDomain");

  const evaluationMap = new Map();

  for (const evaluation of evaluations) {
    const key = [
      asId(evaluation.expert),
      asId(evaluation.alternative),
      asId(evaluation.criterion),
    ].join("_");

    evaluationMap.set(key, evaluation);
  }

  const matrices = {};

  for (const participation of participations) {
    const expertEmail = participation.expert.email;
    const expertId = asId(participation.expert._id);
    const matrixForExpert = [];

    for (const alternative of alternatives) {
      const rowValues = [];

      for (const criterion of criteria) {
        const key = [expertId, asId(alternative._id), asId(criterion._id)].join("_");
        const evaluation = evaluationMap.get(key);

        let value = evaluation?.value ?? null;

        if (evaluation?.expressionDomain?.type === "linguistic") {
          const labelDefinition = evaluation.expressionDomain.linguisticLabels.find(
            (label) => label.label === value
          );

          value = labelDefinition ? labelDefinition.values : null;
        }

        rowValues.push(value);
      }

      matrixForExpert.push(rowValues);
    }

    matrices[expertEmail] = matrixForExpert;
  }

  return matrices;
};

/**
 * Guarda borradores de evaluaciones directas del experto actual.
 *
 * @param {import("express").Request} req Request de Express.
 * @param {import("express").Response} [res] Response de Express.
 * @returns {Promise<object | void>}
 */
export const saveDirectEvaluations = async (req, res) => {
  const userId = req.uid;

  try {
    const { id, evaluations } = req.body;

    const issue = await Issue.findById(id).lean();
    if (!issue) {
      const response = { success: false, msg: "Issue not found" };
      return res ? res.status(404).json(response) : response;
    }

    const evaluationStructure = resolveEvaluationStructure(issue);

    if (evaluationStructure !== EVALUATION_STRUCTURES.DIRECT) {
      const response = {
        success: false,
        msg: "This issue uses pairwise alternative evaluation",
      };
      return res ? res.status(400).json(response) : response;
    }

    const participation = await Participation.findOne({
      issue: issue._id,
      expert: userId,
      invitationStatus: "accepted",
    });

    if (!participation) {
      const response = {
        success: false,
        msg: "You are no longer a participant in this issue",
      };
      return res ? res.status(403).json(response) : response;
    }

    const [alternatives, criteria, currentPhase] = await Promise.all([
      Alternative.find({ issue: issue._id }).sort({ name: 1 }).lean(),
      Criterion.find({ issue: issue._id }).lean(),
      getNextConsensusPhase(issue._id),
    ]);

    const alternativeMap = new Map(
      alternatives.map((alternative) => [alternative.name, alternative._id])
    );
    const criterionMap = new Map(
      criteria.map((criterion) => [criterion.name, criterion._id])
    );

    const bulkOperations = [];
    const usedSnapshotIds = new Set();

    for (const [alternativeName, criterionEvaluations] of Object.entries(
      evaluations || {}
    )) {
      const alternativeId = alternativeMap.get(alternativeName);
      if (!alternativeId) continue;

      for (const [criterionName, evaluationData] of Object.entries(
        criterionEvaluations || {}
      )) {
        const criterionId = criterionMap.get(criterionName);
        if (!criterionId) continue;

        const { value, domain } = evaluationData || {};
        const snapshotId = domain?.id || null;

        if (snapshotId) {
          usedSnapshotIds.add(String(snapshotId));
        }

        bulkOperations.push({
          updateOne: {
            filter: {
              expert: userId,
              alternative: alternativeId,
              criterion: criterionId,
              comparedAlternative: null,
            },
            update: {
              $set: {
                value,
                expressionDomain: snapshotId,
                timestamp: new Date(),
                issue: issue._id,
                consensusPhase: currentPhase,
              },
            },
            upsert: true,
          },
        });
      }
    }

    if (usedSnapshotIds.size > 0) {
      const snapshotIds = Array.from(usedSnapshotIds);

      const count = await IssueExpressionDomain.countDocuments({
        _id: { $in: snapshotIds },
        issue: issue._id,
      });

      if (count !== snapshotIds.length) {
        const response = {
          success: false,
          msg: "Invalid expressionDomain snapshot for this issue",
        };
        return res ? res.status(400).json(response) : response;
      }
    }

    if (bulkOperations.length > 0) {
      await Evaluation.bulkWrite(bulkOperations);
    }

    const successResponse = {
      success: true,
      msg: "Evaluations saved successfully",
    };

    return res ? res.status(200).json(successResponse) : successResponse;
  } catch (error) {
    console.error(error);

    const errorResponse = {
      success: false,
      msg: "An error occurred while saving evaluations",
    };

    return res ? res.status(500).json(errorResponse) : errorResponse;
  }
};

/**
 * Obtiene las evaluaciones directas del experto actual para un issue.
 *
 * @param {import("express").Request} req Request de Express.
 * @param {import("express").Response} res Response de Express.
 * @returns {Promise<void>}
 */
export const getDirectEvaluations = async (req, res) => {
  const userId = req.uid;

  try {
    const { id } = req.body;

    const issue = await Issue.findById(id);
    if (!issue) {
      return res.status(404).json({
        success: false,
        msg: "Issue not found",
      });
    }

    const evaluationStructure = resolveEvaluationStructure(issue);

    if (evaluationStructure !== EVALUATION_STRUCTURES.DIRECT) {
      return res.status(400).json({
        success: false,
        msg: "This issue uses pairwise alternative evaluation",
      });
    }

    const [alternatives, criteria, evaluationDocs, latestConsensus] = await Promise.all([
      Alternative.find({ issue: issue._id }).sort({ name: 1 }).lean(),
      Criterion.find({ issue: issue._id, isLeaf: true }).sort({ name: 1 }).lean(),
      Evaluation.find({
        issue: issue._id,
        expert: userId,
        comparedAlternative: null,
      })
        .populate("alternative")
        .populate("criterion")
        .populate("expressionDomain"),
      Consensus.findOne({ issue: issue._id }).sort({ phase: -1 }),
    ]);

    const evaluationMap = new Map();

    for (const evaluation of evaluationDocs) {
      const alternativeId = evaluation.alternative?._id?.toString();
      const criterionId = evaluation.criterion?._id?.toString();
      if (!alternativeId || !criterionId) continue;

      evaluationMap.set(`${alternativeId}_${criterionId}`, evaluation);
    }

    const evaluationsByAlternative = {};

    for (const alternative of alternatives) {
      evaluationsByAlternative[alternative.name] = {};

      for (const criterion of criteria) {
        const key = `${alternative._id.toString()}_${criterion._id.toString()}`;
        const evaluation = evaluationMap.get(key);

        evaluationsByAlternative[alternative.name][criterion.name] = {
          value: evaluation?.value ?? "",
          domain: formatExpressionDomainForClient(evaluation?.expressionDomain),
        };
      }
    }

    return res.status(200).json({
      success: true,
      evaluations: evaluationsByAlternative,
      collectiveEvaluations: latestConsensus?.collectiveEvaluations || null,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      msg: "An error occurred while fetching evaluations",
    });
  }
};

/**
 * Valida, guarda y envía las evaluaciones directas del experto actual.
 *
 * @param {import("express").Request} req Request de Express.
 * @param {import("express").Response} res Response de Express.
 * @returns {Promise<void>}
 */
export const submitDirectEvaluations = async (req, res) => {
  const userId = req.uid;

  try {
    const { id, evaluations } = req.body;

    const validation = validateFinalEvaluations(evaluations);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        alternative: validation.error.alternative,
        criterion: validation.error.criterion,
        msg: validation.error.message,
      });
    }

    const saveResult = await saveDirectEvaluations(req);
    if (!saveResult.success) {
      return res.status(500).json({
        success: false,
        msg: saveResult.msg,
      });
    }

    const issue = await Issue.findById(id).lean();
    if (!issue) {
      return res.status(404).json({
        success: false,
        msg: "Issue not found",
      });
    }

    const participation = await Participation.findOneAndUpdate(
      { issue: issue._id, expert: userId },
      { $set: { evaluationCompleted: true } },
      { new: true }
    );

    if (!participation) {
      return res.status(404).json({
        success: false,
        msg: "Participation not found",
      });
    }

    return res.status(200).json({
      success: true,
      msg: "Evaluations submitted successfully"
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      msg: "An error occurred while sending evaluations",
    });
  }
};

/**
 * Resuelve un issue con evaluación directa y gestiona el flujo de consenso si aplica.
 *
 * @param {import("express").Request} req Request de Express.
 * @param {import("express").Response} res Response de Express.
 * @returns {Promise<void>}
 */
export const resolveDirectIssue = async (req, res) => {
  const userId = req.uid;

  try {
    const { id, forceFinalize = false } = req.body;

    const issue = await Issue.findById(id);
    if (!issue) {
      return res.status(404).json({
        success: false,
        msg: "Issue not found",
      });
    }

    const evaluationStructure = resolveEvaluationStructure(issue);

    const model = await IssueModel.findById(issue.model);
    if (!model) {
      return res.status(404).json({
        success: false,
        msg: "Issue model not found",
      });
    }

    if (evaluationStructure !== EVALUATION_STRUCTURES.DIRECT) {
      return res.status(400).json({
        success: false,
        msg: "This issue must be resolved with the pairwise resolver",
      });
    }

    if (issue.admin.toString() !== userId) {
      return res.status(403).json({
        success: false,
        msg: "Unauthorized: Only the issue creator can resolve it",
      });
    }

    const pendingEvaluations = await Participation.find({
      issue: issue._id,
      evaluationCompleted: false,
      invitationStatus: "accepted",
    });

    if (pendingEvaluations.length > 0) {
      return res.status(400).json({
        success: false,
        msg: "Not all experts have completed their evaluations",
      });
    }

    await ensureIssueOrdersDb({ issueId: issue._id });

    const [alternatives, criteria, participations] = await Promise.all([
      getOrderedAlternativesDb({
        issueId: issue._id,
        issueDoc: issue,
        select: "_id name",
        lean: true,
      }),
      getOrderedLeafCriteriaDb({
        issueId: issue._id,
        issueDoc: issue,
        select: "_id name type",
        lean: true,
      }),
      Participation.find({
        issue: issue._id,
        invitationStatus: "accepted",
      }).populate("expert"),
    ]);

    const criterionTypes = criteria.map((criterion) =>
      criterion.type === "benefit" ? "max" : "min"
    );

    const matrices = await buildDirectMatrices({
      issueId: issue._id,
      alternatives,
      criteria,
      participations,
    });

    const normalizedModelParams = normalizeParams(issue.modelParameters);
    const apimodelsUrl =
      process.env.ORIGIN_APIMODELS || "http://localhost:7000";

    let modelUrl;
    switch (model.name.toUpperCase()) {
      case "TOPSIS":
        modelUrl = "topsis";
        break;
      case "FUZZY TOPSIS":
        modelUrl = "fuzzy_topsis";
        break;
      case "BORDA":
        modelUrl = "borda";
        break;
      case "ARAS":
        modelUrl = "aras";
        break;
      default:
        return res.status(400).json({
          success: false,
          msg: `No API endpoint defined for model ${model.name}`,
        });
    }

    const response = await axios.post(
      `${apimodelsUrl}/${modelUrl}`,
      {
        matrices,
        modelParameters: normalizedModelParams,
        criterionTypes,
      },
      {
        headers: { "Content-Type": "application/json" },
      }
    );

    console.log("Response from API:", response.data);

    const { success, msg, results } = response.data;
    if (!success) {
      return res.status(400).json({
        success: false,
        msg,
      });
    }

    const alternativeNames = alternatives.map((alternative) => alternative.name);

    const rankedAlternatives = results.collective_ranking.map(
      (index) => alternativeNames[index]
    );

    const rankedWithScores = results.collective_ranking.map((index) => ({
      name: alternativeNames[index],
      score: results.collective_scores[index],
    }));

    console.log(rankedWithScores);

    const currentPhase = await getNextConsensusPhase(issue._id);

    const collectiveScoresByName = {};
    results.collective_scores.forEach((score, index) => {
      collectiveScoresByName[alternativeNames[index]] = score;
    });

    const collectiveEvaluations = {};
    results.collective_matrix.forEach((row, alternativeIndex) => {
      const alternativeName = alternativeNames[alternativeIndex];
      collectiveEvaluations[alternativeName] = {};

      row.forEach((value, criterionIndex) => {
        const criterionName = criteria[criterionIndex].name;
        collectiveEvaluations[alternativeName][criterionName] = { value };
      });
    });

    let plotsGraphicWithEmails = null;
    const plotsGraphic = results?.plots_graphic;

    if (plotsGraphic?.expert_points && Array.isArray(plotsGraphic.expert_points)) {
      const expertPointsMap = {};

      participations.forEach((participation, index) => {
        expertPointsMap[participation.expert.email] =
          plotsGraphic.expert_points[index] ?? null;
      });

      plotsGraphicWithEmails = {
        expert_points: expertPointsMap,
        collective_point: plotsGraphic.collective_point ?? null,
      };
    }

    const consensus = new Consensus({
      issue: issue._id,
      phase: currentPhase,
      level: issue.isConsensus ? results.cm ?? 0 : null,
      timestamp: new Date(),
      details: {
        rankedAlternatives: rankedWithScores,
        matrices,
        collective_scores: collectiveScoresByName,
        collective_ranking: rankedAlternatives,
        ...(plotsGraphicWithEmails
          ? { plotsGraphic: plotsGraphicWithEmails }
          : {}),
      },
      collectiveEvaluations,
    });

    await consensus.save();

    if (issue.isConsensus) {
      if (forceFinalize) {
        issue.active = false;
        await issue.save();

        return res.status(200).json({
          success: true,
          finished: true,
          msg: `Issue '${issue.name}' resolved as final round due to closure date.`,
          rankedAlternatives,
        });
      }

      if (issue.consensusMaxPhases && currentPhase >= issue.consensusMaxPhases) {
        issue.active = false;
        await issue.save();

        return res.status(200).json({
          success: true,
          finished: true,
          msg: `Issue '${issue.name}' resolved: maximum number of consensus rounds reached.`,
          rankedAlternatives,
        });
      }

      if (results.cm && results.cm >= issue.consensusThreshold) {
        issue.active = false;
        await issue.save();

        return res.status(200).json({
          success: true,
          finished: true,
          msg: `Issue '${issue.name}' resolved: consensus threshold ${issue.consensusThreshold} reached.`,
          rankedAlternatives,
        });
      }

      await Participation.updateMany(
        { issue: issue._id },
        { $set: { evaluationCompleted: false } }
      );

      return res.status(200).json({
        success: true,
        finished: false,
        msg: `Issue '${issue.name}' consensus threshold not reached. Another round is needed.`,
      });
    }

    issue.active = false;
    issue.currentStage = "finished";
    await issue.save();

    return res.status(200).json({
      success: true,
      finished: true,
      msg: `Issue '${issue.name}' resolved.`,
      rankedAlternatives,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      msg: "An error occurred while resolving the issue",
    });
  }
};

/**
 * Obtiene toda la información de un issue finalizado para la pantalla de detalle.
 *
 * @param {import("express").Request} req Request de Express.
 * @param {import("express").Response} res Response de Express.
 * @returns {Promise<void>}
 */
export const getFinishedIssueInfo = async (req, res) => {
  try {
    const { id } = req.body;

    const issue = await Issue.findById(id).populate("model");
    if (!issue) {
      return res.status(404).json({
        success: false,
        msg: "Issue not found",
      });
    }

    const issueEvaluationStructure =
      issue.evaluationStructure || resolveEvaluationStructure(issue.model);

    const summary = await createSummarySection(issue._id);
    const alternativesRankings = await createAlternativesRankingsSection(issue._id);
    const expertsRatings =
      issueEvaluationStructure === EVALUATION_STRUCTURES.PAIRWISE_ALTERNATIVES
        ? await createExpertsPairwiseRatingsSection(issue._id)
        : await createExpertsRatingsSection(issue._id);

    const analyticalGraphs = await createAnalyticalGraphsSection(
      issue._id,
      issue.isConsensus
    );

    const orderedIssue = await ensureIssueOrdersDb({ issueId: issue._id });

    const leafDocs = await getOrderedLeafCriteriaDb({
      issueId: issue._id,
      issueDoc: orderedIssue,
      select: "_id name type",
      lean: true,
    });

    const leafCount = leafDocs.length;
    const leafCriteria = leafDocs.map((criterion) => ({
      id: String(criterion._id),
      name: criterion.name,
      type: criterion.type,
    }));

    const participations = await Participation.find({
      issue: issue._id,
      invitationStatus: "accepted",
    })
      .select("expert")
      .lean();

    const expertIds = participations.map((participation) => participation.expert);

    let domainType = null;
    try {
      const detected = await detectIssueDomainTypeOrThrow({
        issueId: issue._id,
        expertIds,
      });
      domainType = detected.domainType;
    } catch (error) {
      domainType = null;
    }

    const allModels = await IssueModel.find()
      .select(
        "name isConsensus evaluationStructure isMultiCriteria smallDescription extendDescription moreInfoUrl parameters supportedDomains"
      )
      .lean();

    const availableModels = allModels.map((modelDoc) => {
      const defaultsResolved = buildDefaultsResolved({
        modelDoc,
        leafCount,
      });

      const modelEvaluationStructure = resolveEvaluationStructure(modelDoc);
      const sameEvaluationStructure =
        modelEvaluationStructure === issueEvaluationStructure;

      return {
        id: String(modelDoc._id),
        name: modelDoc.name,
        isConsensus: Boolean(modelDoc.isConsensus),
        evaluationStructure: modelEvaluationStructure,
        isPairwise:
          modelEvaluationStructure ===
          EVALUATION_STRUCTURES.PAIRWISE_ALTERNATIVES,
        isMultiCriteria: Boolean(modelDoc.isMultiCriteria),
        smallDescription: modelDoc.smallDescription,
        moreInfoUrl: modelDoc.moreInfoUrl,
        parameters: modelDoc.parameters || [],
        defaultsResolved,
        compatibility: {
          evaluationStructure: sameEvaluationStructure,
          pairwise: sameEvaluationStructure,
          domain: domainType
            ? Boolean(modelDoc.supportedDomains?.[domainType]?.enabled)
            : true,
        },
      };
    });

    const baseModel = issue.model;
    const baseDefaultsResolved = buildDefaultsResolved({
      modelDoc: baseModel?.toObject ? baseModel.toObject() : baseModel,
      leafCount,
    });

    const baseParamsSaved = issue.modelParameters || {};
    const baseParamsResolved = mergeParamsResolved({
      defaultsResolved: baseDefaultsResolved,
      savedParams: baseParamsSaved,
    });

    const [scenarioDocs, latestConsensus] = await Promise.all([
      IssueScenario.find({ issue: issue._id })
        .sort({ createdAt: -1 })
        .select(
          "_id name targetModel targetModelName domainType evaluationStructure status createdAt createdBy"
        )
        .populate("createdBy", "email name")
        .lean(),
      Consensus.findOne({ issue: issue._id }).sort({ phase: -1 }).lean(),
    ]);

    const scenarios = (scenarioDocs || []).map((scenario) => {
      const scenarioEvaluationStructure = resolveEvaluationStructure(scenario);

      return {
        id: String(scenario._id),
        name: scenario.name || "",
        targetModelId: scenario.targetModel
          ? String(scenario.targetModel)
          : null,
        targetModelName: scenario.targetModelName || "",
        domainType: scenario.domainType ?? null,
        evaluationStructure: scenarioEvaluationStructure,
        isPairwise:
          scenarioEvaluationStructure ===
          EVALUATION_STRUCTURES.PAIRWISE_ALTERNATIVES,
        status: scenario.status || "done",
        createdAt: scenario.createdAt || null,
        createdBy: scenario.createdBy
          ? {
            email: scenario.createdBy.email,
            name: scenario.createdBy.name,
          }
          : null,
      };
    });

    const baseScenario = {
      id: null,
      name: `Base (${baseModel?.name || "Model"})`,
      targetModelId: String(baseModel?._id),
      targetModelName: baseModel?.name || "",
      domainType,
      evaluationStructure: issueEvaluationStructure,
      isPairwise:
        issueEvaluationStructure ===
        EVALUATION_STRUCTURES.PAIRWISE_ALTERNATIVES,
      status: "done",
      createdAt: latestConsensus?.timestamp || null,
      createdBy: null,
      preview: latestConsensus?.details?.rankedAlternatives || null,
    };

    const issueInfo = {
      summary,
      alternativesRankings,
      expertsRatings,
      analyticalGraphs,
      scenarios: [baseScenario, ...scenarios],
      modelParams: {
        leafCriteria,
        domainType,
        base: {
          modelId: String(baseModel?._id),
          modelName: baseModel?.name,
          evaluationStructure: issueEvaluationStructure,
          parameters: baseModel?.parameters || [],
          paramsSaved: baseParamsSaved,
          paramsResolved: baseParamsResolved,
        },
        availableModels,
      },
    };

    return res.json({
      success: true,
      msg: "Issue info sent",
      issueInfo,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      msg: "Error fetching full issue info",
    });
  }
};

/**
 * Guarda pesos BWM del experto actual.
 *
 * @param {import("express").Request} req Request de Express.
 * @param {import("express").Response} [res] Response de Express.
 * @returns {Promise<object | void>}
 */
export const saveBwmWeights = async (req, res) => {
  const userId = req.uid;

  try {
    const { id, bwmData, send = false } = req.body;

    const issue = await Issue.findById(id);
    if (!issue) {
      const response = { success: false, msg: "Issue not found" };
      return res ? res.status(404).json(response) : response;
    }

    const participation = await getAcceptedParticipation(issue._id, userId);
    if (!participation) {
      const response = {
        success: false,
        msg: "You are no longer a participant in this issue",
      };
      return res ? res.status(403).json(response) : response;
    }

    if (!bwmData.bestCriterion || !bwmData.worstCriterion) {
      const response = {
        success: false,
        msg: "Missing best or worst criterion",
      };
      return res ? res.status(400).json(response) : response;
    }

    const payload = buildBwmEvaluationPayload({
      issueId: issue._id,
      userId,
      bwmData,
      send,
    });

    const existingEvaluation = await CriteriaWeightEvaluation.findOne({
      issue: issue._id,
      expert: userId,
    });

    if (existingEvaluation) {
      await CriteriaWeightEvaluation.updateOne(
        { _id: existingEvaluation._id },
        { $set: payload }
      );
    } else {
      await CriteriaWeightEvaluation.create(payload);
    }

    const successResponse = {
      success: true,
      msg: send ? "Weights submitted successfully" : "Weights saved successfully",
    };

    return res ? res.status(200).json(successResponse) : successResponse;
  } catch (error) {
    console.error(error);

    const errorResponse = {
      success: false,
      msg: "An error occurred while saving weights",
    };

    return res ? res.status(500).json(errorResponse) : errorResponse;
  }
};

/**
 * Obtiene los pesos BWM guardados del experto actual.
 *
 * @param {import("express").Request} req Request de Express.
 * @param {import("express").Response} res Response de Express.
 * @returns {Promise<void>}
 */
export const getBwmWeights = async (req, res) => {
  const userId = req.uid;

  try {
    const { id } = req.body;

    const issue = await Issue.findById(id);
    if (!issue) {
      return res.status(404).json({
        success: false,
        msg: "Issue not found",
      });
    }

    const participation = await getAcceptedParticipation(issue._id, userId);
    if (!participation) {
      return res.status(403).json({
        success: false,
        msg: "You are no longer a participant in this issue",
      });
    }

    const leafDocs = await getOrderedLeafCriteriaForIssue(issue);
    const leafNames = leafDocs.map((criterion) => criterion.name);

    const existingEvaluation = await CriteriaWeightEvaluation.findOne({
      issue: issue._id,
      expert: userId,
    }).lean();

    const bestToOthers = {};
    const othersToWorst = {};

    for (const name of leafNames) {
      const value1 = existingEvaluation?.bestToOthers?.[name];
      const value2 = existingEvaluation?.othersToWorst?.[name];

      bestToOthers[name] = value1 === null || value1 === undefined ? "" : value1;
      othersToWorst[name] = value2 === null || value2 === undefined ? "" : value2;
    }

    const bwmData = {
      bestCriterion: existingEvaluation?.bestCriterion || "",
      worstCriterion: existingEvaluation?.worstCriterion || "",
      bestToOthers,
      othersToWorst,
      completed: existingEvaluation?.completed || false,
    };

    return res.status(200).json({
      success: true,
      bwmData,
    });
  } catch (error) {
    console.error("getBwmWeights error:", error);
    return res.status(500).json({
      success: false,
      msg: "An error occurred while fetching weights",
    });
  }
};

/**
 * Valida y envía los pesos BWM del experto actual.
 *
 * @param {import("express").Request} req Request de Express.
 * @param {import("express").Response} res Response de Express.
 * @returns {Promise<void>}
 */
export const sendBwmWeights = async (req, res) => {
  const userId = req.uid;

  try {
    const { id, bwmData } = req.body;

    const validation = validateFinalWeights(bwmData);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        msg: validation.msg,
        field: validation.field,
      });
    }

    if (bwmData.bestCriterion) {
      bwmData.bestToOthers = {
        ...bwmData.bestToOthers,
        [bwmData.bestCriterion]: 1,
      };
    }

    if (bwmData.worstCriterion) {
      bwmData.othersToWorst = {
        ...bwmData.othersToWorst,
        [bwmData.worstCriterion]: 1,
      };
    }

    const saveResult = await saveBwmWeights(req);
    if (!saveResult.success) {
      return res.status(500).json({
        success: false,
        msg: saveResult.msg || "Error saving weights",
      });
    }

    const issue = await Issue.findById(id);
    if (!issue) {
      return res.status(404).json({
        success: false,
        msg: "Issue not found",
      });
    }

    await CriteriaWeightEvaluation.updateOne(
      { issue: issue._id, expert: userId },
      { $set: { completed: true } }
    );

    await markParticipationWeightsCompleted({
      ParticipationModel: Participation,
      issueId: issue._id,
      userId,
    });

    await syncIssueStageAfterWeightsCompletion(issue);

    return res.status(200).json({
      success: true,
      msg: "Weights submitted successfully",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      msg: "An error occurred while sending weights",
    });
  }
};

/**
 * Calcula pesos BWM colectivos y actualiza el issue.
 *
 * @param {import("express").Request} req Request de Express.
 * @param {import("express").Response} res Response de Express.
 * @returns {Promise<void>}
 */
export const computeWeights = async (req, res) => {
  const userId = req.uid;

  try {
    const { id } = req.body;

    const issue = await Issue.findById(id);
    if (!issue) {
      return res.status(404).json({
        success: false,
        msg: "Issue not found",
      });
    }

    if (issue.admin.toString() !== userId) {
      return res.status(403).json({
        success: false,
        msg: "Unauthorized: only admin can compute weights",
      });
    }

    await ensureIssueOrdersDb({ issueId: issue._id });

    const pendingWeights = await Participation.find({
      issue: issue._id,
      invitationStatus: { $in: ["accepted", "pending"] },
      weightsCompleted: false,
    });

    if (pendingWeights.length > 0) {
      return res.status(400).json({
        success: false,
        msg: "Not all experts have completed their criteria weight evaluations",
      });
    }

    const criteria = await getOrderedLeafCriteriaDb({
      issueId: issue._id,
      issueDoc: issue,
      select: "_id name",
      lean: true,
    });

    const criterionNames = criteria.map((criterion) => criterion.name);

    const weightEvaluations = await CriteriaWeightEvaluation.find({
      issue: issue._id,
    }).populate("expert", "email");

    if (weightEvaluations.length === 0) {
      return res.status(400).json({
        success: false,
        msg: "No BWM evaluations found for this issue",
      });
    }

    const expertsData = {};

    for (const evaluation of weightEvaluations) {
      const {
        bestCriterion,
        worstCriterion,
        bestToOthers,
        othersToWorst,
      } = evaluation;

      if (!bestCriterion || !worstCriterion) continue;

      const mic = criterionNames.map(
        (criterionName) => Number(bestToOthers?.[criterionName]) || 1
      );
      const lic = criterionNames.map(
        (criterionName) => Number(othersToWorst?.[criterionName]) || 1
      );

      const expertEmail =
        evaluation.expert?.email || `expert_${evaluation.expert?._id}`;

      expertsData[expertEmail] = { mic, lic };
    }

    if (Object.keys(expertsData).length === 0) {
      return res.status(400).json({
        success: false,
        msg: "Incomplete BWM data from experts",
      });
    }

    const apimodelsUrl =
      process.env.ORIGIN_APIMODELS || "http://localhost:7000";

    const response = await axios.post(`${apimodelsUrl}/bwm`, {
      experts_data: expertsData,
      eps_penalty: 1,
    });

    const { success, msg, results } = response.data;
    if (!success) {
      return res.status(400).json({
        success: false,
        msg,
      });
    }

    const weights = results?.weights || [];

    issue.modelParameters = {
      ...(issue.modelParameters || {}),
      weights: weights.slice(0, criterionNames.length),
    };
    issue.currentStage = "alternativeEvaluation";
    await issue.save();

    return res.status(200).json({
      success: true,
      finished: true,
      msg: `Criteria weights for '${issue.name}' successfully computed.`,
      weights: issue.modelParameters.weights,
      criteriaOrder: criterionNames,
    });
  } catch (error) {
    console.error("Error in computeWeights:", error);
    return res.status(500).json({
      success: false,
      msg: "An error occurred while computing weights",
    });
  }
};

/**
 * Guarda borradores de pesos manuales del experto actual.
 *
 * @param {import("express").Request} req Request de Express.
 * @param {import("express").Response} res Response de Express.
 * @returns {Promise<void>}
 */
export const saveManualWeights = async (req, res) => {
  const userId = req.uid;

  try {
    const { id } = req.body;
    const raw = getRawManualWeightsPayload(req.body);

    const issue = await Issue.findById(id);
    if (!issue) {
      return res.status(404).json({
        success: false,
        msg: "Issue not found",
      });
    }

    const participation = await getAcceptedParticipation(issue._id, userId);
    if (!participation) {
      return res.status(403).json({
        success: false,
        msg: "You are no longer a participant",
      });
    }

    const leafDocs = await getOrderedLeafCriteriaForIssue(issue);
    const manualWeights = buildOrderedManualWeights(raw, leafDocs);

    await CriteriaWeightEvaluation.updateOne(
      { issue: issue._id, expert: userId },
      {
        $set: {
          issue: issue._id,
          expert: userId,
          manualWeights,
          completed: false,
          consensusPhase: 1,
        },
      },
      { upsert: true }
    );

    return res.status(200).json({
      success: true,
      msg: "Manual weights saved successfully",
    });
  } catch (error) {
    console.error("saveManualWeights error:", error);
    return res.status(500).json({
      success: false,
      msg: "An error occurred while saving",
    });
  }
};

/**
 * Obtiene los pesos manuales guardados del experto actual.
 *
 * @param {import("express").Request} req Request de Express.
 * @param {import("express").Response} res Response de Express.
 * @returns {Promise<void>}
 */
export const getManualWeights = async (req, res) => {
  const userId = req.uid;

  try {
    const { id } = req.body;

    const issue = await Issue.findById(id);
    if (!issue) {
      return res.status(404).json({
        success: false,
        msg: "Issue not found",
      });
    }

    const participation = await getAcceptedParticipation(issue._id, userId);
    if (!participation) {
      return res.status(403).json({
        success: false,
        msg: "You are no longer a participant",
      });
    }

    const leafDocs = await getOrderedLeafCriteriaForIssue(issue);
    const leafNames = leafDocs.map((criterion) => criterion.name);

    const evaluation = await CriteriaWeightEvaluation.findOne({
      issue: issue._id,
      expert: userId,
    }).lean();

    const manualWeights = {};
    for (const name of leafNames) {
      const value = evaluation?.manualWeights?.[name];
      manualWeights[name] = value === null || value === undefined ? "" : value;
    }

    return res.status(200).json({
      success: true,
      manualWeights,
    });
  } catch (error) {
    console.error("getManualWeights error:", error);
    return res.status(500).json({
      success: false,
      msg: "Error fetching manual weights",
    });
  }
};

/**
 * Valida y envía los pesos manuales del experto actual.
 *
 * @param {import("express").Request} req Request de Express.
 * @param {import("express").Response} res Response de Express.
 * @returns {Promise<void>}
 */
export const sendManualWeights = async (req, res) => {
  const userId = req.uid;

  try {
    const { id } = req.body;
    const raw = getRawManualWeightsPayload(req.body);

    const issue = await Issue.findById(id);
    if (!issue) {
      return res.status(404).json({
        success: false,
        msg: "Issue not found",
      });
    }

    const criteria = await getOrderedLeafCriteriaForIssue(issue);
    const criterionNames = criteria.map((criterion) => criterion.name);
    const manualWeights = buildOrderedManualWeights(raw, criteria);

    const missing = criterionNames.filter(
      (criterionName) => manualWeights[criterionName] == null
    );
    if (missing.length > 0) {
      return res.status(400).json({
        success: false,
        msg: "All criteria must have a weight",
      });
    }

    const invalid = criterionNames.find((criterionName) => {
      const value = manualWeights[criterionName];
      return value < 0 || value > 1;
    });

    if (invalid) {
      return res.status(400).json({
        success: false,
        msg: `Weight for '${invalid}' must be between 0 and 1`,
      });
    }

    const sum = criterionNames.reduce(
      (acc, criterionName) => acc + Number(manualWeights[criterionName]),
      0
    );

    if (Math.abs(sum - 1) > 0.001) {
      return res.status(400).json({
        success: false,
        msg: `Manual weights must sum to 1. Current sum: ${sum}`,
      });
    }

    await CriteriaWeightEvaluation.updateOne(
      { issue: issue._id, expert: userId },
      {
        $set: {
          issue: issue._id,
          expert: userId,
          manualWeights,
          completed: true,
          consensusPhase: 1,
        },
      },
      { upsert: true }
    );

    await markParticipationWeightsCompleted({
      ParticipationModel: Participation,
      issueId: issue._id,
      userId,
    });

    await syncIssueStageAfterWeightsCompletion(issue);

    return res.status(200).json({
      success: true,
      msg: "Manual weights submitted successfully",
    });
  } catch (error) {
    console.error("sendManualWeights error:", error);
    return res.status(500).json({
      success: false,
      msg: "Error submitting manual weights",
    });
  }
};

/**
 * Calcula pesos manuales colectivos y actualiza el issue.
 *
 * @param {import("express").Request} req Request de Express.
 * @param {import("express").Response} res Response de Express.
 * @returns {Promise<void>}
 */
export const computeManualWeights = async (req, res) => {
  const userId = req.uid;

  try {
    const { id } = req.body;

    const issue = await Issue.findById(id);
    if (!issue) {
      return res.status(404).json({
        success: false,
        msg: "Issue not found",
      });
    }

    if (issue.admin.toString() !== userId) {
      return res.status(403).json({
        success: false,
        msg: "Unauthorized: only admin can compute weights",
      });
    }

    if (issue.weightingMode !== "consensus") {
      return res.status(400).json({
        success: false,
        msg: "This issue is not using manual consensus weighting mode",
      });
    }

    await ensureIssueOrdersDb({ issueId: issue._id });

    const participations = await Participation.find({
      issue: issue._id,
      invitationStatus: "accepted",
    });

    const weightsPending = participations.filter(
      (participation) => !participation.weightsCompleted
    );

    if (weightsPending.length > 0) {
      return res.status(400).json({
        success: false,
        msg: "Not all experts have completed their criteria weight evaluations",
      });
    }

    const criteria = await getOrderedLeafCriteriaDb({
      issueId: issue._id,
      issueDoc: issue,
      select: "_id name",
      lean: true,
    });

    const criterionNames = criteria.map((criterion) => criterion.name);

    const evaluations = await CriteriaWeightEvaluation.find({
      issue: issue._id,
      completed: true,
    });

    if (evaluations.length === 0) {
      return res.status(400).json({
        success: false,
        msg: "No manual weight evaluations found for this issue",
      });
    }

    const normalizedWeights = computeNormalizedCollectiveManualWeights({
      evaluations,
      criterionNames,
    });

    issue.modelParameters = { ...(issue.modelParameters || {}) };
    issue.modelParameters.weights = normalizedWeights;

    issue.currentStage = "alternativeEvaluation";
    await issue.save();

    return res.status(200).json({
      success: true,
      finished: true,
      msg: "Criteria weights computed",
      weights: issue.modelParameters.weights,
      criteriaOrder: criterionNames,
    });
  } catch (error) {
    console.error("Error computing manual weights:", error);
    return res.status(500).json({
      success: false,
      msg: "Error computing manual weights",
    });
  }
};

/**
 * Crea un escenario de simulación para un issue resuelto.
 *
 * @param {import("express").Request} req Request de Express.
 * @param {import("express").Response} res Response de Express.
 * @returns {Promise<void>}
 */
export const createIssueScenario = async (req, res) => {
  const userId = req.uid;

  try {
    const {
      issueId,
      targetModelName,
      targetModelId,
      scenarioName = "",
      paramOverrides = {},
    } = req.body || {};

    if (!userId) {
      return res.status(401).json({
        success: false,
        msg: "Unauthorized",
      });
    }

    if (!issueId) {
      return res.status(400).json({
        success: false,
        msg: "issueId is required",
      });
    }

    const issue = await Issue.findById(issueId).populate("model");
    if (!issue) {
      return res.status(404).json({
        success: false,
        msg: "Issue not found",
      });
    }

    if (String(issue.admin) !== String(userId)) {
      return res.status(403).json({
        success: false,
        msg: "Not authorized: only admin can create scenarios",
      });
    }

    const [consensusCount, pendingInvitations, participations] = await Promise.all([
      Consensus.countDocuments({ issue: issue._id }),
      Participation.countDocuments({
        issue: issue._id,
        invitationStatus: "pending",
      }),
      Participation.find({
        issue: issue._id,
        invitationStatus: "accepted",
      }).populate("expert", "email"),
    ]);

    if (issue.isConsensus && consensusCount > 1) {
      return res.status(400).json({
        success: false,
        msg: "Simulation disabled: consensus issues with more than 1 saved phase are not supported yet.",
      });
    }

    if (pendingInvitations > 0) {
      return res.status(400).json({
        success: false,
        msg: "Simulation requires no pending invitations.",
      });
    }

    if (!participations.length) {
      return res.status(400).json({
        success: false,
        msg: "No accepted experts found",
      });
    }

    let targetModel = null;
    if (targetModelId) {
      targetModel = await IssueModel.findById(targetModelId);
    }
    if (!targetModel && targetModelName) {
      targetModel = await IssueModel.findOne({ name: targetModelName });
    }

    if (!targetModel) {
      return res.status(404).json({
        success: false,
        msg: "Target model not found",
      });
    }

    const issueEvaluationStructure =
      issue.evaluationStructure || resolveEvaluationStructure(issue.model);

    const targetEvaluationStructure = resolveEvaluationStructure(targetModel);

    if (targetEvaluationStructure !== issueEvaluationStructure) {
      return res.status(400).json({
        success: false,
        msg: "Incompatible models: evaluation structure does not match this issue input type.",
      });
    }

    await ensureIssueOrdersDb({ issueId: issue._id });

    const [alternatives, criteria] = await Promise.all([
      getOrderedAlternativesDb({
        issueId: issue._id,
        issueDoc: issue,
        select: "_id name",
        lean: true,
      }),
      getOrderedLeafCriteriaDb({
        issueId: issue._id,
        issueDoc: issue,
        select: "_id name type",
        lean: true,
      }),
    ]);

    if (!alternatives.length || !criteria.length) {
      throw createHttpError(400, "Issue has no alternatives/leaf criteria");
    }

    const criterionTypes = criteria.map((criterion) =>
      criterion.type === "benefit" ? "max" : "min"
    );

    const expertIds = participations
      .map((participation) => participation.expert?._id)
      .filter(Boolean);

    let domainType = null;
    try {
      const detected = await detectIssueDomainTypeOrThrow({
        issueId: issue._id,
        expertIds,
      });
      domainType = detected.domainType;
    } catch (error) {
      domainType = null;
    }

    if (domainType && targetModel?.supportedDomains) {
      const supportsDomain = Boolean(
        targetModel.supportedDomains?.[domainType]?.enabled
      );

      if (!supportsDomain) {
        return res.status(400).json({
          success: false,
          msg: `Target model does not support '${domainType}' domains. Pick a compatible model.`,
        });
      }
    }

    const paramsUsed = {
      ...(issue.modelParameters || {}),
      ...(paramOverrides || {}),
    };

    const resolvedWeights = resolveScenarioWeightsArray({
      paramsUsed,
      criteria,
    });
    if (resolvedWeights) {
      paramsUsed.weights = resolvedWeights;
    }

    const normalizedParams = normalizeParams(paramsUsed);
    const consensusThresholdUsed = 1;

    console.log("SCENARIO PARAMS DEBUG", {
      targetModel: targetModel.name,
      paramOverrides,
      paramsUsed,
      normalizedParams,
      consensusThresholdUsed,
    });

    let matricesUsed = {};
    let snapshotIdsUsed = [];
    const expertsOrder = participations.map((participation) => participation.expert.email);

    if (issueEvaluationStructure === EVALUATION_STRUCTURES.DIRECT) {
      const directResult = await buildScenarioDirectMatrices({
        issueId: issue._id,
        alternatives,
        criteria,
        participations,
      });

      matricesUsed = directResult.matricesUsed;
      snapshotIdsUsed = directResult.snapshotIdsUsed;

      const nullCount = Object.values(matricesUsed).reduce((acc, matrix) => {
        for (const row of matrix) {
          for (const value of row) {
            if (value == null) acc += 1;
          }
        }
        return acc;
      }, 0);

      if (nullCount > 0) {
        throw createHttpError(
          400,
          "Simulation requires complete evaluations (some values are still null)."
        );
      }
    } else {
      const pairwiseResult = await buildScenarioPairwiseMatrices({
        issueId: issue._id,
        alternatives,
        criteria,
        participations,
      });

      matricesUsed = pairwiseResult.matricesUsed;
      snapshotIdsUsed = pairwiseResult.snapshotIdsUsed;

      let nullCount = 0;

      for (const expertEmail of Object.keys(matricesUsed)) {
        for (const criterionName of Object.keys(matricesUsed[expertEmail])) {
          const matrix = matricesUsed[expertEmail][criterionName];

          for (let rowIndex = 0; rowIndex < matrix.length; rowIndex += 1) {
            for (let colIndex = 0; colIndex < matrix.length; colIndex += 1) {
              if (rowIndex === colIndex) continue;
              if (matrix[rowIndex][colIndex] == null) {
                nullCount += 1;
              }
            }
          }
        }
      }

      if (nullCount > 0) {
        throw createHttpError(
          400,
          "Simulation requires complete pairwise evaluations (some values are still null)."
        );
      }
    }

    const modelKey = getModelEndpointKey(targetModel.name);
    if (!modelKey) {
      return res.status(400).json({
        success: false,
        msg: `No API endpoint defined for target model ${targetModel.name}`,
      });
    }

    const apimodelsUrl =
      process.env.ORIGIN_APIMODELS || "http://localhost:7000";

    let response;
    if (modelKey === "herrera_viedma_crp") {
      response = await axios.post(
        `${apimodelsUrl}/${modelKey}`,
        {
          matrices: matricesUsed,
          consensusThreshold: consensusThresholdUsed,
          modelParameters: normalizedParams,
        },
        {
          headers: { "Content-Type": "application/json" },
        }
      );
    } else {
      response = await axios.post(
        `${apimodelsUrl}/${modelKey}`,
        {
          matrices: matricesUsed,
          modelParameters: normalizedParams,
          criterionTypes,
          criterion_type: criterionTypes,
          criterion_types: criterionTypes,
        },
        {
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const { success, msg, results } = response.data || {};
    if (!success) {
      throw createHttpError(400, msg || "Model execution failed");
    }

    const alternativeNames = alternatives.map((alternative) => alternative.name);

    let details = {};
    let collectiveEvaluations = null;

    if (modelKey === "herrera_viedma_crp") {
      const {
        alternatives_rankings,
        cm,
        collective_evaluations,
        plots_graphic,
        collective_scores,
      } = results || {};

      const rankedWithScores = (alternatives_rankings || []).map((index) => ({
        name: alternativeNames[index],
        score: collective_scores?.[index] ?? null,
      }));

      let plotsGraphicWithEmails = null;
      if (plots_graphic?.expert_points && Array.isArray(plots_graphic.expert_points)) {
        const expertPointsMap = {};

        participations.forEach((participation, index) => {
          expertPointsMap[participation.expert.email] =
            plots_graphic.expert_points[index] ?? null;
        });

        plotsGraphicWithEmails = {
          expert_points: expertPointsMap,
          collective_point: plots_graphic.collective_point ?? null,
        };
      }

      const transformedCollectiveEvaluations = {};

      for (const criterion of criteria) {
        const matrix = collective_evaluations?.[criterion.name];
        if (!matrix) continue;

        transformedCollectiveEvaluations[criterion.name] = matrix.map(
          (row, rowIndex) => {
            const formattedRow = { id: alternatives[rowIndex].name };

            row.forEach((value, colIndex) => {
              formattedRow[alternatives[colIndex].name] = value;
            });

            return formattedRow;
          }
        );
      }

      collectiveEvaluations = transformedCollectiveEvaluations;

      details = {
        rankedAlternatives: rankedWithScores,
        matrices: matricesUsed,
        level: cm ?? null,
        collective_scores: Object.fromEntries(
          alternativeNames.map((name, index) => [
            name,
            collective_scores?.[index] ?? null,
          ])
        ),
        collective_ranking: rankedWithScores.map((item) => item.name),
        ...(plotsGraphicWithEmails
          ? { plotsGraphic: plotsGraphicWithEmails }
          : {}),
      };
    } else {
      const rankingIndexes = results?.collective_ranking || [];
      const collectiveScores = results?.collective_scores || [];
      const collectiveMatrix = results?.collective_matrix || [];

      const rankedAlternatives = rankingIndexes.map(
        (index) => alternativeNames[index]
      );

      const rankedWithScores = rankingIndexes.map((index) => ({
        name: alternativeNames[index],
        score: collectiveScores?.[index] ?? null,
      }));

      const collectiveScoresByName = {};
      alternativeNames.forEach((name, index) => {
        collectiveScoresByName[name] = collectiveScores?.[index] ?? null;
      });

      const formattedCollectiveEvaluations = {};
      collectiveMatrix.forEach((row, alternativeIndex) => {
        const alternativeName = alternativeNames[alternativeIndex];
        formattedCollectiveEvaluations[alternativeName] = {};

        row.forEach((value, criterionIndex) => {
          const criterionName = criteria[criterionIndex]?.name;
          if (criterionName) {
            formattedCollectiveEvaluations[alternativeName][criterionName] = {
              value,
            };
          }
        });
      });

      collectiveEvaluations = formattedCollectiveEvaluations;

      let plotsGraphicWithEmails = null;
      const plotsGraphic = results?.plots_graphic;

      if (plotsGraphic?.expert_points && Array.isArray(plotsGraphic.expert_points)) {
        const expertPointsMap = {};

        participations.forEach((participation, index) => {
          expertPointsMap[participation.expert.email] =
            plotsGraphic.expert_points[index] ?? null;
        });

        plotsGraphicWithEmails = {
          expert_points: expertPointsMap,
          collective_point: plotsGraphic.collective_point ?? null,
        };
      }

      details = {
        rankedAlternatives: rankedWithScores,
        matrices: matricesUsed,
        collective_scores: collectiveScoresByName,
        collective_ranking: rankedAlternatives,
        ...(plotsGraphicWithEmails
          ? { plotsGraphic: plotsGraphicWithEmails }
          : {}),
      };
    }

    const scenario = await IssueScenario.create({
      issue: issue._id,
      createdBy: userId,
      name: String(scenarioName || "").trim(),
      targetModel: targetModel._id,
      targetModelName: targetModel.name,
      domainType,
      evaluationStructure: targetEvaluationStructure,
      status: "done",
      config: {
        modelParameters: paramsUsed,
        normalizedModelParameters: normalizedParams,
        criterionTypes:
          issueEvaluationStructure === EVALUATION_STRUCTURES.PAIRWISE_ALTERNATIVES
            ? []
            : criterionTypes,
      },
      inputs: {
        consensusPhaseUsed: 1,
        expertsOrder,
        alternatives: alternatives.map((alternative) => ({
          id: alternative._id,
          name: alternative.name,
        })),
        criteria: criteria.map((criterion) => ({
          id: criterion._id,
          name: criterion.name,
          criterionType: criterion.type,
        })),
        weightsUsed: paramsUsed?.weights ?? null,
        matricesUsed,
        snapshotIdsUsed,
      },
      outputs: {
        details,
        collectiveEvaluations,
        rawResults: results,
      },
    });

    return res.status(201).json({
      success: true,
      msg: "Scenario created successfully",
      scenarioId: scenario._id,
    });
  } catch (error) {
    const axiosMsg =
      error?.response?.data?.msg ||
      error?.response?.data?.message ||
      error?.response?.data?.error ||
      null;

    const status = error?.status || error?.response?.status || 500;

    console.error("createIssueScenario error:", {
      status,
      message: error?.message,
      axiosMsg,
      stack: error?.stack,
    });

    return res.status(status).json({
      success: false,
      msg: axiosMsg || error?.message || "Error creating scenario",
    });
  }
};

/**
 * Lista los escenarios creados para un issue.
 *
 * @param {import("express").Request} req Request de Express.
 * @param {import("express").Response} res Response de Express.
 * @returns {Promise<void>}
 */
export const getIssueScenarios = async (req, res) => {
  try {
    const { issueId } = req.body;

    if (!issueId) {
      return res.status(400).json({
        success: false,
        msg: "issueId is required",
      });
    }

    const scenarioDocs = await IssueScenario.find({ issue: issueId })
      .sort({ createdAt: -1 })
      .select(
        "_id name targetModelName domainType evaluationStructure status createdAt createdBy"
      )
      .populate("createdBy", "email name")
      .lean();

    const scenarios = scenarioDocs.map((scenario) => {
      const evaluationStructure = resolveEvaluationStructure(scenario);

      return {
        ...scenario,
        evaluationStructure,
        isPairwise:
          evaluationStructure ===
          EVALUATION_STRUCTURES.PAIRWISE_ALTERNATIVES,
      };
    });

    return res.json({
      success: true,
      scenarios,
    });
  } catch (error) {
    console.error("getIssueScenarios error:", error);
    return res.status(500).json({
      success: false,
      msg: "Error listing scenarios",
    });
  }
};

/**
 * Obtiene un escenario por su id.
 *
 * @param {import("express").Request} req Request de Express.
 * @param {import("express").Response} res Response de Express.
 * @returns {Promise<void>}
 */
export const getScenarioById = async (req, res) => {
  try {
    const { scenarioId } = req.body;

    if (!scenarioId) {
      return res.status(400).json({
        success: false,
        msg: "scenarioId is required",
      });
    }

    const scenarioDoc = await IssueScenario.findById(scenarioId)
      .populate("createdBy", "email name")
      .lean();

    if (!scenarioDoc) {
      return res.status(404).json({
        success: false,
        msg: "Scenario not found",
      });
    }

    const evaluationStructure = resolveEvaluationStructure(scenarioDoc);

    const scenario = {
      ...scenarioDoc,
      evaluationStructure,
      isPairwise:
        evaluationStructure ===
        EVALUATION_STRUCTURES.PAIRWISE_ALTERNATIVES,
    };

    return res.json({
      success: true,
      scenario,
    });
  } catch (error) {
    console.error("getScenarioById error:", error);
    return res.status(500).json({
      success: false,
      msg: "Error fetching scenario",
    });
  }
};

/**
 * Elimina un escenario si el usuario actual es su creador o admin del issue.
 *
 * @param {import("express").Request} req Request de Express.
 * @param {import("express").Response} res Response de Express.
 * @returns {Promise<void>}
 */
export const removeScenario = async (req, res) => {
  const userId = req.uid;

  try {
    const { scenarioId } = req.body;

    if (!scenarioId) {
      return res.status(400).json({
        success: false,
        msg: "scenarioId is required",
      });
    }

    const scenario = await IssueScenario.findById(scenarioId);
    if (!scenario) {
      return res.status(404).json({
        success: false,
        msg: "Scenario not found",
      });
    }

    const issue = await Issue.findById(scenario.issue).select("admin").lean();
    if (!issue) {
      return res.status(404).json({
        success: false,
        msg: "Issue not found",
      });
    }

    const isCreator = String(scenario.createdBy) === String(userId);
    const isAdmin = String(issue.admin) === String(userId);

    if (!isCreator && !isAdmin) {
      return res.status(403).json({
        success: false,
        msg: "Not authorized to delete this scenario",
      });
    }

    await IssueScenario.deleteOne({ _id: scenario._id });

    return res.json({
      success: true,
      msg: "Scenario deleted",
    });
  } catch (error) {
    console.error("removeScenario error:", error);
    return res.status(500).json({
      success: false,
      msg: "Error deleting scenario",
    });
  }
};

export const saveEvaluations = async (req, res) => {
  try {
    const { id } = req.body;

    const resolved = await resolveIssueEvaluationStructureById(id);
    if (!resolved.success) {
      return res.status(resolved.status).json({
        success: false,
        msg: resolved.msg,
      });
    }

    const handler = getIssueStructureHandler(resolved.evaluationStructure, {
      direct: saveDirectEvaluations,
      pairwise: savePairwiseEvaluations,
    });

    if (!handler) {
      return res.status(400).json({
        success: false,
        msg: `Unsupported evaluation structure '${resolved.evaluationStructure}'`,
      });
    }

    return handler(req, res);
  } catch (error) {
    console.error("saveEvaluations dispatcher error:", error);
    return res.status(500).json({
      success: false,
      msg: "An error occurred while saving evaluations",
    });
  }
};

export const getEvaluations = async (req, res) => {
  try {
    const { id } = req.body;

    const resolved = await resolveIssueEvaluationStructureById(id);
    if (!resolved.success) {
      return res.status(resolved.status).json({
        success: false,
        msg: resolved.msg,
      });
    }

    const handler = getIssueStructureHandler(resolved.evaluationStructure, {
      direct: getDirectEvaluations,
      pairwise: getPairwiseEvaluations,
    });

    if (!handler) {
      return res.status(400).json({
        success: false,
        msg: `Unsupported evaluation structure '${resolved.evaluationStructure}'`,
      });
    }

    return handler(req, res);
  } catch (error) {
    console.error("getEvaluations dispatcher error:", error);
    return res.status(500).json({
      success: false,
      msg: "An error occurred while fetching evaluations",
    });
  }
};

export const submitEvaluations = async (req, res) => {
  try {
    const { id } = req.body;

    const resolved = await resolveIssueEvaluationStructureById(id);
    if (!resolved.success) {
      return res.status(resolved.status).json({
        success: false,
        msg: resolved.msg,
      });
    }

    const handler = getIssueStructureHandler(resolved.evaluationStructure, {
      direct: submitDirectEvaluations,
      pairwise: submitPairwiseEvaluations,
    });

    if (!handler) {
      return res.status(400).json({
        success: false,
        msg: `Unsupported evaluation structure '${resolved.evaluationStructure}'`,
      });
    }

    return handler(req, res);
  } catch (error) {
    console.error("submitEvaluations dispatcher error:", error);
    return res.status(500).json({
      success: false,
      msg: "An error occurred while submitting evaluations",
    });
  }
};

export const resolveIssue = async (req, res) => {
  try {
    const { id } = req.body;

    console.log(id)

    const resolved = await resolveIssueEvaluationStructureById(id);
    if (!resolved.success) {
      return res.status(resolved.status).json({
        success: false,
        msg: resolved.msg,
      });
    }

    const handler = getIssueStructureHandler(resolved.evaluationStructure, {
      direct: resolveDirectIssue,
      pairwise: resolvePairwiseIssue,
    });

    if (!handler) {
      return res.status(400).json({
        success: false,
        msg: `Unsupported evaluation structure '${resolved.evaluationStructure}'`,
      });
    }

    return handler(req, res);
  } catch (error) {
    console.error("resolveIssue dispatcher error:", error);
    return res.status(500).json({
      success: false,
      msg: "An error occurred while resolving the issue",
    });
  }
};