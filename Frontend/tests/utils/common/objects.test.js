import { describe, expect, it } from "vitest";

import { isPlainObject } from "../../../src/utils/common/objects.js";

describe("isPlainObject", () => {
  it("accepts objects with Object or null prototypes only", () => {
    expect(isPlainObject({})).toBe(true);
    expect(isPlainObject(Object.create(null))).toBe(true);
    expect(isPlainObject([])).toBe(false);
    expect(isPlainObject(null)).toBe(false);
    expect(isPlainObject(new Date())).toBe(false);
  });
});
