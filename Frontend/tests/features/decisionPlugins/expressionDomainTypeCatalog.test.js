import { describe, expect, it } from "vitest";

import {
  EXPRESSION_DOMAIN_TYPE_REGISTRY,
  getExpressionDomainTypeEntry,
  getExpressionDomainTypeEntryOrThrow,
  listExpressionDomainTypeEntries,
} from "../../../src/features/decisionPlugins/expressionDomains/index.js";

const EXPECTED_TYPE_KEYS = [
  "numericContinuous",
  "numericDiscrete",
  "linguisticOrdinal",
  "linguisticFuzzy",
];

describe("expression domain type catalog", () => {
  it("lists the four core entries in the expected order", () => {
    expect(listExpressionDomainTypeEntries().map((entry) => entry.key)).toEqual(
      EXPECTED_TYPE_KEYS
    );
  });

  it("registers exactly the four supported keys", () => {
    expect(Object.keys(EXPRESSION_DOMAIN_TYPE_REGISTRY)).toEqual(
      EXPECTED_TYPE_KEYS
    );
  });

  it("resolves the corresponding entry for each known key", () => {
    for (const typeKey of EXPECTED_TYPE_KEYS) {
      const entry = getExpressionDomainTypeEntry(typeKey);

      expect(entry).toBe(EXPRESSION_DOMAIN_TYPE_REGISTRY[typeKey]);
      expect(entry).toMatchObject({ key: typeKey });
    }
  });

  it("returns null for an unknown key", () => {
    expect(getExpressionDomainTypeEntry("unknown")).toBeNull();
  });

  it("throws the existing clear error for an unknown key", () => {
    expect(() => getExpressionDomainTypeEntryOrThrow("unknown")).toThrow(
      '[expressionDomains] Unsupported expression domain type key "unknown".'
    );
  });

  it("keeps the required frontend entry capabilities on each core type", () => {
    for (const entry of listExpressionDomainTypeEntries()) {
      expect(entry.CreationForm).toBeTruthy();
      expect(entry.EvaluationInput).toBeTruthy();
      expect(typeof entry.validateEvaluation).toBe("function");
    }
  });
});
