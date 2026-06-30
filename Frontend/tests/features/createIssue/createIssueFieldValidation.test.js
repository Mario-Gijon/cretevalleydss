import { describe, expect, it, vi } from "vitest";

import {
  validateIssueDescription,
  validateIssueName,
} from "../../../src/features/createIssue/logic/createIssueFieldValidation.js";

describe("createIssueFieldValidation", () => {
  it("accepts a valid issue name", () => {
    const setIssueNameError = vi.fn();

    const valid = validateIssueName("Budget Planning", setIssueNameError);

    expect(valid).toBe(true);
    expect(setIssueNameError).toHaveBeenCalledWith(false);
  });

  it("rejects an empty issue name", () => {
    const setIssueNameError = vi.fn();

    const valid = validateIssueName("", setIssueNameError);

    expect(valid).toBe(false);
    expect(setIssueNameError).toHaveBeenCalledWith("Cannot be empty");
  });

  it("rejects a too-short issue name", () => {
    const setIssueNameError = vi.fn();

    const valid = validateIssueName("Hi", setIssueNameError);

    expect(valid).toBe(false);
    expect(setIssueNameError).toHaveBeenCalledWith("Must contain min 3 characters");
  });

  it("rejects an issue name without letters", () => {
    const setIssueNameError = vi.fn();

    const valid = validateIssueName("12345", setIssueNameError);

    expect(valid).toBe(false);
    expect(setIssueNameError).toHaveBeenCalledWith("Must contain at least one letter");
  });

  it("accepts a valid issue description", () => {
    const setIssueDescriptionError = vi.fn();

    const valid = validateIssueDescription(
      "Clear summary with enough letters",
      setIssueDescriptionError
    );

    expect(valid).toBe(true);
    expect(setIssueDescriptionError).toHaveBeenCalledWith(false);
  });

  it("rejects an empty issue description", () => {
    const setIssueDescriptionError = vi.fn();

    const valid = validateIssueDescription("", setIssueDescriptionError);

    expect(valid).toBe(false);
    expect(setIssueDescriptionError).toHaveBeenCalledWith("Cannot be empty");
  });
});
