import mongoose from "mongoose";

// Models
import { User } from "../models/Users.js";
import { Issue } from "../models/Issues.js";
import { Alternative } from "../models/Alternatives.js";
import { Criterion } from "../models/Criteria.js";
import { Participation } from "../models/Participations.js";
import { Evaluation } from "../models/Evaluations.js";
import { Consensus } from "../models/Consensus.js";
import { Notification } from "../models/Notificacions.js";
import { ExitUserIssue } from "../models/ExitUserIssue.js";
import { ExpressionDomain } from "../models/ExpressionDomain.js";
import { IssueExpressionDomain } from "../models/IssueExpressionDomains.js";
import { CriteriaWeightEvaluation } from "../models/CriteriaWeightEvaluation.js";
import { IssueScenario } from "../models/IssueScenarios.js";

import {
  ensureIssueOrdersDb,
  getOrderedAlternativesDb,
  getOrderedLeafCriteriaDb,
} from "../utils/issueOrdering.js";

// Utils
import { cleanupExpertDraftsOnExit } from "../utils/cleanupExpertDraftsOnExit.js";
import {
  editExperts as editExpertsOwner,
  removeIssue as removeIssueOwner,
  computeWeights as computeWeightsOwner,
  computeManualWeights as computeManualWeightsOwner,
  resolveIssue as resolveIssueOwner,
  resolvePairwiseIssue as resolvePairwiseIssueOwner,
} from "./issue.controller.js";

/**
 * Convierte un valor o documento en id string.
 *
 * @param {*} value Valor a convertir.
 * @returns {string}
 */
const asId = (value) => {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object" && value._id) return String(value._id);
  return String(value);
};

/**
 * Comprueba si un valor está relleno.
 *
 * @param {*} value Valor a comprobar.
 * @returns {boolean}
 */
const isFilledValue = (value) => !(value === null || value === undefined || value === "");

/**
 * Comprueba si un valor es un ObjectId válido.
 *
 * @param {*} value Valor a validar.
 * @returns {boolean}
 */
const isValidObjectId = (value) => Boolean(value) && mongoose.Types.ObjectId.isValid(value);

/**
 * Cierra una sesión de mongoose si existe.
 *
 * @param {import("mongoose").ClientSession} session Sesión de mongoose.
 * @returns {Promise<void>}
 */
const endSessionSafely = async (session) => {
  if (session) {
    await session.endSession();
  }
};

/**
 * Aborta la transacción si sigue activa.
 *
 * @param {import("mongoose").ClientSession} session Sesión de mongoose.
 * @returns {Promise<void>}
 */
const abortTransactionSafely = async (session) => {
  if (session?.inTransaction()) {
    await session.abortTransaction();
  }
};

/**
 * Devuelve metadatos legibles de la etapa actual del issue.
 *
 * @param {string} stage Etapa actual.
 * @returns {{ key: string, label: string }}
 */
const getIssueStageMeta = (stage) => {
  const stageMap = {
    criteriaWeighting: { key: "criteriaWeighting", label: "Criteria weighting" },
    weightsFinished: { key: "weightsFinished", label: "Weights finished" },
    alternativeEvaluation: { key: "alternativeEvaluation", label: "Alternative evaluation" },
    finished: { key: "finished", label: "Finished" },
  };

  return stageMap[stage] || { key: stage, label: stage || "Unknown" };
};

/**
 * Devuelve el estado de acciones disponibles para el creador de un issue.
 *
 * @param {Object} params Datos necesarios.
 * @param {Object} params.issue Issue actual.
 * @param {number} [params.acceptedExperts=0] Número de expertos aceptados.
 * @param {number} [params.pendingExperts=0] Número de expertos pendientes.
 * @param {number} [params.weightsDoneAccepted=0] Expertos aceptados con pesos completados.
 * @param {number} [params.evaluationsDoneAccepted=0] Expertos aceptados con evaluaciones completadas.
 * @returns {Object}
 */
const getCreatorActionFlags = ({
  issue,
  acceptedExperts = 0,
  pendingExperts = 0,
  weightsDoneAccepted = 0,
  evaluationsDoneAccepted = 0,
}) => {
  const stage = issue?.currentStage;
  const hasPendingExperts = pendingExperts > 0;

  const allWeightsDone =
    acceptedExperts > 0 && weightsDoneAccepted === acceptedExperts;

  const allEvaluationsDone =
    acceptedExperts > 0 && evaluationsDoneAccepted === acceptedExperts;

  return {
    canEditExperts: Boolean(issue?.active),
    canRemoveIssue: Boolean(issue?.active),
    canComputeWeights:
      stage === "weightsFinished" &&
      !hasPendingExperts &&
      allWeightsDone,
    canResolveIssue:
      stage === "alternativeEvaluation" &&
      !hasPendingExperts &&
      allEvaluationsDone,
  };
};

/**
 * Ordena dos elementos por nombre y, en empate, por id.
 *
 * @param {Object} a Primer elemento.
 * @param {Object} b Segundo elemento.
 * @returns {number}
 */
const sortByNameStable = (a, b) => {
  const byName = String(a?.name || "").localeCompare(String(b?.name || ""), undefined, {
    sensitivity: "base",
    numeric: true,
  });

  if (byName !== 0) return byName;

  return asId(a).localeCompare(asId(b));
};

/**
 * Construye el árbol jerárquico de criterios para el panel admin.
 *
 * @param {Array<Object>} criteriaDocs Lista de criterios.
 * @returns {Array<Object>}
 */
const buildCriteriaTreeAdmin = (criteriaDocs = []) => {
  const nodes = criteriaDocs.map((criterion) => ({
    id: asId(criterion._id),
    name: criterion.name,
    type: criterion.type,
    isLeaf: Boolean(criterion.isLeaf),
    parentId: criterion.parentCriterion ? asId(criterion.parentCriterion) : null,
    children: [],
  }));

  const nodesById = new Map(nodes.map((node) => [node.id, node]));
  const roots = [];

  for (const node of nodes) {
    if (node.parentId && nodesById.has(node.parentId)) {
      nodesById.get(node.parentId).children.push(node);
    } else {
      roots.push(node);
    }
  }

  const sortRecursively = (items) => {
    items.sort(sortByNameStable);

    items.forEach((item) => {
      if (Array.isArray(item.children) && item.children.length > 0) {
        sortRecursively(item.children);
      }
    });
  };

  sortRecursively(roots);

  return roots;
};

/**
 * Cuenta el número esperado de celdas de evaluación por experto.
 *
 * @param {Object} params Datos de cálculo.
 * @param {number} params.alternativesCount Número de alternativas.
 * @param {number} params.leafCriteriaCount Número de criterios hoja.
 * @param {boolean} params.isPairwise Indica si el issue es pairwise.
 * @returns {number}
 */
const countExpectedEvaluationCellsPerExpert = ({
  alternativesCount,
  leafCriteriaCount,
  isPairwise,
}) => {
  if (!alternativesCount || !leafCriteriaCount) {
    return 0;
  }

  if (isPairwise) {
    return alternativesCount * leafCriteriaCount * Math.max(alternativesCount - 1, 0);
  }

  return alternativesCount * leafCriteriaCount;
};

/**
 * Formatea un snapshot de dominio de expresión para el frontend.
 *
 * @param {Object|null} domain Dominio a formatear.
 * @returns {Object|null}
 */
const formatIssueSnapshotDomain = (domain) => {
  if (!domain) return null;

  return {
    id: asId(domain._id),
    name: domain.name,
    type: domain.type,
    ...(domain.type === "numeric" && {
      range: {
        min: domain.numericRange?.min ?? null,
        max: domain.numericRange?.max ?? null,
      },
    }),
    ...(domain.type === "linguistic" && {
      labels: Array.isArray(domain.linguisticLabels) ? domain.linguisticLabels : [],
    }),
  };
};

/**
 * Ordena un objeto siguiendo un orden de claves dado.
 *
 * @param {Object} [obj={}] Objeto a ordenar.
 * @param {Array<string>} [orderedKeys=[]] Orden deseado.
 * @returns {Object}
 */
const orderObjectByKeys = (obj = {}, orderedKeys = []) => {
  const orderedObject = {};
  const usedKeys = new Set();

  for (const key of orderedKeys) {
    orderedObject[key] = Object.prototype.hasOwnProperty.call(obj, key) ? obj[key] : null;
    usedKeys.add(key);
  }

  for (const [key, value] of Object.entries(obj || {})) {
    if (!usedKeys.has(key)) {
      orderedObject[key] = value;
    }
  }

  return orderedObject;
};

/**
 * Ejecuta una acción de creador de issue simulando el uid del admin real.
 *
 * @param {Object} params Parámetros de ejecución.
 * @param {string} params.issueId Id del issue.
 * @param {import("express").Request} params.req Request de Express.
 * @param {import("express").Response} params.res Response de Express.
 * @param {(issue: Object) => Promise<any>} params.action Acción a ejecutar.
 * @returns {Promise<any>}
 */
