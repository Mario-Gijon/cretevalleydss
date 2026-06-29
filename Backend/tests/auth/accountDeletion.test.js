import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const authState = vi.hoisted(() => ({
  currentPayload: {
    uid: null,
    role: "user",
  },
}));

vi.mock("jsonwebtoken", () => ({
  default: {
    sign: (payload) => `token-${payload?.uid ?? "anonymous"}`,
    verify: () => authState.currentPayload,
  },
}));

vi.mock("../../services/email.service.js", () => ({
  sendVerificationEmail: vi.fn(),
  sendEmailChangeConfirmation: vi.fn(),
  sendExpertInvitationEmail: vi.fn(),
}));

vi.mock("../../services/token.service.js", () => ({
  generateToken: (uid, role = "user") => ({
    token: `token-${String(uid)}-${role}`,
    expiresIn: 900,
  }),
  generateRefreshToken: (_uid, res) => {
    res.cookie("refreshToken", "test-refresh-token", {
      httpOnly: true,
      sameSite: "strict",
    });

    return {
      expiresIn: 60 * 60 * 24 * 30,
    };
  },
}));

import app from "../../app.js";
import { ExpressionDomain } from "../../models/ExpressionDomain.js";
import { ExitUserIssue } from "../../models/ExitUserIssue.js";
import { IssueEvaluation } from "../../models/IssueEvaluations.js";
import { Issue } from "../../models/Issues.js";
import { Participation } from "../../models/Participations.js";
import { User } from "../../models/Users.js";
import {
  createSignupAccount,
  deleteAuthenticatedUserAccount,
} from "../../modules/auth/account.js";
import {
  buildDeletedUserEmail,
  purgeDeletedUserIfUnreferenced,
} from "../../modules/auth/deletedUserPurge.js";
import { getAuthenticatedUserProfilePayload } from "../../modules/auth/profile.js";
import { loginUser } from "../../modules/auth/session.js";
import { deleteIssueCascade } from "../../modules/issues/lifecycle/deleteIssueCascade.js";
import {
  createConfirmedUser,
  createExpressionDomainFixture,
  createIssueEvaluationFixture,
  createIssueFixture,
  createParticipationFixture,
} from "../setup/fixtures.js";
import { setupMongoDbTestHooks } from "../setup/database.js";

setupMongoDbTestHooks();

const getAuthHeader = () => ({
  Authorization: "Bearer mocked-access-token",
});

