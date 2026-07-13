import mongoose from "mongoose";
import { describe, expect, it } from "vitest";

import { normalizeCreateIssueInput } from "../../../modules/issues/creation/normalizeCreateIssueInput.js";

const createValidIssueInfo = (overrides = {}) => ({
  issueName: "  New issue  ",
  issueDescription: "  Description  ",
  selectedModelId: new mongoose.Types.ObjectId().toString(),
  alternatives: [
    { name: "  Option A  ", description: "  First option\r\nDetails  " },
    { name: "Option B", description: "" },
    { name: "Option A", description: "Duplicate is ignored" },
  ],
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
    expect(result.normalizedAlternatives).toEqual([
      { name: "Option A", description: "First option\nDetails" },
      { name: "Option B", description: null },
    ]);
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
        alternatives: [
          { name: "  Alpha  ", description: "  Alpha description  " },
          { name: "Beta" },
          { name: "Alpha", description: "Duplicate" },
        ],
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
    expect(result.normalizedAlternatives).toEqual([
      { name: "Alpha", description: "Alpha description" },
      { name: "Beta", description: null },
    ]);
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
          alternatives: [{ name: "  Only option  " }, { name: "Only option" }],
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

  it("rejects legacy string alternatives and invalid metadata", () => {
    expect(() =>
      normalizeCreateIssueInput(
        createValidIssueInfo({ alternatives: ["Option A", "Option B"] })
      )
    ).toThrow(/Each alternative must be an object/);

    expect(() =>
      normalizeCreateIssueInput(
        createValidIssueInfo({
          alternatives: [
            { name: "Option A", description: "a".repeat(501) },
            { name: "Option B" },
          ],
        })
      )
    ).toThrow(/alternatives\[0\]\.description/);
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
