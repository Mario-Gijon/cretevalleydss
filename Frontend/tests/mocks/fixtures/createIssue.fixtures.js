export const createIssueAlternativesFixture = ["Option A", "Option B"];

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
  type: "numeric",
  numericRange: {
    min: 0,
    max: 1,
    step: null,
  },
};

export const globalDiscreteDomainFixture = {
  _id: "global-numeric-discrete",
  id: "global-numeric-discrete",
  name: "Discrete 0-9",
  type: "numeric",
  numericRange: {
    min: 0,
    max: 9,
    step: 1,
  },
};

export const expressionLinguisticDomainFixture = {
  _id: "expression-linguistic-5",
  id: "expression-linguistic-5",
  name: "Linguistic 5",
  type: "linguistic",
  membershipFunction: "triangular",
  valueCount: 5,
};

export const expressionLinguisticDomainSevenFixture = {
  _id: "expression-linguistic-7",
  id: "expression-linguistic-7",
  name: "Linguistic 7",
  type: "linguistic",
  membershipFunction: "triangular",
  valueCount: 7,
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
  supportedDomains: {
    numeric: {
      continuous: true,
      discrete: true,
    },
    linguistic: ["triangular"],
  },
  parameters: [
    {
      key: "threshold",
      default: 0.4,
      parameterStructureKey: "numberGlobal",
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
  supportedDomains: {
    numeric: {
      continuous: false,
      discrete: false,
    },
    linguistic: ["triangular"],
  },
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
