import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const authState = vi.hoisted(() => ({
  payload: {
    uid: "000000000000000000000001",
    role: "user",
  },
}));

vi.mock("jsonwebtoken", () => ({
  default: {
    sign: (payload) =>
      payload?.newEmail
        ? `email-token:${payload.newEmail}`
        : `access-token:${payload?.uid ?? "unknown"}`,
    verify: (token) => {
      if (typeof token === "string" && token.startsWith("email-token:")) {
        return {
          newEmail: token.slice("email-token:".length),
        };
      }

      if (token === "invalid-email-token") {
        throw new Error("Invalid email token");
      }

      return authState.payload;
    },
  },
}));

vi.mock("../../services/email.service.js", () => ({
  sendVerificationEmail: vi.fn(),
  sendEmailChangeConfirmation: vi.fn(),
  sendExpertInvitationEmail: vi.fn(),
}));

import app from "../../app.js";
import { User } from "../../models/Users.js";
import { createConfirmedUser } from "../setup/fixtures.js";
import { setupMongoDbTestHooks } from "../setup/database.js";

setupMongoDbTestHooks();

const getStatusCookie = (response, name) => {
  return (response.headers["set-cookie"] || []).find((cookie) =>
    cookie.startsWith(`${name}=`)
  );
};

const expectStatusCookie = ({ cookie, name, value }) => {
  expect(cookie).toEqual(expect.any(String));
  expect(cookie).toContain(`${name}=${value}`);
  expect(cookie).toContain("Max-Age=30");
  expect(cookie).toContain("Path=/");
  expect(cookie).toContain("Expires=");
  expect(cookie).toContain("SameSite=Strict");
  expect(cookie).not.toContain("HttpOnly");
  expect(cookie).not.toContain("Secure");
};

describe("auth transport contracts", () => {
  beforeEach(() => {
    authState.payload = {
      uid: "000000000000000000000001",
      role: "user",
    };
  });

  it("POST /api/auth/logout clears the refresh cookie and returns the exact success envelope", async () => {
    const response = await request(app).post("/api/auth/logout").expect(200);

    expect(response.body).toEqual({
      success: true,
      message: "Logged out successfully",
      data: null,
    });
    expect(response.headers["set-cookie"]).toEqual([
      "refreshToken=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT",
    ]);
  });

  it("GET /api/auth/admin/check preserves the non-admin forbidden envelope", async () => {
    const response = await request(app)
      .get("/api/auth/admin/check")
      .set("Authorization", "Bearer user-token")
      .expect(403);

    expect(response.body).toEqual({
      success: false,
      message: "Admin only.",
      data: null,
      error: {
        code: "FORBIDDEN",
        field: null,
        details: null,
      },
    });
  });

  it("GET /api/auth/admin/check preserves the admin success envelope", async () => {
    authState.payload = {
      uid: "000000000000000000000001",
      role: "admin",
    };

    const response = await request(app)
      .get("/api/auth/admin/check")
      .set("Authorization", "Bearer admin-token")
      .expect(200);

    expect(response.body).toEqual({
      success: true,
      message: "Admin access granted",
      data: null,
    });
  });

  it("account confirmation persists verification before redirecting with the verified status cookie", async () => {
    const user = await createConfirmedUser({
      email: "account-confirm@example.com",
      accountConfirm: false,
      tokenConfirm: "account-confirm-token",
    });

    const response = await request(app)
      .get("/api/auth/account/confirm/account-confirm-token")
      .expect(302);

    expect(response.headers.location).toBe("http://localhost:5173/");
    expectStatusCookie({
      cookie: getStatusCookie(response, "accountStatus"),
      name: "accountStatus",
      value: "verified",
    });
    expect(await User.findById(user._id).lean()).toMatchObject({
      accountConfirm: true,
      tokenConfirm: null,
    });
  });

  it("failed account confirmation redirects with verification_failed and the same cookie options", async () => {
    const response = await request(app)
      .get("/api/auth/account/confirm/unknown-account-token")
      .expect(302);

    expect(response.headers.location).toBe("http://localhost:5173/");
    expectStatusCookie({
      cookie: getStatusCookie(response, "accountStatus"),
      name: "accountStatus",
      value: "verification_failed",
    });
  });

  it("email confirmation persists the new email before redirecting with the verified status cookie", async () => {
    const token = "email-token:new-email@example.com";
    const user = await createConfirmedUser({
      email: "old-email@example.com",
      emailTokenConfirm: token,
    });

    const response = await request(app)
      .get(`/api/auth/email-change/confirm/${encodeURIComponent(token)}`)
      .expect(302);

    expect(response.headers.location).toBe("http://localhost:5173/");
    expectStatusCookie({
      cookie: getStatusCookie(response, "emailChangeStatus"),
      name: "emailChangeStatus",
      value: "verified",
    });
    expect(await User.findById(user._id).lean()).toMatchObject({
      email: "new-email@example.com",
      emailTokenConfirm: null,
    });
  });

  it("failed email confirmation redirects with verification_failed and the same cookie options", async () => {
    await createConfirmedUser({
      email: "unchanged-email@example.com",
      emailTokenConfirm: "invalid-email-token",
    });

    const response = await request(app)
      .get("/api/auth/email-change/confirm/invalid-email-token")
      .expect(302);

    expect(response.headers.location).toBe("http://localhost:5173/");
    expectStatusCookie({
      cookie: getStatusCookie(response, "emailChangeStatus"),
      name: "emailChangeStatus",
      value: "verification_failed",
    });
    expect(await User.findOne({ email: "unchanged-email@example.com" }).lean())
      .toMatchObject({
        emailTokenConfirm: "invalid-email-token",
      });
  });
});
