const clone = (value) => JSON.parse(JSON.stringify(value));

export const schemaCompatibleScenarioModelFixture = {
  id: "model-weighted",
  name: "Weighted Scenario Model",
  modelName: "Weighted Scenario Model",
  usesCriteriaWeights: true,
  scenarioCompatibility: {
    compatible: true,
    reasons: [],
  },
  parameters: [
    {
      key: "threshold",
      label: "Threshold",
      parameterStructureKey: "numberGlobal",
      required: true,
      default: 0.5,
      restrictions: {
        min: 0,
        max: 1,
      },
    },
  ],
};

export const schemaIncompatibleScenarioModelFixture = {
  id: "model-incompatible",
  name: "Consensus-only Model",
  modelName: "Consensus-only Model",
  usesCriteriaWeights: false,
  scenarioCompatibility: {
    compatible: false,
    reasons: ["Consensus scenarios are not supported"],
  },
  parameters: [],
};

export const catalogScenarioModelFixture = {
  id: "catalog-model",
  name: "Catalog Model",
  modelName: "Catalog Model",
};

const summaryCriteria = [
  {
    id: "root-1",
    name: "Overall",
    children: [
      {
        id: "criterion-cost",
        name: "Cost",
        children: [],
      },
      {
        id: "criterion-quality",
        name: "Quality",
        children: [],
      },
    ],
  },
];

const leafCriteria = [
  { id: "criterion-cost", name: "Cost" },
  { id: "criterion-quality", name: "Quality" },
];

const finishedIssueBaseTemplate = {
  id: "issue-finished-robust",
  _id: "issue-finished-robust",
  name: "Finished issue robustness",
  summary: {
    model: "Consensus Model",
    modelName: "Consensus Model",
    evaluationStructureKey: "alternativeCriteriaMatrix",
    criteriaWeightsStructureKey: "manualCriteriaWeights",
    criteria: summaryCriteria,
    experts: {
      participated: ["anon@example.com", "Deleted user"],
      notAccepted: ["removed@example.com"],
    },
    consensusInfo: {
      consensusReachedPhase: 1,
    },
  },
  criteria: summaryCriteria,
  modelParams: {
    domainType: "crisp",
    leafCriteria,
    base: {
      modelName: "Consensus Model",
      evaluationStructureKey: "alternativeCriteriaMatrix",
      paramsSaved: {
        alpha: 0.6,
        weights: {
          "criterion-cost": 0.55,
          "criterion-quality": 0.45,
        },
      },
      paramsResolved: {
        alpha: 0.6,
        weights: {
          "criterion-cost": 0.55,
          "criterion-quality": 0.45,
        },
      },
      parameters: [
        {
          key: "alpha",
          label: "Alpha",
          parameterStructureKey: "numberGlobal",
          required: false,
          default: 0.6,
          restrictions: {
            min: 0,
            max: 1,
          },
        },
      ],
    },
    availableModels: [
      schemaCompatibleScenarioModelFixture,
      schemaIncompatibleScenarioModelFixture,
    ],
  },
  alternativesRankings: [
    {
      phase: 0,
      rankedAlternatives: [
        { alternativeId: "alt-alpha", name: "Alpha", score: 0.64, rank: 1 },
        { alternativeId: "alt-beta", name: "Beta", score: 0.36, rank: 2 },
      ],
    },
    {
      phase: 1,
      rankedAlternatives: [
        { alternativeId: "alt-beta", name: "Beta", score: 0.72, rank: 1 },
        { alternativeId: "alt-alpha", name: "Alpha", score: 0.28, rank: 2 },
      ],
    },
  ],
  consensusHistory: [
    {
      phase: 0,
      modelExecution: {
        modelName: "Consensus Model",
        modelKey: "consensus-model",
        executedAt: "2026-06-01T09:00:00.000Z",
        rawOutput: {
          phase: 0,
          token: "phase-0-output",
        },
      },
    },
    {
      phase: 1,
      modelExecution: {
        modelName: "Consensus Model",
        modelKey: "consensus-model",
        executedAt: "2026-06-02T09:00:00.000Z",
        rawOutput: {
          phase: 1,
          token: "phase-1-output",
        },
      },
    },
  ],
  consensusRounds: [],
  consensus: [],
  consensusDetails: {
    modelExecution: {
      modelName: "Consensus Model",
      modelKey: "consensus-model",
      executedAt: "2026-06-02T09:00:00.000Z",
      rawOutput: {
        source: "consensus-details",
      },
    },
  },
  modelExecution: {
    modelName: "Consensus Model",
    modelKey: "consensus-model",
    executedAt: "2026-06-02T09:00:00.000Z",
    rawOutput: {
      source: "base-model-execution",
    },
  },
  expertsRatings: {
    0: {
      expertEvaluations: {
        "anon@example.com": {
          stage: "phase-0-anon",
        },
        "Deleted user": {
          stage: "phase-0-deleted",
        },
      },
      criteriaWeightsEvaluationByExpert: {
        "anon@example.com": {
          status: "submitted",
          structureKey: "manualCriteriaWeights",
          payload: {
            weights: [0.55, 0.45],
          },
        },
        "Deleted user": {
          status: "notSubmitted",
        },
      },
      collectiveEvaluations: {
        shared: "phase-0-shared",
      },
      collectiveEvaluationsLocalizedByExpert: {
        "anon@example.com": {
          shared: "phase-0-localized",
        },
      },
    },
    1: {
      expertEvaluations: {
        "removed@example.com": {
          stage: "phase-1-removed",
        },
      },
      criteriaWeightsEvaluationByExpert: {
        "removed@example.com": {
          status: "notRequired",
        },
      },
      collectiveEvaluations: {
        shared: "phase-1-shared",
      },
    },
  },
  finalCriteriaWeights: {
    source: "criteriaWeightingStageResult",
    weightsByCriterion: {
      "criterion-cost": 0.55,
      "criterion-quality": 0.45,
    },
    weights: [
      {
        criterionName: "Cost",
        weight: 0.55,
      },
      {
        criterionName: "Quality",
        weight: 0.45,
      },
    ],
  },
  evaluationContext: {
    alternatives: [
      { id: "alt-alpha", name: "Alpha" },
      { id: "alt-beta", name: "Beta" },
    ],
    criteriaTree: summaryCriteria,
    leafCriteria,
  },
};

