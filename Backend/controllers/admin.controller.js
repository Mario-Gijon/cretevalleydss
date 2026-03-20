// controllers/admin.controller.js
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

const runAsIssueCreator = async ({ issueId, req, res, action }) => {
  if (!issueId || !mongoose.Types.ObjectId.isValid(issueId)) {
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
 * GET /api/admin/getAllExperts
 * Devuelve todos los usuarios no-admin con estadísticas útiles para el CRUD.
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

    const userIds = users.map((u) => u._id);

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

    for (const p of participations) {
      if (!p.issue) continue;

      const key = String(p.expert);
      const slot = participationStatsMap.get(key);
      if (!slot) continue;

      if (p.issue.active) slot.activeIssues += 1;
      else slot.finishedIssues += 1;
    }

    const formattedUsers = users.map((u) => {
      const userId = String(u._id);

      return {
        id: userId,
        name: u.name,
        university: u.university,
        email: u.email,
        role: u.role || "user",
        accountConfirm: Boolean(u.accountConfirm),
        accountCreation: u.accountCreation || null,
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
 * POST /api/admin/createExpert
 * Crea un experto (realmente un usuario no-admin).
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
 * POST /api/admin/updateExpert
 * Actualiza un experto.
 * Espera { id, name?, university?, email?, password?, accountConfirm? }
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

    // Si es admin, siempre confirmado
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
 * POST /api/admin/deleteExpert
 * Borra un experto en cascada.
 * Comportamiento:
 * - Si participa en issues activos: se le expulsa como si el creador lo hubiese eliminado.
 * - Si al expulsarlo un issue activo se queda sin expertos, ese issue activo se elimina.
 * - Si participa en issues finalizados: se oculta para ese usuario como si él lo hubiera eliminado.
 * - Borra dominios propios del usuario.
 * - Finalmente borra la cuenta.
 *
 * Importante:
 * - NO permite borrar usuarios que sean admins.
 * - NO permite borrar usuarios que sean creadores de issues.
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
      session.endSession();
      return res.status(404).json({
        success: false,
        msg: "Expert not found",
      });
    }

    if (String(req.uid) === String(id)) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        msg: "You cannot delete your own account from this admin panel",
      });
    }

    // No permitir borrar usuarios que sean creadores de issues.
    const ownedIssuesCount = await Issue.countDocuments({
      admin: expert._id,
    }).session(session);

    if (ownedIssuesCount > 0) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        msg: "This user is creator/admin of one or more issues. Resolve those issues first before deleting the expert.",
      });
    }

    const participations = await Participation.find({
      expert: expert._id,
    }).session(session);

    const issueIds = [...new Set(participations.map((p) => String(p.issue)))];

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
        (p) => String(p.issue) === String(issue._id)
      );

      if (!participation) continue;

      // =====================================================
      // ACTIVE ISSUE -> expulsar como si el creador lo quitase
      // =====================================================
      if (issue.active) {
        await cleanupExpertDraftsOnExit({
          issueId: issue._id,
          expertId: expert._id,
        });

        const deleteEvalsResult = await Evaluation.deleteMany({
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

        activeEvaluationsDeleted += deleteEvalsResult.deletedCount || 0;
        activeWeightDocsDeleted += deleteWeightDocsResult.deletedCount || 0;

        // Mirar si quedan participaciones en el issue
        const remainingParticipations = await Participation.find({
          issue: issue._id,
        }).session(session);

        // Opción B: si el issue activo se queda sin expertos, se elimina completo
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

          // Si estaba en criteriaWeighting y tras expulsarlo ya están todos los pesos completos,
          // avanzar a weightsFinished para no dejar el issue bloqueado.
          if (issue.currentStage === "criteriaWeighting") {
            const totalParticipants = remainingParticipations.filter(
              (p) => ["accepted", "pending"].includes(p.invitationStatus)
            ).length;

            const totalWeightsDone = remainingParticipations.filter(
              (p) =>
                ["accepted", "pending"].includes(p.invitationStatus) &&
                p.weightsCompleted === true
            ).length;

            if (
              totalParticipants > 0 &&
              totalParticipants === totalWeightsDone
            ) {
              issue.currentStage = "weightsFinished";
              await issue.save({ session });
            }
          }

          activeIssuesUpdated += 1;
        }
      }

      // =====================================================
      // FINISHED ISSUE -> ocultarlo para ese experto
      // =====================================================
      else {
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

        // Igual que removeFinishedIssue:
        // solo borrar físicamente cuando todos los participantes lo tengan oculto.
        const participants = await Participation.find({
          issue: issue._id,
        }).session(session);

        const exits = await ExitUserIssue.find({
          issue: issue._id,
          hidden: true,
        }).session(session);

        const allUsersHaveHidden = participants.every((p) =>
          exits.some((e) => String(e.user) === String(p.expert))
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

    // Borrar dominios propios creados por este usuario.
    const deleteDomainsResult = await ExpressionDomain.deleteMany({
      user: expert._id,
      isGlobal: false,
    }).session(session);

    domainsDeleted = deleteDomainsResult.deletedCount || 0;

    // Limpiar notificaciones generales que aún queden para el usuario.
    await Notification.deleteMany({
      expert: expert._id,
    }).session(session);

    // Finalmente borrar usuario.
    await User.deleteOne({
      _id: expert._id,
    }).session(session);

    await session.commitTransaction();
    session.endSession();

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
    await session.abortTransaction();
    session.endSession();
    console.error("deleteExpertAdmin error:", err);

    return res.status(500).json({
      success: false,
      msg: "Error deleting expert",
      error: err.message,
    });
  }
};

/* =========================================================
 * Admin helpers for Issues
 * ========================================================= */

const asId = (v) => {
  if (!v) return "";
  if (typeof v === "string") return v;
  if (typeof v === "object" && v._id) return String(v._id);
  return String(v);
};

const isFilledValue = (v) => !(v === null || v === undefined || v === "");

const sortByNameStable = (a, b) => {
  const an = String(a?.name || "").localeCompare(String(b?.name || ""), undefined, {
    sensitivity: "base",
    numeric: true,
  });
  if (an !== 0) return an;
  return asId(a).localeCompare(asId(b));
};

const buildCriteriaTreeAdmin = (criteriaDocs = []) => {
  const nodes = criteriaDocs.map((c) => ({
    id: asId(c._id),
    name: c.name,
    type: c.type,
    isLeaf: Boolean(c.isLeaf),
    parentId: c.parentCriterion ? asId(c.parentCriterion) : null,
    children: [],
  }));

  const byId = new Map(nodes.map((n) => [n.id, n]));
  const roots = [];

  for (const node of nodes) {
    if (node.parentId && byId.has(node.parentId)) {
      byId.get(node.parentId).children.push(node);
    } else {
      roots.push(node);
    }
  }

  const sortRec = (arr) => {
    arr.sort(sortByNameStable);
    arr.forEach((n) => {
      if (Array.isArray(n.children) && n.children.length > 0) sortRec(n.children);
    });
  };

  sortRec(roots);
  return roots;
};

const countExpectedEvaluationCellsPerExpert = ({
  alternativesCount,
  leafCriteriaCount,
  isPairwise,
}) => {
  if (!alternativesCount || !leafCriteriaCount) return 0;

  if (isPairwise) {
    return alternativesCount * leafCriteriaCount * Math.max(alternativesCount - 1, 0);
  }

  return alternativesCount * leafCriteriaCount;
};

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

const orderObjectByKeys = (obj = {}, orderedKeys = []) => {
  const out = {};
  const used = new Set();

  for (const key of orderedKeys) {
    out[key] = Object.prototype.hasOwnProperty.call(obj, key) ? obj[key] : null;
    used.add(key);
  }

  for (const [key, value] of Object.entries(obj || {})) {
    if (!used.has(key)) out[key] = value;
  }

  return out;
};

const getIssueStageMeta = (stage) => {
  const map = {
    criteriaWeighting: { key: "criteriaWeighting", label: "Criteria weighting" },
    weightsFinished: { key: "weightsFinished", label: "Weights finished" },
    alternativeEvaluation: { key: "alternativeEvaluation", label: "Alternative evaluation" },
    finished: { key: "finished", label: "Finished" },
  };

  return map[stage] || { key: stage, label: stage || "Unknown" };
};

const getCreatorActionFlags = ({
  issue,
  acceptedExperts = 0,
  pendingExperts = 0,
  weightsDoneAccepted = 0,
  evaluationsDoneAccepted = 0,
}) => {
  const stage = issue?.currentStage;
  const hasPending = pendingExperts > 0;

  const allWeightsDone =
    acceptedExperts > 0 && weightsDoneAccepted === acceptedExperts;

  const allEvaluationsDone =
    acceptedExperts > 0 && evaluationsDoneAccepted === acceptedExperts;

  return {
    canEditExperts: Boolean(issue?.active),
    canRemoveIssue: Boolean(issue?.active),
    canComputeWeights:
      stage === "weightsFinished" &&
      !hasPending &&
      allWeightsDone,
    canResolveIssue:
      stage === "alternativeEvaluation" &&
      !hasPending &&
      allEvaluationsDone,
  };
};

/* =========================================================
 * GET /api/admin/getAllIssues
 * Listado resumido de issues para panel admin
 * ========================================================= */
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

    if (adminId && mongoose.Types.ObjectId.isValid(adminId)) {
      filter.admin = adminId;
    }

    if (modelId && mongoose.Types.ObjectId.isValid(modelId)) {
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

    const issueIds = issues.map((i) => i._id);

    const [
      alternativesAgg,
      leafCriteriaAgg,
      participationsAgg,
      consensusAgg,
      scenariosAgg,
      evalsAgg,
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

    const alternativesMap = new Map(alternativesAgg.map((r) => [asId(r._id), r.total || 0]));
    const leafCriteriaMap = new Map(leafCriteriaAgg.map((r) => [asId(r._id), r.total || 0]));
    const participationsMap = new Map(participationsAgg.map((r) => [asId(r._id), r]));
    const consensusMap = new Map(consensusAgg.map((r) => [asId(r._id), r]));
    const scenariosMap = new Map(scenariosAgg.map((r) => [asId(r._id), r.total || 0]));
    const evalsMap = new Map(evalsAgg.map((r) => [asId(r._id), r]));

    const formattedIssues = issues.map((issue) => {
      const id = asId(issue._id);

      const totalAlternatives = alternativesMap.get(id) || 0;
      const totalLeafCriteria = leafCriteriaMap.get(id) || 0;

      const p = participationsMap.get(id) || {
        totalExperts: 0,
        acceptedExperts: 0,
        pendingExperts: 0,
        declinedExperts: 0,
        weightsDoneAccepted: 0,
        evaluationsDoneAccepted: 0,
      };

      const c = consensusMap.get(id) || {
        totalRounds: 0,
        latestPhase: 0,
        latestTimestamp: null,
      };

      const e = evalsMap.get(id) || {
        filledCells: 0,
        lastEvaluationAt: null,
      };

      const expectedPerExpert = countExpectedEvaluationCellsPerExpert({
        alternativesCount: totalAlternatives,
        leafCriteriaCount: totalLeafCriteria,
        isPairwise: Boolean(issue.model?.isPairwise),
      });

      return {
        id,
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
          totalExperts: p.totalExperts || 0,
          acceptedExperts: p.acceptedExperts || 0,
          pendingExperts: p.pendingExperts || 0,
          declinedExperts: p.declinedExperts || 0,
          weightsDoneAccepted: p.weightsDoneAccepted || 0,
          evaluationsDoneAccepted: p.evaluationsDoneAccepted || 0,
          consensusRounds: c.totalRounds || 0,
          latestConsensusPhase: c.latestPhase || 0,
          latestConsensusAt: c.latestTimestamp || null,
          scenarios: scenariosMap.get(id) || 0,
          expectedEvaluationCellsPerExpert: expectedPerExpert,
          totalFilledEvaluationCells: e.filledCells || 0,
          lastEvaluationAt: e.lastEvaluationAt || null,
        },
        creatorActionsState: getCreatorActionFlags({
          issue,
          acceptedExperts: p.acceptedExperts || 0,
          pendingExperts: p.pendingExperts || 0,
          weightsDoneAccepted: p.weightsDoneAccepted || 0,
          evaluationsDoneAccepted: p.evaluationsDoneAccepted || 0,
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

/* =========================================================
 * GET /api/admin/getIssue/:id
 * Detalle completo y seguro de un issue para admin
 * ========================================================= */
export const getIssueAdminById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
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
      evalAggByExpert,
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
      Consensus.find({ issue: id })
        .sort({ phase: 1 })
        .lean(),
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

    orderedLeafCriteria.forEach((crit, idx) => {
      const value = finalWeightsArray[idx] ?? null;
      finalWeightsById[asId(crit._id)] = value;
      finalWeightsByName[crit.name] = value;
    });

    const evalAggMap = new Map(
      evalAggByExpert.map((row) => [
        asId(row._id),
        {
          totalDocs: row.totalDocs || 0,
          filledDocs: row.filledDocs || 0,
          lastEvaluationAt: row.lastEvaluationAt || null,
        },
      ])
    );

    const weightDocMap = new Map(weightDocs.map((w) => [asId(w.expert), w]));

    const exitMap = new Map(
      exits.map((e) => [
        asId(e.user?._id || e.user),
        {
          hidden: Boolean(e.hidden),
          timestamp: e.timestamp || null,
          phase: e.phase ?? null,
          stage: e.stage ?? null,
          reason: e.reason ?? null,
          history: Array.isArray(e.history) ? e.history : [],
          user: e.user
            ? {
              id: asId(e.user._id),
              name: e.user.name,
              email: e.user.email,
              role: e.user.role || "user",
              university: e.user.university || "",
              accountConfirm: Boolean(e.user.accountConfirm),
            }
            : null,
        },
      ])
    );

    const participantsDetailed = participations.map((p) => {
      const expertId = asId(p.expert?._id || p.expert);
      const evalStats = evalAggMap.get(expertId) || {
        totalDocs: 0,
        filledDocs: 0,
        lastEvaluationAt: null,
      };
      const weightDoc = weightDocMap.get(expertId) || null;
      const exitInfo = exitMap.get(expertId) || null;

      return {
        expert: p.expert
          ? {
            id: asId(p.expert._id),
            name: p.expert.name,
            email: p.expert.email,
            role: p.expert.role || "user",
            university: p.expert.university || "",
            accountConfirm: Boolean(p.expert.accountConfirm),
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
        invitationStatus: p.invitationStatus,
        weightsCompleted: Boolean(p.weightsCompleted),
        evaluationCompleted: Boolean(p.evaluationCompleted),
        joinedAt: p.joinedAt || null,
        entryPhase: p.entryPhase ?? null,
        entryStage: p.entryStage ?? null,
        progress: {
          expectedEvaluationCells: expectedPerExpert,
          totalEvaluationDocs: evalStats.totalDocs,
          filledEvaluationDocs: evalStats.filledDocs,
          evaluationProgressPct:
            expectedPerExpert > 0
              ? Number(((evalStats.filledDocs / expectedPerExpert) * 100).toFixed(2))
              : 0,
          lastEvaluationAt: evalStats.lastEvaluationAt,
          hasWeightDoc: Boolean(weightDoc),
          weightDocCompleted: Boolean(weightDoc?.completed),
          weightDocPhase: weightDoc?.consensusPhase ?? null,
          weightDocUpdatedAt: weightDoc?.updatedAt || null,
        },
        exitInfo,
      };
    });

    const currentParticipantIds = new Set(
      participations.map((p) => asId(p.expert?._id || p.expert))
    );

    const exitedUsersDetailed = exits
      .filter((e) => !currentParticipantIds.has(asId(e.user?._id || e.user)))
      .map((e) => ({
        expert: e.user
          ? {
            id: asId(e.user._id),
            name: e.user.name,
            email: e.user.email,
            role: e.user.role || "user",
            university: e.user.university || "",
            accountConfirm: Boolean(e.user.accountConfirm),
          }
          : {
            id: asId(e.user),
            name: "Deleted user",
            email: "Deleted user",
            role: "user",
            university: "",
            accountConfirm: false,
          },
        currentParticipant: false,
        exitInfo: {
          hidden: Boolean(e.hidden),
          timestamp: e.timestamp || null,
          phase: e.phase ?? null,
          stage: e.stage ?? null,
          reason: e.reason ?? null,
          history: Array.isArray(e.history) ? e.history : [],
        },
      }));

    const acceptedExperts = participations.filter((p) => p.invitationStatus === "accepted");
    const pendingExperts = participations.filter((p) => p.invitationStatus === "pending");
    const declinedExperts = participations.filter((p) => p.invitationStatus === "declined");

    const latestConsensus = consensusDocs.length
      ? consensusDocs[consensusDocs.length - 1]
      : null;

    const snapshotsSummary = {
      total: snapshots.length,
      numeric: snapshots.filter((d) => d.type === "numeric").length,
      linguistic: snapshots.filter((d) => d.type === "linguistic").length,
    };

    const totalFilledEvaluationCells = Array.from(evalAggMap.values()).reduce(
      (acc, row) => acc + (row.filledDocs || 0),
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
        alternatives: orderedAlternatives.map((a) => ({
          id: asId(a._id),
          name: a.name,
        })),
        criteria: criteriaTree,
        leafCriteria: orderedLeafCriteria.map((c) => ({
          id: asId(c._id),
          name: c.name,
          type: c.type,
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
        scenarios: scenarios.map((s) => ({
          id: asId(s._id),
          name: s.name || "",
          targetModelId: asId(s.targetModel),
          targetModelName: s.targetModelName || "",
          domainType: s.domainType || null,
          isPairwise: Boolean(s.isPairwise),
          status: s.status || "done",
          createdAt: s.createdAt || null,
          createdBy: s.createdBy
            ? {
              id: asId(s.createdBy._id),
              name: s.createdBy.name,
              email: s.createdBy.email,
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
          weightsDoneAccepted: acceptedExperts.filter((p) => p.weightsCompleted).length,
          evaluationsDoneAccepted: acceptedExperts.filter((p) => p.evaluationCompleted).length,
          expectedEvaluationCellsPerExpert: expectedPerExpert,
          totalFilledEvaluationCells,
        },
        creatorActionsState: getCreatorActionFlags({
          issue,
          acceptedExperts: acceptedExperts.length,
          pendingExperts: pendingExperts.length,
          weightsDoneAccepted: acceptedExperts.filter((p) => p.weightsCompleted).length,
          evaluationsDoneAccepted: acceptedExperts.filter((p) => p.evaluationCompleted).length,
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

/* =========================================================
 * GET /api/admin/getIssueExpertsProgress/:id
 * Vista enfocada al progreso y trazabilidad por experto
 * ========================================================= */
export const getIssueExpertsProgressAdmin = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
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

    const [alternatives, leafCriteria, participations, exits, evalAgg, weightDocs] = await Promise.all([
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

    const evalMap = new Map(
      evalAgg.map((row) => [
        asId(row._id),
        {
          totalDocs: row.totalDocs || 0,
          filledDocs: row.filledDocs || 0,
          lastEvaluationAt: row.lastEvaluationAt || null,
        },
      ])
    );

    const weightMap = new Map(weightDocs.map((w) => [asId(w.expert), w]));
    const currentParticipantIds = new Set(
      participations.map((p) => asId(p.expert?._id || p.expert))
    );

    const rows = [];

    for (const p of participations) {
      const expertId = asId(p.expert?._id || p.expert);
      const evalStats = evalMap.get(expertId) || {
        totalDocs: 0,
        filledDocs: 0,
        lastEvaluationAt: null,
      };
      const weightDoc = weightMap.get(expertId) || null;

      rows.push({
        expert: p.expert
          ? {
            id: asId(p.expert._id),
            name: p.expert.name,
            email: p.expert.email,
            role: p.expert.role || "user",
            university: p.expert.university || "",
            accountConfirm: Boolean(p.expert.accountConfirm),
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
        invitationStatus: p.invitationStatus,
        weightsCompleted: Boolean(p.weightsCompleted),
        evaluationCompleted: Boolean(p.evaluationCompleted),
        joinedAt: p.joinedAt || null,
        entryPhase: p.entryPhase ?? null,
        entryStage: p.entryStage ?? null,
        progress: {
          expectedEvaluationCells: expectedPerExpert,
          totalEvaluationDocs: evalStats.totalDocs,
          filledEvaluationDocs: evalStats.filledDocs,
          evaluationProgressPct:
            expectedPerExpert > 0
              ? Number(((evalStats.filledDocs / expectedPerExpert) * 100).toFixed(2))
              : 0,
          lastEvaluationAt: evalStats.lastEvaluationAt || null,
          hasWeightDoc: Boolean(weightDoc),
          weightDocCompleted: Boolean(weightDoc?.completed),
          weightDocPhase: weightDoc?.consensusPhase ?? null,
          weightDocUpdatedAt: weightDoc?.updatedAt || null,
        },
      });
    }

    for (const e of exits) {
      const expertId = asId(e.user?._id || e.user);
      if (currentParticipantIds.has(expertId)) continue;

      const evalStats = evalMap.get(expertId) || {
        totalDocs: 0,
        filledDocs: 0,
        lastEvaluationAt: null,
      };
      const weightDoc = weightMap.get(expertId) || null;

      rows.push({
        expert: e.user
          ? {
            id: asId(e.user._id),
            name: e.user.name,
            email: e.user.email,
            role: e.user.role || "user",
            university: e.user.university || "",
            accountConfirm: Boolean(e.user.accountConfirm),
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
          hidden: Boolean(e.hidden),
          timestamp: e.timestamp || null,
          phase: e.phase ?? null,
          stage: e.stage ?? null,
          reason: e.reason ?? null,
        },
        progress: {
          expectedEvaluationCells: expectedPerExpert,
          totalEvaluationDocs: evalStats.totalDocs,
          filledEvaluationDocs: evalStats.filledDocs,
          evaluationProgressPct:
            expectedPerExpert > 0
              ? Number(((evalStats.filledDocs / expectedPerExpert) * 100).toFixed(2))
              : 0,
          lastEvaluationAt: evalStats.lastEvaluationAt || null,
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

/* =========================================================
 * GET /api/admin/getIssueExpertEvaluations/:issueId/:expertId
 * Ver evaluaciones guardadas/enviadas de un experto (solo lectura)
 * ========================================================= */
export const getIssueExpertEvaluationsAdmin = async (req, res) => {
  try {
    const { issueId, expertId } = req.params;

    if (!issueId || !mongoose.Types.ObjectId.isValid(issueId)) {
      return res.status(400).json({
        success: false,
        msg: "Valid issue id is required",
      });
    }

    if (!expertId || !mongoose.Types.ObjectId.isValid(expertId)) {
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
      const evalDocs = await Evaluation.find({
        issue: issueId,
        expert: expertId,
        comparedAlternative: { $ne: null },
      })
        .populate("alternative", "name")
        .populate("comparedAlternative", "name")
        .populate("criterion", "name")
        .populate("expressionDomain")
        .lean();

      if (!participation && !expert && evalDocs.length === 0) {
        return res.status(404).json({
          success: false,
          msg: "Expert data for this issue not found",
        });
      }

      const formatted = {};

      for (const crit of orderedLeafCriteria) {
        formatted[crit.name] = orderedAlternatives.map((alt) => ({
          id: alt.name,
        }));
      }

      const rowMap = new Map();
      for (const crit of orderedLeafCriteria) {
        for (const alt of orderedAlternatives) {
          rowMap.set(`${crit.name}__${alt.name}`, formatted[crit.name].find((r) => r.id === alt.name));
        }
      }

      let lastEvaluationAt = null;
      let filledCells = 0;

      for (const doc of evalDocs) {
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

        if (isFilledValue(doc.value)) filledCells += 1;
        if (doc.timestamp && (!lastEvaluationAt || new Date(doc.timestamp) > new Date(lastEvaluationAt))) {
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
        evaluations: formatted,
        collectiveEvaluations: latestConsensus?.collectiveEvaluations || null,
      });
    }

    const evalDocs = await Evaluation.find({
      issue: issueId,
      expert: expertId,
      comparedAlternative: null,
    })
      .populate("alternative", "name")
      .populate("criterion", "name")
      .populate("expressionDomain")
      .lean();

    if (!participation && !expert && evalDocs.length === 0) {
      return res.status(404).json({
        success: false,
        msg: "Expert data for this issue not found",
      });
    }

    const evaluations = {};
    const evalMap = new Map();

    let lastEvaluationAt = null;
    let filledCells = 0;

    for (const doc of evalDocs) {
      const altId = asId(doc.alternative?._id || doc.alternative);
      const critId = asId(doc.criterion?._id || doc.criterion);
      evalMap.set(`${altId}__${critId}`, doc);

      if (isFilledValue(doc.value)) filledCells += 1;
      if (doc.timestamp && (!lastEvaluationAt || new Date(doc.timestamp) > new Date(lastEvaluationAt))) {
        lastEvaluationAt = doc.timestamp;
      }
    }

    for (const alt of orderedAlternatives) {
      evaluations[alt.name] = {};

      for (const crit of orderedLeafCriteria) {
        const doc = evalMap.get(`${asId(alt._id)}__${asId(crit._id)}`);

        evaluations[alt.name][crit.name] = {
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

/* =========================================================
 * GET /api/admin/getIssueExpertWeights/:issueId/:expertId
 * Ver pesos / docs de pesos de un experto en modo solo lectura
 * ========================================================= */
export const getIssueExpertWeightsAdmin = async (req, res) => {
  try {
    const { issueId, expertId } = req.params;

    if (!issueId || !mongoose.Types.ObjectId.isValid(issueId)) {
      return res.status(400).json({
        success: false,
        msg: "Valid issue id is required",
      });
    }

    if (!expertId || !mongoose.Types.ObjectId.isValid(expertId)) {
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

    const leafNames = orderedLeafCriteria.map((c) => c.name);

    const resolvedWeights =
      Array.isArray(issue.modelParameters?.weights) && issue.modelParameters.weights.length
        ? leafNames.reduce((acc, name, idx) => {
          acc[name] = issue.modelParameters.weights[idx] ?? null;
          return acc;
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
    } else if (Array.isArray(issue.modelParameters?.weights) && issue.modelParameters.weights.length) {
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

/* =========================================================
 * POST /api/admin/reassignIssueAdmin
 * Cambiar creador/responsable del issue
 * ========================================================= */
export const reassignIssueAdminAdmin = async (req, res) => {
  try {
    const { issueId, newAdminId } = req.body || {};

    if (!issueId || !mongoose.Types.ObjectId.isValid(issueId)) {
      return res.status(400).json({
        success: false,
        msg: "Valid issueId is required",
      });
    }

    if (!newAdminId || !mongoose.Types.ObjectId.isValid(newAdminId)) {
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