import { describe, expect, it } from "vitest";

import { isPlainObject } from "../../../utils/common/objects.js";

describe("isPlainObject", () => {
  it("accepts objects with Object or null prototypes only", () => {
    expect(isPlainObject({})).toBe(true);
    expect(isPlainObject(Object.create(null))).toBe(true);
    expect(isPlainObject([])).toBe(false);
    expect(isPlainObject(null)).toBe(false);
    expect(isPlainObject(new Date())).toBe(false);
    expect(isPlainObject(new Map())).toBe(false);
    expect(isPlainObject(new Set())).toBe(false);
    expect(isPlainObject(new (class Example {})())).toBe(false);
    expect(isPlainObject("object")).toBe(false);
    expect(isPlainObject(42)).toBe(false);
  });
});