const finishedScenarioRunsTemplate = [
  {
    _id: "scenario-1",
    name: "Weighted Scenario Run",
    targetModelName: "Weighted Scenario Model",
  },
  {
    _id: "scenario-pending",
    name: "Pending Scenario Run",
    targetModelName: "Catalog Model",
  },
];

const finishedScenarioTemplate = {
  _id: "scenario-1",
  name: "Weighted Scenario Run",
  targetModelName: "Weighted Scenario Model",
  targetEvaluationStructureKey: "alternativeCriteriaMatrix",
  config: {
    modelParameters: {
      threshold: 0.7,
      weights: {
        "criterion-cost": 0.4,
        "criterion-quality": 0.6,
      },
    },
    normalizedModelParameters: {
      threshold: 0.7,
      weights: {
        "criterion-cost": 0.4,
        "criterion-quality": 0.6,
      },
    },
  },
  outputs: {
    rawOutput: {
      source: "scenario-output-root",
    },
    modelExecution: {
      modelName: "Weighted Scenario Model",
      modelKey: "weighted-model",
      executedAt: "2026-06-03T10:00:00.000Z",
      rawOutput: {
        source: "scenario-model-execution",
      },
    },
    standardResult: {
      rawOutput: {
        source: "scenario-standard-result",
      },
      rankedAlternatives: [
        {
          alternativeId: "alt-alpha",
          name: "Alpha",
          score: 0.82,
          rank: 1,
        },
        {
          alternativeId: "alt-beta",
          name: "Beta",
          score: 0.18,
          rank: 2,
        },
      ],
      collectiveEvaluations: {
        merged: "scenario-collective",
      },
      plotsGraphic: {
        expert_points: [
          [0.1, 0.2],
          [0.5, 0.7],
        ],
        collective_point: [0.3, 0.4],
        expert_labels: ["anon@example.com", "Deleted user"],
      },
    },
  },
};

const finishedPendingScenarioTemplate = {
  _id: "scenario-pending",
  name: "Pending Scenario Run",
  targetModelName: "Catalog Model",
  outputs: {},
};

export const buildFinishedIssueBaseFixture = () => clone(finishedIssueBaseTemplate);

export const buildFinishedIssueWithoutSchemaModelsFixture = () => {
  const issue = buildFinishedIssueBaseFixture();
  delete issue.modelParams.availableModels;
  return issue;
};

export const buildSingleCriterionFinishedIssueFixture = () => {
  const issue = buildFinishedIssueBaseFixture();

  issue.summary.criteria = [
    {
      id: "criterion-single",
      name: "Only criterion",
      children: [],
    },
  ];
  issue.criteria = clone(issue.summary.criteria);
  issue.modelParams.leafCriteria = [{ id: "criterion-single", name: "Only criterion" }];
  issue.modelParams.base.paramsSaved = { alpha: 1, weights: { "criterion-single": 1 } };
  issue.modelParams.base.paramsResolved = { alpha: 1, weights: { "criterion-single": 1 } };
  issue.finalCriteriaWeights = {
    source: "criteriaWeightingStageResult",
    weightsByCriterion: {
      "criterion-single": 1,
    },
    weights: [
      {
        criterionName: "Only criterion",
        weight: 1,
      },
    ],
  };

  return issue;
};

export const buildFinishedScenarioRunsFixture = () => clone(finishedScenarioRunsTemplate);

export const buildFinishedScenarioFixture = (overrides = {}) => ({
  ...clone(finishedScenarioTemplate),
  ...clone(overrides),
});

export const buildFinishedPendingScenarioFixture = () =>
  clone(finishedPendingScenarioTemplate);
