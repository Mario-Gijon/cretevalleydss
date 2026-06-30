import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  clearPendingBackendChange,
  getPendingBackendChange,
  isRecentPendingBackendChange,
  PENDING_BACKEND_CHANGE_STORAGE_KEY,
  setPendingBackendChange,
  updatePendingBackendChange,
} from "../../src/utils/pendingBackendChange.js";

describe("pendingBackendChange", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    vi.useRealTimers();
  });

  it("returns false when there is no pending backend change", () => {
    expect(getPendingBackendChange()).toBeNull();
    expect(isRecentPendingBackendChange()).toBe(false);
  });

  it("returns true for a recent pending backend change", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-01T10:00:00.000Z"));
    setPendingBackendChange({ createdAt: Date.now() - 1000, type: "apply" });

    expect(isRecentPendingBackendChange()).toBe(true);
  });

  it("returns false for an expired pending backend change", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-01T10:00:00.000Z"));
    setPendingBackendChange({ createdAt: Date.now() - 5 * 60 * 1000, type: "apply" });

    expect(isRecentPendingBackendChange()).toBe(false);
  });

  it("handles malformed storage values safely", () => {
    window.sessionStorage.setItem(PENDING_BACKEND_CHANGE_STORAGE_KEY, "{bad json");

    expect(getPendingBackendChange()).toBeNull();
    expect(isRecentPendingBackendChange()).toBe(false);
  });

  it("updates and clears the pending backend change payload", () => {
    setPendingBackendChange({ createdAt: 1, type: "apply", step: "start" });

    expect(updatePendingBackendChange({ step: "done" })).toEqual({
      createdAt: 1,
      type: "apply",
      step: "done",
    });
    expect(getPendingBackendChange()).toEqual({
      createdAt: 1,
      type: "apply",
      step: "done",
    });

    clearPendingBackendChange();

    expect(getPendingBackendChange()).toBeNull();
  });
});
