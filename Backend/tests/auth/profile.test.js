import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const authState = vi.hoisted(() => ({
  currentPayload: {
    uid: null,
    role: "user",
  },
}));

const emailServiceState = vi.hoisted(() => ({
  sendEmailChangeConfirmation: vi.fn(),
  sendVerificationEmail: vi.fn(),
}));

vi.mock("jsonwebtoken", () => ({
  default: {
    sign: (payload) => {
      if (payload?.newEmail) {
        return `email-token:${payload.newEmail}`;
      }

      return `signed-token:${payload?.uid ?? "unknown"}`;
    },
    verify: (token) => {
      if (typeof token === "string" && token.startsWith("email-token:")) {
        return {
          newEmail: token.slice("email-token:".length),
        };
      }

      return authState.currentPayload;
    },
  },
}));

vi.mock("../../services/email.service.js", () => ({
  sendVerificationEmail: emailServiceState.sendVerificationEmail,
  sendEmailChangeConfirmation: emailServiceState.sendEmailChangeConfirmation,
  sendExpertInvitationEmail: vi.fn(),
}));

import app from "../../app.js";
import { User } from "../../models/Users.js";
import { deleteAuthenticatedUserAccount } from "../../modules/auth/account.js";
import {
  getAuthenticatedUserProfilePayload,
  updateAuthenticatedUserName,
  updateAuthenticatedUserPassword,
  updateAuthenticatedUserUniversity,
} from "../../modules/auth/profile.js";
import { createConfirmedUser } from "../setup/fixtures.js";
import { setupMongoDbTestHooks } from "../setup/database.js";

setupMongoDbTestHooks();

const getAuthHeader = () => ({
  Authorization: "Bearer mocked-access-token",
});