const runAsIssueCreator = async ({ issueId, req, res, action }) => {
  if (!issueId || !isValidObjectId(issueId)) {
    return res.status(400).json({
      success: false,
      msg: "Valid issue id is required",
    });
  }

  const issue = await Issue.findById(issueId).populate("model");

  if (!issue) {
    return res.status(404).json({
      success: false,
      msg: "Issue not found",
    });
  }

  const realAdminUid = req.uid;

  try {
    req.realAdminUid = realAdminUid;
    req.uid = String(issue.admin);
    return await action(issue);
  } finally {
    req.uid = realAdminUid;
  }
};

/**
 * Obtiene todos los usuarios visibles desde el panel de administración.
 *
 * @param {import("express").Request} req Request de Express.
 * @param {import("express").Response} res Response de Express.
 * @returns {Promise<void>}
 */
export const getAllUsersAdmin = async (req, res) => {
  try {
    const q = String(req.query.q || "").trim();
    const includeAdmins = req.query.includeAdmins === "true";

    const filter = {
      _id: { $ne: req.uid },
    };

    if (!includeAdmins) {
      filter.role = { $ne: "admin" };
    }

    if (q) {
      filter.$or = [
        { name: { $regex: q, $options: "i" } },
        { email: { $regex: q, $options: "i" } },
        { university: { $regex: q, $options: "i" } },
      ];
    }

    const users = await User.find(filter)
      .select("name university email role accountConfirm accountCreation")
      .sort({ name: 1 })
      .lean();

    if (!users.length) {
      return res.status(200).json({
        success: true,
        users: [],
      });
    }

    const userIds = users.map((user) => user._id);

    const [participations, domainsAgg, ownedIssuesAgg] = await Promise.all([
      Participation.find({ expert: { $in: userIds } })
        .populate({
          path: "issue",
          select: "_id active admin name",
        })
        .lean(),

      ExpressionDomain.aggregate([
        {
          $match: {
            user: { $in: userIds },
            isGlobal: false,
          },
        },
        {
          $group: {
            _id: "$user",
            count: { $sum: 1 },
          },
        },
      ]),

      Issue.aggregate([
        {
          $match: {
            admin: { $in: userIds },
          },
        },
        {
          $group: {
            _id: "$admin",
            total: { $sum: 1 },
            active: {
              $sum: {
                $cond: [{ $eq: ["$active", true] }, 1, 0],
              },
            },
            finished: {
              $sum: {
                $cond: [{ $eq: ["$active", false] }, 1, 0],
              },
            },
          },
        },
      ]),
    ]);

    const domainsMap = new Map(
      domainsAgg.map((row) => [String(row._id), row.count])
    );

    const ownedIssuesMap = new Map(
      ownedIssuesAgg.map((row) => [
        String(row._id),
        {
          total: row.total || 0,
          active: row.active || 0,
          finished: row.finished || 0,
        },
      ])
    );

    const participationStatsMap = new Map();

    for (const user of users) {
      participationStatsMap.set(String(user._id), {
        activeIssues: 0,
        finishedIssues: 0,
      });
    }

    for (const participation of participations) {
      if (!participation.issue) continue;

      const key = String(participation.expert);
      const stats = participationStatsMap.get(key);

      if (!stats) continue;

      if (participation.issue.active) {
        stats.activeIssues += 1;
      } else {
        stats.finishedIssues += 1;
      }
    }

    const formattedUsers = users.map((user) => {
      const userId = String(user._id);

      return {
        id: userId,
        name: user.name,
        university: user.university,
        email: user.email,
        role: user.role || "user",
        accountConfirm: Boolean(user.accountConfirm),
        accountCreation: user.accountCreation || null,
        stats: {
          activeIssues: participationStatsMap.get(userId)?.activeIssues || 0,
          finishedIssues: participationStatsMap.get(userId)?.finishedIssues || 0,
          domainsOwned: domainsMap.get(userId) || 0,
          ownedIssues:
            ownedIssuesMap.get(userId) || {
              total: 0,
              active: 0,
              finished: 0,
            },
        },
      };
    });

    return res.status(200).json({
      success: true,
      users: formattedUsers,
    });
  } catch (err) {
    console.error("getAllUsersAdmin error:", err);
    return res.status(500).json({
      success: false,
      msg: "Error fetching users",
    });
  }
};

/**
 * Crea un nuevo usuario desde el panel de administración.
 *
 * @param {import("express").Request} req Request de Express.
 * @param {import("express").Response} res Response de Express.
 * @returns {Promise<void>}
 */
export const createUserAdmin = async (req, res) => {
  try {
    let {
      name = "",
      university = "",
      email = "",
      password = "",
      accountConfirm = true,
      role = "user",
    } = req.body || {};

    name = String(name).trim();
    university = String(university).trim();
    email = String(email).trim().toLowerCase();
    password = String(password).trim();
    role = String(role || "user").trim().toLowerCase();

    if (!name) {
      return res.status(400).json({
        success: false,
        msg: "Name is required",
      });
    }

    if (!university) {
      return res.status(400).json({
        success: false,
        msg: "University is required",
      });
    }

    if (!email) {
      return res.status(400).json({
        success: false,
        msg: "Email is required",
      });
    }

    if (!password) {
      return res.status(400).json({
        success: false,
        msg: "Password is required",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        msg: "Password must be at least 6 characters",
      });
    }

    if (!["user", "admin"].includes(role)) {
      return res.status(400).json({
        success: false,
        msg: "Invalid role",
      });
    }

    const existingUser = await User.findOne({ email }).lean();

    if (existingUser) {
      return res.status(409).json({
        success: false,
        msg: "Email already registered",
      });
    }

    const finalAccountConfirm = role === "admin" ? true : Boolean(accountConfirm);

    const newUser = new User({
      name,
      university,
      email,
      password,
      role,
      accountConfirm: finalAccountConfirm,
      tokenConfirm: null,
      emailTokenConfirm: null,
    });

    await newUser.save();

    return res.status(201).json({
      success: true,
      msg: `${role === "admin" ? "Admin" : "User"} ${newUser.email} created successfully`,
      user: {
        id: String(newUser._id),
        name: newUser.name,
        university: newUser.university,
        email: newUser.email,
        role: newUser.role,
        accountConfirm: Boolean(newUser.accountConfirm),
        accountCreation: newUser.accountCreation || null,
      },
    });
  } catch (err) {
    console.error("createExpertAdmin error:", err);

    if (err?.code === 11000) {
      return res.status(409).json({
        success: false,
        msg: "Email already registered",
      });
    }

    return res.status(500).json({
      success: false,
      msg: "Error creating user",
    });
  }
};

/**
 * Actualiza un usuario desde el panel de administración.
 *
 * @param {import("express").Request} req Request de Express.
 * @param {import("express").Response} res Response de Express.
 * @returns {Promise<void>}
 */
export const updateUserAdmin = async (req, res) => {
  try {
    const {
      id,
      name,
      university,
      email,
      password,
      accountConfirm,
      role,
    } = req.body || {};

    if (!id) {
      return res.status(400).json({
        success: false,
        msg: "User id is required",
      });
    }

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        msg: "User not found",
      });
    }

    if (name !== undefined) {
      const cleanName = String(name).trim();

      if (!cleanName) {
        return res.status(400).json({
          success: false,
          msg: "Name can not be empty",
        });
      }

      user.name = cleanName;
    }

    if (university !== undefined) {
      const cleanUniversity = String(university).trim();

      if (!cleanUniversity) {
        return res.status(400).json({
          success: false,
          msg: "University can not be empty",
        });
      }

      user.university = cleanUniversity;
    }

    if (email !== undefined) {
      const cleanEmail = String(email).trim().toLowerCase();

      if (!cleanEmail) {
        return res.status(400).json({
          success: false,
          msg: "Email can not be empty",
        });
      }

      const emailInUse = await User.findOne({
        email: cleanEmail,
        _id: { $ne: user._id },
      }).lean();

      if (emailInUse) {
        return res.status(409).json({
          success: false,
          msg: "Email already registered",
        });
      }

      user.email = cleanEmail;
    }

    if (role !== undefined) {
      const cleanRole = String(role).trim().toLowerCase();

      if (!["user", "admin"].includes(cleanRole)) {
        return res.status(400).json({
          success: false,
          msg: "Invalid role",
        });
      }

      user.role = cleanRole;
    }

    if (user.role === "admin") {
      user.accountConfirm = true;
    } else if (typeof accountConfirm === "boolean") {
      user.accountConfirm = accountConfirm;
    }

    if (password !== undefined && String(password).trim() !== "") {
      const cleanPassword = String(password).trim();

      if (cleanPassword.length < 6) {
        return res.status(400).json({
          success: false,
          msg: "Password must be at least 6 characters",
        });
      }

      user.password = cleanPassword;
      user.markModified("password");
    }

    await user.save();

    return res.status(200).json({
      success: true,
      msg: `User ${user.email} updated successfully`,
    });
  } catch (err) {
    console.error("updateExpertAdmin error:", err);

    if (err?.code === 11000) {
      return res.status(409).json({
        success: false,
        msg: "Email already registered",
      });
    }

    return res.status(500).json({
      success: false,
      msg: "Error updating user",
    });
  }
};

/**
 * Elimina un usuario no creador de issues y limpia sus datos asociados.
 *
 * @param {import("express").Request} req Request de Express.
 * @param {import("express").Response} res Response de Express.
 * @returns {Promise<void>}
 */
