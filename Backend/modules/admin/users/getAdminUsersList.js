import { ExpressionDomain } from "../../../models/ExpressionDomain.js";
import { Issue } from "../../../models/Issues.js";
import { Participation } from "../../../models/Participations.js";
import { User } from "../../../models/Users.js";

import { createInternalError } from "../../../utils/common/errors.js";
import { toIdString } from "../../../utils/common/ids.js";

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
    const key = toIdString(participation.expert);
    const stats = participationStatsMap.get(key);
    const issueId = toIdString(participation.issue?._id);

    if (!key) {
      throw createInternalError("Participation expert id is invalid", {
        field: "participations.expert",
        details: {
          participationId: toIdString(participation._id) || null,
        },
      });
    }

    if (!participation.issue || !issueId) {
      throw createInternalError("Participation issue must be populated", {
        field: "participations.issue",
        details: {
          participationId: toIdString(participation._id) || null,
          userId: key,
        },
      });
    }

    if (!stats) {
      throw createInternalError(
        "Participation expert was not found in admin users list aggregation",
        {
          field: "participations.expert",
          details: {
            participationId: toIdString(participation._id) || null,
            userId: key,
            issueId,
          },
        }
      );
    }

    if (typeof participation.issue.active !== "boolean") {
      throw createInternalError("Participation issue active flag is invalid", {
        field: "participations.issue.active",
        details: {
          participationId: toIdString(participation._id) || null,
          issueId,
        },
      });
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
      const participationStats = participationStatsMap.get(userId);

      if (!participationStats) {
        throw createInternalError(
          "User participation stats are missing in admin users list aggregation",
          {
            field: "users._id",
            details: {
              userId,
            },
          }
        );
      }

      return {
        id: userId,
        name: user.name,
        university: user.university,
        email: user.email,
        role: user.role,
        accountConfirm: user.accountConfirm,
        accountCreation: user.accountCreation,
        stats: {
          activeIssues: participationStats.activeIssues,
          finishedIssues: participationStats.finishedIssues,
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
