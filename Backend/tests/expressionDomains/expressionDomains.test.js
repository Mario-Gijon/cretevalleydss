import mongoose from "mongoose";
import { describe, expect, it } from "vitest";

import { ExpressionDomain } from "../../models/ExpressionDomain.js";
import { IssueExpressionDomain } from "../../models/IssueExpressionDomains.js";
import { Issue } from "../../models/Issues.js";
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
      typeKey: "numericContinuous",
      definition: {
        min: 0,
        max: 10,
      },
    });

    expect(result).toEqual({
      name: "Numeric domain",
      typeKey: "numericContinuous",
      family: "numeric",
      definition: {
        min: 0,
        max: 10,
        step: null,
      },
    });
  });

  it("normalizeNewExpressionDomainPayload rejects numeric domains with min >= max", () => {
    expect(() =>
      normalizeNewExpressionDomainPayload({
        name: "Broken numeric domain",
        typeKey: "numericContinuous",
        definition: {
          min: 5,
          max: 5,
        },
      })
    ).toThrow(/definition\.min must be less than definition\.max/i);
  });

  it("normalizeNewExpressionDomainPayload accepts a valid linguistic domain", () => {
    const result = normalizeNewExpressionDomainPayload({
      name: " Linguistic domain ",
      typeKey: "linguisticFuzzy",
      definition: {
        membershipFunction: "triangular",
        labels: [
          { label: "Low", values: [0, 0, 0.4] },
          { label: "Medium", values: [0.2, 0.5, 0.8] },
          { label: "High", values: [0.6, 1, 1] },
        ],
      },
    });

    expect(result).toEqual({
      name: "Linguistic domain",
      typeKey: "linguisticFuzzy",
      family: "linguistic",
      definition: {
        membershipFunction: "triangular",
        labelCount: 3,
        labels: [
          { key: "low", label: "Low", values: [0, 0, 0.4], index: 0 },
          { key: "medium", label: "Medium", values: [0.2, 0.5, 0.8], index: 1 },
          { key: "high", label: "High", values: [0.6, 1, 1], index: 2 },
        ],
      },
    });
  });

  it("normalizeNewExpressionDomainPayload rejects duplicated linguistic labels", () => {
    expect(() =>
      normalizeNewExpressionDomainPayload({
        name: "Duplicated labels",
        typeKey: "linguisticFuzzy",
        definition: {
          membershipFunction: "triangular",
          labels: [
            { label: "Low", values: [0, 0, 0.4] },
            { label: "Low", values: [0.2, 0.5, 0.8] },
          ],
        },
      })
    ).toThrow(/Fuzzy label keys must be unique/i);
  });

  it("normalizeNewExpressionDomainPayload rejects linguistic values outside [0, 1]", () => {
    expect(() =>
      normalizeNewExpressionDomainPayload({
        name: "Invalid values",
        typeKey: "linguisticFuzzy",
        definition: {
          membershipFunction: "triangular",
          labels: [
            { label: "Low", values: [0, 0, 1.2] },
          ],
        },
      })
    ).toThrow(/must be between 0 and 1/i);
  });

  it("createUserExpressionDomain persists a user-owned domain", async () => {
    const user = await createUser();

    const domain = await createUserExpressionDomain({
      userId: user._id,
      payload: {
        name: "Personal numeric",
        typeKey: "numericDiscrete",
        definition: {
          min: 1,
          max: 9,
          step: 1,
        },
      },
    });

    const storedDomain = await ExpressionDomain.findById(domain._id).lean();

    expect(storedDomain).toMatchObject({
      name: "Personal numeric",
      typeKey: "numericDiscrete",
      family: "numeric",
      isGlobal: false,
      user: user._id,
      definition: {
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
        typeKey: "numericContinuous",
        definition: {
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

  it("removeUserExpressionDomain does not delete issue expression domain snapshots", async () => {
    const user = await createUser();
    const domain = await createUserExpressionDomain({
      userId: user._id,
      payload: {
        name: "Snapshot source",
        typeKey: "numericDiscrete",
        definition: {
          min: 0,
          max: 5,
          step: 1,
        },
      },
    });
    const issue = await Issue.create({
      ownerId: user._id,
      createdBy: user._id,
      model: new mongoose.Types.ObjectId(),
      apiModelKey: "test-model",
      apiEndpoint: {
        method: "POST",
        path: "/execute",
      },
      name: "Snapshot retention issue",
      evaluationStructureKey: "alternativeCriteriaMatrix",
      description: "Expression domain snapshot retention",
      active: false,
      currentStage: "finished",
    });
    const snapshot = await IssueExpressionDomain.create({
      issue: issue._id,
      sourceDomain: domain._id,
      name: domain.name,
      typeKey: domain.typeKey,
      family: domain.family,
      definition: domain.definition,
    });

    await removeUserExpressionDomain({
      domainId: domain._id,
      userId: user._id,
    });

    expect(await ExpressionDomain.findById(domain._id)).toBeNull();
    expect(await IssueExpressionDomain.findById(snapshot._id).lean()).toMatchObject({
      _id: snapshot._id,
      sourceDomain: domain._id,
      issue: issue._id,
      typeKey: domain.typeKey,
    });
  });

  it("removeUserExpressionDomain rejects deleting a global domain", async () => {
    const user = await createUser();
    const domain = await ExpressionDomain.create({
      name: "Global numeric",
      isGlobal: true,
      user: null,
      typeKey: "numericContinuous",
      family: "numeric",
      definition: {
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
        typeKey: "numericContinuous",
        definition: {
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
