import { describe, expect, it } from "vitest";

import {
  buildModelApiResponseEvidence,
  buildModelApiTransportFailureEvidence,
} from "../../../services/modelApi/modelResponse.js";

describe("Model API response evidence", () => {
  it("records response details while excluding sensitive headers", () => {
    expect(
      buildModelApiResponseEvidence({
        status: 202,
        headers: {
          authorization: "Bearer secret",
          cookie: "session=secret",
          "set-cookie": "session=secret",
          "x-request-id": "request-1",
        },
        data: { success: true, data: { accepted: true } },
      })
    ).toEqual({
      httpStatus: 202,
      headers: { "x-request-id": "request-1" },
      rawBody: { success: true, data: { accepted: true } },
      unwrappedBody: null,
    });
  });

  it("preserves available upstream failure evidence and serialized error fields", () => {
    const error = Object.assign(new Error("upstream unavailable"), {
      code: "UPSTREAM_UNAVAILABLE",
      field: "model",
      details: { retryable: true },
      response: {
        status: 503,
        headers: { cookie: "secret", "x-request-id": "request-2" },
        data: { message: "Unavailable" },
      },
    });

    expect(buildModelApiTransportFailureEvidence(error)).toEqual({
      response: {
        httpStatus: 503,
        headers: { "x-request-id": "request-2" },
        rawBody: { message: "Unavailable" },
        unwrappedBody: null,
      },
      error: {
        name: "Error",
        message: "upstream unavailable",
        code: "UPSTREAM_UNAVAILABLE",
        status: 503,
        field: "model",
        details: { retryable: true },
        responseBody: { message: "Unavailable" },
      },
    });
  });
});
