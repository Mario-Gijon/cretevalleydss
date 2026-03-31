// Models
import { Consensus } from "../../models/Consensus.js";
import { CriteriaWeightEvaluation } from "../../models/CriteriaWeightEvaluation.js";
import { Evaluation } from "../../models/Evaluations.js";
import { ExitUserIssue } from "../../models/ExitUserIssue.js";
import { ExpressionDomain } from "../../models/ExpressionDomain.js";
import { Issue } from "../../models/Issues.js";
import { Notification } from "../../models/Notificacions.js";
import { Participation } from "../../models/Participations.js";
import { User } from "../../models/Users.js";

// Modules
import {
  deleteIssueCascade,
  getFinishedIssueVisibleUserIds,
  mapIssueStageToExitStage,
  registerUserExit,
} from "../issues/issue.lifecycle.js";

// Utils
import {
  createBadRequestError,
  createNotFoundError,
} from "../../utils/common/errors.js";
import { sameId } from "../../utils/common/ids.js";
import mongoose from "mongoose";

const ACCOUNT_DELETED_BY_ADMIN_REASON = "Expert account deleted by admin";

const withOptionalSession = (query, session = null) =>
  session ? query.session(session) : query;

/**
 * Obtiene la fase de salida que debe registrarse para un issue.
 *
 * @param {object} params Parámetros de entrada.
 * @param {import("mongoose").Types.ObjectId | string} params.issueId Id del issue.
 * @param {number | null} params.fallbackIfMissing Valor por defecto si no hay consenso previo.
 * @param {import("mongoose").ClientSession|null} [params.session=null] Sesión de mongoose.
 * @returns {Promise<number | null>}
 */
const getExitPhaseForIssue = async ({
  issueId,
  fallbackIfMissing,
  session = null,
}) => {
  const latestConsensus = await withOptionalSession(
    Consensus.findOne({ issue: issueId }).sort({ phase: -1 }),
    session
  );

  return latestConsensus ? latestConsensus.phase + 1 : fallbackIfMissing;
};

/**
 * Actualiza la etapa del issue activo si, tras eliminar un participante,
 * todos los participantes relevantes han completado sus pesos.
 *
 * @param {object} params Parámetros de entrada.
 * @param {Record<string, any>} params.issue Documento del issue.
 * @param {Array<Record<string, any>>} params.remainingParticipations Participaciones restantes.
 * @param {import("mongoose").ClientSession|null} [params.session=null] Sesión de mongoose.
 * @returns {Promise<boolean>}
 */
const syncActiveIssueStageAfterUserRemoval = async ({
  issue,
  remainingParticipations,
  session = null,
}) => {
  if (issue.currentStage !== "criteriaWeighting") {
    return false;
  }

  const relevantParticipations = (remainingParticipations || []).filter(
    (participation) =>
      participation &&
      ["accepted", "pending"].includes(participation.invitationStatus)
  );

  const totalParticipants = relevantParticipations.length;
  const totalWeightsDone = relevantParticipations.filter(
    (participation) => participation.weightsCompleted === true
  ).length;

  if (
    totalParticipants > 0 &&
    totalParticipants === totalWeightsDone &&
    issue.currentStage !== "weightsFinished"
  ) {
    issue.currentStage = "weightsFinished";
    await issue.save({ session });
    return true;
  }

  return false;
};

/**
 * Elimina a un usuario de un issue activo y ajusta el estado resultante del issue.
 *
 * @param {object} params Parámetros de entrada.
 * @param {Record<string, any>} params.issue Documento del issue.
 * @param {Record<string, any>} params.participation Participación del usuario en el issue.
 * @param {Record<string, any>} params.user Usuario a eliminar.
 * @param {Record<string, number>} params.summary Resumen acumulado de resultados.
 * @param {import("mongoose").ClientSession|null} [params.session=null] Sesión de mongoose.
 * @returns {Promise<void>}
 */
