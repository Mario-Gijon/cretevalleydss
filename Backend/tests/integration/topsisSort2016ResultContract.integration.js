import { execFileSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";

// This module override is local to this opt-in Vitest file; production capabilities stay false.
vi.mock("../../modules/decisionPlugins/resultStructures/resultStructureRegistry.js", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    isResultStructureCapabilityEnabled: (options) =>
      options?.resultStructureKey === "sorting" &&
      options?.resultStructureVersion === 1 &&
      options?.capability === "issueExecution"
        ? true
        : actual.isResultStructureCapabilityEnabled(options),
  };
});

import { Alternative } from "../../models/Alternatives.js";
import { Criterion } from "../../models/Criteria.js";
import { Issue } from "../../models/Issues.js";
import { IssueEvaluation } from "../../models/IssueEvaluations.js";
import { IssueExpressionDomain } from "../../models/IssueExpressionDomains.js";
import { IssueStageResult } from "../../models/IssueStageResults.js";
import { IssueStateSnapshot } from "../../models/IssueStateSnapshots.js";
import { Participation } from "../../models/Participations.js";
import { submitIssueEvaluationWorkflow } from "../../modules/issues/evaluations/submitIssueEvaluationWorkflow.js";
import { respondToIssueInvitationWorkflow } from "../../modules/issues/notifications/respondToIssueInvitationWorkflow.js";
import { buildIssueModelExecutionResult } from "../../modules/issues/modelExecution/buildIssueModelExecutionResult.js";
import { buildIssueModelRequestPayload } from "../../modules/issues/modelExecution/buildIssueModelRequestPayload.js";
import { buildIssueResultStructureContextOrThrow } from "../../modules/issues/modelExecution/buildIssueResultStructureContext.js";
import { serializePhaseResults } from "../../modules/issues/finished/finishedPayload/serializers/serializePhaseResults.js";
import { resolveResultStructureMetadata } from "../../modules/decisionPlugins/resultStructureMetadata.js";
import {
  projectNormalizedResultOrThrow,
} from "../../modules/decisionPlugins/resultStructures/resultStructureRegistry.js";
import { unwrapModelApiResponse } from "../../services/modelApi/modelResponse.js";
import {
  buildCreateIssueInfo,
  createConfirmedUser,
  createExpressionDomainFixture,
  createIssueModel,
  prepareAndPersistIssueCreation,
} from "../setup/fixtures.js";
import { setupMongoDbTestHooks } from "../setup/database.js";

setupMongoDbTestHooks();

const python = process.env.DECISION_MODELS_PYTHON?.trim();
const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const decisionModelsServiceRoot = resolve(repositoryRoot, "DecisionModelsService");
const topsisSortScript = [
  "import json, sys",
  "from schemas.model_requests import GenericModelExecutionRequest",
  "from models.topsis_sort_2016.executor import _input, execute_topsis_sort_2016",
  "payload = GenericModelExecutionRequest.model_validate(json.load(sys.stdin))",
  "prepared = _input(payload)",
  "response = execute_topsis_sort_2016(payload)",
  "if hasattr(response, 'body'):",
  "    response = json.loads(response.body)",
  "print(json.dumps({'prepared': prepared, 'response': response}))",
].join("\n");

const executeDecisionModel = (payload) => {
  if (!python) {
    throw new Error(
      "Set DECISION_MODELS_PYTHON to a Python interpreter with DecisionModelsService dependencies installed."
    );
  }

  return JSON.parse(execFileSync(python, ["-c", topsisSortScript], {
    cwd: decisionModelsServiceRoot,
    input: JSON.stringify(payload),
    encoding: "utf8",
  }));
};

const categories = [
  { categoryId: "low", label: "Low", order: 0 },
  { categoryId: "medium", label: "Medium", order: 1 },
  { categoryId: "high", label: "High", order: 2 },
];

const modelParametersDefinition = [
  {
    key: "orderedCategories",
    name: "Ordered categories",
    parameterStructureKey: "orderedCategories",
    required: true,
  },
  {
    key: "boundaryProfiles",
    name: "Boundary profiles",
    parameterStructureKey: "boundaryProfiles",
    required: true,
  },
];

