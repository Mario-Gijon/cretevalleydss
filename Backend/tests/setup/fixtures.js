import mongoose from "mongoose";

import { ExpressionDomain } from "../../models/ExpressionDomain.js";
import { IssueModel } from "../../models/IssueModels.js";
import { User } from "../../models/Users.js";
import {
  prepareIssueCreation,
  persistPreparedIssueCreation,
} from "../../modules/issues/creation/createIssue.js";

const uniqueSuffix = () =>
  `${Date.now()}-${new mongoose.Types.ObjectId().toString().slice(-8)}`;

export const createConfirmedUser = async (overrides = {}) => {
  const suffix = uniqueSuffix();

  return User.create({
    name: "Test User",
    university: "Testing University",
    email: `user-${suffix}@example.com`,
    password: "Abc123",
    accountConfirm: true,
    ...overrides,
  });
};

export const createIssueModel = async (overrides = {}) => {
  const suffix = uniqueSuffix();

  return IssueModel.create({
    name: `Issue Model ${suffix}`,
    apiModelKey: `issue-model-${suffix}`,
    modelKind: "issue",
    supportsCreatorCriteriaWeighting: false,
    supportsExpertCriteriaWeighting: false,
    visibleInIssueCreation: true,
    visibleInCriteriaWeighting: false,
    apiEndpoint: {
      method: "POST",
      path: "/solve",
    },
    manifestSync: {
      isStale: false,
    },
    isMultiCriteria: true,
    smallDescription: "Test model",
    extendDescription: "Test model for backend issue creation",
    implementationStatus: "ready",
    publicUsable: true,
    parameters: [],
    evaluationStructureKey: "alternativeCriteriaMatrix",
    supportsConsensus: false,
    supportsConsensusSimulation: false,
    usesCriteriaWeights: false,
    usesExpertWeights: false,
    usesFuzzyCriteriaWeights: false,
    usesCriterionTypes: false,
    supportedDomains: {
      numeric: {
        continuous: true,
        discrete: true,
      },
      linguistic: [],
    },
    request: null,
    response: null,
    ...overrides,
  });
};

export const createExpressionDomainFixture = async ({
  userId = null,
  isGlobal = false,
  type = "numeric",
  numericRange = { min: 0, max: 10, step: 1 },
  membershipFunction = "triangular",
  valueCount = 3,
  valuesMode = "custom",
  linguisticLabels = [
    { label: "Low", values: [0, 0, 0.4] },
    { label: "Medium", values: [0.2, 0.5, 0.8] },
    { label: "High", values: [0.6, 1, 1] },
  ],
  ...overrides
} = {}) => {
  const suffix = uniqueSuffix();

  return ExpressionDomain.create({
    user: isGlobal ? null : userId,
    name: `Domain ${suffix}`,
    isGlobal,
    locked: false,
    type,
    numericRange: type === "numeric" ? numericRange : undefined,
    membershipFunction: type === "linguistic" ? membershipFunction : null,
    valueCount: type === "linguistic" ? valueCount : null,
    valuesMode: type === "linguistic" ? valuesMode : null,
    linguisticLabels: type === "linguistic" ? linguisticLabels : [],
    ...overrides,
  });
};

export const buildCreateIssueInfo = ({
  selectedModelId,
  globalDomainId,
  addedExperts = ["expert@example.com"],
  alternatives = ["  Alternative A  ", "Alternative B"],
  criteria = [
    {
      name: " Main criterion ",
      type: "group",
      children: [
        {
          name: " Leaf criterion ",
          type: "benefit",
          children: [],
        },
      ],
    },
  ],
  paramValues = {},
  expressionDomainConfig,
  ...overrides
} = {}) => ({
  issueName: "  Example issue  ",
  issueDescription: "  Example description  ",
  selectedModelId: String(selectedModelId),
  alternatives,
  addedExperts,
  criteria,
  expressionDomainConfig:
    expressionDomainConfig ?? {
      mode: "global",
      globalDomainId: String(globalDomainId),
    },
  paramValues,
  ...overrides,
});

export const persistPreparedIssueCreationInTransaction = async (
  preparedIssueCreation
) => {
  const session = await mongoose.startSession();

  try {
    let result = null;

    await session.withTransaction(async () => {
      result = await persistPreparedIssueCreation({
        preparedIssueCreation,
        session,
      });
    });

    return result;
  } finally {
    await session.endSession();
  }
};

export const prepareAndPersistIssueCreation = async ({
  issueInfo,
  ownerUserId,
  decisionModelsServiceBaseUrl,
  httpClient,
} = {}) => {
  const prepared = await prepareIssueCreation({
    issueInfo,
    ownerUserId,
    decisionModelsServiceBaseUrl,
    httpClient,
  });

  const persisted = await persistPreparedIssueCreationInTransaction(prepared);

  return {
    prepared,
    persisted,
  };
};
