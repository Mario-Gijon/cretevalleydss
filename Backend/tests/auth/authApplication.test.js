import mongoose from "mongoose";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const dependencyState = vi.hoisted(() => ({
  confirmAccount: vi.fn(),
  confirmAuthenticatedUserEmailChange: vi.fn(),
  createSignupAccount: vi.fn(),
  deleteAuthenticatedUserAccount: vi.fn(),
  requestAuthenticatedUserEmailChange: vi.fn(),
  sendEmailChangeConfirmation: vi.fn(),
  sendVerificationEmail: vi.fn(),
  updateAuthenticatedUserName: vi.fn(),
  updateAuthenticatedUserPassword: vi.fn(),
  updateAuthenticatedUserUniversity: vi.fn(),
}));

vi.mock("../../modules/auth/account.js", () => ({
  confirmAccount: dependencyState.confirmAccount,
  createSignupAccount: dependencyState.createSignupAccount,
  deleteAuthenticatedUserAccount: dependencyState.deleteAuthenticatedUserAccount,
}));

vi.mock("../../modules/auth/emailChange.js", () => ({
  confirmAuthenticatedUserEmailChange:
    dependencyState.confirmAuthenticatedUserEmailChange,
  requestAuthenticatedUserEmailChange:
    dependencyState.requestAuthenticatedUserEmailChange,
}));

vi.mock("../../modules/auth/profile.js", () => ({
  updateAuthenticatedUserName: dependencyState.updateAuthenticatedUserName,
  updateAuthenticatedUserPassword:
    dependencyState.updateAuthenticatedUserPassword,
  updateAuthenticatedUserUniversity:
    dependencyState.updateAuthenticatedUserUniversity,
}));

vi.mock("../../services/email.service.js", () => ({
  sendEmailChangeConfirmation: dependencyState.sendEmailChangeConfirmation,
  sendVerificationEmail: dependencyState.sendVerificationEmail,
}));

import {
  confirmSignupAccount,
  requestAuthenticatedEmailChange,
  signupAccount,
  updateAuthenticatedPassword,
} from "../../modules/auth/application.js";

const createSession = (events, { commitError = null } = {}) => {
  let transactionActive = false;

  return {
    abortTransaction: vi.fn(async () => {
      events.push("abort");
      transactionActive = false;
    }),
    commitTransaction: vi.fn(async () => {
      events.push("commit");
      if (commitError) throw commitError;
      transactionActive = false;
    }),
    endSession: vi.fn(async () => {
      events.push("end");
    }),
    inTransaction: vi.fn(() => transactionActive),
    startTransaction: vi.fn(() => {
      events.push("start");
      transactionActive = true;
    }),
  };
};

