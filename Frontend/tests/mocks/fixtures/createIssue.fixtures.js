export const createIssueAlternativesFixture = [
  { id: "alternative-a", name: "Option A", description: "" },
  { id: "alternative-b", name: "Option B", description: "" },
];

export const createIssueExpertsFixture = [
  "expert1@example.com",
  "expert2@example.com",
];

export const createIssueLeafCriteriaFixture = [
  {
    id: "criterion-cost",
    name: "Cost",
    children: [],
  },
  {
    id: "criterion-speed",
    name: "Speed",
    children: [],
  },
];

export const createIssueCriteriaTreeFixture = [
  {
    id: "criterion-root",
    name: "Impact",
    children: createIssueLeafCriteriaFixture,
  },
];

export const createIssueSingleLeafCriteriaFixture = [
  {
    id: "criterion-cost",
    name: "Cost",
    children: [],
  },
];

export const globalContinuousDomainFixture = {
  _id: "global-numeric-continuous",
  id: "global-numeric-continuous",
  name: "Continuous 0-1",
  typeKey: "numericContinuous",
  definition: {
    min: 0,
    max: 1,
    step: null,
  },
};

export const globalDiscreteDomainFixture = {
  _id: "global-numeric-discrete",
  id: "global-numeric-discrete",
  name: "Discrete 0-9",
  typeKey: "numericDiscrete",
  definition: {
    min: 0,
    max: 9,
    step: 1,
  },
};

export const expressionLinguisticDomainFixture = {
  _id: "expression-linguistic-5",
  id: "expression-linguistic-5",
  name: "Linguistic 5",
  typeKey: "linguisticFuzzy",
  definition: {
    membershipFunction: "triangular",
    labelCount: 5,
    labels: [
      { key: "very_low", label: "Very Low", index: 0, values: [0, 0.125, 0.25] },
      { key: "low", label: "Low", index: 1, values: [0, 0.25, 0.5] },
      { key: "medium", label: "Medium", index: 2, values: [0.25, 0.5, 0.75] },
      { key: "high", label: "High", index: 3, values: [0.5, 0.75, 1] },
      { key: "very_high", label: "Very High", index: 4, values: [0.75, 0.875, 1] },
    ],
  },
};

export const expressionLinguisticDomainSevenFixture = {
  _id: "expression-linguistic-7",
  id: "expression-linguistic-7",
  name: "Linguistic 7",
  typeKey: "linguisticFuzzy",
  definition: {
    membershipFunction: "triangular",
    labelCount: 7,
    labels: [
      { key: "very_low", label: "Very Low", index: 0, values: [0, 0.08, 0.16] },
      { key: "low", label: "Low", index: 1, values: [0.08, 0.16, 0.32] },
      { key: "rather_low", label: "Rather Low", index: 2, values: [0.16, 0.32, 0.48] },
      { key: "medium", label: "Medium", index: 3, values: [0.32, 0.5, 0.68] },
      { key: "rather_high", label: "Rather High", index: 4, values: [0.52, 0.68, 0.84] },
      { key: "high", label: "High", index: 5, values: [0.68, 0.84, 0.92] },
      { key: "very_high", label: "Very High", index: 6, values: [0.84, 0.92, 1] },
    ],
  },
};

const baseCreateIssueModel = {
  _id: "model-basic",
  name: "Basic ranking model",
  isMultiCriteria: true,
  usesCriteriaWeights: false,
  usesFuzzyCriteriaWeights: false,
  usesExpertWeights: false,
  supportsConsensus: false,
  supportsConsensusSimulation: false,
  supportedExpressionDomains: [
    {
      typeKey: "numericContinuous",
      constraints: {},
    },
    {
      typeKey: "numericDiscrete",
      constraints: {},
    },
    {
      typeKey: "linguisticFuzzy",
      constraints: {
        membershipFunction: ["triangular"],
      },
    },
  ],
  parameters: [
    {
      key: "threshold",
      label: "Threshold",
      valueType: "number",
      default: 0.4,
      parameterStructureKey: "numberGlobal",
      required: true,
      restrictions: { min: null, max: null, allowed: null },
    },
    {
      key: "criterionScores",
      default: 1,
      parameterStructureKey: "numberCriterion",
    },
    {
      key: "criteriaWeightShadow",
      default: 0.5,
      parameterStructureKey: "numberCriterion",
      semanticRole: "criteriaWeights",
    },
  ],
};