export const deleteUserAdmin = async (req, res) => {
  const { id } = req.body || {};
  const session = await mongoose.startSession();

  try {
    if (!id) {
      return res.status(400).json({
        success: false,
        msg: "Expert id is required",
      });
    }

    session.startTransaction();

    const expert = await User.findById(id).session(session);

    if (!expert) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        msg: "Expert not found",
      });
    }

    if (String(req.uid) === String(id)) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        msg: "You cannot delete your own account from this admin panel",
      });
    }

    const ownedIssuesCount = await Issue.countDocuments({
      admin: expert._id,
    }).session(session);

    if (ownedIssuesCount > 0) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        msg: "This user is creator/admin of one or more issues. Resolve those issues first before deleting the expert.",
      });
    }

    const participations = await Participation.find({
      expert: expert._id,
    }).session(session);

    const issueIds = [...new Set(participations.map((participation) => String(participation.issue)))];

    const issues = issueIds.length
      ? await Issue.find({ _id: { $in: issueIds } }).session(session)
      : [];

    let activeIssuesUpdated = 0;
    let activeIssuesDeleted = 0;
    let finishedIssuesHidden = 0;
    let finishedIssuesDeleted = 0;
    let activeEvaluationsDeleted = 0;
    let activeWeightDocsDeleted = 0;
    let domainsDeleted = 0;

    for (const issue of issues) {
      const participation = participations.find(
        (item) => String(item.issue) === String(issue._id)
      );

      if (!participation) continue;

      if (issue.active) {
        await cleanupExpertDraftsOnExit({
          issueId: issue._id,
          expertId: expert._id,
        });

        const deleteEvaluationsResult = await Evaluation.deleteMany({
          issue: issue._id,
          expert: expert._id,
        }).session(session);

        const deleteWeightDocsResult = await CriteriaWeightEvaluation.deleteMany({
          issue: issue._id,
          expert: expert._id,
        }).session(session);

        await Notification.deleteMany({
          issue: issue._id,
          expert: expert._id,
        }).session(session);

        await Participation.deleteOne({
          _id: participation._id,
        }).session(session);

        activeEvaluationsDeleted += deleteEvaluationsResult.deletedCount || 0;
        activeWeightDocsDeleted += deleteWeightDocsResult.deletedCount || 0;

        const remainingParticipations = await Participation.find({
          issue: issue._id,
        }).session(session);

        if (remainingParticipations.length === 0) {
          await Evaluation.deleteMany({ issue: issue._id }).session(session);
          await Alternative.deleteMany({ issue: issue._id }).session(session);
          await Criterion.deleteMany({ issue: issue._id }).session(session);
          await Participation.deleteMany({ issue: issue._id }).session(session);
          await CriteriaWeightEvaluation.deleteMany({ issue: issue._id }).session(session);
          await Consensus.deleteMany({ issue: issue._id }).session(session);
          await Notification.deleteMany({ issue: issue._id }).session(session);
          await ExitUserIssue.deleteMany({ issue: issue._id }).session(session);
          await IssueExpressionDomain.deleteMany({ issue: issue._id }).session(session);
          await Issue.deleteOne({ _id: issue._id }).session(session);

          activeIssuesDeleted += 1;
        } else {
          const latestConsensus = await Consensus.findOne({
            issue: issue._id,
          })
            .sort({ phase: -1 })
            .session(session);

          const currentPhase = latestConsensus ? latestConsensus.phase + 1 : 1;

          let stageForLog = null;

          if (
            issue.currentStage === "criteriaWeighting" ||
            issue.currentStage === "weightsFinished"
          ) {
            stageForLog = "criteriaWeighting";
          } else if (issue.currentStage === "alternativeEvaluation") {
            stageForLog = "alternativeEvaluation";
          }

          const now = new Date();

          await ExitUserIssue.findOneAndUpdate(
            { issue: issue._id, user: expert._id },
            {
              $setOnInsert: {
                issue: issue._id,
                user: expert._id,
              },
              $set: {
                hidden: true,
                timestamp: now,
                phase: currentPhase,
                stage: stageForLog,
                reason: "Expert account deleted by admin",
              },
              $push: {
                history: {
                  timestamp: now,
                  phase: currentPhase,
                  stage: stageForLog,
                  action: "exited",
                  reason: "Expert account deleted by admin",
                },
              },
            },
            { upsert: true, new: true, session }
          );

          if (issue.currentStage === "criteriaWeighting") {
            const totalParticipants = remainingParticipations.filter((item) =>
              ["accepted", "pending"].includes(item.invitationStatus)
            ).length;

            const totalWeightsDone = remainingParticipations.filter(
              (item) =>
                ["accepted", "pending"].includes(item.invitationStatus) &&
                item.weightsCompleted === true
            ).length;

            if (totalParticipants > 0 && totalParticipants === totalWeightsDone) {
              issue.currentStage = "weightsFinished";
              await issue.save({ session });
            }
          }

          activeIssuesUpdated += 1;
        }
      } else {
        const latestConsensus = await Consensus.findOne({
          issue: issue._id,
        })
          .sort({ phase: -1 })
          .session(session);

        const currentPhase = latestConsensus ? latestConsensus.phase + 1 : null;

        let stageForLog = null;

        if (
          issue.currentStage === "criteriaWeighting" ||
          issue.currentStage === "weightsFinished"
        ) {
          stageForLog = "criteriaWeighting";
        } else if (issue.currentStage === "alternativeEvaluation") {
          stageForLog = "alternativeEvaluation";
        }

        const now = new Date();

        await ExitUserIssue.findOneAndUpdate(
          { issue: issue._id, user: expert._id },
          {
            $setOnInsert: {
              issue: issue._id,
              user: expert._id,
            },
            $set: {
              hidden: true,
              timestamp: now,
              phase: currentPhase,
              stage: stageForLog,
              reason: "Expert account deleted by admin",
            },
            $push: {
              history: {
                timestamp: now,
                phase: currentPhase,
                stage: stageForLog,
                action: "exited",
                reason: "Expert account deleted by admin",
              },
            },
          },
          { upsert: true, new: true, session }
        );

        await Notification.deleteMany({
          issue: issue._id,
          expert: expert._id,
        }).session(session);

        finishedIssuesHidden += 1;

        const participants = await Participation.find({
          issue: issue._id,
        }).session(session);

        const exits = await ExitUserIssue.find({
          issue: issue._id,
          hidden: true,
        }).session(session);

        const allUsersHaveHidden = participants.every((participantItem) =>
          exits.some((exit) => String(exit.user) === String(participantItem.expert))
        );

        if (allUsersHaveHidden) {
          await Evaluation.deleteMany({ issue: issue._id }).session(session);
          await Alternative.deleteMany({ issue: issue._id }).session(session);
          await Criterion.deleteMany({ issue: issue._id }).session(session);
          await Participation.deleteMany({ issue: issue._id }).session(session);
          await CriteriaWeightEvaluation.deleteMany({ issue: issue._id }).session(session);
          await Consensus.deleteMany({ issue: issue._id }).session(session);
          await Notification.deleteMany({ issue: issue._id }).session(session);
          await ExitUserIssue.deleteMany({ issue: issue._id }).session(session);
          await IssueExpressionDomain.deleteMany({ issue: issue._id }).session(session);
          await Issue.deleteOne({ _id: issue._id }).session(session);

          finishedIssuesDeleted += 1;
        }
      }
    }

    const deleteDomainsResult = await ExpressionDomain.deleteMany({
      user: expert._id,
      isGlobal: false,
    }).session(session);

    domainsDeleted = deleteDomainsResult.deletedCount || 0;

    await Notification.deleteMany({
      expert: expert._id,
    }).session(session);

    await User.deleteOne({
      _id: expert._id,
    }).session(session);

    await session.commitTransaction();

    return res.status(200).json({
      success: true,
      msg: `Expert ${expert.email} deleted successfully`,
      summary: {
        activeIssuesUpdated,
        activeIssuesDeleted,
        finishedIssuesHidden,
        finishedIssuesDeleted,
        activeEvaluationsDeleted,
        activeWeightDocsDeleted,
        domainsDeleted,
      },
    });
  } catch (err) {
    await abortTransactionSafely(session);
    console.error("deleteExpertAdmin error:", err);

    return res.status(500).json({
      success: false,
      msg: "Error deleting expert",
      error: err.message,
    });
  } finally {
    await endSessionSafely(session);
  }
};

/**
 * Obtiene el listado resumido de issues para el panel de administración.
 *
 * @param {import("express").Request} req Request de Express.
 * @param {import("express").Response} res Response de Express.
 * @returns {Promise<void>}
 */
