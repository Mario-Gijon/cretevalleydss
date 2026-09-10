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

const twoTupleAggregationMethods = [
  {
    key: "arithmetic_mean",
    label: "2-Tuple Arithmetic Mean",
    subparameters: [],
  },
  {
    key: "weighted_average",
    label: "2-Tuple Weighted Average",
    subparameters: [],
  },
  {
    key: "l2towa",
    label: "L2TOWA",
    subparameters: [
      {
        key: "quantifier",
        label: "Quantifier",
        type: "select",
        required: true,
        default: "most",
        options: [
          { value: "most", label: "Most", a: 0.3, b: 0.8 },
          { value: "at_least_half", label: "At least half", a: 0, b: 0.5 },
          {
            value: "as_many_as_possible",
            label: "As many as possible",
            a: 0.5,
            b: 1,
          },
          { value: "custom", label: "Custom" },
        ],
      },
      {
        key: "a",
        label: "a",
        type: "number",
        required: true,
        default: 0,
        min: 0,
        max: 1,
        visibleWhen: { field: "quantifier", equals: "custom" },
      },
      {
        key: "b",
        label: "b",
        type: "number",
        required: true,
        default: 1,
        min: 0,
        max: 1,
        visibleWhen: { field: "quantifier", equals: "custom" },
      },
    ],
  },
];

const bordaResolveIssueModel = {
  name: "E2E Borda Resolve Model",
  apiModelKey: "borda",
  modelKind: "issue",
  supportsCreatorCriteriaWeighting: false,
  supportsExpertCriteriaWeighting: false,
  requiresHomogeneousExpressionDomains: false,
  visibleInIssueCreation: true,
  visibleInCriteriaWeighting: false,
  apiEndpoint: { method: "POST", path: "/borda" },
  manifestSync: { isStale: false },
  isMultiCriteria: true,
  smallDescription: "E2E Borda issue-resolution fixture model",
  extendDescription: "Real Borda model used only by the isolated Playwright resolve flow.",
  implementationStatus: "ready",
  publicUsable: true,
  parameters: [],
  evaluationStructureKey: "alternativeCriteriaMatrix",
  supportsConsensus: false,
  supportsConsensusSimulation: false,
  usesCriteriaWeights: false,
  usesExpertWeights: false,
  usesFuzzyCriteriaWeights: false,
  usesCriterionTypes: true,
  supportedExpressionDomains: [
    { typeKey: "numericContinuous", constraints: {} },
    { typeKey: "numericDiscrete", constraints: {} },
  ],
  request: null,
  response: null,
};

const twoTupleIssueModel = {
  name: "E2E 2-Tuple Linguistic Model",
  apiModelKey: "two_tuple",
  modelKind: "issue",
  supportsCreatorCriteriaWeighting: false,
  supportsExpertCriteriaWeighting: false,
  requiresHomogeneousExpressionDomains: true,
  visibleInIssueCreation: true,
  visibleInCriteriaWeighting: false,
  apiEndpoint: { method: "POST", path: "/two_tuple" },
  manifestSync: { isStale: false },
  isMultiCriteria: true,
  smallDescription: "Real 2-tuple linguistic model for the isolated E2E flow.",
  extendDescription:
    "Real Decision Models Service 2-tuple model used only by the isolated Playwright flow.",
  implementationStatus: "ready",
  publicUsable: true,
  parameters: [
    {
      key: "expertAggregation",
      name: "expertAggregation",
      label: "Expert aggregation",
      parameterStructureKey: "twoTupleAggregation",
      required: true,
      default: { method: "arithmetic_mean", options: {} },
      restrictions: { methods: twoTupleAggregationMethods },
    },
    {
      key: "criteriaAggregation",
      name: "criteriaAggregation",
      label: "Criteria aggregation",
      parameterStructureKey: "twoTupleAggregation",
      required: true,
      default: { method: "weighted_average", options: {} },
      restrictions: { methods: twoTupleAggregationMethods },
    },
  ],
  evaluationStructureKey: "alternativeCriteriaMatrix",
  supportsConsensus: false,
  supportsConsensusSimulation: false,
  usesCriteriaWeights: true,
  usesExpertWeights: true,
  usesFuzzyCriteriaWeights: false,
  usesCriterionTypes: false,
  supportedExpressionDomains: [{ typeKey: "linguistic2Tuple", constraints: {} }],
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
  apiEndpoint: { method: "POST", path: "/manual_criteria_weights" },
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

const twoTupleExpressionDomain = {
  owner: null,
  name: "E2E Linguistic 2-Tuple 5",
  typeKey: "linguistic2Tuple",
  definition: {
    labelCount: 5,
    labels: [
      { key: "s0", label: "Very Low", index: 0 },
      { key: "s1", label: "Low", index: 1 },
      { key: "s2", label: "Medium", index: 2 },
      { key: "s3", label: "High", index: 3 },
      { key: "s4", label: "Very High", index: 4 },
    ],
  },
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
      lookup: { apiModelKey: bordaResolveIssueModel.apiModelKey },
      document: bordaResolveIssueModel,
    }),
    upsertByLookup({
      Model: IssueModel,
      lookup: { apiModelKey: twoTupleIssueModel.apiModelKey },
      document: twoTupleIssueModel,
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
    upsertByLookup({
      Model: ExpressionDomain,
      lookup: { owner: null, name: twoTupleExpressionDomain.name },
      document: twoTupleExpressionDomain,
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
