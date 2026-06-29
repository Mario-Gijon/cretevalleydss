import mongoose from "mongoose";
import { describe, expect, it } from "vitest";

import { normalizeCreateIssueInput } from "../../../modules/issues/creation/normalizeCreateIssueInput.js";

const createValidIssueInfo = (overrides = {}) => ({
  issueName: "  New issue  ",
  issueDescription: "  Description  ",
  selectedModelId: new mongoose.Types.ObjectId().toString(),
  alternatives: ["  Option A  ", "Option B", "Option A"],
  addedExperts: ["  Expert1@example.com  ", "expert2@example.com"],
  criteria: [
    {
      name: "  Main criterion  ",
      type: "group",
      children: [
        {
          name: "  Leaf criterion  ",
          type: "numeric",
          children: [],
        },
      ],
    },
  ],
  expressionDomainConfig: {
    mode: "global",
    globalDomainId: "  global-domain-id  ",
  },
  ...overrides,
});

describe("normalizeCreateIssueInput", () => {
  it("accepts a minimal valid issue input", () => {
    const result = normalizeCreateIssueInput(createValidIssueInfo());

    expect(result.issueName).toBe("New issue");
    expect(result.issueDescription).toBe("Description");
    expect(result.selectedModelId).toEqual(expect.any(String));
    expect(result.uniqueAlternativeNames).toEqual(["Option A", "Option B"]);
    expect(result.uniqueExpertEmails).toEqual([
      "expert1@example.com",
      "expert2@example.com",
    ]);
    expect(result.expressionDomainConfig).toEqual({
      mode: "global",
      globalDomainId: "global-domain-id",
    });
  });

  it("trims and normalizes issue name, alternatives, expert emails, and criteria names", () => {
    const result = normalizeCreateIssueInput(
      createValidIssueInfo({
        issueName: "   Roadmap issue   ",
        alternatives: ["  Alpha  ", "Beta", "Alpha", "   "],
        addedExperts: [
          "  Expert@One.com  ",
          "expert@two.com",
          "expert@two.com",
        ],
        criteria: [
          {
            name: "  Parent criterion  ",
            type: "group",
            children: [
              {
                name: "  Child criterion  ",
                type: "numeric",
                children: [],
              },
            ],
          },
        ],
      })
    );

    expect(result.issueName).toBe("Roadmap issue");
    expect(result.uniqueAlternativeNames).toEqual(["Alpha", "Beta"]);
    expect(result.uniqueExpertEmails).toEqual([
      "expert@one.com",
      "expert@two.com",
    ]);
    expect(result.criteria[0].name).toBe("Parent criterion");
    expect(result.criteria[0].children[0].name).toBe("Child criterion");
  });

  it("rejects missing issueInfo", () => {
    expect(() => normalizeCreateIssueInput(undefined)).toThrow(/issueInfo is required/);
  });

  it("rejects fewer than two valid alternatives", () => {
    expect(() =>
      normalizeCreateIssueInput(
        createValidIssueInfo({
          alternatives: ["  Only option  ", "   "],
        })
      )
    ).toThrow(/Must be at least two valid alternatives/);
  });

  it("rejects no experts", () => {
    expect(() =>
      normalizeCreateIssueInput(
        createValidIssueInfo({
          addedExperts: [],
        })
      )
    ).toThrow(/Must be at least one expert/);
  });

  it("rejects invalid expressionDomainConfig", () => {
    expect(() =>
      normalizeCreateIssueInput(
        createValidIssueInfo({
          expressionDomainConfig: {
            mode: "byCriterion",
            domainsByCriterion: null,
          },
        })
      )
    ).toThrow(/expressionDomainConfig\.domainsByCriterion is required/);
  });
});
