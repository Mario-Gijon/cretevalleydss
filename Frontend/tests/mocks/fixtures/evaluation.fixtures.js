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
            type: "numeric",
            numericRange: { min: 0, max: 10, step: 1 },
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
            type: "linguistic",
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
    evaluationContext: {
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
        { id: "criterion-cost", name: "Cost" },
        { id: "criterion-quality", name: "Quality" },
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
      weightsByCriterion: {
        "criterion-cost": 0.4,
      },
    },
    collectiveReference: {
      collectiveEvaluations: {
        shared: true,
      },
    },
  },
};
