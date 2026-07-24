export const evaluationIssueFixture = {
  id: "issue-eval-1",
  _id: "issue-eval-1",
  name: "Budget Planning",
  currentStage: "alternativeEvaluation",
  isConsensus: true,
  consensusPhase: 2,
  consensusMaxPhases: 5,
  consensusThreshold: 0.75,
  criteriaWeightsStructureKey: "manualCriteriaWeights",
  evaluationStructureKey: "alternativeCriteriaMatrix",
  model: {
    _id: "model-1",
    name: "AHP",
    apiModelKey: "ahp",
  },
  parameters: {
    alpha: 0.4,
  },
  alternatives: [
    { _id: "alt-1", name: "Option A" },
    { id: "alt-2", name: "Option B" },
  ],
  criteria: [
    {
      id: "criterion-root",
      name: "Impact",
      children: [
        {
          id: "criterion-cost",
          name: "Cost",
          type: "cost",
          expressionDomain: {
            id: "domain-cost",
            name: "0-10",
            typeKey: "numericDiscrete",
            definition: {
              min: 0,
              max: 10,
              step: 1,
            },
          },
          children: [],
        },
        {
          id: "criterion-quality",
          name: "Quality",
          type: "benefit",
          expressionDomain: {
            id: "domain-quality",
            name: "Low/Medium/High",
            typeKey: "linguisticOrdinal",
            definition: {
              labels: [
                { key: "low", label: "Low", index: 0 },
                { key: "medium", label: "Medium", index: 1 },
                { key: "high", label: "High", index: 2 },
              ],
            },
          },
          children: [],
        },
      ],
    },
  ],
};

export const evaluationIssueWithUnderscoreIdFixture = {
  ...evaluationIssueFixture,
  id: null,
  _id: "issue-eval-underscore",
};

export const evaluationResponseFixture = {
  success: true,
  data: {
    decisionContext: {
      issue: {
        id: "issue-eval-1",
        name: "Budget Planning",
      },
      structure: {
        key: "alternativeCriteriaMatrix",
        stage: "alternativeEvaluation",
      },
      alternatives: [
        { id: "alt-1", name: "Option A" },
        { id: "alt-2", name: "Option B" },
      ],
      criteriaTree: [],
      leafCriteria: [
        {
          id: "criterion-cost",
          name: "Cost",
          expressionDomain: {
            typeKey: "numericContinuous",
            definition: { min: 0, max: 10 },
          },
        },
        {
          id: "criterion-quality",
          name: "Quality",
          expressionDomain: {
            typeKey: "numericContinuous",
            definition: { min: 0, max: 10 },
          },
        },
      ],
      model: {
        id: "model-1",
        name: "AHP",
        apiModelKey: "ahp",
      },
      modelParameters: {
        alpha: 0.4,
      },
      criteriaWeightingParameters: {},
      consensus: {
        phase: 2,
        maxPhases: 5,
        threshold: 0.75,
        currentCollectiveEvaluations: {},
        previousCollectiveEvaluations: {},
      },
    },
    payload: {
      "alt-1": {
        "criterion-cost": 4,
        "criterion-quality": 8,
      },
      "alt-2": {
        "criterion-cost": 6,
        "criterion-quality": 7,
      },
    },
    collectivePayload: {
      "alt-1": {
        "criterion-cost": 4.5,
        "criterion-quality": 7.5,
      },
      "alt-2": {
        "criterion-cost": 5.5,
        "criterion-quality": 7,
      },
    },
  },
};
