import { describe, expect, it } from "vitest";

import {
  EXPRESSION_DOMAIN_TYPE_CATALOG,
  getExpressionDomainType,
  getExpressionDomainTypeOrThrow,
  listExpressionDomainTypes,
} from "../../../src/features/expressionDomains/expressionDomainTypeCatalog.js";

const EXPECTED_TYPE_KEYS = [
  "numericContinuous",
  "numericDiscrete",
  "linguisticOrdinal",
  "linguistic2Tuple",
  "linguisticFuzzy",
];
const REGISTERED_TYPE_KEYS = [
  "numericContinuous",
  "numericDiscrete",
  "numericSaaty",
  "linguisticOrdinal",
  "linguistic2Tuple",
  "linguisticFuzzy",
];

describe("expression domain type catalog", () => {
  it("lists the five core entries in the expected order", () => {
    expect(listExpressionDomainTypes().map((entry) => entry.key)).toEqual(
      EXPECTED_TYPE_KEYS
    );
  });

  it("registers the fixed Saaty type without exposing it as user-creatable", () => {
    expect(Object.keys(EXPRESSION_DOMAIN_TYPE_CATALOG)).toEqual(
      REGISTERED_TYPE_KEYS
    );
    expect(getExpressionDomainType("numericSaaty")).toMatchObject({ key: "numericSaaty" });
    expect(listExpressionDomainTypes().some(({ key }) => key === "numericSaaty")).toBe(false);
  });

  it("resolves the corresponding entry for each known key", () => {
    for (const typeKey of EXPECTED_TYPE_KEYS) {
      const entry = getExpressionDomainType(typeKey);

      expect(entry).toBe(EXPRESSION_DOMAIN_TYPE_CATALOG[typeKey]);
      expect(entry).toMatchObject({ key: typeKey });
    }
  });

  it("returns null for an unknown key", () => {
    expect(getExpressionDomainType("unknown")).toBeNull();
  });

  it("throws the existing clear error for an unknown key", () => {
    expect(() => getExpressionDomainTypeOrThrow("unknown")).toThrow(
      '[expressionDomains] Unsupported expression domain type key "unknown".'
    );
  });

  it("keeps the required frontend entry capabilities on each core type", () => {
    for (const entry of listExpressionDomainTypes()) {
      expect(entry.CreationForm).toBeTruthy();
      expect(entry.EvaluationInput).toBeTruthy();
      expect(typeof entry.validateEvaluation).toBe("function");
    }
  });

  it("registers a validated Saaty evaluation input without a user creation form", () => {
    const entry = getExpressionDomainType("numericSaaty");
    expect(entry.EvaluationInput).toBeTruthy();
    expect(typeof entry.validateEvaluation).toBe("function");
    expect(entry.CreationForm).toBeUndefined();
    expect(listExpressionDomainTypes()).not.toContain(entry);
  });
});
