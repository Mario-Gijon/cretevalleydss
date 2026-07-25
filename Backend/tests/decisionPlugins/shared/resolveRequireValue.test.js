import { describe, expect, it } from "vitest";

import { resolveRequireValue } from "../../../modules/decisionPlugins/evaluations/shared/resolveRequireValue.js";

describe("resolveRequireValue", () => {
  it("returns false for draft mode", () => {
    expect(resolveRequireValue("draft")).toBe(false);
  });

  it("returns true for submit mode", () => {
    expect(resolveRequireValue("submit")).toBe(true);
  });

  it("throws a Bad Request error for an unknown mode", () => {
    let thrownError;

    try {
      resolveRequireValue("other");
    } catch (error) {
      thrownError = error;
    }

    expect(thrownError).toMatchObject({
      code: "BAD_REQUEST",
      field: "mode",
      statusCode: 400,
    });
  });
});