const removeUserFromActiveIssue = async ({
  issue,
  participation,
  user,
  summary,
  session = null,
}) => {
  const [deleteEvaluationsResult, deleteWeightDocsResult] = await Promise.all([
    withOptionalSession(
      Evaluation.deleteMany({
        issue: issue._id,
        expert: user._id,
      }),
      session
    ),
    withOptionalSession(
      CriteriaWeightEvaluation.deleteMany({
        issue: issue._id,
        expert: user._id,
      }),
      session
    ),
    withOptionalSession(
      Notification.deleteMany({
        issue: issue._id,
        expert: user._id,
      }),
      session
    ),
    withOptionalSession(
      Participation.deleteOne({ _id: participation._id }),
      session
    ),
  ]);

  summary.activeEvaluationsDeleted += deleteEvaluationsResult.deletedCount || 0;
  summary.activeWeightDocsDeleted += deleteWeightDocsResult.deletedCount || 0;

  const remainingParticipations = await withOptionalSession(
    Participation.find({ issue: issue._id }),
    session
  );

  if (remainingParticipations.length === 0) {
    await deleteIssueCascade({
      issueId: issue._id,
      session,
    });

    summary.activeIssuesDeleted += 1;
    return;
  }

  const phase = await getExitPhaseForIssue({
    issueId: issue._id,
    fallbackIfMissing: 1,
    session,
  });

  await registerUserExit({
    issueId: issue._id,
    userId: user._id,
    phase,
    stage: mapIssueStageToExitStage(issue.currentStage),
    reason: ACCOUNT_DELETED_BY_ADMIN_REASON,
    session,
  });

  await syncActiveIssueStageAfterUserRemoval({
    issue,
    remainingParticipations,
    session,
  });

  summary.activeIssuesUpdated += 1;
};

/**
 * Marca la salida de un usuario en un issue finalizado y elimina el issue
 * si todos los usuarios que aún podían verlo ya lo han ocultado.
 *
 * @param {object} params Parámetros de entrada.
 * @param {Record<string, any>} params.issue Documento del issue.
 * @param {Record<string, any>} params.user Usuario a eliminar.
 * @param {Record<string, number>} params.summary Resumen acumulado de resultados.
 * @param {import("mongoose").ClientSession|null} [params.session=null] Sesión de mongoose.
 * @returns {Promise<void>}
 */
const removeUserFromFinishedIssue = async ({
  issue,
  user,
  summary,
  session = null,
}) => {
  const phase = await getExitPhaseForIssue({
    issueId: issue._id,
    fallbackIfMissing: null,
    session,
  });

  await registerUserExit({
    issueId: issue._id,
    userId: user._id,
    phase,
    stage: mapIssueStageToExitStage(issue.currentStage),
    reason: ACCOUNT_DELETED_BY_ADMIN_REASON,
    session,
  });

  await withOptionalSession(
    Notification.deleteMany({
      issue: issue._id,
      expert: user._id,
    }),
    session
  );

  summary.finishedIssuesHidden += 1;

  const visibleUserIds = await getFinishedIssueVisibleUserIds({
    issue,
    session,
  });

  const hiddenExits = await withOptionalSession(
    ExitUserIssue.find({
      issue: issue._id,
      hidden: true,
      user: { $in: visibleUserIds },
    })
      .select("user")
      .lean(),
    session
  );

  const hiddenUserIdSet = new Set(
    hiddenExits.map((exitDoc) => String(exitDoc.user))
  );

  const allVisibleUsersHaveHidden =
    visibleUserIds.length > 0 &&
    visibleUserIds.every((visibleUserId) =>
      hiddenUserIdSet.has(String(visibleUserId))
    );

  if (!allVisibleUsersHaveHidden) {
    return;
  }

  await deleteIssueCascade({
    issueId: issue._id,
    session,
  });

  summary.finishedIssuesDeleted += 1;
};

/**
 * Crea un error de conflicto para respuestas 409.
 *
 * @param {string} message Mensaje del error.
 * @returns {Error}
 */
const createConflictError = (message) => {
  const err = new Error(message);
  err.statusCode = 409;
  err.expose = true;
  return err;
};

/**
 * Normaliza el rol gestionado desde el panel admin.
 *
 * @param {unknown} role Rol recibido.
 * @returns {string}
 */
const normalizeAdminManagedRole = (role) =>
  String(role || "user").trim().toLowerCase();

/**
 * Construye el payload público de un usuario gestionado desde admin.
 *
 * @param {Record<string, any>} user Documento de usuario.
 * @returns {{
 *   id: string,
 *   name: string,
 *   university: string,
 *   email: string,
 *   role: string,
 *   accountConfirm: boolean,
 *   accountCreation: Date | null,
 * }}
 */
const buildAdminManagedUserPayload = (user) => ({
  id: String(user._id),
  name: user.name,
  university: user.university || "",
  email: user.email,
  role: user.role || "user",
  accountConfirm: Boolean(user.accountConfirm),
  accountCreation: user.accountCreation || null,
});

/**
 * Construye el payload base de identidad de un usuario para respuestas admin.
 *
 * @param {Record<string, any>|null} user Documento de usuario.
 * @returns {{ id: string, name: string, email: string, role: string }|null}
 */
