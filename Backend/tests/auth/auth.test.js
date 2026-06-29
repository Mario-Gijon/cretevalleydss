import request from "supertest";
import { describe, expect, it, vi } from "vitest";

vi.mock("jsonwebtoken", () => ({
  default: {
    sign: () => "signed-token",
    verify: () => ({
      uid: "mock-user-id",
      role: "user",
    }),
  },
}));

vi.mock("../../services/token.service.js", () => ({
  generateToken: (uid, role = "user") => ({
    token: `token-${String(uid)}`,
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
import { User } from "../../models/Users.js";
import {
  confirmAccount,
  createSignupAccount,
} from "../../modules/auth/account.js";
import { loginUser } from "../../modules/auth/session.js";
import { setupMongoDbTestHooks } from "../setup/database.js";

setupMongoDbTestHooks();

const buildSignupPayload = (overrides = {}) => ({
  name: "Test User",
  university: "Test University",
  email: "User@Example.com",
  password: "Abc123",
  ...overrides,
});

describe("auth account and session", () => {
  it("createSignupAccount creates a normalized confirmed-pending user with hashed password and token", async () => {
    const payload = buildSignupPayload();

    const result = await createSignupAccount({ payload });
    const user = await User.findOne({ email: "user@example.com" });

    expect(result).toMatchObject({
      message: "Signup successful",
      verificationEmail: {
        email: "user@example.com",
        name: payload.name,
      },
    });
    expect(result.verificationEmail.token).toEqual(expect.any(String));

    expect(user).not.toBeNull();
    expect(user.email).toBe("user@example.com");
    expect(user.password).not.toBe(payload.password);
    expect(await user.comparePassword(payload.password)).toBe(true);
    expect(user.accountConfirm).toBe(false);
    expect(user.tokenConfirm).toEqual(expect.any(String));
  });

  it("createSignupAccount rejects duplicated email addresses", async () => {
    await createSignupAccount({
      payload: buildSignupPayload(),
    });

    await expect(
      createSignupAccount({
        payload: buildSignupPayload({
          email: "user@example.com",
        }),
      })
    ).rejects.toMatchObject({
      statusCode: 409,
      field: "email",
      message: "Email already registered",
    });
  });

  it("confirmAccount marks the account as confirmed and clears the token", async () => {
    const signup = await createSignupAccount({
      payload: buildSignupPayload(),
    });

    await confirmAccount({
      token: signup.verificationEmail.token,
    });

    const user = await User.findOne({ email: "user@example.com" });

    expect(user.accountConfirm).toBe(true);
    expect(user.tokenConfirm).toBeNull();
  });

  it("loginUser rejects unconfirmed accounts", async () => {
    const payload = buildSignupPayload();

    await createSignupAccount({ payload });

    await expect(
      loginUser({
        email: payload.email,
        password: payload.password,
      })
    ).rejects.toMatchObject({
      statusCode: 400,
      field: "email",
      message: "Email not verified",
    });
  });

  it("loginUser succeeds after account confirmation and returns token metadata", async () => {
    const payload = buildSignupPayload();
    const signup = await createSignupAccount({ payload });

    await confirmAccount({
      token: signup.verificationEmail.token,
    });

    const result = await loginUser({
      email: "USER@example.com",
      password: payload.password,
    });

    expect(result).toMatchObject({
      message: "Login successful",
      role: "user",
      isAdmin: false,
      expiresIn: expect.any(Number),
    });
    expect(String(result.userId)).toBeTruthy();
    expect(result.token).toEqual(expect.any(String));
  });

  it("POST /api/auth/login accepts the password field and returns auth data", async () => {
    const payload = buildSignupPayload();
    const signup = await createSignupAccount({ payload });

    await confirmAccount({
      token: signup.verificationEmail.token,
    });

    const response = await request(app)
      .post("/api/auth/login")
      .send({
        email: "USER@example.com",
        password: payload.password,
      })
      .expect(200);

    expect(response.body).toMatchObject({
      success: true,
      message: "Login successful",
      data: {
        role: "user",
        isAdmin: false,
        token: expect.any(String),
        expiresIn: expect.any(Number),
      },
    });
    expect(response.headers["set-cookie"]).toEqual(
      expect.arrayContaining([expect.stringContaining("refreshToken=")])
    );
  });
});
