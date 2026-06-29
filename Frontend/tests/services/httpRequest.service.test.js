import { describe, expect, it, vi } from "vitest";

import {
  buildNetworkErrorResponse,
  buildQuery,
  normalizeApiResponse,
  requestJson,
  safeJson,
} from "../../src/services/httpRequest.service.js";

describe("httpRequest.service", () => {
  it("safeJson returns null for non-json payloads", async () => {
    const response = new Response("not-json", { status: 200 });

    await expect(safeJson(response)).resolves.toBeNull();
  });

  it("buildQuery skips empty values and serializes valid ones", () => {
    expect(
      buildQuery({
        page: 2,
        search: "  issue  ",
        empty: "   ",
        missing: null,
        ignored: undefined,
        archived: false,
      })
    ).toBe("?page=2&search=++issue++&archived=false");
  });

  it("normalizeApiResponse derives fallback error metadata for failed requests", () => {
    const response = new Response(null, { status: 404, statusText: "Not Found" });

    expect(normalizeApiResponse(null, response, "Fallback message.")).toEqual({
      success: false,
      message: "Fallback message.",
      data: null,
      error: {
        code: "NOT_FOUND",
        field: null,
        details: null,
      },
      status: 404,
    });
  });

  it("requestJson returns normalized payloads from the fetcher", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          message: "OK",
          data: { value: 42 },
        }),
        { status: 200 }
      )
    );

    await expect(
      requestJson("/api/test", { method: "GET" }, { fetcher })
    ).resolves.toEqual({
      success: true,
      message: "OK",
      data: { value: 42 },
      error: null,
      status: 200,
    });
  });

  it("requestJson returns a network error envelope when fetch fails", async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error("socket hang up"));
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(
      requestJson("/api/test", { method: "GET" }, { fetcher, fallbackMessage: "No network." })
    ).resolves.toEqual(buildNetworkErrorResponse("No network."));

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Request error:",
      expect.any(Error)
    );
  });
});
