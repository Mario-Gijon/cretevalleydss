import {
  authFetch,
  clearAccessToken,
  getAccessToken,
  setAccessToken,
} from "../../src/utils/authFetch.js";

describe("authFetch", () => {
  beforeEach(() => {
    clearAccessToken();
  });

  it("adds the bearer token to authenticated requests", async () => {
    setAccessToken("token-123");
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: true }), { status: 200 })
    );
    vi.stubGlobal("fetch", fetchMock);

    await authFetch("http://localhost:4010/issues/active");

    const [, options] = fetchMock.mock.calls[0];
    expect(options.credentials).toBe("include");
    expect(options.headers.get("Authorization")).toBe("Bearer token-123");
  });

  it("refreshes the token on expiration and retries the original request", async () => {
    setAccessToken("expired-token");
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: false,
            message: "Token expired",
            error: { code: "TOKEN_EXPIRED" },
          }),
          { status: 401 }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: true,
            data: { token: "fresh-token" },
          }),
          { status: 200 }
        )
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ success: true, data: { ok: true } }), {
          status: 200,
        })
      );
    vi.stubGlobal("fetch", fetchMock);

    const response = await authFetch("http://localhost:4010/issues/active");

    expect(response.status).toBe(200);
    expect(getAccessToken()).toBe("fresh-token");
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[1][0]).toBe("http://localhost:4010/auth/refresh");
    expect(fetchMock.mock.calls[2][1].headers.get("Authorization")).toBe(
      "Bearer fresh-token"
    );
  });

  it("does not refresh for unrelated 401 responses", async () => {
    setAccessToken("token-123");
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          success: false,
          message: "Access denied",
          error: { code: "FORBIDDEN_ACTION" },
        }),
        { status: 401 }
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await authFetch("http://localhost:4010/issues/active");

    expect(response.status).toBe(401);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("deduplicates concurrent refresh attempts", async () => {
    setAccessToken("expired-token");
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: false,
            message: "Token expired",
            error: { code: "TOKEN_EXPIRED" },
          }),
          { status: 401 }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: false,
            message: "Token expired",
            error: { code: "TOKEN_EXPIRED" },
          }),
          { status: 401 }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: true,
            data: { token: "fresh-token" },
          }),
          { status: 200 }
        )
      )
      .mockResolvedValue(
        new Response(JSON.stringify({ success: true }), { status: 200 })
      );
    vi.stubGlobal("fetch", fetchMock);

    await Promise.all([
      authFetch("http://localhost:4010/issues/active"),
      authFetch("http://localhost:4010/issues/finished"),
    ]);

    const refreshCalls = fetchMock.mock.calls.filter(
      ([url]) => url === "http://localhost:4010/auth/refresh"
    );
    expect(refreshCalls).toHaveLength(1);
  });
});
