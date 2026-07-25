import { describe, expect, it } from "vitest";

import {
  buildEmptyExpressionDomainEvaluationValue,
  normalizeExpressionDomainEvaluationValueOrThrow,
} from "../../../modules/decisionPlugins/evaluations/shared/expressionDomainEvaluationPayload.js";

describe("expressionDomainEvaluationPayload", () => {
  const numericContinuousDomain = {
    typeKey: "numericContinuous",
    definition: {
      min: 0,
      max: 10,
    },
  };

  it("builds an empty evaluation value with the expected expressionDomain", () => {
    expect(
      buildEmptyExpressionDomainEvaluationValue(numericContinuousDomain)
    ).toEqual({
      value: "",
      expressionDomain: numericContinuousDomain,
    });
  });

  it("allows empty draft values and preserves the expected expressionDomain", () => {
    expect(
      normalizeExpressionDomainEvaluationValueOrThrow({
        cell: { value: "" },
        requireValue: false,
        field: "payload",
        expectedExpressionDomain: numericContinuousDomain,
        emptyValueMessage: "All cells must include a value for submit",
        invalidValueMessage: "Cell must be an object",
      })
    ).toEqual({
      value: "",
      expressionDomain: numericContinuousDomain,
    });
  });

  it("rejects empty submit values with the supplied message", () => {
    expect(() =>
      normalizeExpressionDomainEvaluationValueOrThrow({
        cell: { value: "" },
        requireValue: true,
        field: "payload",
        expectedExpressionDomain: numericContinuousDomain,
        emptyValueMessage: "All cells must include a value for submit",
        invalidValueMessage: "Cell must be an object",
      })
    ).toThrow(/All cells must include a value for submit/);
  });

  it("rejects non-object cells with the supplied message", () => {
    expect(() =>
      normalizeExpressionDomainEvaluationValueOrThrow({
        cell: 3,
        requireValue: false,
        field: "payload",
        expectedExpressionDomain: numericContinuousDomain,
        emptyValueMessage: "All comparisons must include a value for submit",
        invalidValueMessage: "Comparison cell must be an object",
      })
    ).toThrow(/Comparison cell must be an object/);
  });

  it("validates non-empty values against the expected expressionDomain", () => {
    expect(
      normalizeExpressionDomainEvaluationValueOrThrow({
        cell: {
          value: 8,
          expressionDomain: {
            typeKey: "numericContinuous",
            definition: {
              min: -100,
              max: 100,
            },
          },
        },
        requireValue: true,
        field: "payload",
        expectedExpressionDomain: numericContinuousDomain,
        emptyValueMessage: "All comparisons must include a value for submit",
        invalidValueMessage: "Comparison cell must be an object",
      })
    ).toEqual({
      value: 8,
      expressionDomain: numericContinuousDomain,
    });

    expect(() =>
      normalizeExpressionDomainEvaluationValueOrThrow({
        cell: {
          value: 12,
          expressionDomain: {
            typeKey: "numericContinuous",
            definition: {
              min: -100,
              max: 100,
            },
          },
        },
        requireValue: true,
        field: "payload",
        expectedExpressionDomain: numericContinuousDomain,
        emptyValueMessage: "All comparisons must include a value for submit",
        invalidValueMessage: "Comparison cell must be an object",
      })
    ).toThrow(/Value must be between 0 and 10/);
  });

});