const createBackendPayloadFixture = async () => {
  const owner = await createConfirmedUser({ email: "topsis-sort-contract-owner@example.com" });
  const expert = await createConfirmedUser({ email: "topsis-sort-contract-expert@example.com" });
  const model = await createIssueModel({
    name: "TOPSIS-Sort 2016 contract fixture",
    apiModelKey: "topsis_sort_2016",
    apiEndpoint: { method: "POST", path: "/topsis_sort_2016" },
    resultStructureKey: "sorting",
    resultStructureVersion: 1,
    // This ready model exists only in the isolated Mongo test database.
    // The production manifest remains scaffold and the registry stays disabled.
    implementationStatus: "ready",
    publicUsable: true,
    visibleInIssueCreation: true,
    usesCriteriaWeights: true,
    usesCriterionTypes: true,
    supportedExpressionDomains: [{ typeKey: "numericDiscrete", constraints: {} }],
    parameters: modelParametersDefinition,
  });
  const domain = await createExpressionDomainFixture({
    userId: owner._id,
    typeKey: "numericDiscrete",
    definition: { min: 1, max: 9, step: 1 },
  });
  const criteriaWeightingModel = await createIssueModel({
    name: "TOPSIS-Sort test creator weights",
    apiModelKey: "topsis_sort_test_criteria_weights",
    modelKind: "criteriaWeighting",
    visibleInCriteriaWeighting: true,
    visibleInIssueCreation: false,
    supportsCreatorCriteriaWeighting: true,
    supportsExpertCriteriaWeighting: false,
    evaluationStructureKey: "bestWorstCriteria",
    apiEndpoint: { method: "POST", path: "/best_worst_criteria" },
    parameters: [],
  });
  const temporaryCriterionIds = {
    Quality: "temporary-quality",
    Cost: "temporary-cost",
  };
  const sourceParameters = {
    orderedCategories: categories,
    boundaryProfiles: {
      profiles: [
        {
          profileId: "medium-boundary",
          categoryId: "medium",
          valuesByCriterionId: {
            [temporaryCriterionIds.Quality]: 4,
            [temporaryCriterionIds.Cost]: 6,
          },
        },
        {
          profileId: "high-boundary",
          categoryId: "high",
          valuesByCriterionId: {
            [temporaryCriterionIds.Quality]: 7,
            [temporaryCriterionIds.Cost]: 3,
          },
        },
      ],
    },
  };
  const issueInfo = buildCreateIssueInfo({
    selectedModelId: model._id,
    globalDomainId: domain._id,
    addedExperts: [expert.email],
    issueName: "TOPSIS-Sort real creation contract fixture",
    alternatives: [
      { name: "Coastal option", description: "Coastal site" },
      { name: "Urban option", description: "Urban site" },
      { name: "Forest option", description: "Forest site" },
    ],
    criteria: [{
      id: "source-performance",
      name: "Performance",
      type: "group",
      children: [
        { id: temporaryCriterionIds.Quality, name: "Quality", type: "benefit", children: [] },
        { id: temporaryCriterionIds.Cost, name: "Cost", type: "cost", children: [] },
      ],
    }],
    paramValues: sourceParameters,
    criteriaWeightingConfig: {
      mode: "creatorApiModel",
      criteriaWeightingModelId: String(criteriaWeightingModel._id),
      payload: {
        bestCriterionId: temporaryCriterionIds.Quality,
        worstCriterionId: temporaryCriterionIds.Cost,
        bestToOthers: {
          [temporaryCriterionIds.Quality]: 1,
          [temporaryCriterionIds.Cost]: 3,
        },
        othersToWorst: {
          [temporaryCriterionIds.Quality]: 3,
          [temporaryCriterionIds.Cost]: 1,
        },
      },
    },
  });
  const criteriaWeightingHttpClient = {
    post: vi.fn(async (_url, requestPayload) => ({
      status: 200,
      data: {
        success: true,
        data: {
          weightsByCriterion: Object.fromEntries(
            requestPayload.context.criteria.map((criterion) => [
              criterion.id,
              criterion.name === "Quality" ? 3 : 2,
            ])
          ),
        },
      },
    })),
  };
  await prepareAndPersistIssueCreation({
    issueInfo,
    ownerUserId: owner._id,
    decisionModelsServiceBaseUrl: "http://criteria-weights.test",
    httpClient: criteriaWeightingHttpClient,
  });

  const issue = await Issue.findOne({ name: "TOPSIS-Sort real creation contract fixture" }).lean();
  const criteria = await Criterion.find({ issue: issue._id, isLeaf: true }).sort({ position: 1 }).lean();
  const alternatives = await Alternative.find({ issue: issue._id }).sort({ position: 1 }).lean();
  const domainSnapshots = await IssueExpressionDomain.find({ issue: issue._id }).lean();
  const initialParticipation = await Participation.findOne({ issue: issue._id }).lean();
  const creationSnapshot = await IssueStateSnapshot.findOne({ issue: issue._id, snapshotType: "creation" }).lean();
  expect(criteriaWeightingHttpClient.post).toHaveBeenCalledOnce();
  expect(criteriaWeightingHttpClient.post.mock.calls[0][1].context.criteria)
    .toEqual(criteria.map((criterion) => ({
      id: String(criterion._id),
      name: criterion.name,
      type: criterion.type,
    })));
  const criteriaIdsByName = Object.fromEntries(
    criteria.map((criterion) => [criterion.name, String(criterion._id)])
  );
  const criteriaWeightingPayload = criteriaWeightingHttpClient.post.mock.calls[0][1];
  expect(criteriaWeightingPayload.evaluations[0].payload).toMatchObject({
    bestCriterionId: criteriaIdsByName.Quality,
    worstCriterionId: criteriaIdsByName.Cost,
    bestToOthers: {
      [criteriaIdsByName.Quality]: 1,
      [criteriaIdsByName.Cost]: 3,
    },
    othersToWorst: {
      [criteriaIdsByName.Quality]: 3,
      [criteriaIdsByName.Cost]: 1,
    },
  });
  expect(criteriaWeightingPayload.evaluations[0].payload.bestCriterionId)
    .not.toBe(temporaryCriterionIds.Quality);
  expect(issue.currentStage).toBe("alternativeEvaluation");
  expect(initialParticipation).toMatchObject({
    invitationStatus: "pending",
    weightsCompleted: true,
  });
  expect(domainSnapshots).toHaveLength(1);
  expect(domainSnapshots[0]).toMatchObject({
    issue: issue._id,
    sourceDomain: domain._id,
    typeKey: "numericDiscrete",
    definition: { min: 1, max: 9, step: 1 },
  });
  expect(creationSnapshot.state.issue.effectiveModelParameters).toEqual(issue.modelParameters);
  expect(creationSnapshot.state.issue.effectiveModelParameters.orderedCategories).toEqual(categories);
  expect(creationSnapshot.state.issue.effectiveModelParameters.boundaryProfiles.profiles)
    .toMatchObject([
      { valuesByCriterionId: { [criteriaIdsByName.Quality]: 4, [criteriaIdsByName.Cost]: 6 } },
      { valuesByCriterionId: { [criteriaIdsByName.Quality]: 7, [criteriaIdsByName.Cost]: 3 } },
    ]);
  expect(creationSnapshot.state.criteriaWeighting.weightsByCriterionId).toEqual(issue.modelParameters.weights);
  expect(Object.values(issue.modelParameters.weights)).toEqual([0.6, 0.4]);

  await respondToIssueInvitationWorkflow({
    issueId: issue._id,
    userId: expert._id,
    action: "accepted",
  });
  const acceptedParticipation = await Participation.findOne({ issue: issue._id }).lean();
  expect(acceptedParticipation.invitationStatus).toBe("accepted");

  const evaluationValues = [
    { Quality: 2, Cost: 8 },
    { Quality: 5, Cost: 5 },
    { Quality: 8, Cost: 2 },
  ];
  const evaluationPayload = Object.fromEntries(alternatives.map((alternative, index) => [
      String(alternative._id),
      Object.fromEntries(criteria.map((criterion) => [
        String(criterion._id),
        evaluationValues[index][criterion.name],
      ])),
    ]));
  const submission = await submitIssueEvaluationWorkflow({
    issueId: issue._id,
    userId: expert._id,
    stage: "alternativeEvaluation",
    payload: evaluationPayload,
  });
  expect(submission).toMatchObject({
    stage: "alternativeEvaluation",
    completed: true,
    currentStage: "alternativeEvaluation",
  });
  const evaluations = await IssueEvaluation.find({ issue: issue._id, stage: "alternativeEvaluation" })
    .populate("expert", "name email")
    .lean();
  expect(evaluations).toHaveLength(1);
  expect(evaluations[0]).toMatchObject({
    completed: true,
    stage: "alternativeEvaluation",
    consensusPhase: 0,
  });

  const payload = await buildIssueModelRequestPayload({
    issue,
    structureKey: "alternativeCriteriaMatrix",
    evaluations,
    phase: 0,
  });
  return { issue, model, criteria, alternatives, payload, temporaryCriterionIds };
};

