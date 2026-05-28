
import { Consensus } from "../../models/Consensus.js";
import { IssueEvaluation } from "../../models/IssueEvaluations.js";
import { ExitUserIssue } from "../../models/ExitUserIssue.js";
import { ExpressionDomain } from "../../models/ExpressionDomain.js";
import { Issue } from "../../models/Issues.js";
import { Notification } from "../../models/Notifications.js";
import { Participation } from "../../models/Participations.js";
import { User } from "../../models/Users.js";


import {
  deleteIssueCascade,
  getFinishedIssueVisibleUserIds,
  mapIssueStageToExitStage,
  registerUserExit,
} from "../issues/lifecycle/index.js";


import {
  createBadRequestError,
  createConflictError,
  createNotFoundError,
} from "../../utils/common/errors.js";
import { sameId, toIdString } from "../../utils/common/ids.js";
import { isValidObjectIdLike } from "../../utils/common/mongoose.js";

const ACCOUNT_DELETED_BY_ADMIN_REASON = "Expert account deleted by admin";

const withOptionalSession = (query, session = null) =>
  session ? query.session(session) : query;


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

const syncActiveIssueStageAfterUserRemoval = async ({
  issue,
  remainingParticipations,
  session = null,
}) => {
  if (issue.currentStage !== "criteriaWeighting") {
    return false;
  }

  const relevantParticipations = remainingParticipations.filter(
    (participation) =>
      ["accepted", "pending"].includes(participation.invitationStatus)
  );

  const totalParticipants = relevantParticipations.length;
  const totalWeightsDone = relevantParticipations.filter(
    (participation) => participation.weightsCompleted
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

const removeUserFromActiveIssue = async ({
  issue,
  participation,
  user,
  summary,
  session = null,
}) => {
  const [deleteIssueEvaluationsResult] = await Promise.all([
    withOptionalSession(
      IssueEvaluation.deleteMany({
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

  summary.activeIssueEvaluationsDeleted +=
    deleteIssueEvaluationsResult.deletedCount || 0;

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
    hiddenExits.map((exitDoc) => toIdString(exitDoc.user))
  );

  const allVisibleUsersHaveHidden =
    visibleUserIds.length > 0 &&
    visibleUserIds.every((visibleUserId) =>
      hiddenUserIdSet.has(toIdString(visibleUserId))
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

const normalizeAdminManagedRole = (role) =>
  String(role || "user").trim().toLowerCase();

const buildAdminManagedUserPayload = (user) => ({
  id: toIdString(user._id),
  name: user.name,
  university: user.university,
  email: user.email,
  role: user.role,
  accountConfirm: user.accountConfirm,
  accountCreation: user.accountCreation,
});

const buildAdminUserIdentityPayload = (user) => {
  if (!user) {
    return null;
  }

  return {
    id: toIdString(user._id),
    name: user.name,
    email: user.email,
    role: user.role,
  };
};

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
    throw createBadRequestError("Name is required", {
      field: "name",
    });
  }

  if (!university) {
    throw createBadRequestError("University is required", {
      field: "university",
    });
  }

  if (!email) {
    throw createBadRequestError("Email is required", {
      field: "email",
    });
  }

  if (!password) {
    throw createBadRequestError("Password is required", {
      field: "password",
    });
  }

  if (password.length < 6) {
    throw createBadRequestError("Password must be at least 6 characters", {
      field: "password",
    });
  }

  if (!["user", "admin"].includes(role)) {
    throw createBadRequestError("Invalid role", {
      field: "role",
    });
  }

  const existingUser = await withOptionalSession(
    User.findOne({ email }).lean(),
    session
  );

  if (existingUser) {
    throw createConflictError("Email already registered", {
      field: "email",
    });
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
    message: `${role === "admin" ? "Admin" : "User"} ${newUser.email} created successfully`,
    user: buildAdminManagedUserPayload(newUser),
  };
};

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

  if (!id || !isValidObjectIdLike(id)) {
    throw createBadRequestError("Valid user id is required", {
      field: "id",
    });
  }

  const user = await withOptionalSession(User.findById(id), session);

  if (!user) {
    throw createNotFoundError("User not found", {
      field: "id",
    });
  }

  if (name !== undefined) {
    const cleanName = String(name).trim();

    if (!cleanName) {
      throw createBadRequestError("Name can not be empty", {
        field: "name",
      });
    }

    user.name = cleanName;
  }

  if (university !== undefined) {
    const cleanUniversity = String(university).trim();

    if (!cleanUniversity) {
      throw createBadRequestError("University can not be empty", {
        field: "university",
      });
    }

    user.university = cleanUniversity;
  }

  if (email !== undefined) {
    const cleanEmail = String(email).trim().toLowerCase();

    if (!cleanEmail) {
      throw createBadRequestError("Email can not be empty", {
        field: "email",
      });
    }

    const emailInUse = await withOptionalSession(
      User.findOne({
        email: cleanEmail,
        _id: { $ne: user._id },
      }).lean(),
      session
    );

    if (emailInUse) {
      throw createConflictError("Email already registered", {
        field: "email",
      });
    }

    user.email = cleanEmail;
  }

  if (role !== undefined) {
    const cleanRole = normalizeAdminManagedRole(role);

    if (!["user", "admin"].includes(cleanRole)) {
      throw createBadRequestError("Invalid role", {
        field: "role",
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
      throw createBadRequestError("Password must be at least 6 characters", {
        field: "password",
      });
    }

    user.password = cleanPassword;
    user.markModified("password");
  }

  await user.save({ session });

  return {
    message: `User ${user.email} updated successfully`,
    user: buildAdminManagedUserPayload(user),
  };
};

export const reassignIssueAdminFlow = async ({
  issueId,
  newAdminId,
  session = null,
}) => {
  if (!issueId || !isValidObjectIdLike(issueId)) {
    throw createBadRequestError("Valid issueId is required", {
      field: "issueId",
    });
  }

  if (!newAdminId || !isValidObjectIdLike(newAdminId)) {
    throw createBadRequestError("Valid newAdminId is required", {
      field: "newAdminId",
    });
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
    throw createNotFoundError("Issue not found", {
      field: "issueId",
    });
  }

  if (!newAdmin) {
    throw createNotFoundError("Target user not found", {
      field: "newAdminId",
    });
  }

  if (!newAdmin.accountConfirm) {
    throw createBadRequestError("Target user account is not confirmed", {
      field: "newAdminId",
    });
  }

  const oldAdmin = buildAdminUserIdentityPayload(issue.admin);
  const nextAdmin = buildAdminUserIdentityPayload(newAdmin);

  if (sameId(issue.admin?._id || issue.admin, newAdmin._id)) {
    return {
      message: `Issue ${issue.name} is already assigned to ${newAdmin.email}`,
      issue: {
        id: toIdString(issue._id),
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
    message: `Issue ${issue.name} reassigned to ${newAdmin.email} successfully`,
    issue: {
      id: toIdString(issue._id),
      name: issue.name,
    },
    admin: {
      oldAdmin,
      newAdmin: nextAdmin,
    },
  };
};
export const deleteUserAdminFlow = async ({
  targetUserId,
  adminUserId,
  session = null,
}) => {
  if (!targetUserId || !isValidObjectIdLike(targetUserId)) {
    throw createBadRequestError("User id is required", {
      field: "targetUserId",
    });
  }

  const user = await withOptionalSession(User.findById(targetUserId), session);

  if (!user) {
    throw createNotFoundError("User not found", {
      field: "id",
    });
  }

  if (sameId(adminUserId, user._id)) {
    throw createBadRequestError(
      "You cannot delete your own account from this admin panel",
      { field: "targetUserId" }
    );
  }

  const ownedIssuesCount = await withOptionalSession(
    Issue.countDocuments({ admin: user._id }),
    session
  );

  if (ownedIssuesCount > 0) {
    throw createBadRequestError(
      "This user is creator/admin of one or more issues. Resolve those issues first before deleting the user.",
      { field: "targetUserId" }
    );
  }

  const participations = await withOptionalSession(
    Participation.find({ expert: user._id }),
    session
  );

  const issueIds = [...new Set(participations.map((item) => toIdString(item.issue)))];

  const issues = issueIds.length
    ? await withOptionalSession(Issue.find({ _id: { $in: issueIds } }), session)
    : [];

  const participationsByIssueId = new Map(
    participations.map((participation) => [toIdString(participation.issue), participation])
  );

  const summary = {
    activeIssuesUpdated: 0,
    activeIssuesDeleted: 0,
    finishedIssuesHidden: 0,
    finishedIssuesDeleted: 0,
    activeIssueEvaluationsDeleted: 0,
    domainsDeleted: 0,
  };

  for (const issue of issues) {
    const participation = participationsByIssueId.get(toIdString(issue._id));

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

  summary.domainsDeleted = deleteDomainsResult.deletedCount;

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
      id: toIdString(user._id),
      email: user.email,
    },
    summary,
  };
};

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
    domainsAgg.map((row) => [toIdString(row._id), row.count])
  );

  const ownedIssuesMap = new Map(
    ownedIssuesAgg.map((row) => [
      toIdString(row._id),
      {
        total: row.total,
        active: row.active,
        finished: row.finished,
      },
    ])
  );

  const participationStatsMap = new Map();

  for (const user of users) {
    participationStatsMap.set(toIdString(user._id), {
      activeIssues: 0,
      finishedIssues: 0,
    });
  }

  for (const participation of participations) {
    if (!participation.issue) {
      continue;
    }

    const key = toIdString(participation.expert);
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
      const userId = toIdString(user._id);

      return {
        id: userId,
        name: user.name,
        university: user.university,
        email: user.email,
        role: user.role,
        accountConfirm: user.accountConfirm,
        accountCreation: user.accountCreation,
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