describe("auth profile module", () => {
  beforeEach(() => {
    authState.currentPayload = {
      uid: null,
      role: "user",
    };
    emailServiceState.sendEmailChangeConfirmation.mockReset();
    emailServiceState.sendVerificationEmail.mockReset();
  });

  it("getAuthenticatedUserProfilePayload returns the expected profile for a normal user", async () => {
    const user = await createConfirmedUser({
      name: "Profile User",
      university: "Test University",
      email: "profile@example.com",
      role: "user",
    });

    const result = await getAuthenticatedUserProfilePayload({
      userId: user._id,
    });

    expect(result).toEqual({
      university: "Test University",
      name: "Profile User",
      email: "profile@example.com",
      accountCreation: user.accountCreation,
      role: "user",
      isAdmin: false,
    });
  });

  it("getAuthenticatedUserProfilePayload returns isAdmin true for admins", async () => {
    const admin = await createConfirmedUser({
      email: "admin@example.com",
      role: "admin",
    });

    const result = await getAuthenticatedUserProfilePayload({
      userId: admin._id,
    });

    expect(result.role).toBe("admin");
    expect(result.isAdmin).toBe(true);
  });

  it("getAuthenticatedUserProfilePayload rejects a missing user", async () => {
    await expect(
      getAuthenticatedUserProfilePayload({
        userId: "000000000000000000000001",
      })
    ).rejects.toMatchObject({
      statusCode: 404,
      field: "userId",
      message: "User not found",
    });
  });

  it("updateAuthenticatedUserName trims and persists the new name", async () => {
    const user = await createConfirmedUser({
      name: "Old Name",
    });

    const result = await updateAuthenticatedUserName({
      userId: user._id,
      newName: "  New Name  ",
    });

    const updatedUser = await User.findById(user._id);

    expect(result).toEqual({
      message: "Name updated successfully",
    });
    expect(updatedUser.name).toBe("New Name");
  });

  it("updateAuthenticatedUserName rejects an empty name", async () => {
    const user = await createConfirmedUser();

    await expect(
      updateAuthenticatedUserName({
        userId: user._id,
        newName: "   ",
      })
    ).rejects.toMatchObject({
      statusCode: 400,
      field: "newName",
      message: "Name is required",
    });
  });

  it("updateAuthenticatedUserUniversity trims and persists the new university", async () => {
    const user = await createConfirmedUser({
      university: "Old University",
    });

    const result = await updateAuthenticatedUserUniversity({
      userId: user._id,
      newUniversity: "  New University  ",
    });

    const updatedUser = await User.findById(user._id);

    expect(result).toEqual({
      message: "University updated successfully",
    });
    expect(updatedUser.university).toBe("New University");
  });

  it("updateAuthenticatedUserUniversity rejects an empty university", async () => {
    const user = await createConfirmedUser();

    await expect(
      updateAuthenticatedUserUniversity({
        userId: user._id,
        newUniversity: " ",
      })
    ).rejects.toMatchObject({
      statusCode: 400,
      field: "newUniversity",
      message: "University is required",
    });
  });

  it("updateAuthenticatedUserPassword persists a hashed password that can be verified", async () => {
    const user = await createConfirmedUser({
      password: "Abc123",
    });
    const previousHash = user.password;

    const result = await updateAuthenticatedUserPassword({
      userId: user._id,
      newPassword: "New123",
      repeatNewPassword: "New123",
    });

    const updatedUser = await User.findById(user._id);

    expect(result).toEqual({
      message: "Password updated successfully",
    });
    expect(updatedUser.password).not.toBe(previousHash);
    expect(await updatedUser.comparePassword("New123")).toBe(true);
  });

  it("updateAuthenticatedUserPassword rejects password mismatch", async () => {
    const user = await createConfirmedUser();

    await expect(
      updateAuthenticatedUserPassword({
        userId: user._id,
        newPassword: "New123",
        repeatNewPassword: "Other123",
      })
    ).rejects.toMatchObject({
      statusCode: 400,
      field: "repeatNewPassword",
      message: "Passwords do not match",
    });
  });

  it("updateAuthenticatedUserPassword rejects a too-short password", async () => {
    const user = await createConfirmedUser();

    await expect(
      updateAuthenticatedUserPassword({
        userId: user._id,
        newPassword: "Ab12",
        repeatNewPassword: "Ab12",
      })
    ).rejects.toMatchObject({
      statusCode: 400,
      field: "newPassword",
      message: "Password must be at least 6 characters",
    });
  });

  it("profile update operations reject a missing user", async () => {
    await expect(
      updateAuthenticatedUserName({
        userId: "000000000000000000000001",
        newName: "Valid Name",
      })
    ).rejects.toMatchObject({
      statusCode: 404,
      field: "userId",
      message: "User not found",
    });

    await expect(
      updateAuthenticatedUserUniversity({
        userId: "000000000000000000000001",
        newUniversity: "Valid University",
      })
    ).rejects.toMatchObject({
      statusCode: 404,
      field: "userId",
      message: "User not found",
    });

    await expect(
      updateAuthenticatedUserPassword({
        userId: "000000000000000000000001",
        newPassword: "Valid12",
        repeatNewPassword: "Valid12",
      })
    ).rejects.toMatchObject({
      statusCode: 404,
      field: "userId",
      message: "User not found",
    });
  });

  it("deleteAuthenticatedUserAccount deletes only the authenticated user document", async () => {
    const user = await createConfirmedUser({
      email: "delete-me@example.com",
    });

    const result = await deleteAuthenticatedUserAccount({
      userId: user._id,
    });

    expect(result).toEqual({
      message: "Account deleted successfully",
    });
    expect(await User.findById(user._id)).toBeNull();
  });

  it("deleteAuthenticatedUserAccount rejects a missing user", async () => {
    await expect(
      deleteAuthenticatedUserAccount({
        userId: "000000000000000000000001",
      })
    ).rejects.toMatchObject({
      statusCode: 404,
      field: "userId",
      message: "User not found",
    });
  });
});

