import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../src/utils/authFetch.js", async () => {
  const actual = await vi.importActual("../../src/utils/authFetch.js");

  return {
    ...actual,
    authFetch: vi.fn(),
    refreshAccessToken: vi.fn(),
    setAccessToken: vi.fn(),
    clearAccessToken: vi.fn(),
  };
});

import {
  bootstrapSession,
  fetchProtectedDataForBootstrap,
  login,
  logout,
  signup,
  updatePassword,
} from "../../src/services/auth.service.js";
import * as authFetchModule from "../../src/utils/authFetch.js";

describe("auth.service", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  it("signup sends a public json request", async () => {
    fetch.mockResolvedValue(
      new Response(JSON.stringify({ success: true, message: "Signed up." }), {
        status: 201,
      })
    );

    const response = await signup({ email: "alice@example.com", password: "secret" });

    expect(response).toEqual({ success: true, message: "Signed up." });
    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:4010/auth/signup",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "alice@example.com", password: "secret" }),
      })
    );
  });

  it("login stores the token returned by the backend", async () => {
    fetch.mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          data: { token: "jwt-token" },
        }),
        { status: 200 }
      )
    );

    const response = await login({ email: "alice@example.com", password: "secret" });

    expect(response.success).toBe(true);
    expect(authFetchModule.setAccessToken).toHaveBeenCalledWith("jwt-token");
    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:4010/auth/login",
      expect.objectContaining({ credentials: "include" })
    );
  });

  it("login falls back to refresh when the payload does not include a token", async () => {
    fetch.mockResolvedValue(
      new Response(JSON.stringify({ success: true, data: {} }), { status: 200 })
    );

    await login({ email: "alice@example.com", password: "secret" });

    expect(authFetchModule.refreshAccessToken).toHaveBeenCalledTimes(1);
  });

  it("bootstrapSession returns whether refresh produced a token", async () => {
    authFetchModule.refreshAccessToken.mockResolvedValueOnce("refreshed-token");
    await expect(bootstrapSession()).resolves.toBe(true);

    authFetchModule.refreshAccessToken.mockResolvedValueOnce(null);
    await expect(bootstrapSession()).resolves.toBe(false);
  });

  it("fetchProtectedDataForBootstrap returns a normalized unauthorized response", async () => {
    authFetchModule.authFetch.mockResolvedValue(
      new Response(
        JSON.stringify({
          success: false,
          message: "Missing token",
          error: { code: "NO_TOKEN" },
        }),
        { status: 401 }
      )
    );

    await expect(fetchProtectedDataForBootstrap()).resolves.toEqual({
      success: false,
      message: "Missing token",
      data: null,
      error: {
        code: "NO_TOKEN",
        field: null,
        details: null,
      },
      status: 401,
    });
  });

  it("updatePassword returns a network error envelope when authFetch fails", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    authFetchModule.authFetch.mockRejectedValue(new Error("boom"));

    await expect(updatePassword("new-secret", "new-secret")).resolves.toEqual({
      success: false,
      message: "Error updating password.",
      data: null,
      error: {
        code: "NETWORK_ERROR",
        field: null,
        details: null,
      },
      status: 0,
    });

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Error updating password:",
      expect.any(Error)
    );
  });

  it("logout clears the access token after a successful request", async () => {
    fetch.mockResolvedValue(
      new Response(JSON.stringify({ success: true, message: "Logged out." }), {
        status: 200,
      })
    );

    const response = await logout();

    expect(response).toEqual({ success: true, message: "Logged out." });
    expect(authFetchModule.clearAccessToken).toHaveBeenCalledTimes(1);
  });
});