export const getAllIssuesAdmin = async (req, res) => {
  try {
    const q = String(req.query.q || "").trim();
    const active = String(req.query.active || "all").trim().toLowerCase();
    const currentStage = String(req.query.currentStage || "all").trim();
    const isConsensus = String(req.query.isConsensus || "all").trim().toLowerCase();
    const adminId = String(req.query.adminId || "").trim();
    const modelId = String(req.query.modelId || "").trim();

    const filter = {};

    if (q) {
      filter.$or = [
        { name: { $regex: q, $options: "i" } },
        { description: { $regex: q, $options: "i" } },
      ];
    }

    if (active === "true") filter.active = true;
    if (active === "false") filter.active = false;

    if (currentStage && currentStage !== "all") {
      filter.currentStage = currentStage;
    }

    if (isConsensus === "true") filter.isConsensus = true;
    if (isConsensus === "false") filter.isConsensus = false;

    if (adminId && isValidObjectId(adminId)) {
      filter.admin = adminId;
    }

    if (modelId && isValidObjectId(modelId)) {
      filter.model = modelId;
    }

    const issues = await Issue.find(filter)
      .populate("admin", "name email role accountConfirm")
      .populate("model", "name isPairwise isConsensus isMultiCriteria")
      .sort({ active: -1, creationDate: -1, name: 1 })
      .lean();

    if (!issues.length) {
      return res.status(200).json({
        success: true,
        issues: [],
      });
    }

    const issueIds = issues.map((issue) => issue._id);

    const [
      alternativesAgg,
      leafCriteriaAgg,
      participationsAgg,
      consensusAgg,
      scenariosAgg,
      evaluationsAgg,
    ] = await Promise.all([
      Alternative.aggregate([
        { $match: { issue: { $in: issueIds } } },
        { $group: { _id: "$issue", total: { $sum: 1 } } },
      ]),

      Criterion.aggregate([
        { $match: { issue: { $in: issueIds }, isLeaf: true } },
        { $group: { _id: "$issue", total: { $sum: 1 } } },
      ]),

      Participation.aggregate([
        { $match: { issue: { $in: issueIds } } },
        {
          $group: {
            _id: "$issue",
            totalExperts: { $sum: 1 },
            acceptedExperts: {
              $sum: {
                $cond: [{ $eq: ["$invitationStatus", "accepted"] }, 1, 0],
              },
            },
            pendingExperts: {
              $sum: {
                $cond: [{ $eq: ["$invitationStatus", "pending"] }, 1, 0],
              },
            },
            declinedExperts: {
              $sum: {
                $cond: [{ $eq: ["$invitationStatus", "declined"] }, 1, 0],
              },
            },
            weightsDoneAccepted: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $eq: ["$invitationStatus", "accepted"] },
                      { $eq: ["$weightsCompleted", true] },
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
            evaluationsDoneAccepted: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $eq: ["$invitationStatus", "accepted"] },
                      { $eq: ["$evaluationCompleted", true] },
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
          },
        },
      ]),

      Consensus.aggregate([
        { $match: { issue: { $in: issueIds } } },
        {
          $group: {
            _id: "$issue",
            totalRounds: { $sum: 1 },
            latestPhase: { $max: "$phase" },
            latestTimestamp: { $max: "$timestamp" },
          },
        },
      ]),

      IssueScenario.aggregate([
        { $match: { issue: { $in: issueIds } } },
        {
          $group: {
            _id: "$issue",
            total: { $sum: 1 },
          },
        },
      ]),

      Evaluation.aggregate([
        { $match: { issue: { $in: issueIds } } },
        {
          $group: {
            _id: "$issue",
            filledCells: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $ne: ["$value", null] },
                      { $ne: ["$value", ""] },
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
            lastEvaluationAt: { $max: "$timestamp" },
          },
        },
      ]),
    ]);

    const alternativesMap = new Map(
      alternativesAgg.map((row) => [asId(row._id), row.total || 0])
    );
    const leafCriteriaMap = new Map(
      leafCriteriaAgg.map((row) => [asId(row._id), row.total || 0])
    );
    const participationsMap = new Map(
      participationsAgg.map((row) => [asId(row._id), row])
    );
    const consensusMap = new Map(
      consensusAgg.map((row) => [asId(row._id), row])
    );
    const scenariosMap = new Map(
      scenariosAgg.map((row) => [asId(row._id), row.total || 0])
    );
    const evaluationsMap = new Map(
      evaluationsAgg.map((row) => [asId(row._id), row])
    );

    const formattedIssues = issues.map((issue) => {
      const issueId = asId(issue._id);

      const totalAlternatives = alternativesMap.get(issueId) || 0;
      const totalLeafCriteria = leafCriteriaMap.get(issueId) || 0;

      const participationStats = participationsMap.get(issueId) || {
        totalExperts: 0,
        acceptedExperts: 0,
        pendingExperts: 0,
        declinedExperts: 0,
        weightsDoneAccepted: 0,
        evaluationsDoneAccepted: 0,
      };

      const consensusStats = consensusMap.get(issueId) || {
        totalRounds: 0,
        latestPhase: 0,
        latestTimestamp: null,
      };

      const evaluationStats = evaluationsMap.get(issueId) || {
        filledCells: 0,
        lastEvaluationAt: null,
      };

      const expectedPerExpert = countExpectedEvaluationCellsPerExpert({
        alternativesCount: totalAlternatives,
        leafCriteriaCount: totalLeafCriteria,
        isPairwise: Boolean(issue.model?.isPairwise),
      });

      return {
        id: issueId,
        name: issue.name,
        description: issue.description,
        active: Boolean(issue.active),
        currentStage: issue.currentStage,
        currentStageMeta: getIssueStageMeta(issue.currentStage),
        weightingMode: issue.weightingMode,
        isConsensus: Boolean(issue.isConsensus),
        consensusMaxPhases: issue.consensusMaxPhases ?? null,
        consensusThreshold: issue.consensusThreshold ?? null,
        creationDate: issue.creationDate || null,
        closureDate: issue.closureDate || null,
        admin: issue.admin
          ? {
              id: asId(issue.admin._id),
              name: issue.admin.name,
              email: issue.admin.email,
              role: issue.admin.role || "user",
              accountConfirm: Boolean(issue.admin.accountConfirm),
            }
          : null,
        model: issue.model
          ? {
              id: asId(issue.model._id),
              name: issue.model.name,
              isPairwise: Boolean(issue.model.isPairwise),
              isConsensus: Boolean(issue.model.isConsensus),
              isMultiCriteria: Boolean(issue.model.isMultiCriteria),
            }
          : null,
        metrics: {
          totalAlternatives,
          totalLeafCriteria,
          totalExperts: participationStats.totalExperts || 0,
          acceptedExperts: participationStats.acceptedExperts || 0,
          pendingExperts: participationStats.pendingExperts || 0,
          declinedExperts: participationStats.declinedExperts || 0,
          weightsDoneAccepted: participationStats.weightsDoneAccepted || 0,
          evaluationsDoneAccepted: participationStats.evaluationsDoneAccepted || 0,
          consensusRounds: consensusStats.totalRounds || 0,
          latestConsensusPhase: consensusStats.latestPhase || 0,
          latestConsensusAt: consensusStats.latestTimestamp || null,
          scenarios: scenariosMap.get(issueId) || 0,
          expectedEvaluationCellsPerExpert: expectedPerExpert,
          totalFilledEvaluationCells: evaluationStats.filledCells || 0,
          lastEvaluationAt: evaluationStats.lastEvaluationAt || null,
        },
        creatorActionsState: getCreatorActionFlags({
          issue,
          acceptedExperts: participationStats.acceptedExperts || 0,
          pendingExperts: participationStats.pendingExperts || 0,
          weightsDoneAccepted: participationStats.weightsDoneAccepted || 0,
          evaluationsDoneAccepted: participationStats.evaluationsDoneAccepted || 0,
        }),
      };
    });

    return res.status(200).json({
      success: true,
      issues: formattedIssues,
    });
  } catch (err) {
    console.error("getAllIssuesAdmin error:", err);
    return res.status(500).json({
      success: false,
      msg: "Error fetching issues",
    });
  }
};

/**
 * Obtiene el detalle completo de un issue para administración.
 *
 * @param {import("express").Request} req Request de Express.
 * @param {import("express").Response} res Response de Express.
 * @returns {Promise<void>}
 */