describe("auth application use cases", () => {
  let events;
  let session;

  beforeEach(() => {
    events = [];

    for (const dependency of Object.values(dependencyState)) {
      dependency.mockReset();
    }

    session = createSession(events);
    vi.spyOn(mongoose, "startSession").mockResolvedValue(session);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("commits signup persistence before dispatching email and ends the session last", async () => {
    const verificationEmail = {
      name: "Mario",
      email: "mario@example.com",
      token: "verification-token",
    };

    dependencyState.createSignupAccount.mockImplementation(
      async ({ payload, session: receivedSession }) => {
        events.push("signup-write");
        expect(payload).toEqual({ email: "mario@example.com" });
        expect(receivedSession).toBe(session);
        return {
          message: "Signup successful",
          verificationEmail,
        };
      }
    );
    dependencyState.sendVerificationEmail.mockImplementation(async (payload) => {
      events.push("verification-email");
      expect(payload).toBe(verificationEmail);
    });

    const result = await signupAccount({
      payload: { email: "mario@example.com" },
      beforeSessionCleanup: (applicationResult) => {
        events.push("response");
        return applicationResult;
      },
    });

    expect(result.message).toBe("Signup successful");
    expect(events).toEqual([
      "start",
      "signup-write",
      "commit",
      "verification-email",
      "response",
      "end",
    ]);
  });

  it("commits an email-change request before dispatching email and ends the session last", async () => {
    const emailChangeConfirmation = {
      newEmail: "new@example.com",
      token: "email-change-token",
    };

    dependencyState.requestAuthenticatedUserEmailChange.mockImplementation(
      async ({ userId, newEmail, session: receivedSession }) => {
        events.push("email-change-write");
        expect(userId).toBe("user-id");
        expect(newEmail).toBe("new@example.com");
        expect(receivedSession).toBe(session);
        return {
          message: "Please, check new email for confirmation",
          emailChangeConfirmation,
        };
      }
    );
    dependencyState.sendEmailChangeConfirmation.mockImplementation(
      async (payload) => {
        events.push("email-change-email");
        expect(payload).toBe(emailChangeConfirmation);
      }
    );

    await requestAuthenticatedEmailChange({
      userId: "user-id",
      newEmail: "new@example.com",
      beforeSessionCleanup: () => {
        events.push("response");
      },
    });

    expect(events).toEqual([
      "start",
      "email-change-write",
      "commit",
      "email-change-email",
      "response",
      "end",
    ]);
  });

  it("handles a confirmation error before ending its transaction session", async () => {
    const confirmationError = Object.assign(new Error("token expired"), {
      statusCode: 400,
    });
    dependencyState.confirmAccount.mockImplementation(async () => {
      events.push("confirm-write");
      throw confirmationError;
    });

    await expect(
      confirmSignupAccount({
        token: "expired-token",
        onErrorBeforeSessionCleanup: (error) => {
          expect(error).toBe(confirmationError);
          events.push("redirect");
          return "redirected";
        },
      })
    ).resolves.toBe("redirected");

    expect(events).toEqual([
      "start",
      "confirm-write",
      "abort",
      "redirect",
      "end",
    ]);
  });

  it("propagates a post-commit email failure without attempting rollback", async () => {
    const emailError = new Error("email unavailable");

    dependencyState.createSignupAccount.mockImplementation(async () => {
      events.push("signup-write");
      return {
        message: "Signup successful",
        verificationEmail: { token: "verification-token" },
      };
    });
    dependencyState.sendVerificationEmail.mockImplementation(async () => {
      events.push("verification-email");
      throw emailError;
    });

    await expect(signupAccount({ payload: {} })).rejects.toBe(emailError);

    expect(events).toEqual([
      "start",
      "signup-write",
      "commit",
      "verification-email",
      "end",
    ]);
    expect(session.abortTransaction).not.toHaveBeenCalled();
  });

  it("aborts and ends the transaction when a profile mutation fails", async () => {
    const mutationError = new Error("password mutation failed");

    dependencyState.updateAuthenticatedUserPassword.mockImplementation(async () => {
      events.push("password-write");
      throw mutationError;
    });

    await expect(
      updateAuthenticatedPassword({
        userId: "user-id",
        newPassword: "password1",
        repeatNewPassword: "password1",
      })
    ).rejects.toBe(mutationError);

    expect(events).toEqual(["start", "password-write", "abort", "end"]);
    expect(session.commitTransaction).not.toHaveBeenCalled();
  });

  it("does not dispatch email when transaction commit fails", async () => {
    const commitError = new Error("commit failed");
    session = createSession(events, { commitError });
    mongoose.startSession.mockResolvedValue(session);

    dependencyState.createSignupAccount.mockImplementation(async () => {
      events.push("signup-write");
      return {
        message: "Signup successful",
        verificationEmail: { token: "verification-token" },
      };
    });

    await expect(signupAccount({ payload: {} })).rejects.toBe(commitError);

    expect(events).toEqual([
      "start",
      "signup-write",
      "commit",
      "abort",
      "end",
    ]);
    expect(dependencyState.sendVerificationEmail).not.toHaveBeenCalled();
  });
});