describe("auth profile API contracts", () => {
  beforeEach(() => {
    authState.currentPayload = {
      uid: null,
      role: "user",
    };
    emailServiceState.sendEmailChangeConfirmation.mockReset();
  });

  it("authenticated GET /api/auth/me returns the expected profile shape", async () => {
    const user = await createConfirmedUser({
      name: "Api User",
      university: "Alpha University",
      email: "api-user@example.com",
    });

    authState.currentPayload = {
      uid: String(user._id),
      role: "user",
    };

    const response = await request(app)
      .get("/api/auth/me")
      .set(getAuthHeader())
      .expect(200);

    expect(response.body).toMatchObject({
      success: true,
      message: "User data fetched successfully",
      data: {
        user: {
          name: "Api User",
          university: "Alpha University",
          email: "api-user@example.com",
          role: "user",
          isAdmin: false,
        },
      },
    });
  });

  it("authenticated PATCH /api/auth/me/name updates name and returns success", async () => {
    const user = await createConfirmedUser({
      name: "Old Name",
    });

    authState.currentPayload = {
      uid: String(user._id),
      role: "user",
    };

    const response = await request(app)
      .patch("/api/auth/me/name")
      .set(getAuthHeader())
      .send({
        newName: "New Name",
      })
      .expect(200);

    expect(response.body).toMatchObject({
      success: true,
      message: "Name updated successfully",
      data: null,
    });
    expect((await User.findById(user._id)).name).toBe("New Name");
  });

  it("authenticated PATCH /api/auth/me/university updates university and returns success", async () => {
    const user = await createConfirmedUser({
      university: "Old University",
    });

    authState.currentPayload = {
      uid: String(user._id),
      role: "user",
    };

    const response = await request(app)
      .patch("/api/auth/me/university")
      .set(getAuthHeader())
      .send({
        newUniversity: "New University",
      })
      .expect(200);

    expect(response.body).toMatchObject({
      success: true,
      message: "University updated successfully",
      data: null,
    });
    expect((await User.findById(user._id)).university).toBe("New University");
  });

  it("authenticated PUT /api/auth/me/password updates password and returns success", async () => {
    const user = await createConfirmedUser({
      password: "Abc123",
    });

    authState.currentPayload = {
      uid: String(user._id),
      role: "user",
    };

    const response = await request(app)
      .put("/api/auth/me/password")
      .set(getAuthHeader())
      .send({
        newPassword: "New123",
        repeatNewPassword: "New123",
      })
      .expect(200);

    const updatedUser = await User.findById(user._id);

    expect(response.body).toMatchObject({
      success: true,
      message: "Password updated successfully",
      data: null,
    });
    expect(await updatedUser.comparePassword("New123")).toBe(true);
  });

  it("authenticated PATCH /api/auth/me/email returns success without sending a real email", async () => {
    const user = await createConfirmedUser({
      email: "old@example.com",
    });

    authState.currentPayload = {
      uid: String(user._id),
      role: "user",
    };

    const response = await request(app)
      .patch("/api/auth/me/email")
      .set(getAuthHeader())
      .send({
        newEmail: "new@example.com",
      })
      .expect(200);

    const updatedUser = await User.findById(user._id);

    expect(response.body).toMatchObject({
      success: true,
      message: "Please, check new email for confirmation",
      data: null,
    });
    expect(updatedUser.emailTokenConfirm).toBeTruthy();
    expect(emailServiceState.sendEmailChangeConfirmation).toHaveBeenCalledTimes(1);
    expect(emailServiceState.sendEmailChangeConfirmation).toHaveBeenCalledWith({
      newEmail: "new@example.com",
      token: "email-token:new@example.com",
    });
  });

  it("unauthenticated profile mutation requests are rejected", async () => {
    await request(app)
      .patch("/api/auth/me/name")
      .send({
        newName: "New Name",
      })
      .expect(401);

    await request(app)
      .put("/api/auth/me/password")
      .send({
        newPassword: "New123",
        repeatNewPassword: "New123",
      })
      .expect(401);
  });
});
