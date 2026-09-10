import mongoose from "mongoose";

import { connectDB } from "../../database/db.js";
import { ExpressionDomain } from "../../models/ExpressionDomain.js";
import { IssueModel } from "../../models/IssueModels.js";
import { User } from "../../models/Users.js";
import { assertIsolatedE2eEnvironment } from "./assertIsolatedE2eEnvironment.js";

const issueExpert = {
  name: "E2E Issue Expert",
  university: "E2E Testing",
  email: "issue.expert@example.test",
  password: "E2eIssueExpert123",
  role: "user",
  accountConfirm: true,
  isDeleted: false,
  deletedAt: null,
  tokenConfirm: null,
  emailTokenConfirm: null,
};

const issueModel = {
  name: "E2E Matrix Model",
  apiModelKey: "e2e-matrix-model",
  modelKind: "issue",
  supportsCreatorCriteriaWeighting: false,
  supportsExpertCriteriaWeighting: false,
  requiresHomogeneousExpressionDomains: false,
  visibleInIssueCreation: true,
  visibleInCriteriaWeighting: false,
  apiEndpoint: { method: "POST", path: "/solve" },
  manifestSync: { isStale: false },
  isMultiCriteria: true,
  smallDescription: "E2E issue-creation fixture model",
  extendDescription: "Minimal model used only by the isolated Playwright create-issue smoke flow.",
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
  supportedExpressionDomains: [{ typeKey: "numericDiscrete", constraints: {} }],
  request: null,
  response: null,
};

const weightedIssueModel = {
  name: "E2E Weighted Matrix Model",
  apiModelKey: "e2e-weighted-matrix-model",
  modelKind: "issue",
  supportsCreatorCriteriaWeighting: false,
  supportsExpertCriteriaWeighting: false,
  requiresHomogeneousExpressionDomains: false,
  visibleInIssueCreation: true,
  visibleInCriteriaWeighting: false,
  apiEndpoint: { method: "POST", path: "/solve" },
  manifestSync: { isStale: false },
  isMultiCriteria: true,
  smallDescription: "E2E weighted issue-creation fixture model",
  extendDescription: "Minimal weighted model used only by the isolated Playwright criteria-weighting flow.",
  implementationStatus: "ready",
  publicUsable: true,
  parameters: [],
  evaluationStructureKey: "alternativeCriteriaMatrix",
  supportsConsensus: false,
  supportsConsensusSimulation: false,
  usesCriteriaWeights: true,
  usesExpertWeights: false,
  usesFuzzyCriteriaWeights: false,
  usesCriterionTypes: false,
  supportedExpressionDomains: [{ typeKey: "numericDiscrete", constraints: {} }],
  request: null,
  response: null,
};

const manualCriteriaWeightingModel = {
  name: "Manual Criteria Weights",
  apiModelKey: "manual_criteria_weights",
  modelKind: "criteriaWeighting",
  supportsCreatorCriteriaWeighting: false,
  supportsExpertCriteriaWeighting: true,
  requiresHomogeneousExpressionDomains: false,
  visibleInIssueCreation: false,
  visibleInCriteriaWeighting: true,
  apiEndpoint: { method: "POST", path: "/criteria-weights" },
  manifestSync: { isStale: false },
  isMultiCriteria: true,
  smallDescription: "Manual criteria weighting",
  extendDescription: "Experts provide criteria weights that sum to one.",
  implementationStatus: "ready",
  publicUsable: true,
  parameters: [],
  evaluationStructureKey: "manualCriteriaWeights",
  supportsConsensus: false,
  supportsConsensusSimulation: false,
  usesCriteriaWeights: false,
  usesExpertWeights: false,
  usesFuzzyCriteriaWeights: false,
  usesCriterionTypes: false,
  supportedExpressionDomains: [],
  request: null,
  response: null,
};

const expressionDomain = {
  owner: null,
  name: "E2E Numeric 0-10",
  typeKey: "numericDiscrete",
  definition: { min: 0, max: 10, step: 1 },
};

const upsertByLookup = async ({ Model, lookup, document }) => {
  const existingDocument = await Model.findOne(lookup);

  if (existingDocument) {
    Object.assign(existingDocument, document);
    await existingDocument.save();
    return existingDocument;
  }

  return Model.create(document);
};

const seedCreateIssueSmokeFixtures = async () => {
  assertIsolatedE2eEnvironment();
  await connectDB();

  await Promise.all([
    upsertByLookup({ Model: User, lookup: { email: issueExpert.email }, document: issueExpert }),
    upsertByLookup({
      Model: IssueModel,
      lookup: { apiModelKey: issueModel.apiModelKey },
      document: issueModel,
    }),
    upsertByLookup({
      Model: IssueModel,
      lookup: { apiModelKey: weightedIssueModel.apiModelKey },
      document: weightedIssueModel,
    }),
    upsertByLookup({
      Model: IssueModel,
      lookup: { apiModelKey: manualCriteriaWeightingModel.apiModelKey },
      document: manualCriteriaWeightingModel,
    }),
    upsertByLookup({
      Model: ExpressionDomain,
      lookup: { owner: null, name: expressionDomain.name },
      document: expressionDomain,
    }),
  ]);

  console.log("[e2e] Create-issue smoke fixtures ready.");
};

try {
  await seedCreateIssueSmokeFixtures();
} catch (error) {
  console.error("[e2e] Failed to seed create-issue smoke fixtures:", error);
  process.exitCode = 1;
} finally {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
}
