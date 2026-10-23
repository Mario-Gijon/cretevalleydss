import { describe, expect, it, vi } from "vitest";

const registryState = vi.hoisted(() => ({
  get: vi.fn(),
}));

vi.mock(
  "../../../modules/decisionPlugins/evaluations/evaluationStructureRegistry.js",
  () => ({
    getEvaluationStructureOrThrow: registryState.get,
  })
);

import { serializeEvaluations } from "../../../modules/issues/finished/finishedPayload/serializers/serializeEvaluations.js";
import { getCriteriaPreferenceOrderPayload } from "../../../modules/decisionPlugins/evaluations/structures/criteriaPreferenceOrder/criteriaPreferenceOrder.get.js";

const baseIssue = ({ criteriaWeightingModel = { _id: "weight-model", name: "Weight model" } } = {}) => ({
  _id: "issue-1",
  name: "Issue",
  currentStage: "finished",
  isConsensus: true,
  consensusThreshold: 0.8,
  consensusMaxPhases: 8,
  apiModelKey: "decision-key",
  criteriaWeightingApiModelKey: "weight-key",
  model: { _id: "decision-model", name: "Decision model", apiModelKey: "registry-decision" },
  criteriaWeightingModel,
  modelParameters: { decisionAlpha: 1 },
  criteriaWeightingParameters: { weightingBeta: 2 },
  evaluationStructureKey: "alternativeStructure",
  criteriaWeightsStructureKey: "weightingStructure",
});

const alternatives = [{ id: "alternative-1", name: "Alternative" }];
const criteria = {
  nodes: [{
    id: "criterion-1",
    name: "Criterion",
    type: "benefit",
    isLeaf: true,
    parentId: null,
    position: 0,
    childIds: [],
    expressionDomainId: "domain-1",
  }],
  rootIds: ["criterion-1"],
};
const parentCriteria = {
  nodes: [
    { id: "root", name: "Root", type: "group", isLeaf: false, parentId: null, position: 0, childIds: ["c1", "c2"], expressionDomainId: null },
    { id: "c1", name: "C1", type: "benefit", isLeaf: false, parentId: "root", position: 0, childIds: ["l1"], expressionDomainId: null },
    { id: "l1", name: "L1", type: "benefit", isLeaf: true, parentId: "c1", position: 0, childIds: [], expressionDomainId: "domain-1" },
    { id: "c2", name: "C2", type: "benefit", isLeaf: false, parentId: "root", position: 1, childIds: ["l2", "l3"], expressionDomainId: null },
    { id: "l2", name: "L2", type: "benefit", isLeaf: true, parentId: "c2", position: 0, childIds: [], expressionDomainId: "domain-1" },
    { id: "l3", name: "L3", type: "benefit", isLeaf: true, parentId: "c2", position: 1, childIds: [], expressionDomainId: "domain-1" },
  ],
  rootIds: ["root"],
};
const expressionDomains = [{
  id: "domain-1",
  name: "Domain",
  typeKey: "numericDiscrete",
  definition: { min: 0, max: 10, step: 1 },
}];
const serializedResult = (stage, phase, id) => ({ id, stage, phase });
const rawResult = (stage, phase, collectiveEvaluations) => ({
  _id: `${stage}-${phase}`,
  stage,
  consensusPhase: phase,
  inputSnapshot: { expertWeights: [] },
  result: {
    standardResult: { collectiveEvaluations },
    modelExecution: {},
    rawOutput: {},
  },
});
const evaluation = ({ stage = "alternativeEvaluation", phase = 2, id = "evaluation-1" } = {}) => ({
  _id: id,
  expert: { _id: "expert-1" },
  stage,
  consensusPhase: phase,
  payload: { privateValue: "secret" },
  completed: true,
  submittedAt: new Date("2026-01-01T00:00:00.000Z"),
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
});

