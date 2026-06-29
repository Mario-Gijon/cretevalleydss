import mongoose from "mongoose";
import { describe, expect, it } from "vitest";

import { loadCreateIssueActorsAndModel } from "../../modules/issues/creation/loadCreateIssueData.js";
import { validateIssueModelRuntimeConfigOrThrow } from "../../modules/issues/creation/validateIssueModelRuntime.js";
import {
  buildCreateIssueInfo,
  createConfirmedUser,
  createIssueModel,
} from "../setup/fixtures.js";
import { setupMongoDbTestHooks } from "../setup/database.js";

setupMongoDbTestHooks();

const buildRuntimeModelConfig = (overrides = {}) => ({
  name: "Runtime model",
  apiModelKey: "/runtime-model/",
  apiEndpoint: {
    method: "POST",
    path: "//solve/runtime//",
  },
  evaluationStructureKey: "alternativeCriteriaMatrix",
  supportsConsensus: false,
  supportsConsensusSimulation: false,
  usesCriteriaWeights: false,
  usesExpertWeights: false,
  usesFuzzyCriteriaWeights: false,
  usesCriterionTypes: false,
  isMultiCriteria: true,
  ...overrides,
});

describe("issue model runtime configuration", () => {
  it("accepts a valid issue model runtime config", () => {
    const result = validateIssueModelRuntimeConfigOrThrow(
      buildRuntimeModelConfig()
    );

    expect(result).toEqual({
      apiModelKey: "runtime-model",
      apiEndpoint: {
        method: "POST",
        path: "/solve/runtime",
      },
      evaluationStructureKey: "alternativeCriteriaMatrix",
      supportsConsensus: false,
      supportsConsensusSimulation: false,
      usesCriteriaWeights: false,
      usesExpertWeights: false,
      usesFuzzyCriteriaWeights: false,
      usesCriterionTypes: false,
      isMultiCriteria: true,
    });
  });

  it("normalizes apiModelKey by removing leading and trailing slashes", () => {
    const result = validateIssueModelRuntimeConfigOrThrow(
      buildRuntimeModelConfig({
        apiModelKey: "///issue-model///",
      })
    );

    expect(result.apiModelKey).toBe("issue-model");
  });

  it("normalizes apiEndpoint.path into a single leading slash with no trailing slash", () => {
    const result = validateIssueModelRuntimeConfigOrThrow(
      buildRuntimeModelConfig({
        apiEndpoint: {
          method: "POST",
          path: "///nested/path///",
        },
      })
    );

    expect(result.apiEndpoint.path).toBe("/nested/path");
  });

  it("rejects missing or blank apiModelKey", () => {
    expect(() =>
      validateIssueModelRuntimeConfigOrThrow(
        buildRuntimeModelConfig({
          apiModelKey: "   ",
        })
      )
    ).toThrow(/apiModelKey must be a non-empty string/);
  });

  it("rejects missing or blank apiEndpoint.path", () => {
    expect(() =>
      validateIssueModelRuntimeConfigOrThrow(
        buildRuntimeModelConfig({
          apiEndpoint: {
            method: "POST",
            path: "   ",
          },
        })
      )
    ).toThrow(/apiEndpoint\.path must be a non-empty string/);
  });

  it("rejects invalid non-boolean runtime flags", () => {
    expect(() =>
      validateIssueModelRuntimeConfigOrThrow(
        buildRuntimeModelConfig({
          supportsConsensus: "false",
        })
      )
    ).toThrow(/supportsConsensus must be boolean/);
  });
});