const buildAdminUserIdentityPayload = (user) => {
  if (!user) {
    return null;
  }

  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    role: user.role || "user",
  };
};

/**
 * Crea un nuevo usuario desde el panel de administración.
 *
 * Mantiene el comportamiento actual:
 * - valida campos obligatorios
 * - normaliza email y rol
 * - fuerza accountConfirm=true para admins
 * - evita duplicados por email
 *
 * @param {object} params Parámetros de entrada.
 * @param {Record<string, any>} params.payload Cuerpo recibido.
 * @param {import("mongoose").ClientSession|null} [params.session=null] Sesión de mongoose.
 * @returns {Promise<{
 *   msg: string,
 *   user: {
 *     id: string,
 *     name: string,
 *     university: string,
 *     email: string,
 *     role: string,
 *     accountConfirm: boolean,
 *     accountCreation: Date | null,
 *   }
 * }>}
 */
export const createUserAdminFlow = async ({
  payload,
  session = null,
}) => {
  let {
    name = "",
    university = "",
    email = "",
    password = "",
    accountConfirm = true,
    role = "user",
  } = payload || {};

  name = String(name).trim();
  university = String(university).trim();
  email = String(email).trim().toLowerCase();
  password = String(password).trim();
  role = normalizeAdminManagedRole(role);

  if (!name) {
    throw createBadRequestError("Name is required");
  }

  if (!university) {
    throw createBadRequestError("University is required");
  }

  if (!email) {
    throw createBadRequestError("Email is required");
  }

  if (!password) {
    throw createBadRequestError("Password is required");
  }

  if (password.length < 6) {
    throw createBadRequestError("Password must be at least 6 characters");
  }

  if (!["user", "admin"].includes(role)) {
    throw createBadRequestError("Invalid role");
  }

  const existingUser = await withOptionalSession(
    User.findOne({ email }).lean(),
    session
  );

  if (existingUser) {
    throw createConflictError("Email already registered");
  }

  const finalAccountConfirm =
    role === "admin" ? true : Boolean(accountConfirm);

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

  await newUser.save({ session });

  return {
    msg: `${role === "admin" ? "Admin" : "User"} ${newUser.email} created successfully`,
    user: buildAdminManagedUserPayload(newUser),
  };
};

/**
 * Actualiza un usuario desde el panel de administración.
 *
 * Mantiene el comportamiento actual:
 * - actualiza solo los campos presentes en el payload
 * - valida vacíos en nombre, universidad y email
 * - evita duplicados por email
 * - fuerza accountConfirm=true cuando el rol final es admin
 * - permite cambiar la contraseña si llega no vacía
 *
 * @param {object} params Parámetros de entrada.
 * @param {Record<string, any>} params.payload Cuerpo recibido.
 * @param {import("mongoose").ClientSession|null} [params.session=null] Sesión de mongoose.
 * @returns {Promise<{
 *   msg: string,
 *   user: {
 *     id: string,
 *     name: string,
 *     university: string,
 *     email: string,
 *     role: string,
 *     accountConfirm: boolean,
 *     accountCreation: Date | null,
 *   }
 * }>}
 */
export const updateUserAdminFlow = async ({
  payload,
  session = null,
}) => {
  const {
    id,
    name,
    university,
    email,
    password,
    accountConfirm,
    role,
  } = payload || {};

  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    throw createBadRequestError("Valid user id is required");
  }

  const user = await withOptionalSession(User.findById(id), session);

  if (!user) {
    throw createNotFoundError("User not found");
  }

  if (name !== undefined) {
    const cleanName = String(name).trim();

    if (!cleanName) {
      throw createBadRequestError("Name can not be empty");
    }

    user.name = cleanName;
  }

  if (university !== undefined) {
    const cleanUniversity = String(university).trim();

    if (!cleanUniversity) {
      throw createBadRequestError("University can not be empty");
    }

    user.university = cleanUniversity;
  }

  if (email !== undefined) {
    const cleanEmail = String(email).trim().toLowerCase();

    if (!cleanEmail) {
      throw createBadRequestError("Email can not be empty");
    }

    const emailInUse = await withOptionalSession(
      User.findOne({
        email: cleanEmail,
        _id: { $ne: user._id },
      }).lean(),
      session
    );

    if (emailInUse) {
      throw createConflictError("Email already registered");
    }

    user.email = cleanEmail;
  }

  if (role !== undefined) {
    const cleanRole = normalizeAdminManagedRole(role);

    if (!["user", "admin"].includes(cleanRole)) {
      throw createBadRequestError("Invalid role");
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
      throw createBadRequestError("Password must be at least 6 characters");
    }

    user.password = cleanPassword;
    user.markModified("password");
  }

  await user.save({ session });

  return {
    msg: `User ${user.email} updated successfully`,
    user: buildAdminManagedUserPayload(user),
  };
};