export const getIssueAdminById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || !isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        msg: "Valid issue id is required",
      });
    }

    let issue = await Issue.findById(id)
      .populate("admin", "name email role accountConfirm")
      .populate(
        "model",
        "name isPairwise isConsensus isMultiCriteria parameters supportedDomains"
      )
      .lean();

    if (!issue) {
      return res.status(404).json({
        success: false,
        msg: "Issue not found",
      });
    }

    const orderedIssue = await ensureIssueOrdersDb({ issueId: id });

    issue = {
      ...issue,
      alternativeOrder: orderedIssue?.alternativeOrder || issue.alternativeOrder || [],
      leafCriteriaOrder: orderedIssue?.leafCriteriaOrder || issue.leafCriteriaOrder || [],
    };

    const [
      orderedAlternatives,
      orderedLeafCriteria,
      allCriteria,
      participations,
      exits,
      consensusDocs,
      scenarios,
      snapshots,
      evaluationAggByExpert,
      weightDocs,
    ] = await Promise.all([
      getOrderedAlternativesDb({
        issueId: id,
        issueDoc: issue,
        select: "_id name",
        lean: true,
      }),
      getOrderedLeafCriteriaDb({
        issueId: id,
        issueDoc: issue,
        select: "_id name type isLeaf parentCriterion",
        lean: true,
      }),
      Criterion.find({ issue: id }).lean(),
      Participation.find({ issue: id })
        .populate("expert", "name email role university accountConfirm")
        .lean(),
      ExitUserIssue.find({ issue: id, hidden: true })
        .populate("user", "name email role university accountConfirm")
        .lean(),
      Consensus.find({ issue: id }).sort({ phase: 1 }).lean(),
      IssueScenario.find({ issue: id })
        .sort({ createdAt: -1 })
        .select("_id name targetModel targetModelName domainType isPairwise status createdAt createdBy")
        .populate("createdBy", "name email")
        .lean(),
      IssueExpressionDomain.find({ issue: id }).lean(),
      Evaluation.aggregate([
        { $match: { issue: new mongoose.Types.ObjectId(id) } },
        {
          $group: {
            _id: "$expert",
            totalDocs: { $sum: 1 },
            filledDocs: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $ne: ["$value", null] },
                      { $ne: ["$value", ""] },
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
            lastEvaluationAt: { $max: "$timestamp" },
          },
        },
      ]),
      CriteriaWeightEvaluation.find({ issue: id }).lean(),
    ]);

    const alternativesCount = orderedAlternatives.length;
    const leafCriteriaCount = orderedLeafCriteria.length;
    const expectedPerExpert = countExpectedEvaluationCellsPerExpert({
      alternativesCount,
      leafCriteriaCount,
      isPairwise: Boolean(issue.model?.isPairwise),
    });

    const criteriaTree = buildCriteriaTreeAdmin(allCriteria);

    const finalWeightsArray = Array.isArray(issue.modelParameters?.weights)
      ? issue.modelParameters.weights
      : [];

    const finalWeightsById = {};
    const finalWeightsByName = {};

    orderedLeafCriteria.forEach((criterion, index) => {
      const value = finalWeightsArray[index] ?? null;
      finalWeightsById[asId(criterion._id)] = value;
      finalWeightsByName[criterion.name] = value;
    });

    const evaluationAggMap = new Map(
      evaluationAggByExpert.map((row) => [
        asId(row._id),
        {
          totalDocs: row.totalDocs || 0,
          filledDocs: row.filledDocs || 0,
          lastEvaluationAt: row.lastEvaluationAt || null,
        },
      ])
    );

    const weightDocMap = new Map(
      weightDocs.map((weightDoc) => [asId(weightDoc.expert), weightDoc])
    );

    const exitMap = new Map(
      exits.map((exit) => [
        asId(exit.user?._id || exit.user),
        {
          hidden: Boolean(exit.hidden),
          timestamp: exit.timestamp || null,
          phase: exit.phase ?? null,
          stage: exit.stage ?? null,
          reason: exit.reason ?? null,
          history: Array.isArray(exit.history) ? exit.history : [],
          user: exit.user
            ? {
                id: asId(exit.user._id),
                name: exit.user.name,
                email: exit.user.email,
                role: exit.user.role || "user",
                university: exit.user.university || "",
                accountConfirm: Boolean(exit.user.accountConfirm),
              }
            : null,
        },
      ])
    );

    const participantsDetailed = participations.map((participation) => {
      const expertId = asId(participation.expert?._id || participation.expert);
      const evaluationStats = evaluationAggMap.get(expertId) || {
        totalDocs: 0,
        filledDocs: 0,
        lastEvaluationAt: null,
      };
      const weightDoc = weightDocMap.get(expertId) || null;
      const exitInfo = exitMap.get(expertId) || null;

      return {
        expert: participation.expert
          ? {
              id: asId(participation.expert._id),
              name: participation.expert.name,
              email: participation.expert.email,
              role: participation.expert.role || "user",
              university: participation.expert.university || "",
              accountConfirm: Boolean(participation.expert.accountConfirm),
            }
          : {
              id: expertId,
              name: "Deleted user",
              email: "Deleted user",
              role: "user",
              university: "",
              accountConfirm: false,
            },
        currentParticipant: true,
        invitationStatus: participation.invitationStatus,
        weightsCompleted: Boolean(participation.weightsCompleted),
        evaluationCompleted: Boolean(participation.evaluationCompleted),
        joinedAt: participation.joinedAt || null,
        entryPhase: participation.entryPhase ?? null,
        entryStage: participation.entryStage ?? null,
        progress: {
          expectedEvaluationCells: expectedPerExpert,
          totalEvaluationDocs: evaluationStats.totalDocs,
          filledEvaluationDocs: evaluationStats.filledDocs,
          evaluationProgressPct:
            expectedPerExpert > 0
              ? Number(((evaluationStats.filledDocs / expectedPerExpert) * 100).toFixed(2))
              : 0,
          lastEvaluationAt: evaluationStats.lastEvaluationAt,
          hasWeightDoc: Boolean(weightDoc),
          weightDocCompleted: Boolean(weightDoc?.completed),
          weightDocPhase: weightDoc?.consensusPhase ?? null,
          weightDocUpdatedAt: weightDoc?.updatedAt || null,
        },
        exitInfo,
      };
    });

    const currentParticipantIds = new Set(
      participations.map((participation) => asId(participation.expert?._id || participation.expert))
    );

    const exitedUsersDetailed = exits
      .filter((exit) => !currentParticipantIds.has(asId(exit.user?._id || exit.user)))
      .map((exit) => ({
        expert: exit.user
          ? {
              id: asId(exit.user._id),
              name: exit.user.name,
              email: exit.user.email,
              role: exit.user.role || "user",
              university: exit.user.university || "",
              accountConfirm: Boolean(exit.user.accountConfirm),
            }
          : {
              id: asId(exit.user),
              name: "Deleted user",
              email: "Deleted user",
              role: "user",
              university: "",
              accountConfirm: false,
            },
        currentParticipant: false,
        exitInfo: {
          hidden: Boolean(exit.hidden),
          timestamp: exit.timestamp || null,
          phase: exit.phase ?? null,
          stage: exit.stage ?? null,
          reason: exit.reason ?? null,
          history: Array.isArray(exit.history) ? exit.history : [],
        },
      }));

    const acceptedExperts = participations.filter(
      (participation) => participation.invitationStatus === "accepted"
    );
    const pendingExperts = participations.filter(
      (participation) => participation.invitationStatus === "pending"
    );
    const declinedExperts = participations.filter(
      (participation) => participation.invitationStatus === "declined"
    );

    const latestConsensus = consensusDocs.length
      ? consensusDocs[consensusDocs.length - 1]
      : null;

    const snapshotsSummary = {
      total: snapshots.length,
      numeric: snapshots.filter((domain) => domain.type === "numeric").length,
      linguistic: snapshots.filter((domain) => domain.type === "linguistic").length,
    };

    const totalFilledEvaluationCells = Array.from(evaluationAggMap.values()).reduce(
      (accumulator, row) => accumulator + (row.filledDocs || 0),
      0
    );

    return res.status(200).json({
      success: true,
      issue: {
        id: asId(issue._id),
        name: issue.name,
        description: issue.description,
        active: Boolean(issue.active),
        currentStage: issue.currentStage,
        currentStageMeta: getIssueStageMeta(issue.currentStage),
        weightingMode: issue.weightingMode,
        isConsensus: Boolean(issue.isConsensus),
        consensusMaxPhases: issue.consensusMaxPhases ?? null,
        consensusThreshold: issue.consensusThreshold ?? null,
        creationDate: issue.creationDate || null,
        closureDate: issue.closureDate || null,
        admin: issue.admin
          ? {
              id: asId(issue.admin._id),
              name: issue.admin.name,
              email: issue.admin.email,
              role: issue.admin.role || "user",
              accountConfirm: Boolean(issue.admin.accountConfirm),
            }
          : null,
        model: issue.model
          ? {
              id: asId(issue.model._id),
              name: issue.model.name,
              isPairwise: Boolean(issue.model.isPairwise),
              isConsensus: Boolean(issue.model.isConsensus),
              isMultiCriteria: Boolean(issue.model.isMultiCriteria),
              supportedDomains: issue.model.supportedDomains || {},
              parameters: issue.model.parameters || [],
            }
          : null,
        alternatives: orderedAlternatives.map((alternative) => ({
          id: asId(alternative._id),
          name: alternative.name,
        })),
        criteria: criteriaTree,
        leafCriteria: orderedLeafCriteria.map((criterion) => ({
          id: asId(criterion._id),
          name: criterion.name,
          type: criterion.type,
        })),
        finalWeights: finalWeightsByName,
        finalWeightsById,
        modelParameters: issue.modelParameters || {},
        snapshots: snapshotsSummary,
        consensus: {
          rounds: consensusDocs.length,
          latestPhase: latestConsensus?.phase || 0,
          latestLevel: latestConsensus?.level ?? null,
          latestAt: latestConsensus?.timestamp || null,
        },
        scenarios: scenarios.map((scenario) => ({
          id: asId(scenario._id),
          name: scenario.name || "",
          targetModelId: asId(scenario.targetModel),
          targetModelName: scenario.targetModelName || "",
          domainType: scenario.domainType || null,
          isPairwise: Boolean(scenario.isPairwise),
          status: scenario.status || "done",
          createdAt: scenario.createdAt || null,
          createdBy: scenario.createdBy
            ? {
                id: asId(scenario.createdBy._id),
                name: scenario.createdBy.name,
                email: scenario.createdBy.email,
              }
            : null,
        })),
        metrics: {
          totalAlternatives: alternativesCount,
          totalCriteria: allCriteria.length,
          totalLeafCriteria: leafCriteriaCount,
          totalExperts: participations.length,
          acceptedExperts: acceptedExperts.length,
          pendingExperts: pendingExperts.length,
          declinedExperts: declinedExperts.length,
          weightsDoneAccepted: acceptedExperts.filter((item) => item.weightsCompleted).length,
          evaluationsDoneAccepted: acceptedExperts.filter((item) => item.evaluationCompleted).length,
          expectedEvaluationCellsPerExpert: expectedPerExpert,
          totalFilledEvaluationCells,
        },
        creatorActionsState: getCreatorActionFlags({
          issue,
          acceptedExperts: acceptedExperts.length,
          pendingExperts: pendingExperts.length,
          weightsDoneAccepted: acceptedExperts.filter((item) => item.weightsCompleted).length,
          evaluationsDoneAccepted: acceptedExperts.filter((item) => item.evaluationCompleted).length,
        }),
        participants: participantsDetailed.sort((a, b) =>
          String(a.expert?.email || a.expert?.name || "").localeCompare(
            String(b.expert?.email || b.expert?.name || ""),
            undefined,
            { sensitivity: "base" }
          )
        ),
        exitedUsers: exitedUsersDetailed.sort((a, b) =>
          String(a.expert?.email || a.expert?.name || "").localeCompare(
            String(b.expert?.email || b.expert?.name || ""),
            undefined,
            { sensitivity: "base" }
          )
        ),
      },
    });
  } catch (err) {
    console.error("getIssueAdminById error:", err);
    return res.status(500).json({
      success: false,
      msg: "Error fetching issue detail",
    });
  }
};