describe("authenticated account deletion", () => {
  beforeEach(() => {
    authState.currentPayload = {
      uid: null,
      role: "user",
    };
  });

  it("soft-deletes and anonymizes a user when historical references remain, while preserving the original email for reuse", async () => {
    const originalEmail = "historical-owner@example.com";
    const user = await createConfirmedUser({
      name: "Historical Owner",
      university: "Alpha University",
      email: originalEmail,
      password: "Abc123",
      tokenConfirm: "signup-token",
      emailTokenConfirm: "email-change-token",
    });
    const finishedIssue = await createIssueFixture({
      ownerId: user._id,
      createdBy: user._id,
      active: false,
      currentStage: "finished",
      consensusPhase: 1,
      name: "Historical issue",
    });

    const result = await deleteAuthenticatedUserAccount({
      userId: user._id,
    });

    const deletedUser = await User.findById(user._id);

    expect(result).toEqual({
      message: "Account deleted successfully",
    });
    expect(deletedUser).not.toBeNull();
    expect(deletedUser).toMatchObject({
      isDeleted: true,
      name: "Deleted user",
      university: "Deleted user",
      email: buildDeletedUserEmail(user._id),
      tokenConfirm: null,
      emailTokenConfirm: null,
      accountConfirm: false,
    });
    expect(deletedUser.deletedAt).toBeInstanceOf(Date);
    expect(await deletedUser.comparePassword("Abc123")).toBe(false);
    expect(await Issue.findById(finishedIssue._id)).not.toBeNull();

    const signupResult = await createSignupAccount({
      payload: {
        name: "Replacement User",
        university: "Beta University",
        email: originalEmail.toUpperCase(),
        password: "Abc123",
      },
    });

    expect(signupResult).toMatchObject({
      message: "Signup successful",
      verificationEmail: {
        email: originalEmail,
      },
    });
  });

  it("rejects account deletion while the user still owns an active issue", async () => {
    const user = await createConfirmedUser({
      email: "active-owner@example.com",
    });

    await createIssueFixture({
      ownerId: user._id,
      createdBy: user._id,
      active: true,
      currentStage: "criteriaWeighting",
    });

    await expect(
      deleteAuthenticatedUserAccount({
        userId: user._id,
      })
    ).rejects.toMatchObject({
      statusCode: 400,
      field: "userId",
      message: "Cannot delete account while owning active issues",
    });

    expect(await User.findById(user._id).lean()).toMatchObject({
      isDeleted: false,
      email: "active-owner@example.com",
    });
  });

  it("removes a deleted expert from a non-consensus active issue and preserves historical criteria-weighting data", async () => {
    const owner = await createConfirmedUser({
      email: "owner@example.com",
    });
    const expert = await createConfirmedUser({
      email: "expert@example.com",
    });
    const issue = await createIssueFixture({
      ownerId: owner._id,
      currentStage: "alternativeEvaluation",
      consensusPhase: 1,
      isConsensus: false,
      name: "Active non-consensus issue",
    });

    await createParticipationFixture({
      issueId: issue._id,
      expertId: expert._id,
      invitationStatus: "accepted",
      entryPhase: 1,
      entryStage: "alternativeEvaluation",
    });
    await createIssueEvaluationFixture({
      issueId: issue._id,
      expertId: expert._id,
      stage: "criteriaWeighting",
      consensusPhase: 1,
      completed: true,
    });
    await createIssueEvaluationFixture({
      issueId: issue._id,
      expertId: expert._id,
      stage: "alternativeEvaluation",
      consensusPhase: 1,
      completed: true,
      payload: { removed: "current-phase" },
    });
    await createIssueEvaluationFixture({
      issueId: issue._id,
      expertId: expert._id,
      stage: "alternativeEvaluation",
      consensusPhase: 0,
      completed: false,
      payload: { removed: "incomplete" },
    });

    await deleteAuthenticatedUserAccount({
      userId: expert._id,
    });

    const remainingEvaluations = await IssueEvaluation.find({
      issue: issue._id,
      expert: expert._id,
    }).lean();
    const exitLog = await ExitUserIssue.findOne({
      issue: issue._id,
      user: expert._id,
    }).lean();

    expect(await Participation.findOne({ issue: issue._id, expert: expert._id })).toBeNull();
    expect(remainingEvaluations).toHaveLength(1);
    expect(remainingEvaluations[0]).toMatchObject({
      stage: "criteriaWeighting",
      consensusPhase: 1,
      completed: true,
    });
    expect(exitLog).toMatchObject({
      hidden: true,
      phase: 1,
      stage: "alternativeEvaluation",
      reason: "User account deleted",
    });
  });

  it("treats simulated-consensus issues with consensus cleanup semantics during account deletion", async () => {
    const owner = await createConfirmedUser({
      email: "consensus-owner@example.com",
    });
    const expert = await createConfirmedUser({
      email: "consensus-expert@example.com",
    });
    const issue = await createIssueFixture({
      ownerId: owner._id,
      currentStage: "alternativeEvaluation",
      consensusPhase: 2,
      simulateConsensus: true,
      name: "Simulated consensus issue",
    });

    await createParticipationFixture({
      issueId: issue._id,
      expertId: expert._id,
      invitationStatus: "accepted",
      entryPhase: 2,
      entryStage: "alternativeEvaluation",
    });
    await createIssueEvaluationFixture({
      issueId: issue._id,
      expertId: expert._id,
      stage: "criteriaWeighting",
      consensusPhase: 2,
      completed: true,
    });
    await createIssueEvaluationFixture({
      issueId: issue._id,
      expertId: expert._id,
      stage: "alternativeEvaluation",
      consensusPhase: 1,
      completed: true,
      payload: { kept: true },
    });
    await createIssueEvaluationFixture({
      issueId: issue._id,
      expertId: expert._id,
      stage: "alternativeEvaluation",
      consensusPhase: 2,
      completed: true,
      payload: { removed: "current-phase" },
    });
    await createIssueEvaluationFixture({
      issueId: issue._id,
      expertId: expert._id,
      stage: "alternativeEvaluation",
      consensusPhase: 0,
      completed: false,
      payload: { removed: "incomplete" },
    });

    await deleteAuthenticatedUserAccount({
      userId: expert._id,
    });

    const remainingEvaluations = await IssueEvaluation.find({
      issue: issue._id,
      expert: expert._id,
    })
      .sort({ stage: 1, consensusPhase: 1 })
      .lean();

    expect(remainingEvaluations).toHaveLength(2);
    expect(remainingEvaluations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          stage: "criteriaWeighting",
          consensusPhase: 2,
          completed: true,
        }),
        expect.objectContaining({
          stage: "alternativeEvaluation",
          consensusPhase: 1,
          completed: true,
          payload: { kept: true },
        }),
      ])
    );
  });

  it("keeps deleted users inaccessible to login and profile reads", async () => {
    const user = await createConfirmedUser({
      email: "deleted-profile@example.com",
      password: "Abc123",
    });

    await createExpressionDomainFixture({
      userId: user._id,
      name: "Saved domain",
    });

    await deleteAuthenticatedUserAccount({
      userId: user._id,
    });

    await expect(
      loginUser({
        email: "deleted-profile@example.com",
        password: "Abc123",
      })
    ).rejects.toMatchObject({
      statusCode: 400,
      field: "email",
      message: "User does not exist",
    });

    await expect(
      getAuthenticatedUserProfilePayload({
        userId: user._id,
      })
    ).rejects.toMatchObject({
      statusCode: 404,
      field: "userId",
      message: "User not found",
    });
  });

  it("purges a deleted user only after the last remaining references are removed", async () => {
    const user = await createConfirmedUser({
      email: "purge-me@example.com",
    });
    const domain = await createExpressionDomainFixture({
      userId: user._id,
      name: "Retained domain",
    });

    await deleteAuthenticatedUserAccount({
      userId: user._id,
    });

    expect(await User.findById(user._id)).not.toBeNull();

    await ExpressionDomain.deleteOne({ _id: domain._id });

    const purgeResult = await purgeDeletedUserIfUnreferenced({
      userId: user._id,
    });

    expect(purgeResult).toMatchObject({
      purged: true,
    });
    expect(await User.findById(user._id)).toBeNull();
  });

  it("deleteIssueCascade purges a deleted owner once issue history becomes unreferenced", async () => {
    const user = await createConfirmedUser({
      email: "cascade-owner@example.com",
    });
    const issue = await createIssueFixture({
      ownerId: user._id,
      createdBy: user._id,
      active: false,
      currentStage: "finished",
      name: "Cascade purge issue",
    });

    await deleteAuthenticatedUserAccount({
      userId: user._id,
    });

    expect(await User.findById(user._id)).not.toBeNull();

    await deleteIssueCascade({
      issueId: issue._id,
    });

    expect(await User.findById(user._id)).toBeNull();
  });
});