const serialize = ({ issue = baseIssue(), evaluations = [evaluation()], phaseResults, rawPhaseResults, serializedCriteria = criteria } = {}) =>
  serializeEvaluations({
    issue,
    evaluations,
    phaseResults: phaseResults ?? [serializedResult("alternativeEvaluation", 0, "result-0"), serializedResult("alternativeEvaluation", 2, "result-2")],
    rawPhaseResults: rawPhaseResults ?? [
      rawResult("alternativeEvaluation", 0, { phase: 0 }),
      rawResult("alternativeEvaluation", 2, { phase: 2 }),
    ],
    alternatives,
    criteria: serializedCriteria,
    expressionDomains,
  });

const buildAdvancedSortingFixture = () => {
  const sortingAlternatives = Array.from({ length: 10 }, (_, index) => ({
    id: `alternative-${index + 1}`,
    name: `Alternative ${index + 1}`,
  }));
  const sortingCriteria = {
    nodes: Array.from({ length: 6 }, (_, index) => ({
      id: `criterion-${index + 1}`,
      name: `Criterion ${index + 1}`,
      type: index % 2 === 0 ? "benefit" : "cost",
      isLeaf: true,
      parentId: null,
      position: index,
      childIds: [],
      expressionDomainId: "numeric-domain",
    })),
    rootIds: Array.from({ length: 6 }, (_, index) => `criterion-${index + 1}`),
  };
  const sortingDomains = [{
    id: "numeric-domain",
    typeKey: "numericContinuous",
    definition: { min: 0, max: 100 },
  }];
  const expertEvaluations = Array.from({ length: 4 }, (_, expertIndex) => ({
    _id: `evaluation-${expertIndex + 1}`,
    expert: { _id: `expert-${expertIndex + 1}` },
    stage: "alternativeEvaluation",
    consensusPhase: 5,
    payload: Object.fromEntries(sortingAlternatives.map((alternative, alternativeIndex) => [
      alternative.id,
      Object.fromEntries(sortingCriteria.nodes.map((criterion, criterionIndex) => [
        criterion.id,
        10 + alternativeIndex + criterionIndex + expertIndex * 10,
      ])),
    ])),
    completed: true,
    submittedAt: new Date("2026-01-01T00:00:00.000Z"),
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  }));
  const requestEvaluations = expertEvaluations.map((entry, index) => ({
    expert: { id: `expert-${index + 1}`, name: `Expert ${index + 1}` },
    payload: entry.payload,
  }));
  const result = {
    _id: "stage-result-5",
    issue: "issue-1",
    stage: "alternativeEvaluation",
    consensusPhase: 5,
    executionAttempt: "attempt-5",
    inputSnapshot: { expertWeights: [] },
    result: { standardResult: { categories: [], assignments: [] }, modelExecution: {}, rawOutput: {} },
  };
  const attempt = {
    _id: "attempt-5",
    issue: "issue-1",
    scope: "issueStage",
    evaluationStage: "alternativeEvaluation",
    consensusPhase: 5,
    status: "succeeded",
    modelContext: {
      modelId: "decision-model",
      apiModelKey: "topsis_sort_2016",
      evaluationStructureKey: "alternativeStructure",
      resultStructureKey: "sorting",
      resultStructureVersion: 1,
    },
    request: {
      body: {
        evaluations: requestEvaluations,
        context: {
          issue: { id: "issue-1" },
          consensusPhase: 5,
          structure: { key: "alternativeStructure", stage: "alternativeEvaluation" },
          alternatives: sortingAlternatives,
          criteria: sortingCriteria.nodes.map((criterion) => ({
            id: criterion.id,
            name: criterion.name,
            type: criterion.type,
            expressionDomain: {
              typeKey: "numericContinuous",
              definition: { min: 0, max: 100 },
            },
          })),
        },
      },
    },
    application: {
      status: "applied",
      entityType: "stageResult",
      entityId: "stage-result-5",
      resultSnapshot: {
        _id: "stage-result-5",
        issue: "issue-1",
        stage: "alternativeEvaluation",
        consensusPhase: 5,
        executionAttempt: "attempt-5",
      },
    },
  };
  const collectiveEvaluations = sortingAlternatives.map((alternative, alternativeIndex) => ({
    alternativeId: alternative.id,
    valuesByCriterionId: Object.fromEntries(sortingCriteria.nodes.map((criterion, criterionIndex) => [
      criterion.id,
      25 + alternativeIndex + criterionIndex,
    ])),
  }));
  const analysis = {
    executionKey: "base",
    executionType: "base",
    stageAnalyses: {
      alternativeEvaluation: {
        apiModelKey: "topsis_sort_2016",
        analysis: {
          facts: {
            status: "available",
            sourcePhase: 5,
            executionId: "attempt-5",
            comparisonKey: "frozen-input-hash",
            collectiveEvaluations,
          },
        },
      },
    },
  };
  return {
    issue: {
      ...baseIssue(),
      apiModelKey: "topsis_sort_2016",
      evaluationStructureKey: "alternativeStructure",
    },
    alternatives: sortingAlternatives,
    criteria: sortingCriteria,
    expressionDomains: sortingDomains,
    evaluations: expertEvaluations,
    result,
    attempt,
    analysis,
    collective: Object.fromEntries(collectiveEvaluations.map((row) => [row.alternativeId, row.valuesByCriterionId])),
  };
};