/**
 * Obtiene una vista resumida del progreso de expertos en un issue.
 *
 * @param {import("express").Request} req Request de Express.
 * @param {import("express").Response} res Response de Express.
 * @returns {Promise<void>}
 */
export const getIssueExpertsProgressAdmin = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || !isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        msg: "Valid issue id is required",
      });
    }

    const issue = await Issue.findById(id)
      .populate("model", "name isPairwise")
      .lean();

    if (!issue) {
      return res.status(404).json({
        success: false,
        msg: "Issue not found",
      });
    }

    const orderedIssue = await ensureIssueOrdersDb({ issueId: id });

    const [alternatives, leafCriteria, participations, exits, evaluationAgg, weightDocs] =
      await Promise.all([
        getOrderedAlternativesDb({
          issueId: id,
          issueDoc: orderedIssue || issue,
          select: "_id name",
          lean: true,
        }),
        getOrderedLeafCriteriaDb({
          issueId: id,
          issueDoc: orderedIssue || issue,
          select: "_id name",
          lean: true,
        }),
        Participation.find({ issue: id })
          .populate("expert", "name email role university accountConfirm")
          .lean(),
        ExitUserIssue.find({ issue: id, hidden: true })
          .populate("user", "name email role university accountConfirm")
          .lean(),
        Evaluation.aggregate([
          { $match: { issue: new mongoose.Types.ObjectId(id) } },
          {
            $group: {
              _id: "$expert",
              totalDocs: { $sum: 1 },
              filledDocs: {
                $sum: {
                  $cond: [
                    {
                      $and: [
                        { $ne: ["$value", null] },
                        { $ne: ["$value", ""] },
                      ],
                    },
                    1,
                    0,
                  ],
                },
              },
              lastEvaluationAt: { $max: "$timestamp" },
            },
          },
        ]),
        CriteriaWeightEvaluation.find({ issue: id }).lean(),
      ]);

    const expectedPerExpert = countExpectedEvaluationCellsPerExpert({
      alternativesCount: alternatives.length,
      leafCriteriaCount: leafCriteria.length,
      isPairwise: Boolean(issue.model?.isPairwise),
    });

    const evaluationMap = new Map(
      evaluationAgg.map((row) => [
        asId(row._id),
        {
          totalDocs: row.totalDocs || 0,
          filledDocs: row.filledDocs || 0,
          lastEvaluationAt: row.lastEvaluationAt || null,
        },
      ])
    );

    const weightMap = new Map(
      weightDocs.map((weightDoc) => [asId(weightDoc.expert), weightDoc])
    );

    const currentParticipantIds = new Set(
      participations.map((participation) => asId(participation.expert?._id || participation.expert))
    );

    const rows = [];

    for (const participation of participations) {
      const expertId = asId(participation.expert?._id || participation.expert);
      const evaluationStats = evaluationMap.get(expertId) || {
        totalDocs: 0,
        filledDocs: 0,
        lastEvaluationAt: null,
      };
      const weightDoc = weightMap.get(expertId) || null;

      rows.push({
        expert: participation.expert
          ? {
              id: asId(participation.expert._id),
              name: participation.expert.name,
              email: participation.expert.email,
              role: participation.expert.role || "user",
              university: participation.expert.university || "",
              accountConfirm: Boolean(participation.expert.accountConfirm),
            }
          : {
              id: expertId,
              name: "Deleted user",
              email: "Deleted user",
              role: "user",
              university: "",
              accountConfirm: false,
            },
        currentParticipant: true,
        invitationStatus: participation.invitationStatus,
        weightsCompleted: Boolean(participation.weightsCompleted),
        evaluationCompleted: Boolean(participation.evaluationCompleted),
        joinedAt: participation.joinedAt || null,
        entryPhase: participation.entryPhase ?? null,
        entryStage: participation.entryStage ?? null,
        progress: {
          expectedEvaluationCells: expectedPerExpert,
          totalEvaluationDocs: evaluationStats.totalDocs,
          filledEvaluationDocs: evaluationStats.filledDocs,
          evaluationProgressPct:
            expectedPerExpert > 0
              ? Number(((evaluationStats.filledDocs / expectedPerExpert) * 100).toFixed(2))
              : 0,
          lastEvaluationAt: evaluationStats.lastEvaluationAt || null,
          hasWeightDoc: Boolean(weightDoc),
          weightDocCompleted: Boolean(weightDoc?.completed),
          weightDocPhase: weightDoc?.consensusPhase ?? null,
          weightDocUpdatedAt: weightDoc?.updatedAt || null,
        },
      });
    }

    for (const exit of exits) {
      const expertId = asId(exit.user?._id || exit.user);

      if (currentParticipantIds.has(expertId)) continue;

      const evaluationStats = evaluationMap.get(expertId) || {
        totalDocs: 0,
        filledDocs: 0,
        lastEvaluationAt: null,
      };
      const weightDoc = weightMap.get(expertId) || null;

      rows.push({
        expert: exit.user
          ? {
              id: asId(exit.user._id),
              name: exit.user.name,
              email: exit.user.email,
              role: exit.user.role || "user",
              university: exit.user.university || "",
              accountConfirm: Boolean(exit.user.accountConfirm),
            }
          : {
              id: expertId,
              name: "Deleted user",
              email: "Deleted user",
              role: "user",
              university: "",
              accountConfirm: false,
            },
        currentParticipant: false,
        invitationStatus: "exited",
        weightsCompleted: Boolean(weightDoc?.completed),
        evaluationCompleted: false,
        joinedAt: null,
        entryPhase: null,
        entryStage: null,
        exitInfo: {
          hidden: Boolean(exit.hidden),
          timestamp: exit.timestamp || null,
          phase: exit.phase ?? null,
          stage: exit.stage ?? null,
          reason: exit.reason ?? null,
        },
        progress: {
          expectedEvaluationCells: expectedPerExpert,
          totalEvaluationDocs: evaluationStats.totalDocs,
          filledEvaluationDocs: evaluationStats.filledDocs,
          evaluationProgressPct:
            expectedPerExpert > 0
              ? Number(((evaluationStats.filledDocs / expectedPerExpert) * 100).toFixed(2))
              : 0,
          lastEvaluationAt: evaluationStats.lastEvaluationAt || null,
          hasWeightDoc: Boolean(weightDoc),
          weightDocCompleted: Boolean(weightDoc?.completed),
          weightDocPhase: weightDoc?.consensusPhase ?? null,
          weightDocUpdatedAt: weightDoc?.updatedAt || null,
        },
      });
    }

    rows.sort((a, b) => {
      if (a.currentParticipant !== b.currentParticipant) {
        return a.currentParticipant ? -1 : 1;
      }

      return String(a.expert?.email || a.expert?.name || "").localeCompare(
        String(b.expert?.email || b.expert?.name || ""),
        undefined,
        { sensitivity: "base" }
      );
    });

    return res.status(200).json({
      success: true,
      issue: {
        id: asId(issue._id),
        name: issue.name,
        currentStage: issue.currentStage,
        weightingMode: issue.weightingMode,
        active: Boolean(issue.active),
        isPairwise: Boolean(issue.model?.isPairwise),
      },
      experts: rows,
    });
  } catch (err) {
    console.error("getIssueExpertsProgressAdmin error:", err);
    return res.status(500).json({
      success: false,
      msg: "Error fetching issue experts progress",
    });
  }
};

/**
 * Obtiene las evaluaciones de un experto en modo solo lectura.
 *
 * @param {import("express").Request} req Request de Express.
 * @param {import("express").Response} res Response de Express.
 * @returns {Promise<void>}
 */