/**
 * Reasigna el responsable principal de un issue desde el panel de administración.
 *
 * @param {object} params Parámetros de entrada.
 * @param {import("mongoose").Types.ObjectId | string} params.issueId Id del issue.
 * @param {import("mongoose").Types.ObjectId | string} params.newAdminId Id del nuevo admin.
 * @param {import("mongoose").ClientSession|null} [params.session=null] Sesión de mongoose.
 * @returns {Promise<{
 *   msg: string,
 *   issue: { id: string, name: string },
 *   admin: {
 *     oldAdmin: { id: string, name: string, email: string, role: string } | null,
 *     newAdmin: { id: string, name: string, email: string, role: string },
 *   }
 * }>}
 */
export const reassignIssueAdminFlow = async ({
  issueId,
  newAdminId,
  session = null,
}) => {
  if (!issueId || !mongoose.Types.ObjectId.isValid(issueId)) {
    throw createBadRequestError("Valid issueId is required");
  }

  if (!newAdminId || !mongoose.Types.ObjectId.isValid(newAdminId)) {
    throw createBadRequestError("Valid newAdminId is required");
  }

  const [issue, newAdmin] = await Promise.all([
    withOptionalSession(
      Issue.findById(issueId).populate("admin", "name email role"),
      session
    ),
    withOptionalSession(
      User.findById(newAdminId).select("name email role accountConfirm"),
      session
    ),
  ]);

  if (!issue) {
    throw createNotFoundError("Issue not found");
  }

  if (!newAdmin) {
    throw createNotFoundError("Target user not found");
  }

  if (!newAdmin.accountConfirm) {
    throw createBadRequestError("Target user account is not confirmed");
  }

  const oldAdmin = buildAdminUserIdentityPayload(issue.admin);
  const nextAdmin = buildAdminUserIdentityPayload(newAdmin);

  if (sameId(issue.admin?._id || issue.admin, newAdmin._id)) {
    return {
      msg: `Issue ${issue.name} is already assigned to ${newAdmin.email}`,
      issue: {
        id: String(issue._id),
        name: issue.name,
      },
      admin: {
        oldAdmin,
        newAdmin: nextAdmin,
      },
    };
  }

  issue.admin = newAdmin._id;
  await issue.save({ session });

  return {
    msg: `Issue ${issue.name} reassigned to ${newAdmin.email} successfully`,
    issue: {
      id: String(issue._id),
      name: issue.name,
    },
    admin: {
      oldAdmin,
      newAdmin: nextAdmin,
    },
  };
};

/**
 * Elimina un usuario desde el panel de administración y limpia los datos asociados.
 *
 * Mantiene las reglas actuales:
 * - no permite que un admin se elimine a sí mismo desde el panel
 * - no permite eliminar usuarios que todavía sean admin de algún issue
 * - limpia participaciones, evaluaciones, pesos, notificaciones y dominios privados
 * - registra la salida del usuario en los issues afectados
 *
 * @param {object} params Parámetros de entrada.
 * @param {import("mongoose").Types.ObjectId | string} params.targetUserId Id del usuario a eliminar.
 * @param {import("mongoose").Types.ObjectId | string} params.adminUserId Id del admin actual.
 * @param {import("mongoose").ClientSession|null} [params.session=null] Sesión de mongoose.
 * @returns {Promise<{
 *   deletedUser: { id: string, email: string },
 *   summary: {
 *     activeIssuesUpdated: number,
 *     activeIssuesDeleted: number,
 *     finishedIssuesHidden: number,
 *     finishedIssuesDeleted: number,
 *     activeEvaluationsDeleted: number,
 *     activeWeightDocsDeleted: number,
 *     domainsDeleted: number,
 *   }
 * }>}
 */
