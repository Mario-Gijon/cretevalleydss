import { beforeEach, describe, expect, it, vi } from "vitest";

const authBoundaryState = vi.hoisted(() => ({
  confirmAuthenticatedEmailChange: vi.fn(),
  confirmSignupAccount: vi.fn(),
}));

vi.mock("../../modules/auth/index.js", () => ({
  confirmAuthenticatedEmailChange:
    authBoundaryState.confirmAuthenticatedEmailChange,
  confirmSignupAccount: authBoundaryState.confirmSignupAccount,
  deleteAuthenticatedAccount: vi.fn(),
  getAuthenticatedUserProfilePayload: vi.fn(),
  loginUser: vi.fn(),
  requestAuthenticatedEmailChange: vi.fn(),
  signupAccount: vi.fn(),
  updateAuthenticatedName: vi.fn(),
  updateAuthenticatedPassword: vi.fn(),
  updateAuthenticatedUniversity: vi.fn(),
}));

vi.mock("../../services/token.service.js", () => ({
  generateRefreshToken: vi.fn(),
}));

import {
  accountConfirm,
  confirmEmailChange,
} from "../../controllers/auth.controller.js";

const STATUS_COOKIE_OPTIONS = {
  secure: false,
  sameSite: "strict",
  maxAge: 30000,
};

const createResponse = () => ({
  cookie: vi.fn(),
  redirect: vi.fn((target) => target),
});

const completeConfirmation = (mock, result = {}) => {
  mock.mockImplementation(({ beforeSessionCleanup }) =>
    beforeSessionCleanup(result)
  );
};

const failConfirmation = (mock, error) => {
  mock.mockImplementation(({ onErrorBeforeSessionCleanup }) =>
    onErrorBeforeSessionCleanup(error)
  );
};

describe("auth confirmation transport outcomes", () => {
  beforeEach(() => {
    authBoundaryState.confirmAuthenticatedEmailChange.mockReset();
    authBoundaryState.confirmSignupAccount.mockReset();
  });

  it("sets the verified account cookie before redirecting after confirmation", async () => {
    const res = createResponse();
    completeConfirmation(authBoundaryState.confirmSignupAccount, {
      message: "Account verified successfully",
    });

    await accountConfirm({ params: { token: "account-token" } }, res);

    expect(authBoundaryState.confirmSignupAccount).toHaveBeenCalledWith(
      expect.objectContaining({
        token: "account-token",
        beforeSessionCleanup: expect.any(Function),
        onErrorBeforeSessionCleanup: expect.any(Function),
      })
    );
    expect(res.cookie).toHaveBeenCalledWith(
      "accountStatus",
      "verified",
      STATUS_COOKIE_OPTIONS
    );
    expect(res.redirect).toHaveBeenCalledWith(`${process.env.ORIGIN_FRONT}/`);
    expect(res.cookie.mock.invocationCallOrder[0]).toBeLessThan(
      res.redirect.mock.invocationCallOrder[0]
    );
  });

  it("maps expected account confirmation failures to verification_failed", async () => {
    const res = createResponse();
    failConfirmation(authBoundaryState.confirmSignupAccount, { statusCode: 404 });

    await accountConfirm({ params: { token: "unknown-token" } }, res);

    expect(res.cookie).toHaveBeenCalledWith(
      "accountStatus",
      "verification_failed",
      STATUS_COOKIE_OPTIONS
    );
    expect(res.redirect).toHaveBeenCalledWith(`${process.env.ORIGIN_FRONT}/`);
  });

  it("maps unexpected account confirmation failures to error", async () => {
    const res = createResponse();
    failConfirmation(
      authBoundaryState.confirmSignupAccount,
      new Error("database down")
    );

    await accountConfirm({ params: { token: "account-token" } }, res);

    expect(res.cookie).toHaveBeenCalledWith(
      "accountStatus",
      "error",
      STATUS_COOKIE_OPTIONS
    );
    expect(res.redirect).toHaveBeenCalledWith(`${process.env.ORIGIN_FRONT}/`);
  });

  it("sets the verified email-change cookie before redirecting", async () => {
    const res = createResponse();
    completeConfirmation(authBoundaryState.confirmAuthenticatedEmailChange, {
      message: "Email changed successfully",
    });

    await confirmEmailChange({ params: { token: "email-token" } }, res);

    expect(
      authBoundaryState.confirmAuthenticatedEmailChange
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        token: "email-token",
        beforeSessionCleanup: expect.any(Function),
        onErrorBeforeSessionCleanup: expect.any(Function),
      })
    );
    expect(res.cookie).toHaveBeenCalledWith(
      "emailChangeStatus",
      "verified",
      STATUS_COOKIE_OPTIONS
    );
    expect(res.redirect).toHaveBeenCalledWith(`${process.env.ORIGIN_FRONT}/`);
  });

  it("maps expected email-change failures to verification_failed", async () => {
    const res = createResponse();
    failConfirmation(authBoundaryState.confirmAuthenticatedEmailChange, {
      statusCode: 409,
    });

    await confirmEmailChange({ params: { token: "email-token" } }, res);

    expect(res.cookie).toHaveBeenCalledWith(
      "emailChangeStatus",
      "verification_failed",
      STATUS_COOKIE_OPTIONS
    );
    expect(res.redirect).toHaveBeenCalledWith(`${process.env.ORIGIN_FRONT}/`);
  });

  it("maps unexpected email-change failures to error", async () => {
    const res = createResponse();
    failConfirmation(
      authBoundaryState.confirmAuthenticatedEmailChange,
      new Error("database down")
    );

    await confirmEmailChange({ params: { token: "email-token" } }, res);

    expect(res.cookie).toHaveBeenCalledWith(
      "emailChangeStatus",
      "error",
      STATUS_COOKIE_OPTIONS
    );
    expect(res.redirect).toHaveBeenCalledWith(`${process.env.ORIGIN_FRONT}/`);
  });
});