describe("account deletion API contracts", () => {
  beforeEach(() => {
    authState.currentPayload = {
      uid: null,
      role: "user",
    };
  });

  it("DELETE /api/auth/me deletes the authenticated account and returns success", async () => {
    const user = await createConfirmedUser({
      email: "api-delete@example.com",
    });

    await createExpressionDomainFixture({
      userId: user._id,
      name: "API delete domain",
    });

    authState.currentPayload = {
      uid: String(user._id),
      role: "user",
    };

    const response = await request(app)
      .delete("/api/auth/me")
      .set(getAuthHeader())
      .expect(200);

    expect(response.body).toMatchObject({
      success: true,
      message: "Account deleted successfully",
      data: null,
    });
    expect(await User.findById(user._id).lean()).toMatchObject({
      isDeleted: true,
      email: buildDeletedUserEmail(user._id),
    });
  });

  it("DELETE /api/auth/me returns the owner-blocking validation error for active issues", async () => {
    const user = await createConfirmedUser({
      email: "api-owner@example.com",
    });

    await createIssueFixture({
      ownerId: user._id,
      createdBy: user._id,
      active: true,
      currentStage: "criteriaWeighting",
    });

    authState.currentPayload = {
      uid: String(user._id),
      role: "user",
    };

    const response = await request(app)
      .delete("/api/auth/me")
      .set(getAuthHeader())
      .expect(400);

    expect(response.body).toMatchObject({
      success: false,
      message: "Cannot delete account while owning active issues",
      error: {
        field: "userId",
      },
    });
  });

  it("POST /api/auth/login rejects a deleted user using the existing email/password contract", async () => {
    const user = await createConfirmedUser({
      email: "deleted-login@example.com",
      password: "Abc123",
    });

    await createExpressionDomainFixture({
      userId: user._id,
      name: "Deleted login domain",
    });

    await deleteAuthenticatedUserAccount({
      userId: user._id,
    });

    const response = await request(app)
      .post("/api/auth/login")
      .send({
        email: "deleted-login@example.com",
        password: "Abc123",
      })
      .expect(400);

    expect(response.body).toMatchObject({
      success: false,
      message: "User does not exist",
      error: {
        field: "email",
      },
    });
  });

  it("GET /api/auth/me returns not found for a deleted authenticated user", async () => {
    const user = await createConfirmedUser({
      email: "api-profile-deleted@example.com",
    });

    await createExpressionDomainFixture({
      userId: user._id,
      name: "Deleted profile domain",
    });

    await deleteAuthenticatedUserAccount({
      userId: user._id,
    });

    authState.currentPayload = {
      uid: String(user._id),
      role: "user",
    };

    const response = await request(app)
      .get("/api/auth/me")
      .set(getAuthHeader())
      .expect(404);

    expect(response.body).toMatchObject({
      success: false,
      message: "User not found",
      error: {
        field: "userId",
      },
    });
  });
});