export const deleteUserAdminFlow = async ({
  targetUserId,
  adminUserId,
  session = null,
}) => {
  if (!targetUserId) {
    throw createBadRequestError("User id is required");
  }

  const user = await withOptionalSession(User.findById(targetUserId), session);

  if (!user) {
    throw createNotFoundError("User not found");
  }

  if (sameId(adminUserId, user._id)) {
    throw createBadRequestError(
      "You cannot delete your own account from this admin panel"
    );
  }

  const ownedIssuesCount = await withOptionalSession(
    Issue.countDocuments({ admin: user._id }),
    session
  );

  if (ownedIssuesCount > 0) {
    throw createBadRequestError(
      "This user is creator/admin of one or more issues. Resolve those issues first before deleting the user."
    );
  }

  const participations = await withOptionalSession(
    Participation.find({ expert: user._id }),
    session
  );

  const issueIds = [...new Set(participations.map((item) => String(item.issue)))];

  const issues = issueIds.length
    ? await withOptionalSession(Issue.find({ _id: { $in: issueIds } }), session)
    : [];

  const participationsByIssueId = new Map(
    participations.map((participation) => [String(participation.issue), participation])
  );

  const summary = {
    activeIssuesUpdated: 0,
    activeIssuesDeleted: 0,
    finishedIssuesHidden: 0,
    finishedIssuesDeleted: 0,
    activeEvaluationsDeleted: 0,
    activeWeightDocsDeleted: 0,
    domainsDeleted: 0,
  };

  for (const issue of issues) {
    const participation = participationsByIssueId.get(String(issue._id));

    if (!participation) {
      continue;
    }

    if (issue.active) {
      await removeUserFromActiveIssue({
        issue,
        participation,
        user,
        summary,
        session,
      });
      continue;
    }

    await removeUserFromFinishedIssue({
      issue,
      user,
      summary,
      session,
    });
  }

  const deleteDomainsResult = await withOptionalSession(
    ExpressionDomain.deleteMany({
      user: user._id,
      isGlobal: false,
    }),
    session
  );

  summary.domainsDeleted = deleteDomainsResult.deletedCount || 0;

  await withOptionalSession(
    Notification.deleteMany({
      expert: user._id,
    }),
    session
  );

  await withOptionalSession(
    User.deleteOne({
      _id: user._id,
    }),
    session
  );

  return {
    deletedUser: {
      id: String(user._id),
      email: user.email,
    },
    summary,
  };
};

/**
 * Construye el filtro de búsqueda para el listado admin de usuarios.
 *
 * @param {object} params Parámetros de entrada.
 * @param {string} params.adminUserId Id del admin autenticado.
 * @param {string} [params.search=""] Texto de búsqueda.
 * @param {boolean} [params.includeAdmins=false] Indica si deben incluirse admins.
 * @returns {Record<string, any>}
 */
const buildAdminUsersFilter = ({
  adminUserId,
  search = "",
  includeAdmins = false,
}) => {
  const filter = {
    _id: { $ne: adminUserId },
  };

  if (!includeAdmins) {
    filter.role = { $ne: "admin" };
  }

  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
      { university: { $regex: search, $options: "i" } },
    ];
  }

  return filter;
};

/**
 * Obtiene el listado resumido de usuarios para el panel de administración.
 *
 * La respuesta incluye:
 * - datos base del usuario
 * - número de issues activos y finalizados donde participa
 * - número de dominios privados propios
 * - número de issues que administra
 *
 * @param {object} params Parámetros de entrada.
 * @param {import("mongoose").Types.ObjectId | string} params.adminUserId Id del admin autenticado.
 * @param {string} [params.search=""] Texto de búsqueda.
 * @param {boolean} [params.includeAdmins=false] Indica si deben incluirse admins.
 * @returns {Promise<{ users: Array<Record<string, any>> }>}
 */
export const getAdminUsersListPayload = async ({
  adminUserId,
  search = "",
  includeAdmins = false,
}) => {
  const filter = buildAdminUsersFilter({
    adminUserId,
    search,
    includeAdmins,
  });

  const users = await User.find(filter)
    .select("name university email role accountConfirm accountCreation")
    .sort({ name: 1 })
    .lean();

  if (!users.length) {
    return {
      users: [],
    };
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
    if (!participation.issue) {
      continue;
    }

    const key = String(participation.expert);
    const stats = participationStatsMap.get(key);

    if (!stats) {
      continue;
    }

    if (participation.issue.active) {
      stats.activeIssues += 1;
    } else {
      stats.finishedIssues += 1;
    }
  }

  return {
    users: users.map((user) => {
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
          finishedIssues:
            participationStatsMap.get(userId)?.finishedIssues || 0,
          domainsOwned: domainsMap.get(userId) || 0,
          ownedIssues: ownedIssuesMap.get(userId) || {
            total: 0,
            active: 0,
            finished: 0,
          },
        },
      };
    }),
  };
};