export const getIssueExpertEvaluationsAdmin = async (req, res) => {
  try {
    const { issueId, expertId } = req.params;

    if (!issueId || !isValidObjectId(issueId)) {
      return res.status(400).json({
        success: false,
        msg: "Valid issue id is required",
      });
    }

    if (!expertId || !isValidObjectId(expertId)) {
      return res.status(400).json({
        success: false,
        msg: "Valid expert id is required",
      });
    }

    const issue = await Issue.findById(issueId)
      .populate("model", "name isPairwise")
      .lean();

    if (!issue) {
      return res.status(404).json({
        success: false,
        msg: "Issue not found",
      });
    }

    const orderedIssue = await ensureIssueOrdersDb({ issueId });

    const [expert, participation, latestConsensus, orderedAlternatives, orderedLeafCriteria] =
      await Promise.all([
        User.findById(expertId)
          .select("name email role university accountConfirm")
          .lean(),
        Participation.findOne({ issue: issueId, expert: expertId }).lean(),
        Consensus.findOne({ issue: issueId }).sort({ phase: -1 }).lean(),
        getOrderedAlternativesDb({
          issueId,
          issueDoc: orderedIssue || issue,
          select: "_id name",
          lean: true,
        }),
        getOrderedLeafCriteriaDb({
          issueId,
          issueDoc: orderedIssue || issue,
          select: "_id name type",
          lean: true,
        }),
      ]);

    if (Boolean(issue.model?.isPairwise)) {
      const evaluationDocs = await Evaluation.find({
        issue: issueId,
        expert: expertId,
        comparedAlternative: { $ne: null },
      })
        .populate("alternative", "name")
        .populate("comparedAlternative", "name")
        .populate("criterion", "name")
        .populate("expressionDomain")
        .lean();

      if (!participation && !expert && evaluationDocs.length === 0) {
        return res.status(404).json({
          success: false,
          msg: "Expert data for this issue not found",
        });
      }

      const formattedEvaluations = {};

      for (const criterion of orderedLeafCriteria) {
        formattedEvaluations[criterion.name] = orderedAlternatives.map((alternative) => ({
          id: alternative.name,
        }));
      }

      const rowMap = new Map();

      for (const criterion of orderedLeafCriteria) {
        for (const alternative of orderedAlternatives) {
          rowMap.set(
            `${criterion.name}__${alternative.name}`,
            formattedEvaluations[criterion.name].find((row) => row.id === alternative.name)
          );
        }
      }

      let lastEvaluationAt = null;
      let filledCells = 0;

      for (const doc of evaluationDocs) {
        const criterionName = doc.criterion?.name;
        const alternativeName = doc.alternative?.name;
        const comparedAlternativeName = doc.comparedAlternative?.name;

        if (!criterionName || !alternativeName || !comparedAlternativeName) continue;

        const row = rowMap.get(`${criterionName}__${alternativeName}`);
        if (!row) continue;

        row[comparedAlternativeName] = {
          value: doc.value ?? "",
          domain: formatIssueSnapshotDomain(doc.expressionDomain),
          timestamp: doc.timestamp || null,
          consensusPhase: doc.consensusPhase ?? null,
        };

        if (isFilledValue(doc.value)) {
          filledCells += 1;
        }

        if (
          doc.timestamp &&
          (!lastEvaluationAt || new Date(doc.timestamp) > new Date(lastEvaluationAt))
        ) {
          lastEvaluationAt = doc.timestamp;
        }
      }

      return res.status(200).json({
        success: true,
        issue: {
          id: asId(issue._id),
          name: issue.name,
          currentStage: issue.currentStage,
          weightingMode: issue.weightingMode,
          active: Boolean(issue.active),
          isPairwise: true,
        },
        expert: expert
          ? {
              id: asId(expert._id),
              name: expert.name,
              email: expert.email,
              role: expert.role || "user",
              university: expert.university || "",
              accountConfirm: Boolean(expert.accountConfirm),
            }
          : {
              id: expertId,
              name: "Deleted user",
              email: "Deleted user",
              role: "user",
              university: "",
              accountConfirm: false,
            },
        participation: participation
          ? {
              invitationStatus: participation.invitationStatus,
              weightsCompleted: Boolean(participation.weightsCompleted),
              evaluationCompleted: Boolean(participation.evaluationCompleted),
              joinedAt: participation.joinedAt || null,
              entryPhase: participation.entryPhase ?? null,
              entryStage: participation.entryStage ?? null,
            }
          : null,
        stats: {
          expectedCells: countExpectedEvaluationCellsPerExpert({
            alternativesCount: orderedAlternatives.length,
            leafCriteriaCount: orderedLeafCriteria.length,
            isPairwise: true,
          }),
          filledCells,
          lastEvaluationAt,
        },
        evaluations: formattedEvaluations,
        collectiveEvaluations: latestConsensus?.collectiveEvaluations || null,
      });
    }

    const evaluationDocs = await Evaluation.find({
      issue: issueId,
      expert: expertId,
      comparedAlternative: null,
    })
      .populate("alternative", "name")
      .populate("criterion", "name")
      .populate("expressionDomain")
      .lean();

    if (!participation && !expert && evaluationDocs.length === 0) {
      return res.status(404).json({
        success: false,
        msg: "Expert data for this issue not found",
      });
    }

    const evaluations = {};
    const evaluationMap = new Map();

    let lastEvaluationAt = null;
    let filledCells = 0;

    for (const doc of evaluationDocs) {
      const alternativeId = asId(doc.alternative?._id || doc.alternative);
      const criterionId = asId(doc.criterion?._id || doc.criterion);

      evaluationMap.set(`${alternativeId}__${criterionId}`, doc);

      if (isFilledValue(doc.value)) {
        filledCells += 1;
      }

      if (
        doc.timestamp &&
        (!lastEvaluationAt || new Date(doc.timestamp) > new Date(lastEvaluationAt))
      ) {
        lastEvaluationAt = doc.timestamp;
      }
    }

    for (const alternative of orderedAlternatives) {
      evaluations[alternative.name] = {};

      for (const criterion of orderedLeafCriteria) {
        const doc = evaluationMap.get(`${asId(alternative._id)}__${asId(criterion._id)}`);

        evaluations[alternative.name][criterion.name] = {
          value: doc?.value ?? "",
          domain: formatIssueSnapshotDomain(doc?.expressionDomain || null),
          timestamp: doc?.timestamp || null,
          consensusPhase: doc?.consensusPhase ?? null,
        };
      }
    }

    return res.status(200).json({
      success: true,
      issue: {
        id: asId(issue._id),
        name: issue.name,
        currentStage: issue.currentStage,
        weightingMode: issue.weightingMode,
        active: Boolean(issue.active),
        isPairwise: false,
      },
      expert: expert
        ? {
            id: asId(expert._id),
            name: expert.name,
            email: expert.email,
            role: expert.role || "user",
            university: expert.university || "",
            accountConfirm: Boolean(expert.accountConfirm),
          }
        : {
            id: expertId,
            name: "Deleted user",
            email: "Deleted user",
            role: "user",
            university: "",
            accountConfirm: false,
          },
      participation: participation
        ? {
            invitationStatus: participation.invitationStatus,
            weightsCompleted: Boolean(participation.weightsCompleted),
            evaluationCompleted: Boolean(participation.evaluationCompleted),
            joinedAt: participation.joinedAt || null,
            entryPhase: participation.entryPhase ?? null,
            entryStage: participation.entryStage ?? null,
          }
        : null,
      stats: {
        expectedCells: countExpectedEvaluationCellsPerExpert({
          alternativesCount: orderedAlternatives.length,
          leafCriteriaCount: orderedLeafCriteria.length,
          isPairwise: false,
        }),
        filledCells,
        lastEvaluationAt,
      },
      evaluations,
      collectiveEvaluations: latestConsensus?.collectiveEvaluations || null,
    });
  } catch (err) {
    console.error("getIssueExpertEvaluationsAdmin error:", err);
    return res.status(500).json({
      success: false,
      msg: "Error fetching expert evaluations",
    });
  }
};

/**
 * Obtiene los pesos de un experto en modo solo lectura.
 *
 * @param {import("express").Request} req Request de Express.
 * @param {import("express").Response} res Response de Express.
 * @returns {Promise<void>}
 */