describe("Backend to DecisionModelsService TOPSIS-Sort 2016 contract integration", () => {
  it("builds, executes, validates, and persists a sorting@1 result with canonical IDs", async () => {
    const productionRegistry = await vi.importActual(
      "../../modules/decisionPlugins/resultStructures/resultStructureRegistry.js"
    );
    expect(productionRegistry.isResultStructureCapabilityEnabled({
      resultStructureKey: "sorting",
      resultStructureVersion: 1,
      capability: "issueExecution",
    })).toBe(false);

    const {
      issue,
      model,
      criteria,
      alternatives,
      payload,
      temporaryCriterionIds,
    } = await createBackendPayloadFixture();
    const criterionIds = criteria.map((criterion) => String(criterion._id));
    const alternativeIds = alternatives.map((alternative) => String(alternative._id));

    expect(payload.context.alternatives.map(({ id }) => id)).toEqual(alternativeIds);
    expect(payload.context.criteria.map(({ id }) => id)).toEqual(criterionIds);
    expect(payload.context.criteria.map(({ name, type, expressionDomain }) => ({
      name,
      type,
      expressionDomain: {
        typeKey: expressionDomain.typeKey,
        definition: expressionDomain.definition,
      },
    }))).toEqual([
      {
        name: "Quality",
        type: "benefit",
        expressionDomain: {
          typeKey: "numericDiscrete",
          definition: { min: 1, max: 9, step: 1 },
        },
      },
      {
        name: "Cost",
        type: "cost",
        expressionDomain: {
          typeKey: "numericDiscrete",
          definition: { min: 1, max: 9, step: 1 },
        },
      },
    ]);
    expect(payload.modelParameters.weights).toEqual({
      [criterionIds[0]]: 0.6,
      [criterionIds[1]]: 0.4,
    });
    expect(payload.modelParameters.boundaryProfiles.profiles).toEqual([
      {
        profileId: "medium-boundary",
        categoryId: "medium",
        valuesByCriterionId: { [criterionIds[0]]: 4, [criterionIds[1]]: 6 },
      },
      {
        profileId: "high-boundary",
        categoryId: "high",
        valuesByCriterionId: { [criterionIds[0]]: 7, [criterionIds[1]]: 3 },
      },
    ]);
    expect(Object.keys(payload.modelParameters.boundaryProfiles.profiles[0].valuesByCriterionId))
      .not.toContain(temporaryCriterionIds.Quality);
    expect(Object.keys(payload.modelParameters.boundaryProfiles.profiles[0].valuesByCriterionId))
      .not.toContain(temporaryCriterionIds.Cost);

    const pythonResult = executeDecisionModel(payload);
    expect(pythonResult.prepared.criteria).toEqual([
      {
        criterion_id: criterionIds[0],
        direction: "benefit",
        weight: 0.6,
        minimum: 1,
        maximum: 9,
      },
      {
        criterion_id: criterionIds[1],
        direction: "cost",
        weight: 0.4,
        minimum: 1,
        maximum: 9,
      },
    ]);
    expect(pythonResult.prepared.alternatives).toEqual([
      {
        alternative_id: alternativeIds[0],
        values_by_criterion_id: { [criterionIds[0]]: 2, [criterionIds[1]]: 8 },
      },
      {
        alternative_id: alternativeIds[1],
        values_by_criterion_id: { [criterionIds[0]]: 5, [criterionIds[1]]: 5 },
      },
      {
        alternative_id: alternativeIds[2],
        values_by_criterion_id: { [criterionIds[0]]: 8, [criterionIds[1]]: 2 },
      },
    ]);
    expect(pythonResult.prepared.categories).toEqual(categories.map((category) => ({
      category_id: category.categoryId,
      label: category.label,
      order: category.order,
    })));
    expect(pythonResult.prepared.profiles).toEqual([
      {
        profile_id: "medium-boundary",
        category_id: "medium",
        values_by_criterion_id: { [criterionIds[0]]: 4, [criterionIds[1]]: 6 },
      },
      {
        profile_id: "high-boundary",
        category_id: "high",
        values_by_criterion_id: { [criterionIds[0]]: 7, [criterionIds[1]]: 3 },
      },
    ]);

    const result = unwrapModelApiResponse({ status: 200, data: pythonResult.response });
    expect(pythonResult.response.success).toBe(true);
    expect(result.categories).toEqual(categories);
    expect(result.assignments).toHaveLength(alternativeIds.length);
    expect(result.assignments.map(({ alternativeId }) => alternativeId).sort())
      .toEqual([...alternativeIds].sort());
    expect(result.assignments.every(({ categoryId }) => categories.some(
      (category) => category.categoryId === categoryId
    ))).toBe(true);
    expect(result).not.toHaveProperty("rank");
    expect(result).not.toHaveProperty("score");
    expect(result).not.toHaveProperty("rankedAlternatives");

    const resultStructureContext = await buildIssueResultStructureContextOrThrow({ issue });
    expect(resultStructureContext.authorizedCategories).toEqual(categories);
    const modelExecutionResult = buildIssueModelExecutionResult({
      issue,
      message: pythonResult.response.message,
      result,
      structureKey: "alternativeCriteriaMatrix",
      context: {
        ...resultStructureContext,
        authorizedAlternativeIds: payload.context.alternatives.map(({ id }) => id),
      },
    });
    expect(modelExecutionResult.standardResult.categories).toEqual(categories);
    expect(modelExecutionResult.standardResult.assignments).toEqual(result.assignments);
    expect(modelExecutionResult.standardResult.diagnostics).toEqual(result.diagnostics);
    expect(modelExecutionResult.standardResult).not.toHaveProperty("rankedAlternatives");

    const resultMetadata = resolveResultStructureMetadata(issue);
    const stageProjection = projectNormalizedResultOrThrow({
      ...resultMetadata,
      result: modelExecutionResult.standardResult,
      target: "stagePersistence",
    });
    expect(stageProjection.diagnostics).toEqual(result.diagnostics);
    expect(stageProjection.assignments.map(({ alternativeId }) => alternativeId))
      .toEqual(alternativeIds);
    expect(stageProjection).not.toHaveProperty("rankedAlternatives");

    const stageResult = await IssueStageResult.create({
      issue: issue._id,
      stage: "alternativeEvaluation",
      consensusPhase: 0,
      result: {
        ...resultMetadata,
        standardResult: stageProjection,
        modelExecution: modelExecutionResult.modelExecution,
        rawOutput: modelExecutionResult.rawOutput,
      },
    });
    const savedStageResult = await IssueStageResult.findById(stageResult._id).lean();
    expect(savedStageResult.result.standardResult.diagnostics).toEqual(result.diagnostics);
    expect(savedStageResult.result.standardResult.assignments.map(({ alternativeId }) => alternativeId))
      .toEqual(alternativeIds);

    const finishedPhase = serializePhaseResults({
      phaseResults: [savedStageResult],
      alternatives: alternatives.map((alternative) => ({
        id: String(alternative._id),
        name: alternative.name,
      })),
    })[0];
    expect(finishedPhase.standardizedOutput.diagnostics).toEqual(result.diagnostics);
    expect(finishedPhase.assignments.map(({ alternativeId }) => alternativeId))
      .toEqual(alternativeIds);
    expect(finishedPhase).not.toHaveProperty("rankedAlternatives");
    expect(finishedPhase.standardizedOutput).not.toHaveProperty("rankedAlternatives");
    expect(model.implementationStatus).toBe("ready");
    expect(model.publicUsable).toBe(true);
  }, 30000);
});
