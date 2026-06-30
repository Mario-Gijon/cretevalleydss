const clone = (value) => JSON.parse(JSON.stringify(value));

export const adminCatalogModelsFixture = [
  {
    id: "mongo-issue-model",
    name: "Budget Optimizer 10",
    apiModelKey: "budget_optimizer",
    modelKind: "issue",
    implementationStatus: "ready",
    visibleInIssueCreation: true,
    visibleInCriteriaWeighting: false,
    protectedHistoricalModel: false,
    apiInputFormat: "json",
    apiOutputFormat: "json",
    modelInputFields: ["criteria", "alternatives"],
    modelOutputFields: ["ranking"],
    lifecycleKind: "managed",
    evaluationStructureKey: "alternativeCriteriaMatrix",
    usesCriteriaWeights: true,
    usesExpertWeights: false,
    usesFuzzyCriteriaWeights: false,
    usesCriterionTypes: true,
    supportsConsensus: true,
    isMultiCriteria: true,
    supportedDomains: ["crisp"],
    apiEndpoint: {
      method: "POST",
      path: "/models/budget_optimizer",
    },
    parameters: [
      {
        key: "alpha",
        parameterStructureKey: "numberGlobal",
      },
    ],
    request: {
      sample: true,
    },
    response: {
      ranking: [],
    },
    manifestSync: {
      lastSyncedAt: "2026-06-01T10:00:00.000Z",
      isStale: false,
    },
    smallDescription: "Main issue model",
    extendDescription: "Long description",
    moreInfoUrl: "https://example.com/model",
  },
  {
    _id: "mongo-criteria-model",
    name: "Weights Builder",
    apiModelKey: "weights_builder",
    modelKind: "criteriaWeighting",
    implementationStatus: "scaffold",
    visibleInIssueCreation: true,
    visibleInCriteriaWeighting: false,
    protectedHistoricalModel: false,
    lifecycleKind: "managed",
    usesCriteriaWeights: false,
    usesExpertWeights: true,
    supportsConsensus: false,
  },
  {
    _id: "mongo-protected-model",
    name: "",
    apiModelKey: null,
    modelKind: "issue",
    implementationStatus: null,
    publicUsable: false,
    visibleInIssueCreation: false,
    visibleInCriteriaWeighting: false,
    protectedHistoricalModel: true,
    modelInputFields: null,
    modelOutputFields: undefined,
    lifecycleKind: "historical",
    supportedDomains: null,
    parameters: null,
    manifestSync: {
      isStale: true,
    },
  },
];

export const buildAdminCatalogModelsFixture = () => clone(adminCatalogModelsFixture);

export const adminDryRunModernReportFixture = {
  manifest: {
    totalModels: 4,
    publicIssueModels: 1,
  },
  modelRows: [
    {
      apiModelKey: "budget_optimizer",
      displayName: "Budget Optimizer 10",
      mongoName: "Budget Optimizer 10",
      mongoId: "mongo-issue-model",
      matched: true,
      matchedBy: "apiModelKey",
      differences: [
        {
          field: "parameters",
          mongoValue: ["alpha"],
          manifestValue: ["alpha", "beta"],
        },
      ],
      syncState: "Has differences",
    },
    {
      apiModelKey: "weights_builder",
      displayName: "Weights Builder",
      mongoName: "Weights Builder",
      mongoId: "mongo-criteria-model",
      matched: true,
      matchedBy: "apiModelKey",
      differences: [],
      syncState: "Synced",
    },
  ],
  summary: {
    technicalDifferences: [
      {
        manifestKey: "budget_optimizer",
        mongoName: "Budget Optimizer 10",
        mongoId: "mongo-issue-model",
        differences: [
          {
            field: "parameters",
            mongoValue: ["alpha"],
            manifestValue: ["alpha", "beta"],
          },
        ],
      },
    ],
    missingInMongo: [
      {
        key: "new_service_model",
        apiModelKey: "new_service_model",
        displayName: "New Service Model",
        reason: "Not created yet",
      },
    ],
    deletedCandidates: [
      {
        apiModelKey: "legacy_model",
        mongoName: "Legacy Model",
        mongoId: "mongo-legacy-model",
        reason: "Removed from manifest",
      },
    ],
    blockedDeletions: [
      {
        apiModelKey: "historic_model",
        mongoName: "Historic Model",
        mongoId: "mongo-historic-model",
        reason: "Referenced by finished issues",
        references: ["issue-1"],
      },
    ],
    notSyncable: [
      {
        apiModelKey: "service_model",
        displayName: "Service Model",
        lifecycleKind: "service",
        modelKind: "issue",
        safeToCreateIssueModel: false,
        reason: "Service-backed model",
      },
    ],
    matched: 2,
  },
  warnings: ["Dry-run warning"],
};

export const buildAdminDryRunModernReportFixture = () =>
  clone(adminDryRunModernReportFixture);

export const adminDryRunLegacyReportFixture = {
  matches: [
    {
      manifestKey: "budget_optimizer",
      manifestDisplayName: "Budget Optimizer 10",
      mongoName: "Budget Optimizer 10",
      mongoId: "mongo-issue-model",
      matchedBy: "apiModelKey",
      differences: [],
    },
  ],
  summary: {
    missingInMongo: [
      {
        key: "new_service_model",
        displayName: "New Service Model",
        reason: "Not created yet",
      },
    ],
    deletedCandidates: [
      {
        mongoName: "Legacy Model",
        mongoId: "mongo-legacy-model",
        reason: "Removed from manifest",
      },
    ],
    blockedDeletions: [
      {
        mongoName: "Historic Model",
        mongoId: "mongo-historic-model",
        reason: "Referenced by finished issues",
      },
    ],
    notSyncable: [
      {
        apiModelKey: "service_model",
        displayName: "Service Model",
        lifecycleKind: "service",
        modelKind: "issue",
        safeToCreateIssueModel: false,
        reason: "Service-backed model",
      },
    ],
    technicalDifferences: [
      {
        manifestKey: "budget_optimizer",
        mongoName: "Budget Optimizer 10",
        mongoId: "mongo-issue-model",
        differences: [
          {
            field: "endpoint",
            mongoValue: "/old",
            manifestValue: "/new",
            reason: "Manifest changed",
          },
        ],
      },
    ],
  },
};

export const buildAdminDryRunLegacyReportFixture = () =>
  clone(adminDryRunLegacyReportFixture);

export const adminSyncResultFixture = {
  summary: {
    created: 1,
    updated: 1,
    unchanged: 1,
    skipped: 0,
    deleted: 0,
    blockedDeletions: 1,
    warnings: 1,
  },
  created: [
    {
      apiModelKey: "new_service_model",
      mongoName: "New Service Model",
      mongoId: "mongo-new-service-model",
    },
  ],
  updated: [
    {
      apiModelKey: "budget_optimizer",
      mongoName: "Budget Optimizer 10",
      updatedFields: ["parameters"],
    },
  ],
  unchanged: [
    {
      apiModelKey: "weights_builder",
      mongoName: "Weights Builder",
      reason: "Already synchronized",
    },
  ],
  skipped: [],
  deleted: [],
  blockedDeletions: [
    {
      apiModelKey: "historic_model",
      mongoName: "Historic Model",
      reason: "Referenced by finished issues",
    },
  ],
  warnings: ["Dry-run warning"],
};

export const buildAdminSyncResultFixture = () => clone(adminSyncResultFixture);