describe("finished evaluation serialization", () => {
  it("preserves successful display transformations and uses the nearest previous sparse phase", async () => {
    registryState.get.mockImplementation((key) => ({
      key,
      stage: "alternativeEvaluation",
      get: vi.fn(async ({ payload }) => ({ transformed: payload.privateValue })),
    }));

    const result = await serialize();
    const context = result.contexts.find((entry) => entry.id === "alternativeEvaluation:2");

    expect(result.individual[0]).toMatchObject({
      rawPayload: { privateValue: "secret" },
      displayPayload: { transformed: "secret" },
    });
    expect(context.decisionContext.consensus).toMatchObject({
      currentCollectiveEvaluations: { phase: 2 },
      previousCollectiveEvaluations: { phase: 0 },
    });
    expect(context.decisionContext).toMatchObject({
      model: { id: "decision-model" },
      modelParameters: { decisionAlpha: 1 },
      criteriaWeightingParameters: { weightingBeta: 2 },
      experts: [{ id: "expert-1", name: null }],
      criteriaWeights: {},
      expertWeights: {},
    });
    expect(JSON.parse(JSON.stringify(context.decisionContext))).toEqual(
      context.decisionContext
    );
  });

  it("uses the configured criteria-weighting model as the criteria-stage active model", async () => {
    registryState.get.mockImplementation((key) => ({
      key,
      stage: "criteriaWeighting",
      get: vi.fn(async ({ payload }) => payload),
    }));

    const result = await serialize({
      evaluations: [evaluation({ stage: "criteriaWeighting", phase: 4 })],
      phaseResults: [serializedResult("criteriaWeighting", 1, "result-1"), serializedResult("criteriaWeighting", 4, "result-4")],
      rawPhaseResults: [
        rawResult("criteriaWeighting", 1, { phase: 1 }),
        rawResult("criteriaWeighting", 4, { phase: 4 }),
      ],
    });
    const context = result.contexts.find((entry) => entry.id === "criteriaWeighting:4");

    expect(context.decisionContext).toMatchObject({
      model: { id: "weight-model" },
      consensus: { previousCollectiveEvaluations: { phase: 1 } },
      criteriaWeightingCriteria: [{ id: "criterion-1", name: "Criterion", type: "benefit" }],
    });
  });

  it("projects the 10 by 6 TOPSIS-Sort collective from analysis tied to the applied execution", async () => {
    registryState.get.mockImplementation((key) => ({
      key,
      stage: key === "alternativeStructure" ? "alternativeEvaluation" : "criteriaWeighting",
      get: vi.fn(async ({ payload }) => payload),
    }));
    const fixture = buildAdvancedSortingFixture();
    const result = await serializeEvaluations({
      issue: fixture.issue,
      evaluations: fixture.evaluations,
      phaseResults: [serializedResult("alternativeEvaluation", 5, "stage-result-5")],
      rawPhaseResults: [fixture.result],
      executionAttempts: [fixture.attempt],
      resultsAnalyses: [fixture.analysis],
      alternatives: fixture.alternatives,
      criteria: fixture.criteria,
      expressionDomains: fixture.expressionDomains,
    });

    const collective = result.collective[0].rawPayload;
    expect(collective).toEqual(fixture.collective);
    expect(Object.keys(collective)).toHaveLength(10);
    expect(Object.keys(collective["alternative-1"])).toHaveLength(6);
    expect(result.individual).toHaveLength(4);
    expect(result.contexts[0].decisionContext.consensus.currentCollectiveEvaluations).toEqual(fixture.collective);
  });

  it("does not reuse analysis evidence from a different phase", async () => {
    registryState.get.mockImplementation((key) => ({
      key,
      stage: "alternativeEvaluation",
      get: vi.fn(async ({ payload }) => payload),
    }));
    const fixture = buildAdvancedSortingFixture();
    const previousResult = {
      ...fixture.result,
      _id: "stage-result-4",
      consensusPhase: 4,
      executionAttempt: "attempt-4",
    };
    const previousAttempt = {
      ...fixture.attempt,
      _id: "attempt-4",
      consensusPhase: 4,
      application: {
        ...fixture.attempt.application,
        entityId: "stage-result-4",
        resultSnapshot: {
          ...fixture.attempt.application.resultSnapshot,
          _id: "stage-result-4",
          consensusPhase: 4,
          executionAttempt: "attempt-4",
        },
      },
      request: { body: { ...fixture.attempt.request.body, context: { ...fixture.attempt.request.body.context, consensusPhase: 4 } } },
    };
    const previousEvaluations = fixture.evaluations.map((entry) => ({
      ...entry,
      consensusPhase: 4,
    }));
    const result = await serializeEvaluations({
      issue: fixture.issue,
      evaluations: previousEvaluations,
      phaseResults: [serializedResult("alternativeEvaluation", 4, "stage-result-4")],
      rawPhaseResults: [previousResult],
      executionAttempts: [previousAttempt],
      resultsAnalyses: [fixture.analysis],
      alternatives: fixture.alternatives,
      criteria: fixture.criteria,
      expressionDomains: fixture.expressionDomains,
    });

    expect(result.collective[0].rawPayload).toBeNull();
    expect(result.contexts[0].decisionContext.consensus.currentCollectiveEvaluations).toBeNull();
  });

  it("leaves a historical TOPSIS-Sort collective unavailable when its frozen analysis is absent", async () => {
    registryState.get.mockImplementation((key) => ({
      key,
      stage: "alternativeEvaluation",
      get: vi.fn(async ({ payload }) => payload),
    }));
    const fixture = buildAdvancedSortingFixture();
    const result = await serializeEvaluations({
      issue: fixture.issue,
      evaluations: fixture.evaluations,
      phaseResults: [serializedResult("alternativeEvaluation", 5, "stage-result-5")],
      rawPhaseResults: [fixture.result],
      executionAttempts: [fixture.attempt],
      resultsAnalyses: [],
      alternatives: fixture.alternatives,
      criteria: fixture.criteria,
      expressionDomains: fixture.expressionDomains,
    });

    expect(result.collective[0].rawPayload).toBeNull();
  });

  it.each([
    ["another execution", (fixture) => { fixture.analysis.stageAnalyses.alternativeEvaluation.analysis.facts.executionId = "different-attempt"; }],
    ["an incomplete matrix", (fixture) => { fixture.analysis.stageAnalyses.alternativeEvaluation.analysis.facts.collectiveEvaluations.pop(); }],
  ])("rejects available Analysis evidence with %s", async (_, corruptEvidence) => {
    registryState.get.mockImplementation((key) => ({
      key,
      stage: "alternativeEvaluation",
      get: vi.fn(async ({ payload }) => payload),
    }));
    const fixture = buildAdvancedSortingFixture();
    corruptEvidence(fixture);

    await expect(serializeEvaluations({
      issue: fixture.issue,
      evaluations: fixture.evaluations,
      phaseResults: [serializedResult("alternativeEvaluation", 5, "stage-result-5")],
      rawPhaseResults: [fixture.result],
      executionAttempts: [fixture.attempt],
      resultsAnalyses: [fixture.analysis],
      alternatives: fixture.alternatives,
      criteria: fixture.criteria,
      expressionDomains: fixture.expressionDomains,
    })).rejects.toMatchObject({
      message: expect.stringContaining("TOPSIS-Sort"),
      field: "evaluations.collective",
    });
  });

  it("reconstructs parent criteria for historical parent-level preference orders", async () => {
    registryState.get.mockImplementation((key) => ({
      key,
      stage: "criteriaWeighting",
      get: getCriteriaPreferenceOrderPayload,
    }));

    const result = await serialize({
      issue: { ...baseIssue(), criteriaWeightingLevel: "parent" },
      evaluations: [
        evaluation({
          stage: "criteriaWeighting",
          phase: 0,
          id: "parent-order",
        }),
      ].map((entry) => ({
        ...entry,
        payload: { criterionOrder: ["c2", "c1"] },
      })),
      phaseResults: [serializedResult("criteriaWeighting", 0, "result-0")],
      rawPhaseResults: [rawResult("criteriaWeighting", 0, {})],
      serializedCriteria: parentCriteria,
    });
    const context = result.contexts[0];

    expect(context.criteriaWeightingCriteria.map((criterion) => criterion.id)).toEqual([
      "c1",
      "c2",
    ]);
    expect(context.decisionContext.criteriaWeightingCriteria.map((criterion) => criterion.id)).toEqual([
      "c1",
      "c2",
    ]);
    expect(context.decisionContext.leafCriteria.map((criterion) => criterion.id)).toEqual([
      "l1",
      "l2",
      "l3",
    ]);
    expect(result.individual[0].displayPayload).toEqual({
      criterionOrder: ["c2", "c1"],
    });
  });

  it("fails clearly for an invalid finished parent hierarchy", async () => {
    registryState.get.mockImplementation((key) => ({
      key,
      stage: "criteriaWeighting",
      get: getCriteriaPreferenceOrderPayload,
    }));

    await expect(
      serialize({
        issue: { ...baseIssue(), criteriaWeightingLevel: "parent" },
        evaluations: [evaluation({ stage: "criteriaWeighting", phase: 0 })],
        phaseResults: [serializedResult("criteriaWeighting", 0, "result-0")],
        rawPhaseResults: [rawResult("criteriaWeighting", 0, {})],
        serializedCriteria: {
          ...parentCriteria,
          nodes: parentCriteria.nodes.map((node) =>
            node.id === "l3" ? { ...node, parentId: null } : node
          ),
        },
      })
    ).rejects.toMatchObject({
      statusCode: 500,
      code: "INTERNAL_ERROR",
      field: "criteriaWeightingLevel",
    });
  });

  it("uses null active weighting model when no weighting model is configured", async () => {
    registryState.get.mockImplementation((key) => ({
      key,
      stage: "criteriaWeighting",
      get: vi.fn(async ({ payload }) => payload),
    }));

    const result = await serialize({
      issue: baseIssue({ criteriaWeightingModel: null }),
      evaluations: [evaluation({ stage: "criteriaWeighting", phase: 0 })],
      phaseResults: [serializedResult("criteriaWeighting", 0, "result-0")],
      rawPhaseResults: [rawResult("criteriaWeighting", 0, { phase: 0 })],
    });

    expect(result.contexts[0].decisionContext).toMatchObject({
      model: null,
    });
  });

  it("rejects a registered transformation failure with contextual evidence and no raw payload leak", async () => {
    registryState.get.mockImplementation((key) => ({
      key,
      stage: "alternativeEvaluation",
      get: vi.fn(async () => {
        throw new Error("privateValue=secret");
      }),
    }));

    await expect(serialize()).rejects.toMatchObject({
      statusCode: 500,
      code: "INTERNAL_ERROR",
      field: "evaluations.displayPayload",
      details: {
        evaluationId: "evaluation-1",
        structureKey: "alternativeStructure",
        stage: "alternativeEvaluation",
        phase: 2,
      },
    });

    await serialize().catch((error) => {
      expect(error.message).not.toContain("secret");
      expect(error.cause).toBeInstanceOf(Error);
    });
  });
});