describe("loadCreateIssueActorsAndModel", () => {
  it("loads owner, experts, and a valid issue model", async () => {
    const owner = await createConfirmedUser({
      email: "owner@example.com",
    });
    const expert = await createConfirmedUser({
      email: "expert@example.com",
    });
    const model = await createIssueModel();
    const issueInfo = buildCreateIssueInfo({
      selectedModelId: model._id,
      globalDomainId: new mongoose.Types.ObjectId(),
      addedExperts: ["expert@example.com"],
    });

    const result = await loadCreateIssueActorsAndModel({
      ownerUserId: owner._id,
      selectedModelId: model._id,
      paramValues: issueInfo.paramValues,
      criteriaNodes: issueInfo.criteria,
      alternatives: issueInfo.alternatives.map((name) => ({ id: null, name })),
      uniqueExpertEmails: ["expert@example.com"],
    });

    expect(String(result.model._id)).toBe(String(model._id));
    expect(String(result.owner._id)).toBe(String(owner._id));
    expect(result.ownerEmail).toBe("owner@example.com");
    expect(result.expertByEmail.get("expert@example.com")).toBeTruthy();
    expect(result.apiModelKey).toBe(model.apiModelKey);
    expect(result.apiEndpoint.path).toBe("/solve");
  });

  it("rejects a missing selected model", async () => {
    const owner = await createConfirmedUser();
    const expert = await createConfirmedUser({
      email: "expert@example.com",
    });

    await expect(
      loadCreateIssueActorsAndModel({
        ownerUserId: owner._id,
        selectedModelId: new mongoose.Types.ObjectId(),
        paramValues: {},
        criteriaNodes: buildCreateIssueInfo({
          selectedModelId: new mongoose.Types.ObjectId(),
          globalDomainId: new mongoose.Types.ObjectId(),
        }).criteria,
        alternatives: [
          { id: null, name: "Alternative A" },
          { id: null, name: "Alternative B" },
        ],
        uniqueExpertEmails: [expert.email],
      })
    ).rejects.toMatchObject({
      statusCode: 400,
      field: "selectedModelId",
      message: "Model does not exist",
    });
  });

  it("rejects a model that is not visible in issue creation", async () => {
    const owner = await createConfirmedUser();
    const expert = await createConfirmedUser({
      email: "expert@example.com",
    });
    const model = await createIssueModel({
      visibleInIssueCreation: false,
    });

    await expect(
      loadCreateIssueActorsAndModel({
        ownerUserId: owner._id,
        selectedModelId: model._id,
        paramValues: {},
        criteriaNodes: buildCreateIssueInfo({
          selectedModelId: model._id,
          globalDomainId: new mongoose.Types.ObjectId(),
        }).criteria,
        alternatives: [
          { id: null, name: "Alternative A" },
          { id: null, name: "Alternative B" },
        ],
        uniqueExpertEmails: [expert.email],
      })
    ).rejects.toMatchObject({
      statusCode: 400,
      field: "selectedModelId",
      message: "Selected model is not enabled for issue creation",
    });
  });

  it("rejects a stale model", async () => {
    const owner = await createConfirmedUser();
    const expert = await createConfirmedUser({
      email: "expert@example.com",
    });
    const model = await createIssueModel({
      manifestSync: {
        isStale: true,
      },
    });

    await expect(
      loadCreateIssueActorsAndModel({
        ownerUserId: owner._id,
        selectedModelId: model._id,
        paramValues: {},
        criteriaNodes: buildCreateIssueInfo({
          selectedModelId: model._id,
          globalDomainId: new mongoose.Types.ObjectId(),
        }).criteria,
        alternatives: [
          { id: null, name: "Alternative A" },
          { id: null, name: "Alternative B" },
        ],
        uniqueExpertEmails: [expert.email],
      })
    ).rejects.toMatchObject({
      statusCode: 400,
      field: "selectedModelId",
      message: "Selected model is not enabled for issue creation",
    });
  });

  it("rejects missing experts", async () => {
    const owner = await createConfirmedUser();
    const model = await createIssueModel();

    await expect(
      loadCreateIssueActorsAndModel({
        ownerUserId: owner._id,
        selectedModelId: model._id,
        paramValues: {},
        criteriaNodes: buildCreateIssueInfo({
          selectedModelId: model._id,
          globalDomainId: new mongoose.Types.ObjectId(),
        }).criteria,
        alternatives: [
          { id: null, name: "Alternative A" },
          { id: null, name: "Alternative B" },
        ],
        uniqueExpertEmails: [],
      })
    ).rejects.toMatchObject({
      statusCode: 400,
      field: "addedExperts",
      message: "Must be at least one expert",
    });
  });

  it("normalizes expert emails consistently before loading experts", async () => {
    const owner = await createConfirmedUser({
      email: "OWNER@EXAMPLE.COM",
    });
    const expert = await createConfirmedUser({
      email: "expert@example.com",
    });
    const model = await createIssueModel();

    const result = await loadCreateIssueActorsAndModel({
      ownerUserId: owner._id,
      selectedModelId: model._id,
      paramValues: {},
      criteriaNodes: buildCreateIssueInfo({
        selectedModelId: model._id,
        globalDomainId: new mongoose.Types.ObjectId(),
      }).criteria,
      alternatives: [
        { id: null, name: "Alternative A" },
        { id: null, name: "Alternative B" },
      ],
      uniqueExpertEmails: ["  EXPERT@example.com  "],
    });

    expect(result.ownerEmail).toBe("owner@example.com");
    expect(Array.from(result.expertByEmail.keys())).toEqual([
      "expert@example.com",
    ]);
  });
});
