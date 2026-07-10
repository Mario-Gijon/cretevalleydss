import { describe, expect, it } from "vitest";

import {
  EXPRESSION_DOMAIN_TYPE_REGISTRY,
  getExpressionDomainTypeOrThrow,
} from "../../modules/decisionPlugins/expressionDomains/index.js";

const EXPECTED_TYPE_KEYS = [
  "numericContinuous",
  "numericDiscrete",
  "linguisticOrdinal",
  "linguisticFuzzy",
];

describe("expression domain type catalog", () => {
  it("registers exactly the four supported keys", () => {
    expect(Object.keys(EXPRESSION_DOMAIN_TYPE_REGISTRY)).toEqual(
      EXPECTED_TYPE_KEYS
    );
  });

  it("resolves each supported type through getExpressionDomainTypeOrThrow", () => {
    for (const typeKey of EXPECTED_TYPE_KEYS) {
      const entry = getExpressionDomainTypeOrThrow(typeKey);

      expect(entry).toBe(EXPRESSION_DOMAIN_TYPE_REGISTRY[typeKey]);
      expect(entry).toMatchObject({ key: typeKey });
    }
  });

  it("keeps validateCreation and validateEvaluation on each core type", () => {
    for (const typeKey of EXPECTED_TYPE_KEYS) {
      const entry = getExpressionDomainTypeOrThrow(typeKey);

      expect(typeof entry.validateCreation).toBe("function");
      expect(typeof entry.validateEvaluation).toBe("function");
    }
  });

  it("throws the existing BadRequest details for an unknown key", () => {
    try {
      getExpressionDomainTypeOrThrow("unknown");
      throw new Error("Expected getExpressionDomainTypeOrThrow to throw.");
    } catch (error) {
      expect(error.message).toBe("Unsupported expression domain type: unknown");
      expect(error.code).toBe("UNSUPPORTED_EXPRESSION_DOMAIN_TYPE");
      expect(error.field).toBe("typeKey");
    }
  });
});
