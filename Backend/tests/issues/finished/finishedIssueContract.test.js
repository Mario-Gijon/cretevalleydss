import { describe, expect, it } from "vitest";
import mongoose from "mongoose";

import { Criterion } from "../../../models/Criteria.js";
import { IssueEvaluation } from "../../../models/IssueEvaluations.js";
import { IssueScenario } from "../../../models/IssueScenarios.js";
import { IssueStageResult } from "../../../models/IssueStageResults.js";
import { getFinishedIssueInfoPayload } from "../../../modules/issues/finished/getFinishedIssueInfoPayload.js";
import {
  createConfirmedUser,
  createIssueAlternativesFixture,
  createIssueExpressionDomainSnapshotFixture,
  createIssueFixture,
  createIssueModel,
  createParticipationFixture,
} from "../../setup/fixtures.js";
import { setupMongoDbTestHooks } from "../../setup/database.js";

setupMongoDbTestHooks();

const iso = (value) => new Date(value).toISOString();

const createCompleteIssue = async ({ consensus = true } = {}) => {
  const owner = await createConfirmedUser({ email: "owner@example.test" });
  const creator = await createConfirmedUser({ email: "creator@example.test" });
  const accepted = await createConfirmedUser({ email: "accepted@example.test" });
  const incomplete = await createConfirmedUser({ email: "incomplete@example.test" });
  const pending = await createConfirmedUser({ email: "pending@example.test" });
  const declined = await createConfirmedUser({ email: "declined@example.test" });
  const baseModel = await createIssueModel({
    name: "Base model",
    moreInfoUrl: "https://papers.example.test/base",
    supportsConsensus: consensus,
    supportsConsensusSimulation: true,
    usesCriteriaWeights: true,
    usesExpertWeights: true,
    supportedExpressionDomains: [
      { typeKey: "numericDiscrete", constraints: {} },
      { typeKey: "linguisticFuzzy", constraints: {} },
    ],
    parameters: [{
      key: "alpha",
      name: "Alpha",
      parameterStructureKey: "numberGlobal",
      default: 0.5,
    }],
  });
  const weightingModel = await createIssueModel({
    name: "Weight model",
    modelKind: "criteriaWeighting",
    visibleInIssueCreation: false,
    visibleInCriteriaWeighting: true,
    evaluationStructureKey: "manualCriteriaWeights",
    supportsCreatorCriteriaWeighting: true,
    supportsExpertCriteriaWeighting: true,
    parameters: [],
  });
  const issue = await createIssueFixture({
    ownerId: owner._id,
    createdBy: creator._id,
    modelId: baseModel._id,
    active: false,
    currentStage: "finished",
    isConsensus: consensus,
    supportsConsensus: consensus,
    simulateConsensus: consensus,
    consensusMaxPhases: consensus ? 4 : null,
    consensusThreshold: consensus ? 0.8 : null,
    consensusPhase: consensus ? 2 : 0,
    creationDate: "10 January 2026",
    closureDate: "12 January 2026",
    finishedAt: new Date("2026-01-12T10:00:00.000Z"),
    criteriaWeightsStructureKey: "manualCriteriaWeights",
    criteriaWeightingModel: weightingModel._id,
    criteriaWeightingParameters: { method: "mean" },
    modelParameters: { alpha: 0.7, weights: {} },
  });
  const [alternativeA, alternativeB] = await createIssueAlternativesFixture({
    issueId: issue._id,
    names: ["Alternative A", "Alternative B"],
  });
  const numericDomain = await createIssueExpressionDomainSnapshotFixture({
    issueId: issue._id,
    sourceDomain: new mongoose.Types.ObjectId(),
    type: "numeric",
    numericRange: { min: 0, max: 10, step: 1 },
  });
  const fuzzyDomain = await createIssueExpressionDomainSnapshotFixture({
    issueId: issue._id,
    type: "linguistic",
    membershipFunction: "triangular",
    valueCount: 3,
    linguisticLabels: [
      { label: "Low", values: [0, 0, 0.4] },
      { label: "High", values: [0.6, 1, 1] },
    ],
  });
  const root = await Criterion.create({
    issue: issue._id,
    parentCriterion: null,
    name: "Root",
    type: "group",
    isLeaf: false,
    position: 0,
  });
  const numericCriterion = await Criterion.create({
    issue: issue._id,
    parentCriterion: root._id,
    name: "Cost",
    type: "cost",
    isLeaf: true,
    expressionDomain: numericDomain._id,
    position: 0,
  });
  const fuzzyCriterion = await Criterion.create({
    issue: issue._id,
    parentCriterion: root._id,
    name: "Quality",
    type: "benefit",
    isLeaf: true,
    expressionDomain: fuzzyDomain._id,
    position: 1,
  });
  await issue.updateOne({
    $set: {
      "modelParameters.weights": {
        [String(numericCriterion._id)]: 0.4,
        [String(fuzzyCriterion._id)]: 0.6,
      },
    },
  });

  await createParticipationFixture({
    issueId: issue._id,
    expertId: accepted._id,
    invitationStatus: "accepted",
    evaluationCompleted: true,
    weightsCompleted: true,
    weight: 0.7,
    entryStage: "alternativeEvaluation",
    entryPhase: 0,
    joinedAt: new Date("2026-01-10T10:00:00.000Z"),
  });
  await createParticipationFixture({
    issueId: issue._id,
    expertId: incomplete._id,
    invitationStatus: "accepted",
    evaluationCompleted: false,
    weightsCompleted: false,
    weight: 0.3,
    entryStage: "criteriaWeighting",
    entryPhase: 0,
  });
  await createParticipationFixture({ issueId: issue._id, expertId: pending._id });
  await createParticipationFixture({
    issueId: issue._id,
    expertId: declined._id,
    invitationStatus: "declined",
  });

  const weightsPayload = {
    weightsByCriterion: {
      [String(numericCriterion._id)]: 0.4,
      [String(fuzzyCriterion._id)]: 0.6,
    },
  };
  const alternativePayload = {
    [String(alternativeA._id)]: {
      [String(numericCriterion._id)]: { value: 8 },
      [String(fuzzyCriterion._id)]: { value: { labelKey: "high" } },
    },
    [String(alternativeB._id)]: {
      [String(numericCriterion._id)]: { value: 5 },
      [String(fuzzyCriterion._id)]: { value: { labelKey: "low" } },
    },
  };
  const criteriaEvaluation = await IssueEvaluation.create({
    issue: issue._id,
    expert: accepted._id,
    stage: "criteriaWeighting",
    consensusPhase: 0,
    payload: weightsPayload,
    completed: true,
    submittedAt: new Date("2026-01-10T12:00:00.000Z"),
  });
  const alternativeEvaluation = await IssueEvaluation.create({
    issue: issue._id,
    expert: accepted._id,
    stage: "alternativeEvaluation",
    consensusPhase: consensus ? 2 : 0,
    payload: alternativePayload,
    completed: true,
    submittedAt: new Date("2026-01-11T12:00:00.000Z"),
  });
  const draftEvaluation = await IssueEvaluation.create({
    issue: issue._id,
    expert: incomplete._id,
    stage: "alternativeEvaluation",
    consensusPhase: consensus ? 2 : 0,
    payload: alternativePayload,
    completed: false,
  });

  const criteriaResult = await IssueStageResult.create({
    issue: issue._id,
    stage: "criteriaWeighting",
    consensusPhase: 0,
    consensusMeasure: null,
    rankedAlternatives: [],
    collectiveEvaluations: weightsPayload,
    plotsGraphic: {},
    modelExecution: { kind: "weights", executedAt: new Date("2026-01-10T12:01:00.000Z") },
    rawOutput: { weights: "raw" },
    expertWeights: [{ expert: accepted._id, weight: 0.7 }],
  });
  const createAlternativeResult = async (phase, score, consensusMeasure, reason = null) =>
    IssueStageResult.create({
      issue: issue._id,
      stage: "alternativeEvaluation",
      consensusPhase: phase,
      consensusMeasure,
      rankedAlternatives: [
        { alternativeId: String(alternativeA._id), name: alternativeA.name, score, rank: 1 },
        { alternativeId: String(alternativeB._id), name: alternativeB.name, score: score - 0.2, rank: 2 },
      ],
      collectiveEvaluations: alternativePayload,
      plotsGraphic: { phase },
      modelExecution: {
        kind: "decisionModelsService",
        executedAt: new Date(`2026-01-11T12:0${phase}:00.000Z`),
        consensusLifecycle: reason ? { consensusReached: true, finalizationReason: reason } : {},
      },
      rawOutput: { phase },
      expertWeights: [{ expert: accepted._id, weight: 0.7 }],
    });
  const initialResult = consensus
    ? await createAlternativeResult(0, 0.6, 0.5)
    : null;
  const finalResult = await createAlternativeResult(
    consensus ? 2 : 0,
    0.9,
    consensus ? 0.9 : null,
    consensus ? "consensusReached" : null
  );

  const scenario = await IssueScenario.create({
    issue: issue._id,
    createdBy: owner._id,
    name: "Compatible scenario",
    description: "Stored scenario description",
    targetModel: baseModel._id,
    targetModelName: baseModel.name,
    targetApiModelKey: baseModel.apiModelKey,
    targetApiEndpoint: baseModel.apiEndpoint,
    targetEvaluationStructureKey: baseModel.evaluationStructureKey,
    targetSupportsConsensus: false,
    evaluationStructureKey: "alternativeCriteriaMatrix",
    criteriaWeightsStructureKey: "manualCriteriaWeights",
    domainType: null,
    status: "done",
    config: { modelParameters: { alpha: 0.8 }, normalizedModelParameters: { alpha: 0.8 } },
    inputs: {
      consensusPhaseUsed: consensus ? 2 : 0,
      expertsOrder: [accepted.email],
      alternatives: [{ id: alternativeA._id, name: alternativeA.name }],
      criteria: [{ id: numericCriterion._id, name: numericCriterion.name, criterionType: numericCriterion.type }],
      weightsUsed: { [String(numericCriterion._id)]: 1 },
      evaluationPayloads: [{ expert: { id: String(accepted._id) }, payload: alternativePayload }],
      context: { source: "scenario" },
    },
    outputs: { standardResult: { rankedAlternatives: [] }, modelExecution: { kind: "scenario", executedAt: new Date("2026-01-12T11:00:00.000Z") }, rawOutput: { raw: true } },
  });
  const failedScenario = await IssueScenario.create({
    issue: issue._id,
    createdBy: owner._id,
    name: "Failed scenario",
    targetModel: baseModel._id,
    targetModelName: baseModel.name,
    targetApiModelKey: baseModel.apiModelKey,
    targetApiEndpoint: baseModel.apiEndpoint,
    targetEvaluationStructureKey: baseModel.evaluationStructureKey,
    evaluationStructureKey: "alternativeCriteriaMatrix",
    status: "error",
    error: "Model service unavailable",
  });

  return {
    owner,
    issue,
    alternatives: [alternativeA, alternativeB],
    criteria: [root, numericCriterion, fuzzyCriterion],
    domains: [numericDomain, fuzzyDomain],
    users: { accepted, incomplete, pending, declined },
    evaluations: { criteriaEvaluation, alternativeEvaluation, draftEvaluation },
    results: { criteriaResult, initialResult, finalResult },
    scenarios: { scenario, failedScenario },
  };
};