export const getIssueExpertWeightsAdmin = async (req, res) => {
  try {
    const { issueId, expertId } = req.params;

    if (!issueId || !isValidObjectId(issueId)) {
      return res.status(400).json({
        success: false,
        msg: "Valid issue id is required",
      });
    }

    if (!expertId || !isValidObjectId(expertId)) {
      return res.status(400).json({
        success: false,
        msg: "Valid expert id is required",
      });
    }

    const issue = await Issue.findById(issueId)
      .populate("model", "name isPairwise")
      .lean();

    if (!issue) {
      return res.status(404).json({
        success: false,
        msg: "Issue not found",
      });
    }

    const orderedIssue = await ensureIssueOrdersDb({ issueId });

    const [expert, participation, orderedLeafCriteria, weightDoc] = await Promise.all([
      User.findById(expertId)
        .select("name email role university accountConfirm")
        .lean(),
      Participation.findOne({ issue: issueId, expert: expertId }).lean(),
      getOrderedLeafCriteriaDb({
        issueId,
        issueDoc: orderedIssue || issue,
        select: "_id name type",
        lean: true,
      }),
      CriteriaWeightEvaluation.findOne({ issue: issueId, expert: expertId }).lean(),
    ]);

    if (!expert && !participation && !weightDoc) {
      return res.status(404).json({
        success: false,
        msg: "Expert weight data for this issue not found",
      });
    }

    const leafNames = orderedLeafCriteria.map((criterion) => criterion.name);

    const resolvedWeights =
      Array.isArray(issue.modelParameters?.weights) && issue.modelParameters.weights.length
        ? leafNames.reduce((accumulator, name, index) => {
            accumulator[name] = issue.modelParameters.weights[index] ?? null;
            return accumulator;
          }, {})
        : null;

    const manualWeights = weightDoc
      ? orderObjectByKeys(weightDoc.manualWeights || {}, leafNames)
      : orderObjectByKeys({}, leafNames);

    const bwmData = {
      bestCriterion: weightDoc?.bestCriterion || "",
      worstCriterion: weightDoc?.worstCriterion || "",
      bestToOthers: orderObjectByKeys(weightDoc?.bestToOthers || {}, leafNames),
      othersToWorst: orderObjectByKeys(weightDoc?.othersToWorst || {}, leafNames),
    };

    let kind = "unknown";

    if (leafNames.length === 1) {
      kind = "singleLeaf";
    } else if (issue.weightingMode === "consensus") {
      kind = "manualConsensus";
    } else if (["bwm", "consensusBwm", "simulatedConsensusBwm"].includes(issue.weightingMode)) {
      kind = "bwm";
    } else if (
      Array.isArray(issue.modelParameters?.weights) &&
      issue.modelParameters.weights.length
    ) {
      kind = "directWeights";
    }

    return res.status(200).json({
      success: true,
      issue: {
        id: asId(issue._id),
        name: issue.name,
        currentStage: issue.currentStage,
        weightingMode: issue.weightingMode,
        active: Boolean(issue.active),
        model: issue.model
          ? {
              id: asId(issue.model._id),
              name: issue.model.name,
              isPairwise: Boolean(issue.model.isPairwise),
            }
          : null,
      },
      expert: expert
        ? {
            id: asId(expert._id),
            name: expert.name,
            email: expert.email,
            role: expert.role || "user",
            university: expert.university || "",
            accountConfirm: Boolean(expert.accountConfirm),
          }
        : {
            id: expertId,
            name: "Deleted user",
            email: "Deleted user",
            role: "user",
            university: "",
            accountConfirm: false,
          },
      participation: participation
        ? {
            invitationStatus: participation.invitationStatus,
            weightsCompleted: Boolean(participation.weightsCompleted),
            evaluationCompleted: Boolean(participation.evaluationCompleted),
            joinedAt: participation.joinedAt || null,
            entryPhase: participation.entryPhase ?? null,
            entryStage: participation.entryStage ?? null,
          }
        : null,
      weights: {
        kind,
        leafCriteria: leafNames,
        singleLeafAutoWeights:
          leafNames.length === 1
            ? { [leafNames[0]]: 1 }
            : null,
        resolvedWeights,
        manualWeights: kind === "manualConsensus" ? manualWeights : null,
        bwmData: kind === "bwm" ? bwmData : null,
        weightDoc: weightDoc
          ? {
              completed: Boolean(weightDoc.completed),
              consensusPhase: weightDoc.consensusPhase ?? null,
              updatedAt: weightDoc.updatedAt || null,
            }
          : null,
      },
    });
  } catch (err) {
    console.error("getIssueExpertWeightsAdmin error:", err);
    return res.status(500).json({
      success: false,
      msg: "Error fetching expert weights",
    });
  }
};

/**
 * Reasigna el creador o responsable principal de un issue.
 *
 * @param {import("express").Request} req Request de Express.
 * @param {import("express").Response} res Response de Express.
 * @returns {Promise<void>}
 */
export const reassignIssueAdminAdmin = async (req, res) => {
  try {
    const { issueId, newAdminId } = req.body || {};

    if (!issueId || !isValidObjectId(issueId)) {
      return res.status(400).json({
        success: false,
        msg: "Valid issueId is required",
      });
    }

    if (!newAdminId || !isValidObjectId(newAdminId)) {
      return res.status(400).json({
        success: false,
        msg: "Valid newAdminId is required",
      });
    }

    const [issue, newAdmin] = await Promise.all([
      Issue.findById(issueId).populate("admin", "name email role").exec(),
      User.findById(newAdminId)
        .select("name email role accountConfirm")
        .exec(),
    ]);

    if (!issue) {
      return res.status(404).json({
        success: false,
        msg: "Issue not found",
      });
    }

    if (!newAdmin) {
      return res.status(404).json({
        success: false,
        msg: "Target user not found",
      });
    }

    if (!newAdmin.accountConfirm) {
      return res.status(400).json({
        success: false,
        msg: "Target user account is not confirmed",
      });
    }

    const oldAdmin = issue.admin
      ? {
          id: asId(issue.admin._id),
          name: issue.admin.name,
          email: issue.admin.email,
          role: issue.admin.role || "user",
        }
      : null;

    if (String(issue.admin?._id || issue.admin) === String(newAdmin._id)) {
      return res.status(200).json({
        success: true,
        msg: `Issue ${issue.name} is already assigned to ${newAdmin.email}`,
        admin: {
          oldAdmin,
          newAdmin: {
            id: asId(newAdmin._id),
            name: newAdmin.name,
            email: newAdmin.email,
            role: newAdmin.role || "user",
          },
        },
      });
    }

    issue.admin = newAdmin._id;
    await issue.save();

    return res.status(200).json({
      success: true,
      msg: `Issue ${issue.name} reassigned to ${newAdmin.email} successfully`,
      admin: {
        oldAdmin,
        newAdmin: {
          id: asId(newAdmin._id),
          name: newAdmin.name,
          email: newAdmin.email,
          role: newAdmin.role || "user",
        },
      },
    });
  } catch (err) {
    console.error("reassignIssueAdminAdmin error:", err);
    return res.status(500).json({
      success: false,
      msg: "Error reassigning issue admin",
    });
  }
};

/**
 * Permite al admin editar expertos de un issue usando la lógica del creador.
 *
 * @param {import("express").Request} req Request de Express.
 * @param {import("express").Response} res Response de Express.
 * @returns {Promise<any>}
 */
export const editIssueExpertsAdmin = async (req, res) => {
  try {
    const issueId = req.body?.issueId || req.body?.id;

    return await runAsIssueCreator({
      issueId,
      req,
      res,
      action: async () => {
        req.body = {
          ...req.body,
          id: issueId,
          expertsToAdd: Array.isArray(req.body?.expertsToAdd) ? req.body.expertsToAdd : [],
          expertsToRemove: Array.isArray(req.body?.expertsToRemove) ? req.body.expertsToRemove : [],
        };

        return editExpertsOwner(req, res);
      },
    });
  } catch (err) {
    console.error("editIssueExpertsAdmin error:", err);
    return res.status(500).json({
      success: false,
      msg: "Error editing issue experts",
    });
  }
};

/**
 * Permite al admin computar pesos de un issue usando la lógica del creador.
 *
 * @param {import("express").Request} req Request de Express.
 * @param {import("express").Response} res Response de Express.
 * @returns {Promise<any>}
 */
export const computeIssueWeightsAdmin = async (req, res) => {
  try {
    const issueId = req.body?.issueId || req.body?.id;

    return await runAsIssueCreator({
      issueId,
      req,
      res,
      action: async (issue) => {
        req.body = {
          ...req.body,
          id: issueId,
        };

        if (issue.weightingMode === "consensus") {
          return computeManualWeightsOwner(req, res);
        }

        return computeWeightsOwner(req, res);
      },
    });
  } catch (err) {
    console.error("computeIssueWeightsAdmin error:", err);
    return res.status(500).json({
      success: false,
      msg: "Error computing issue weights",
    });
  }
};

/**
 * Permite al admin resolver un issue usando la lógica del creador.
 *
 * @param {import("express").Request} req Request de Express.
 * @param {import("express").Response} res Response de Express.
 * @returns {Promise<any>}
 */
export const resolveIssueAdmin = async (req, res) => {
  try {
    const issueId = req.body?.issueId || req.body?.id;

    return await runAsIssueCreator({
      issueId,
      req,
      res,
      action: async (issue) => {
        req.body = {
          ...req.body,
          id: issueId,
        };

        if (issue.model?.isPairwise) {
          return resolvePairwiseIssueOwner(req, res);
        }

        return resolveIssueOwner(req, res);
      },
    });
  } catch (err) {
    console.error("resolveIssueAdmin error:", err);
    return res.status(500).json({
      success: false,
      msg: "Error resolving issue",
    });
  }
};

/**
 * Permite al admin eliminar un issue usando la lógica del creador.
 *
 * @param {import("express").Request} req Request de Express.
 * @param {import("express").Response} res Response de Express.
 * @returns {Promise<any>}
 */
export const removeIssueAdmin = async (req, res) => {
  try {
    const issueId = req.body?.issueId || req.body?.id;

    return await runAsIssueCreator({
      issueId,
      req,
      res,
      action: async () => {
        req.body = {
          ...req.body,
          id: issueId,
        };

        return removeIssueOwner(req, res);
      },
    });
  } catch (err) {
    console.error("removeIssueAdmin error:", err);
    return res.status(500).json({
      success: false,
      msg: "Error removing issue",
    });
  }
};