export const basicCreateIssueModelFixture = baseCreateIssueModel;

export const expertWeightModelFixture = {
  ...baseCreateIssueModel,
  _id: "model-expert-weights",
  name: "Expert weighted model",
  usesExpertWeights: true,
};

export const criteriaWeightModelFixture = {
  ...baseCreateIssueModel,
  _id: "model-criteria-weights",
  name: "Criteria weighted model",
  usesCriteriaWeights: true,
};

export const fuzzyCriteriaWeightModelFixture = {
  ...baseCreateIssueModel,
  _id: "model-fuzzy-criteria-weights",
  name: "Fuzzy criteria weighted model",
  usesCriteriaWeights: true,
  usesFuzzyCriteriaWeights: true,
  supportedExpressionDomains: [
    {
      typeKey: "linguisticFuzzy",
      constraints: {
        membershipFunction: ["triangular"],
      },
    },
  ],
};

export const consensusModelFixture = {
  ...baseCreateIssueModel,
  _id: "model-consensus",
  name: "Consensus model",
  supportsConsensus: true,
  supportsConsensusSimulation: true,
};

export const consensusNoSimulationModelFixture = {
  ...baseCreateIssueModel,
  _id: "model-consensus-manual",
  name: "Consensus manual model",
  supportsConsensus: true,
  supportsConsensusSimulation: false,
};

export const singleCriterionModelFixture = {
  ...baseCreateIssueModel,
  _id: "model-single-criterion",
  name: "Single criterion model",
  isMultiCriteria: false,
};

export const complexCreateIssueModelFixture = {
  ...baseCreateIssueModel,
  _id: "model-complex",
  name: "Complex create issue model",
  usesCriteriaWeights: true,
  usesExpertWeights: true,
  supportsConsensus: true,
  supportsConsensusSimulation: true,
};

export const createIssueGlobalExpressionDomainConfigFixture = {
  mode: "global",
  globalDomainId: globalContinuousDomainFixture._id,
};

export const createIssueByCriterionExpressionDomainConfigFixture = {
  mode: "byCriterion",
  domainsByCriterion: {
    Cost: expressionLinguisticDomainFixture._id,
    Speed: expressionLinguisticDomainFixture._id,
  },
};

export const createIssueManualCriteriaWeightingConfigFixture = {
  mode: "creatorManual",
  source: "creator",
  method: "manual",
  structureKey: "manualCriteriaWeights",
  payload: {
    weightsByCriterion: {
      "criterion-cost": 0.6,
      "criterion-speed": 0.4,
    },
  },
  criteriaWeightingParameters: {
    source: "manual",
  },
};

export const createIssueFuzzyCriteriaWeightingConfigFixture = {
  mode: "creatorFuzzy",
  source: "creator",
  method: "fuzzy",
  structureKey: null,
  payload: {
    weightsByCriterion: {
      "criterion-cost": [0.25, 0.375, 0.5, 0.625, 0.75],
      "criterion-speed": [0.25, 0.375, 0.5, 0.625, 0.75],
    },
  },
  criteriaWeightingParameters: {
    source: "fuzzy",
  },
};

export const createIssueExpertWeightsFixture = {
  "expert1@example.com": 0.55,
  "expert2@example.com": 0.45,
};

export const createIssueParamValuesFixture = {
  threshold: 0.6,
  criterionScores: {
    "criterion-cost": 2,
    "criterion-speed": 3,
  },
  staleParam: "ignore-me",
};