describe("definitive Finished Issue contract", () => {
  it("serializes a complete consensus issue as a single canonical factual contract", async () => {
    const fixture = await createCompleteIssue({ consensus: true });
    const payload = await getFinishedIssueInfoPayload({
      issueId: fixture.issue._id,
      userId: fixture.owner._id,
    });

    expect(Object.keys(payload).sort()).toEqual([
      "alternatives", "configuration", "consensus", "criteria", "evaluations",
      "executionMetadata", "expressionDomains", "issue", "lifecycle", "models",
      "participantHistory", "participants", "phaseResults", "scenarios",
    ]);
    expect(payload).not.toHaveProperty("summary");
    expect(payload).not.toHaveProperty("alternativesRankings");
    expect(payload).not.toHaveProperty("consensusRounds");
    expect(payload.issue).toMatchObject({
      id: String(fixture.issue._id),
      owner: { id: String(fixture.owner._id), email: fixture.owner.email },
      creator: { id: expect.any(String) },
    });
    expect(payload.lifecycle).toMatchObject({
      active: false,
      currentStage: "finished",
      creationDate: "10 January 2026",
      closureDate: "12 January 2026",
      finishedAt: iso("2026-01-12T10:00:00.000Z"),
    });
    expect(payload.alternatives).toEqual([
      expect.objectContaining({ id: String(fixture.alternatives[0]._id), position: 0 }),
      expect.objectContaining({ id: String(fixture.alternatives[1]._id), position: 1 }),
    ]);
    expect(payload.criteria).toMatchObject({
      rootIds: [String(fixture.criteria[0]._id)],
      finalWeights: {
        source: {
          kind: "criteriaWeightingStageResult",
          stageResultId: String(fixture.results.criteriaResult._id),
          stage: "criteriaWeighting",
          phase: 0,
        },
      },
    });
    expect(payload.configuration.criteriaWeighting.source).toBe(
      "expertCriteriaWeighting"
    );
    expect(payload.criteria.nodes).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: String(fixture.criteria[1]._id),
        expressionDomainId: String(fixture.domains[0]._id),
      }),
      expect.objectContaining({
        id: String(fixture.criteria[2]._id),
        expressionDomainId: String(fixture.domains[1]._id),
      }),
    ]));
    expect(payload.expressionDomains).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: String(fixture.domains[0]._id), typeKey: "numericDiscrete", definition: { min: 0, max: 10, step: 1 } }),
      expect.objectContaining({ id: String(fixture.domains[1]._id), typeKey: "linguisticFuzzy", definition: expect.objectContaining({ membershipFunction: "triangular" }) }),
    ]));
    expect(payload.participants).toHaveLength(4);
    expect(payload.participants).toEqual(expect.arrayContaining([
      expect.objectContaining({ expert: expect.objectContaining({ id: String(fixture.users.incomplete._id) }), invitationStatus: "accepted", evaluationCompleted: false, currentWeight: 0.3 }),
      expect.objectContaining({ invitationStatus: "pending" }),
      expect.objectContaining({ invitationStatus: "declined" }),
    ]));
    expect(payload.participantHistory).toMatchObject({
      summary: { total: 4, participated: 1, notParticipated: 3, participatedPercentage: 25 },
      records: expect.arrayContaining([
        expect.objectContaining({
          expert: expect.objectContaining({ id: String(fixture.users.accepted._id) }),
          participated: true,
          participationKey: "participated",
          weight: 0.7,
        }),
      ]),
    });
    expect(payload.evaluations.individual).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: String(fixture.evaluations.criteriaEvaluation._id),
        stage: "criteriaWeighting",
        expertId: String(fixture.users.accepted._id),
        rawPayload: expect.objectContaining({ weightsByCriterion: expect.any(Object) }),
        displayPayload: expect.any(Object),
        completed: true,
        submittedAt: iso("2026-01-10T12:00:00.000Z"),
      }),
      expect.objectContaining({
        id: String(fixture.evaluations.draftEvaluation._id),
        stage: "alternativeEvaluation",
        completed: false,
        submittedAt: null,
      }),
    ]));
    expect(payload.evaluations.contexts).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "criteriaWeighting:0", structureKey: "manualCriteriaWeights" }),
      expect.objectContaining({ id: "alternativeEvaluation:2", alternativeIds: [String(fixture.alternatives[0]._id), String(fixture.alternatives[1]._id)] }),
    ]));
    const alternativePhaseTwoContext = payload.evaluations.contexts.find(
      (context) => context.id === "alternativeEvaluation:2"
    );
    const criteriaWeightingContext = payload.evaluations.contexts.find(
      (context) => context.id === "criteriaWeighting:0"
    );
    expect(alternativePhaseTwoContext.serializedContext).toMatchObject({
      decisionModel: { id: String(payload.models.base.id) },
      criteriaWeightingModel: { id: String(payload.models.criteriaWeighting.id) },
      activeModel: { id: String(payload.models.base.id) },
      consensus: {
        previousCollectiveEvaluations: expect.objectContaining({
          [String(fixture.alternatives[0]._id)]: expect.any(Object),
        }),
      },
    });
    expect(criteriaWeightingContext.serializedContext).toMatchObject({
      activeModel: { id: String(payload.models.criteriaWeighting.id) },
      modelParameters: { alpha: 0.7, weights: expect.any(Object) },
      criteriaWeightingParameters: { method: "mean" },
    });
    expect(alternativePhaseTwoContext.serializedContext).not.toHaveProperty("model");
    expect(payload.evaluations.collective).toEqual(expect.arrayContaining([
      expect.objectContaining({ phaseResultId: String(fixture.results.criteriaResult._id), stage: "criteriaWeighting" }),
      expect.objectContaining({ phaseResultId: String(fixture.results.finalResult._id), stage: "alternativeEvaluation" }),
    ]));
    expect(payload.phaseResults).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: String(fixture.results.initialResult._id), phase: 0, expertWeightSnapshot: [{ expertId: String(fixture.users.accepted._id), weight: 0.7 }] }),
      expect.objectContaining({ id: String(fixture.results.finalResult._id), phase: 2, modelSpecificOutput: expect.any(Object), rawOutput: { phase: 2 } }),
    ]));
    expect(payload.models.base.paperUrl).toBe("https://papers.example.test/base");
    expect(payload.models.compatible[0].paperUrl).toBe("https://papers.example.test/base");
    expect(payload.phaseResults.find((result) => result.id === String(fixture.results.finalResult._id)).computedAt).toBe(iso("2026-01-11T12:02:00.000Z"));
    expect(payload.consensus).toEqual(expect.objectContaining({
      enabled: true,
      finalPhase: 2,
      reachedPhase: 2,
      finalizationReason: "consensusReached",
      rounds: [
        { phase: 0, phaseResultId: String(fixture.results.initialResult._id) },
        { phase: 2, phaseResultId: String(fixture.results.finalResult._id) },
      ],
    }));
    expect(payload.models.base).toMatchObject({
      configuredParameters: expect.objectContaining({ alpha: 0.7 }),
      effectiveParameters: expect.objectContaining({ alpha: 0.7 }),
      definitionSource: "currentRegistry",
    });
    expect(payload.models.criteriaWeighting).toMatchObject({ name: "Weight model" });
    expect(payload.models.compatible.some((model) => model.id === payload.models.base.id)).toBe(true);
    expect(payload.scenarios).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: String(fixture.scenarios.scenario._id), description: "Stored scenario description", computedAt: iso("2026-01-12T11:00:00.000Z"), targetModel: expect.objectContaining({ paperUrl: "https://papers.example.test/base" }), status: "done", inputs: expect.objectContaining({ consensusPhaseUsed: 2 }) }),
      expect.objectContaining({ id: String(fixture.scenarios.failedScenario._id), description: null, status: "error", error: "Model service unavailable" }),
    ]));
    expect(payload.executionMetadata).toMatchObject({
      contractVersion: 1,
      generatedAt: expect.any(String),
      completeness: {
        missingEvidence: expect.arrayContaining([
          { code: "BASE_MODEL_DEFINITION_SNAPSHOT_NOT_STORED" },
          { code: "SCENARIO_CRITERION_HIERARCHY_NOT_STORED", scenarioId: String(fixture.scenarios.scenario._id) },
        ]),
      },
    });
    expect(JSON.stringify(payload)).not.toContain("accepted@example.test\":");
  });

  it("uses the same contract shape without consensus aliases for a non-consensus issue", async () => {
    const fixture = await createCompleteIssue({ consensus: false });
    const payload = await getFinishedIssueInfoPayload({
      issueId: fixture.issue._id,
      userId: fixture.owner._id,
    });

    expect(payload.consensus).toEqual(expect.objectContaining({
      enabled: false,
      rounds: [],
      reachedPhase: null,
      finalizationReason: null,
    }));
    expect(payload.phaseResults).toEqual(expect.arrayContaining([
      expect.objectContaining({ stage: "criteriaWeighting", phase: 0 }),
      expect.objectContaining({ stage: "alternativeEvaluation", phase: 0 }),
    ]));
    for (const obsoleteField of [
      "summary", "expertsRatings", "analyticalGraphs", "consensusDetails",
      "modelExecution", "consensusHistory", "consensusRounds", "modelParams",
    ]) {
      expect(payload).not.toHaveProperty(obsoleteField);
    }
  });
});
