import mongoose from "mongoose";
import { describe, expect, it } from "vitest";

import { ExpressionDomain } from "../../models/ExpressionDomain.js";
import { User } from "../../models/Users.js";
import { validateExpressionDomainEvaluationOrThrow } from "../../modules/expressionDomains/validateExpressionDomainEvaluation.js";
import { linguisticFuzzy } from "../../modules/decisionPlugins/expressionDomains/types/linguisticFuzzy/index.js";
import { linguisticOrdinal } from "../../modules/decisionPlugins/expressionDomains/types/linguisticOrdinal/index.js";
import { numericContinuous } from "../../modules/decisionPlugins/expressionDomains/types/numericContinuous/index.js";
import { numericDiscrete } from "../../modules/decisionPlugins/expressionDomains/types/numericDiscrete/index.js";
import { createUserExpressionDomain } from "../../modules/expressionDomains/createExpressionDomain.js";
import { normalizeNewExpressionDomainPayload } from "../../modules/expressionDomains/normalizeExpressionDomainPayload.js";
import { removeUserExpressionDomain } from "../../modules/expressionDomains/removeExpressionDomain.js";
import { setupMongoDbTestHooks } from "../setup/database.js";

setupMongoDbTestHooks();

const createUser = async (overrides = {}) => {
  const suffix = new mongoose.Types.ObjectId().toString().slice(-8);

  return User.create({
    name: "Domain Owner",
    university: "Testing University",
    email: `domain-owner-${suffix}@example.com`,
    password: "Abc123",
    accountConfirm: true,
    ...overrides,
  });
};

