import { nanoid } from "nanoid";

import { Issue } from "../../models/Issues.js";
import { Participation } from "../../models/Participations.js";
import { User } from "../../models/Users.js";
import {
  createBadRequestError,
  createConflictError,
  createNotFoundError,
} from "../../utils/common/errors.js";
import { applyOptionalSession } from "../../utils/common/mongoose.js";
import { buildDeletedUserEmail, purgeDeletedUserIfUnreferenced } from "./deletedUserPurge.js";
import { cleanupIssueEvaluationsForExpertExit } from "../issues/lifecycle/cleanupIssueEvaluationsForExpertExit.js";
import { mapIssueStageToExitStage } from "../issues/lifecycle/mapIssueStageToExitStage.js";
import { registerUserExit } from "../issues/lifecycle/leaveActiveIssue.js";

export const createSignupAccount = async ({
  payload,
  session = null,
}) => {
  let {
    name = "",
    university = "",
    email = "",
    password = "",
  } = payload || {};

  name = String(name).trim();
  university = String(university).trim();
  email = String(email).trim().toLowerCase();
  password = String(password).trim();

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

  const existingUser = await applyOptionalSession(
    User.findOne({ email }).lean(),
    session
  );

  if (existingUser) {
    throw createConflictError("Email already registered", {
      field: "email",
    });
  }

  const tokenConfirm = nanoid();

  const user = new User({
    name,
    university,
    email,
    password,
    tokenConfirm,
  });

  await user.save({ session });

  return {
    message: "Signup successful",
    verificationEmail: {
      name: user.name,
      email: user.email,
      token: tokenConfirm,
    },
  };
};

export const confirmAccount = async ({
  token,
  session = null,
}) => {
  const cleanToken = String(token ?? "").trim();

  if (!cleanToken) {
    throw createBadRequestError("Token is required", {
      field: "token",
    });
  }

  const user = await applyOptionalSession(
    User.findOne({ tokenConfirm: cleanToken }),
    session
  );

  if (!user) {
    throw createNotFoundError("Account confirmation not found", {
      field: "token",
    });
  }

  user.accountConfirm = true;
  user.tokenConfirm = null;

  await user.save({ session });

  return {
    message: "Account verified successfully",
  };
};

export const deleteAuthenticatedUserAccount = async ({
  userId,
  session = null,
}) => {
  const user = await applyOptionalSession(User.findById(userId), session);

  if (!user || user.isDeleted === true) {
    throw createNotFoundError("User not found", {
      field: "userId",
    });
  }

  const activeOwnedIssue = await applyOptionalSession(
    Issue.findOne({
      ownerId: user._id,
      active: true,
    })
      .select("_id")
      .lean(),
    session
  );

  if (activeOwnedIssue) {
    throw createBadRequestError(
      "Cannot delete account while owning active issues",
      {
        field: "userId",
      }
    );
  }

  const activeExpertIssues = await applyOptionalSession(
    Issue.find({
      active: true,
      ownerId: { $ne: user._id },
      _id: {
        $in: await applyOptionalSession(
          Participation.find({
            expert: user._id,
          }).distinct("issue"),
          session
        ),
      },
    }).select(
      "_id currentStage consensusPhase isConsensus simulateConsensus ownerId"
    ),
    session
  );

  for (const issue of activeExpertIssues) {
    const participation = await applyOptionalSession(
      Participation.findOne({
        issue: issue._id,
        expert: user._id,
      }),
      session
    );

    if (!participation) {
      continue;
    }

    await cleanupIssueEvaluationsForExpertExit({
      issue,
      expertId: user._id,
      session,
    });

    await applyOptionalSession(
      Participation.deleteOne({ _id: participation._id }),
      session
    );

    await registerUserExit({
      issueId: issue._id,
      userId: user._id,
      phase: issue.consensusPhase,
      stage: mapIssueStageToExitStage(issue.currentStage, {
        issueId: issue._id,
      }),
      reason: "User account deleted",
      session,
    });
  }

  user.isDeleted = true;
  user.deletedAt = new Date();
  user.name = "Deleted user";
  user.university = "Deleted user";
  user.email = buildDeletedUserEmail(user._id);
  user.password = `deleted-user-${String(user._id)}-${user.deletedAt.getTime()}`;
  user.tokenConfirm = null;
  user.emailTokenConfirm = null;
  user.accountConfirm = false;
  user.markModified("password");

  await user.save({ session });

  await purgeDeletedUserIfUnreferenced({
    userId: user._id,
    session,
  });

  return {
    message: "Account deleted successfully",
  };
};
