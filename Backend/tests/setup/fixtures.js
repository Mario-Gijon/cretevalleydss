import mongoose from "mongoose";

import { Criterion } from "../../models/Criteria.js";
import { IssueEvaluation } from "../../models/IssueEvaluations.js";
import { Issue } from "../../models/Issues.js";
import { Participation } from "../../models/Participations.js";
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

export const createIssueFixture = async ({
  ownerId,
  createdBy = ownerId,
  modelId = new mongoose.Types.ObjectId(),
  name = `Issue ${uniqueSuffix()}`,
  description = "Minimal issue fixture",
  active = true,
  currentStage = "criteriaWeighting",
  consensusPhase = 0,
  criteriaWeightsStructureKey = null,
  evaluationStructureKey = "alternativeCriteriaMatrix",
  supportsConsensus = false,
  simulateConsensus = false,
  ...overrides
} = {}) => {
  return Issue.create({
    ownerId,
    createdBy,
    model: modelId,
    apiModelKey: "test-model",
    apiEndpoint: {
      method: "POST",
      path: "/execute",
    },
    name,
    evaluationStructureKey,
    criteriaWeightsStructureKey,
    description,
    active,
    currentStage,
    consensusPhase,
    supportsConsensus,
    simulateConsensus,
    ...overrides,
  });
};

export const createIssueCriteriaFixture = async ({
  issueId,
  rootName = "Root criterion",
  leafNames = ["Leaf criterion"],
  leafType = "benefit",
} = {}) => {
  const rootCriterion = await Criterion.create({
    issue: issueId,
    parentCriterion: null,
    name: rootName,
    type: "group",
    isLeaf: false,
    position: 0,
  });

  const leafCriteria = [];

  for (const [index, leafName] of leafNames.entries()) {
    const leafCriterion = await Criterion.create({
      issue: issueId,
      parentCriterion: rootCriterion._id,
      name: leafName,
      type: leafType,
      isLeaf: true,
      position: index,
    });

    leafCriteria.push(leafCriterion);
  }

  return {
    rootCriterion,
    leafCriteria,
  };
};

export const createParticipationFixture = async ({
  issueId,
  expertId,
  invitationStatus = "pending",
  evaluationCompleted = false,
  weightsCompleted = false,
  entryPhase = null,
  entryStage = null,
  joinedAt = new Date(),
  weight = null,
} = {}) => {
  return Participation.create({
    issue: issueId,
    expert: expertId,
    invitationStatus,
    evaluationCompleted,
    weightsCompleted,
    entryPhase,
    entryStage,
    joinedAt,
    weight,
  });
};

export const createIssueEvaluationFixture = async ({
  issueId,
  expertId,
  stage = "criteriaWeighting",
  consensusPhase = 0,
  payload = {},
  completed = false,
} = {}) => {
  return IssueEvaluation.create({
    issue: issueId,
    expert: expertId,
    stage,
    consensusPhase,
    payload,
    completed,
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