describe("expression domains", () => {
  it("normalizeNewExpressionDomainPayload accepts a valid numeric domain", () => {
    const result = normalizeNewExpressionDomainPayload({
      name: " Numeric domain ",
      type: "numeric",
      numericRange: {
        min: 0,
        max: 10,
        step: 0.5,
      },
    });

    expect(result).toEqual({
      name: "Numeric domain",
      type: "numeric",
      numericRange: {
        min: 0,
        max: 10,
        step: 0.5,
      },
      membershipFunction: null,
      valueCount: null,
      valuesMode: null,
      linguisticLabels: [],
    });
  });

  it("normalizeNewExpressionDomainPayload rejects numeric domains with min >= max", () => {
    expect(() =>
      normalizeNewExpressionDomainPayload({
        name: "Broken numeric domain",
        type: "numeric",
        numericRange: {
          min: 5,
          max: 5,
        },
      })
    ).toThrow(/min must be < max/);
  });

  it("normalizeNewExpressionDomainPayload accepts a valid linguistic domain", () => {
    const result = normalizeNewExpressionDomainPayload({
      name: " Linguistic domain ",
      type: "linguistic",
      membershipFunction: "triangular",
      valuesMode: "custom",
      linguisticLabels: [
        { label: "Low", values: [0, 0, 0.4] },
        { label: "Medium", values: [0.2, 0.5, 0.8] },
        { label: "High", values: [0.6, 1, 1] },
      ],
    });

    expect(result).toEqual({
      name: "Linguistic domain",
      type: "linguistic",
      numericRange: null,
      membershipFunction: "triangular",
      valueCount: 3,
      valuesMode: "custom",
      linguisticLabels: [
        { label: "Low", values: [0, 0, 0.4] },
        { label: "Medium", values: [0.2, 0.5, 0.8] },
        { label: "High", values: [0.6, 1, 1] },
      ],
    });
  });

  it("normalizeNewExpressionDomainPayload rejects duplicated linguistic labels", () => {
    expect(() =>
      normalizeNewExpressionDomainPayload({
        name: "Duplicated labels",
        type: "linguistic",
        membershipFunction: "triangular",
        linguisticLabels: [
          { label: "Low", values: [0, 0, 0.4] },
          { label: "Low", values: [0.2, 0.5, 0.8] },
        ],
      })
    ).toThrow(/Duplicated label/);
  });

  it("normalizeNewExpressionDomainPayload rejects linguistic values outside [0, 1]", () => {
    expect(() =>
      normalizeNewExpressionDomainPayload({
        name: "Invalid values",
        type: "linguistic",
        membershipFunction: "triangular",
        linguisticLabels: [
          { label: "Low", values: [0, 0, 1.2] },
        ],
      })
    ).toThrow(/values must be in range \[0, 1\]/);
  });

  it("createUserExpressionDomain persists a user-owned domain", async () => {
    const user = await createUser();

    const domain = await createUserExpressionDomain({
      userId: user._id,
      payload: {
        name: "Personal numeric",
        type: "numeric",
        numericRange: {
          min: 1,
          max: 9,
          step: 1,
        },
      },
    });

    const storedDomain = await ExpressionDomain.findById(domain._id).lean();

    expect(storedDomain).toMatchObject({
      name: "Personal numeric",
      type: "numeric",
      isGlobal: false,
      user: user._id,
      numericRange: {
        min: 1,
        max: 9,
        step: 1,
      },
    });
  });

  it("removeUserExpressionDomain deletes a user-owned domain", async () => {
    const user = await createUser();
    const domain = await createUserExpressionDomain({
      userId: user._id,
      payload: {
        name: "Delete me",
        type: "numeric",
        numericRange: {
          min: 0,
          max: 1,
        },
      },
    });

    const result = await removeUserExpressionDomain({
      domainId: domain._id,
      userId: user._id,
    });

    expect(result).toEqual({
      domainName: "Delete me",
    });
    expect(await ExpressionDomain.findById(domain._id)).toBeNull();
  });

  it("removeUserExpressionDomain rejects deleting a global domain", async () => {
    const user = await createUser();
    const domain = await ExpressionDomain.create({
      name: "Global numeric",
      type: "numeric",
      isGlobal: true,
      user: null,
      numericRange: {
        min: 0,
        max: 10,
      },
    });

    await expect(
      removeUserExpressionDomain({
        domainId: domain._id,
        userId: user._id,
      })
    ).rejects.toMatchObject({
      statusCode: 403,
      message: "Global domains are predefined and cannot be modified.",
    });
  });

  it("removeUserExpressionDomain rejects deleting another user's domain", async () => {
    const owner = await createUser();
    const otherUser = await createUser();
    const domain = await createUserExpressionDomain({
      userId: owner._id,
      payload: {
        name: "Owner only",
        type: "numeric",
        numericRange: {
          min: 2,
          max: 8,
        },
      },
    });

    await expect(
      removeUserExpressionDomain({
        domainId: domain._id,
        userId: otherUser._id,
      })
    ).rejects.toMatchObject({
      statusCode: 403,
      message: "Not authorized",
    });
  });

  it("core expression domain validateEvaluation signatures no longer include field", () => {
    expect(numericContinuous.validateEvaluation.toString()).toContain(
      "validateEvaluation({ value, expressionDomain } = {})"
    );
    expect(numericDiscrete.validateEvaluation.toString()).toContain(
      "validateEvaluation({ value, expressionDomain } = {})"
    );
    expect(linguisticOrdinal.validateEvaluation.toString()).toContain(
      "validateEvaluation({ value, expressionDomain } = {})"
    );
    expect(linguisticFuzzy.validateEvaluation.toString()).toContain(
      "validateEvaluation({ value, expressionDomain } = {})"
    );
  });

  it("numeric expression domains still reject invalid evaluation values", () => {
    expect(() =>
      numericContinuous.validateEvaluation({
        value: "bad",
        expressionDomain: {
          definition: { min: 0, max: 1 },
        },
      })
    ).toThrow("Value must be a finite number.");

    expect(() =>
      numericContinuous.validateEvaluation({
        value: 2,
        expressionDomain: {
          definition: { min: 0, max: 1 },
        },
      })
    ).toThrow("Value must be between 0 and 1.");

    expect(() =>
      numericDiscrete.validateEvaluation({
        value: 2,
        expressionDomain: {
          definition: { min: 0, max: 10, step: 0 },
        },
      })
    ).toThrow("Expression domain step must be greater than 0.");

    expect(() =>
      numericDiscrete.validateEvaluation({
        value: 2.5,
        expressionDomain: {
          definition: { min: 0, max: 10, step: 2 },
        },
      })
    ).toThrow("Value must align with the configured discrete step.");
  });

  it("linguistic expression domains still reject values outside configured labels", () => {
    expect(() =>
      linguisticOrdinal.validateEvaluation({
        value: { labelKey: "missing" },
        expressionDomain: {
          definition: {
            labels: [
              { key: "low", label: "Low" },
              { key: "high", label: "High" },
            ],
          },
        },
      })
    ).toThrow("Value must match one of the configured labels.");

    expect(() =>
      linguisticFuzzy.validateEvaluation({
        value: { labelKey: "missing" },
        expressionDomain: {
          definition: {
            labels: [
              { key: "low", label: "Low", values: [0, 0, 1] },
              { key: "high", label: "High", values: [0, 1, 1] },
            ],
          },
        },
      })
    ).toThrow("Value must match one of the configured fuzzy labels.");
  });

  it("validateExpressionDomainEvaluationOrThrow ignores caller field context", () => {
    expect(() =>
      validateExpressionDomainEvaluationOrThrow({
        value: 3,
        expressionDomain: {
          typeKey: "numericContinuous",
          definition: { min: 0, max: 1 },
        },
        field: "payload.cells[0][0].value",
      })
    ).toThrow("Value must be between 0 and 1.");
  });
});
