const clone = (value) => JSON.parse(JSON.stringify(value));

const baseModel = {
  id: "model-base",
  name: "Base model",
  capabilities: { usesCriteriaWeights: true },
  parameterDefinitions: [
    {
      key: "alpha",
      label: "Alpha",
      valueType: "number",
      parameterStructureKey: "numberGlobal",
      required: true,
      default: 0.5,
      restrictions: { min: 0, max: 1, allowed: null },
    },
  ],
  configuredParameters: { alpha: 0.5 },
  effectiveParameters: { alpha: 0.5 },
  paperUrl: "https://example.com",
};

export const buildFinishedIssuePayloadFixture = (overrides = {}) => {
  const payload = {
    issue: {
      id: "issue-1",
      name: "Finished issue",
      description: "Canonical fixture",
      owner: { id: "owner-1", name: "Owner", email: "owner@example.test" },
      creator: {
        id: "creator-1",
        name: "Creator",
        email: "creator@example.test",
      },
    },
    lifecycle: {
      active: false,
      creationDate: "2026-01-01",
      closureDate: "2026-01-02",
    },
    configuration: {
      alternativeEvaluation: { structureKey: "alternativeCriteriaMatrix" },
      criteriaWeighting: {
        required: true,
        source: "expertCriteriaWeighting",
        structureKey: "manualCriteriaWeights",
      },
      consensus: { enabled: true, maxPhases: 6, threshold: 0.8 },
    },
    alternatives: [
      { id: "a", name: "Alpha", description: "First", position: 0 },
      { id: "b", name: "Beta", description: "Second", position: 1 },
    ],
    criteria: {
      nodes: [
        {
          id: "root",
          name: "Overall",
          isLeaf: false,
          childIds: ["cost", "quality"],
          parentId: null,
          position: 0,
        },
        {
          id: "cost",
          name: "Cost",
          isLeaf: true,
          childIds: [],
          parentId: "root",
          position: 0,
          expressionDomainId: "domain-1",
        },
        {
          id: "quality",
          name: "Quality",
          isLeaf: true,
          childIds: [],
          parentId: "root",
          position: 1,
          expressionDomainId: "domain-1",
        },
      ],
      rootIds: ["root"],
      finalWeights: {
        source: { kind: "criteriaWeightingStageResult", phase: 1 },
        byCriterionId: { cost: 0.4, quality: 0.6 },
      },
    },
    expressionDomains: [
      { id: "domain-1", name: "Crisp", typeKey: "crisp", definition: {} },
    ],
    participants: [
      {
        id: "p-1",
        expert: {
          id: "expert-1",
          name: "Expert One",
          email: "one@example.test",
        },
        invitationStatus: "accepted",
        evaluationCompleted: true,
        weightsCompleted: true,
        currentWeight: 0.8,
      },
      {
        id: "p-2",
        expert: {
          id: "expert-2",
          name: "Expert Two",
          email: "two@example.test",
        },
        invitationStatus: "declined",
        evaluationCompleted: false,
        weightsCompleted: false,
        currentWeight: 0.2,
      },
    ],
    phaseResults: [
      {
        id: "alt-0",
        stage: "alternativeEvaluation",
        phase: 0,
        consensusMeasure: 0.4,
        rankedAlternatives: [
          { alternativeId: "a", rank: 1, score: 0.7 },
          { alternativeId: "b", rank: 2, score: 0.3 },
        ],
        standardizedOutput: {
          rankedAlternatives: [
            { alternativeId: "a", rank: 1, score: 0.7 },
            { alternativeId: "b", rank: 2, score: 0.3 },
          ],
          plotsGraphic: {
            expert_points: [
              [-2, 1],
              [1, -1],
            ],
            collective_point: [-0.5, 0.25],
            expert_labels: ["one@example.test", "two@example.test"],
          },
        },
        modelSpecificOutput: { token: "base-initial" },
        rawOutput: { token: "base-initial-raw" },
        expertWeightSnapshot: [{ expertId: "expert-1", weight: 0.6 }],
      },
      {
        id: "criteria-1",
        stage: "criteriaWeighting",
        phase: 1,
        consensusMeasure: null,
        rankedAlternatives: [],
        standardizedOutput: {},
        modelSpecificOutput: {},
        rawOutput: {},
        expertWeightSnapshot: [{ expertId: "expert-1", weight: 0.7 }],
      },
      {
        id: "alt-5",
        stage: "alternativeEvaluation",
        phase: 5,
        computedAt: "2026-01-02T10:00:00.000Z",
        consensusMeasure: 0.9,
        rankedAlternatives: [
          { alternativeId: "b", rank: 1, score: 0.8 },
          { alternativeId: "a", rank: 2, score: 0.2 },
        ],
        standardizedOutput: {
          rankedAlternatives: [
            { alternativeId: "b", rank: 1, score: 0.8 },
            { alternativeId: "a", rank: 2, score: 0.2 },
          ],
          plotsGraphic: {
            expert_points: [
              [3, 2],
              [4, 0],
            ],
            collective_point: [3.5, 1],
            expert_labels: ["one@example.test", "two@example.test"],
          },
        },
        modelSpecificOutput: { token: "base" },
        rawOutput: { token: "base-raw" },
        expertWeightSnapshot: [{ expertId: "expert-1", weight: 0.9 }],
      },
    ],
    evaluations: {
      contexts: [
        {
          id: "alternativeEvaluation:5",
          stage: "alternativeEvaluation",
          phase: 5,
          structureKey: "alternativeCriteriaMatrix",
          decisionContext: {
            issue: { id: "issue-1" },
            structure: {
              key: "alternativeCriteriaMatrix",
              stage: "alternativeEvaluation",
            },
            model: { id: "model-base", name: "Base model" },
            modelParameters: {},
            criteriaWeightingParameters: {},
            alternatives: [
              { id: "a", name: "Alpha" },
              { id: "b", name: "Beta" },
            ],
            criteriaTree: [],
            leafCriteria: [
              {
                id: "cost",
                name: "Cost",
                expressionDomain: {
                  typeKey: "numericContinuous",
                  definition: { min: 0, max: 10 },
                },
              },
              {
                id: "quality",
                name: "Quality",
                expressionDomain: {
                  typeKey: "numericContinuous",
                  definition: { min: 0, max: 10 },
                },
              },
            ],
            consensus: {},
          },
        },
        {
          id: "criteriaWeighting:1",
          stage: "criteriaWeighting",
          phase: 1,
          structureKey: "manualCriteriaWeights",
          decisionContext: {
            issue: { id: "issue-1" },
            structure: {
              key: "manualCriteriaWeights",
              stage: "criteriaWeighting",
            },
            model: { id: "weights-model" },
            modelParameters: {},
            criteriaWeightingParameters: {},
            alternatives: [],
            criteriaTree: [],
            leafCriteria: [],
            consensus: {},
          },
        },
      ],
      individual: [
        {
          id: "eval-a",
          expertId: "expert-1",
          stage: "alternativeEvaluation",
          phase: 5,
          structureKey: "alternativeCriteriaMatrix",
          rawPayload: {
            a: { cost: 4, quality: 8 },
            b: { cost: 6, quality: 7 },
          },
          displayPayload: {
            a: { cost: 4, quality: 8 },
            b: { cost: 6, quality: 7 },
          },
          completed: true,
          submittedAt: "2026-01-02T00:00:00.000Z",
          contextId: "alternativeEvaluation:5",
        },
        {
          id: "eval-c",
          expertId: "expert-1",
          stage: "criteriaWeighting",
          phase: 1,
          structureKey: "manualCriteriaWeights",
          rawPayload: { weightsByCriterion: {} },
          displayPayload: null,
          completed: true,
          submittedAt: "2026-01-01T00:00:00.000Z",
          contextId: "criteriaWeighting:1",
        },
      ],
      collective: [
        {
          phaseResultId: "alt-5",
          stage: "alternativeEvaluation",
          phase: 5,
          rawPayload: {
            a: { cost: 4.5, quality: 7.5 },
            b: { cost: 5.5, quality: 7 },
          },
          displayPayload: {
            a: { cost: 4.5, quality: 7.5 },
            b: { cost: 5.5, quality: 7 },
          },
        },
        {
          phaseResultId: "criteria-1",
          stage: "criteriaWeighting",
          phase: 1,
          rawPayload: { weightsByCriterion: {} },
          displayPayload: null,
        },
      ],
    },
    consensus: {
      enabled: true,
      modelSupportsConsensus: true,
      simulated: false,
      maxPhases: 6,
      threshold: 0.8,
      finalPhase: 5,
      reachedPhase: 5,
      finalizationReason: "thresholdReached",
      rounds: [
        { phase: 0, phaseResultId: "alt-0" },
        { phase: 5, phaseResultId: "alt-5" },
      ],
    },
    models: {
      base: baseModel,
      criteriaWeighting: null,
      compatible: [
        {
          id: "model-scenario",
          name: "Scenario model",
          paperUrl: "https://example.com",
          capabilities: { usesCriteriaWeights: false },
          parameterDefinitions: baseModel.parameterDefinitions,
          compatibility: { compatible: true, reasons: [] },
        },
      ],
    },
    scenarios: [
      {
        id: "scenario-ok",
        name: "Scenario",
        description: "Scenario description",
        targetModel: {
          id: "model-scenario",
          name: "Scenario model",
          paperUrl: "https://example.com",
        },
        source: {
          consensusPhase: 5,
          stageResult: "stage-result-5",
          domainType: "numeric",
        },
        config: { parameterOverrides: { alpha: 0.9 } },
        requestSnapshot: {
          modelParameters: { alpha: 0.9 },
          evaluations: [],
          context: {},
        },
        result: {
          standardResult: {
            rankedAlternatives: [{ alternativeId: "a", rank: 1, score: 0.99 }],
            plotsGraphic: {},
          },
          modelExecution: { token: "scenario" },
          rawOutput: { token: "scenario-raw" },
        },
        execution: {
          startedAt: "2026-01-02T10:59:00.000Z",
          completedAt: "2026-01-02T11:00:00.000Z",
        },
      },
      {
        id: "scenario-secondary",
        name: "",
        description: null,
        targetModel: {
          id: "model-secondary",
          name: "Secondary model",
          paperUrl: "https://example.com",
        },
        source: { consensusPhase: 0, stageResult: null, domainType: "numeric" },
        config: { parameterOverrides: {} },
        requestSnapshot: { modelParameters: {}, evaluations: [], context: {} },
        result: {
          standardResult: {
            rankedAlternatives: [{ alternativeId: "b", rank: 1, score: 0.8 }],
            plotsGraphic: {},
          },
          modelExecution: {},
          rawOutput: {},
        },
        execution: {
          startedAt: "2026-01-02T12:00:00.000Z",
          completedAt: "2026-01-02T12:00:00.000Z",
        },
      },
    ],
    executionMetadata: { completeness: { missingEvidence: [] } },
  };
  return { ...payload, ...clone(overrides) };
};

export const buildNonConsensusFinishedIssuePayloadFixture = () => {
  const payload = buildFinishedIssuePayloadFixture();
  payload.consensus = { ...payload.consensus, enabled: false, rounds: [] };
  return payload;
};
